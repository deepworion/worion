/**
 * @module ui/chat/execution-status
 * @description Gerenciamento de status de execução e indicadores visuais
 * @dependencies utils (escapeHtml)
 * @exports showExecutionStatus, hideExecutionStatus, updateExecutionStatus, renderExecutionStatus, showExecutionIndicator, hideExecutionIndicator, createStarParticles
 */

// ============================================
// CONSTANTES
// ============================================

const TOOL_STATUS_LABELS = {
  thinking: 'Worion está raciocinando...',
  composing: 'Worion está construindo a resposta...',
  sources: 'Worion está buscando fontes externas...',
  default: 'Worion está analisando sua mensagem...'
};

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Obtém label amigável para status de execução
 * @param {string} status - Status atual
 * @param {string} explicitLabel - Label explícito opcional
 * @returns {string} Label formatado
 */
function getFriendlyExecutionLabel(status = null, explicitLabel = null) {
  if (explicitLabel) return explicitLabel;
  if (!status) return '';
  return TOOL_STATUS_LABELS[status] || TOOL_STATUS_LABELS.default;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Renderiza HTML do status de execução
 * @returns {string} HTML do status
 */
export function renderExecutionStatus() {
  const escapeHtml = window.escapeHtml || (s => s);
  const executionStatus = window.executionStatus || null;
  const executionStatusLabel = window.executionStatusLabel || '';

  const label = getFriendlyExecutionLabel(executionStatus, executionStatusLabel);

  return `
    <div class="execution-status-slot">
      <div class="execution-status${label ? ' active' : ''}" id="executionStatus">
        <span id="executionStatusLabel" class="execution-label">${escapeHtml(label)}</span>
      </div>
    </div>`;
}

/**
 * Atualiza status de execução no DOM
 */
export function updateExecutionStatus() {
  const escapeHtml = window.escapeHtml || (s => s);
  const executionStatus = window.executionStatus || null;
  const executionStatusLabel = window.executionStatusLabel || '';

  const status = document.getElementById('executionStatus');
  if (!status) return;

  const label = getFriendlyExecutionLabel(executionStatus, executionStatusLabel);
  const labelEl = document.getElementById('executionStatusLabel') || status.querySelector('.execution-label');
  if (labelEl) labelEl.textContent = label;

  status.classList.toggle('active', Boolean(label));
}

// ============================================
// CONTROLE DE STATUS
// ============================================

/**
 * Exibe status de execução
 * @param {string} label - Label do status
 */
export function showExecutionStatus(label) {
  const isAssistantResponding = window.isAssistantResponding || false;
  if (!isAssistantResponding) return;

  window.executionStatusLabel = label || TOOL_STATUS_LABELS.default;
  window.executionStatusTrail = [];

  updateExecutionStatus();
}

/**
 * Oculta status de execução
 */
export function hideExecutionStatus() {
  window.executionStatus = null;
  window.executionStatusLabel = '';
  window.executionStatusTrail = [];
  window.activeExecutionCount = 0;
  updateExecutionStatus();
}

// ============================================
// INDICADOR VISUAL (ESTRELA)
// ============================================

/**
 * Exibe indicador visual de execução
 * @param {string} state - Estado do indicador ('thinking', 'executing', etc)
 */
export function showExecutionIndicator(state) {
  if (window.scrollChatToBottom) {
    window.scrollChatToBottom();
  }
}

/**
 * Oculta indicador visual
 */
export function hideExecutionIndicator() {
}

/**
 * Cria partículas animadas para o indicador
 */
export function createStarParticles() {
}
