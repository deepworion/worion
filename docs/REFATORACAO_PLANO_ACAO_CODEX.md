# Plano de Acao Codex - Refatoracao e Limpeza do Worion

Data-base: 2026-06-04
Autor operacional: Codex

## Objetivo

Organizar o Worion sem quebrar o app, reduzindo sujeira versionada, monolitos grandes e logs soltos. Este documento e para ser usado como handoff em uma nova sessao: carregar este arquivo, conferir o estado atual do Git e executar por etapas pequenas, verificaveis e reversiveis.

## Regra principal

Nao fazer refatoracao grande antes de estabilizar o working tree. O repositorio ja estava com muitos arquivos modificados, deletados e novos. Antes de mexer em codigo, separar o que e mudanca intencional, backup, dump, artefato ou lixo temporario.

## Estrategia de ataque

Comecar por baixo, pelos menores e mais perifericos, antes dos monolitos. A ordem boa para este repo nao e atacar `js/ui.js` primeiro. O caminho mais seguro e limpar bordas, scripts, backups, modulos pequenos e logs; so depois mexer no nucleo.

Racional:

- arquivos pequenos revelam padroes sem risco alto;
- scripts soltos e backups confundem qualquer diff;
- logs e TODOs pequenos criam uma base melhor para enxergar regressao;
- quando chegar em `js/ui.js`, `js/chat.js`, `js/chat-models.js` e `worion-api/server.js`, o terreno ja esta menos ruidoso.

Ordem mental:

1. Repo e artefatos.
2. Scripts pequenos e arquivos soltos.
3. Modulos pequenos de UI ja extraidos.
4. Runtime de Memory Cards.
5. Logging.
6. Chat/modelos.
7. API server.
8. `js/ui.js`.
9. CSS.

## Snapshot observado em 2026-06-04

Arquivos grandes mais relevantes:

| Arquivo | Linhas | Diagnostico |
|---|---:|---|
| `js/ui.js` | 7172 | Monolito principal do front. Mistura render, estado, Memory Cards, chat, handlers e logs. |
| `js/ui.js.original-full` | 5651 | Backup inteiro versionado. Provavel lixo depois de confirmar diferencas. |
| `js/ui.js.pre-module-integration` | 5651 | Backup inteiro versionado. Provavel lixo depois de confirmar diferencas. |
| `css/style.css` | 3124 | CSS muito concentrado. Refatorar depois do JS essencial. |
| `worion-api/server.js` | 2989 | Servidor monolitico: chat, memoria, Notion, classificacao e endpoints juntos. |
| `js/tools.js` | 2536 | Inventario e implementacao de tools concentrados. |
| `js/chat.js` | 2338 | Pipeline de chat muito concentrado. |
| `js/chat-models.js` | 2200 | Model calls, roteamento, pesquisa e memoria juntos. |
| `js/cognitive-skills.js` | 1272 | Motor grande e isolavel. |
| `js/prompt.js` | 1187 | Prompt builder e contexto pedem separacao. |
| `deepworion.js` | 1106 | CLI inteira em um arquivo. |
| `js/projects.js` | 1065 | Modulo grande, mas nao primeira prioridade. |
| `js/connectors.js` | 841 | Conectores misturados. |
| `js/memory-cards-runtime.js` | 769 | Runtime novo ja crescendo. |
| `js/app.js` | 765 | Bootstrap e estado global ainda carregados. |

Sujeira principal encontrada:

- Logs soltos em runtime: `js/ui.js`, `js/chat.js`, `js/chat-models.js`, `worion-api/server.js`, `js/connectors.js`, `js/chat-sessions.js`, `main.js`.
- TODOs funcionais em Memory Cards: `js/ui.js` contem `toggleMemoryFavorite TODO`, `archiveMemoryCard TODO`, persistencia de update e `ignoreMemoryContext TODO`.
- Backups versionados: `js/ui.js.original-full`, `js/ui.js.pre-module-integration`, `js/backup prompt.txt`, `js/artifacts_backup.txt`.
- Dumps/documentos movidos: `docs/Jobs & features/Atulizações/ANALIZES/...`, incluindo `RAW_REPO_SWEEP_2026_05_22.md` com 7103 linhas.
- Scripts temporarios/operacionais na raiz: `run-classification.js`, `link-workestria.js`, `validate-cards.sql`.
- Git muito sujo: muitos `M`, `D` e `??`, especialmente mudanca aparente de `docs/ANALIZES/` para `docs/Jobs & features/Atulizações/ANALIZES/`.

## Ordem de execucao

### Fase 0 - Reorientacao obrigatoria

1. Rodar `git status --short`.
2. Rodar `git diff --stat`.
3. Conferir se o usuario ja comitou ou mexeu desde este documento.
4. Nao reverter nada sem pedido explicito.
5. Se houver mudancas conflitantes nos arquivos a editar, ler antes e trabalhar em cima delas.

Comandos uteis:

```powershell
git status --short
git diff --stat
rg -c "^" --glob "!node_modules/**" --glob "!package-lock.json" --glob "!*.lock"
rg -n "TODO|FIXME|HACK|XXX|debugger|eslint-disable|@ts-ignore|TEMP|WIP|quick fix|workaround|console\.log" -S --glob "!node_modules/**" --glob "!package-lock.json"
```

### Fase 1 - Limpeza de inventario e backups

Meta: reduzir ruido sem alterar comportamento do app.

1. Comparar backups de UI:
   - `js/ui.js`
   - `js/ui.js.original-full`
   - `js/ui.js.pre-module-integration`
2. Se forem backups obsoletos, mover para uma pasta de arquivo ou remover, conforme decisao do usuario.
3. Classificar arquivos soltos:
   - `js/backup prompt.txt`
   - `js/artifacts_backup.txt`
   - `run-classification.js`
   - `link-workestria.js`
   - `validate-cards.sql`
4. Decidir destino:
   - scripts reutilizaveis vao para `scripts/`;
   - SQL reutilizavel vai para `sql/` ou `migrations/`;
   - dumps antigos vao para `docs/archive/` ou saem do repo.
5. Resolver o aparente move/delete de `docs/ANALIZES` para `docs/Jobs & features/Atulizações/ANALIZES`.

Saida esperada:

- Git status mais legivel.
- Backups grandes fora do caminho principal.
- Nenhuma alteracao funcional.

### Fase 2 - Arrumar arquivos pequenos e perifericos

Meta: resolver sujeira pequena antes dos arquivos grandes.

Alvos iniciais:

- `link-workestria.js` - decidir se vira script oficial em `scripts/` ou se sai do repo.
- `run-classification.js` - decidir se vira script oficial em `scripts/` ou se sai do repo.
- `validate-cards.sql` - mover para `sql/` ou `migrations/`, se ainda for util.
- `js/backup prompt.txt` - arquivar ou remover apos confirmar que nao e usado.
- `js/artifacts_backup.txt` - arquivar ou remover apos confirmar que nao e usado.
- `js/logger.js` - avaliar e preparar para uso real.
- `js/writer.js`, se existir no estado atual - validar se e codigo ativo ou sobra.

Ordem:

1. Conferir referencias com `rg "nome-do-arquivo|funcao-principal"`.
2. Se arquivo for executavel util, mover para pasta certa.
3. Se arquivo for backup/dump, arquivar/remover conforme decisao do usuario.
4. Rodar validacao simples de sintaxe nos `.js` afetados.

Saida esperada:

- Raiz do projeto mais limpa.
- `js/` sem backups obvios.
- Menos arquivos pequenos confundindo proximas refatoracoes.

### Fase 3 - Modulos pequenos ja extraidos

Meta: consolidar a modularizacao existente antes de extrair mais coisa.

Alvos:

- `js/ui/views/*.js`
- `js/ui/core/*.js`
- `js/ui/utils/*.js`
- `js/ui/sidebar/*.js`
- `js/ui/chat/*.js`
- `js/ui/text-selection/*.js`
- `js/ui/memory-cards/*.js`

Ordem:

1. Rodar `node --check` nos arquivos pequenos.
2. Procurar duplicacao entre esses modulos e `js/ui.js`.
3. Remover duplicacao apenas quando estiver claro que o modulo pequeno ja e a fonte correta.
4. Evitar mexer em comportamento.

Saida esperada:

- Modulos pequenos confiaveis.
- Menos risco ao quebrar `js/ui.js` depois.

### Fase 4 - Runtime e persistencia de Memory Cards

Meta: fechar TODOs funcionais pequenos antes da grande refatoracao visual.

Alvos:

- `js/memory-cards-runtime.js`
- `js/ui/memory-cards/*`
- TODOs de Memory Cards em `js/ui.js`

Ordem:

1. Entender contrato do runtime.
2. Verificar endpoints em `worion-api/server.js`.
3. Implementar favorite/archive/update/ignore com o menor corte possivel.
4. So depois remover TODOs de `js/ui.js`.

Saida esperada:

- Botoes de Memory Cards deixam de ser fachada.
- Menos pendencia funcional dentro de `js/ui.js`.

### Fase 5 - Criar base de logging

Meta: parar de espalhar `console.log` por runtime.

1. Verificar `js/logger.js` existente.
2. Definir API simples:
   - `debug(scope, ...args)`
   - `info(scope, ...args)`
   - `warn(scope, ...args)`
   - `error(scope, ...args)`
3. Usar flag/env/config para debug verbose.
4. Trocar primeiro os logs de maior volume:
   - `js/chat.js`
   - `js/chat-models.js`
   - `js/ui.js`
   - `worion-api/server.js`
5. Nao remover logs importantes de erro; converter para logger.

Saida esperada:

- Menos ruido no console.
- Debug ativavel sem editar codigo.

### Fase 6 - Quebrar pipeline de chat

Alvos:

- `js/chat.js` com 2338 linhas.
- `js/chat-models.js` com 2200 linhas.

Ordem:

1. Separar roteamento deterministico de execucao.
2. Separar pesquisa externa de model call.
3. Separar memoria/context injection.
4. Manter contratos de entrada/saida explicitos.
5. Adicionar testes pequenos para funcoes puras quando viavel.

Possiveis modulos:

- `js/chat/router.js`
- `js/chat/research-route.js`
- `js/chat/memory-context.js`
- `js/chat/model-call.js`
- `js/chat/runtime-facts.js`

Saida esperada:

- Fluxo de chat rastreavel.
- Menos logs e menos estado global.

### Fase 7 - Quebrar `worion-api/server.js`

Meta: separar servidor HTTP de dominio.

Ordem:

1. Extrair clientes/config:
   - Supabase;
   - Notion;
   - model providers;
   - memory store.
2. Extrair rotas por dominio:
   - chat;
   - memory;
   - notion;
   - health/config.
3. Manter `server.js` como composição e bootstrap.
4. Validar endpoints existentes com chamadas simples.

Possiveis pastas:

- `worion-api/routes/`
- `worion-api/services/`
- `worion-api/lib/`

Saida esperada:

- `server.js` menor que 800 linhas.
- Rotas mais testaveis.

### Fase 8 - Quebrar `js/ui.js`

Meta: remover sujeira que representa feature incompleta.

Meta adicional: reduzir o maior monolito com baixo risco, mas so depois das fases anteriores.

Ordem sugerida:

1. Extrair somente funcoes ja coesas, sem mudar comportamento.
2. Priorizar areas que ja tem pasta:
   - `js/ui/chat/`
   - `js/ui/core/`
   - `js/ui/memory-cards/`
   - `js/ui/sidebar/`
   - `js/ui/text-selection/`
   - `js/ui/views/`
3. Evitar renomear variaveis globais nesta fase.
4. Fazer uma extracao por commit lógico.
5. Validar sintaxe depois de cada bloco.

Possiveis cortes:

- renderizacao de Memory Cards para `js/ui/memory-cards/memory-cards-view.js`;
- loader/normalizacao para `js/ui/memory-cards/*`;
- composer e seletor de modelo para `js/ui/chat/composer.js`;
- modais para `js/ui/core/modal-manager.js`;
- helpers puros para `js/ui/utils/ui-helpers.js`.

Saida esperada:

- `js/ui.js` abaixo de 4000 linhas inicialmente.
- Nenhuma mudanca visual intencional.

### Fase 9 - CSS

Meta: organizar sem redesign.

Ordem:

1. Mapear secoes atuais de `css/style.css`.
2. Separar por dominio visual:
   - base/tokens;
   - layout/shell;
   - chat;
   - sidebar;
   - memory cards;
   - modals;
   - utilities.
3. Nao alterar paleta/layout enquanto estiver so refatorando.
4. Validar telas principais em desktop e mobile.

Saida esperada:

- CSS navegavel.
- Menos risco de regressao visual.

## Criterios de verificacao

Depois de cada fase:

```powershell
git diff --stat
node --check main.js
node --check js/app.js
node --check js/chat.js
node --check js/chat-models.js
node --check js/ui.js
node --check worion-api/server.js
npm run validate
```

Se `npm run validate` falhar por dependencia/rede/sandbox, registrar exatamente o erro e continuar apenas com validacoes locais possiveis.

## Criterios de commit

Commits pequenos e nomeados pelo tipo de trabalho:

- `chore: organize repo artifacts`
- `chore: centralize runtime logging`
- `fix: persist memory card actions`
- `refactor: extract memory cards ui`
- `refactor: split chat routing`
- `refactor: split api routes`
- `refactor: organize stylesheet`

Nao misturar limpeza de repo com refatoracao funcional no mesmo commit.

## Riscos

- `js/ui.js` depende de muito estado global. Extrair sem entender ordem de carregamento pode quebrar handlers inline no HTML.
- Backups podem conter codigo ainda usado como referencia. Comparar antes de remover.
- A pasta `docs/Jobs & features/Atulizações` tem espacos e acentos; comandos devem usar `-LiteralPath` no PowerShell quando mexer nela.
- Memory Cards podem depender de schema Supabase que nao esta completamente refletido no repo. Verificar migrations e endpoints antes.
- O app Electron pode esconder erros de renderer se o console estiver ruidoso. Reduzir logs antes ajuda a ver regressao real.

## Primeira tarefa recomendada na proxima sessao

Comecar pela Fase 0, Fase 1 e Fase 2. Nao iniciar refatoracao de `js/ui.js` antes de decidir o destino dos backups, dumps e arquivos pequenos soltos. A limpeza de inventario deve reduzir o ruido do Git e evitar apagar ou sobrescrever trabalho recente do usuario.

## Progresso em 2026-06-04

Bloco executado com baixo risco, sem alterar runtime:

- `run-classification.js` movido para `scripts/run-classification.js`.
- `link-workestria.js` movido para `scripts/link-workestria.js`.
- `validate-cards.sql` movido para `sql/validate-cards.sql`.
- `js/artifacts_backup.txt` movido para `docs/archive/artifacts_backup.txt`.
- `js/ui.js.original-full` movido para `docs/archive/ui-backups/ui.js.original-full`.
- `js/ui.js.pre-module-integration` movido para `docs/archive/ui-backups/ui.js.pre-module-integration`.
- `docs/archive/README.md` criado para documentar os arquivos arquivados.

Validacoes feitas:

```powershell
node --check scripts\run-classification.js
node --check scripts\link-workestria.js
node --check js\artifacts.js
node --check js\ui.js
```

Observacoes:

- Os scripts movidos foram ajustados para carregar `.env` da raiz via `path.join(__dirname, '..', '.env')`.
- `js/ui.js.original-full` e `js/ui.js.pre-module-integration` tinham SHA256 identico antes do move: `9627F41445E8387FD6B4797C9A92EF95FE523B0F7F95E41AB4F427A8F1E62861`.
- `js/prompt.js` e `js/backup prompt.txt` nao estao mais identicos. Hashes observados: `js/prompt.js` = `83E5104CA1810EEBD59FDFE04340F1D729F29D474DACA539500BCC6D585972FD`; `js/backup prompt.txt` = `AA60465C91946E79EF9FD1CF29F2D8FF19E7D51DABB49D33F9E1219E65D2DD90`.
- `git diff --no-index --stat -- js\prompt.js "js\backup prompt.txt"` mostrou 112 linhas de diferenca. Nao mover nem sobrescrever `js/backup prompt.txt` sem decisao explicita.
- `docs/Jobs & features/` e uma pasta de uso ativo do usuario. Ignorar como alvo de limpeza/refatoracao, mesmo aparecendo como `??` no Git. So ler/editar/mover conteudo nessa pasta quando houver pedido explicito do usuario.
- Nao tentar normalizar automaticamente o aparente move de `docs/ANALIZES` para `docs/Jobs & features/...`; essa area pertence ao fluxo documental do usuario.
- Validacoes adicionais executadas apos a limpeza:

```powershell
node --check main.js
node --check js/app.js
node --check js/chat.js
node --check js/chat-models.js
node --check worion-api\server.js
node --check js\ambient-context.js
node --check js\writer.js
npm run validate
```

Resultado: checks de sintaxe OK e `npm run validate` OK depois de documentar `js/ambient-context.js` e `js/writer.js` em `docs/architecture.json`.
