# Organização do Projeto Worion Desktop

**Data de organização:** 16/05/2026

## Estrutura de Diretórios

### 📁 Raiz (/)
Apenas arquivos essenciais:
- `README.md` - Documentação principal do projeto
- `QUICK_START.md` - Guia rápido de início
- `package.json` - Dependências do projeto
- `main.js` - Processo principal do Electron
- `index.html` - Interface principal
- `.env` - Variáveis de ambiente (não commitado)
- `.gitignore` - Arquivos ignorados pelo Git

### 📁 /docs
Documentação do projeto:
- `AGENTS.md` - Documentação sobre agentes
- `IMPLEMENTACAO_COMPLETA.md` - Detalhes de implementação
- `NOTION_SETUP.md` - Configuração do Notion
- `README_AGENTES.md` - README específico de agentes
- `RETOMAR_WORION.md` - Guia de retomada
- `WORION.md` - Documentação geral do Worion

### 📁 /docs/sessions
Logs de sessões e status:
- `SESSAO_15_05_2026.md` - Log da sessão de 15/05
- `SESSAO_16_05_2026.md` - Log da sessão de 16/05
- `WORION_STATUS.md` - Status atual do projeto
- `WORION_SYNC_CHECK_*.md` - Verificações de sincronização

### 📁 /backups
Backups de arquivos:

#### /backups/index-html
Todos os backups do index.html:
- `index.html.backup-YYYYMMDD-HHMMSS`
- `index.html.backup-codex-*`
- 30+ arquivos de backup históricos

#### /backups/other
Outros arquivos de backup:
- `*.backup-*` - Backups diversos
- Arquivos antigos mantidos para referência

### 📁 /scripts
Scripts de teste e utilitários:
- `test-integrations.js` - Testes de integração
- `validate-architecture.js` - Validação de arquitetura
- `worion-importer.js` - Importador de conversas

### 📁 /sql
Arquivos SQL:
- `supabase_worion_memory.sql` - Schema de memória do Supabase

### 📁 /workflows
Workflows e blueprints:
- Arquivos `.json` de workflows do Make/n8n

### 📁 /js
Código JavaScript do projeto:
- `app.js` - Aplicação principal
- `chat.js` - Sistema de chat
- `ui.js` - Interface do usuário
- `tools.js` - Ferramentas e tools
- `prompt.js` - Prompts do sistema
- `artifacts.js` - Gerenciamento de anexos
- E outros módulos...

### 📁 /css
Estilos:
- `style.css` - Estilos principais

### 📁 /agents
Definições de agentes:
- Arquivos `.md` de configuração de agentes

### 📁 /data
Dados do aplicativo:
- `/conversations` - Conversas salvas
- `/projects` - Projetos do usuário
- `/electron` - Dados do Electron (cache, session)
- `profile.json` - Perfil do usuário
- `config.json` - Configurações
- `models.json` - Modelos disponíveis

### 📁 /artifacts
Arquivos gerados pelo Worion:
- PDFs gerados
- Documentos criados
- Outros artefatos

## Arquivos Importantes

### Configuração
- `.env` - Chaves de API (OpenAI, Supabase, etc.)
- `package.json` - Dependências e scripts
- `main.js` - Configuração do Electron

### Documentação Essencial
- `README.md` - Leia primeiro
- `QUICK_START.md` - Início rápido
- `docs/RETOMAR_WORION.md` - Como retomar trabalho

### Logs
- `docs/sessions/SESSAO_*.md` - Logs de cada sessão
- `docs/sessions/WORION_STATUS.md` - Status atual

## Manutenção

### Backups
- Backups automáticos vão para `/backups/`
- Manter últimos 10 backups de cada tipo
- Limpar backups antigos periodicamente

### Logs
- Criar novo arquivo de sessão a cada dia
- Atualizar WORION_STATUS.md ao final de cada sessão

### Organização
- Manter raiz limpa (apenas essenciais)
- Novos documentos vão para `/docs/`
- Scripts novos vão para `/scripts/`
- Workflows vão para `/workflows/`
