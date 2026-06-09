# Teste de Verificação: Correção DOCX/PDF

## Problema Reportado
Após fechar/reabrir, ainda recebe: "O arquivo não foi encontrado nas opções disponíveis."

## Diagnóstico

O código foi corrigido, mas o Worion está usando **código JavaScript em cache**.  
Fechar e reabrir a janela **NÃO recarrega o código**.

## Solução: Hard Reload

### Opção 1: Recarregar no Electron
1. Com o Worion aberto, pressione: **`Ctrl + R`** ou **`F5`**
2. Ou: **`Ctrl + Shift + R`** (hard reload, limpa cache)

### Opção 2: DevTools
1. Abra DevTools: **`Ctrl + Shift + I`** ou **`F12`**
2. Clique com botão direito no ícone de reload
3. Selecione: **"Empty Cache and Hard Reload"**

### Opção 3: Reiniciar o processo
1. Feche o Worion completamente
2. No terminal: `npm start` (ou reabra o app)

## Teste após Reload

### 1. Verificar se código novo está carregado

Abra DevTools Console (`F12`) e rode:

```javascript
// Verificar se função tem os novos logs
console.log(buildAttachmentPromptText.toString().includes('console.log'));
// Deve retornar: true

// Verificar se extractDocxText tem logs
console.log(extractDocxText.toString().includes('console.log'));
// Deve retornar: true
```

### 2. Anexar DOCX e observar logs

1. Abra DevTools Console (`F12`)
2. Anexe um arquivo DOCX
3. **Logs esperados:**
   ```
   [ARTIFACTS] DOCX extraído: nome.docx, texto length: 1234
   ```

4. Envie: "resuma esse texto"
5. **Logs esperados:**
   ```
   [CHAT] Mensagem com 1 anexos: [nome.docx (text, texto: 1234)]
   [CHAT] Enviando 3 mensagens ao modelo...
   [ARTIFACTS] formatMessageForOpenAI: {...}
   [ARTIFACTS] buildAttachmentPromptText: 1 anexos, 1 seções criadas
   ```

### 3. Se NÃO aparecerem os logs

O código ainda não foi recarregado. Tente:
```javascript
// Forçar reload completo
location.reload(true);
```

Ou feche e inicie: `npm start` no terminal

## Teste Manual Rápido

Rode no DevTools Console:

```javascript
// Simular anexo DOCX
const testAttachment = {
  name: 'teste.docx',
  kind: 'text',
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  size: 12345,
  extractedText: 'Este é um texto de teste extraído do DOCX.',
  text: 'Este é um texto de teste extraído do DOCX.'
};

// Testar formatação
const formatted = buildAttachmentPromptText([testAttachment]);
console.log('Formatted:', formatted);

// Deve mostrar:
// 📎 Arquivo anexado: teste.docx
// Tipo: DOCX
// ✨ Conteúdo extraído:
// Este é um texto de teste...
```

## Se continuar com erro após reload

Então o problema é na extração. Rode:

```javascript
// Verificar se mammoth está disponível
const mammoth = require('mammoth');
console.log('Mammoth disponível:', !!mammoth);
// Deve retornar: true

const pdfParse = require('pdf-parse');
console.log('PDF-Parse disponível:', !!pdfParse);
// Deve retornar: true
```

Se retornar `false`, instale:
```bash
npm install mammoth pdf-parse
```

## Checklist Completo

- [ ] 1. Hard reload (`Ctrl + Shift + R`)
- [ ] 2. Verificar código novo carregado (console.log no código)
- [ ] 3. Abrir DevTools Console antes de anexar
- [ ] 4. Anexar DOCX
- [ ] 5. Ver log: `[ARTIFACTS] DOCX extraído: ...`
- [ ] 6. Enviar: "resuma esse texto"
- [ ] 7. Ver logs de [CHAT] e [ARTIFACTS]
- [ ] 8. Ver resposta com resumo real (não erro)

## Debugging Adicional

Se após TUDO isso ainda der erro, capture e envie:

```javascript
// 1. Último attachment
console.log('Last attachment:', attachedFiles[attachedFiles.length - 1]);

// 2. Última mensagem
console.log('Last message:', messages[messages.length - 1]);

// 3. Verificar se texto está presente
const lastMsg = messages[messages.length - 2]; // user message antes da resposta
console.log('User message attachments:', lastMsg?.attachments);
console.log('Has extractedText?', lastMsg?.attachments?.[0]?.extractedText?.length);
```
