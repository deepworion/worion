# TESTES_E2E_TOOLS

Checklist manual para validar tools reais no Worion Desktop. Cada teste deve registrar pedido usado, resultado retornado, erro bruto se houver e arquivo/link criado quando aplicavel.

## create_notion_page

- [ ] Pedir: "Crie uma pagina no Notion chamada Teste E2E Worion com o conteudo: validacao de ferramenta."
- [ ] Confirmar chamada da tool `create_notion_page`.
- [ ] Confirmar retorno com `success: true`, `id` e `url`.
- [ ] Abrir a pagina no Notion e validar titulo/conteudo.

## save_project

- [ ] Pedir: "Salve um projeto chamado Teste E2E Worion com descricao e contexto simples."
- [ ] Confirmar chamada da tool `save_project`.
- [ ] Confirmar retorno com `success: true`, `id` e `title`.
- [ ] Confirmar persistencia em `data/projects/`.

## generate_pdf

- [ ] Pedir: "Gere um PDF chamado teste-e2e-worion.pdf com um paragrafo de validacao."
- [ ] Confirmar chamada da tool `generate_pdf`.
- [ ] Confirmar arquivo em `artifacts/pdf/`.
- [ ] Abrir o PDF e validar conteudo.

## generate_image

- [ ] Pedir: "Gere uma imagem simples de um painel futurista do Worion."
- [ ] Confirmar chamada da tool `generate_image`.
- [ ] Se configurada, confirmar arquivo em `artifacts/images/`.
- [ ] Se falhar por ambiente, confirmar mensagem exata: "Geracao de imagem ainda nao esta configurada neste ambiente."

## notion_search_pages

- [ ] Pedir: "Busque no Notion paginas sobre Worion."
- [ ] Confirmar chamada da tool `notion_search_pages`.
- [ ] Confirmar lista de paginas com titulo e id.
- [ ] Validar que a resposta nao usa filesystem para Notion.

## notion_read_page

- [ ] Pedir: "Leia a pagina [titulo ou URL] do Notion e resuma."
- [ ] Confirmar chamada da tool `notion_read_page`.
- [ ] Confirmar conteudo retornado.
- [ ] Validar resumo baseado no texto real.

## memory_search

- [ ] Pedir: "Busque nas memorias conversas sobre Worion."
- [ ] Confirmar chamada da tool `memory_search`.
- [ ] Confirmar resultados com `conversation_id`, `source_id` e snippet.
- [ ] Se necessario, encadear `memory_read_conversation`.

## supabase_select

- [ ] Pedir: "Conte conversas do Claude importadas na Supabase."
- [ ] Confirmar chamada da tool `supabase_select` com `table="memory_conversations"`, `source_id="claude"` e `count=true`.
- [ ] Confirmar retorno de contagem.
- [ ] Validar que nao usa `worion_memory_conversations` para importacoes Claude/GPT.

## brave_search

- [ ] Pedir pesquisa sobre tema atual.
- [ ] Confirmar chamada da tool `brave_search`.
- [ ] Confirmar que a resposta nao despeja resultados crus.
- [ ] Quando o usuario pedir fontes, listar 3 a 5 links relevantes.

## fetch_url

- [ ] Verificar se a tool `fetch_url` esta registrada no ambiente.
- [ ] Se registrada, abrir 2 a 3 URLs vindas de `brave_search` e sintetizar conteudo.
- [ ] Se nao registrada, registrar pendencia real: protocolo de pesquisa pede `fetch_url`, mas `tools.js` atual nao expoe essa tool.
