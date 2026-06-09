/**
 * @module ui/chat/composer
 * @description Componentes do composer (seletores de modelo, agente, skill, work mode)
 * @dependencies utils (escapeHtml)
 * @exports renderModelSelector, renderAgentSelector, renderSkillSelector, renderWorkModeSelector, refreshComposerControls, autoResizeTextarea, focusComposerInput, renderActiveSkillStatus, closeComposerModeMenu
 */

// ============================================
// SELETOR DE MODELO
// ============================================

export function getAvailableModels() {
  return [
    { id: 'auto', name: 'Auto (Router)', icon: 'ti-wand' },
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano (Router/Writer)', icon: 'ti-bolt' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini (Síntese)', icon: 'ti-sparkles' },
    { id: 'gpt-5.5', name: 'GPT-5.5 (Pesado)', icon: 'ti-brain' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini (Legado)', icon: 'ti-history' },
    { id: 'deepseek-v4-pro', name: 'DeepSeek V4 (Manual)', icon: 'ti-code' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5 (Manual)', icon: 'ti-feather' },
    { id: 'gpt-4o', name: 'GPT-4o (Multimodal)', icon: 'ti-photo' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Análise)', icon: 'ti-file-analytics' }
  ];
}

export function setManualModel(modelId) {
  window.manualSelectedModel = modelId === 'auto' ? null : modelId;
  refreshComposerControls();
  console.log('[MODEL SELECTOR] Modelo manual selecionado:', window.manualSelectedModel);
}

export function getModelSelectorLabel() {
  if (!window.manualSelectedModel) return 'Auto';
  const model = getAvailableModels().find(m => m.id === window.manualSelectedModel);
  return model ? model.name.split('(')[0].trim() : 'Auto';
}

export function renderModelSelector() {
  const escapeHtml = window.escapeHtml || (s => s);
  const models = getAvailableModels();
  const selectedId = window.manualSelectedModel || 'auto';
  const selectedModel = models.find(m => m.id === selectedId);
  const icon = selectedModel?.icon || 'ti-wand';
  const label = getModelSelectorLabel();

  return `<details class="composer-mode composer-model-selector" id="composer-model-selector">
    <summary class="composer-mode-trigger" title="Selecionar modelo">
      <i class="ti ${icon}" aria-hidden="true"></i>
      <span>${escapeHtml(label)}</span>
      <i class="ti ti-chevron-up composer-mode-chevron" aria-hidden="true"></i>
    </summary>
    <div class="composer-mode-menu">
      ${models.map(model => `
        <button class="composer-mode-item${selectedId === model.id ? ' active' : ''}" onclick="setManualModel('${model.id}')" type="button">
          <i class="ti ${model.icon}" aria-hidden="true"></i>
          <span>${escapeHtml(model.name)}</span>
          ${selectedId === model.id ? '<i class="ti ti-check composer-mode-check" aria-hidden="true"></i>' : ''}
        </button>
      `).join('')}
    </div>
  </details>`;
}

// ============================================
// SELETOR DE AGENTE
// ============================================

export function getAgentSelectorLabel() {
  const currentAgent = window.currentAgent;
  return currentAgent?.name || 'Padrão';
}

export function setComposerAgent(agentId) {
  const agents = window.agents || [];
  const getDefaultAgent = window.getDefaultAgent || (() => null);
  const nextAgent = agents.find(agent => agent.id === agentId) || getDefaultAgent();
  if (!nextAgent) return;
  window.selected = nextAgent.id;
  window.currentAgent = nextAgent;
  refreshComposerControls();
  const chatName = document.querySelector('.same-room-chat .chat-name');
  if (chatName && !window.currentProjectContext && !window.getActiveSkill?.() && !window.getActiveWorkModes?.().length) {
    chatName.textContent = nextAgent.name || 'Novo Chat';
  }
}

export function renderAgentSelector() {
  const escapeHtml = window.escapeHtml || (s => s);
  const agents = window.agents || [];
  const currentAgent = window.currentAgent;
  const selected = window.selected;
  const getDefaultAgent = window.getDefaultAgent || (() => ({}));
  const list = Array.isArray(agents) && agents.length ? agents : [];
  const selectedId = currentAgent?.id || selected || getDefaultAgent()?.id || '';

  return `<details class="composer-mode composer-agent-selector" id="composer-agent-selector">
    <summary class="composer-mode-trigger" title="Selecionar agente">
      <i class="ti ti-robot" aria-hidden="true"></i>
      <span>${escapeHtml(getAgentSelectorLabel())}</span>
      <i class="ti ti-chevron-up composer-mode-chevron" aria-hidden="true"></i>
    </summary>
    <div class="composer-mode-menu">
      ${list.map(agent => `
        <button class="composer-mode-item${selectedId === agent.id ? ' active' : ''}" onclick="setComposerAgent('${agent.id}')" type="button">
          <i class="ti ti-robot" aria-hidden="true"></i>
          <span>${escapeHtml(agent.name || agent.title || agent.id)}</span>
          ${selectedId === agent.id ? '<i class="ti ti-check composer-mode-check" aria-hidden="true"></i>' : ''}
        </button>
      `).join('') || '<div class="composer-mode-empty">Nenhum agente</div>'}
    </div>
  </details>`;
}

// ============================================
// SELETOR DE SKILL
// ============================================

export function getSkillSelectorLabel() {
  const getActiveSkill = window.getActiveSkill || (() => null);
  const skill = getActiveSkill();
  return skill ? skill.name : 'Skills';
}

export function setComposerSkill(skillId) {
  const renderSidebarSkills = window.renderSidebarSkills || (() => {});
  if (!skillId) {
    window.activeSkillId = null;
  } else {
    window.activeSkillId = skillId;
    window.activeWorkModeId = null;
    window.activeWorkModeIds = [];
  }
  refreshComposerControls();
  renderSidebarSkills();
  const chatName = document.querySelector('.same-room-chat .chat-name');
  const getActiveSkill = window.getActiveSkill || (() => null);
  const skill = getActiveSkill();
  if (chatName && !window.currentProjectContext) chatName.textContent = skill?.name || 'Novo Chat';
}

export function renderSkillSelector() {
  const escapeHtml = window.escapeHtml || (s => s);
  const getActiveSkill = window.getActiveSkill || (() => null);
  const QUICK_SKILLS = window.QUICK_SKILLS || [];
  const activeSkillId = window.activeSkillId || '';
  const selectedId = activeSkillId || '';

  return `<details class="composer-mode composer-skill-selector" id="composer-skill-selector">
    <summary class="composer-mode-trigger" title="Selecionar skill">
      <i class="ti ${getActiveSkill()?.icon || 'ti-sparkles'}" aria-hidden="true"></i>
      <span>${escapeHtml(getSkillSelectorLabel())}</span>
      <i class="ti ti-chevron-up composer-mode-chevron" aria-hidden="true"></i>
    </summary>
    <div class="composer-mode-menu">
      <button class="composer-mode-item${!selectedId ? ' active' : ''}" onclick="setComposerSkill(null)" type="button">
        <i class="ti ti-circle-off" aria-hidden="true"></i>
        <span>Nenhuma skill</span>
        ${!selectedId ? '<i class="ti ti-check composer-mode-check" aria-hidden="true"></i>' : ''}
      </button>
      ${QUICK_SKILLS.map(skill => `
        <button class="composer-mode-item${selectedId === skill.id ? ' active' : ''}" onclick="setComposerSkill('${skill.id}')" type="button">
          <i class="ti ${skill.icon}" aria-hidden="true"></i>
          <span>${escapeHtml(skill.name)}</span>
          ${selectedId === skill.id ? '<i class="ti ti-check composer-mode-check" aria-hidden="true"></i>' : ''}
        </button>
      `).join('')}
    </div>
  </details>`;
}

// ============================================
// SELETOR DE WORK MODE
// ============================================

function getWorkModeShortLabel(mode) {
  if (!mode) return 'Normal';
  if (mode.id === 'deep-thinking') return 'Profundo';
  if (mode.id === 'smart-research') return 'Pesquisa';
  if (mode.id === 'document-generation') return 'Docs';
  return mode.name.split(/\s+/).slice(0, 2).join(' ');
}

function getWorkModeSelectorLabel(modes = []) {
  if (!modes.length) return 'Normal';
  if (modes.length === 1) return getWorkModeShortLabel(modes[0]);
  return `${modes.length} modos`;
}

export function renderWorkModeSelector() {
  const escapeHtml = window.escapeHtml || (s => s);
  const getActiveWorkModes = window.getActiveWorkModes || (() => []);
  const getActiveWorkModeIds = window.getActiveWorkModeIds || (() => []);
  const WORK_MODES = window.WORK_MODES || [];
  const modes = getActiveWorkModes();
  const activeIds = getActiveWorkModeIds();
  const mode = modes[0];
  const icon = modes.length > 1 ? 'ti-adjustments' : (mode?.icon || 'ti-message');
  const label = getWorkModeSelectorLabel(modes);

  return `<details class="composer-mode composer-workmode-selector" id="composer-mode">
    <summary class="composer-mode-trigger" title="Selecionar modos de trabalho">
      <i class="ti ${icon}" aria-hidden="true"></i>
      <span>${escapeHtml(label)}</span>
      <i class="ti ti-chevron-up composer-mode-chevron" aria-hidden="true"></i>
    </summary>
    <div class="composer-mode-menu">
      <button class="composer-mode-item${!activeIds.length ? ' active' : ''}" onclick="clearActiveWorkModes()" type="button">
        <i class="ti ti-message" aria-hidden="true"></i>
        <span>Nenhum / Normal</span>
      </button>
      ${WORK_MODES.map(item => `
        <button class="composer-mode-item${activeIds.includes(item.id) ? ' active' : ''}" onclick="toggleActiveWorkMode('${item.id}')" type="button" aria-pressed="${activeIds.includes(item.id) ? 'true' : 'false'}">
          <i class="ti ${item.icon}" aria-hidden="true"></i>
          <span>${escapeHtml(item.name)}</span>
          <i class="ti ti-check composer-mode-check" aria-hidden="true"></i>
        </button>
      `).join('')}
    </div>
  </details>`;
}

// ============================================
// CONTROLES GERAIS
// ============================================

export function refreshComposerControls() {
  const replacements = [
    ['.composer-model-selector', renderModelSelector],
    ['.composer-agent-selector', renderAgentSelector],
    ['.composer-skill-selector', renderSkillSelector],
    ['.composer-workmode-selector', renderWorkModeSelector]
  ];
  replacements.forEach(([selector, render]) => {
    document.querySelectorAll(selector).forEach(node => { node.outerHTML = render(); });
  });
  const status = document.getElementById('skill-status');
  if (status && typeof renderActiveSkillStatus === 'function') status.outerHTML = renderActiveSkillStatus();
  focusComposerInput();
}

export function renderActiveSkillStatus() {
  const escapeHtml = window.escapeHtml || (s => s);
  const getActiveSkill = window.getActiveSkill || (() => null);
  const getActiveWorkMode = window.getActiveWorkMode || (() => null);
  const getActiveWorkModes = window.getActiveWorkModes || (() => []);

  const skill = getActiveSkill();
  if (skill) return `<div class="skill-status"><i class="ti ${skill.icon}"></i><span>Skill ativa: ${escapeHtml(skill.name)}</span></div>`;
  const workModes = getActiveWorkModes();
  if (workModes.length) return `<div class="skill-status"><i class="ti ${workModes.length > 1 ? 'ti-adjustments' : workModes[0].icon}"></i><span>Modos ativos: ${escapeHtml(workModes.map(mode => mode.name).join(' + '))}</span></div>`;
  return `<div class="skill-status"><i class="ti ti-message"></i><span>Novo Chat sem skill ativa</span></div>`;
}

export function closeComposerModeMenu() {
  document.querySelectorAll('.composer-mode[open]').forEach(menu => {
    menu.removeAttribute('open');
  });
}

// ============================================
// TEXTAREA E FOCUS
// ============================================

export function autoResizeTextarea(textarea) {
  const maxHeight = textarea.id === 'home-chat-in' ? 300 : 320;
  textarea.style.height = 'auto';
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = nextHeight + 'px';
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

export function focusComposerInput() {
  const input = document.querySelector('[data-chat-input], #chat-in, #home-chat-in, textarea.chat-input, textarea');
  const modalOpen = document.querySelector('.modal-open, .confirm-modal, .modal-backdrop');
  if (!input || modalOpen) return;
  setTimeout(() => {
    if (!document.querySelector('.modal-open, .confirm-modal, .modal-backdrop')) input.focus();
  }, 50);
}

// ============================================
// INICIALIZAÇÃO
// ============================================

if (typeof window !== 'undefined' && !window.__worionComposerModeListener) {
  window.__worionComposerModeListener = true;
  document.addEventListener('click', event => {
    if (!event.target.closest?.('.composer-mode')) closeComposerModeMenu();
  });
}
