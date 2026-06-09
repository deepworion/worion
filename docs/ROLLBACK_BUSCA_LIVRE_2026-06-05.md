# ROLLBACK — Busca Livre ao Supabase (2026-06-05)

## ⚠️ CONTEXTO

Tentativa de remover gates de acesso ao Supabase e criar busca livre em memória **SEM filtro de tema**.

**Problema identificado**: Payload muito grande (7000 chunks) → estouro de TPM → gate bloqueia resposta.

**Status**: Implementação parcial funcional, mas **não resolve o problema de escala**. Precisa de abordagem diferente.

---

## 📋 ARQUIVOS MODIFICADOS (3 arquivos principais)

### 1. `js/contextGuardian.js`
**Função**: `searchMemoryCards()` (linhas 446-530)

**Mudanças**:
- Removido filtro `status='card_active'` (linha 469)
- Removido score por `inclusion_rules` (linha ~479)
- Reduzido limite de 5→3 cards (linha 478)
- Reduzido summary de 500→300 chars (linha 508)
- Adicionado fallback para contextos inativos (linhas 461-480)

### 2. `js/chat.js`
**Função**: `sendMsg()` (linhas 1584-1595)

**Mudanças**:
- Removido gate que bloqueava busca quando Memory Card/Agente ativo
- Busca de memória agora **sempre** executa (exceto se `bypassMemory`)

### 3. `js/chat-models.js`
**Função**: `compactMessagesForTotalBudget()` (linha 534)

**Mudanças**:
- Reduzido compactação de system messages de 28k→16k chars

---

## 🔙 COMO REVERTER (ROLLBACK COMPLETO)

### OPÇÃO 1: Git Revert (Recomendado)

Se as mudanças estiverem commitadas:

```bash
# Ver commits recentes
git log --oneline -5

# Reverter commit específico (substitua <hash> pelo commit de hoje)
git revert <hash-do-commit-2026-06-05>

# Ou reverter para o commit anterior ao trabalho de hoje
git reset --hard <hash-do-commit-anterior>
```

### OPÇÃO 2: Rollback Manual (se não commitado)

#### 2.1. Restaurar `js/contextGuardian.js`

**Linha 466-472** — Reverter filtro de status:
```javascript
// DE (atual - busca livre):
const url = new URL(`${MEMORY_SUPABASE_URL}/rest/v1/memory_cards_v2`);
url.searchParams.set('select', 'title,summary,domain,inclusion_rules,context_id');
// GATE REMOVIDO: sem filtro status='card_active' - acesso livre a todos cards
url.searchParams.set('order', 'updated_at.desc');
url.searchParams.set('limit', '100');

// PARA (original - com gate):
const url = new URL(`${MEMORY_SUPABASE_URL}/rest/v1/memory_cards_v2`);
url.searchParams.set('select', 'title,summary,domain,inclusion_rules,context_id');
url.searchParams.set('status', 'eq.card_active');  // ✅ Restaurar filtro
url.searchParams.set('order', 'updated_at.desc');
url.searchParams.set('limit', '50');
```

**Linha 477-479** — Restaurar score por tema:
```javascript
// DE (atual - sem tema):
const validCards = rows.filter(card => card.context_id && activeContextIds.has(card.context_id));
const relevantCards = validCards.slice(0, 3);

// PARA (original - com score):
const validCards = rows.filter(card => card.context_id && activeContextIds.has(card.context_id));
const relevantCards = validCards
  .map(card => ({ card, score: scoreMemoryCardForMessage(card, normalizedMessage) }))
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)
  .map(item => item.card);
```

**Linha 507-509** — Restaurar summary original:
```javascript
// DE (atual - compacto):
card.summary ? `  Resumo: ${String(card.summary).slice(0, 300)}...` : ''

// PARA (original):
card.summary ? `  Resumo: ${String(card.summary).slice(0, 500)}` : ''
```

**Linha 512** — Restaurar texto original:
```javascript
// DE (atual):
return `MEMÓRIA RECUPERADA (3 cards mais recentes, resumo compacto):\n${cardsBlock}`;

// PARA (original):
return `Memory Cards ativos (conhecimento estruturado):\n${cardsBlock}`;
```

**Linhas 461-480** — REMOVER fallback completo:
```javascript
// DELETAR TODO ESTE BLOCO:
if (!activeContextIds.size) {
  console.warn('[ContextGuardian] no active contexts found - BUSCANDO TODOS OS CONTEXTOS COMO FALLBACK');
  // ... (todo o bloco do fallback)
}

// RESTAURAR PARA:
if (!activeContextIds.size) {
  console.warn('[ContextGuardian] no active contexts found, skipping memory_cards_v2 search');
  return '';
}
```

#### 2.2. Restaurar `js/chat.js`

**Linha 1584-1595** — Reverter gate de Memory Card ativo:
```javascript
// DE (atual - sempre busca):
if (!authorityDecision?.shouldBypassMemory) {
  internalMemoryContext = typeof searchInternalMemory === 'function' ? await searchInternalMemory(content) : '';
  memoryCardsContext = typeof searchMemoryCards === 'function' ? await searchMemoryCards(content) : '';
  if (hasActiveMemoryCardInSearch) {
    console.log('[MEMORY CARD SCOPE] Memory Card ativo (busca de memória global MANTIDA)');
  }
  if (hasActiveAgentInSearch) {
    console.log('[AGENT SCOPE] Agente ativo (busca de memória global MANTIDA)');
  }
}

// PARA (original - com gate):
if (!authorityDecision?.shouldBypassMemory && !hasActiveMemoryCardInSearch && !hasActiveAgentInSearch) {
  // Se NÃO há Memory Card ativo nem Agente ativo, busca memória global normalmente
  internalMemoryContext = typeof searchInternalMemory === 'function' ? await searchInternalMemory(content) : '';
  memoryCardsContext = typeof searchMemoryCards === 'function' ? await searchMemoryCards(content) : '';
} else if (hasActiveMemoryCardInSearch) {
  console.log('[MEMORY CARD SCOPE] Memory Card ativo bloqueou busca de memória global');
} else if (hasActiveAgentInSearch) {
  console.log('[AGENT SCOPE] Agente ativo bloqueou busca de memória global');
}
```

#### 2.3. Restaurar `js/chat-models.js`

**Linha 534** — Reverter compactação system:
```javascript
// DE (atual - agressivo):
...systemMessages.map(message => compactMessageForBudget(message, 16000)),

// PARA (original):
...systemMessages.map(message => compactMessageForBudget(message, 28000)),
```

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

| Parâmetro | ORIGINAL (com gates) | ATUAL (busca livre) |
|-----------|----------------------|---------------------|
| Filtro status | `status='card_active'` | ❌ Removido |
| Score por tema | ✅ Via `inclusion_rules` | ❌ Removido |
| Cards retornados | 5 | 3 |
| Summary chars | 500 | 300 |
| Busca com card ativo | ❌ Bloqueada | ✅ Permitida |
| System max chars | 28.000 | 16.000 |
| Fallback sem contextos | ❌ Retorna vazio | ✅ Busca todos |

---

## 🎯 LIÇÕES APRENDIDAS

### Problemas identificados:

1. **Estouro de TPM**: 7000 chunks disponíveis → impossível passar tudo ao LLM
2. **Compactação inadequada**: `compactTextMiddle()` corta o **meio** do texto, mutilando contexto
3. **Falta de filtro semântico**: Sem score por tema, retorna cards irrelevantes
4. **Schema desconhecido**: `memory_conversations` não tem `context_id` (path quebrado)

### Abordagens que NÃO funcionaram:

- ❌ Aumentar limite de cards (12→3 ainda estoura)
- ❌ Proteger de compactação (piora o estouro)
- ❌ Reduzir summary (300 chars ainda é muito com 3+ cards)

### O que PRECISA ser feito (próxima iteração):

1. **Filtro semântico obrigatório**: Buscar apenas cards **relevantes** à pergunta (não top N por data)
2. **Embeddings ou keyword match**: Usar `pgvector` ou TF-IDF para rankear cards
3. **Lazy loading**: Buscar 1 card por vez, só expandir se necessário
4. **Schema correto**: Mapear path real `chunks → cards → contexts` conforme validado pelo DeepSeek
5. **Pipeline em 2 fases**:
   - Fase 1: Query rápida retorna IDs de cards relevantes (sem summary)
   - Fase 2: Fetch summary apenas dos top 3 ranqueados

---

## 🔍 COMANDOS ÚTEIS PARA DEBUG

```bash
# Ver mudanças não commitadas
git diff js/contextGuardian.js js/chat.js js/chat-models.js

# Ver status
git status

# Descartar mudanças em arquivo específico
git restore js/contextGuardian.js

# Descartar TODAS as mudanças não commitadas (CUIDADO!)
git restore .
```

---

## 📌 PRÓXIMOS PASSOS (Para Amanhã)

1. **Pesquisar**: Como outros sistemas resolvem busca em memória grande (RAG, vector search)
2. **Validar schema**: Confirmar path `chunks → cards → contexts` real via SQL
3. **Prototipar**: Query de 2 fases (IDs primeiro, summary depois)
4. **Considerar**: Usar skill `memory-card-synthesizer` para pré-processar contexto
5. **Avaliar**: Se vale a pena criar `memory_themes` ou usar `domain` + embeddings

---

## 📝 COMMIT RECOMENDADO (se decidir manter)

```bash
git add js/contextGuardian.js js/chat.js js/chat-models.js
git commit -m "wip(memory): tentativa busca livre - estouro TPM não resolvido

- Remove filtros status='card_active' e score por inclusion_rules
- Reduz limite 5→3 cards, summary 500→300 chars
- Remove gate de bloqueio quando Memory Card/Agente ativo
- Adiciona fallback para contextos inativos

PROBLEMA: Payload ainda muito grande (7k chunks) → estouro TPM.
Precisa de abordagem com filtro semântico/embeddings.

Ref: ROLLBACK_BUSCA_LIVRE_2026-06-05.md"
```

---

**Gerado em**: 2026-06-05  
**Contexto**: Sessão com Claude Code (Sonnet 4.5)  
**Budget gasto**: ~75k tokens de 200k

---

## UPDATE 2026-06-05 23:30 — Pivô: Segmentação por Contexto

Após identificar que o estouro de TPM vinha de **1 conversa = até 436 chunks** retornados em bloco, pivotamos para segmentação semântica.

**Nova Abordagem**:
- Conversa de 100 linhas → 10 segmentos × 10 linhas
- Cada segmento: mesmo `conversation_date`, `context_id` único
- Busca retorna SOMENTE segmentos relevantes (contexto + data)

**Payload**:
- ANTES: até 436 chunks (~40k+ tokens) → estouro
- DEPOIS: ~6 segmentos × 10 chunks (~5k tokens) ✅

**Arquivos criados**:
1. `migrations/create_memory_segments_v1.sql`
2. `scripts/backfill-conversation-dates.js`
3. `scripts/embed-contexts.js`
4. `scripts/segment-conversation.js`
5. `scripts/test-segmentation.js`

**Custo estimado**: $0.70 (embeddings + summaries)
**Status**: Implementação em progresso
