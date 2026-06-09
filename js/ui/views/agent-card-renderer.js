/**
 * MÓDULO: agent-card-renderer.js
 * RESPONSABILIDADE: Renderização de card de agente
 * DEPENDÊNCIAS: escapeHtml (global via window)
 * EXPORTA: renderAgentCard, renderAgentCardHtml
 * NÃO MODIFICAR SEM LER: ui.js (chama este módulo para renderizar cards)
 */

// Referência à função global escapeHtml
const escapeHtml = window.escapeHtml || ((str) => String(str || '').replace(/[&<>"']/g, (m) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[m])));

/**
 * Renderiza o HTML de um card de agente
 * @param {Object} agent - Objeto do agente
 * @param {string} agent.id - ID do agente
 * @param {string} agent.name - Nome do agente
 * @param {string} agent.desc - Descrição do agente
 * @param {string} agent.badge - Badge do agente
 * @param {string} agent.badgeClass - Classe CSS do badge
 * @param {string} agent.time - Última atualização
 * @param {Array} agent.tags - Tags do agente
 * @param {string} selectedId - ID do agente selecionado
 * @returns {string} - HTML do card
 */
export function renderAgentCardHtml(agent, selectedId = '') {
  const isSelected = selectedId === agent.id;
  const safeId = escapeHtml(agent.id);

  return `
    <div class="agent-card${isSelected ? ' selected' : ''}">
      <div class="card-header">
        <span class="card-title">${escapeHtml(agent.name)}</span>
      </div>
      <div class="card-desc">${escapeHtml(agent.desc)}</div>
      <div class="card-footer">
        <span class="card-time">Atualizado ${escapeHtml(agent.time || 'Hoje')}</span>
      </div>
      <div class="agent-card-actions">
        <button class="btn-chat agent-card-chat" onclick="event.stopPropagation();startAgentChat('${safeId}')" title="Iniciar chat com agente">
          <i class="ti ti-message-circle"></i> Iniciar Chat
        </button>
        <button class="btn-edit agent-card-edit" onclick="event.stopPropagation();openAgentEditor('${safeId}')" title="Editar agente">
          <i class="ti ti-pencil"></i> Editar
        </button>
      </div>
    </div>
  `;
}

/**
 * Renderiza lista de cards de agentes
 * @param {Array} agents - Lista de agentes
 * @param {string} selectedId - ID do agente selecionado
 * @returns {string} - HTML concatenado de todos os cards
 */
export function renderAgentCard(agents = [], selectedId = '') {
  if (!Array.isArray(agents)) {
    return '';
  }

  return agents
    .map(agent => renderAgentCardHtml(agent, selectedId))
    .join('');
}
