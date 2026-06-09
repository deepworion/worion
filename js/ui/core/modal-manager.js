/**
 * @module ui/core/modal-manager
 * @description Gerenciamento de modais e confirmações
 * @dependencies utils (escapeHtml)
 * @exports showConfirmModal, closeConfirmModal
 */

// ============================================
// ESTADO
// ============================================

let currentConfirmResolver = null;

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handler de teclado para modais de confirmação
 * @param {KeyboardEvent} event - Evento de teclado
 */
function handleConfirmModalKeydown(event) {
  if (event.key === 'Escape') {
    const resolver = currentConfirmResolver;
    closeConfirmModal();
    if (typeof resolver === 'function') resolver(false);
  }
}

// ============================================
// FUNÇÕES PÚBLICAS
// ============================================

/**
 * Fecha modal de confirmação atual
 */
export function closeConfirmModal() {
  const modal = document.getElementById('worion-confirm-modal');
  if (modal) modal.remove();
  document.removeEventListener('keydown', handleConfirmModalKeydown);
  currentConfirmResolver = null;
}

/**
 * Exibe modal de confirmação
 * @param {Object} options - Opções do modal
 * @param {string} options.title - Título do modal
 * @param {string} options.message - Mensagem do modal
 * @param {string} options.cancelLabel - Texto do botão cancelar
 * @param {string} options.confirmLabel - Texto do botão confirmar
 * @param {boolean} options.destructive - Se ação é destrutiva
 * @returns {Promise<boolean>} Promise que resolve com true/false
 */
export function showConfirmModal({
  title = 'Confirmar ação',
  message = '',
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  destructive = false
} = {}) {
  const escapeHtml = window.escapeHtml || (s => s);

  closeConfirmModal();

  return new Promise(resolve => {
    currentConfirmResolver = resolve;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop confirm-modal';
    modal.id = 'worion-confirm-modal';
    modal.innerHTML = `
      <div class="modal-card confirm-modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2 id="confirm-modal-title">${escapeHtml(title)}</h2>
          <button class="panel-close" onclick="closeConfirmModal()"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <p class="confirm-modal-message">${escapeHtml(message)}</p>
        </div>
        <div class="confirm-modal-actions">
          <button class="btn-secondary" id="confirm-cancel-btn">${escapeHtml(cancelLabel)}</button>
          <button class="${destructive ? 'btn-danger' : 'btn-primary'}" id="confirm-action-btn">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;

    modal.addEventListener('click', () => {
      closeConfirmModal();
      resolve(false);
    });

    document.body.appendChild(modal);
    document.addEventListener('keydown', handleConfirmModalKeydown);

    modal.querySelector('.panel-close')?.addEventListener('click', () => {
      closeConfirmModal();
      resolve(false);
    });

    document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => {
      closeConfirmModal();
      resolve(false);
    });

    document.getElementById('confirm-action-btn')?.addEventListener('click', () => {
      closeConfirmModal();
      resolve(true);
    });
  });
}
