/**
 * @module ui/core/message-renderer
 * @description Renderização de mensagens do chat
 * @dependencies markdown-renderer, utils (escapeHtml, formatDateTime)
 * @exports renderMessageHtml, prepareAssistantDisplayMarkdown, renderAssistantTypingContent, renderAttachmentSummary
 */

import { renderMarkdown, repairLooseMarkdownMarkers, balancePartialMarkdown } from './markdown-renderer.js';

// ============================================
// PREPARAÇÃO DE CONTEÚDO
// ============================================

/**
 * Limpa resposta do agente removendo artefatos
 * @param {string} text - Texto da resposta
 * @returns {string} Texto limpo
 */
function cleanAgentResponse(text) {
  // Nota: cleanAgentResponse deve estar disponível globalmente ou ser movido para cá
  return window.cleanAgentResponse ? window.cleanAgentResponse(text) : text;
}

/**
 * Prepara markdown do assistente para exibição
 * @param {string} text - Texto para preparar
 * @returns {string} Texto preparado
 */
export function prepareAssistantDisplayMarkdown(text) {
  return repairLooseMarkdownMarkers(cleanAgentResponse(text));
}

/**
 * Renderiza conteúdo de digitação do assistente
 * @param {string} text - Texto parcial
 * @returns {string} HTML com cursor de digitação
 */
export function renderAssistantTypingContent(text) {
  const prepared = repairLooseMarkdownMarkers(String(text || ''));
  return `${renderMarkdown(balancePartialMarkdown(prepared))}<span class="typing-cursor">&#10022;</span>`;
}

// ============================================
// RENDERIZAÇÃO DE ANEXOS
// ============================================

/**
 * Renderiza resumo de anexos de uma mensagem
 * @param {Array} attachments - Lista de anexos
 * @returns {string} HTML dos anexos
 */
export function renderAttachmentSummary(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return '';

  const escapeHtml = window.escapeHtml || (s => s);
  const imageExts = /\.(png|jpg|jpeg|webp|gif|bmp)$/i;
  const items = attachments.map(att => {
    const name = att.name || att.fileName || 'arquivo';
    if ((att.kind === 'image' || imageExts.test(name)) && att.data) {
      return `
        <div class="attachment-image-preview">
          <img src="${att.data}" alt="${escapeHtml(name)}">
          <a href="${att.data}" download="${escapeHtml(name)}" class="attachment-download-btn" title="Download ${escapeHtml(name)}">
            <i class="ti ti-download"></i> ${escapeHtml(name)}
          </a>
        </div>`;
    }
    const iconMap = { image: 'ti-photo', video: 'ti-video', text: 'ti-file-text' };
    const icon = iconMap[att.kind] || 'ti-paperclip';
    return `<span class="msg-attachment"><i class="ti ${icon}"></i> ${escapeHtml(name)}</span>`;
  });
  return `<div class="message-attachments">${items.join('')}</div>`;
}

// ============================================
// RENDERIZAÇÃO DE MENSAGENS
// ============================================

/**
 * Renderiza uma mensagem do chat em HTML
 * @param {Object} message - Objeto da mensagem
 * @param {number} index - Índice da mensagem
 * @returns {string} HTML da mensagem
 */
export function renderMessageHtml(message, index = 0) {
  const escapeHtml = window.escapeHtml || (s => s);
  const formatDateTime = window.formatDateTime || (d => d);
  const WORION_UX_CONFIG = window.WORION_UX_CONFIG || {};

  // Nunca renderizar mensagens de tool - são apenas contexto interno para o modelo
  if (message.role === 'tool') return '';

  if (message.role === 'event') {
    if (!WORION_UX_CONFIG.showSessionResumeMarkers) return '';
    return `<div class="msg msg-event">${escapeHtml(message.content)}</div>`;
  }

  if (message.role === 'exec') {
    // Ocultar status de tools se debugUI estiver desativado
    if (!WORION_UX_CONFIG.debugUI) return '';
    const icon = message.status === 'running' ? 'ti-loader-2' : message.status === 'ok' ? 'ti-check' : 'ti-x';
    const color = message.status === 'running' ? '' : message.status === 'ok' ? 'color:#9dcf7a' : 'color:#f87171';
    return `<div class="msg-exec" style="${color}"><i class="ti ${icon}"></i>${escapeHtml(message.content)}</div>`;
  }

  if (message.content === '...') {
    return `<div class="msg msg-assistant msg-typing" id="assistant-message-${index}">
      <div class="msg-content markdown-premium typing-content" id="assistant-message-content-${index}" onclick="pauseWorionAutoScroll(event)"><span class="typing-cursor">&#10022;</span></div>
    </div>`;
  }

  const time = message.createdAt ? `<span class="msg-time">${escapeHtml(formatDateTime(message.createdAt))}</span>` : '';

  if (message.role === 'assistant' && message.isTyping) {
    return `<div class="msg msg-assistant msg-typing" id="assistant-message-${index}">
      <div class="msg-content markdown-premium typing-content" id="assistant-message-content-${index}" onclick="pauseWorionAutoScroll(event)">${renderAssistantTypingContent(message.content || '')}</div>
    </div>`;
  }

  if (message.role === 'assistant') {
    const cleanContent = prepareAssistantDisplayMarkdown(message.content);
    const html = `<div class="msg msg-assistant" id="assistant-message-${index}">
      <button class="message-copy-btn" id="assistant-copy-${index}" onclick="copyMessageContent(this)" data-copy="${escapeHtml(cleanContent)}" title="Copiar resposta"><i class="ti ti-copy"></i></button>
      <div class="msg-content markdown-premium" id="assistant-message-content-${index}" onclick="pauseWorionAutoScroll()">${renderMarkdown(cleanContent)}${renderAttachmentSummary(message.attachments)}${time}</div>
    </div>`;
    return html;
  }

  return `<div class="msg msg-user">${escapeHtml(message.content)}${renderAttachmentSummary(message.attachments)}${time}</div>`;
}
