# Implantacao Worion - Fase 2

Data de inicio prevista: 2026-05-26

## Objetivo

Subir uma versao limpa, testavel e apresentavel do Worion, preparada para uso externo controlado, sem expor os modulos internos de evolucao do projeto.

A Fase 2 transforma o Worion de workspace local em uma primeira versao publica/fechada com:

- apresentacao do produto;
- cadastro, login e senha;
- agentes nativos selecionaveis;
- criacao e edicao de agentes pelo usuario;
- importacao de conversas externas;
- memoria semantica baseada nas conversas importadas;
- deploy em VPS Hetzner via Docker;
- acesso por Cloudflare Tunnel;
- Supabase multiusuario/multitenant.

## Escopo da versao publica inicial

### Entra no pacote

- Home/apresentacao do Worion.
- Cadastro e login.
- Chat comum.
- Chat com agentes.
- Biblioteca de agentes nativos.
- Clonagem/edicao de agentes nativos.
- Criacao de novos agentes.
- Importacao de conversas do Claude, ChatGPT e outros formatos exportados.
- Memoria semantica pesquisavel.
- Supabase do Worion com tabelas multiusuario.
- Integracao com Vault 2 da Workestria para API keys.
- Docker Compose na VPS Hetzner.
- Cloudflare Tunnel para dominio publico.

### Fica fora do pacote inicial

- `deepworion.js`.
- Aba Projetos.
- Worion Core Evolution.
- Atualizar Projeto.
- Arquivos vivos internos do Worion Core.
- Ferramentas internas de diagnostico.
- Qualquer chave de API embutida no frontend.

Esses recursos nao devem ser apagados do projeto local. Devem ficar ocultos por feature flag, removidos do pacote publico ou isolados em branch/ambiente interno.

## Estrategia geral

O Worion publico deve nascer como um app de agentes e memoria importada, nao como centro de controle interno.

Fluxo de produto:

```text
Usuario cria conta
-> escolhe ou clona um agente nativo
-> importa conversas antigas
-> Worion normaliza e resume o material
-> chat usa memoria semantica relevante
-> usuario evolui seus agentes
```

Fluxo de infraestrutura:

```text
GitHub limpo
-> VPS Hetzner com Docker
-> worion-web / worion-api / worion-worker
-> Cloudflare Tunnel
-> Supabase Worion
-> Vault 2 Workestria para segredos
```

## Arquitetura recomendada

### Containers

```text
worion-web
- frontend publico;
- pagina de apresentacao;
- login/cadastro;
- UI de chat, agentes e importacao.

worion-api
- autenticacao de requisicoes;
- resolucao de tenant ativo;
- rotas de chat, agentes, importacao e memoria;
- acesso a Supabase Worion;
- leitura de segredos na Vault 2 Workestria.

worion-worker
- processamento de queue_jobs;
- importacao pesada;
- resumo semantico;
- chamadas a modelos;
- escrita de resultados.
```

Electron continua sendo importante para o Worion local, mas nao deve ser o runtime principal da versao multiusuario na VPS.

## Cloudflare Tunnel

O tunnel deve expor somente o servico web/API necessario.

Camada esperada:

```text
usuario
-> worion.claude / dominio definido
-> Cloudflare Tunnel
-> VPS Hetzner
-> container Worion
-> Supabase Auth + tenant
```

Recomendacao:

- usar Cloudflare Access no inicio, se necessario, para teste fechado;
- depois manter login proprio via Supabase Auth;
- nunca expor service role, tokens de modelo ou Vault no browser.

## Supabase Worion

O Supabase do Worion deve conter dados do produto.

API keys ficam fora dele, na Vault 2 da Workestria.

### Tabelas principais

```text
tenants
tenant_members
profiles
native_agents
user_agents
conversations
messages
external_conversations
external_messages
semantic_memories
memory_sources
agent_contexts
queue_jobs
model_runs
files
```

### Regra central

Toda tabela operacional deve ter `tenant_id`.

```text
tenant_id uuid not null
user_id uuid
created_at timestamptz
updated_at timestamptz
```

RLS:

- usuario so le tenants onde e membro;
- usuario so escreve no tenant ativo;
- admin do tenant gerencia membros e configuracoes;
- service role fica apenas no backend/worker.

## Agentes nativos

Criar uma lista inicial de agentes nativos com bom acabamento semantico.

Sugestao inicial:

- Cartografo Espiritual;
- Arquiteto Cognitivo;
- Engenheiro de Sistemas;
- Conselheiro Estrategico;
- Pesquisador;
- Escritor/Editor;
- Organizador de Memoria.

Comportamento:

- agente nativo pode ser usado direto;
- usuario pode clonar;
- clone vira `user_agent`;
- clone pode receber documentos, instrucoes, modelo preferido e memoria propria.

## Importacao semantica

Essa e a etapa que impede o Worion de subir cru.

### Fontes iniciais

- conversas exportadas do Claude;
- conversas exportadas do ChatGPT;
- sessoes documentadas do Worion;
- documentos de agentes;
- materiais selecionados do workspace.

### Pipeline

```text
arquivo exportado
-> parser
-> normalizacao de conversa
-> external_conversations
-> external_messages
-> resumo por conversa
-> extracao de memorias semanticas
-> semantic_memories
-> associacao opcional com agentes
```

### Camadas preservadas

Cada conversa importada deve gerar:

1. texto bruto preservado;
2. mensagens normalizadas;
3. resumo estruturado;
4. memorias semanticas pesquisaveis;
5. vinculo com agente/tema quando fizer sentido.

O chat nao deve enfiar tudo no prompt. Ele deve recuperar trechos relevantes por busca semantica/textual.

## Queue mode

Fila e obrigatoria para ambiente multiusuario.

Tabela base:

```text
queue_jobs
- id
- tenant_id
- user_id
- type
- status
- payload jsonb
- result jsonb
- error text
- created_at
- started_at
- finished_at
```

Tipos iniciais:

```text
chat_message
conversation_import
semantic_summary
agent_context_build
memory_search
```

Status:

```text
queued
running
completed
failed
cancelled
```

## APIs internas

Rotas iniciais:

```text
POST /api/auth/session
GET  /api/me
GET  /api/agents/native
POST /api/agents/clone
POST /api/agents
PATCH /api/agents/:id
GET  /api/conversations
POST /api/conversations
POST /api/chat/messages
GET  /api/jobs/:id
POST /api/jobs/:id/cancel
POST /api/import/conversations
GET  /api/memory/search
```

## Preparacao do GitHub limpo

Antes de subir:

- remover `.env`;
- remover `deepworion.js` do pacote publico;
- remover/ocultar Projetos;
- remover/ocultar Worion Core Evolution;
- remover backups, artifacts e conversas pessoais do pacote;
- manter agentes nativos selecionados;
- manter importador preparado;
- manter README publico;
- criar `.env.example` sem segredos;
- validar `npm run validate` ou validacoes equivalentes.

## Ordem de execucao da Fase 2

### Dia 1 - limpeza e recorte

- Congelar estado local funcional.
- Criar branch/area de deploy limpa.
- Ocultar Projetos.
- Excluir DeepWorion do pacote publico.
- Confirmar que chat, agentes e skills essenciais funcionam.
- Definir lista de agentes nativos.

### Dia 2 - semantica inicial

- Importar conversas do Claude.
- Importar conversas do ChatGPT, se disponiveis.
- Normalizar conversas.
- Gerar resumos.
- Gerar memorias semanticas.
- Testar recuperacao no chat.

### Dia 3 - auth e Supabase

- Criar SQL multitenant.
- Ativar Supabase Auth.
- Criar profiles, tenants e memberships.
- Aplicar RLS.
- Testar login/cadastro.

### Dia 4 - API e queue

- Criar API minima.
- Criar `queue_jobs`.
- Criar worker.
- Processar chat e importacao via fila.

### Dia 5 - deploy

- Criar Dockerfile/docker-compose.
- Subir na VPS Hetzner.
- Ligar Cloudflare Tunnel.
- Testar dominio.
- Validar logs e restart automatico.

### Dia 6 - beta fechado

- Corrigir bugs reais.
- Criar fluxo guiado de importacao.
- Ajustar apresentacao.
- Liberar para poucos testers.

## Criterios de aceite

- Usuario consegue criar conta.
- Usuario consegue fazer login.
- Usuario ve agentes nativos.
- Usuario consegue clonar/editar agente.
- Usuario consegue conversar.
- Perguntas curtas nao disparam pesquisa externa desnecessaria.
- Conversas importadas aparecem como memoria recuperavel.
- Nenhum dado de outro tenant aparece.
- Nenhuma API key aparece no frontend.
- Cloudflare Tunnel acessa a aplicacao.
- Worker processa fila sem travar UI.

## Decisao final

A Fase 2 do Worion deve ser rapida, mas nao improvisada.

O foco e subir uma versao limpa, com identidade propria, agentes nativos e memoria semantica real. O Worion nao deve chegar vazio ao usuario: ele deve carregar parte da propria historia, das conversas importadas e da linguagem construida durante a primeira fase.

