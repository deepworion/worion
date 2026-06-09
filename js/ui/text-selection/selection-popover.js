/**
 * @module ui/text-selection/selection-popover
 * @description Popover de seleção de texto
 * @dependencies Nenhuma
 * @exports showAskSelectionPopover, closeAskSelectionPopover, getVisibleSelectionText, getSelectionPopoverPosition
 */

// ============================================
// UTILITÁRIOS
// ============================================

function getSelectionAnchorElement(selection) {
  const anchor = selection?.anchorNode?.nodeType === Node.TEXT_NODE
    ? selection.anchorNode.parentElement
    : selection?.anchorNode;
  const focus = selection?.focusNode?.nodeType === Node.TEXT_NODE
    ? selection.focusNode.parentElement
    : selection?.focusNode;
  return anchor?.nodeType === Node.ELEMENT_NODE ? anchor : focus;
}

function isAskSelectionEligibleElement(element) {
  if (!element?.closest) return false;
  if (element.closest('textarea,input,select,button,a,.modal-backdrop,.sidebar,.chat-input-wrap,.home-input,.top-center-logo,.composer-mode-menu,#worion-ask-selection-popover,#worion-ask-selection-modal')) {
    return false;
  }
  return Boolean(element.closest('.msg-assistant,.msg-user,.memory-card,.memory-project-message,.memory-project-content,[data-ask-selection-source]'));
}

export function getVisibleSelectionText() {
  const selection = window.getSelection?.();
  const text = String(selection?.toString() || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length < 2) return '';
  if (!selection.rangeCount) return '';

  const anchor = getSelectionAnchorElement(selection);
  if (!isAskSelectionEligibleElement(anchor)) return '';
  return text;
}

export function getSelectionPopoverPosition(selection) {
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const rect = range?.getBoundingClientRect();
  if (!rect || (!rect.width && !rect.height)) return null;

  const popoverWidth = 206;
  const top = Math.max(12, rect.top + window.scrollY - 44);
  const left = Math.min(
    window.scrollX + document.documentElement.clientWidth - popoverWidth - 12,
    Math.max(12, rect.left + window.scrollX + (rect.width / 2) - (popoverWidth / 2))
  );
  return { top, left };
}

// ============================================
// POPOVER
// ============================================

export function closeAskSelectionPopover() {
  document.getElementById('worion-ask-selection-popover')?.remove();
}

export function showAskSelectionPopover() {
  const selection = window.getSelection?.();
  const text = getVisibleSelectionText();
  if (!text) {
    closeAskSelectionPopover();
    return;
  }

  const position = getSelectionPopoverPosition(selection);
  if (!position) return;

  window.worionAskSelectionCandidateText = text.slice(0, 12000);
  const anchor = getSelectionAnchorElement(selection);
  const sourceMessage = anchor?.closest?.('.msg-assistant,.msg-user');
  window.worionAskSelectionCandidateContext = {
    selectedText: window.worionAskSelectionCandidateText,
    sourceMessageId: sourceMessage?.id || null,
    sourceRole: sourceMessage?.classList?.contains('msg-assistant') ? 'assistant' : sourceMessage?.classList?.contains('msg-user') ? 'user' : null
  };
  closeAskSelectionPopover();

  const popover = document.createElement('button');
  popover.type = 'button';
  popover.id = 'worion-ask-selection-popover';
  popover.className = 'ask-selection-popover';
  popover.style.top = `${position.top}px`;
  popover.style.left = `${position.left}px`;
  popover.innerHTML = '<span>Perguntar ao Worion</span>';
  popover.addEventListener('mousedown', event => event.preventDefault());
  popover.addEventListener('click', event => {
    event.preventDefault();
    if (window.attachAskSelectionToComposer) {
      window.attachAskSelectionToComposer(window.worionAskSelectionCandidateText);
    }
  });
  document.body.appendChild(popover);
}
