# WORION CONTEXT - Handoff 2026-06-05

Leia este arquivo antes de continuar o Worion Desktop.

---

## Estado Atual Do Sistema

**Data base:** 2026-06-05
**Última sessão documentada:** SESSAO_2026-06-04.md
**Branch:** main
**Commit recente:** feat(memory-cards): implement V3 corrections with fixed editor panel

---

## Implementações da Sessão 2026-06-05

### 1. TRIVIAL CLASSIFIER + STATUS INJECTION + WRITER

**Objetivo:** Reduzir latência em perguntas triviais, adicionar status granular durante execução e filtrar frases proibidas.

**Arquivos criados:**
- `js/writer.js` - Filtro centralizado de frases proibidas (WORION_IDENTITY.md)

**Arquivos modificados:**
- `js/chat-routing.js` - Funções `isTrivialQuestion()` e `isGreeting()`
- `js/chat.js` - Rota trivial com detecção de saudação
- `js/chat-models.js` - Status injection em rotas de pesquisa e privadas
- `js/ui/core/markdown-renderer.js` - Função `collapseExcessiveBreaks()`
- `index.html` - Script writer.js adicionado

**Comportamento:**
- Saudações ("oi", "bom dia") → resposta direta sem ferramentas (300ms)
- Triviais não-saudação → gpt-4o-mini
- Status progressivo:
  - "Vou fazer uma busca..." (antes brave_search)
  - "Encontrei algumas fontes, verificando..." (após brave_search)
  - "Analisando o conteúdo encontrado..." (antes do modelo)
  - "Vou localizar nos meus registros..." (rotas privadas)
  - "Acessando seus dados..." (conectores)
  - "Processando o que encontrei..." (após retorno)

**Writer:**
- Remove frases proibidas: "espero que esteja bem", "fico feliz em ajudar", etc
- Verifica citações quando há fontes
- Fallback gracioso se falhar

---

### 2. DISPATCHER DE MODELOS - 3 ROTAS OBRIGATÓRIAS

**Objetivo:** Roteamento determinístico de modelos por tipo de pergunta.

**Arquivos modificados:**
- `js/chat-models.js` - Funções `selectModelForRoute()` e `getGreetingResponse()`
- `js/chat-routing.js` - Função `isGreeting()`
- `js/chat.js` - Flags `routeFlags` passadas para dispatcher

**Rotas implementadas:**

**ROTA 1 - TRIVIAL:**
- Subcase: `isGreeting() = true` → resposta local, ZERO API call
- Demais: `gpt-4o-mini` (OpenAI)

**ROTA 2 - LÓGICA/SEMÂNTICA/IDENTIDADE:**
- Triggers: `isSelfReferential`, `private_memory_context`, `private_project_context`, `direct_answer`
- Modelo: `claude-haiku-4-5` (Anthropic)

**ROTA 3 - PESQUISA/CÓDIGO/ANÁLISE:**
- Triggers: `focused_research`, `comparative_research`, `private_agent_context` com docs
- Modelo: `deepseek-chat` (DeepSeek V3)

**Integração:**
Dispatcher verifica `payload.routeFlags` em `callModelWithRetry()` antes de resolver modelo.

---

### 3. CONTEXTO AMBIENTAL NO INÍCIO DO CHAT

**Objetivo:** Injetar hora, data, dia da semana e clima no system prompt.

**Arquivos criados:**
- `js/ambient-context.js` - Função `getAmbientContext(cidade)`

**Arquivos modificados:**
- `js/ui.js` - Campo "Cidade" em Settings → Perfil
- `js/prompt.js` - `buildSystemPrompt()` agora é async, injeta contexto ambiental
- `js/chat.js` - Chamadas a `buildSystemPrompt()` agora com `await`
- `index.html` - Script ambient-context.js adicionado

**Formato injetado:**
```
[CONTEXTO AMBIENTAL]
Agora: quinta-feira, 05/06/2026, 21:45
Clima em Montes Claros - MG: 22°C, céu limpo
```

**API de clima:**
- URL: `https://wttr.in/{cidade}?format=j1`
- Timeout: 2s
- Gratuito, sem chave
- Se falhar: clima = null, continua normalmente

**Regras:**
- Hora/data sempre presentes (locais, zero latência)
- Clima omitido se cidade não configurada ou wttr.in falhar
- Try/catch com fallback gracioso

---

### 4. MARKDOWN - COLAPSO DE QUEBRAS EXCESSIVAS

**Objetivo:** Reduzir espaçamento vertical excessivo em respostas do LLM.

**Arquivo modificado:**
- `js/ui/core/markdown-renderer.js`

**Implementação:**
- Função `collapseExcessiveBreaks()` antes de `marked.parse()`
- 3+ quebras de linha → 2 quebras
- Preserva blocos de código (``` ... ```)
- Melhora legibilidade sem quebrar semântica

---

### 5. CORREÇÕES MENORES

**js/v12-turbo.js:**
- `getWelcomeMessage()` simplificado: "Bom dia.", "Boa tarde.", "Boa noite."
- Removido "O que você trouxe hoje?" (protocolo de atendimento)

**Agentes:**
- Todos os 8 agentes ganharam seção "Formato de resposta"
- Regra: nunca usar linha em branco dupla entre parágrafos curtos

---

## Validações Executadas

```bash
# Sintaxe JavaScript
node --check js/chat.js
node --check js/chat-models.js
node --check js/chat-routing.js
node --check js/prompt.js
node --check js/writer.js
node --check js/ambient-context.js
node --check js/ui/core/markdown-renderer.js
```

**Resultado:** Todos passaram ✅

---

## Arquivos Alterados (Resumo)

**Código:**
- `js/chat.js`
- `js/chat-models.js`
- `js/chat-routing.js`
- `js/prompt.js`
- `js/v12-turbo.js`
- `js/ui.js`
- `js/ui/core/markdown-renderer.js`
- `index.html`

**Criados:**
- `js/writer.js`
- `js/ambient-context.js`

**Agentes (8 arquivos):**
- `agents/adhd-guardian.md`
- `agents/worion-assistente.md`
- `agents/foco.md`
- `agents/presenca.md`
- `agents/cartografo-de-padroes.md`
- `agents/companheiro-de-estrada.md`
- `agents/diario-reflexivo-facilitador-pessoal.md`
- `agents/cartografo-espiritual.md`

---

## Estado Canônico Final

**Memory Atoms V1:** ativo e validado (1.962 atoms)
**Roteamento cognitivo:** privado vs público separados
**Status injection:** granular e contextualizado
**Dispatcher de modelos:** 3 rotas determinísticas
**Contexto ambiental:** hora, data, clima injetados
**Writer:** filtro de frases proibidas ativo

---

## Regras Permanentes (Mantidas da Sessão Anterior)

**Regra 1:** `WORION_CONTEXT` sempre primeira fonte a ser lida.

**Regra 2:** Ler conteúdo relevante em:
- `C:\Users\User\worion-desktop\docs\Jobs & features\Atulizações\`
- `C:\Users\User\worion-desktop\docs\Jobs & features\Contextos\`

**Regra 3:** Documentar tudo em `Atulizações/` e atualizar `WORION_CONTEXT`.

**Regra 4:** Data mudou → criar novos documentos datados.

---

## Pendências Conhecidas

1. **architecture.json:** `js/memory-cards-runtime.js` fora do load_order
2. **Validação manual:** Testar dispatcher em produção (saudações, trivial, self-reference, pesquisa)
3. **Writer:** Integrar em todas as rotas (atualmente só implementado, não chamado no fluxo)
4. **Clima:** Validar wttr.in em produção com timeout real

---

## Próximo Codex - Ordem Recomendada

1. `git status` - verificar estado limpo
2. Testar dispatcher:
   - "oi" → resposta local, ZERO API
   - "obrigado" → gpt-4o-mini
   - "quem é você" → claude-haiku-4-5
   - "RAG vs fine-tuning" → deepseek-chat
3. Testar contexto ambiental:
   - Verificar injeção no system prompt
   - Testar com cidade configurada
   - Testar sem cidade
4. Testar status injection:
   - Verificar status progressivo em pesquisa
   - Verificar status em rotas privadas
5. Validar Writer:
   - Verificar remoção de frases proibidas
   - Testar fallback gracioso
6. Corrigir `architecture.json/load_order` se necessário
7. Atualizar Notion com esta sessão

---

## Cuidados

- Não mexer em `prompt.js` sem ler `backup prompt.txt`
- Não alterar schema Supabase sem pedido explícito
- Não enviar contexto privado para busca pública
- Não usar ferramentas públicas (Brave/Tavily) em escopo privado
- Dispatcher deve respeitar as 3 rotas obrigatórias
- Contexto ambiental nunca deve bloquear o chat

---

## Logs de Debug Esperados

```javascript
[TRIVIAL ROUTE] Input detectado como trivial, resposta direta sem ferramentas
[MODEL DISPATCHER] { route: 'trivial', flags: { isTrivial: true, isGreeting: true }, dispatched: { provider: 'local', model: 'greeting-response' } }
[WRITER] Frases proibidas detectadas: 2
[AMBIENT CONTEXT] wttr.in retornou: 22°C, céu limpo
```

---

**Estado documentado em:** 2026-06-05 21:50
**Próxima leitura obrigatória:** `SESSAO_2026-06-05.md` (em construção)

---

## Deixa para amanha - limpeza/refatoracao cautelosa

Antes de continuar qualquer refatoracao, ler:

```text
docs/REFATORACAO_PLANO_ACAO_CODEX.md
docs/Jobs & features/Atulizações/SESSAO_2026-06-04.md
```

Estado mais recente da limpeza:

- Scripts operacionais foram movidos da raiz para `scripts/`:
  - `scripts/run-classification.js`
  - `scripts/link-workestria.js`
- SQL de validacao foi movido para `sql/validate-cards.sql`.
- Backups antigos foram arquivados em:
  - `docs/archive/artifacts_backup.txt`
  - `docs/archive/ui-backups/ui.js.original-full`
  - `docs/archive/ui-backups/ui.js.pre-module-integration`
- `docs/archive/README.md` documenta os arquivos arquivados.
- `docs/architecture.json` foi atualizado para incluir `js/ambient-context.js` e `js/writer.js`.
- `npm run validate` passou depois dessa atualizacao.

Regra importante:

- `docs/Jobs & features/` e pasta ativa do usuario.
- Nao mover, apagar, normalizar ou reorganizar essa pasta em limpezas automaticas.
- Editar arquivos dentro dela somente quando o usuario pedir explicitamente.
- Nao tentar resolver automaticamente o aparente move `docs/ANALIZES` -> `docs/Jobs & features/...`.

Cuidados imediatos:

- Nao usar `git add .`; o worktree tem muitas mudancas antigas e nao relacionadas.
- Nao mexer em `js/backup prompt.txt`: ele divergiu de `js/prompt.js`.
- Nao iniciar refatoracao de `js/ui.js`, `js/chat.js`, `js/chat-models.js` ou `worion-api/server.js` antes de estabilizar inventario/commits.
- Qualquer commit deve ser seletivo e pequeno.

Validacoes ja executadas e OK:

```powershell
node --check scripts\run-classification.js
node --check scripts\link-workestria.js
node --check js\artifacts.js
node --check js\ui.js
node --check main.js
node --check js/app.js
node --check js/chat.js
node --check js/chat-models.js
node --check worion-api\server.js
node --check js\ambient-context.js
node --check js\writer.js
npm run validate
```

Ordem recomendada para amanha:

1. Rodar `git status --short`.
2. Separar mentalmente mudancas do usuario vs limpeza Codex.
3. Se for commitar, preparar `git add` seletivo somente dos arquivos da limpeza.
4. Depois, continuar inventario de arquivos soltos da raiz, sem tocar em `docs/Jobs & features/`.
5. So iniciar refatoracao funcional depois que a limpeza documental/artefatos estiver em commit separado.

---

## Atualizacao posterior - P0/P1 Chat Runtime + Visual do Chat

Esta atualizacao documenta correcoes aplicadas depois do estado acima. Nao houve commit.

### Chat runtime

Arquivos alterados:
- `js/chat-routing.js`
- `js/chat.js`
- `js/chat-models.js`
- `js/model-router.js`
- `js/writer.js`

Correcoes:
- Criada rota deterministica `meta_feedback` antes de `greeting`, trivial e contexto privado.
- Criado detector `isImmediateFeedback()`.
- Saudacao pura agora e local e deterministica.
- `boa noite` responde `Boa noite. Estou por aqui.` e nunca retorna `Fala.` isolado.
- `meta_feedback` nao usa memoria, fontes, internet, private synthesis, Writer LLM ou Haiku.
- Agente ativo nao forca mais memoria automaticamente.
- `private_agent_context` com docs de agente so entra quando ha pedido explicito de leitura/memoria.
- Adicionado log `[ROUTE DECISION]`.

### Writer V3

Arquivo alterado:
- `js/writer.js`

Correcoes:
- `ENABLE_LLM_WRITER_REFINEMENT = false`.
- `generateAndRefine()` passou a fazer apenas limpeza deterministica.
- `greeting` e `meta_feedback` entram em bypass obrigatorio de Writer LLM.
- Haiku permanece disponivel como fallback/manual, mas nao gera nem refina resposta final visivel.

### Visual do chat

Arquivo alterado:
- `css/style.css`

Correcoes:
- Coluna de resposta alinhada ao composer usando `--chat-content-width: var(--chat-composer-width)`.
- Fonte do assistant reduzida e headings compactados.
- Markdown preservado.

### Ctrl + scroll

Arquivos alterados:
- `js/app.js`
- `css/style.css`

Correcoes:
- `Ctrl + roda do mouse` agora escala fontes do chat via `--chat-font-size`.
- Nao usa zoom da tela.
- `document.body.style.zoom = ''` continua ativo.
- Escala aplicada a resposta do assistant, headings, tabela, bubble do usuario e textareas do composer/home.

### Validacoes executadas e OK

```powershell
node --check js/chat.js
node --check js/chat-routing.js
node --check js/chat-models.js
node --check js/writer.js
node --check js/model-router.js
node --check js/app.js
node --check js/ui.js
npm run validate
```
