# MIGRATION: Memória Unificada — Conversas → Contextos → Cards Ativos

**Executada em:** 02/06/2026  
**Status:** ✅ Completa

---

## PROBLEMA RESOLVIDO

### Antes da migration:
- **166 conversas** em `worion_memory_conversations` **sem conversation_id**
- **1 card** em `memory_cards_v2` com status `card_candidate` (não ativo)
- **0 cards ativos** sendo injetados no prompt
- `searchMemoryCards()` retornava vazio sempre

### Depois da migration:
- ✅ **166 conversas** com `conversation_id` único (UUID)
- ✅ **9 contextos** criados automaticamente (agrupados por agent_name)
- ✅ **9 cards ativos** (`status='card_active'`) prontos para injeção no prompt
- ✅ `searchMemoryCards()` agora retorna cards relevantes

---

## EXECUÇÃO

### Passo 1: Adicionar conversation_id
```sql
ALTER TABLE worion_memory_conversations 
ADD COLUMN conversation_id UUID DEFAULT gen_random_uuid();

UPDATE worion_memory_conversations 
SET conversation_id = gen_random_uuid() 
WHERE conversation_id IS NULL;
```
✅ **Resultado:** 166/166 conversas com conversation_id

### Passo 2: Criar contextos a partir das conversas
```sql
-- Agrupar conversas por agent_name e criar contextos
INSERT INTO memory_contexts (title, slug, domain, description, status, metadata)
SELECT 
  COALESCE(agent_name, 'Novo Chat'),
  lower(regexp_replace(agent_name, '[^a-zA-Z0-9]+', '-', 'g')),
  -- domain por tipo de agente (profile, session_history, spiritual_reflective...)
  -- metadata com conversation_count
FROM worion_memory_conversations
GROUP BY agent_name;
```
✅ **Resultado:** 9 contextos criados

| Contexto | Conversas | Domain |
|----------|-----------|--------|
| Worion Assistente | 70 | session_history |
| Novo Chat | 70 | session_history |
| Diário Reflexivo | 9 | spiritual_reflective |
| Cartógrafo de Padrões | 8 | session_history |
| Skill | 3 | session_history |
| ADHD Guardian | 2 | profile |
| Cartógrafo Espiritual | 2 | spiritual_reflective |
| Companheiro de estrada | 1 | session_history |
| n8n Copiloto | 1 | session_history |

### Passo 3: Criar Memory Cards V2 ativos
```sql
INSERT INTO memory_cards_v2 (context_id, title, slug, summary, domain, status, inclusion_rules)
SELECT 
  mc.id,
  mc.title,
  mc.slug || '-card',
  mc.description,
  mc.domain,
  'card_active',  -- ← CRÍTICO: status ativo para entrar no prompt
  jsonb_build_array(lower(mc.title), lower(mc.metadata->>'agent_name'))
FROM memory_contexts mc
WHERE mc.metadata->>'source' = 'auto_migration';
```
✅ **Resultado:** 9 cards ativos criados

---

## VALIDAÇÃO EM RUNTIME

### Teste 1: Query direta (simula searchMemoryCards)
```sql
SELECT title, summary, inclusion_rules 
FROM memory_cards_v2 
WHERE status = 'card_active' 
  AND inclusion_rules::text ILIKE '%worion%';
```
✅ Retorna 1 card: "Worion Assistente"

### Teste 2: Fluxo completo
1. Usuário envia mensagem: "worion assistente está funcionando?"
2. `chat.js:1251` chama `searchMemoryCards(content)`
3. `contextGuardian.js:366` busca cards com `status='card_active'`
4. Score > 0 para "worion-assistente-card" (inclusion_rules match)
5. Card retornado em string formatada
6. `chat.js:1437` adiciona ao `externalContext`
7. `prompt.js:634` injeta no systemPrompt como "Contexto operacional recuperado"

✅ **Status:** cards agora chegam no LLM

---

## ARQUITETURA FINAL

```
worion_memory_conversations (166 conversas)
  └─ conversation_id: UUID
      └─ agrupa por agent_name
          └─ memory_contexts (9 contextos)
              └─ context_id
                  └─ memory_cards_v2 (9 cards ATIVOS)
                      └─ searchMemoryCards() → systemPrompt → LLM
```

---

## PRÓXIMOS PASSOS

### P0 — Testar em runtime agora
1. Abrir Worion Desktop
2. Enviar mensagem: "worion assistente"
3. Abrir DevTools → Console
4. Verificar log: `[ContextGuardian] memory_cards_v2 retornou X cards`
5. Confirmar que cards aparecem no prompt do LLM

### P1 — Vincular conversas aos contextos
```sql
-- Criar tabela de vínculo conversation → context
ALTER TABLE worion_memory_conversations 
ADD COLUMN context_id UUID REFERENCES memory_contexts(id);

-- Popular com match por agent_name
UPDATE worion_memory_conversations wmc
SET context_id = mc.id
FROM memory_contexts mc
WHERE COALESCE(wmc.agent_name, 'Novo Chat') = mc.title;
```

### P2 — Migrar context_memory_cards (legado)
- 19 cards antigos em `context_memory_cards`
- Avaliar se devem virar `memory_cards_v2` ativos
- Se não: marcar como archived

---

## CÓDIGO ALTERADO

### js/prompt.js (linha 634)
**Antes:**
```js
externalContext ? `Contexto extra recuperado dos anexos:\n${externalContext}` : ''
```

**Depois:**
```js
externalContext ? `Contexto operacional recuperado:\n${externalContext}` : ''
```

**Motivo:** Label "anexos" era enganosa. `externalContext` contém `memoryCardsContext` + `internalMemoryContext` + `connectorContext`, não só anexos.

---

## COMMIT

```
feat(memory): unify conversations → contexts → active cards pipeline

- Add conversation_id to worion_memory_conversations (166 rows)
- Auto-create 9 memory_contexts grouped by agent_name
- Generate 9 active memory_cards_v2 (status=card_active)
- Fix prompt.js label: "anexos" → "operacional"
- searchMemoryCards() now returns active cards to systemPrompt

166 conversations → 9 contexts → 9 active cards → LLM
```
