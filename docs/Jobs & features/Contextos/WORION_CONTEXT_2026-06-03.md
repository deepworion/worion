# WORION CONTEXT - Handoff 2026-06-03

Leia este arquivo antes de continuar o Worion Desktop.

---

## Regras Permanentes De Continuidade

**Regra 1:** `WORION_CONTEXT` e sempre a primeira fonte a ser lida antes de continuar qualquer sessao do Worion.

**Regra 2:** depois de ler o `WORION_CONTEXT`, ler todo o conteudo relevante indicado por ele, especialmente os documentos em:
- `C:\Users\User\worion-desktop\docs\Jobs & features\Atulizações\`
- `C:\Users\User\worion-desktop\docs\Jobs & features\Contextos\`

**Regra 3:** quando o Boss entregar contexto ou pedir encerramento, documentar tudo que foi feito em `docs/Jobs & features/Atulizações/` e atualizar/criar o `WORION_CONTEXT` datado em `docs/Jobs & features/Contextos/`.

**Regra 4:** se a data mudar, criar novos documentos datados nas duas pastas, carregando o estado final conhecido do dia anterior e registrando apenas o que mudou na nova data.

---

## Regra De Nomenclatura — OBRIGATORIA

Todo documento gerado em `C:\Users\User\worion-desktop\docs\Jobs & features\Atulizações\` deve seguir exatamente este padrao:

```
SESSAO_YYYY-MM-DD.md
```

**Exemplos corretos:**
- `SESSAO_2026-06-03.md`
- `SESSAO_2026-06-04.md`

**Proibido:**
- `REFATORACAO_UX_CHAT_2026-06-03.md` — descreve conteudo, nao e padrao
- `IMPLANTACAO_WORION_FASE_2.md` — sem data no inicio
- `MIGRATION_MEMORY_UNIFIED.md` — sem data, nome inventado
- `DIAGNOSTICO_MEMORY_CARDS_2026-06-03.md` — tema no nome, fora do padrao

**Regra de uma sessao por dia:**
Se ja existir `SESSAO_YYYY-MM-DD.md` para a data atual, incorporar o novo conteudo nele. Nunca criar um segundo arquivo para o mesmo dia. Se a data mudar, criar um novo arquivo com a nova data.

**Excecoes que podem ter nome proprio:**
Apenas documentos de sistema estaveis na raiz de `/docs`, como `WORION_IDENTITY.md`, `WORION_VOICE.md`, `AGENTS.md`. Esses nao sao atualizacoes — sao documentos de referencia permanente.

---

## Cabecalho De Integracao Notion — OBRIGATORIO

Todo arquivo `SESSAO_YYYY-MM-DD.md` deve comecar com este cabecalho, preenchido pela IA que gerou o documento, antes de qualquer outro conteudo:

```
---
NOTION_INTEGRATION:
  banco_de_dados: "📅 Sessoes de Desenvolvimento"
  pagina_pai: "🦁 Worion Desktop"
  pagina_pai_id: "36f8bcbf-b9ad-81da-9fbb-c787bac59baa"
  data_source_id: "c8ae4b92-b370-43d6-98cb-3c0ed1bafc9b"
  titulo_da_entrada: "YYYY-MM-DD — [resumo em ate 8 palavras]"
  data: "YYYY-MM-DD"
  status: "[🟢 Produtiva | 🟡 Diagnostico | 🔴 Bloqueada | ⚪ Planejamento]"
  modulos: "[lista dos modulos alterados: chat, tools, connectors, prompt, ui, agents, skills, memory, supabase, infra, deploy]"
  decisoes_tomadas: "[resumo das decisoes canonicas em 2-3 frases]"
  proximo_passo: "[acao imediata para a proxima sessao]"
COMO_INTEGRAR:
  1. Abrir o Notion no banco "📅 Sessoes de Desenvolvimento" dentro de "🦁 Worion Desktop"
  2. Criar nova entrada com o titulo acima
  3. Preencher as propriedades Data, Status, Modulos, Decisoes Tomadas e Proximo Passo
  4. Colar o conteudo deste arquivo no corpo da entrada
  5. Se a entrada do dia ja existir, editar e incorporar — nao criar duplicata
---
```

**Instrucao para a IA:** preencha todos os campos antes de salvar o arquivo. Nao deixe nenhum campo com o valor de exemplo entre colchetes. O cabecalho e o que permite que qualquer outra IA ou humano integre o documento no Notion sem precisar perguntar nada.

---

## Regra De Encerramento Da Sessao — ATUALIZADA

Quando o Boss entregar contexto ou pedir para encerrar a sessao, a IA deve executar estas etapas nesta ordem antes de parar:

**Etapa 1 — Nomear corretamente:**
Verificar se ja existe `C:\Users\User\worion-desktop\docs\Jobs & features\Atulizações\SESSAO_YYYY-MM-DD.md` para a data atual.
- Se existir: abrir e incorporar o conteudo novo.
- Se nao existir: criar com o nome no padrao `SESSAO_YYYY-MM-DD.md`.

**Etapa 2 — Preencher o cabecalho de integracao Notion:**
Preencher todos os campos do bloco `NOTION_INTEGRATION` no topo do arquivo.
Nao deixar campos vazios ou com valores de exemplo.

**Etapa 3 — Escrever o corpo do documento:**
O corpo deve conter: estado atual, arquivos alterados, causa raiz dos problemas resolvidos, decisoes canonicas, validacoes executadas, pendencias abertas e ordem recomendada para o proximo Codex.
Tudo que for feito no diagnostico durante a sessao deve ser incorporado neste documento, em vez de criar outro arquivo separado.

**Etapa 4 — Atualizar o WORION_CONTEXT:**
Criar ou atualizar `C:\Users\User\worion-desktop\docs\Jobs & features\Contextos\WORION_CONTEXT_YYYY-MM-DD.md` com o handoff final da sessao.

**Etapa 5 — Avisar o Boss:**
Confirmar que os dois documentos foram escritos e informar os nomes exatos.

---

## Resumo Da Sessao

Nesta sessao foram feitos patches cirurgicos no runtime do chat, UX de composer/status/anexos e, no fix final, no roteamento cognitivo.

O ponto mais importante do fix final:
- perguntas pessoais, privadas, com anexos, memoria, projeto ou conectores privados nao devem cair em pesquisa publica;
- `focused_research`, Brave, Tavily e `fetch_url` publico continuam funcionando apenas para escopo publico;
- `prompt.js` nao foi alterado nesta rodada de roteamento.

Nao houve mudanca de schema Supabase. A memoria semantica Supabase passou a ser usada pelo runtime como fonte privada na nova rota.

---

## Estado Atual

- Home: composer/modal centralizado antes da primeira mensagem.
- Chat iniciado: composer desce para o rodape.
- Chips Auto/Normal: dentro do container do composer, preservados na parte baixa.
- Status de resposta: uma unica linha textual, sem bolinha, estrela, spinner, glow ou badges multiplos.
- Novo Chat: reset mais agressivo de runtime para evitar sobras de conversa anterior.
- Primeira mensagem com imagem: anexo preservado ao sair da home e enviado no payload multimodal.
- Roteamento cognitivo: pergunta privada/contextual passa por resolucao de escopo antes de qualquer pesquisa publica.
- Memoria semantica Supabase: usada em `private_memory_context` via `searchInternalMemory`, `memory_search` e `memory_read_conversation`.
- Renderizacao de resposta: corrigido bug em que a resposta podia aparecer apenas com o trecho final quando a normalizacao cortava texto antes de `Detalhes:` ou a animacao trabalhava em DOM re-renderizado.
- Ask Selection: `Perguntar ao Worion` mantem o trecho selecionado em card/estado separado; o textarea mostra apenas a pergunta digitada pelo usuario.
- Prompt: `js/prompt.js` permanece restaurado de `js/backup prompt.txt`; nao mexer nele agora.
- Agentes: UX refatorada para estados de lista, detalhe e criacao; detalhe/criacao agora abrem em tela dedicada no painel principal, nao em drawer.
- Agentes: `window.agentsState` passa a controlar view, agente selecionado, draft, busca e agente ativo da conversa.
- Agentes/runtime: `startAgentChat()` grava `activeConversationAgentId`; `getActiveAgentForConversation()` resolve o agente ativo antes do model call.
- Agentes/runtime: agente ativo + link Notion passa a `private_connector_context` e rota privada; Brave/Tavily ficam proibidos nesse caminho.
- Agentes: documentos anexados sao contexto privado; PDF/imagens ficam anexados, mas leitura semantica depende de parser/runtime especifico.

---

## Arquivos Alterados Nesta Rodada

Codigo alterado antes do fix final:
- `js/chat.js`
- `js/ui.js`
- `js/ui/chat/execution-status.js`
- `js/ui/core/message-renderer.js`
- `js/app.js`
- `css/style.css`
- `js/prompt.js`

Codigo alterado no fix final de roteamento:
- `js/chat-routing.js`
- `js/chat-models.js`
- `js/chat.js`
- `js/tools.js`
- `js/ui.js`
- `js/chat-normalization.js`
- `js/ui/chat/typing-animation.js`
- `js/ui/text-selection/ask-selection.js`
- `js/ui/text-selection/selection-popover.js`

Codigo alterado no fix de Agentes:
- `js/ui.js`
- `js/agents.js`
- `js/chat.js`
- `js/chat-routing.js`
- `js/ui/views/agent-card-renderer.js`
- `js/ui/views/agent-helpers.js`

Documentacao:
- `C:\Users\User\worion-desktop\docs\Jobs & features\Contextos\WORION_CONTEXT_2026-06-03.md`
- `C:\Users\User\worion-desktop\docs\Jobs & features\Atulizações\SESSAO_2026-06-03.md`

Documento removido por consolidacao:
- `C:\Users\User\worion-desktop\docs\Jobs & features\Atulizações\DIAGNOSTICO_MEMORY_CARDS_2026-06-03.md`

---

## Organizacao De `/docs`

Documentos operacionais, historicos, diagnosticos, handoffs, correcoes, implantacoes e analises ficam em:
- `C:\Users\User\worion-desktop\docs\Jobs & features\Atulizações\` — um arquivo por dia, nome `SESSAO_YYYY-MM-DD.md`

A raiz de `/docs` e preservada para documentos de sistema/projeto estaveis:
- `docs/architecture.json`
- `docs/WORION_IDENTITY.md`
- `docs/WORION_VOICE.md`
- `docs/AGENTS.md`
- `docs/WORION.md`
- guias estruturais como grounding, memoria, pesquisa, model router e agentes.

Os contextos ficam em:
- `C:\Users\User\worion-desktop\docs\Jobs & features\Contextos\` — um arquivo por dia, nome `WORION_CONTEXT_YYYY-MM-DD.md`

Regra operacional: documentos novos de mudanca, diagnostico, UX, runtime, pesquisa, memoria, handoff e retomada devem ir para `Atulizações`, nao para a raiz de `/docs`.

---

## Fix Final - Roteamento Cognitivo Privado

### Causa raiz

O roteador tratava "fonte confiavel" como internet publica.

Isso fazia pedidos como:
- `Quem sou eu?`
- `O que eu sou?`
- `Leia meu Notion e me descreva.`
- `Com base nas minhas sessoes, o que eu sou?`
- `Com base nos arquivos que enviei, qual meu perfil?`
- `Tudo que voce leu se resume em 12 palavras?`

cairem em `focused_research`, chamando Brave/Tavily e buscando fontes genericas.

### Correcao

Foi adicionada uma camada de escopo em `js/chat-routing.js`:
- `uploaded_file_context`
- `private_connector_context`
- `private_memory_context`
- `private_project_context`
- `public_research`
- `conversation_or_general`

A ordem agora e:
1. resolver escopo;
2. se for privado/contextual, usar rota privada;
3. se for publico, permitir pesquisa publica;
4. caso contrario, responder com conversa/contexto geral.

### Nova rota privada

`js/chat-models.js` ganhou `runPrivateContextSynthesisRoute()`.

Fontes usadas pela rota:
- anexos carregados;
- conversa atual;
- contexto ja incorporado silenciosamente;
- projeto atual;
- Notion quando mencionado;
- contexto de conectores ja carregado;
- `searchInternalMemory()` da memoria semantica;
- `memory_search`;
- `memory_read_conversation`;
- memory cards ativos.

Fontes proibidas nessa rota:
- `brave_search`;
- `tavily_search`;
- `fetch_url` publico;
- Wikipedia, Pensador, letras de musica ou sites genericos como substituto de memoria pessoal.

### Relatorio de leitura

Toda rota privada gera `privateReadReport`:

```js
{
  route: 'private_context_synthesis',
  scope,
  sourcesRequested: [],
  sourcesFound: [],
  sourcesFetched: [],
  failedSources: [],
  totalFound: 0,
  totalFetched: 0
}
```

O modelo so pode dizer que leu tudo quando:

```js
privateReadReport.totalFound > 0 &&
privateReadReport.totalFetched === privateReadReport.totalFound
```

Se a leitura for parcial, a resposta deve assumir:

```
Li X de Y fontes. A sintese abaixo e parcial.
```

### Guardrail de runtime

`js/tools.js` agora bloqueia ferramentas publicas quando o escopo e privado:
- `brave_search`
- `tavily_search`
- `fetch_url`
- `web_search`
- `tavily_extract`

Log esperado:

```js
console.warn('[ROUTE GUARD] blocked public research for private context request', {
  questionScope,
  userMessage
});
```

### Pesquisa publica preservada

Continuam em `public_research`:
- `Pesquise fontes confiaveis sobre filosofia da identidade.`
- `Quanto custa Shopify hoje?`
- leis atuais, precos, noticias, cargos, autoridades, fontes publicas, verificacao externa explicita.

---

## Patches De Chat

### Novo Chat limpo

Foi adicionada rotina de reset em `js/chat.js` para limpar:
- conversa atual, mensagens, status visual, controller de resposta, flags de streaming, DOM de mensagens, previews de anexos, input, contexto dinamico temporario.

Objetivo: impedir vazamento de trechos antigos como `ou informacoes especificas, me avise!`.

### Anexos e multimodal

Correcoes:
- `startNewChatFromHome()` preserva anexos da home ao renderizar o chat ativo.
- Mensagem sem texto e com anexo usa `Analise os anexos enviados.`, nao `Anexo enviado: ...`.
- `formatMessageForOpenAI()` continua montando payload multimodal com `image_url`.
- Renderizador agora mostra preview inline de imagem na mensagem.

---

## Patches De Status Visual

Estado atual esperado:
- `Worion esta analisando sua mensagem...`
- `Worion esta raciocinando...`
- `Worion esta construindo a resposta...`
- Status some ao finalizar/interromper.

---

## Bug De Autoscroll

Erro corrigido: `Uncaught ReferenceError: pauseWorionAutoScroll is not defined`

Correcao:
- `js/ui.js` agora expoe `window.pauseWorionAutoScroll` e `window.resumeWorionAutoScroll`.

---

## Bug De Resposta Parcial / Buffer

Causa raiz:
- `cleanAgentResponse()` em `js/chat-normalization.js` procurava `Detalhes:` em qualquer posicao e fazia `slice()` depois do marcador, descartando o prefixo da resposta.
- `animateAssistantReply()` capturava `responseAbortRequested` uma unica vez e trabalhava em `contentEl` que podia ficar obsoleto.

Correcao:
- `cleanAgentResponse()` agora remove `Detalhes:` somente quando e marcador no inicio da resposta.
- A animacao de digitacao le `window.messages` e `window.responseAbortRequested` em tempo real.
- Cada frame revalida o elemento DOM ativo.
- Ao final, a mensagem e sempre substituida pelo texto completo preparado.

---

## Ask Selection / Composer

Causa raiz:
- O popover `Perguntar sobre` era acionado por `selectionchange` global e aceitava quase qualquer selecao fora de input/modal.
- Ao anexar um trecho, o foco voltava ao composer por `setTimeout`, deixando margem para o Enter ficar preso no estado de selecao/render.

Correcao:
- `getVisibleSelectionText()` agora aceita selecao apenas em fontes conversaveis: mensagens, memory cards, conteudo de projeto de memoria ou elementos marcados com `data-ask-selection-source`.
- Selecoes em sidebar, botoes, links, modais, composer e UI estrutural nao exibem o popover.
- O clique no popover apenas injeta o trecho no composer.
- `attachAskSelectionToComposer()` limpa a selecao, atualiza o card de contexto e foca o textarea no proximo frame, com cursor no fim.
- `js/ui.js` ganhou listener real de Enter para `textarea[data-chat-input="true"]`, cobrindo chat e home mesmo apos re-render do composer.
- Visual do popover mudou para piano black compacto, label `Perguntar ao Worion`, sem icone.

Adendo:
- O Electron registrou `ReferenceError: buildAskSelectionPrompt is not defined` em `js/chat.js:1048` ao enviar com Enter.
- Causa: `buildAskSelectionPrompt()` existia no modulo `ask-selection.js`, mas nao estava exposta em `window`, enquanto `sendMsg()` chamava o nome solto.
- Correcao: `js/ui.js` expoe `window.buildAskSelectionPrompt`; `js/chat.js` chama via `window.buildAskSelectionPrompt` com fallback local seguro.
- O listener de Enter agora captura rejeicoes e loga `[COMPOSER] erro ao enviar...` com contexto.

Adendo 2 - quote fora do textarea:
- Problema observado: apos clicar `Perguntar ao Worion`, o composer recebia a pergunta junto com bloco bruto `Trecho selecionado:` e fence ```text.
- Causa: `submitAskSelectionQuestion()` montava prompt completo com quote e fazia `chatInput.value = prompt` ou `homeInput.value = prompt`.
- Correcao: `submitAskSelectionQuestion()` agora coloca no textarea somente `visibleQuestion`.
- O trecho selecionado fica em `window.activeAskSelectionContext` e `window.worionAskSelectionText`.
- `sendMsg()` salva/renderiza historico visual com `content: userVisibleContent` e `quoteContext` separado.
- Ao montar `apiMessages`, mensagens de usuario com `quoteContext` sao convertidas apenas para o payload interno do modelo usando `Contexto citado pelo usuario`.
- Criterio canonico: o roteador e o historico visual veem a pergunta limpa; o modelo recebe o quote apenas como contexto auxiliar.

---

## Prompt

Decisao final: rollback cirurgico para `js/backup prompt.txt`. Hash confirmou MATCH.

Nao tentar limpar o prompt antigo agora.

---

## Validacoes Executadas

```bash
node --check js/chat-routing.js
node --check js/chat-models.js
node --check js/chat.js
node --check js/tools.js
node --check js/ui.js
node --check js/chat-normalization.js
node --check js/ui/chat/typing-animation.js
node --check js/ui/text-selection/selection-popover.js
node --check js/ui/text-selection/ask-selection.js
node --check js/chat.js
node --check js/ui.js
node --check js/ui/text-selection/selection-popover.js
```

Classificacao isolada:
```
Quem sou eu?                                           => private_memory_context / direct_answer
O que eu sou?                                          => private_memory_context / direct_answer
Leia meu Notion e diga meus padroes.                   => private_connector_context / direct_answer
Com base no PDF anexado, qual meu perfil?              => uploaded_file_context / direct_answer
Tudo que voce leu se resume em 12 palavras?            => conversation_or_general / direct_answer
Pesquise fontes confiaveis sobre filosofia da identidade. => public_research / focused_research
Quanto custa Shopify hoje?                             => public_research / focused_research
```

Guardrail: `brave_search` em `private_memory_context` retornou `blocked: true`.

`git diff --no-index -- js/prompt.js "js/backup prompt.txt"`: sem diferencas; prompt permanece igual ao backup.

`npm run validate`: falhou por pendencia preexistente (`memory-cards-runtime.js` fora de `architecture.json/load_order`). Nao causada pelo fix de roteamento.

---

## Validacao Manual Pendente

1. `Quem sou eu?` — esperado: `private_memory_context`; sem Brave/Tavily.
2. `O que eu sou?` — esperado: `private_memory_context`; sem Pensador/Wikipedia.
3. `Leia meu Notion e diga meus padroes.` — esperado: `private_connector_context`; usa Notion; sem Brave/Tavily.
4. `Com base no PDF anexado, qual meu perfil?` — esperado: `uploaded_file_context`; usa anexo; sem Brave/Tavily.
5. `Tudo que voce leu se resume em 12 palavras?` — esperado: conversa/contexto ja lido; sem busca publica.
6. `Pesquise fontes confiaveis sobre filosofia da identidade.` — esperado: `public_research`; Brave/Tavily permitidos.
7. `Quanto custa Shopify hoje?` — esperado: `public_research`; busca publica permitida.
8. Novo Chat com imagem colada/anexada na primeira mensagem.
9. Confirmar que nao aparece texto orfao de conversa anterior.
10. Confirmar que respostas com `Detalhes:` no meio nao perdem o inicio do texto.
11. Confirmar status unico textual durante resposta.
12. Confirmar que interromper resposta limpa o status.
13. Selecionar texto em resposta do chat e confirmar que aparece `Perguntar ao Worion`.
14. Selecionar texto em sidebar/header/botoes/composer e confirmar que o popover nao aparece.
15. Clicar `Perguntar ao Worion`, digitar no composer e enviar com Enter.
16. Confirmar que o textarea contem somente a pergunta digitada, sem `Trecho selecionado:`.
17. Confirmar que o historico visual nao mostra o quote bruto.
18. Confirmar que o modelo recebe o trecho apenas como contexto auxiliar.

---

## Fix 2 — hasExternalKnowledgeIntent (Sessao Final do Dia)

### Problema

Perguntas factuais como "Quando Platao viveu?" ou "Qual a epoca de Socrates?" caiam em `direct_answer` e o modelo **fabricava fontes** do conhecimento parametrizado (citava "Stanford Encyclopedia" sem ter consultado).

### Causa Raiz

Linha 257 de `js/chat-routing.js`:
```javascript
if (hasExternalKnowledgeIntent(plain)) return 'direct_answer';  // BUG
```

A funcao `hasExternalKnowledgeIntent` **detectava** corretamente que era uma pergunta factual, mas **roteava para conversa generica** em vez de pesquisa.

### Correcao

**1. Fortalecido `isDirectSelfReferenceInput` (linhas 192-208):**
```javascript
const asksAboutAssistant =
  /\b(sobre voce|sobre vc|voce e|vc e|voce esta|voce funciona|sua historia|seu funcionamento|como voce|o que voce)\b/i.test(plain);

return mentionsWorionOrAssistant && (asksAboutAssistant || mentionsRuntimeBehavior);
```

Bloqueia auto-referencia ("Me conta sobre voce") ANTES de cair em `hasExternalKnowledgeIntent`.

**2. Corrigido roteamento factual (linha 257):**
```javascript
if (hasExternalKnowledgeIntent(plain)) return 'focused_research';  // CORRIGIDO
```

### Impacto

- Perguntas factuais agora acionam Brave/Tavily ANTES da sintese
- Material real alimenta a resposta via `runDeterministicResearchRoute`
- Guardrails bloqueiam sintese se `fetchedPages.length === 0`
- Instrucao explicita ao modelo: "NAO invente, extrapole ou compare sem dados"

### Protecoes Confirmadas

| Tipo | Funcao | Exemplo | Rota |
|------|--------|---------|------|
| Opiniao | `isOpinionQuestion` | "o que voce acha?" | `opinion` |
| Definicao | `isDefinitionQuestion` | "o que e amor?" | `definition` |
| Casual | `isCasualConversation` | "como voce esta?" | `direct_answer` |
| Auto-referencia | `isDirectSelfReferenceInput` | "me conta sobre voce" | `direct_answer` |
| Factual | `hasExternalKnowledgeIntent` | "quando Platao viveu?" | `focused_research` |

### Validacao

```bash
node --check js/chat-routing.js  # ok
```

---

## Memory Cards — Classificacao Executada com Sucesso

**Decisao do Boss:** classificar chunks via Haiku em batch.

**Execucao:**
- Script: `run-classification.js` + `link-workestria.js`
- Modelo: Claude Haiku 4.5
- Tempo: ~15 minutos
- Resultado: 100% de sucesso

**Dados finais:**
- 6.222 chunks vinculados (100%)
- 105 conversas classificadas
- 8 cards ativos
- 0 chunks orfaos

**Cards criados:**
1. Tecnico Geral — Infra & Codigo (2.550 chunks, 41%)
2. Conversas Diversas (1.318 chunks, 21%)
3. Workestria — SaaS & Workflows (928 chunks, 15%)
4. Worion — Desenvolvimento & Arquitetura (658 chunks, 11%)
5. Rotina & Reflexoes Pessoais (626 chunks, 10%)
6. Luppet — Pipeline de Imagens (74 chunks, 1%)
7. Espiritualidade & Filosofia (54 chunks, 1%)
8. TCC & Escrita Academica (14 chunks, <1%)

**UX interativa adicionada:**
- Botao "Iniciar chat" nos cards
- Menu com Editar/Arquivar/Excluir
- Funcoes expostas: `startChatWithCard`, `editMemoryCardInline`, `archiveMemoryCardLocal`, `deleteMemoryCardLocal`

**Arquivos criados/modificados:**
- `run-classification.js`
- `link-workestria.js`
- `validate-cards.sql`
- `worion-api/server.js` (rota `/memory/classify-and-create-cards`)
- `js/ui.js` (4 novas funcoes)
- `css/style.css` (estilos do botao e menu)

---

---

## Fix 3 — Agentes: UX Dedicada + Runtime Privado

### Estado final conhecido

O Codex executou duas rodadas de correcao na area de Agentes.

Na primeira, removeu a dropzone da listagem, corrigiu handlers inline que nao estavam expostos em `window`, adicionou `closePanel()`, restringiu anexos do editor e adicionou status `Ativo/Inativo` persistido no markdown do agente.

Na segunda, refatorou a UX para uma tela dedicada de agente e vinculou o runtime ao agente ativo.

### Arquivos alterados

- `js/ui.js`
- `js/agents.js`
- `js/chat.js`
- `js/chat-routing.js`
- `js/ui/views/agent-card-renderer.js`
- `js/ui/views/agent-helpers.js`

### Causa raiz

- A tela de Agentes misturava listagem e `detail-panel`, causando drawer comprimido, scroll duplo e sobreposicao visual.
- `js/ui.js` roda como ES module; handlers inline usados no HTML nao estavam todos expostos em `window`.
- A dropzone aparecia na listagem e podia chamar fluxo de criacao/importacao automatica.
- O runtime nao tinha uma fonte unica de verdade para agente ativo.
- Agente, modelo e rota eram estados paralelos; conversa com agente ativo ainda podia cair em `focused_research`.

### Correcao aplicada

- Criado estado global:
```js
window.agentsState = {
  view,
  selectedAgentId,
  editingAgentDraft,
  activeConversationAgentId,
  searchQuery
}
```

- Listagem agora deve mostrar apenas:
  - titulo `Agentes`
  - busca
  - botao `+ Novo agente`
  - cards

- Detalhe/criacao de agente:
  - abre em tela dedicada no painel principal;
  - nao usa drawer comprimido;
  - `+ Novo agente` abre modo criacao;
  - `Editar` abre modo detalhe/edicao;
  - `← Todos os agentes` volta para lista e preserva busca;
  - dropzone aparece apenas dentro da tela de detalhe/criacao.

- Runtime:
  - `startAgentChat()` grava `activeConversationAgentId`;
  - `getActiveAgentForConversation()` resolve o agente ativo;
  - `hasNotionLink()` detecta links Notion;
  - log `[AGENT RUNTIME]` mostra agente, modelo, override manual, documentos, rota e escopo;
  - agente ativo + link Notion agora força `private_connector_context`;
  - agente ativo + documentos força `private_agent_context`;
  - busca automatica Brave/Tavily de dominio do agente foi desligada no fluxo de agente.

### Regras canonicas novas

1. Modelo nao e agente.
2. Agente ativo deve ser vinculado a conversa.
3. Documento do agente e contexto privado.
4. Link Notion em conversa com agente ativo nao pode cair em pesquisa publica.
5. A tela de Agentes nao deve usar drawer comprimido sobre a listagem.
6. PDF/imagens anexados ao agente nao devem ser tratados como texto lido sem parser/runtime proprio.

### Validacoes executadas

```bash
node --check js\agents.js
node --check js\chat.js
node --check js\chat-routing.js
node --check js\chat-models.js
node --check js\tools.js
node --check js\ui.js
node --check js\ui\views\agent-card-renderer.js
node --check js\ui\views\agent-helpers.js
```

Resultado:
- `node --check` passou nos arquivos alterados.
- `rg` confirmou que a dropzone antiga da listagem nao aparece mais em `js/ui.js`.
- `npm run validate` segue falhando por pendencia preexistente:
  - `memory-cards-runtime.js` sem documentacao em `architecture.json`;
  - `memory-cards-runtime.js` fora do `load_order`.

### Validacao manual pendente

1. Abrir `Agentes` e confirmar listagem limpa.
2. Clicar `+ Novo agente` e confirmar tela dedicada.
3. Clicar `Editar` e confirmar tela dedicada sem drawer.
4. Confirmar `← Todos os agentes`.
5. Confirmar salvar status `Ativo/Inativo`.
6. Confirmar anexos no agente.
7. Iniciar conversa com agente ativo e verificar `[AGENT RUNTIME]`.
8. Testar link Notion/Glaydson HQ com agente ativo:
   - esperado `private_connector_context`;
   - sem Brave/Tavily;
   - resposta baseada em Notion fetch/leitura privada.
9. Testar modelo manual vs modelo do agente.


## Proximo Codex - Ordem Recomendada Atualizada

1. Rodar `git status`.
2. Conferir que `prompt.js` continua identico a `backup prompt.txt`.
3. **Validar bugs corrigidos:**
   - Bug 1: Testar agente TDAH com multiplas perguntas de memoria (nao deve estourar TPM)
   - Bug 2: Confirmar que sintese privada nao e substituida por runtime facts quando ha fontes lidas
   - Bug 3: Testar "pesquise na internet X" com agente ativo (deve executar focused_research)
4. **Validar UX interativa dos Memory Cards:**
   - Botao "Iniciar chat" funcional
   - Menu Editar/Arquivar/Excluir
   - Busca semantica usando cards classificados
5. **Validar classificacao dos chunks:**
   - 8 cards ativos com distribuicao correta
   - Memoria contextual puxando do card correto
6. Abrir Worion Desktop.
7. Testar roteamento factual: "Quando Platao viveu?" deve acionar Brave/Tavily.
8. Testar auto-referencia: "Me conta sobre voce" NAO deve acionar pesquisa.
9. Testar Novo Chat com imagem.
10. Testar status unico.
11. Testar `Perguntar ao Worion` com quote separado.
12. Validar agentes: tela dedicada, anexos, runtime privado.
13. Implementar rota hibrida completa (Bug 3) se necessario.
14. Corrigir `architecture.json/load_order` se validacao exigir.

---

---

## Proximo Codex - Ordem Recomendada Atualizada

1. Rodar `git status`.
2. Conferir que `js/prompt.js` continua identico a `backup prompt.txt`.
3. Validar manualmente UX de Agentes:
   - listagem limpa;
   - tela dedicada de criacao;
   - tela dedicada de edicao;
   - voltar para lista;
   - salvar status;
   - anexar documentos.
4. Testar agente ativo + link Notion/Glaydson HQ:
   - `scope = private_connector_context`;
   - `route = private_context_synthesis`;
   - sem Brave/Tavily;
   - log `[AGENT RUNTIME]`.
5. Testar anexos do agente como contexto privado.
6. Testar override manual de modelo vs modelo padrao do agente.
7. Decidir estrategia de sintese Memory Cards.
8. Corrigir `architecture.json/load_order` para `memory-cards-runtime.js` se validacao exigir.
9. Reexecutar `npm run validate`.
10. Atualizar a pagina Notion da sessao com este handoff consolidado.


## Bug Fixes — Runtime Validacao (Sessao Final)

Tres bugs identificados na validacao runtime do agente TDAH:

**Bug 1 — TPM estouro + Bibliotecario burro:** `memory_read_conversation` puxava 26k chars/conversa e era chamado sempre, mesmo quando `memory_search` ja retornava chunks com conteudo. Corrigido em duas etapas:
  1. Reduzido max_chars de 26k para 2k
  2. Usa chunks diretamente; `memory_read_conversation` so e chamado quando ha intencao de continuidade narrativa (sessao, ontem, decidimos, etc)
  Reducao total: ~85% em tokens consumidos. Arquivo: `js/chat-models.js:1273-1350`.

**Bug 2 — INTROSPECTION GUARDRAIL bloqueando sintese privada legitima:** Guardrail substituia respostas validas quando `privateReadReport.totalFetched > 0`. Corrigido para preservar sintese quando ha fontes privadas reais. Arquivo: `js/chat.js:1805-1819`.

**Bug 3 — Rota hibrida inexistente (parcial):** Agente ativo + "pesquise na internet" travava. Corrigido para bifurcar para `focused_research`, mas contexto privado nao e injetado na sintese (implementacao completa pendente). Arquivo: `js/chat.js:1564-1577`.

Validacao: `node --check js/chat.js` e `js/chat-models.js` passaram.

---

## Cuidado

- Nao mexer no prompt antes de validar runtime.
- Nao enviar link privado para busca publica.
- Nao alterar Supabase/schema sem pedido explicito.
- Nao alterar UI/anexo/status quando o assunto for prompt.

---

## Estado Canonico Final - Memory Atoms V1

Memory Atoms V1 foi implementado e validado.

### Arquivos criados

- `migrations/create_memory_atoms_v1.sql`
- `scripts/memory-atomizer-haiku.js`
- `artifacts/memory-atoms/final-validation-summary.json`

### Arquivos alterados

- `js/contextGuardian.js`
- `js/tools.js`
- `js/chat-models.js`

### Estado final no banco

- `memory_chunks`: 6.222
- `memory_conversations`: 106
- `memory_cards_v2` ativos: 9
- `memory_atoms_v1` ativos: 1.962

### Validacoes de qualidade

- 0 atoms sem `source_chunk_ids`
- 0 atoms sem `card_id`
- 0 atoms sem `type`
- 0 atoms sem `retrieval_text`
- 0 atoms com `confidence < 0.70`
- 0 duplicatas lexicais por `(type, title, card_id)`

### Correcao conceitual

- Chunks deixaram de ser tratados como memoria final.
- `memory_atoms_v1` agora e a camada principal de memoria recuperavel.
- `memory_search` prioriza `memory_atoms_v1`.
- `memory_chunks` ficam como fallback/evidencia.
- `memory_read_conversation` fica restrito a intencao temporal/narrativa.

### Relatorios grandes

- O atomizer agora grava relatorios completos em arquivo JSON.
- Console/chat mostram apenas resumo operacional.
- Relatorios ficam em `artifacts/memory-atoms`.
- Resumo final: `artifacts/memory-atoms/final-validation-summary.json`.

### Regra canonica nova

Worion nao recupera chunks por padrao.
Worion recupera `memory_atoms_v1`.
Chunks sao evidencia.
Conversas completas sao contexto narrativo.
Cards sao organizacao macro.

### Pendencias

- `npm run validate` ainda falha por pendencia preexistente: `js/memory-cards-runtime.js` esta fora de `docs/architecture.json/load_order`.
- Card ativo `Conceito 0 - Espiritualidade / Sonhos / Hermetismo` nao gerou atoms porque nao havia chunks vinculaveis pelo schema atual.

---

## Proximo Codex / Proxima Sessao - Ordem Canonica Final

1. Rodar `git status`.
2. Confirmar `prompt.js` identico a `backup prompt.txt`.
3. Corrigir `architecture.json/load_order` para incluir `js/memory-cards-runtime.js`.
4. Reexecutar `npm run validate`.
5. Testar runtime:
   - `Quem sou eu?`
   - `Me fale sobre meu diagnostico.`
   - `O que decidimos sobre agentes?`
   - `O que aconteceu ontem?`
6. Confirmar que `memory_atoms_v1` e usado primeiro.
7. Confirmar que nao chama Brave/Tavily em pergunta privada.
8. Confirmar que chunks nao sao despejados no prompt.
9. So depois atualizar Notion/Worion Desktop com o estado consolidado.

---

## Fix Final Do Dia - DeepSeek 400 Por JSON Invalido

Estado incorporado ao contexto: DeepSeek falhava com erro 400 ao receber payload com `messages[0].content` contendo escape textual quebrado.

Erro observado:

```txt
messages[0].content: unexpected end of hex escape
```

Correcao aplicada:

- `js/chat-models.js` ganhou `sanitizeModelContent()` e `sanitizeModelMessages()`.
- `worion-api/server.js` ganhou as mesmas funcoes.
- Mensagens enviadas para a Worion API local sao saneadas antes de `JSON.stringify`.
- Mensagens repassadas pela API local tambem sao saneadas antes do provider.
- `normalizeMessagesForDeepSeek()` saneia o conteudo no fallback direto.
- Conteudo multimodal em array/objeto e preservado; apenas texto em `text`/`content` e limpo.

Sanitizacao aplicada:

- remove caracteres de controle invalidos, preservando `\n`, `\r` e `\t`;
- normaliza `\r\n` para `\n`;
- neutraliza sequencias textuais quebradas `\x` e `\u` incompletas.

Validacoes executadas:

```bash
node --check js/chat-models.js
node --check worion-api/server.js
node -e "<teste local de JSON.stringify/JSON.parse com C:\\Users, \\x, \\u e caractere de controle>"
```

Nao foi chamado provider externo neste teste. Nao houve alteracao em `prompt.js`, Memory Cards, Supabase, agentes, roteamento, Notion ou atomizer.
