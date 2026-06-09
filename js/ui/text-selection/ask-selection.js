/**
 * @module ui/text-selection/ask-selection
 * @description Sistema completo de "Ask Selection"
 * @dependencies selection-popover, utils
 * @exports attachAskSelectionToComposer, openAskSelectionModal, closeAskSelectionModal, renderAskSelectionComposerContext, clearAskSelectionContext, buildAskSelectionPrompt, submitAskSelectionQuestion, updateAskSelectionComposerSlot, getAskSelectionContextText
 */

import { closeAskSelectionPopover } from './selection-popover.js';

// ============================================
// ESTADO
// ============================================

export function getAskSelectionContextText() {
  return String(window.activeAskSelectionContext?.selectedText || window.worionAskSelectionText || '').trim();
}

// ============================================
// RENDERIZAÇÃO
// ============================================

export function renderAskSelectionComposerContext() {
  const escapeHtml = window.escapeHtml || (s => s);
  const text = getAskSelectionContextText();
  if (!text) return '';
  const preview = text.replace(/\s+/g, ' ').trim();
  return `
    <div class="ask-selection-context">
      <i class="ti ti-corner-down-right" aria-hidden="true"></i>
      <div class="ask-selection-context-copy" title="${escapeHtml(preview)}">
        <strong>Perguntar sobre</strong>
        <span>&ldquo;${escapeHtml(preview)}&rdquo;</span>
      </div>
      <button type="button" onclick="clearAskSelectionContext()" title="Remover trecho selecionado"><i class="ti ti-x"></i></button>
    </div>`;
}

export function updateAskSelectionComposerSlot() {
  document.querySelectorAll('[data-ask-selection-slot]').forEach(slot => {
    slot.innerHTML = renderAskSelectionComposerContext();
  });
}

// ============================================
// CONTROLE
// ============================================

export function clearAskSelectionContext() {
  window.worionAskSelectionText = '';
  window.worionAskSelectionCandidateText = '';
  window.worionAskSelectionCandidateContext = null;
  window.activeAskSelectionContext = null;
  updateAskSelectionComposerSlot();
}

export function attachAskSelectionToComposer(selectionText = window.worionAskSelectionCandidateText || window.worionAskSelectionText) {
  const cleanSelection = String(selectionText || '').trim();
  if (!cleanSelection) return;
  window.worionAskSelectionText = cleanSelection.slice(0, 12000);
  const candidateContext = window.worionAskSelectionCandidateContext || {};
  window.activeAskSelectionContext = {
    selectedText: window.worionAskSelectionText,
    sourceMessageId: candidateContext.sourceMessageId || null,
    sourceRole: candidateContext.sourceRole || null
  };
  window.worionAskSelectionCandidateText = '';
  window.worionAskSelectionCandidateContext = null;
  closeAskSelectionPopover();
  closeAskSelectionModal();
  window.getSelection?.()?.removeAllRanges?.();
  updateAskSelectionComposerSlot();

  window.requestAnimationFrame?.(() => {
    const input = document.getElementById('chat-in') || document.getElementById('home-chat-in');
    if (input) {
      input.placeholder = 'Pergunte qualquer coisa';
      input.focus();
      const end = input.value.length;
      input.setSelectionRange?.(end, end);
      if (typeof window.autoResizeTextarea === 'function') window.autoResizeTextarea(input);
    } else if (typeof window.focusComposerInput === 'function') {
      window.focusComposerInput();
    }
  });
}

// ============================================
// MODAL
// ============================================

export function closeAskSelectionModal() {
  document.getElementById('worion-ask-selection-modal')?.remove();
  document.removeEventListener('keydown', handleAskSelectionModalKeydown);
}

function handleAskSelectionModalKeydown(event) {
  if (event.key === 'Escape') closeAskSelectionModal();
}

export function buildAskSelectionPrompt(question, selectionText) {
  const cleanQuestion = String(question || '').trim();
  const cleanSelection = String(selectionText || '').trim();
  if (!cleanSelection) return cleanQuestion;
  return `${cleanQuestion || 'Explique este trecho.'}\n\nContexto citado pelo usuário:\n"${cleanSelection}"`;
}

export async function submitAskSelectionQuestion() {
  const question = document.getElementById('ask-selection-question')?.value || '';
  const selectionText = window.worionAskSelectionText;
  if (!String(selectionText || '').trim()) return;

  const visibleQuestion = String(question || '').trim();
  closeAskSelectionModal();
  closeAskSelectionPopover();

  const autoResizeTextarea = window.autoResizeTextarea || (() => {});
  const sendMsg = window.sendMsg || (async () => {});
  const startNewChatFromHome = window.startNewChatFromHome || (async () => {});

  const chatInput = document.getElementById('chat-in');
  if (chatInput) {
    chatInput.value = visibleQuestion;
    autoResizeTextarea(chatInput);
    await sendMsg();
    return;
  }

  const homeInput = document.getElementById('home-chat-in');
  if (homeInput) {
    homeInput.value = visibleQuestion;
    autoResizeTextarea(homeInput);
  }
  await startNewChatFromHome();
}

export function openAskSelectionModal(selectionText = window.worionAskSelectionText) {
  const escapeHtml = window.escapeHtml || (s => s);
  const cleanSelection = String(selectionText || '').trim();
  if (!cleanSelection) return;
  window.worionAskSelectionText = cleanSelection.slice(0, 12000);
  window.activeAskSelectionContext = {
    selectedText: window.worionAskSelectionText,
    sourceMessageId: null,
    sourceRole: null
  };
  closeAskSelectionPopover();
  closeAskSelectionModal();

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop ask-selection-modal-backdrop';
  modal.id = 'worion-ask-selection-modal';
  modal.innerHTML = `
    <div class="modal-card ask-selection-modal" role="dialog" aria-modal="true" aria-labelledby="ask-selection-title" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div>
          <div class="modal-eyebrow">Texto selecionado</div>
          <h2 id="ask-selection-title">Perguntar sobre</h2>
        </div>
        <button class="panel-close" onclick="closeAskSelectionModal()" title="Fechar"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <div class="ask-selection-preview">${escapeHtml(window.worionAskSelectionText)}</div>
        <textarea id="ask-selection-question" class="ask-selection-question" rows="3" placeholder="Pergunte algo sobre o trecho..." onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();submitAskSelectionQuestion()}"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeAskSelectionModal()">Cancelar</button>
        <button class="btn-primary" onclick="submitAskSelectionQuestion()"><i class="ti ti-send"></i> Enviar</button>
      </div>
    </div>`;
  modal.addEventListener('click', closeAskSelectionModal);
  document.body.appendChild(modal);
  document.addEventListener('keydown', handleAskSelectionModalKeydown);
  setTimeout(() => document.getElementById('ask-selection-question')?.focus(), 40);
}
