/**
 * @module ui/chat/typing-animation
 * @description Animação de digitação do assistente
 * @dependencies message-renderer, markdown-renderer
 * @exports animateAssistantReply, createAssistantTypingFrames, getAssistantTypingDelay, waitForTypingFrame
 */

import {
  prepareAssistantDisplayMarkdown,
  renderAssistantTypingContent,
  renderMessageHtml
} from '../core/message-renderer.js';

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Aguarda tempo entre frames de digitação
 * @param {number} ms - Milissegundos para aguardar
 * @returns {Promise} Promise que resolve após o tempo
 */
export function waitForTypingFrame(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determina palavras por frame baseado no tamanho do texto
 * @param {string} text - Texto completo
 * @returns {number} Palavras por frame
 */
export function getTypingWordsPerFrame(text) {
  const length = String(text || '').length;
  if (length > 4200) return 5;
  if (length > 2400) return 4;
  if (length > 1200) return 3;
  return 2;
}

// ============================================
// CRIAÇÃO DE FRAMES
// ============================================

/**
 * Cria frames de digitação do assistente
 * @param {string} text - Texto completo
 * @returns {Array<number>} Array de índices de frame
 */
export function createAssistantTypingFrames(text) {
  const source = String(text || '');
  if (!source) return [];

  const wordsPerFrame = getTypingWordsPerFrame(source);
  const frames = [];
  const tokens = source.match(/\S+\s*/g) || [source];
  let index = 0;
  let words = 0;

  for (const token of tokens) {
    index += token.length;
    words += /\S/.test(token) ? 1 : 0;

    const endsThought = /[.!?…]\s*$/.test(token);
    const endsClause = /[,;:]\s*$/.test(token);
    const paragraphBreak = /\n\s*\n/.test(token);
    const lineBreak = /\n/.test(token);
    const reachedPace = words >= wordsPerFrame;

    if (paragraphBreak || lineBreak || endsThought || endsClause || reachedPace) {
      if (frames[frames.length - 1] !== index) frames.push(index);
      words = 0;
    }
  }

  if (frames[frames.length - 1] !== source.length) frames.push(source.length);
  return frames;
}

/**
 * Calcula delay entre frames de digitação
 * @param {string} previousText - Texto do frame anterior
 * @param {string} nextText - Texto do próximo frame
 * @param {string} fullText - Texto completo
 * @returns {number} Delay em milissegundos
 */
export function getAssistantTypingDelay(previousText, nextText, fullText) {
  const added = nextText.slice(previousText.length);
  const length = String(fullText || '').length;
  const base = length > 4200 ? 48 : length > 2400 ? 58 : length > 1200 ? 72 : 88;

  if (/\n\s*\n\s*$/.test(nextText)) return base + 360;
  if (/\n\s*$/.test(nextText)) return base + 180;
  if (/[.!?…]\s*$/.test(added.trim())) return base + 260;
  if (/[:;]\s*$/.test(added.trim())) return base + 180;
  if (/,\s*$/.test(added.trim())) return base + 90;
  return base + Math.min(90, Math.max(0, added.length - 10) * 4);
}

function renderAssistantMessageInPlace(messageIndex) {
  const messages = window.messages || [];
  const message = messages[messageIndex];
  const messageEl = document.getElementById(`assistant-message-${messageIndex}`);

  if (!message || !messageEl || !messageEl.isConnected) {
    if (typeof window.renderChatPanel === 'function') window.renderChatPanel();
    return;
  }

  messageEl.outerHTML = renderMessageHtml(message, messageIndex);
}

// ============================================
// ANIMAÇÃO PRINCIPAL
// ============================================

/**
 * Anima resposta do assistente com digitação progressiva
 * @param {number} messageIndex - Índice da mensagem no array
 * @param {string} fullText - Texto completo da resposta
 * @returns {Promise} Promise que resolve quando animação completa
 */
export async function animateAssistantReply(messageIndex, fullText) {
  // Acessa variáveis globais em tempo real; durante a animação o chat pode re-renderizar.
  const getMessages = () => window.messages || [];
  const scrollChatToBottom = window.scrollChatToBottom || (() => {});
  const renderChatPanel = window.renderChatPanel || (() => {});
  const hideExecutionStatus = window.hideExecutionStatus || (() => {});

  const text = prepareAssistantDisplayMarkdown(fullText);
  const createdAt = new Date().toISOString();
  const animationToken = `${Date.now()}:${messageIndex}:${Math.random().toString(36).slice(2)}`;
  window.__worionAssistantTypingToken = animationToken;
  const checkpoint = async (message, status = 'streaming') => {
    if (typeof window.__worionAssistantCheckpoint !== 'function') return;
    try {
      await window.__worionAssistantCheckpoint({ message, messageIndex, status, skipRender: true });
    } catch (error) {
      console.warn('[CHAT] checkpoint da mensagem assistant falhou:', error.message);
    }
  };

  const messages = getMessages();
  const initialMessage = messages[messageIndex] || {};
  messages[messageIndex] = {
    ...initialMessage,
    role: 'assistant',
    content: '',
    isTyping: true,
    status: initialMessage.status || 'streaming',
    createdAt: initialMessage.createdAt || createdAt
  };
  await checkpoint(messages[messageIndex], 'streaming');
  if (!document.getElementById(`assistant-message-content-${messageIndex}`)) {
    renderChatPanel();
  }
  hideExecutionStatus();

  if (!text) {
    messages[messageIndex] = {
      ...messages[messageIndex],
      role: 'assistant',
      content: text,
      isTyping: false,
      status: 'completed',
      completedAt: new Date().toISOString()
    };
    await checkpoint(messages[messageIndex], 'completed');
    renderAssistantMessageInPlace(messageIndex);
    return;
  }

  const frames = createAssistantTypingFrames(text);
  let previousPartial = '';
  let lastCheckpointAt = 0;
  let lastCheckpointLength = 0;

  for (const frameIndex of frames) {
    if (window.__worionAssistantTypingToken !== animationToken) return;

    if (window.responseAbortRequested) {
      const latestMessages = getMessages();
      latestMessages[messageIndex] = {
        ...(latestMessages[messageIndex] || {}),
        role: 'assistant',
        content: previousPartial || latestMessages[messageIndex]?.content || '',
        isTyping: false,
        status: 'interrupted',
        interruptedAt: new Date().toISOString()
      };
      await checkpoint(latestMessages[messageIndex], 'interrupted');
      renderAssistantMessageInPlace(messageIndex);
      return;
    }

    const partial = text.slice(0, frameIndex);
    const latestMessages = getMessages();
    if (!latestMessages[messageIndex]) return;
    latestMessages[messageIndex].content = partial;
    latestMessages[messageIndex].status = 'streaming';
    latestMessages[messageIndex].isTyping = true;

    let contentEl = document.getElementById(`assistant-message-content-${messageIndex}`);
    if (!contentEl || !contentEl.isConnected) {
      renderAssistantMessageInPlace(messageIndex);
      contentEl = document.getElementById(`assistant-message-content-${messageIndex}`);
    }
    if (contentEl) {
      contentEl.innerHTML = renderAssistantTypingContent(partial);
    } else {
      renderAssistantMessageInPlace(messageIndex);
    }

    if (window.__worionAutoScrollPaused) {
      const box = document.getElementById('chat-msgs');
      if (box && Number.isFinite(window.__worionPausedScrollTop)) {
        box.scrollTop = window.__worionPausedScrollTop;
      }
    } else {
      scrollChatToBottom();
    }

    const now = Date.now();
    if (partial.length - lastCheckpointLength >= 800 || now - lastCheckpointAt >= 1200) {
      lastCheckpointAt = now;
      lastCheckpointLength = partial.length;
      await checkpoint(latestMessages[messageIndex], 'streaming');
    }

    await waitForTypingFrame(getAssistantTypingDelay(previousPartial, partial, text));
    previousPartial = partial;
  }

  if (window.__worionAssistantTypingToken !== animationToken) return;
  const finalMessages = getMessages();
  finalMessages[messageIndex] = {
    ...(finalMessages[messageIndex] || {}),
    role: 'assistant',
    content: text,
    isTyping: false,
    status: 'completed',
    completedAt: new Date().toISOString()
  };
  await checkpoint(finalMessages[messageIndex], 'completed');
  renderAssistantMessageInPlace(messageIndex);
  scrollChatToBottom();
}
