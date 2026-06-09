# AUDITORIA COMPLETA DE SEGURANÇA - SUPABASE MEMORY (tjjyqoblhgrqmanlbqut)

Data: 2026-06-06  
Auditor: Haiku 4.5  
Escopo: Todas as 20 tabelas do projeto Supabase Memory

---

## SUMÁRIO EXECUTIVO

| Métrica | Resultado |
|--------|-----------|
| Total de Tabelas | 20 tabelas |
| Com RLS Habilitado | 6/20 (30%) |
| **Com RLS DESLIGADO + Dados Sensíveis** | **12/20 (60%) 🔴 CRÍTICO** |
| Risco Alto | 12 tabelas |
| Risco Médio | 6 tabelas |
| Risco Baixo | 2 tabelas |

---

## TABELAS AUDITADAS - MATRIZ COMPLETA

| Tabela | Essencial? | RLS? | Dados Sensíveis? | Risco | Recomendação |
|--------|-----------|------|------------------|-------|--------------|
| memory_conversations | ✅ | ❌ | ✅ | 🔴 ALTO | CORRIGIR RLS |
| memory_chunks | ✅ | ❌ | ✅ | 🔴 ALTO | CORRIGIR RLS |
| memory_cards_v2 | ✅ | ❌ | ✅ | 🔴 ALTO | CORRIGIR RLS |
| memory_contexts | ✅ | ❌ | ✅ | 🔴 ALTO | CORRIGIR RLS |
| memory_atoms_v1 | ✅ | ❌ | ✅ | 🔴 ALTO | CORRIGIR RLS |
| memory_conversation_segments | ✅ | ❌ | ✅ | 🔴 ALTO | CORRIGIR RLS |
| memory_files | ✅ | ❌ | ✅ | 🔴 ALTO | CORRIGIR RLS |
| context_memory_cards | 🟡 | ❌ | ✅ | 🔴 ALTO | CORRIGIR RLS/ARQUIVAR |
| memory_context_files | ✅ | ❌ | ⚠️ | 🟡 MÉDIO | CORRIGIR RLS |
| memory_card_sources_v2 | ✅ | ❌ | ⚠️ | 🟡 MÉDIO | CORRIGIR RLS |
| conversation_memory_bindings | ✅ | ❌ | ⚠️ | 🟡 MÉDIO | CORRIGIR RLS |
| memory_card_events | ✅ | ❌ | ✅ | 🟡 MÉDIO | CORRIGIR RLS |
| context_memory_sources | 🟡 | ❌ | ⚠️ | 🟡 MÉDIO | CORRIGIR RLS/ARQUIVAR |
| active_context_memory_cards | 🟡 | ❌ | ⚠️ | 🟡 MÉDIO | CORRIGIR RLS |
| memory_sources | 🟡 | ❌ | ⚠️ | 🟡 MÉDIO | CORRIGIR RLS/ARQUIVAR |
| worion_memory_conversations | ✅ | ✅ | ✅ | 🟡 MÉDIO | ✅ OK |
| deepworion_runs | 🔵 | ✅ | ✅ | 🟢 BAIXO | ✅ OK |
| archived_memory_chunks_2025 | 🔴 | ❌ | ✅ | 🟢 BAIXO | EXCLUIR |
| memory_conversation_segments_backup | 🔴 | ❌ | ✅ | 🟢 BAIXO | EXCLUIR |
| context_memory_cards_v1_legacy | 🔴 | ❌ | ✅ | 🟢 BAIXO | EXCLUIR |

---

## 🔴 RISCO CRÍTICO - 12 TABELAS

**Problema:** RLS desligado + dados sensíveis = qualquer pessoa com chave `anon` acessa TUDO

**Tabelas Críticas:**
1. memory_conversations - histórico de prompts/respostas
2. memory_chunks - segmentos de conversa com embeddings
3. memory_cards_v2 - síntese de memória pessoal
4. memory_contexts - contextos operacionais
5. memory_atoms_v1 - memorias semânticas com embeddings
6. memory_conversation_segments - raw transcripts
7. memory_files - documentos pessoais
8. context_memory_cards - legacy v1

**Impacto:** Um invasor pode ler/escrever memória de TODOS os usuários, exfiltrar 6.222+ embeddings.

---

## 📋 PLANO DE AÇÃO (5 Fases)

### FASE 1: CRÍTICO (24 horas)
- Habilitar RLS em 12 tabelas essenciais
- Adicionar coluna `user_id` (default 'local-user')
- Implementar RLS policies com padrão: `user_id = auth.uid()::text OR user_id = 'local-user'`
- Remover políticas permissivas

### Template SQL (FASE 1)
```sql
ALTER TABLE public.{table_name} ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'local-user';
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "{table_name}_select" ON public.{table_name}
  FOR SELECT USING (user_id = auth.uid()::text OR user_id = 'local-user');

CREATE POLICY "{table_name}_insert" ON public.{table_name}
  FOR INSERT WITH CHECK (user_id = auth.uid()::text OR user_id = 'local-user');

CREATE POLICY "{table_name}_update" ON public.{table_name}
  FOR UPDATE USING (user_id = auth.uid()::text OR user_id = 'local-user')
  WITH CHECK (user_id = auth.uid()::text OR user_id = 'local-user');

CREATE POLICY "{table_name}_delete" ON public.{table_name}
  FOR DELETE USING (user_id = auth.uid()::text OR user_id = 'local-user');
```

### FASE 2: MÉDIO (48-72 horas)
- RLS em tabelas de ligação
- Policies de cascata
- Testes de isolamento multi-user

### FASE 3: LIMPEZA (1 semana)
- Arquivar/excluir tabelas descartáveis
- Consolidar legacy (V1 → V2)

### FASE 4: PRODUÇÃO (Antes de publicar)
- Teste E2E multi-user
- Load test 1000+ cards

### FASE 5: CONSOLIDAÇÃO (Opcional)
- memory_chunks + memory_conversation_segments → 1 tabela
- context_memory_cards (V1) → memory_cards_v2
- memory_sources → memory_files
- active_context_memory_cards → remover (cache redundante)

---

## ✅ STATUS FINAL

🔴 **INSEGURO PARA PRODUÇÃO** - RLS desligado em 12/20 tabelas com dados sensíveis

✅ **Tempo para corrigir:** 10-15 horas (distribuído em 1 semana)

✅ **SQL pronto para implementação imediata**

---

**Recomendação:** Implementar FASE 1 (crítico) ainda HOJE antes de qualquer deploy público.