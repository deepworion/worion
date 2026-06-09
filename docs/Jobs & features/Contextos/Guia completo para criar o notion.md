# Briefing: Organização da Base de Conhecimento do Worion no Notion

## Objetivo Geral

Transformar o Notion na **fonte única da verdade** sobre todo o ecossistema Worion (Desktop, Core Evolution, Workestria, Luppet).  
A base deve servir tanto para consulta humana rápida quanto para ser acessada programaticamente pelo próprio Worion (via ferramentas `notion_search_pages`, `notion_read_page`).  
Ela precisa estar limpa, profissional, navegável e integrada com o fluxo de desenvolvimento no GitHub.

## 1. Contexto que você precisa saber

### O que é o Worion

- **Worion Desktop:** aplicativo Electron local que funciona como um orquestrador de conhecimento pessoal com IA.
- **Worion Core Evolution:** projeto interno que documenta a evolução do código, decisões arquiteturais e changelog.
- **Workestria:** projeto irmão (automações, SaaS, pipelines).
- **Luppet:** outro projeto relacionado.
- **DeepWorion:** CLI do Worion para terminal.
- **Agentes:** Cartógrafo de Padrões, Diário Reflexivo, Arquiteto de Sistemas, etc. Cada um tem um documento `.md` de definição.
- **Cognitive Skills:** sistema de habilidades internas que moldam o comportamento do Worion.
- **Context Memory:** painel de memória contextual, sincronizado com tabelas no Supabase.

### Glossário rápido

| Termo | Significado |
|-------|-------------|
| `Worion HQ` / `Workestria HQ` | Páginas principais no Notion que centralizam cada projeto |
| `Sessões de Desenvolvimento` | Registros cronológicos de conversas e decisões técnicas |
| `WORION_VOICE.md` | Documento que define a voz e a identidade do Worion |
| `prompt.js` | Arquivo central de construção do system prompt |
| `chat.js` | Módulo principal de chat e roteamento |
| `tools.js` | Registro e execução de ferramentas |
| `connectors.js` | Conexão com APIs externas (DeepSeek, OpenAI, Claude) |
| `cognitive-skills.js` | Engine de habilidades cognitivas |
| `contextGuardian.js` | Guardião de memória interna |
| `architecture.json` | Documento que mapeia todos os módulos e dependências |
| `deepworion.js` | CLI do Worion |
| `data/config.json` | Configurações globais |
| `data/models.json` | Catálogo de modelos de IA |
| `Supabase` | Backend como serviço usado para memória, vault, etc. |

## 2. Arquitetura-alvo da base no Notion

### Estrutura de páginas (visão geral)

🏠 Worion HQ (página principal)
├── 📖 Wiki Worion (base de dados wiki)
│ ├── 🧠 Worion Core Evolution
│ ├── 🤖 Agentes
│ │ ├── Cartógrafo de Padrões
│ │ ├── Diário Reflexivo
│ │ └── ...
│ ├── ⚙️ Módulos Técnicos
│ │ ├── prompt.js
│ │ ├── chat.js
│ │ ├── tools.js
│ │ └── ...
│ ├── 🔧 Ferramentas e Conectores
│ ├── 🎨 UI/UX (Piano Black)
│ ├── 🗄️ Supabase & Banco de Dados
│ └── 🚀 Deploy e Infraestrutura
├── 📝 Sessões de Desenvolvimento (base de dados separada)
│ ├── 2026-05-26: Implementação de Chat Messages na API Local
│ ├── 2026-05-27: Patch 2 — Interceptação de Introspecção
│ └── ...
├── 📋 FAQs (base de dados separada)
├── 🔗 Links Úteis (GitHub, Cloudflare, Supabase)
└── 📊 Dashboard (métricas, status, próximas ações)

text

### Propriedades obrigatórias para a base Wiki

Cada entrada na base de dados Wiki deve ter:

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `Name` | Título | Nome da página |
| `Tags` | Multi-seleção | `#worion`, `#workestria`, `#memoria`, `#pesquisa`, `#dev`, `#agente`, `#ui`, `#deploy` |
| `Status` | Seleção | `Rascunho`, `Revisado`, `Obsoleto` |
| `Última verificação` | Data | Quando o conteúdo foi checado pela última vez |
| `Responsável` | Pessoa | Quem mantém essa página |
| `Relacionado a` | Relação | Link para outras páginas do wiki |

## 3. Regras de organização

1.  **Cada projeto tem sua casa.**
    - Tudo sobre o Worion Desktop fica sob `Worion HQ`.
    - Tudo sobre Workestria fica sob `Workestria HQ`.
    - Se um documento serve aos dois, ele pode ser linkado de ambos os lugares, mas só existe uma cópia.

2.  **Sessões são registros cronológicos.**
    - Cada sessão de desenvolvimento vira uma página na base `Sessões de Desenvolvimento`.
    - O título segue o padrão: `YYYY-MM-DD: Breve descrição`.
    - Propriedades: `Data`, `Projeto` (Worion, Workestria), `Tags`, `Participantes`.

3.  **O GitHub é a verdade do código. O Notion é a explicação.**
    - O Notion **não** armazena código fonte (isso é GitHub).
    - O Notion explica **o que o código faz**, **por que foi feito** e **como usá-lo**.
    - Links para arquivos no GitHub são bem-vindos (ex: `[prompt.js](https://github.com/leedermix-arch/worion-desktop/blob/main/js/prompt.js)`).

4.  **Arquivos anexados com moderação.**
    - PDFs, imagens e `.md` importantes podem ser anexados diretamente no Notion.
    - Mas o "original" deve continuar versionado no GitHub.

5.  **A IA do Worion deve conseguir navegar.**
    - Títulos de página devem ser descritivos.
    - Use `callouts` e `toggle blocks` para organizar informações longas, mas evite aninhamento excessivo que confunda o modelo.

## 4. Integração com GitHub

- Para cada módulo importante (`prompt.js`, `chat.js`, etc.), crie uma página no Wiki que contenha:
  - Link para o arquivo no GitHub.
  - Descrição da responsabilidade do módulo.
  - Dependências.
  - Histórico de alterações recentes (resumo dos commits).
- Use a integração nativa do Notion com GitHub para visualizar commits e PRs diretamente nas páginas.
- O `architecture.json` deve ter uma página-espelho no Notion, sempre atualizada.

## 5. Plano de ação para você (agente)

1.  **Faça um inventário inicial.**
    - Liste todas as páginas que já existem no Notion.
    - Classifique cada uma como: `Manter`, `Atualizar`, `Mover`, `Arquivar`.
2.  **Crie a estrutura base.**
    - Monte a página principal `Worion HQ` e as subpáginas conforme a arquitetura-alvo.
3.  **Transforme a lista de páginas em um Wiki.**
    - Use a função "Transformar em Wiki" do Notion para criar a base de dados wiki.
    - Adicione as propriedades obrigatórias.
4.  **Migre as Sessões de Desenvolvimento.**
    - Crie a base de dados separada para sessões.
    - Mova as sessões existentes para lá, padronizando os títulos e propriedades.
5.  **Conecte com o GitHub.**
    - Para cada módulo principal, crie a página wiki e adicione o link para o arquivo correspondente.
6.  **Popule as FAQs.**
    - Com base nas conversas importadas (Claude, GPT, DeepSeek), identifique perguntas frequentes e crie a base de FAQs.
7.  **Valide com o usuário.**
    - Apresente a estrutura final e peça feedback antes de arquivar páginas antigas.

## 6. O que pedir ao usuário se precisar

- "Me mande o link do repositório GitHub do Worion."
- "Quais são os 5 módulos mais importantes que precisam de documentação detalhada?"
- "Existe alguma página que você quer que eu **não** altere de jeito nenhum?"
- "Você prefere que as sessões de desenvolvimento fiquem em uma base de dados separada ou dentro do wiki principal?"
- "Quer que eu crie uma página de onboarding para novos testadores?"

Siga este plano e você transformará o Notion no centro de comando que o Worion merece.

