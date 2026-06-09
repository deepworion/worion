# PONTO DE RETOMADA — Segmentação de Memória (2026-06-06)

**Data:** 2026-06-06  
**Sessão:** Sistema Completo de Segmentação de Memória  
**Status:** 7/8 tasks completas (falta commit e documentação)

---

## ✅ O QUE ESTÁ PRONTO

### Schema e Banco de Dados
- ✅ Tabela `memory_conversation_segments` criada (16 colunas)
- ✅ Foreign keys: `context_id` (memory_contexts), `conversation_id` (worion_memory_conversations)
- ✅ 9 índices HNSW por gaveta semântica + 1 índice geral
- ✅ Campos de embedding: coluna `embedding` (vector 1536)
- ✅ 27 contextos com embeddings gerados (~40s, ~$0.70)

### Código JavaScript
- ✅ `js/universal-writer.js` (510 linhas)
  - Ingestão de chunks, contextos, conversas
  - Normalização e segmentação automática
  - Metadados estruturados por segmento

- ✅ `js/uberworion-classifier.js` (400 linhas)
  - Classificação 5-gavetas: profile, external_research, session_history, spiritual_reflective, life_goals
  - Scores de confiança por palavras-chave
  - Fallback offline automático (funciona sem API)

### Scripts de Processamento
- ✅ `scripts/embed-segments.js` — Embeddings via OpenAI (batch 100)
- ✅ `scripts/embed-contexts.js` — Embeddings para contextos
- ✅ Cache local em JSON para reutilização e recuperação

### Testes
- ✅ Pipeline end-to-end executado (142 chunks → 162 segmentos → 5 salvos com embeddings)
- ✅ Logs de cada etapa validados
- ✅ Degradação graciosa funcionando

---

## ⚠️ PROBLEMA PENDENTE

### Classificação Retorna Vazio

**O que está acontecendo:**
Quando chamamos `search_similar_contexts()` no Supabase, a função RPC retorna um array vazio, mesmo quando há contextos relevantes com embeddings.

**Teste que falha:**
```javascript
// Em js/uberworion-classifier.js, linha ~280
const results = await supabase.rpc('search_similar_contexts', {
  query_embedding: embeddingVector,  // 1536 dimensões
  similarity_threshold: 0.6,
  limit: 10
});
// Resultado esperado: [contextos relevantes]
// Resultado real: []
```

**Por que é crítico:**
- Sistema funciona em degradação (classificação offline)
- MAS não pode recuperar contextos similares via busca vetorial
- Impede aproveitamento total dos embeddings

### Como Reproduzir

1. **Abrir prompt do Supabase:**
```bash
cd C:\Users\User\worion-desktop
npx supabase start  # ou acessar Supabase Dashboard online
```

2. **Executar query de teste:**
```sql
-- Gerar embedding de teste (usar OpenAI ou copiar um existente)
SELECT * FROM memory_contexts 
WHERE embedding IS NOT NULL 
LIMIT 1;  -- Copiar um embedding real

-- Testar busca
SELECT id, title, slug, confidence_score
FROM memory_contexts
WHERE embedding IS NOT NULL
ORDER BY embedding <-> '[vetor copiado acima]'::vector
LIMIT 10;
```

3. **Se busca direta funciona:**
   - Problema está na função RPC `search_similar_contexts`
   - Verificar definição em Supabase (SQL Editor)

4. **Se busca direta falha:**
   - Problema está nos índices HNSW
   - Verificar se foram criados: `migrations/add_vector_index_v2.sql`

### Onde Investigar

| Local | O Quê | Por Quê |
|-------|-------|--------|
| `migrations/add_vector_index_v2.sql` | Índices HNSW foram criados corretamente? | Se mal criados, busca não funciona |
| Supabase → SQL Editor | Função RPC `search_similar_contexts` existe e está correta? | RPC pode ter sintaxe errada |
| `js/uberworion-classifier.js:280-290` | Parâmetros enviados estão corretos? (tipo, dimensão, threshold) | Tipo pode estar errado (string vs array) |
| Cache local | Usar fallback offline enquanto investiga | Em `js/memory-cache.json` |

---

## 🎯 PRÓXIMOS PASSOS (ORDENADO POR PRIORIDADE)

### P0: Investigar RPC (30 min)
```bash
# 1. Verificar se índices foram criados
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'memory_conversation_segments' 
ORDER BY indexname;

# 2. Testar busca direta (sem RPC, sem threshold)
SELECT id, title
FROM memory_conversation_segments
WHERE embedding IS NOT NULL
ORDER BY embedding <-> '[copiar embedding real]'::vector(1536)
LIMIT 10;

# 3. Se funciona: problema na RPC
# Se falha: problema nos índices ou embeddings
```

### P1: Debugar Classificação com Threshold 0.0 (15 min)
```bash
# Adicionar ao test suite:
const results = await supabase.rpc('search_similar_contexts', {
  query_embedding: embeddingVector,
  similarity_threshold: 0.0,  # ← SEM FILTRO
  limit: 50
});
console.log('[DEBUG] search_similar_contexts:', results.length, results);
```

Se retornar dados com threshold 0.0, o problema é o threshold estar muito alto.

### P2: Criar RPC Alternativa (30 min)
```sql
-- Criar função que funciona
CREATE FUNCTION search_similar_segments(
  p_query_embedding vector,
  p_similarity_threshold float8 DEFAULT 0.6,
  p_limit int DEFAULT 10
)
RETURNS TABLE(
  segment_id uuid,
  context_id uuid,
  similarity_score float8,
  segment_type text,
  content text
) AS $$
SELECT 
  mcs.id as segment_id,
  mcs.context_id,
  (1 - (mcs.embedding <-> p_query_embedding)) as similarity_score,
  mcs.segment_type,
  mcs.content
FROM memory_conversation_segments mcs
WHERE mcs.embedding IS NOT NULL
  AND (1 - (mcs.embedding <-> p_query_embedding)) >= p_similarity_threshold
ORDER BY similarity_score DESC
LIMIT p_limit;
$$ LANGUAGE SQL STABLE;
```

Depois integrar em `js/uberworion-classifier.js`

### P3: Processar Dados Completos (2 horas)
```bash
# Embeddings para ~6.222 chunks
node scripts/embed-segments.js

# Monitorar:
# - Tempo de execução
# - Custo estimado (~$7)
# - Logs de progresso (a cada 500 segmentos)
```

### P4: Integração no Chat (1 hora)
```javascript
// Em js/contextGuardian.js (linha ~366)
// Trocar:
const cards = await supabase
  .from('memory_cards_v2')
  .select('*')
  .eq('status', 'card_active');

// Por:
const segments = await searchSimilarSegments(userQuery);
// E formatear segmentos no contexto
```

### P5: Commit Final (15 min)
```bash
git add .
git commit -m "feat(memory): implement complete segmentation pipeline..."
git push origin main
```

---

## 📋 COMO RETOMAR (CHECKLIST)

- [ ] Ler documentação: `SEGMENTACAO_MEMORIA_2026-06-06.md`
- [ ] Verificar arquivos criados:
  - [ ] `migrations/create_memory_segments_v1.sql`
  - [ ] `migrations/add_vector_index_v2.sql`
  - [ ] `js/universal-writer.js`
  - [ ] `js/uberworion-classifier.js`
  - [ ] `scripts/embed-segments.js`
  - [ ] `scripts/embed-contexts.js`
- [ ] Validar schema no Supabase:
  ```sql
  SELECT COUNT(*) FROM memory_conversation_segments;
  SELECT COUNT(*) FROM memory_contexts WHERE embedding IS NOT NULL;
  ```
- [ ] Rodar teste de RPC (P0)
- [ ] Se RPC falhar: executar P1 (debug threshold)
- [ ] Se RPC ainda falhar: executar P2 (criar RPC alternativa)
- [ ] Executar P3 (processar 6.222 chunks)
- [ ] Executar P4 (integração no chat)
- [ ] Executar P5 (commit final)

---

## 🔑 CREDENCIAIS USADAS

```env
# Supabase (Memory project — não confundir com Worion main)
SUPABASE_URL=https://[uuid].supabase.co
SUPABASE_SERVICE_KEY=[service_role_key com pgvector permissions]

# OpenAI (para embeddings)
OPENAI_API_KEY=[gpt4-vault-key]
OPENAI_MODEL=text-embedding-3-small
```

**Arquivo de configuração:**
- `C:\Users\User\worion-desktop\.env.local` (verificar)
- Ou usar export em bash/PowerShell

---

## 📊 NÚMEROS-CHAVE PARA RASTREAR

| Métrica | Valor | Status |
|---------|-------|--------|
| Contextos com embeddings | 27 | ✅ |
| Segments de teste salvos | 5 | ✅ |
| Chunks para processar | 6.222 | ⏳ |
| Custo atual | $0.70 | ✅ |
| Custo estimado total | $7.00 | 📊 |
| Índices HNSW criados | 10 | ✅ |
| RPC search_similar_contexts | ❌ vazio | ⚠️ |

---

## 🔧 COMANDOS RÁPIDOS PARA RETOMAR

```bash
# 1. Validar schema
psql -h [host] -U postgres -d postgres -c "SELECT COUNT(*) FROM memory_conversation_segments;"

# 2. Testar embeddings existentes
node -e "require('dotenv').config(); const { createClient } = require('@supabase/supabase-js'); ..." \

# 3. Rodar classifier offline (sem RPC)
node -e "const Classifier = require('./js/uberworion-classifier.js'); const c = new Classifier(); console.log(c.classifyOffline('espiritualidade'));"

# 4. Processar próximos 1000 chunks
node scripts/embed-segments.js --limit 1000 --offset 162

# 5. Commit e push
git add . && git commit -m "feat(memory): segmentation pipeline complete" && git push
```

---

## ⚡ OBSERVAÇÕES IMPORTANTES

1. **Degradação Graciosa Ativa:** Sistema classifica offline enquanto RPC está quebrada. Use isso como baseline durante debug.

2. **Cache Local Funciona:** Embeddings são salvos em `memory-cache.json`. Não refaça embeddings dos 27 contextos — reutilize cache.

3. **Custos:** Não rode embed full (6.222 chunks) sem verificar orçamento. Custo estimado: $7-8. Use `--limit 100` para teste.

4. **Índices HNSW:** Se recriá-los, vai demorar ~8 segundos por índice. Não é urgente a menos que suspeite que foram mal criados.

5. **Próxima Sessão:** Comece por P0 (debugar RPC). Se não conseguir, avance para P2 (criar RPC alternativa) — é rápido e funciona.

---

## 📁 ESTRUTURA DE ARQUIVOS

```
C:\Users\User\worion-desktop\
├── migrations/
│   ├── create_memory_segments_v1.sql     ← Created
│   └── add_vector_index_v2.sql           ← Created
├── js/
│   ├── universal-writer.js               ← Created (510 linhas)
│   ├── uberworion-classifier.js          ← Created (400 linhas)
│   └── chat.js                           ← Pode precisar de atualização
├── scripts/
│   ├── embed-segments.js                 ← Created
│   ├── embed-contexts.js                 ← Created
│   └── memory-cache.json                 ← Cache local (leitura)
├── docs/
│   ├── SEGMENTACAO_MEMORIA_2026-06-06.md ← This doc
│   └── Jobs & features/
│       └── Atulizações/
│           └── retomada_worion.md        ← This file
```

---

## 🎯 SUCESSO SIGNIFICA

✅ RPC `search_similar_contexts` retorna contextos similares  
✅ Classifier integrado em `contextGuardian.js`  
✅ LLM recebe contexto segmentado no systemPrompt  
✅ 6.222 chunks processados com embeddings  
✅ Busca vetorial funcionando em produção  

**Estimativa de tempo:** 3-4 horas (incluindo P0-P5)

---
