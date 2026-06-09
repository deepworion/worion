# Melhorias de UX - Upload e Navegação Externa

**Data:** 16/05/2026  
**Versão:** 1.1.0  
**Status:** ✅ Concluído e testado

---

## Problemas Resolvidos

### 1. Upload disponível na tela inicial ✅
**Problema:** O botão de upload/clipe só aparecia após iniciar uma conversa.

**Solução:**
- Adicionado botão de clipe na tela inicial (`home-input-container`)
- Preview de anexos funciona antes de iniciar conversa
- Usuário pode anexar arquivos e enviar primeira mensagem já com artifacts

**Arquivos modificados:**
- `js/ui.js` - adicionado botão e container na home view
- `js/artifacts.js` - `updateAttachmentsPreview()` agora suporta ambos IDs
- `css/style.css` - estilos para `home-input-container`

**Commit:** `ff6cf0b - fix: adiciona upload na tela inicial`

---

### 2. Drag and drop de arquivos ✅
**Problema:** Não era possível arrastar e soltar arquivos no Worion.

**Solução:**
- Implementado drag and drop em toda área de input
- Suporte para múltiplos arquivos simultâneos
- Feedback visual com classe `.drag-over`
- Funciona na tela inicial e durante conversas

**Eventos implementados:**
- `dragover`, `dragenter`, `dragleave`, `drop`

**Arquivos modificados:**
- `js/artifacts.js` - função `setupDragAndDrop()`
- `js/ui.js` - chamadas após renderização de views
- `css/style.css` - estilo `.drag-over`

**Commit:** `a84d62e - fix: adiciona drag and drop de arquivos`

---

### 3. Colar imagem/arquivo no input ✅
**Problema:** Não era possível colar imagens ou arquivos diretamente.

**Solução:**
- Suporte a colar imagens copiadas
- Suporte a colar arquivos do clipboard
- Preserva comportamento de colar texto
- Funciona em tela inicial e conversas

**Arquivos modificados:**
- `js/artifacts.js` - função `handlePaste()` e `setupPasteHandler()`
- `js/ui.js` - chamada de `setupPasteHandler()` nas views

**Commit:** `47fe9fe - fix: adiciona suporte a colar arquivos no input`

---

### 4. Links externos abrem no navegador padrão ✅
**Problema:** Links navegavam dentro do Electron, substituindo o chat. Usuário perdia a tela e precisava reiniciar pelo PowerShell.

**Solução:**
- `shell.openExternal()` para todos os links `http://` e `https://`
- `webContents.setWindowOpenHandler` bloqueia abertura interna
- `will-navigate` previne navegação acidental
- Links renderizados em markdown com `target="_blank" rel="noopener noreferrer"`
- Worion permanece aberto quando usuário clica em link externo

**Arquivos modificados:**
- `main.js` - handlers Electron para navegação externa
- `js/ui.js` - `renderMarkdown()` configurado para external links

**Commit:** `0d4b202 - fix: abre links externos no navegador padrão`

---

### 5. Suporte a PDF e DOCX ✅
**Problema:** Upload não processava corretamente PDF, DOCX e outros formatos.

**Solução:**
- **PDF:** extração de texto via `pdf-parse`
- **DOCX:** extração de texto via `mammoth`
- Suporte a `file.path` (Electron) e `file.arrayBuffer()` (web)
- Fallback gracioso com mensagem descritiva em caso de erro

**Dependências (já instaladas):**
- `pdf-parse@2.4.5`
- `mammoth@1.12.0`

**Formatos suportados:**
- Imagens: PNG, JPG, JPEG, WEBP, GIF, BMP
- Documentos: PDF, DOCX, DOC
- Texto: TXT, MD, JSON, CSV e outros

**Arquivos modificados:**
- `js/artifacts.js` - funções `extractPdfText()` e `extractDocxText()`

**Commit:** `79aaedb - feat: adiciona suporte a pdf e docx nos artifacts`

---

### 6. Melhor tratamento de formatos não suportados ✅
**Problema:** Mensagem de erro confusa: "Formato nao suportado ainda: arquivo.xyz. Use imagem, .json ou .txt."

**Solução:**
- Arquivos não suportados são salvos como `kind: 'unsupported'`
- App não trava - arquivo fica anexado
- Mensagem clara lista formatos com extração automática
- Usuário pode anexar qualquer arquivo mesmo sem extração

**Nova mensagem:**
```
Arquivo anexado: [nome.xyz]

A extração automática não suporta este formato.

Formatos com extração: .png, .jpg, .webp, .pdf, .docx, .txt, .md, .json, .csv e outros.
```

**Arquivos modificados:**
- `js/artifacts.js` - tratamento de fallback para formato desconhecido

**Commit:** `3d1f7c2 - fix: melhora tratamento de formatos não suportados`

---

## Validação Final

### Checklist ✅

- [x] Upload na tela inicial
- [x] Upload em conversa existente
- [x] Drag and drop de PNG
- [x] Drag and drop de PDF
- [x] Paste de imagem copiada
- [x] PDF resumido corretamente
- [x] DOCX resumido corretamente
- [x] Link externo abre no navegador padrão
- [x] Worion permanece no chat após clique em link
- [x] Console sem erros críticos
- [x] Formato não suportado não trava app

---

## Commits

```
ff6cf0b - fix: adiciona upload na tela inicial
a84d62e - fix: adiciona drag and drop de arquivos
47fe9fe - fix: adiciona suporte a colar arquivos no input
0d4b202 - fix: abre links externos no navegador padrão
79aaedb - feat: adiciona suporte a pdf e docx nos artifacts
3d1f7c2 - fix: melhora tratamento de formatos não suportados
```

**Total:** 6 correções implementadas e testadas

---

## Documentação Técnica

### Funções Adicionadas

**artifacts.js:**
- `setupDragAndDrop()` - configura drag & drop em elementos
- `setupPasteHandler()` - configura paste de imagens/arquivos
- `handlePaste(e)` - processa evento paste
- `extractPdfText(file)` - extrai texto de PDF
- `extractDocxText(file)` - extrai texto de DOCX

**ui.js:**
- Chamadas de setup em `showHomeView()` e `renderChatPanel()`
- `renderMarkdown()` atualizado com renderer customizado

**main.js:**
- `setWindowOpenHandler` - controla abertura de janelas
- `will-navigate` handler - previne navegação interna
- `new-window` handler - força external browser

### Constantes Adicionadas

```javascript
SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']
SUPPORTED_DOC_EXTENSIONS = ['.pdf', '.docx', '.doc']
SUPPORTED_TEXT_EXTENSIONS = ['.json', '.txt', '.md', '.csv', ...]
```

---

## Impacto na UX

**Antes:**
- ❌ Upload só após iniciar conversa
- ❌ Sem drag & drop
- ❌ Sem paste
- ❌ Links quebravam o app
- ❌ PDF/DOCX não funcionavam
- ❌ Formatos não suportados travavam

**Depois:**
- ✅ Upload disponível antes de iniciar conversa
- ✅ Arrastar e soltar arquivos
- ✅ Colar imagens e arquivos
- ✅ Links abrem no navegador externo
- ✅ PDF e DOCX com extração de texto
- ✅ Qualquer formato pode ser anexado

---

## Próximos Passos Sugeridos

1. Implementar preview de PDF dentro do chat
2. Adicionar suporte a planilhas (XLSX) via biblioteca dedicada
3. Implementar compressão de imagens grandes antes do upload
4. Adicionar indicador de progresso para arquivos grandes
5. Implementar cache de textos extraídos de PDF/DOCX

---

**Documentação criada em:** 16/05/2026  
**Autor:** Claude Code + Glaydson Boaventura  
**Versão Worion:** 1.1.0
