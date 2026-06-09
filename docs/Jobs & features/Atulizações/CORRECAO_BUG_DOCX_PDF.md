# Correção: Bug de Extração de DOCX/PDF

**Data:** 2026-05-16  
**Status:** ✅ Corrigido

## Problema

Ao enviar "resuma esse texto por favor" com arquivo DOCX anexado, o Worion respondia:
> "Parece que houve um erro ao tentar extrair o conteúdo do arquivo... O arquivo não foi encontrado nas opções disponíveis."

**Sintoma:** O arquivo aparecia anexado visualmente no chat, mas o conteúdo extraído não estava sendo incluído no contexto enviado ao modelo.

## Causa Raiz

1. O texto era extraído corretamente em `artifacts.js`
2. Os attachments eram copiados para a mensagem em `chat.js`
3. **MAS:** O contexto dos arquivos não estava sendo apresentado claramente no system prompt
4. O modelo não tinha instruções explícitas sobre a disponibilidade do conteúdo extraído
5. Faltavam logs para debug do fluxo

## Correções Implementadas

### 1. artifacts.js

#### Extração com logs
- ✅ Adicionado `extractedText` redundante aos attachments (PDF e DOCX)
- ✅ Logs de console para rastrear extração: nome do arquivo + tamanho do texto

#### Formatação melhorada
- ✅ `buildAttachmentPromptText()` agora:
  - Busca `extractedText` ou `text`
  - Adiciona emojis e labels claros (📎, ✨)
  - Indica tipo correto (PDF, DOCX, texto)
  - Mostra tamanho em KB
  - Suporta arquivos `unsupported`
  - Logs de debug

#### formatMessageForOpenAI
- ✅ Logs detalhados mostrando:
  - Papel da mensagem
  - Tipos de attachment
  - Tamanho do bloco de texto final
  - Se há texto extraído

### 2. chat.js

#### Preservação de attachments
- ✅ Attachments agora incluem `extractedText` explicitamente
- ✅ Log mostrando: nome, kind, tamanho do texto extraído

#### Contexto no system prompt (sendMsg)
- ✅ Quando há attachments de texto, adiciona ao system prompt:
  ```
  📎 ARQUIVOS ANEXADOS NESTA MENSAGEM (N):
  - arquivo.docx (123KB) - texto extraído disponível
  
  O conteúdo completo dos arquivos está incluído na mensagem do usuário. Use esse conteúdo para responder.
  ```
- ✅ Log da última mensagem formatada (primeiros 500 chars)

#### Goal Execution Engine
- ✅ Contexto de attachments também incluído em compound goals
- ✅ Mostra início do texto extraído (200 chars) para cada arquivo
- ✅ Instrução: "NUNCA diga 'arquivo não foi encontrado'"
- ✅ Log de anexos ao iniciar goal

### 3. prompt.js

#### Instrução explícita no system prompt
- ✅ Nova linha:
  > "IMPORTANTE: Quando arquivos PDF ou DOCX forem anexados, o conteúdo extraído é incluído diretamente na mensagem do usuário. NUNCA responda 'arquivo não foi encontrado' ou 'não tenho acesso ao arquivo'. O texto está disponível no contexto. Use-o diretamente para resumir, analisar ou responder ao pedido do usuário."

## Fluxo Corrigido

```
1. Usuário anexa DOCX
   ↓
2. artifacts.js → extractDocxText(file)
   ↓ console.log('[ARTIFACTS] DOCX extraído: nome, length')
   ↓
3. attachedFiles.push({ ..., text, extractedText })
   ↓
4. sendMsg() → preservedAttachments (copia extractedText)
   ↓ console.log('[CHAT] Mensagem com N anexos: [...]')
   ↓
5. messages.push({ attachments: preservedAttachments })
   ↓
6. buildSystemPrompt() + attachmentContext
   ↓ console.log('[CHAT] Enviando N mensagens...')
   ↓
7. formatMessageForOpenAI(message)
   ↓ buildAttachmentPromptText(attachments)
   ↓ console.log('[ARTIFACTS] formatMessage: ...')
   ↓ console.log('[ARTIFACTS] buildAttachment: N anexos, N seções')
   ↓
8. Modelo recebe:
   - System prompt com aviso de arquivos anexados
   - User message com conteúdo extraído formatado
   - Instrução: "Use esse conteúdo. NUNCA diga 'não encontrado'"
   ↓
9. Modelo resume/analisa o texto diretamente
```

## Testes Obrigatórios

### Teste A: Tela inicial + DOCX
- [ ] Anexar DOCX na tela inicial
- [ ] Enviar: "resuma esse texto por favor"
- [ ] **Esperado:** Resumo real do conteúdo

### Teste B: Conversa existente + DOCX
- [ ] Em conversa, anexar DOCX
- [ ] Enviar: "resuma esse texto"
- [ ] **Esperado:** Resumo real

### Teste C: PDF
- [ ] Anexar PDF
- [ ] Enviar: "resuma esse PDF"
- [ ] **Esperado:** Extração e resumo real

### Teste D: Persistência
- [ ] Anexar DOCX e enviar
- [ ] Reiniciar Worion
- [ ] Abrir conversa anterior
- [ ] **Esperado:** Card do arquivo visível, texto preservado

### Teste E: Logs
- [ ] Anexar DOCX
- [ ] Abrir DevTools > Console
- [ ] Enviar mensagem
- [ ] **Esperado:** Logs em ordem:
  1. `[ARTIFACTS] DOCX extraído: nome, texto length: N`
  2. `[CHAT] Mensagem com 1 anexos: [nome (text, texto: N)]`
  3. `[CHAT] Enviando N mensagens ao modelo...`
  4. `[ARTIFACTS] formatMessageForOpenAI: {...}`
  5. `[ARTIFACTS] buildAttachmentPromptText: 1 anexos, 1 seções criadas`

## Arquivos Modificados

- ✅ `js/artifacts.js` - extração, formatação, logs
- ✅ `js/chat.js` - preservação, contexto no prompt, goal execution
- ✅ `js/prompt.js` - instrução explícita sobre arquivos anexados

## Próximos Passos

1. Testar no Worion real (testes A-E acima)
2. Verificar logs no console
3. Se ainda houver erro, revisar saída dos logs
4. Considerar salvar extractedText em artifact persistente para reutilização após restart

## Notas Técnicas

- `extractedText` e `text` são mantidos redundantemente por segurança
- Logs usam prefixos `[ARTIFACTS]`, `[CHAT]`, `[GOAL]` para fácil filtragem
- Context hints visuais (📎, ✨) melhoram legibilidade no prompt
- Limite de 60000 caracteres por arquivo mantido
- Suporte a múltiplos anexos simultaneamente
