# UI Modules

Módulos extraídos de `ui.js` para melhorar manutenibilidade e organização.

## Estrutura

```
ui/
├── core/              # Componentes fundamentais
│   ├── markdown-renderer.js
│   ├── message-renderer.js
│   ├── modal-manager.js
│   └── view-manager.js
├── chat/              # Componentes de chat
│   ├── chat-panel.js
│   ├── composer.js
│   ├── execution-status.js
│   └── typing-animation.js
├── context-memory/    # Context Memory Panel
│   ├── context-memory-panel.js
│   ├── context-aggregation.js
│   ├── context-extraction.js
│   └── context-selection.js
├── memory-cards/      # Memory Cards UX V2
│   ├── memory-cards-view.js
│   ├── memory-cards-grid.js
│   ├── memory-card-editor.js
│   ├── memory-context-editor.js
│   ├── memory-import.js
│   └── memory-inspector.js
├── agents/            # Gerenciamento de agentes
│   ├── agents-view.js
│   ├── agent-editor.js
│   ├── agent-cards.js
│   └── agent-documents.js
├── skills/            # Gerenciamento de skills
│   ├── skills-view.js
│   ├── skill-editor.js
│   ├── skill-cards.js
│   └── skill-documents.js
├── sidebar/           # Componentes de sidebar
│   ├── sidebar-conversations.js
│   ├── sidebar-skills.js
│   └── sidebar-projects.js
├── search/            # Sistema de busca
│   ├── search-overlay.js
│   └── search-engine.js
├── text-selection/    # Sistema "Ask Selection"
│   ├── ask-selection.js
│   └── selection-popover.js
└── utils/             # Utilitários
    ├── ui-helpers.js
    ├── ui-formatters.js
    └── ui-validators.js
```

## Status da Refatoração

### ✅ Concluído
- [x] Fase 1: Fundações (utils + markdown)
- [x] Fase 2: Apresentação Base (message-renderer, modal, typing, execution-status)

### 🔄 Em Progresso
- [ ] Fase 3: Componentes de Chat
- [ ] Fase 4: Sidebar e Navegação
- [ ] Fase 5: Views Principais
- [ ] Fase 6: Context Memory
- [ ] Fase 7: Memory Cards UX V2
- [ ] Fase 8: Consolidação do ui.js

## Convenções

### Imports/Exports
- Usar ES6 modules (`import`/`export`)
- Imports no topo do arquivo
- Exports nomeados (não default)

### Naming
- Funções públicas: camelCase descritivo
- Funções privadas: prefixo `_` ou não exportar
- Constantes: UPPER_SNAKE_CASE

### Documentação
- JSDoc em todas as funções públicas
- Comentários de seção com `// ============================================`
- Header de módulo com `@module`, `@description`, `@dependencies`, `@exports`

## Backup

Backup do arquivo original em:
`C:\Worion Sessions\backups\ui-refactor-20260529-163753\ui.js.backup`
