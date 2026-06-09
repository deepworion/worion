# Memory Cards UX Simplification — Documentação

**Data:** 01/06/2026  
**Referência visual:** Claude.ai Projects  
**Objetivo:** Remover jargão técnico e campos internos, criando interface limpa e intuitiva

---

## 🎯 Problema Central

O modal "Editar contexto" expunha campos do banco de dados que o usuário não precisa ver nem gerenciar. A interface estava carregada de terminologia técnica que pertence ao sistema, não à UX.

---

## ✅ Implementação Completa

### **Passo 1 — Modal Redesenhado**

#### **ANTES (9 campos técnicos):**
- Slug (readonly)
- Nome do contexto
- Descrição
- Regras de entrada
- Regras de exclusão
- Status
- Categoria / subcluster
- Markdown de consumo
- Regras de roteamento

#### **DEPOIS (3 campos simples):**
1. **Nome** — campo de texto
   - Slug gerado automaticamente (lowercase, hífens, sem acentos)
   - Usuário nunca vê o slug
   
2. **Sobre** — textarea curta
   - O que esse contexto guarda
   - Sem jargão de "regras de entrada/saída"
   
3. **Conteúdo** — textarea longa
   - Para colar texto ou documentação
   - Substitui "Markdown de consumo"
   - Aceita .md, .txt, .pdf, .docx (hint visual)

#### **Campos técnicos (invisíveis, gerenciados automaticamente):**
- `slug`: gerado do título via `slugifyFileName()`
- `status`: sempre `'active'` ao criar/editar
- `domain`: classificado automaticamente pelo sistema
- `inclusion_rules`: array vazio (gerenciado pelo sistema)
- `exclusion_rules`: array vazio (gerenciado pelo sistema)
- `routingRules`: array vazio (gerenciado pelo sistema)

#### **Botões do modal:**
- Salvar (não "Salvar contexto")
- Cancelar

---

### **Passo 2 — Menu ⋮ Simplificado**

#### **ANTES (4+ opções variando por tipo):**
- Prévia
- Editar
- Gerar candidato
- Usar no chat / Levar ao chat / Usar como referência

#### **DEPOIS (3 opções fixas):**
1. **Usar no chat** — injeta o contexto na próxima conversa
2. **Editar** — abre o modal redesenhado
3. **Excluir** — remove o card (com confirmação via `showConfirmModal`)

**Funcionalidade:**
- Menu unificado para todos os tipos de card (context, file, legacy)
- Fecha automaticamente ao clicar fora
- Item "Excluir" com cor danger (vermelho ao hover)

---

### **Passo 3 — Cards Visuais Limpos**

#### **ANTES:**
- Dot indicator (topo esquerdo)
- Botão de estrela (topo direito)
- **Ícone de baralho central (64px)** ← removido
- Título (2 linhas)
- Descrição (3 linhas)
- Footer: categoria + dot + data | score bars

#### **DEPOIS:**
- Título em negrito (2 linhas, ellipsis)
- Descrição truncada (1 linha, ellipsis)
- Data no rodapé
- Menu ⋮ sempre visível no canto inferior direito

**Removidos:**
- Ícone central de baralho (ocupava espaço sem informação)
- Pontuação/score bars (gerenciado pelo sistema)
- Categoria/dot indicator (classificação automática)
- Botão de estrela (feature não utilizada)

---

### **Passo 4 — Lógica do Backend Preservada**

**Campos continuam existindo no Supabase:**
- `memory_contexts`: todas as colunas mantidas
- `memory_cards_v2`: schema intacto

**Geração automática de slug:**
```javascript
const slug = title
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')           // Remove acentos
  .replace(/[^a-z0-9\s-]/g, '')    // Remove especiais
  .replace(/\s+/g, '-')            // Espaços → hífens
  .replace(/-+/g, '-')             // Remove duplicados
  .replace(/^-|-$/g, '');          // Trim hífens
```

**Função de exclusão com confirmação:**
```javascript
async function deleteMemoryCard(cardId, contextSlug) {
  const confirmed = await window.showConfirmModal({
    title: 'Excluir contexto',
    message: 'Tem certeza? Esta ação não pode ser desfeita.',
    confirmText: 'Excluir',
    cancelText: 'Cancelar'
  });
  if (!confirmed) return;
  // Chamada à API...
}
```

---

## 📐 Estilos CSS Adicionados

### **Modal simplificado:**
```css
.memory-context-modal-simple { max-width: 560px !important; }
.memory-modal-body-simple { gap: 20px; padding: 24px !important; }
.memory-input { /* campo de texto padrão */ }
.memory-textarea { /* textarea com resize vertical */ }
.memory-textarea-short { min-height: 80px; max-height: 120px; }
.memory-textarea-tall { min-height: 180px; max-height: 400px; }
.memory-upload-hint { /* hint com ícone info */ }
```

### **Cards simplificados:**
```css
.memory-card-content { /* substituiu body + footer */ }
.memory-card-title { /* 2 linhas, ellipsis */ }
.memory-card-desc { /* 1 linha, ellipsis */ }
.memory-card-date { /* data no rodapé */ }
.menu-item-danger:hover { background: #1a0a0a; color: #ff6b6b; }
```

---

## ✅ Critérios de Aceite

- [x] Modal de edição tem exatamente 3 campos visíveis: Nome, Sobre, Conteúdo
- [x] Slug gerado automaticamente (usuário nunca vê)
- [x] Campos técnicos invisíveis mas funcionais no banco
- [x] Menu ⋮ abre com 3 opções funcionais
- [x] Exclusão solicita confirmação
- [x] Cards têm altura fixa, texto não quebra layout
- [x] Ícone central removido
- [x] Nenhum campo técnico visível para o usuário

---

## 📦 Arquivos Modificados

### **js/ui.js**
- `openMemoryContextEditor()` — modal redesenhado
- `saveMemoryContextFromModal()` — geração automática de slug
- `renderMemoryItemActions()` — menu simplificado
- `renderMemoryCardsList()` — cards limpos
- `deleteMemoryCard()` — nova função com confirmação
- Exportações: `window.deleteMemoryCard`

### **css/style.css**
- Estilos do modal simplificado
- Estilos dos cards limpos
- Estilo danger para opção de excluir

---

## 🧪 Validações

```bash
✓ node --check js/ui.js
✓ npm run validate
✓ npm start → [Worion API] health ok | [Agents] 8 carregados
```

---

## 🎨 Filosofia de Design

**Princípio:** "Simples como Claude.ai Projects"

- ❌ **NÃO expor:** slugs, status, categories, rules, routing
- ✅ **SIM mostrar:** nome, descrição, conteúdo
- ❌ **NÃO usar:** jargão técnico, campos de banco
- ✅ **SIM usar:** linguagem natural, ações claras

**Resultado:** Interface que qualquer usuário entende, sem precisar conhecer a arquitetura interna do Memory System.

---

## 📊 Commits

1. `55c36ad` — feat(memory-cards): redesign UX with dropdown menus and contexts sidebar
2. `b940aa4` — feat(memory-cards): simplify UX to match Claude.ai Projects design

**Total de linhas:** +143, -90  
**Arquivos:** `js/ui.js`, `css/style.css`

---

**Status:** ✅ Completo e testado  
**Próximo passo:** Testar com usuário real e coletar feedback
