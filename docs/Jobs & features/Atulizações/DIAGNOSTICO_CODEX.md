# DIAGNOSTICO_CODEX — Dossiê técnico reverso do Worion Desktop

**Data:** 30/05/2026  
**Base auditada:** `C:\Users\User\worion-desktop`  
**Documento confrontado:** `C:\Users\User\Downloads\DIAGNOSTICO_WORION_DESKTOP_30_05_2026 (1).md`  
**Escopo:** código local, documentação local, estrutura de instalação, segurança de APIs, arquitetura Electron/renderer/backend, memória, módulos, dependências e validações estáticas.

---

## 1. Síntese executiva

O diagnóstico recebido está correto na direção geral de risco, mas mistura três coisas diferentes:

1. **API key hardcoded literal**: chave real escrita diretamente no código.
2. **Endpoint/provider hardcoded**: URL fixa como `https://api.openai.com/...`.
3. **Segredo acessível no renderer**: chave vem de `.env`/Supabase Vault, mas o frontend Electron consegue ler e usar.

O pente-fino local indica:

- **Não encontrei chave real hardcoded nos arquivos versionáveis**, fora um placeholder seguro em `workflows/modules/credentials/openai-connection.template.json`.
- **As APIs/provedores ainda existem hardcoded como endpoints e base URLs** em `js/chat-models.js`, `js/connectors.js`, `js/tools.js`, `worion-api/server.js`, `deepworion.js` e `data/models.json`.
- **O risco crítico não é mais “tem uma sk-... colada no código”**. O risco atual é: o renderer ainda carrega `js/connectors.js`, lê `WORION_VAULT_SUPABASE_SERVICE_KEY` via `process.env`, consulta `api_keys_vault_v2` e faz chamadas diretas para OpenAI, DeepSeek, Anthropic, Notion, Brave e Tavily quando o fallback entra.
- Portanto, sua lembrança está parcialmente correta: houve migração para Vault/Get Row/Get by ID. Mas a conclusão “não há mais risco de API no frontend” ainda não é verdadeira.

---

## 2. Evidência objetiva: hardcode de secrets vs hardcode de endpoints

### 2.1 Secrets reais hardcoded

Busca por padrões de tokens reais em arquivos versionáveis:

- `sk-proj-...`
- `sk-...`
- `ntn_...`
- `ghp_...`
- `xox...`
- `AIza...`

Resultado relevante:

- `workflows/modules/credentials/openai-connection.template.json:16` contém apenas placeholder: `sk-proj-xxxxxxxx...`.
- Não houve evidência de chave real exposta em arquivos rastreáveis pelo repositório.
- `.env` está ignorado por `.gitignore`, confirmado em `.gitignore` com regra `.env`, `.env.*` e exceção `!.env.example`.

**Conclusão:** a acusação “ainda existem API keys hardcoded literais” não se confirmou no código auditado.

### 2.2 Endpoints e providers hardcoded

Isto ainda existe e é esperado parcialmente, mas precisa ser separado do problema de segredo:

- `js/chat-models.js:436` chama `https://api.openai.com/v1/chat/completions`.
- `js/chat-models.js:485` usa base default `https://api.deepseek.com`.
- `js/chat-models.js:619` chama `https://api.anthropic.com/v1/messages`.
- `js/tools.js:193` chama `https://api.openai.com/v1/images/generations`.
- `js/connectors.js:502`, `531`, `556`, `716`, `745`, `776`, `811` chamam Notion direto.
- `js/connectors.js:279`, `347`, `405` usam Brave/Tavily direto.
- `worion-api/server.js:846`, `890`, `940`, `1045` também chama OpenAI/DeepSeek/Anthropic/Notion, mas nesse caso no backend local.
- `data/models.json` mantém `base_url` hardcoded para DeepSeek, OpenAI e Anthropic.

**Conclusão:** há hardcode de endpoints/modelos, não necessariamente de chaves.

---

## 3. Achado crítico: Vault no renderer

O ponto mais importante do dossiê:

`index.html` carrega scripts clássicos com Node habilitado, incluindo:

- `index.html:89` -> `js/connectors.js`
- `index.html:103` -> `js/worion-api-client.js`
- `index.html:105` -> `js/chat-models.js`
- `index.html:109` -> `js/chat.js`

Em `main.js`:

- `main.js:105` -> `nodeIntegration: true`
- `main.js:106` -> `contextIsolation: false`
- `main.js:107` -> `webSecurity: false`
- `main.js:108` -> `allowRunningInsecureContent: true`

Em `js/connectors.js`:

- `js/connectors.js:16-26` lê variáveis de ambiente via `process.env`.
- `js/connectors.js:26` exige `WORION_VAULT_SUPABASE_SERVICE_KEY`.
- `js/connectors.js:36-37` monta headers com service key.
- `js/connectors.js:68-85` busca OpenAI no Supabase Vault e retorna `data[0].value`.
- `js/connectors.js:88-105` busca Anthropic no Vault e retorna `data[0].value`.
- `js/connectors.js:108-117` busca DeepSeek por ID 43 ou provider.
- `js/connectors.js:119-128` faz `select=*` na tabela `api_keys_vault_v2`.
- `js/connectors.js:131-139` coloca `item.value` no input `conn-value`.
- `js/connectors.js:143-156` permite salvar `value` de conexão pelo renderer.

**Interpretação técnica:** mesmo que as chaves estejam na Vault, a service key da Vault é acessível ao renderer. Com DevTools/console, um usuário local consegue alcançar funções, variáveis globais e chamadas que retornam secrets. Isso é equivalente, do ponto de vista de distribuição, a ter segredo exposto no frontend.

---

## 4. Verificação reversa da migração “Get Row / Vault”

Sua observação procede: há evidência de migração real.

### Implementações já migradas para backend local

`worion-api/server.js` tem rotas reais:

- `/api/chat/messages`
- `/api/notion/fetch`
- `/api/notion/create`
- `/api/memory/search`
- `/api/memory/audit`
- `/api/memory/contexts`
- `/api/memory/cards`
- `/api/memory/import/analyze`
- `/api/memory/cards/generate-from-parent-context`

E resolve chaves no backend:

- `worion-api/server.js:550` lê `WORION_VAULT_SUPABASE_SERVICE_KEY`.
- `worion-api/server.js:653-677` consulta `api_keys_vault_v2`.
- `worion-api/server.js:680-704` resolve OpenAI/DeepSeek/Anthropic.
- `worion-api/server.js:833-940` executa chamadas LLM no backend.

### Onde a migração não fechou

`js/chat-models.js` tenta API local primeiro, mas mantém fallback direto:

- `js/chat-models.js:195-224` tenta `worionApiChatMessages`.
- `js/chat-models.js:228` registra fallback se API local falhar.
- `js/chat-models.js:233` usa fallback direto ao provedor.
- `js/chat-models.js:389`, `486`, `562` puxam keys no renderer via `getOpenAIKey`, `getDeepSeekKey`, `getAnthropicKey`.

`js/connectors.js` tenta API local para Notion Create, mas mantém fallback direto:

- `js/connectors.js:693-710` tenta `worionApiNotionCreate`.
- `js/connectors.js:715-720` cai para chamada direta ao Notion.

`js/tools.js` ainda tem ferramenta de imagem OpenAI direta:

- `js/tools.js:180-197` pega OpenAI key e chama `/v1/images/generations` no renderer.

**Conclusão reversa:** a migração existe, mas foi implementada em modo híbrido. Backend local virou caminho preferencial em alguns fluxos; o renderer ainda é caminho de fallback e ainda tem capacidade de resolver secrets.

---

## 5. Segurança Electron

Confirmado no código:

- `webSecurity: false`
- `allowRunningInsecureContent: true`
- `nodeIntegration: true`
- `contextIsolation: false`
- CSP com `unsafe-inline`, `unsafe-eval` e `connect-src *` em `index.html:5`.

Isso amplifica qualquer XSS, dependência comprometida, markdown mal renderizado, HTML injetado ou asset remoto. Como o renderer tem Node e tem acesso a `process.env`, o impacto é alto.

**Classificação:** crítico antes de distribuição para terceiros.

---

## 6. UI de conexões e exposição de Vault

Há duas telas/caminhos diferentes:

### Caminho novo mais seguro

`js/ui/views/connections-view.js:64` consulta Vault com select restrito:

`id,provider,key,store,updated_at`

Isso não retorna `value`.

### Caminho legado perigoso

`js/connectors.js:119` usa `select=*` em `api_keys_vault_v2`.

`js/connectors.js:139` preenche `conn-value` com o valor real.

`js/tools.js:1017-1022` redige `value`, `secret` e `token` quando passa por `sanitizeSupabaseRows`, mas essa sanitização não elimina o problema do `connectors.js` com `loadConnections()` e `editConnection()`.

**Conclusão:** a nova view parece mais cuidadosa, mas o código legado ainda permite manipular e exibir secret bruto.

---

## 7. Memória / Memory Cards V2

O diagnóstico anterior estava parcialmente desatualizado.

### Já existe no código

- Tela de importação: `js/ui.js:4245-4317`.
- Endpoint de importação/análise: `worion-api/server.js:2593`.
- Geração de card a partir de contexto pai: `worion-api/server.js:2257-2295` e rota em `server.js:2618`.
- Seed de contextos canônicos: `worion-api/server.js:1670-1700`.
- Leitura de contexts/cards/files via API local: `js/worion-api-client.js:61-104`.

### Ainda há pendências reais

- `js/ui.js:4106` ainda registra TODO para persistir Memory Card via API real em um fluxo.
- `js/ui.js:4153` ainda registra TODO para persistir update dedicado.
- `js/ui.js:4501` ainda tem `ignoreMemoryContext TODO`.
- O backend gera card a partir de contexto, mas não há evidência de teste runtime completo fonte -> contexto -> card -> chat.
- A UI ainda tem fallback de conteúdo quando chunks não existem (`js/ui.js:2371-2430`, `2952-2972`), o que pode mascarar ausência de dados reais.

**Conclusão:** dizer “não existe tela importar conversa” ficou incorreto para o código atual. O correto é: a tela e endpoints existem, mas o fluxo completo ainda precisa de validação runtime e alguns fluxos de persistência continuam pendentes.

---

## 8. Estado global e modularização

Confirmado:

- Uso amplo de `window.*` em `js/`, especialmente `chat`, `ui`, `memory-cards`, `sidebar`, `search`, `composer`.
- `worion-api-client.js:255-279` exporta muitas funções para `window`.
- `chat.js:1772-1888` exporta funções centrais para `window`.
- `agents.js`, `skills.js`, `app.js`, `chat-sessions.js` compartilham estado por globais.

A modularização da UI existe e é real:

- Commits recentes mostram extração em fases: `7f5bc27`, `a0cb599`, `036b7d4`, `a2f5e98`, `5e64ab4`, `41096bc`, `713b1c0`, `a9fe838`, `b160a32`.
- `js/ui.js` importa módulos ES6 em `js/ui/...`.

**Conclusão:** a modularização avançou, mas o contrato de estado ainda é global. O diagnóstico anterior estava certo sobre o risco arquitetural, apesar de possivelmente defasado nos números exatos.

---

## 9. Instalação local e dependências

Estrutura encontrada:

- App Electron: `main.js`, `index.html`, `js/`, `css/`.
- Backend local: `worion-api/server.js`.
- CLI: `deepworion.js`, bin `deepworion` em `package.json`.
- Dados/config: `data/`.
- Migrações SQL: `sql/`, `artifacts/migrations/`.
- Documentação: `docs/`.
- Workflows Make.com: `workflows/`.
- Dependências instaladas: `node_modules/` presente.
- `.env` local presente, mas ignorado por `.gitignore`.

Dependências relevantes em `package.json`:

- `electron`
- `@supabase/supabase-js`
- `openai`
- `langsmith`
- `instagram-private-api`
- `mammoth`
- `pdf-parse`
- `pdfkit`
- `youtube-transcript`
- `@distube/ytdl-core`

Risco específico:

- `instagram-private-api` continua dependência de risco operacional por natureza de automação privada/instável.
- `marked` é carregado via CDN em `index.html:10`, enquanto a CSP permite CDN e `unsafe-eval`.

---

## 10. Validações executadas

Executado com sucesso:

- `npm run validate`
  - Resultado: `OK: Arquitetura documentada e integra.`
- `node --check worion-api\server.js`
  - Sem erro de sintaxe.
- `node --check js\chat-models.js`
  - Sem erro de sintaxe.

Não executado:

- Runtime Electron visual (`npm start`) porque abriria GUI e não era necessário para confirmar os achados de segurança/código.
- Teste real contra Supabase/Notion/OpenAI, para evitar tráfego externo e exposição de secrets.
- `npm audit`, pois depende de rede/registry.

---

## 11. Correções recomendadas por prioridade

### P0 — fechar exposição de secrets

1. Remover do renderer qualquer leitura de `WORION_VAULT_SUPABASE_SERVICE_KEY`.
2. Remover ou desativar fallback direto ao provedor em `js/chat-models.js`.
3. Migrar `js/tools.js` geração de imagem OpenAI para `worion-api/server.js`.
4. Migrar Brave/Tavily/Notion remanescentes de `js/connectors.js` para backend local.
5. Alterar `loadConnections()` para nunca usar `select=*` em Vault.
6. Remover `editConnection()` que injeta `item.value` em input no renderer, ou trocar por fluxo write-only/rotacionar segredo sem leitura.

### P1 — endurecer Electron

1. `contextIsolation: true`.
2. `nodeIntegration: false`.
3. `webSecurity: true`.
4. `allowRunningInsecureContent: false`.
5. Preload com API mínima e validada.
6. CSP sem `unsafe-eval`, sem `connect-src *`.

### P2 — consolidar arquitetura

1. Definir contrato único: renderer só chama `worion-api-client.js`.
2. Tornar `connectors.js` backend-only ou removê-lo do `index.html`.
3. Reduzir `window.*` para uma camada explícita de bridge.
4. Remover backups antigos de `js/ui.js.original-full` e `js/ui.js.pre-module-integration` da superfície ativa, ou movê-los para arquivo fora do runtime.

### P3 — validar produto/memória

1. Teste manual completo: importar arquivo -> gerar contexto -> gerar card -> abrir chat do card -> verificar contexto injetado.
2. Validar RLS e schema V2 com dados reais.
3. Confirmar que `memory_cards_v2`, `memory_contexts`, `memory_files` têm dados úteis e não só placeholders.
4. Fechar TODOs de persistência em `js/ui.js`.

---

## 12. Resposta direta à discrepância sobre “APIs hardcoded”

Você retirou o tipo mais perigoso e óbvio de hardcode: **chave literal no código**. O código atual mostra migração real para Vault/Get by ID/Get Row e backend local.

Mas ainda existem dois resíduos diferentes:

- **Hardcode aceitável/normal:** URLs de endpoint e IDs/modelos padrão.
- **Hardcode/segredo funcionalmente perigoso:** renderer com `WORION_VAULT_SUPABASE_SERVICE_KEY`, fallback direto ao provedor e função que lê `value` da Vault.

Então a frase mais precisa para substituir o diagnóstico anterior é:

> Não há evidência de API keys reais hardcoded em arquivos versionáveis, mas ainda há endpoints hardcoded e, principalmente, o renderer ainda consegue resolver e usar secrets via Supabase Vault. A migração para Worion API começou e funciona parcialmente, porém não fechou a fronteira de segurança.

---

## 13. Veredito Codex

O Worion Desktop está mais avançado do que o diagnóstico recebido sugere em Memory Cards e backend local, mas continua inseguro para distribuição porque o renderer ainda tem poder demais. O problema não é mais “copiei uma key no JS”; o problema é “o frontend ainda tem a chave mestra para buscar as keys”.

O próximo marco técnico não deve ser adicionar feature. Deve ser transformar a Worion API local na única fronteira de secrets e fazer o renderer virar cliente sem credenciais.
