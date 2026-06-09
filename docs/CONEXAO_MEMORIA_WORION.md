# Conexao, Memoria e Governanca do Worion

Data: 2026-05-26

## Contexto

Esta nota registra a conversa sobre Obsidian, Notion, memoria, sessoes e a arquitetura atual do Worion.

O pedido inicial foi ler `docs/conexao`, varrer o sistema e ajudar a elaborar o que estava sendo buscado, porque a intencao ainda nao estava totalmente clara.

Foi descoberto que `docs/conexao` existe, mas e um arquivo vazio de 0 bytes. Ou seja: a ideia de "conexao" ainda nao estava formalizada.

Depois foram lidos documentos mais recentes:

- `docs/HANDOFF_GPT55_V3_PRETRAVAMENTO.md`
- `C:\Worion Sessions\sessions\SESSAO_26_05_2026_CHAT_MESSAGES_API_LOCAL.md`
- `C:\Worion Sessions\sessions\SESSAO_26_05_2026_NOTION_CREATE_API_LOCAL.md`

Esses documentos mudaram a leitura inicial.

## Correcao da leitura anterior

A leitura inicial dizia que havia conflito entre documentos antigos que mandavam salvar sessoes no Notion e a decisao mais recente de manter conversas no Worion.

A correcao e:

Nao ha um conflito simples entre "salvar no Notion" e "nao salvar no Notion".

A decisao atual e mais refinada:

> Notion nao e autosave passivo nem memoria principal. Notion e uma ferramenta de leitura/escrita sob comando explicito, via API local, com confirmacao da tool.

Portanto, o problema nao e o Notion existir no fluxo. O problema seria salvar automaticamente, sem comando claro, ou declarar que algo foi salvo sem confirmacao da ferramenta.

## Decisao arquitetural atual

Conversas e memoria operacional pertencem ao Worion.

Notion e destino deliberado de publicacao, sintese, arquivo ou pagina criada sob comando explicito.

Toda escrita no Notion deve passar pela Worion API local, nao pelo renderer, e so pode ser declarada concluida apos retorno confirmado da tool.

## Estado tecnico relevante

Segundo os documentos lidos:

- `POST /api/notion/fetch` ja le Notion de verdade pelo backend local.
- `POST /api/notion/create` ja cria paginas no Notion pelo backend local.
- `POST /api/chat/messages` ja processa chamadas LLM no backend local.
- Tokens e chaves sensiveis devem ficar no backend local, nao no renderer.
- O frontend tenta a API local primeiro e mantem fallback antigo enquanto a migracao amadurece.
- O Command Intent Gate intercepta comandos explicitos antes de LLM, pesquisa, memoria e roteamento.

## Regra para Notion

Comandos como estes devem ser tratados como intencao deterministica:

- "Salve no Notion"
- "registre no Notion"
- "crie uma pagina no Notion"
- "salve isso no Notion"
- "salve a transcricao no Notion"
- "pode salvar agora no Notion"

Quando detectado:

1. Executar `createNotionPage()` / `worionApiNotionCreate()`.
2. Responder com titulo, link e Page ID.
3. Encerrar o pipeline.
4. Nao chamar LLM, pesquisa ou memoria depois.
5. Nao deixar o ContextGuardian salvar o turno automaticamente.

## Regra para memoria

Memoria nao deve ser contaminada por turnos tecnicos, testes, diagnosticos, introspeccoes ou comandos ja resolvidos por ferramenta.

O ContextGuardian deve respeitar a Memory Write Policy:

- bloquear escrita persistente em turnos de teste, diagnostico, tool turn, Command Gate, baixa confianca ou pergunta sobre contexto ativo;
- permitir escrita quando o usuario pedir explicitamente para memorizar/salvar na memoria;
- permitir escrita automatica apenas quando a heuristica for conservadora.

## Papel de cada camada

O Worion nao precisa escolher entre Notion, Obsidian e Supabase. Cada um tem papel diferente. O erro seria deixar todos competirem pela mesma funcao.

### Worion

Centro operacional.

Responsavel por conversar, executar, decidir rotas, chamar ferramentas, consultar memoria, usar conectores e preservar continuidade.

### Worion API local

Fronteira de seguranca.

Responsavel por segredos, chamadas LLM, Notion, Supabase/Vault, roteamento de modelo, busca de memoria e ferramentas sensiveis.

### Supabase / memory_chunks / memory_conversations

Memoria pesquisavel e operacional.

Serve para recuperacao semantica, historico importado, busca por termos e continuidade entre sessoes.

### ContextGuardian

Camada de indexacao e memoria interna.

Nao deve salvar tudo. Deve obedecer politica de escrita.

### C:\Worion Sessions

Arquivo humano/auditavel de sessoes.

E o lugar natural para manter registros longos, handoffs, retomadas e documentos de sessao fora do repositorio principal.

### Obsidian

Janela humana sobre arquivos Markdown.

Pode ser usado para abrir `C:\Worion Sessions` ou uma pasta canonica de memoria/documentacao como vault. O papel ideal do Obsidian nao e ser o cerebro do Worion, mas ser uma interface de leitura, edicao e ligacao manual dos arquivos.

### Notion

Publicacao e organizacao externa sob demanda.

Nao deve ser memoria principal nem autosave passivo. Deve receber paginas, sinteses, registros ou materiais quando o usuario mandar salvar/publicar.

## Ajuste necessario nos agentes antigos

Alguns agentes e documentos antigos dizem algo como:

> Ao final da sessao, registre o conteudo no Notion.

Isso precisa ser refinado, nao simplesmente apagado.

Versao correta:

> Ao final da sessao, se o usuario pedir explicitamente para salvar, publicar ou registrar no Notion, use `memory_save_to_notion` ou `create_notion_page`. Nao salve automaticamente sem comando claro. Antes de salvar, preserve a diferenca entre conversa bruta, sintese e memoria consolidada.

## Formula central

Memoria viva fica no Worion.

Arquivo legivel fica em Markdown.

Obsidian pode ser a janela humana.

Notion e publicacao sob comando.

Supabase e recuperacao operacional.

API local e a fronteira de seguranca.

## Proxima retomada

Quando retomar, nao comecar implementando Obsidian.

Primeiro decidir:

1. Qual pasta Markdown sera a fonte humana canonica?
2. `C:\Worion Sessions` sera aberta diretamente como vault no Obsidian?
3. Deve existir uma pasta dentro do repo, por exemplo `docs/memoria/`, ou o arquivo vivo fica fora do repo?
4. Quais agentes precisam ter a regra antiga de Notion corrigida?
5. O arquivo vazio `docs/conexao` deve ser removido, renomeado ou substituido por este documento?

Estado emocional/operacional no momento deste registro:

O usuario informou que o sono veio e que precisa descansar.

Modo recomendado para o proximo turno: espera, retomada calma, sem abrir frente nova automaticamente.
