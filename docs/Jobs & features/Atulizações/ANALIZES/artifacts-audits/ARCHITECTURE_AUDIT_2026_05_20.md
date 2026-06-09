# AUDITORIA DE ARQUITETURA REAL - WORION DESKTOP
**Data:** 20/05/2026  
**Objetivo:** Validar arquitetura REAL carregada em runtime vs arquitetura documentada

---

## 1. ORDEM REAL DE CARREGAMENTO (index.html)

### Scripts carregados em sequência:
```html
1.  js/utils.js           ← utilitários base
2.  js/logger.js          ← sistema de logging
3.  js/connectors.js      ← conectores (Notion, Supabase, Brave, Tavily)
4.  js/tracing.js         ← telemetria/rastreamento
5.  js/memory.js          ← memória operacional
6.  js/projects.js        ← gerenciamento de projetos
7.  js/contextGuardian.js ← guardião de contexto
8.  js/tools.js           ← TOOL_REGISTRY e execução
9.  js/cognitive-skills.js ← engine cognitiva
10. js/v12-turbo.js       ← Goal Execution Engine v12
11. js/agents.js          ← estado de agentes (ANTES do app.js!)
12. js/skills.js          ← skills e work modes
13. js/app.js             ← ponto de entrada, init
14. js/verification.js    ← Verification Engine
15. js/prompt.js          ← construção de prompts
16. js/artifacts.js       ← geração de artefatos
17. js/chat.js            ← lógica principal de chat
18. js/ui.js              ← camada de apresentação
```

### ⚠️ DIVERGÊNCIA #1: Ordem de dependência quebrada
- **agents.js** carrega ANTES de **app.js**, mas **app.js** tem comentário dizendo que depende de agents
- **agents.js** faz `require('fs')` e injeta `window.fs`, `window.path` ANTES de qualquer módulo
- **app.js** linha 16-17 consome `window.fs` e `window.path` criados por agents.js
- **PROBLEMA:** Documentação não deixa claro que agents.js é o bootstrap de Node.js no Electron

---

## 2. TOOL_REGISTRY - TOOLS REGISTRADAS

### Tools registradas em `tools.js` (linhas 15-500):
```javascript
TOOL_REGISTRY = {
  sequential_thinking,
  classify_request,
  filesystem_list,
  filesystem_read,
  filesystem_write,
  generate_pdf,
  generate_image,
  supabase_select,
  brave_search,
  tavily_search,
  fetch_url,
  notion_search_pages,
  notion_list_children,
  notion_read_page,
  memory_search,
  memory_read_conversation,
  memory_summarize_conversation,
  memory_merge_sessions,
  memory_save_to_notion,
  create_notion_page,
  save_project
}
```

### ⚠️ DIVERGÊNCIA #2: Tools órfãs / fora do manifesto
- **`generate_image`** (tools.js:171) está registrada mas NÃO está na lista de EXPORTA do header
- **`create_notion_page`** registrada mas EXPORTA lista como `memory_save_to_notion` e `notion_create_page` (nomes diferentes!)

### ⚠️ DIVERGÊNCIA #3: Tools duplicadas/aliases
- `create_notion_page` vs `notion_create_page` (confusão de nomenclatura)
- `supabase_select` vs `supabase_query` mencionado em TOOL_STATUS_LABELS (app.js:258) mas não existe no TOOL_REGISTRY

---

## 3. WINDOW GLOBALS E EXPORTS REAIS

### Globals injetados por `agents.js` (primeiro módulo):
```javascript
window.fs = require('fs').promises
window.path = require('path')
window.AGENTS_DIR = path.join(__dirname, 'agents')
window.AGENT_DOCS_DIR = path.join(AGENTS_DIR, '_docs')
window.WORION_AGENTS = []
```

### Globals injetados por `skills.js`:
```javascript
window.WORION_SKILLS = QUICK_SKILLS
window.WORION_WORK_MODES = WORK_MODES
window.currentChatSource = 'home' | 'agent' | 'skill'
```

### Globals injetados por `verification.js`:
```javascript
window.WorionVerificationEngine = { ... }
```

### Globals injetados por `cognitive-skills.js`:
```javascript
window.cognitiveEngine = { ... }
```

### Globals injetados por `v12-turbo.js`:
```javascript
window.dynamicMemoryContext = ''
window.currentGoalAborted = false
```

### Globals injetados por `ui.js`:
```javascript
window.__worionConfirmResolve = null
window.__worionComposerModeListener = true
```

### ⚠️ DIVERGÊNCIA #4: Pollution do window namespace
- **13 window.* globals** diferentes espalhados por 7 módulos
- Nenhuma documentação centralizada de quais módulos injetam o quê
- `window.currentChatSource` manipulado por 4 módulos diferentes (agents.js, skills.js, chat.js, ui.js)

---

## 4. AGENTES E SKILLS CARREGADOS

### Sistema de agentes (agents.js):
- **loadAgentsFromModule()** lê arquivos `.md` de `agents/`
- Cada agente carrega documentos de `agents/_docs/<slug>/`
- **buildAgentSpecializationProfile()** analisa domínios, autores, metodologias
- Agentes armazenados em `window.WORION_AGENTS`

### Sistema de skills (skills.js):
- **17 QUICK_SKILLS** hardcoded (adhd-guardian, zuki, saner-ai, etc.)
- **6 WORK_MODES** hardcoded (deep-thinking, smart-research, etc.)
- Estado ativo: `activeSkillId`, `activeWorkModeId`, `activeWorkModeIds`

### ⚠️ DIVERGÊNCIA #5: Skills duplicadas entre app.js e skills.js
- **app.js linha 100-220** declara `QUICK_SKILLS` e `WORK_MODES` COMPLETOS
- **skills.js linha 13-183** redeclara os MESMOS arrays
- **PROBLEMA:** Duas fontes de verdade, risco de dessincronização
- skills.js faz `window.WORION_SKILLS = QUICK_SKILLS` (linha 13)
- app.js faz `var QUICK_SKILLS = window.WORION_SKILLS || [array]` (linha 100)
- **DEPENDÊNCIA CIRCULAR:** app.js depende de skills.js ter populado window primeiro

---

## 5. LISTENERS E EVENT HANDLERS ATIVOS

### Event listeners encontrados:
- **27 addEventListener** calls distribuídos em 3 arquivos:
  - **ui.js**: 15 listeners (click, DOMContentLoaded, keydown)
  - **app.js**: 5 listeners (wheel, keydown, beforeunload, DOMContentLoaded)
  - **artifacts.js**: 7 listeners (click em artifacts)

### Principais handlers:
```javascript
// app.js
document.addEventListener('wheel', zoomHandler)
document.addEventListener('keydown', Ctrl+. cancela goal)
window.addEventListener('DOMContentLoaded', initWorion)
window.addEventListener('beforeunload', handleBeforeUnload)

// ui.js
document.addEventListener('click', artifact link handler)
document.addEventListener('keydown', Escape fecha modal)

// artifacts.js
document.addEventListener('click', artifact generation handlers)
```

### ⚠️ DIVERGÊNCIA #6: Listeners espalhados sem registro central
- Nenhum registry centralizado de event handlers
- Impossível saber quais listeners estão ativos sem grep
- Risco de memory leaks (listeners não removidos)

---

## 6. VERIFICATION ENGINE / EVIDENCE PACK

### Módulo verification.js:
```javascript
window.WorionVerificationEngine = {
  classifyQuestionType,        // 'factual', 'opinion', 'procedural', 'conversational'
  requiresVerification,        // bool
  detectDomain,               // 'history', 'politics', 'legal', etc.
  getSourceHierarchy,         // array de fontes priorizadas
  buildVerificationInstruction,
  createVerificationPlan,
  validateResponse,
  countExternalEvidence,
  looksLikeResearchRequest,
  isEvasiveResearchAnswer,
  buildResearchRepairPrompt
}
```

### Domínios críticos (verification.js linha 19-65):
- history, politics, legal, medical, finance, biography, geography, technical, general

### Evidence Pack (chat.js linha 697-829):
```javascript
collectEvidencePack(content, verificationPlan, options) {
  - searchExternalSources (Brave + Tavily)
  - executeToolCall('fetch_url') para abrir páginas
  - getEvidenceSourceHierarchyMarker (PRIMARY/SECONDARY)
  - formatVerificationExternalEvidence
  - buildEvidenceRecords
}
```

### Grounding Gate (chat.js linha 68-157):
```javascript
looksLikeFactualRequest(userMessage)  ← detecta pedidos factuais
fetchExternalGrounding(userMessage)   ← busca OBRIGATÓRIA via Brave/Tavily
validateGroundedResponse(response)    ← barreira final (valida nomes nas fontes)
```

### Narrative Validator (chat.js linha 270-355):
```javascript
extractNarrativeClaims(responseText)     ← extrai afirmações factuais
extractClaimAnchors(claim)               ← anos, números, nomes, leis
validateNarrativeClaims(response, pack)  ← valida âncoras no Evidence Pack
```

### ⚠️ DIVERGÊNCIA #7: Três sistemas de validação concorrentes
1. **VerificationEngine** (verification.js) - cria planos de verificação
2. **Grounding Gate** (chat.js) - busca programática ANTES da resposta
3. **Narrative Validator** (chat.js) - valida afirmações DEPOIS da resposta

**PROBLEMA:** Não está claro qual gate executa primeiro, ordem de precedência, quando cada um é ativado

---

## 7. ROUTING E EXECUTION CHAINS

### Chain 1: User Input → Chat
```
ui.js:composerSubmit
  ↓
chat.js:sendMsg(content, files)
  ↓
looksLikeFactualRequest? → fetchExternalGrounding
  ↓
buildSystemPrompt (prompt.js)
  ↓
runOpenAIWithTools (chat.js:1377)
  ↓
executeToolCall (tools.js:862)
  ↓
TOOL_REGISTRY[name].execute(args)
```

### Chain 2: Tool Execution
```
executeToolCall(name, args)
  ↓
TOOL_REGISTRY[name] existe?
  ↓
tool.execute(args)
  ↓
executeToolCallWithFallback (tools.js linha 8 diz que existe mas código não está implementado!)
```

### Chain 3: Verification Flow
```
chat.js:sendMsg
  ↓
WorionVerificationEngine.createVerificationPlan
  ↓
looksLikeFactualRequest? → fetchExternalGrounding (GROUNDING GATE)
  ↓
runOpenAIWithTools
  ↓
validateGroundedResponse (BARREIRA FINAL)
  ↓
validateNarrativeClaims (NARRATIVE VALIDATOR)
```

### ⚠️ DIVERGÊNCIA #8: executeToolCallWithFallback declarado mas não implementado
- **tools.js linha 6** declara EXPORTA: `executeToolCallWithFallback`
- **tools.js linha 8** diz "PROBLEMAS CONHECIDOS: executeToolCallWithFallback está em implementação conforme checkpoint"
- **Código ausente:** a função não existe no arquivo!
- Também faltam: `executeNotionFallback`, `executeSupabaseFallback`, `executeFilesystemFallback`, `executeBraveFallback`

### ⚠️ DIVERGÊNCIA #9: Dois roteadores de chat
- **chat.js:sendMsg** (linha ~2000+) - roteador principal
- **v12-turbo.js** (Goal Execution Engine v12) - roteador paralelo para goals compostos
- **PROBLEMA:** Não está claro quando v12-turbo substitui sendMsg, qual a precedência

---

## 8. DEPENDENCY GRAPH (REAL)

```
agents.js (BOOTSTRAP - require fs/path)
  ↓ window.fs, window.path, window.WORION_AGENTS
  ↓
skills.js
  ↓ window.WORION_SKILLS, window.WORION_WORK_MODES
  ↓
app.js (INIT)
  ↓ consome window.fs, window.WORION_AGENTS, window.WORION_SKILLS
  ↓ declara novamente QUICK_SKILLS e WORK_MODES (!)
  ↓ initWorion() no DOMContentLoaded
  ↓   → loadWorionConfig
  ↓   → loadUserProfile
  ↓   → loadAgents (chama loadAgentsFromModule de agents.js)
  ↓   → showHomeView (ui.js)
  ↓
tools.js
  ↓ TOOL_REGISTRY
  ↓ executeToolCall
  ↓
connectors.js
  ↓ Notion, Supabase, Brave, Tavily
  ↓
verification.js
  ↓ window.WorionVerificationEngine
  ↓
cognitive-skills.js
  ↓ window.cognitiveEngine
  ↓
prompt.js
  ↓ buildSystemPrompt (consome cognitive, verification, memory, project)
  ↓
chat.js (ORQUESTRADOR PRINCIPAL)
  ↓ sendMsg
  ↓   → looksLikeFactualRequest? fetchExternalGrounding
  ↓   → buildSystemPrompt
  ↓   → runOpenAIWithTools
  ↓      → executeToolCall
  ↓         → TOOL_REGISTRY[name].execute
  ↓   → validateGroundedResponse
  ↓   → validateNarrativeClaims
  ↓
ui.js (APRESENTAÇÃO)
  ↓ renderChatPanel
  ↓ renderMarkdown
  ↓ event listeners
```

---

## 9. RUNTIME MAP

### Módulos carregados: 18
```
utils.js, logger.js, connectors.js, tracing.js, memory.js, 
projects.js, contextGuardian.js, tools.js, cognitive-skills.js, 
v12-turbo.js, agents.js, skills.js, app.js, verification.js, 
prompt.js, artifacts.js, chat.js, ui.js
```

### Window globals: 13
```
window.fs
window.path
window.AGENTS_DIR
window.AGENT_DOCS_DIR
window.WORION_AGENTS
window.WORION_SKILLS
window.WORION_WORK_MODES
window.currentChatSource
window.WorionVerificationEngine
window.cognitiveEngine
window.dynamicMemoryContext
window.currentGoalAborted
window.__worionConfirmResolve
window.__worionComposerModeListener
```

### Event listeners: 27
```
15 em ui.js
5 em app.js
7 em artifacts.js
```

### Tools registradas: 21
```
sequential_thinking, classify_request, filesystem_list, filesystem_read,
filesystem_write, generate_pdf, generate_image, supabase_select,
brave_search, tavily_search, fetch_url, notion_search_pages,
notion_list_children, notion_read_page, memory_search,
memory_read_conversation, memory_summarize_conversation,
memory_merge_sessions, memory_save_to_notion, create_notion_page,
save_project
```

### Skills: 17 (hardcoded)
### Work Modes: 6 (hardcoded)
### Agentes: dinâmico (carregados de agents/*.md)

---

## 10. DIVERGÊNCIAS CONSOLIDADAS

### 🔴 CRÍTICAS (quebram execução)

1. **executeToolCallWithFallback** declarado mas não implementado
2. **Ordem de carregamento:** agents.js DEVE vir antes de app.js (dependência não documentada)
3. **TOOL_REGISTRY inconsistente:** `supabase_query` referenciado mas não existe

### 🟡 MODERADAS (risco de bugs)

4. **Skills duplicadas:** QUICK_SKILLS e WORK_MODES em app.js E skills.js
5. **Três sistemas de validação concorrentes** sem documentação de precedência
6. **window.currentChatSource manipulado por 4 módulos** diferentes (race condition?)
7. **Tool names inconsistentes:** `create_notion_page` vs `notion_create_page`

### 🟢 LEVES (dívida técnica)

8. **13 window globals** sem registro centralizado
9. **27 event listeners** sem cleanup documentado
10. **Dois roteadores de chat:** sendMsg vs v12-turbo (quando usar qual?)

---

## 11. MÓDULOS ÓRFÃOS / NÃO USADOS

### Arquivos JS sem consumo claro:
- **contextGuardian.js** - carregado mas nenhuma função exportada é chamada em outros módulos
- **v12-turbo.js** - Goal Execution Engine v12 mas não está claro quando substitui sendMsg

### Funções declaradas mas não implementadas:
```javascript
// tools.js EXPORTA mas não implementa:
executeToolCallWithFallback
executeNotionFallback
executeSupabaseFallback
executeFilesystemFallback
executeBraveFallback
```

---

## 12. RESPONSABILIDADES DUPLICADAS

### 1. Construção de Skills
- **app.js** linha 100-220: declara QUICK_SKILLS completo
- **skills.js** linha 13-183: redeclara o mesmo array
- **RECOMENDAÇÃO:** Mover para skills.js, app.js só consome

### 2. Estado de Chat
- **app.js**: `chatMode`, `messages`, `currentAgent`, `currentConversationId`
- **chat.js**: manipula os mesmos estados
- **skills.js**: `window.currentChatSource = 'skill'`
- **agents.js**: `window.currentChatSource = 'agent'`
- **ui.js**: `window.currentChatSource = 'home'`

### 3. Validação Factual
- **verification.js**: VerificationEngine
- **chat.js**: looksLikeFactualRequest, fetchExternalGrounding
- **chat.js**: validateGroundedResponse, validateNarrativeClaims

---

## 13. CAMINHOS MORTOS

### Código nunca executado:
1. **tools.js linha 565-621**: função `loadAgents()` completa MAS linha 566 diz "Compatibilidade para chamadas legadas: a implementacao real fica em agents.js." - código morto!
2. **app.js TOOL_STATUS_LABELS** linha 258: `supabase_query` não existe no TOOL_REGISTRY

### Fluxos redundantes:
- **buildSystemPrompt** inclui contexto de:
  - Memória (memory.js)
  - Projeto (projects.js)
  - Cognitive Engine (cognitive-skills.js)
  - Verification (verification.js)
  - User Skill Pack (prompt.js)
  - Agent Documents (prompt.js)
  
  **PROBLEMA:** Nenhuma priorização documentada quando há conflito

---

## 14. SKILLS QUE TOMAM DECISÃO DE EXECUÇÃO

### Tools que roteiam (decisão embutida):
- **sequential_thinking** - decide se raciocínio complexo é necessário
- **classify_request** - decide categoria: simple_query, direct_action, compound_goal

### Gates que bloqueiam execução:
- **looksLikeFactualRequest** (chat.js:68) - FORÇA busca externa
- **validateGroundedResponse** (chat.js:162) - BLOQUEIA resposta se validação falhar
- **validateNarrativeClaims** (chat.js:303) - BLOQUEIA se claims não têm âncoras

**PROBLEMA:** Skills/gates decidem se código executa, mas não está claro:
- Ordem de precedência
- Como sobrescrever (modo dev/debug)
- Logging de quando cada gate ativa

---

## 15. FLUXOS REDUNDANTES

### 1. Três pontos de entrada para chat:
```
ui.js:composerSubmit → chat.js:sendMsg
ui.js:startSkillChat → skills.js → chat.js:sendMsg
ui.js:startAgentChat → agents.js → chat.js:sendMsg
```

### 2. Duas formas de buscar memória:
```
memory.js:memorySearch (Supabase ilike)
tools.js:TOOL_REGISTRY.memory_search → memory.js:memorySearch
```
**Por que tool se o módulo já exporta a função?**

### 3. Dois sistemas de carregamento de agentes:
```
agents.js:loadAgentsFromModule (real)
app.js:loadAgents (wrapper que chama agents.js)
```
**Por que wrapper?**

---

## 16. RECOMMENDATIONS (SEM REFACTOR COMPLETO)

### Prioridade 1 - CRÍTICO:
1. **Implementar ou remover** `executeToolCallWithFallback` e fallbacks relacionados
2. **Documentar ordem de carregamento:** agents.js DEVE vir antes de app.js
3. **Remover código morto:** app.js:loadAgents (linhas 564-621 de tools.js)
4. **Corrigir** `supabase_query` em TOOL_STATUS_LABELS ou remover

### Prioridade 2 - IMPORTANTE:
5. **Consolidar QUICK_SKILLS:** mover de app.js para skills.js (única fonte de verdade)
6. **Documentar precedência:** Verification Engine → Grounding Gate → Narrative Validator
7. **Centralizar window.currentChatSource:** um módulo só deve gerenciar

### Prioridade 3 - MELHORIA:
8. **Criar manifest de window globals:** arquivo JSON com todos os window.* e quem cria
9. **Event listener registry:** mapa de quem cria quais listeners, cleanup automático
10. **Logging de gates:** quando cada validation gate ativa/bloqueia

---

## 17. CONCLUSÃO

### Arquitetura REAL vs DOCUMENTADA:
- **18 módulos JS** carregados em ordem específica
- **21 tools** registradas no TOOL_REGISTRY
- **13 window globals** espalhados por 7 módulos
- **27 event listeners** ativos
- **3 sistemas de validação** concorrentes (VerificationEngine, Grounding Gate, Narrative Validator)
- **2 roteadores de chat** (sendMsg, v12-turbo)

### Problemas principais:
1. **Código morto** (loadAgents em tools.js, fallback functions)
2. **Responsabilidades duplicadas** (skills em app.js e skills.js)
3. **Dependências implícitas** (agents.js bootstrap sem doc)
4. **Window pollution** (13 globals sem registro)
5. **Gates sem precedência clara** (validation flows)

### Estado atual:
✅ **Funcional** - sistema opera corretamente  
⚠️ **Frágil** - mudanças podem quebrar dependências implícitas  
📝 **Documentação desatualizada** - EXPORTA lists não refletem realidade  
🔄 **Refatoração necessária** - consolidar responsabilidades duplicadas

### Próximos passos sugeridos:
1. Implementar tools faltantes OU remover da documentação
2. Consolidar skills (única fonte de verdade)
3. Documentar ordem de execução dos validation gates
4. Criar manifesto de window globals
5. Cleanup de código morto

---
**FIM DA AUDITORIA**
