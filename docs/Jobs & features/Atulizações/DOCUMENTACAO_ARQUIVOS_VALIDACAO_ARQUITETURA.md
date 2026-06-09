# Documentacao dos arquivos pendentes na validacao arquitetural

Data: 2026-05-20

Este documento descreve os arquivos que o validador `scripts/validate-architecture.js`
apontou como ausentes em `docs/architecture.json` e/ou fora de `load_order`.
Ele nao altera a arquitetura; serve como base para atualizar o manifesto depois.

## Resumo

| Arquivo | Linhas | Status no validador | Responsabilidade principal |
| --- | ---: | --- | --- |
| `js/agents.js` | 97 | Fora de `architecture.json` e `load_order` | Estado, descoberta e inicializacao de agentes locais |
| `js/cognitive-skills.js` | 746 | Fora de `architecture.json`, `load_order` e sem cabecalho JSDoc | Motor cognitivo declarativo para adaptar prompt e comportamento |
| `js/contextGuardian.js` | 152 | Fora de `architecture.json` e `load_order` | Indexacao silenciosa de memoria conversacional interna |
| `js/skills.js` | 286 | Fora de `architecture.json` e `load_order` | Definicao e ativacao de skills rapidas e modos de trabalho |
| `js/tracing.js` | 268 | Fora de `architecture.json` e `load_order` | Tracing resiliente no LangSmith |
| `js/v12-turbo.js` | 210 | Fora de `architecture.json` e `load_order` | Planejamento de tarefas, pipeline de objetivo e memoria recente |
| `js/verification.js` | 566 | Fora de `architecture.json` e `load_order` | Verification Engine, verificacao factual e detector antievasao |

## Ordem real de carregamento

Os arquivos estao carregados em `index.html` nesta ordem relativa:

1. `js/tracing.js`
2. `js/contextGuardian.js`
3. `js/cognitive-skills.js`
4. `js/v12-turbo.js`
5. `js/agents.js`
6. `js/skills.js`
7. `js/verification.js`

Essa ordem deve ser refletida em `docs/architecture.json` caso o manifesto passe a
cobrir todos os scripts ativos do renderer.

## `js/agents.js`

### Responsabilidade

Centraliza o estado global de agentes do Worion no renderer Electron. Descobre
arquivos Markdown em `agents/`, transforma cada arquivo em um objeto de agente,
carrega documentos associados, extrai metadados e inicia chats vinculados a
agentes.

### Dependencias

- Node/Electron renderer: `fs.promises`, `path`, `__dirname`
- Diretorios:
  - `agents/`
  - `agents/_docs/`
- Funcoes globais usadas em tempo de execucao:
  - `getAgentDescription`
  - `loadAgentDocuments`
  - `getAgentPromptContent`
  - `buildAgentSpecializationProfile`
  - `formatTime`
  - `renderCards`
  - `renderSidebarSkills`
  - `refreshSidebarConversations`
  - `startChat`

### Exportacoes e globais

- `window.fs`
- `window.path`
- `window.AGENTS_DIR`
- `window.AGENT_DOCS_DIR`
- `window.WORION_AGENTS`
- `AGENTS_DIR`
- `AGENT_DOCS_DIR`
- `agents`
- `selected`
- `currentAgent`
- `syncWorionAgentsGlobal()`
- `loadAgentsFromModule()`
- `reloadAgents()`
- `startAgentChat(id)`

### Fluxo principal

1. Define os diretorios de agentes.
2. Le arquivos `.md` dentro de `agents/`.
3. Extrai nome, descricao, modelo, webhook, documentos e perfil de especializacao.
4. Atualiza `window.WORION_AGENTS`.
5. Renderiza cards/sidebar.
6. Ao iniciar chat, limpa estado de skill/modo e abre uma conversa nova com o agente.

### Consumidores conhecidos

- `js/app.js` chama `loadAgentsFromModule()`.
- `js/ui.js` referencia `startAgentChat(...)`.
- `js/chat.js` depende de `currentAgent`/`selected` durante envio.

### Riscos de alteracao

- Mudancas em nomes globais quebram UI e fluxo de chat.
- Alterar a forma do objeto de agente pode quebrar prompt, documentos e renderizacao.
- Erros de leitura em `agents/` devem continuar sendo tratados sem quebrar o app.

## `js/cognitive-skills.js`

### Responsabilidade

Implementa o Cognitive Skills Engine v8.0. O modulo analisa a mensagem do usuario,
arquivos anexados e historico interno para selecionar modos cognitivos, skills
ativas e instrucoes de comportamento que sao injetadas no prompt final.

### Dependencias

- Nao depende diretamente de outros modulos para construir o motor.
- E consumido por `js/prompt.js` via `window.cognitiveEngine.applyToPrompt(...)`.
- Pode ser usado via `module.exports` em ambiente Node/teste.

### Estruturas principais

- `COGNITIVE_SKILLS`: catalogo declarativo de skills, sinais, thresholds,
  negacoes, prioridades, modos e comportamentos.
- `MODE_RULES`: regras por modo cognitivo.
- `CONFLICT_RULES`: resolucao declarativa de conflitos entre modos.
- `CognitiveEngine`: classe principal do motor.

### API publica

Browser/Electron:

- `window.cognitiveEngine.CognitiveEngine`
- `window.cognitiveEngine.engine`
- `window.cognitiveEngine.analyze(msg, files, opt)`
- `window.cognitiveEngine.applyToPrompt(base, msg, files, opt)`
- `window.cognitiveEngine.buildInjection(state)`
- `window.cognitiveEngine.reset()`

Node/CommonJS:

- `CognitiveEngine`
- `engine`
- `analyze(...)`
- `applyToPrompt(...)`
- `buildInjection(...)`
- `reset()`

### Metodos internos relevantes

- `_normalize(text)`
- `_matchesKeyword(...)`
- `_isNegated(...)`
- `_detectEmotionalIntensity(...)`
- `_calculateSynergy(...)`
- `_classifyMedia(file)`
- `_scoreSkill(...)`
- `_recordMemory(...)`
- `_updateProfile(...)`
- `_getBlendedHistory()`
- `_resolveConflicts(...)`

### Fluxo principal

1. Classifica midias anexadas.
2. Pontua skills por keyword, pattern, contexto, midia, threshold e sinergia.
3. Agrega pontuacao por modo.
4. Mistura score atual com historico interno com decaimento.
5. Resolve modo primario, modos secundarios e conflitos.
6. Atualiza memoria/perfil local do motor.
7. Gera uma injecao `[COGNITIVE_ENGINE_v8]` para o prompt.

### Consumidores conhecidos

- `js/prompt.js` aplica a injecao cognitiva no prompt.

### Riscos de alteracao

- Este modulo altera diretamente o comportamento do modelo.
- Mudancas em thresholds, negacoes ou prioridades podem ativar modos errados.
- Como tem memoria interna, bugs podem persistir dentro da sessao.
- O validador atual reclama porque o arquivo usa comentario de linha no topo, nao
  cabecalho JSDoc `/** ... */`.

## `js/contextGuardian.js`

### Responsabilidade

Indexa conversas recentes em uma memoria interna no Supabase, de forma silenciosa.
Tambem recupera trechos de memoria interna por termos de busca para enriquecer o
contexto de chat.

### Dependencias

- `connectors.js`:
  - `MEMORY_SUPABASE_URL`
  - `memorySupabaseHeaders`
- `chat.js`/runtime:
  - `openaiKey`
  - `getOpenAIKey`
  - `callOpenAIWithRetry`
  - `currentConversationId`
  - `messages`
  - `getConversationTitle`
  - `makeId`
- Supabase table:
  - `worion_internal_memory`

### Exportacoes e globais

- `queueContextIndexing(conversationId, sourceMessages)`
- `runContextGuardian(conversationId, sourceMessages)`
- `saveInternalMemory(payload)`
- `searchInternalMemory(query)`

### Fluxo principal

1. `queueContextIndexing(...)` recebe snapshot das ultimas mensagens.
2. A fila serializa execucoes para evitar concorrencia.
3. `runContextGuardian(...)` chama OpenAI para resumir conversa como JSON.
4. O payload estruturado e salvo em `worion_internal_memory`.
5. `searchInternalMemory(...)` busca por termos relevantes e retorna bloco textual.

### Consumidores conhecidos

- `js/chat.js` chama `searchInternalMemory(content)` antes de montar contexto.
- `js/chat.js` chama `queueContextIndexing(...)` ao final de uma conversa.

### Riscos de alteracao

- Mudancas no payload podem quebrar compatibilidade com a tabela Supabase.
- Falhas devem permanecer silenciosas para nao bloquear chat.
- Busca usa `ilike` simples; ampliar isso pode alterar performance/custo.

## `js/skills.js`

### Responsabilidade

Define skills rapidas, categorias de skills, modos de trabalho e estado ativo de
skill/modo. Tambem inicia chats em modo skill.

### Dependencias

- UI/runtime:
  - `renderSidebarSkills`
  - `renderWorkModeSelector`
  - `renderActiveSkillStatus`
  - `getWorkModeSelectorLabel`
  - `startChat`
- Estado global:
  - `currentProjectContext`
  - `currentAgent`
  - `selected`
  - `currentConversationId`
  - `messages`
  - `sessionStartedAt`
- Agentes:
  - `getDefaultAgent`

### Exportacoes e globais

- `window.WORION_SKILLS`
- `window.WORION_WORK_MODES`
- `QUICK_SKILLS`
- `WORION_SKILL_CATEGORIES`
- `WORK_MODES`
- `activeSkillId`
- `activeWorkModeId`
- `activeWorkModeIds`
- `getSkillCategories()`
- `getActiveSkill()`
- `getActiveWorkMode()`
- `getActiveWorkModeIds()`
- `getActiveWorkModes()`
- `hasActiveWorkMode(modeId)`
- `setActiveSkillFromChip(skillId)`
- `setActiveWorkMode(modeId)`
- `toggleActiveWorkMode(modeId)`
- `clearActiveWorkModes()`
- `startSkillChat(skillId)`

### Fluxo principal

1. Mantem catalogos declarativos de skills e modos.
2. Controla selecao exclusiva entre skill ativa e modos de trabalho.
3. Atualiza UI do composer/sidebar quando a selecao muda.
4. Inicia um chat novo com o agente padrao quando uma skill e escolhida.

### Consumidores conhecidos

- `js/ui.js` renderiza cards, sidebar e botoes de skill/mode.
- `js/chat.js` consulta skill/modo ativo para montar contexto de resposta.

### Riscos de alteracao

- Mudancas nos IDs quebram historico, UI e seletores.
- Textos de prompt influenciam diretamente respostas do modelo.
- Seletores manipulam DOM diretamente; alterar classes/markup exige revisar UI.

## `js/tracing.js`

### Responsabilidade

Inicializa e opera tracing resiliente no LangSmith, com redacao de segredos,
truncamento de payloads e registro de passos do fluxo de chat/ferramentas.

### Dependencias

- Pacote npm:
  - `langsmith`
- Vault/Supabase:
  - `supabase`
  - `SUPABASE_URL`
  - `supabaseHeaders`
  - tabela `api_keys_vault_v2`
- Variaveis de ambiente usadas/definidas:
  - `LANGSMITH_PROJECT`
  - `LANGCHAIN_TRACING_V2`
  - `LANGSMITH_API_KEY`

### Exportacoes e globais

- `initTracing()`
- `startTrace(name, metadata)`
- `logStep(run, stepName, input, output)`
- `endTrace(run, output)`
- `traceError(run, stepName, error)`
- `setCurrentTraceRun(run)`
- `getCurrentTraceRun()`
- `updateTraceMetadata(run, metadata)`
- `markTraceFlag(run, flagName, value)`

### Fluxo principal

1. Busca a API key do LangSmith no vault.
2. Inicializa `Client` e `RunTree`.
3. Cria run principal por mensagem.
4. Cria filhos para etapas, LLMs e tools.
5. Sanitiza todos os payloads antes de enviar.
6. Finaliza ou registra erro sem derrubar o fluxo principal.

### Consumidores conhecidos

- `js/app.js` chama `initTracing()`.
- `js/chat.js` cria trace de mensagem e registra etapas do fluxo.
- `js/tools.js` usa tracing para execucoes de ferramentas.

### Riscos de alteracao

- Nunca logar tokens, secrets ou payloads completos sensiveis.
- O tracing deve ser opcional; ausencia de chave nao pode quebrar o app.
- Falhas de rede/LangSmith devem ser tratadas como degradacao silenciosa.

## `js/v12-turbo.js`

### Responsabilidade

Implementa um motor de planejamento simples para objetivos compostos: gera plano
de ferramentas, executa pipeline passo a passo, injeta memoria recente e produz
relatorio final de objetivo.

### Dependencias

- `tools.js`:
  - `executeToolCall`
  - `executeToolCallWithFallback`
- UI/runtime:
  - `showExecutionStatus`
  - `hideExecutionStatus`
  - `logInternalAction`
- Estado global:
  - `window.currentGoalAborted`
  - `currentGoalAborted`
  - `window.dynamicMemoryContext`

### Exportacoes e globais

- `generateTaskPlan(userMessage)`
- `extractToolCallsFromPlan(planText)`
- `parseParams(paramString)`
- `injectRecentMemory()`
- `buildFullSystemPrompt(basePrompt)`
- `getWelcomeMessage()`
- `executeGoalPipeline(taskPlan)`
- `generateGoalReport(goal, results, status)`

### Fluxo principal

1. Usa `sequential_thinking` para gerar um plano textual de tools.
2. Extrai chamadas no formato `tool(param=value)`.
3. Executa cada passo com fallback.
4. Interrompe em abort ou resultado bloqueado.
5. Gera relatorio consolidado com status e resultado principal.
6. Pode injetar memoria recente no prompt via `window.dynamicMemoryContext`.

### Consumidores conhecidos

- Fluxo de Goal Execution em `js/chat.js`.
- Ferramentas registradas em `js/tools.js`.

### Riscos de alteracao

- Parser de parametros e simples; entradas complexas podem ser interpretadas de
  forma incorreta.
- Pipeline depende da existencia e estabilidade de tools registradas.
- Mudancas no formato do relatorio podem afetar renderizacao do chat.

## `js/verification.js`

### Responsabilidade

Fornece o Worion Verification Engine. Classifica perguntas factuais, detecta
dominios criticos, cria plano de verificacao, exige evidencia externa quando
necessario, valida tool calls e detecta respostas evasivas em pedidos de
pesquisa/listagem.

### Dependencias

- Sem dependencias diretas por import/require.
- Consumido por `js/chat.js` via `window.WorionVerificationEngine`.
- Deve ser lido junto com:
  - `js/chat.js`
  - `js/prompt.js`

### Estruturas principais

- `CRITICAL_DOMAINS`: dominios que exigem verificacao e numero minimo de fontes.
- `FACTUAL_PATTERNS`: padroes de perguntas factuais.
- `CHALLENGE_PATTERNS`: padroes de contestacao do usuario.
- `SOURCE_HIERARCHY`: hierarquia de fontes por dominio.
- `EVASIVE_RESEARCH_PATTERNS`: padroes de evasao em pesquisa/listagem.

### API publica

- `window.WorionVerificationEngine.classifyQuestionType(userMessage)`
- `window.WorionVerificationEngine.requiresVerification(userMessage)`
- `window.WorionVerificationEngine.detectDomain(userMessage)`
- `window.WorionVerificationEngine.getSourceHierarchy(domain)`
- `window.WorionVerificationEngine.buildVerificationInstruction(userMessage)`
- `window.WorionVerificationEngine.scoreConfidence(evidenceItems)`
- `window.WorionVerificationEngine.detectContradictions(evidenceItems)`
- `window.WorionVerificationEngine.createVerificationPlan(userMessage)`
- `window.WorionVerificationEngine.countExternalEvidence(toolCalls)`
- `window.WorionVerificationEngine.validateResponse(verificationPlan, evidenceUsed)`
- `window.WorionVerificationEngine.isEvasiveResearchAnswer(responseText, userMessage)`
- `window.WorionVerificationEngine.buildResearchRepairPrompt(userMessage)`
- `window.WorionVerificationEngine.looksLikeResearchRequest(userMessage)`
- `window.WorionVerificationEngine.CRITICAL_DOMAINS`
- `window.WorionVerificationEngine.SOURCE_HIERARCHY`
- `window.WorionVerificationEngine.EVASIVE_RESEARCH_PATTERNS`

### Fluxo principal

1. Classifica a mensagem como factual, opinativa, procedural ou conversacional.
2. Detecta dominio critico.
3. Cria plano de verificacao com minimo de fontes.
4. Gera instrucao de verificacao para o prompt.
5. Conta evidencia externa em tool calls.
6. Valida se os requisitos foram atendidos.
7. Detecta evasao em pesquisas/listagens e gera prompt de reparo.

### Consumidores conhecidos

- `js/chat.js` usa:
  - `createVerificationPlan`
  - `requiresVerification`
  - `detectDomain`
  - `buildVerificationInstruction`
  - `countExternalEvidence`
  - `validateResponse`
  - `looksLikeResearchRequest`
  - `isEvasiveResearchAnswer`
  - `buildResearchRepairPrompt`

### Riscos de alteracao

- Regras muito rigidas podem gerar bloqueio excessivo ou resposta evasiva.
- Regras muito permissivas podem permitir alucinacao factual.
- O modulo precisa permanecer alinhado ao Evidence Pack em `js/chat.js`.
- Alterar strings de bloqueio/reparo pode conflitar com o Narrative Claim Validator.

## Recomendacao para atualizar `architecture.json`

Quando for atualizar o manifesto, incluir estes arquivos em `modules` e em
`load_order` seguindo a ordem real do `index.html`.

Ordem recomendada para inserir depois dos modulos base atuais:

1. `js/tracing.js`
2. `js/contextGuardian.js`
3. `js/cognitive-skills.js`
4. `js/v12-turbo.js`
5. `js/agents.js`
6. `js/skills.js`
7. `js/verification.js`

Observacao: `js/cognitive-skills.js` tambem precisa de decisao separada sobre o
cabecalho JSDoc. O validador exige `/** ... */`, mas o arquivo hoje usa
comentarios de linha. Alterar esse cabecalho e uma mudanca pequena, porem toca
um modulo que estava protegido no protocolo anterior.

