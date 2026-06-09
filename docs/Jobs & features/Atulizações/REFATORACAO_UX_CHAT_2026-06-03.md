# REFATORACAO UX CHAT + MEMORY CARDS + ROTEAMENTO - Atualizacao 2026-06-03

Documento consolidado para Notion/handoff.

Local canonico nesta organizacao:
- `docs/Jobs & features/Atulizações/REFATORACAO_UX_CHAT_2026-06-03.md`

Substitui nesta rodada:
- `REFATORACAO_UX_CHAT_2026-06-03.md`
- `DIAGNOSTICO_MEMORY_CARDS_2026-06-03.md`

O diagnostico separado de Memory Cards foi incorporado aqui e removido para reduzir duplicacao.

## Escopo

Correcoes objetivas feitas apos a refatoracao inicial de 02/06/2026.

O foco ficou em tres blocos:
- UX do chat: composer, espacamento, status, anexos e Novo Chat limpo;
- Memory Cards: estado herdado, impacto do prompt restaurado e validacoes pendentes;
- roteamento cognitivo: impedir pesquisa publica em perguntas privadas/contextuais.
- renderizacao de resposta: impedir perda do inicio do texto por normalizacao/animacao.

## Organizacao De Docs - 2026-06-03

Foi feita limpeza da raiz de `/docs`.

Movidos para `docs/Jobs & features/Atulizações/`:
- diagnosticos;
- handoffs;
- correcoes;
- implantacoes;
- inventarios;
- retomadas;
- analises;
- documentos consolidados de UX/memoria/roteamento.

Mantidos na raiz de `/docs`:
- documentos lidos por runtime ou validacao (`architecture.json`, `WORION_IDENTITY.md`, `WORION_VOICE.md`);
- contratos estaveis de sistema/projeto (`AGENTS.md`, `WORION.md`, grounding, memoria, pesquisa, agentes e model router).

Regra nova:
- `WORION_CONTEXT` datado em `docs/Jobs & features/Contextos/` e a primeira fonte de continuidade;
- todo diagnostico/execucao/handoff novo deve ser documentado em `docs/Jobs & features/Atulizações/`;
- quando a data mudar, criar novo par datado em `Contextos` e `Atulizações`.

## Estado Visual Esperado

### Composer

Home:
- composer/modal centralizado;
- chips dentro do container;
- chips preservados na parte baixa.

Chat ativo:
- composer desce para o rodape;
- `position: sticky`;
- chips Auto/Normal continuam dentro do container, na faixa baixa;
- botao de enviar e anexo permanecem alinhados na area principal.

### Mensagens

O espacamento textual foi reduzido porque estava parecendo "duas pessoas conversando longe".

Ajustes em `css/style.css`:
- `.markdown-premium` voltou a `white-space: normal`;
- line-height reduzido;
- margins de paragrafos/headings/listas/pre/table/hr reduzidas;
- media queries mobile nao reintroduzem gaps grandes.

## Status Visual

Problema:
- aparecia bolinha/luz animada;
- apareciam varios textos/badges ao mesmo tempo;
- exemplos: `Worion: raciocinando...`, `Worion: construindo resposta...`.

Correcao:
- status agora e uma unica linha textual;
- sem bolinha;
- sem estrela;
- sem particulas;
- sem trilha/badges;
- atualiza o mesmo elemento no DOM.

Arquivos:
- `js/ui.js`
- `js/ui/chat/execution-status.js`
- `js/app.js`
- `css/style.css`

Textos esperados:
- `Worion esta analisando sua mensagem...`
- `Worion esta raciocinando...`
- `Worion esta construindo a resposta...`

Ao finalizar ou interromper:
- status deve sumir.

## Novo Chat Limpo

Problema observado:
- ao abrir Novo Chat e enviar primeira mensagem, aparecia trecho de resposta antiga:
  `ou informacoes especificas, me avise!`

Correcao:
- `js/chat.js` ganhou reset mais agressivo de runtime;
- limpa mensagens, conversa atual, DOM, status, controller de resposta, flags e previews.

Funcao relevante:
- `resetChatRuntimeState()`

Tambem chamada ao voltar para `showHomeView()`.

## Anexos e Imagens

Problema:
- primeira mensagem com imagem perdia o anexo ao migrar da home para o chat;
- o historico mostrava apenas texto/nome de arquivo;
- modelo respondia que nao conseguia visualizar.

Correcoes:
- `startNewChatFromHome()` preserva `attachedFiles` antes de limpar composer;
- depois restaura anexos no chat ativo antes de chamar `sendMsg()`;
- mensagem sem texto com anexo usa `Analise os anexos enviados.`;
- nao usa mais `Anexo enviado: ...`;
- preview inline de imagem foi restaurado no renderizador.

Arquivos:
- `js/chat.js`
- `js/ui/core/message-renderer.js`
- `js/ui.js`

## Bug De Autoscroll

Erro observado:

```text
Uncaught ReferenceError: pauseWorionAutoScroll is not defined
at HTMLDivElement.onclick
```

Correcao:
- `js/ui.js` agora expoe `window.pauseWorionAutoScroll`;
- tambem expoe `window.resumeWorionAutoScroll`;
- clicar no conteudo da resposta nao quebra mais o runtime.

## Bug De Resposta Parcial / Buffer

Sintoma:
- pelo print, a resposta do assistente aparecia apenas com o trecho final, como `ao seu redor. O que acha?`;
- isso indicava perda de conteudo antes da camada visual final, nao apenas CSS.

Causa raiz:
- `js/chat-normalization.js` tinha um `cleanAgentResponse()` que encontrava `Detalhes:` em qualquer lugar da resposta e fazia `slice()` dali em diante;
- quando o modelo escrevia `Detalhes:` no meio de uma resposta normal, o comeco era descartado antes de chegar ao renderizador;
- `js/ui/chat/typing-animation.js` tambem guardava `responseAbortRequested` como snapshot e atualizava um `contentEl` potencialmente obsoleto apos re-render do chat.

Correcao:
- `cleanAgentResponse()` so remove `Detalhes:` quando esse marcador esta no inicio da resposta;
- a animacao passou a consultar `window.messages` e `window.responseAbortRequested` em tempo real;
- cada frame revalida o no `assistant-message-content-*` conectado ao DOM;
- ao terminar, o runtime renderiza o texto completo preparado, nao o ultimo frame parcial.

Arquivos:
- `js/chat-normalization.js`
- `js/ui/chat/typing-animation.js`

## Ask Selection / Composer

Causa raiz:
- o popover `Perguntar sobre` era acionado por `selectionchange` global e aceitava quase qualquer selecao fora de input/modal;
- ao anexar trecho selecionado, o foco do textarea dependia de `setTimeout`, fragil apos re-render do composer;
- o visual claro/arredondado destoava do piano black e parecia menos profissional.

Correcao:
- `js/ui/text-selection/selection-popover.js` restringe o popover a fontes conversaveis: `.msg-assistant`, `.msg-user`, `.memory-card`, `.memory-project-message`, `.memory-project-content` e `[data-ask-selection-source]`;
- selecoes em sidebar, botoes, links, modal, composer e elementos estruturais nao disparam mais `Perguntar ao Worion`;
- o clique no popover injeta o trecho somente no composer;
- `js/ui/text-selection/ask-selection.js` limpa a selecao e foca o textarea no proximo frame, com cursor no fim;
- `js/ui.js` ganhou listener real para Enter em `textarea[data-chat-input="true"]`, cobrindo chat e home mesmo apos re-render;
- `css/style.css` atualizou o popover para piano black compacto, fonte mais robusta e label `Perguntar ao Worion`.

Adendo:
- o Electron registrou `ReferenceError: buildAskSelectionPrompt is not defined` em `js/chat.js:1048` quando o usuario enviava com Enter;
- causa: `buildAskSelectionPrompt()` existia no modulo `ask-selection.js`, mas nao estava exposta em `window`, enquanto `sendMsg()` chamava o identificador solto;
- `js/ui.js` agora expoe `window.buildAskSelectionPrompt`;
- `js/chat.js` usa `window.buildAskSelectionPrompt` com fallback local seguro;
- o listener de Enter captura rejeicoes e loga `[COMPOSER] erro ao enviar...` com contexto.

## Roteamento Cognitivo Privado

### Problema

Perguntas privadas, pessoais ou baseadas em conectores caiam em `focused_research` e chamavam:
- `brave_search`;
- `tavily_search`;
- `fetch_url`;
- fontes genericas como Wikipedia, Pensador, letras de musica ou paginas publicas irrelevantes.

Exemplos corrigidos:
- `Quem sou eu?`
- `O que eu sou?`
- `Leia meu Notion e me descreva.`
- `Com base nas minhas sessoes, o que eu sou?`
- `Com base nos arquivos que enviei, qual meu perfil?`
- `Tudo que voce leu se resume em 12 palavras?`

### Resolucao De Escopo

`js/chat-routing.js` ganhou `classifyQuestionScope()` com escopos:
- `uploaded_file_context`
- `private_connector_context`
- `private_memory_context`
- `private_project_context`
- `public_research`
- `conversation_or_general`

Escopos privados retornam `direct_answer` no roteador base para impedir captura por `focused_research`, e depois sao promovidos em `js/chat.js` para:

```text
private_context_synthesis
```

### Rota Privada

`js/chat-models.js` ganhou `runPrivateContextSynthesisRoute()`.

Ela usa fontes privadas/contextuais:
- anexos carregados;
- conversa atual;
- contexto ja incorporado silenciosamente;
- projeto atual;
- Notion quando mencionado;
- contexto de conectores ja carregado;
- memoria interna;
- memoria semantica Supabase;
- `memory_search`;
- `memory_read_conversation`;
- memory cards ativos.

Ela nao usa:
- Brave;
- Tavily;
- `fetch_url` publico;
- query automatica com `fontes confiaveis`;
- fontes publicas genericas como substituto de memoria pessoal.

### Memoria Semantica Supabase

A rota privada consulta memoria semantica de duas formas:
- `searchInternalMemory(query)`, que ja inclui `searchImportedSemanticMemory()` em `contextGuardian.js`;
- `memory_search` + `memory_read_conversation` para buscar chunks e ler conversas completas retornadas.

Consultas pessoais adicionam termos auxiliares genericos, sem hardcode de usuario:
- perfil do usuario;
- historia do usuario;
- padroes do usuario;
- preferencias do usuario;
- decisoes do usuario;
- projetos do usuario.

### Relatorio De Leitura

Toda leitura privada gera:

```js
const privateReadReport = {
  route: 'private_context_synthesis',
  scope,
  sourcesRequested: [],
  sourcesFound: [],
  sourcesFetched: [],
  failedSources: [],
  totalFound: 0,
  totalFetched: 0
};
```

Regra:
- so pode dizer `li tudo`, `li todas as sessoes` ou `li todo o conteudo` quando `totalFound > 0` e `totalFetched === totalFound`;
- leitura parcial deve dizer: `Li X de Y fontes. A sintese abaixo e parcial.`;
- sem fontes privadas, deve dizer que falta contexto privado carregado.

### Guardrail De Tools

`js/tools.js` bloqueia em escopo privado:
- `brave_search`;
- `tavily_search`;
- `fetch_url`;
- `web_search`;
- `tavily_extract`.

Log esperado:

```js
console.warn('[ROUTE GUARD] blocked public research for private context request', {
  questionScope,
  userMessage
});
```

### Pesquisa Publica Preservada

Continuam funcionando:
- `Pesquise fontes confiaveis sobre filosofia da identidade.`
- `Quanto custa Shopify hoje?`
- leis;
- precos;
- noticias;
- cargos;
- autoridades;
- listas historicas;
- dados administrativos;
- verificacao externa explicita.

## Memory Cards - Estado Mantido

Nesta rodada nao houve alteracao em Supabase, schema ou dados de Memory Cards.

Estado esperado herdado de 02/06/2026:
- apenas 1 card ativo em `memory_cards_v2`;
- card ativo: `Conceito 0 - Espiritualidade / Sonhos / Hermetismo`;
- status: `card_active`;
- domain: `spiritual_reflective`;
- slug: `conceito-0-espiritualidade-sonhos-hermetismo`.

Nenhuma memoria bruta foi alterada nesta sessao.

## Memory Cards - Impacto Do Prompt Restaurado

`js/prompt.js` foi restaurado exatamente de `js/backup prompt.txt` na rodada anterior.

Isso e relevante para Memory Cards porque o backup antigo contem de volta:
- contexto de agente ativo;
- documentos do agente;
- especializacao automatica;
- ancoragem proativa;
- assimilacao contextual;
- regras antigas de incorporacao de contexto;
- bloco operacional mais completo.

O rollback nao deve quebrar `memoryCardsContext`, mas precisa teste real.

## Memory Cards - Pontos A Validar Em Runtime

### 1. Card Conceito 0 entrando no prompt

Testar mensagens:

```text
espiritualidade
sonho
hermetismo
Bashar
ego
observador
frequencia
```

Verificar:
- `searchMemoryCards()` foi chamado?
- retornou 1 card?
- `summary` do card entrou em `externalContext`?
- `buildSystemPrompt()` recebeu o contexto operacional?
- o modelo mudou o tom para o card espiritual sem expor bloco tecnico?

### 2. Memory Card Project-like

Fluxo esperado:
1. Abrir Memory Cards.
2. Abrir `Espiritualidade / Sonhos / Hermetismo`.
3. Enviar mensagem dentro do card.
4. Confirmar que `window.currentMemoryCardProjectId` esta ativo.
5. Confirmar que `buildMemoryCardChatContext(cardId)` entra silenciosamente no `externalContext`.
6. Confirmar que esse bloco nao aparece como mensagem visivel.

### 3. Relação Com Patches De Chat

Os patches de 03/06 podem afetar a experiencia dentro de Memory Cards porque mexeram no composer e no chat:
- composer sticky;
- chips Auto/Normal dentro do container;
- reset de Novo Chat;
- status unico;
- preview inline de anexos.

Testar tambem dentro da pagina interna do Memory Card:
- anexar `.md` ou `.txt`;
- enviar mensagem;
- confirmar chat limpo;
- confirmar que o contexto do card nao aparece como mensagem no historico.

## Validacoes Sintaticas Feitas

```bash
node --check js/chat-routing.js
node --check js/chat-models.js
node --check js/chat.js
node --check js/tools.js
node --check js/ui.js
node --check js/app.js
node --check js/ui/chat/execution-status.js
node --check js/ui/core/message-renderer.js
node --check js/prompt.js
node --check js/chat-normalization.js
node --check js/ui/chat/typing-animation.js
```

## Validacoes De Roteamento Feitas

Classificacao:

```text
Quem sou eu? => private_memory_context / direct_answer
O que eu sou? => private_memory_context / direct_answer
Leia meu Notion e diga meus padroes. => private_connector_context / direct_answer
Com base no PDF anexado, qual meu perfil? => uploaded_file_context / direct_answer
Tudo que voce leu se resume em 12 palavras? => conversation_or_general / direct_answer
Pesquise fontes confiaveis sobre filosofia da identidade. => public_research / focused_research
Quanto custa Shopify hoje? => public_research / focused_research
```

Guardrail:
- `brave_search` em `private_memory_context` retornou `blocked: true`;
- logou `[ROUTE GUARD] blocked public research for private context request`.

Smoke test:
- `runPrivateContextSynthesisRoute()` montou `privateReadReport`;
- usou memoria semantica stubada;
- retornou sintese privada sem web.

`npm run validate`:
- falhou por pendencia preexistente: `memory-cards-runtime.js` fora de `architecture.json/load_order`.

## Busca Focada

Nos arquivos ativos alterados, nao foram encontrados:

```text
execution-indicator
particle-field
execution-trail
Anexo enviado
Worion: raciocinando
Worion: construindo resposta
```

## Teste Manual Pendente

### Chat/UX

1. Abrir Worion Desktop.
2. Novo Chat.
3. Colar uma imagem no composer da home.
4. Enviar pergunta junto da imagem.
5. Confirmar que a imagem aparece como preview no historico.
6. Confirmar que nao aparece sobra de resposta antiga.
7. Confirmar status unico textual.
8. Interromper uma resposta e confirmar que o status desaparece.
9. Conferir chips Auto/Normal dentro do container, embaixo, tanto na home quanto no chat ativo.
10. Testar resposta contendo `Detalhes:` no meio da frase e confirmar que o inicio nao e removido.
11. Selecionar trecho dentro de uma mensagem e confirmar `Perguntar ao Worion`.
12. Selecionar texto em sidebar/header/composer e confirmar que o popover nao aparece.
13. Clicar `Perguntar ao Worion`, digitar no composer e enviar com Enter.

### Roteamento

1. `Quem sou eu?`
   - esperado: memoria/contexto privado;
   - sem Brave/Tavily.

2. `O que eu sou?`
   - esperado: memoria/contexto privado;
   - sem Pensador/Wikipedia/letras.

3. `Leia meu Notion e diga meus padroes.`
   - esperado: Notion;
   - sem Brave/Tavily.

4. `Com base no PDF anexado, qual meu perfil?`
   - esperado: anexo;
   - sem Brave/Tavily.

5. `Tudo que voce leu se resume em 12 palavras?`
   - esperado: contexto recem-lido/conversa;
   - sem busca publica.

6. `Pesquise fontes confiaveis sobre filosofia da identidade.`
   - esperado: pesquisa publica permitida.

7. `Quanto custa Shopify hoje?`
   - esperado: pesquisa publica permitida.

### Memory Cards

1. Validar `searchMemoryCards()` com termos espirituais.
2. Validar Memory Card Project-like com injecao silenciosa.
3. Confirmar que anexos de card nao viram texto visivel no historico.

## Observacoes

Nao mexer no prompt ao testar esta parte. O prompt foi restaurado separadamente a partir de backup.

Nao alterar Supabase/schema sem pedido explicito.

Nao reativar cards arquivados.

Nao criar novo card antes de validar o card ativo existente.
