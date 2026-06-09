/**
 * MÓDULO: artifacts.js
 * RESPONSABILIDADE: Upload, leitura e processamento de arquivos anexados (imagens, PDFs, DOCX, vídeos, textos)
 * DEPENDÊNCIAS: utils.js, app.js
 * EXPORTA: attachedFiles, SUPPORTED_TEXT_EXTENSIONS, triggerFileUpload, handleFileSelect, readFileAs, extractPdfText, extractDocxText, isSupportedTextFile, normalizeAttachedText, updateAttachmentsPreview, removeAttachment, renderAttachmentSummary, buildAttachmentPromptText, formatMessageForOpenAI
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: utils.js; usa require('pdf-parse') e require('mammoth')
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// UPLOAD DE ARQUIVOS E ANEXOS
// ============================================

var attachedFiles = [];

const SUPPORTED_TEXT_EXTENSIONS = [
  '.json', '.txt', '.md', '.csv', '.py', '.js', '.ts', '.tsx', '.jsx',
  '.html', '.css', '.xml', '.yaml', '.yml', '.toml', '.ini', '.env',
  '.sh', '.bat', '.sql', '.log'
];

const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
const SUPPORTED_DOC_EXTENSIONS = ['.pdf', '.docx', '.doc'];

// Drag and drop setup
function setupDragAndDrop() {
  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const highlight = (e) => {
    const dropZone = e.currentTarget;
    dropZone.classList.add('drag-over');
  };

  const unhighlight = (e) => {
    const dropZone = e.currentTarget;
    dropZone.classList.remove('drag-over');
  };

  const handleDrop = async (e) => {
    preventDefaults(e);
    unhighlight(e);

    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
      const event = { target: { files } };
      await handleFileSelect(event);
    }
  };

  // Setup drop zones
  const setupDropZone = (selector) => {
    const dropZone = document.querySelector(selector);
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
  };

  // Apply to common selectors
  setupDropZone('.home-input');
  setupDropZone('.chat-input-wrap');
  setupDropZone('body');
}

// Paste support - Proteção contra duplicação
var recentPasteSignatures = new Set();
var pasteHandlerBound = false;

function getFileSignature(file) {
  if (!file) return null;
  return `${file.name}-${file.size}-${file.type}-${file.lastModified || 0}`;
}

function getClipboardFileSignature(item, file) {
  if (!item && !file) return null;
  const name = file?.name || item?.type || 'clipboard-file';
  const size = file?.size || 0;
  const type = file?.type || item?.type || '';
  const lastModified = file?.lastModified || 0;
  return `${name}-${size}-${type}-${lastModified}`;
}

function isRecentPaste(file, item) {
  const signature = getFileSignature(file) || getClipboardFileSignature(item, file);
  if (!signature) return false;
  if (recentPasteSignatures.has(signature)) return true;
  recentPasteSignatures.add(signature);
  setTimeout(() => recentPasteSignatures.delete(signature), 1000);
  return false;
}

async function handlePaste(e) {
  if (e.__worionPasteHandled) return;
  const items = e.clipboardData?.items;
  if (!items) return;

  const fileItems = Array.from(items).filter(item => item.kind === 'file' || item.type.startsWith('image/'));
  if (!fileItems.length) return;

  e.__worionPasteHandled = true;
  e.preventDefault();
  e.stopPropagation();

  for (const item of fileItems) {
    // Handle pasted images
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob && !isRecentPaste(blob, item)) {
        const file = new File([blob], `pasted-image-${Date.now()}.png`, {
          type: blob.type,
          lastModified: blob.lastModified || Date.now()
        });
        const event = { target: { files: [file] } };
        await handleFileSelect(event);
      }
    }
    // Handle pasted files (não texto puro)
    else if (item.kind === 'file' && !item.type.startsWith('text/plain')) {
      const file = item.getAsFile();
      if (file && !isRecentPaste(file, item)) {
        const event = { target: { files: [file] } };
        await handleFileSelect(event);
      }
    }
  }

  // Para texto puro, deixar comportamento padrão do navegador
  // Só previne se realmente encontrou arquivo/imagem não-texto
}

function setupPasteHandler() {
  if (pasteHandlerBound) return;
  pasteHandlerBound = true;

  // Setup paste on text areas
  const setupPaste = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return;
    element.addEventListener('paste', handlePaste, false);
  };

  setupPaste('#home-chat-in');
  setupPaste('#chat-in');

  // Also setup on document for global paste
  document.addEventListener('paste', handlePaste, false);
}

// Initialize drag and drop when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    setupPasteHandler();
  });
} else {
  setupDragAndDrop();
  setupPasteHandler();
}

function triggerFileUpload() {
  let input = document.getElementById('file-upload-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'file-upload-input';
    input.multiple = true;
    input.style.display = 'none';
    input.onchange = handleFileSelect;
    document.body.appendChild(input);
  }
  input.removeAttribute('accept');
  input.click();
}

function readAttachedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ content: e.target.result, name: file.name });
    reader.onerror = () => reject(new Error('Nao consegui ler este arquivo.'));
    reader.readAsText(file, 'UTF-8');
  });
}

async function handleFileSelect(event) {
  const files = Array.from(event.target.files || []);

  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isPdf   = file.name.toLowerCase().endsWith('.pdf');
    const isDocx  = /\.(docx|doc)$/i.test(file.name);
    const shouldTryAsText = !isImage && !isVideo && !isPdf && !isDocx;

    const sizeLimit = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > sizeLimit) {
      alert(`Arquivo ${file.name} é muito grande (max ${isVideo ? '500MB' : '50MB'})`);
      continue;
    }

    if (shouldTryAsText) {
      try {
        const { content: raw } = await readAttachedFile(file);
        attachedFiles.push({
          id: makeId('attachment'),
          name: file.name,
          type: file.type,
          kind: 'text',
          data: null,
          text: normalizeAttachedText(file, String(raw || '')),
          size: file.size
        });
      } catch (error) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        attachedFiles.push({
          id: makeId('attachment'),
          name: file.name,
          type: file.type,
          kind: 'unsupported',
          data: null,
          text: `[Arquivo ${file.name} anexado, mas extracao automatica nao suportada para .${ext}]`,
          size: file.size,
          extractionError: error.message
        });
      }
      updateAttachmentsPreview();
      continue;
    }

    if (isImage) {
      const data = await readFileAs(file, 'dataURL');
      attachedFiles.push({ id: makeId('attachment'), name: file.name, type: file.type, kind: 'image', data, text: '', size: file.size });

    } else if (isVideo) {
      const data = await readFileAs(file, 'dataURL');
      attachedFiles.push({ id: makeId('attachment'), name: file.name, type: file.type, kind: 'video', data, text: '', size: file.size });

    } else if (isPdf) {
      const result = await extractPdfText(file);
      // Debug silenciado
      // console.log('[ARTIFACTS] PDF extraído:', file.name, 'texto length:', result.text?.length || 0, result.error ? `(erro: ${result.error})` : '');
      attachedFiles.push({
        id: makeId('attachment'),
        name: file.name,
        type: file.type,
        kind: result.error ? 'unsupported' : 'text',
        data: null,
        text: result.text,
        size: file.size,
        extractedText: result.text,
        extractionError: result.error
      });

    } else if (isDocx) {
      const result = await extractDocxText(file);
      // Debug silenciado
      // console.log('[ARTIFACTS] DOCX extraído:', file.name, 'texto length:', result.text?.length || 0, result.error ? `(erro: ${result.error})` : '');
      attachedFiles.push({
        id: makeId('attachment'),
        name: file.name,
        type: file.type,
        kind: result.error ? 'unsupported' : 'text',
        data: null,
        text: result.text,
        size: file.size,
        extractedText: result.text,
        extractionError: result.error
      });

    } else if (isSupportedTextFile(file)) {
      const raw = await readFileAs(file, 'text');
      attachedFiles.push({ id: makeId('attachment'), name: file.name, type: file.type, kind: 'text', data: null, text: normalizeAttachedText(file, String(raw || '')), size: file.size });

    } else {
      // Salvar arquivo mesmo sem extração
      const ext = file.name.split('.').pop()?.toLowerCase();
      attachedFiles.push({
        id: makeId('attachment'),
        name: file.name,
        type: file.type,
        kind: 'unsupported',
        data: null,
        text: `[Arquivo ${file.name} anexado, mas extração automática não suportada para .${ext}]`,
        size: file.size
      });
      alert(
        `Arquivo anexado: ${file.name}\n\n` +
        `A extração automática não suporta este formato.\n\n` +
        `Formatos com extração: ${SUPPORTED_IMAGE_EXTENSIONS.join(', ')}, ${SUPPORTED_DOC_EXTENSIONS.join(', ')}, ${SUPPORTED_TEXT_EXTENSIONS.slice(0, 6).join(', ')} e outros.`
      );
    }

    updateAttachmentsPreview();
  }

  event.target.value = '';
}

function readFileAs(file, mode) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    if (mode === 'dataURL') reader.readAsDataURL(file);
    else reader.readAsText(file, 'UTF-8');
  });
}

async function extractPdfText(file) {
  try {
    const pdfParse = require('pdf-parse');
    // Priorizar arrayBuffer para compatibilidade com Electron
    if (file.arrayBuffer) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const data = await pdfParse(buffer);
      return { text: data.text || '', error: data.text ? null : 'Sem texto extraível' };
    }
    // Fallback para file.path
    if (file.path) {
      const fs = require('fs');
      const buffer = fs.readFileSync(file.path);
      const data = await pdfParse(buffer);
      return { text: data.text || '', error: data.text ? null : 'Sem texto extraível' };
    }
    return { text: '', error: 'Formato não suportado' };
  } catch (e) {
    return { text: '', error: e.message };
  }
}

async function extractDocxText(file) {
  try {
    const mammoth = require('mammoth');
    // Priorizar arrayBuffer para compatibilidade com Electron
    if (file.arrayBuffer) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value || '', error: result.value ? null : 'Sem texto extraível' };
    }
    // Fallback para file.path
    if (file.path) {
      const fs = require('fs');
      const buffer = fs.readFileSync(file.path);
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value || '', error: result.value ? null : 'Sem texto extraível' };
    }
    return { text: '', error: 'Formato não suportado' };
  } catch (e) {
    return { text: '', error: e.message };
  }
}

function isSupportedTextFile(file) {
  const name = file.name.toLowerCase();
  const textMimes = [
    'application/json', 'text/plain', 'text/markdown', 'text/csv',
    'text/html', 'text/css', 'text/xml', 'application/xml'
  ];
  return textMimes.includes(file.type) || SUPPORTED_TEXT_EXTENSIONS.some(ext => name.endsWith(ext));
}

function normalizeAttachedText(file, value) {
  if (!file.name.toLowerCase().endsWith('.json')) return value;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch (e) {
    return value;
  }
}

function updateAttachmentsPreview() {
  const container = document.getElementById('attachments-preview') || document.getElementById('home-attachments-preview');
  if (!container) return;

  if (attachedFiles.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = attachedFiles.map((file, index) => {
    if (file.kind === 'image') {
      return `
        <div class="attachment-item">
          <img src="${file.data}" alt="${escapeHtml(file.name)}">
          <button class="attachment-remove" onclick="removeAttachment(${index})">x</button>
        </div>`;
    }
    if (file.kind === 'video') {
      return `
        <div class="attachment-item attachment-video">
          <video src="${file.data}" muted preload="metadata" style="max-width:120px;max-height:80px;border-radius:6px;"></video>
          <span class="attachment-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
          <button class="attachment-remove" onclick="removeAttachment(${index})">x</button>
        </div>`;
    }
    return `
      <div class="attachment-item attachment-file">
        <i class="ti ti-file-text"></i>
        <span class="attachment-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <button class="attachment-remove" onclick="removeAttachment(${index})">x</button>
      </div>`;
  }).join('');
}

function removeAttachment(index) {
  attachedFiles.splice(index, 1);
  updateAttachmentsPreview();
}

function renderAttachmentSummary(attachments = []) {
  if (!attachments.length) return '';

  const imageExts = /\.(png|jpg|jpeg|webp|gif|bmp)$/i;
  const items = attachments.map(file => {
    // Renderizar imagem inline
    if (file.kind === 'image' || imageExts.test(file.name)) {
      const imageSrc = file.data || file.path || '';
      if (!imageSrc) {
        return `<div class="attachment-fallback"><i class="ti ti-photo"></i> ${escapeHtml(file.name)}</div>`;
      }
      return `
        <div class="attachment-image-preview">
          <img src="${imageSrc}" alt="${escapeHtml(file.name)}" onerror="this.parentElement.innerHTML='<div class=\\'attachment-fallback\\'><i class=\\'ti ti-photo\\'></i> ${escapeHtml(file.name)}</div>'">
          <a href="${imageSrc}" download="${escapeHtml(file.name)}" class="attachment-download-btn" title="Download ${escapeHtml(file.name)}">
            <i class="ti ti-download"></i> ${escapeHtml(file.name)}
          </a>
        </div>`;
    }

    // Outros anexos: ícone + nome
    const iconMap = { video: 'ti-video', text: 'ti-file-text' };
    const icon = iconMap[file.kind] || 'ti-file';
    return `<span><i class="ti ${icon}"></i> ${escapeHtml(file.name)}</span>`;
  });

  return `<div class="message-attachments">${items.join('')}</div>`;
}

function buildAttachmentPromptText(attachments = []) {
  if (!attachments.length) return '';
  const parts = [];

  attachments.filter(f => f.kind === 'text' && (f.text || f.extractedText)).forEach(file => {
    const content = file.extractedText || file.text || '';
    const body = content.length > 60000
      ? `${content.slice(0, 60000)}\n\n[Conteúdo truncado em 60000 caracteres.]`
      : content;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const typeLabel = ext === 'pdf' ? 'PDF' : ext === 'docx' ? 'DOCX' : 'texto';

    parts.push(`\n\n---\n📎 Arquivo anexado: ${file.name}\nTipo: ${typeLabel}\nTamanho: ${(file.size / 1024).toFixed(1)}KB\n\n✨ Conteúdo extraído:\n${body}`);
  });

  attachments.filter(f => f.kind === 'video').forEach(file => {
    parts.push(`\n\n---\nVídeo anexado: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)\n[Conteúdo de vídeo não é analisável via API — arquivo disponível localmente.]`);
  });

  attachments.filter(f => f.kind === 'unsupported').forEach(file => {
    const errorMsg = file.extractionError ? `\nErro na extração: ${file.extractionError}` : '';
    parts.push(`\n\n---\nArquivo anexado: ${file.name}\n[Formato não suportado para extração automática]${errorMsg}`);
  });

  // Debug silenciado
  // console.log('[ARTIFACTS] buildAttachmentPromptText:', attachments.length, 'anexos,', parts.length, 'seções criadas');
  return parts.join('');
}

function formatMessageForOpenAI(message) {
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const imageFiles = attachments.filter(f => f.kind === 'image' && f.data);
  const attachmentPromptText = buildAttachmentPromptText(attachments);
  const textBlock = `${message.content || ''}${attachmentPromptText}`;

  // Debug silenciado
  // console.log('[ARTIFACTS] formatMessageForOpenAI:', {
  //   role: message.role,
  //   hasAttachments: attachments.length > 0,
  //   attachmentTypes: attachments.map(f => `${f.kind}:${f.name}`),
  //   textBlockLength: textBlock.length,
  //   hasExtractedText: attachments.some(f => f.extractedText || f.text)
  // });

  if (!imageFiles.length) {
    return { role: message.role, content: textBlock };
  }

  return {
    role: message.role,
    content: [
      { type: 'text', text: textBlock || 'Analise os anexos enviados.' },
      ...imageFiles.map(file => ({
        type: 'image_url',
        image_url: { url: file.data }
      }))
    ]
  };
}
