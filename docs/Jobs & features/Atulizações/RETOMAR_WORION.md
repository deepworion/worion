# Retomar Worion

Data: 13/05/2026

## Contexto do Produto

Worion deve funcionar como um app local de agentes no estilo Claude/GPT, para uso pessoal por enquanto.

Objetivo atual:
- usar `gpt-4o-mini`;
- conversar com agentes em Markdown;
- ajudar o usuario principalmente com n8n, automacoes, APIs, JSON e trabalho operacional;
- manter historico de conversas no proprio app;
- usar Notion, n8n e outros conectores somente quando forem acionados, nao como destino automatico.

## Decisoes Tomadas

- Conversas nao devem ser salvas automaticamente no Notion.
- Conversas devem ficar no Worion, em armazenamento local.
- Notion deve ser ferramenta sob demanda: salvar sinteses, JSON, catalogos ou ler contexto quando pedido.
- n8n deve ser acessado pelo conector correto, preferencialmente MCP.
- Vault nao deve expor tokens ao agente nem na interface como conteudo.
- Projetos e Conectores devem ser internos do Worion, nao listas diretas do Notion/Vault.

## Estado Atual do Projeto

Projeto:
`C:\Users\User\worion-desktop`

Arquivos principais:
- `index.html`
- `main.js`
- `agents/worion-assistente.md`
- `data/conversations/*.json`

Stack:
- Electron
- HTML/CSS/JS vanilla
- OpenAI via `gpt-4o-mini`
- Supabase Vault para keys
- Notion API direta via fetch
- n8n Public API e MCP HTTP

## Agente Atual

Foi criado:
`agents/worion-assistente.md`

O agente anterior `n8n-copiloto.md` foi removido e existe backup:
`n8n-copiloto.md.backup-codex-20260513-175002`

Tambem existe backup do diario reflexivo:
`diario-reflexivo.md.backup-codex-20260513-173751`

## n8n

URL:
`https://n8n.workestria.cloud`

MCP endpoint:
`https://n8n.workestria.cloud/mcp-server/http`

Configuracao MCP externa equivalente:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "type": "http",
      "url": "https://n8n.workestria.cloud/mcp-server/http",
      "headers": {
        "Authorization": "Bearer <YOUR_ACCESS_TOKEN_HERE>"
      }
    }
  }
}
```

Token MCP foi salvo na Vault como:
- provider: `n8n`
- key: `mcp_token`
- store: `workestria`

Tambem existe:
- provider: `n8n`
- key: `api_key`
- store: `workestria`

Base URL foi cadastrada de forma irregular:
- key: `base_ur`
- store ou value contendo `https://n8n.workestria.cloud`

O app foi ajustado para tolerar `base_ur`.

## Descobertas n8n

Public API `/api/v1/workflows` retornou:
- total: 69 workflows
- ativos: 6
- inativos: 63

Ativos vistos pela Public API:
- `APROVADO | Sistema | Gerador de BODY_HTML |`
- `Workestria | 01 | Buscador Fatorando Serp - FIXED`
- `APROVADO | CALCULADORA DE PREÇOS`
- `APROVADO | Workestria | Organizador de Informações`
- `APROVADO | MODULO | SEO + METADADOS`
- `ORQUESTRADOR | WORKESTRIA | V2.0`

Depois foi descoberto pelo usuario:
- alguns workflows foram ligados/configurados pelo Claude Code ao Notion;
- falta `Webhook Trigger` em workflows que deveriam ser expostos/acionados;
- portanto a catalogacao via n8n ainda precisa ser revisada com cuidado.

## MCP n8n

O endpoint MCP autenticou corretamente com token `aud=mcp-server-api`.

Testes feitos:
- `initialize`: OK
- `tools/list`: OK
- apareceu a tool `search_workflows`
- `tools/call` com `search_workflows`: retornou workflows

O `index.html` foi alterado para preferir MCP quando existir `mcp_token`, e cair para Public API se nao houver.

## Problemas Conhecidos

1. Upload/anexos ainda nao estao prontos.
   - O outro agente adicionou preview de anexos.
   - Mas o arquivo ainda nao e enviado corretamente ao modelo.
   - Precisa limpar e implementar direito.

2. O outro agente adicionou uma funcao n8n extra no fim do `index.html`.
   - Ela chegou a ter API key hardcoded.
   - A key hardcoded foi removida.
   - A funcao extra ainda pode existir, mas agora usa Vault.
   - Vale revisar e remover duplicacao depois.

3. Existem muitas funcoes antigas no `index.html`.
   - O arquivo cresceu e tem sobrescritas de funcoes.
   - Sintaxe esta OK, mas precisa refatorar para ficar limpo.

4. Notion nao deve ser destino automatico.
   - Qualquer codigo antigo que salve conversa no Notion deve permanecer desativado/sobrescrito.

5. Projetos e Conectores ainda nao estao no modelo final.
   - Devem virar entidades internas do Worion.
   - Nao devem listar Notion/Vault diretamente como produto final.

## Backups Importantes

Backups recentes:
- `index.html.backup-codex-clean-agent-leftovers-20260513-181729`
- `index.html.backup-codex-n8n-mcp-20260513-183013`
- `index.html.backup-codex-openai-retry-prompt-20260513-180342`
- `index.html.backup-codex-n8n-baseurl-20260513-175833`
- `index.html.backup-codex-connector-fix-20260513-175002`
- `index.html.backup-codex-localchat-20260513-173741`

## Ordem Recomendada Para Continuar

1. Ler este arquivo.
2. Rodar checagem de sintaxe do `index.html`.
3. Revisar o fim do `index.html` e remover duplicacao/incompletos de upload/n8n.
4. Implementar upload real:
   - imagens;
   - `.json`;
   - `.txt`;
   - futuramente PDF/DOCX.
5. Fazer o Worion aceitar JSON exportado de workflow n8n.
6. Criar rotina de catalogacao local:
   - nome;
   - status;
   - trigger;
   - nodes principais;
   - credenciais usadas;
   - finalidade;
   - observacoes.
7. So depois criar comando para salvar sintese no Notion quando o usuario pedir.
8. Revisar MCP n8n:
   - listar workflows;
   - separar ativos/inativos;
   - buscar detalhes de workflow quando necessario;
   - nao depender de Notion.

## Comando de Sintaxe

Rodar no projeto:

```powershell
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const m=html.match(/<script>([\s\S]*)<\/script>/); new Function(m[1]); console.log('syntax ok')"
```

## Pedido Para a Proxima Sessao

Quando retomar, pedir:

> Leia `RETOMAR_WORION.md` e continue a partir da ordem recomendada. Primeiro verifique se o `index.html` ainda esta consistente e remova duplicacoes perigosas antes de implementar upload real.

## Atualizacao 14/05/2026

Feito:
- `index.html` passou na checagem de sintaxe com `new Function(...)`.
- Removidas duplicacoes perigosas de `buildSystemPrompt`, `sendMsg`, `saveCurrentSession`, `renderChatPanel` e fluxo antigo de salvar sessao no Notion.
- Removida a funcao extra `fetchN8NWorkflows` do fim do arquivo, mantendo o caminho consolidado via MCP e fallback Public API.
- Implementado upload real para imagens, `.json` e `.txt`:
  - imagens entram no payload OpenAI como `image_url`;
  - `.json` e `.txt` entram como texto anexado ao prompt;
  - anexos aparecem no preview e no historico da mensagem;
  - limite atual: 10 MB por arquivo;
  - PDF/DOCX seguem fora do escopo por enquanto.

Proximo passo recomendado:
- Testar manualmente no Electron enviando uma imagem pequena, um `.txt` e um JSON exportado do n8n.
- Depois implementar catalogacao local de workflows n8n exportados em JSON.

## Atualizacao 14/05/2026 - Sidebar e experiencia de chat

Feito:
- Sidebar passou a ter skills rapidas:
  - Pensador;
  - Organizador;
  - Pesquisa, com icone de globo.
- Conversas locais recentes agora aparecem diretamente na barra lateral, sem precisar abrir a pagina "Conversas" para continuar.
- Adicionado menu de perfil no rodape da sidebar e pagina de configuracoes locais.
- Perfil local salvo em `data/profile.json`.
- O prompt agora injeta perfil local e skill ativa.
- Conversas agora registram `createdAt` por mensagem e eventos de retomada quando ha intervalo relevante entre sessoes.
- Ao reabrir uma conversa, o Worion adiciona um marcador informando quando foi retomada e quanto tempo se passou desde a ultima atividade.
- Shell principal foi alterado para `100vh/100vw`, removendo a sensacao de janela limitada com linha/scroll inferior.
- Caixa de texto do chat e da home cresce ate cerca de 4 linhas.
- Pagina de agentes agora inicia conversa diretamente pelo card do agente.

Verificacao:
- Sintaxe do `index.html`: OK.
- Electron iniciado via `npm.cmd start`.

## Atualizacao 14/05/2026 - Chat na mesma tela

Feito:
- O fluxo ativo de `startChat()` nao adiciona mais `chat-fullscreen`.
- O chat agora renderiza dentro do mesmo `main` da home, nao mais no `detail-panel`.
- Ao enviar a primeira mensagem pela home, a conversa permanece na mesma area visual em vez de abrir uma "sala" separada.
- Skills tambem aparecem como chips abaixo da caixa de texto, alem da sidebar.
- Durante a conversa, ha uma linha de status da skill ativa:
  - `Modo ativo`;
  - `Interagindo agora` enquanto a resposta esta sendo preparada.
- O titulo inicial da home agora varia por horario e usa o nome do perfil local quando disponivel.

Verificacao:
- Sintaxe do `index.html`: OK.

## Atualizacao 14/05/2026 - Modelos, loading e artefatos

Feito:
- Criado `data/models.json` para modelos configuraveis sem alterar o codigo principal.
- O cadastro/edicao de agentes agora usa a lista de modelos configuravel e tambem aceita modelo customizado.
- Lista inicial inclui modelos rapidos e avancados, como `gpt-4o-mini`, `gpt-4o`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-5.2` e `gpt-5.2-pro`.
- Corrigida a bolha branca de mensagem do usuario; mensagens ficam no tema dark.
- Substituido o `...` estatico por indicador animado com status contextual:
  - Analisando contexto;
  - Pesquisando fontes;
  - Organizando informacoes;
  - Gerando documento.
- Prompt reforcado para linguagem mais natural e para nao mandar o usuario usar ferramenta externa quando o Worion puder executar webhook.
- Adicionada deteccao inicial de pedidos de PDF.
- Quando houver webhook configurado no agente, pedidos de PDF enviam payload para o webhook e retornam o link/resposta ao chat.
- Adicionado contador discreto de uso diario no rodape do perfil.
- Configuracoes agora permitem definir limite diario em minutos; ao ultrapassar, o Worion injeta apenas um lembrete discreto no contexto.

Verificacao:
- Sintaxe do `index.html`: OK.
- `data/models.json`: JSON OK.

## Atualizacao 14/05/2026 - Notion dedicado Worion

Feito:
- `NOTION_PARENT_PAGE_ID` atualizado primeiro para `ec254a24-a0f0-813a-8cb6-000394e11435`, depois corrigido para `81d6b4f5-321d-83cd-b38c-81568258e992`.
- `NOTION_TOKEN` atualizado para a nova integracao interna "Worion".
- Nao foram alterados Supabase, n8n, MCP, agentes, skills ou layout.

Teste:
- Com parent `ec254a24-a0f0-813a-8cb6-000394e11435`, tentativa de criar `TESTE_WORION_CORE` retornou `404 object_not_found`.
- Com parent corrigido `81d6b4f5-321d-83cd-b38c-81568258e992`, leitura direta do parent retornou `404 object_not_found`.
- A forma compactada `81d6b4f5321d83cdb38c81568258e992` tambem retornou `404 object_not_found`.
- Como a leitura do parent falhou, a criacao de `TESTE_WORION_CORE` nao foi executada neste segundo teste.
- `/v1/search` autenticou com status `200`, mas retornou lista vazia.
- Diagnostico: token novo autentica, mas a integracao "Worion" ainda nao enxerga a pagina raiz `81d6b4f5-321d-83cd-b38c-81568258e992` no Notion. E necessario confirmar se a pagina "worion Workspace HQ" esta compartilhada diretamente com a integracao "Worion" no workspace correto.

Reteste apos usuario informar compartilhamento:
- Parent testado: `81d6b4f5-321d-83cd-b38c-81568258e992`.
- Leitura direta do parent: `404 object_not_found`.
- `/v1/search` com query `Worion`: status `200`, resultados vazios.
- Criacao de `TESTE_WORION_CORE`: nao executada porque o parent ainda nao esta visivel para a integracao.
- Diagnostico permanece: a integracao autentica, mas nao tem visibilidade de nenhuma pagina no workspace pela API. Conferir se a conexao adicionada a pagina e exatamente a integracao com `integration_id` `36054a24-a0f0-8141-9c74-00278f686a6e`.

Teste com nova pagina raiz informada pelo usuario:
- URL testada: `https://www.notion.so/Bem-vindo-ao-Notion-36054a24a0f080da8d64ccccfae4e3d4`.
- ID testado: `36054a24-a0f0-80da-8d64-ccccfae4e3d4`.
- Leitura direta: `404 object_not_found`.
- ID sem hifens: tambem `404 object_not_found`.
- `/v1/search`: status `200`, resultados vazios.

Decisao:
- Como a nova integracao continua sem visibilidade de paginas, o Worion foi restaurado para o Notion antigo.
- `NOTION_TOKEN` restaurado para o token antigo.
- `NOTION_PARENT_PAGE_ID` restaurado para `34e8bcbf-b9ad-8056-af5b-edb3a46e583b`.
- Teste no Notion antigo:
  - leitura do parent: `200`;
  - criacao de `TESTE_WORION_OLD_CORE`: `200`;
  - parent retornado: `34e8bcbf-b9ad-8056-af5b-edb3a46e583b`;
  - arquivamento da pagina temporaria: `200`.

## Atualizacao 14/05/2026 - Supabase separado para memoria Worion

Contexto:
- Usuario criou um novo projeto Supabase exclusivo para memoria do Worion.
- Anon key recebida aponta para `https://tjjyqoblhgrqmanlbqut.supabase.co`.

Feito:
- Mantido Supabase antigo para Vault, chaves e conectores.
- Adicionada configuracao separada:
  - `MEMORY_SUPABASE_URL`;
  - `MEMORY_SUPABASE_ANON_KEY`;
  - `MEMORY_CONVERSATIONS_TABLE = worion_memory_conversations`.
- Criado arquivo `supabase_worion_memory.sql` com tabela, indices e policies RLS para uso via anon key.
- Salvamento local de conversa agora tambem tenta sincronizar com o Supabase de memoria.
- Listagem e abertura de conversas tentam ler primeiro o Supabase de memoria e caem para arquivos locais se a tabela ainda nao existir.

Pendente:
- Rodar `supabase_worion_memory.sql` no SQL Editor do projeto Supabase novo.
- Depois testar criando uma conversa e verificando se aparece em `public.worion_memory_conversations`.

## Atualizacao 14/05/2026 - Criacao real de paginas no Notion pelo chat

Contexto:
- O Worion respondeu a um pedido de criacao de pagina no Notion explicando uma requisicao manual, apesar de o Notion antigo estar configurado e funcional.
- Mantido o Notion original por enquanto:
  - `NOTION_TOKEN` atual preservado;
  - `NOTION_PARENT_PAGE_ID = 34e8bcbf-b9ad-8056-af5b-edb3a46e583b`;
  - sem migrar workspace.

Feito:
- Criada a funcao clara `createNotionPage(title, content)` em `index.html`.
- A funcao usa `POST https://api.notion.com/v1/pages`.
- O parent usa pagina comum: `parent: { page_id: NOTION_PARENT_PAGE_ID }`.
- A criacao de projeto foi ajustada para reutilizar `createNotionPage()`.
- Adicionado detector local de pedidos como:
  - "crie uma pagina no Notion";
  - "salve no Notion";
  - "gere no Notion";
  - equivalentes com titulo/conteudo.
- O fluxo de `sendMsg()` agora intercepta esse pedido antes da chamada ao OpenAI, chama a Notion API real e retorna:
  - titulo criado;
  - link da pagina;
  - Page ID.
- Nao foram alterados Supabase, n8n, MCP, agentes, skills, layout, token ou parent ID.

Teste real:
- Pagina criada: `TESTE_CRIACAO_WORION_NOTION`.
- Conteudo: `Teste de criação direta de página pelo Worion via Notion API.`
- Resultado da criacao: `200`.
- Page ID criado: `3608bcbf-b9ad-81f7-b982-cfae2463b984`.
- Link retornado pela API: `https://www.notion.so/TESTE_CRIACAO_WORION_NOTION-3608bcbfb9ad81f7b982cfae2463b984`.
- Leitura de confirmacao: `200`.
- Arquivamento/remocao da pagina de teste: `200`.

Status:
- Criacao real de paginas no Notion pelo chat: OK.
- O Worion nao deve mais responder apenas "voce pode usar a API" para esse caso; deve executar a criacao e devolver o link.
