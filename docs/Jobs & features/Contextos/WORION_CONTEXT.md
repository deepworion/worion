# WORION_CONTEXT.md

**Leia antes de qualquer tarefa no Worion Desktop.**
**Ultima atualizacao:** 03/06/2026 - docs operacionais movidos para Jobs & features, contexto datado virou fonte canonica de continuidade.

---

## Regras Permanentes De Continuidade

Regra 1: ler primeiro o `WORION_CONTEXT` datado mais recente em `docs/Jobs & features/Contextos/`.

Regra 2: depois disso, ler todo o conteudo relevante indicado pelo contexto, principalmente os documentos em:
- `docs/Jobs & features/Atulizações/`
- `docs/Jobs & features/Contextos/`

Regra 3: quando o Boss entregar contexto ou pedir encerramento, documentar tudo que foi feito em `docs/Jobs & features/Atulizações/` e atualizar/criar o `WORION_CONTEXT` datado em `docs/Jobs & features/Contextos/`.

Regra 4: quando a data mudar, criar novo par datado:
- `docs/Jobs & features/Contextos/WORION_CONTEXT_YYYY-MM-DD.md`
- `docs/Jobs & features/Atulizações/REFATORACAO_UX_CHAT_YYYY-MM-DD.md`

---

## 0. Boss / Modo de Trabalho

Voce esta trabalhando com Glaydson Boaventura.

- Solo founder brasileiro, direto, pragmatico, cansado de refazer contexto.
- Prefere resposta curta, tecnica e sem floreio.
- Quando ele pede para agir, implemente; quando ele pede para raciocinar, nao implemente.
- Ele usa Worion como sistema cognitivo pessoal, nao como SaaS publico neste momento.
- Nao trate memoria como detalhe: Supabase e a base de verdade do Worion.

Regra de ouro: **nao confundir estrutura criada com sistema funcionando. Validar runtime antes de declarar concluido.**

---

## 1. O Que E o Worion

Worion Desktop e um sistema operacional cognitivo local em Electron.

Stack atual:
- Electron + Node.js local.
- Backend local: `worion-api/server.js`.
- Renderer: `js/*.js`.
- Supabase: memoria, chunks, cards, vault.
- Notion: documentacao canonica.
- Modelos: DeepSeek, OpenAI, Claude.
- Busca externa: Brave/Tavily quando configurados.

Estado do projeto:
- Laboratorio pessoal local.
- Ainda nao avaliar como produto SaaS validado.
- Prioridade atual: memoria semantica util e runtime estavel.

---

## 2. Fluxo de Mensagem

Fluxo principal:

```text
sendMsg() em js/chat.js
  -> searchInternalMemory(content)
  -> searchMemoryCards(content)
  -> injectRecentMemory()
  -> buildSystemPrompt()
  -> callModel()
  -> resposta
```

Arquivos centrais:

| Arquivo | Papel |
|---|---|
| `js/chat.js` | Fluxo principal do chat |
| `js/contextGuardian.js` | Memoria interna + `searchMemoryCards()` |
| `js/prompt.js` | Montagem do system prompt |
| `js/ui.js` | Tela de Memory Cards e editor |
| `js/worion-api-client.js` | Cliente da API local |
| `worion-api/server.js` | Backend local e ponte Supabase |
| `css/style.css` | Estilos da UI |

---

## 3. Estado Real dos Memory Cards

### Implementado no codigo

`searchMemoryCards(userMessage)` existe em `js/contextGuardian.js`.

Comportamento:
- Busca `memory_cards_v2`.
- Filtra somente `status = card_active`.
- Usa `inclusion_rules` para relevancia textual.
- Retorna no maximo 5 cards.
- Injeta `title`, `domain`, `summary` no contexto operacional.

`js/chat.js` ja adiciona `memoryCardsContext` ao `externalContext`.

### Estado real na Supabase em 02/06/2026

Foi feita consolidacao manual/factual:

- Os 9 cards ativos criados por migracao eram cascas genericas.
- Todos foram arquivados.
- O card candidato `A revisar` tambem foi arquivado.
- Agora existe **1 unico card ativo** em `memory_cards_v2`.

Card ativo:

```text
title: Conceito 0 - Espiritualidade / Sonhos / Hermetismo
slug: conceito-0-espiritualidade-sonhos-hermetismo
status: card_active
domain: spiritual_reflective
context_id: 54e0c2e7-1809-4026-8dfd-2e3ce19b884b
```

Resumo injetavel:

```text
Ative para espiritualidade, sonhos, Hermetismo, Bashar, Gnose, pineal, mediunidade, simbolos e reflexao existencial. Glaydson rejeita espiritualidade generica e psicologizacao rasa. Integra TDAH/rotina regulatoria, fenomenologia/TCC e espiritualidade. Ego: ponto de convergencia da consciencia; problema e disfuncao sem observador. Frequencia pode sustentar prosperidade, mas sem observador desaba quando cai. Responder como espelho factual, profundo, sem validacao barata.
```

Importante:
- `memory_chunks` e `memory_conversations` nao foram apagadas.
- "Excluir cards" foi executado como `status = archived` em `memory_cards_v2`.
- O contexto manual `espiritualidade-sonhos-hermetismo` foi limpo e apontado para `spiritual_reflective`.

Fonte detalhada:
- `docs/Jobs & features/Atulizações/DIAGNOSTICO_MEMORY_CARDS.md`, adendo de 02/06/2026.

---

## 4. Supabase / Tabelas

Projeto de memoria do Worion usa estas tabelas:

| Tabela | Papel |
|---|---|
| `memory_cards_v2` | Cards injetaveis no prompt |
| `memory_contexts` | Contextos pai dos cards |
| `memory_conversations` | Conversas importadas |
| `memory_chunks` | Chunks de conversas |
| `memory_files` | Arquivos anexados/importados |
| `memory_context_files` | Vinculo contexto-arquivo |
| `memory_card_sources_v2` | Evidencias/fonte de cards |

Colunas criticas de `memory_cards_v2`:

```text
title
slug
summary          <- entra no prompt
domain
status           <- somente card_active entra
inclusion_rules  <- ativa por assunto da mensagem
metadata
```

Regra canonica:

```sql
select *
from memory_cards_v2
where status = 'card_active';
```

Em 02/06/2026, essa consulta deve retornar apenas o card Conceito 0 espiritual.

---

## 5. O Que Foi Mexido Recentemente

Codigo:
- `js/contextGuardian.js`: criada `searchMemoryCards()`.
- `js/chat.js`: `memoryCardsContext` entrou no `externalContext`.
- `js/ui.js`: editor de Memory Cards ganhou busca por assunto, atualizar pela memoria, salvar, cancelar e anexar arquivo como fonte.
- `css/style.css`: estilos do editor/busca de memoria.

Dados Supabase:
- Criado/atualizado 1 card ativo: Conceito 0 espiritual.
- Arquivados os demais cards em `memory_cards_v2`.
- Atualizado contexto `espiritualidade-sonhos-hermetismo`.

Documentos:
- `docs/Jobs & features/Atulizações/DIAGNOSTICO_MEMORY_CARDS.md` atualizado com bloco factual.
- Este arquivo reescrito para handoff.

---

## 6. Pendencias Prioritarias Para o Proximo Codex

### P0 - Validar runtime do card Conceito 0

Comece por aqui.

1. Abrir Worion Desktop.
2. Enviar mensagem com: `espiritualidade`, `sonho`, `hermetismo`, `Bashar`, `ego`, `observador` ou `frequencia`.
3. Verificar console:
   - `searchMemoryCards()` foi chamado?
   - Retornou 1 card?
   - O `summary` entrou no contexto operacional?
4. Se nao entrou, revisar:
   - `js/contextGuardian.js`
   - `js/chat.js`
   - envs de Supabase memoria.

### P0 - Corrigir/validar editor de Memory Cards

Sintomas relatados pelo Boss:
- Botao importar/anexar nao salvava como fonte corretamente.
- Cancelar nao cancelava.
- Salvar precisava persistir de fato.
- Conteudo vindo de arquivo nao deve cair direto no campo `Conteudo`; deve virar fonte/anexo.

Mudancas ja implementadas em `js/ui.js`, mas precisam de teste real no app.

Testar:
- Abrir contexto espiritual.
- Usar `Atualizar pela memoria`.
- Selecionar trechos.
- Anexar arquivo.
- Salvar.
- Cancelar.
- Reabrir e confirmar persistencia.

### P1 - Melhorar qualidade do card

O card atual e Conceito 0, nao versao final.

Proxima evolucao:
- Ler evidencias vinculadas.
- Remover ruido tecnico.
- Transformar o card em resumo mais fiel ao estilo do Boss.
- Se necessario, usar `memory_card_sources_v2` para registrar chunks fonte.

### P1 - Corrigir bug conhecido no backend

Verificar em `worion-api/server.js` se ainda existe default invalido:

```js
payload.mode || 'candidate'
```

O schema aceita `card_candidate`, nao `candidate`.

Se ainda estiver assim, corrigir para:

```js
payload.mode || 'card_candidate'
```

### P2 - Vincular fontes formalmente

Hoje o card foi sintetizado e salvo, mas as fontes foram registradas em metadata.

Melhor caminho:
- Inserir relacoes em `memory_card_sources_v2`.
- Ligar o card aos chunks relevantes.
- Permitir revisao visual de "por que este card sabe isso".

---

## 7. Decisoes Canonicas

1. Nao apagar memoria bruta sem pedido explicito.
2. Arquivar card e diferente de deletar chunk/conversa.
3. `summary` do card e o que entra no LLM; se for generico, o Worion fica burro.
4. Card bom e memoria mastigada: curto, factual, acionavel.
5. `inclusion_rules` define quando o card aparece.
6. `memory_cards_v2.status = card_active` e o unico estado injetavel.
7. Arquivo importado deve virar fonte/contexto, nao preencher texto por acidente.
8. Nao criar nova tabela antes de usar bem as existentes.
9. Nao reativar Grounding Gates sem decisao explicita.
10. Nao prometer runtime sem abrir/testar o app.

---

## 8. Comandos Uteis

Validacao sintatica:

```bash
node --check js/contextGuardian.js
node --check js/chat.js
node --check js/ui.js
npm run validate
```

Consulta esperada na Supabase:

```sql
select title, slug, status, domain, summary
from memory_cards_v2
where status = 'card_active'
order by updated_at desc;
```

Resultado esperado:

```text
Conceito 0 - Espiritualidade / Sonhos / Hermetismo
```

---

## 9. Como Comecar a Proxima Sessao

Ordem recomendada:

1. Leia `docs/Jobs & features/Atulizações/DIAGNOSTICO_MEMORY_CARDS.md`.
2. Confirme `git status`.
3. Valide os arquivos alterados com `node --check`.
4. Rode o Worion Desktop.
5. Teste o card Conceito 0 no chat.
6. Teste salvar/cancelar/anexar no editor.
7. So depois proponha novas alteracoes.

Frase de retomada para o proximo Codex:

```text
Comece validando em runtime se o unico card ativo memory_cards_v2, Conceito 0 - Espiritualidade / Sonhos / Hermetismo, esta sendo recuperado por searchMemoryCards() e injetado no prompt. Depois teste o editor de Memory Cards: atualizar pela memoria, anexar arquivo como fonte, salvar e cancelar.
```

---

Este arquivo e handoff operacional. Nao despejar historico bruto aqui; manter somente estado atual e proximo passo.

---

## 10. Handoff Atual - Memory Cards Runtime Local Project-like

Data do handoff: 2026-06-02

### Mudanca de direcao

O Boss rejeitou a UX de arvore/sandbox/checklists para Memory Cards.

Decisao atual:
- Memory Card deve funcionar como Claude Projects em comportamento operacional.
- Tela inicial: grade de cards/projetos.
- Clique no card: abre pagina interna do card.
- Pagina interna: area principal de conversa + painel direito de conhecimento.
- Painel direito: Memoria, Instrucoes e Arquivos.
- Contexto deve ser injetado silenciosamente no chat daquele card.
- Nao mostrar bloco gigante de memoria no historico.

### Escopo executado nas fases 1.0 a 1.6

Arquivos principais tocados:
- `js/memory-cards-runtime.js`
- `js/ui.js`
- `js/chat.js`
- `css/style.css`
- `index.html` ja carrega o runtime local.

Nao foi feito:
- Nao mexeu em Supabase nesta fase.
- Nao criou migration.
- Nao mexeu em `worion-api/server.js`.
- Nao mexeu em Notion.
- Nao corrigiu Electron security.
- Nao implementou busca em chunks.

### Runtime local

Foi criado runtime local em `js/memory-cards-runtime.js` com:
- `getMemoryCardsList()`
- `openMemoryCardProject(cardId)`
- `getMemoryCardInstructions(cardId)`
- `saveMemoryCardInstructions(cardId, text)`
- `attachMemoryCardFile(cardId, file)`
- `getMemoryCardFiles(cardId)`
- `removeMemoryCardFile(cardId, sourceId)`
- `buildMemoryCardChatContext(cardId)`
- `activateMemoryCardForChat(cardId)`

Persistencia local:
- Instrucoes por card em `localStorage`.
- Arquivos `.md` e `.txt` por card em `localStorage`.
- Card ativo local.
- Compatibilidade migrando dados do ID antigo `concept-zero-spirituality` para `conceito-0-espiritualidade-sonhos-hermetismo`.

### Card principal atual

ID interno atual:
- `conceito-0-espiritualidade-sonhos-hermetismo`

Titulo visual:
- `Espiritualidade / Sonhos / Hermetismo`

Metadado interno:
- `Conceito 0`

Descricao visual:
```text
Contexto para leitura simbolica e operacional de espiritualidade, sonhos, Hermetismo, Bashar, Gnose, observador, ego, frequencia, pineal e mediunidade. Use este card para conversas que exigem profundidade, organizacao interna e evitar respostas genericas.
```

Importante:
- `Conceito 0` nao deve aparecer como titulo visual.
- Se aparecer, e regressao de UX.

### UI atual esperada

Tela Memory Cards:
- Grade limpa de cards.
- Busca por cards.
- Botao `Novo card` ainda nao implementa criacao real.

Pagina interna do card:
- Link `Todos os cards`.
- Titulo visual do card.
- Descricao contextual.
- Composer limpo.
- Chip discreto: `Memory Card ativo: Espiritualidade / Sonhos / Hermetismo`.
- Chip abre seletor de cards em popover fixed.
- Painel direito `Conhecimento do card`.

Painel direito:
- Secao Memoria com explicacao concreta.
- Card ativo.
- Conteudo usado:
  - Instrucoes do card
  - Arquivos anexados
  - Resumo contextual do card
- Secao Instrucoes com botao explicito `Editar instrucoes`.
- Preview curto das instrucoes.
- Secao Arquivos com botao explicito `Anexar arquivo`.
- Arquivos anexados com botao `Remover`.

Modal de instrucoes:
- X no topo.
- Cancelar e Salvar sempre visiveis.
- ESC fecha.
- Clique fora fecha se nao houver alteracao; se houver, pede confirmacao.
- Textarea largo, ocupando a largura util.
- Apenas o textarea rola internamente.

Popover do chip:
- Criado no `body`, nao preso dentro do chip.
- `position: fixed`.
- Z-index acima do painel direito.
- Max-height com scroll interno.
- Fecha por clique fora e ESC.

### Injecao no chat

Em `js/chat.js`, antes de enviar ao modelo, se `window.currentMemoryCardProjectId` estiver ativo:
- chama `window.WorionMemoryCardsRuntime.buildMemoryCardChatContext(cardId)`;
- adiciona ao `externalContext`;
- nao renderiza esse bloco como mensagem visivel.

Formato interno esperado:
```text
[MEMORY CARD ATIVO]
Titulo: Espiritualidade / Sonhos / Hermetismo
Metadado interno: Conceito 0
Descricao: ...

Instrucoes:
...

Arquivos anexados:
...

Regras de uso:
...
```

### Validacao ja feita

Checks sintaticos OK:
```bash
node --check js/memory-cards-runtime.js
node --check js/ui.js
node --check js/chat.js
```

`npm run validate` ainda falha por motivo conhecido:
```text
memory-cards-runtime.js sem documentacao em architecture.json
memory-cards-runtime.js fora do load_order
```

Nao corrigir isso sem autorizacao explicita, porque `architecture.json` ficou fora do escopo das fases.

### Onde iniciar na proxima janela

Comecar testando runtime visual:
1. Abrir Worion Desktop.
2. Ir em Memory Cards.
3. Confirmar grade de cards, sem arvore/sandbox.
4. Abrir `Espiritualidade / Sonhos / Hermetismo`.
5. Testar com sidebar normal e minimizada.
6. Clicar `Editar instrucoes`.
7. Confirmar textarea largo, X, Cancelar, Salvar e ESC.
8. Clicar chip `Memory Card ativo`.
9. Confirmar popover visivel, sem ficar atras do painel direito.
10. Anexar `.md` ou `.txt`.
11. Confirmar arquivo listado e removivel.
12. Enviar mensagem dentro do card e confirmar chat limpo.
13. Confirmar no console/contexto que a injecao silenciosa entrou.

Frase de retomada recomendada:

```text
Continue a partir da Fase 1.6 dos Memory Cards. O modelo atual e Project-like: grade de cards, pagina interna com composer e painel direito. Primeiro teste visualmente scroll/responsividade/modal/popover. Depois valide se buildMemoryCardChatContext() esta entrando silenciosamente no externalContext quando a mensagem e enviada dentro do card.
```

---

## 11. Refatoração UX do Chat — 02/06/2026

### Mudanças implementadas

Nesta mesma sessão foi executada refatoração completa da UX do chat para layout mais limpo e compacto.

**Documentação:** `docs/Jobs & features/Atulizações/REFATORACAO_UX_CHAT.md`

### Principais alterações

**Layout e espaçamento:**
- Gap entre mensagens: 16px → 4px (-75%)
- Padding do chat: 24px → 16px
- Parágrafos: 0.4em → 0.25em
- Headings: margin reduzido para 0.3em/0.15em
- Blocos (ul, pre, blockquote): 20-48px → 0.5em
- Line-height: 1.7 → 1.6

**Componentes:**
- Input home: sem border, background #141414, flutuante
- Input chat: sticky bottom, background #1a1a1a, sem border
- Timestamps: ocultos (display:none, reversível)
- Estrela status: 34px (era 24px), pulsa scale(1.5), 1.2s
- Status: movido para dentro da área de chat, inline com estrela
- Chips Auto/Normal: corrigidos para ficar dentro do container arredondado
- Header: border removido
- Sidebar: auto-collapse na primeira mensagem

### Arquivos modificados

**CSS:** `css/style.css`
- 25+ alterações em linhas 320, 327, 336, 340, 347, 349, 358-360, 363, 367, 369, 373, 404, 415, 417, 420-421, 432, 435, 482, 486, 514, 519

**JavaScript:**
- `js/chat.js` (linhas 1888-1891): auto-collapse sidebar
- `js/ui.js` (linha 338, 352-355): status movido, toolbar restaurado
- `js/ui/chat/execution-status.js` (linhas 49-65): chips removidos

### Problemas corrigidos

1. **Input fora do container:** overflow:visible → hidden
2. **Toolbar escapando:** position:static adicionado
3. **Espaçamento excessivo:** reduzido para valores ultra-compactos
4. **Status abaixo do input:** movido para dentro de chat-messages
5. **Chips separados:** removidos do DOM
6. **Auto/Normal visíveis demais:** agora integrados no container

### Validação necessária

Próxima sessão deve testar visualmente:
1. Input flutuante na home com background sutil
2. Input sticky no fundo do chat ativo
3. Espaçamento compacto entre mensagens (6px total)
4. Estrela pulsando maior e mais intensa
5. Status inline: [★] Worion: construindo resposta...
6. Auto/Normal dentro do container arredondado
7. Sidebar recolhendo automaticamente ao enviar mensagem
8. Responsividade com sidebar aberta/fechada

### Frase de retomada

```text
A UX do chat foi refatorada para layout compacto e profissional. Teste visual: input sticky, espaçamento 4px, estrela 34px pulsando 1.5x, status inline dentro do chat, Auto/Normal dentro do container. Depois valide Memory Cards Project-like com painel direito e injeção silenciosa.
```

---

## Deixa para limpar a janela - 2026-06-05

Retomar pelo estado atual do Worion Desktop depois da integracao do Context Authority.

### Estado mais recente

- `js/context-authority.js` foi criado como camada deterministica de autoridade.
- `tests/golden/context_authority_cases.json` foi criado com casos de regressao.
- `index.html` e `docs/architecture.json` registram o modulo no load order.
- `js/chat.js` passou a chamar `resolveContextAuthority()` antes de memoria, fontes, `questionScope`, `executionRoute` e Writer.
- `greeting` e `meta_feedback` retornam localmente, sem memoria, fontes, pesquisa ou Writer.
- `identity_or_role_question` agora deve bloquear memoria, fontes, pesquisa e Writer.
- `identity_or_role_question` deve preservar a persona do agente ativo e cair em `direct_answer`.

### Correcao mais recente

O segundo teste tinha falhado:

```text
Agente ativo: ESPECIALISTA EM TDHA
Input: Qual o seu papel nesse espaco?
```

Resultado ruim observado:

```text
focused_research
brave_search
tavily_extract
Writer em rota de pesquisa
Pelo material coletado...
Fontes:
```

Patch aplicado:

- logs `[CONTEXT AUTHORITY]` agora usam `console.log`, nao `console.debug`;
- se `resolveContextAuthority` nao carregar, aparece warning explicito;
- `identity_or_role_question` agora tem `shouldBypassWriter: true`;
- hard guard derruba rota proibida para `direct_answer`;
- antes de `runDeterministicResearchRoute()`, `shouldBypassSources` bloqueia pesquisa;
- filtro final remove `Pelo material coletado...` e bloco `Fontes:` apenas em pergunta de identidade.

### Teste obrigatorio ao retomar

No Electron, com agente ativo `ESPECIALISTA EM TDHA`, enviar:

```text
Qual o seu papel nesse espaco?
```

Logs esperados:

```text
[CONTEXT AUTHORITY] {
  intent: "identity_or_role_question",
  bypassMemory: true,
  bypassSources: true,
  bypassWriter: true
}
[EXECUTION ROUTER] final route after authority: direct_answer
```

Nao pode aparecer:

```text
brave_search
tavily_extract
focused_research
[WRITER] Usando generateAndRefine
Pelo material coletado
Fontes:
```

### Validacoes ja executadas

```bash
node --check js/chat.js
node --check js/context-authority.js
npm run validate
```

Resultado: passaram.

### Regra de continuidade

Nao mexer em `js/prompt.js`, UI, backend, Writer, schema, Supabase, Notion ou agentes para este bug. Se o teste ainda falhar, investigar primeiro se o `sendMsg()` carregado pelo Electron e o `index.html` em uso sao os mesmos do workspace.

### Frase de retomada curta

```text
Retomar Context Authority. O teste critico e: agente ativo ESPECIALISTA EM TDHA + "Qual o seu papel nesse espaco?" deve logar identity_or_role_question, bypassMemory/bypassSources/bypassWriter true, rota final direct_answer, sem brave/tavily/Writer/Fontes.
```
