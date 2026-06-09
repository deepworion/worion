/**
 * Mà“DULO: ui.js
 * RESPONSABILIDADE: Renderizaçào completa da interface: chat, agentes, conversas, projetos, configurações e todas as views
 * DEPENDÊNCIAS: utils.js, memory.js, chat.js, projects.js, connectors.js, prompt.js, artifacts.js, app.js
 * EXPORTA: renderMarkdown, renderMessageHtml, renderChatPanel, renderGoalProgress, renderCards, renderSkillCards, renderConversationList, renderSidebarSkills, renderSidebarConversations, refreshSidebarConversations, deleteSidebarConversation, scrollChatToBottom, autoResizeTextarea, renderSkillChips, setActiveSkillFromChip, getLoadingStatus, setActiveView, toggleProfileMenu, showSettingsView, saveSettingsFromView, triggerAgentPersonaUpload, handleAgentPersonaSelect, importPersonaFilesAsAgents, appendPersonaFilesToEditor, showAgentsView, showSkillsView, showConversationsView, showHomeView, showInternalPlaceholder, showConnectionsView, loadConnectionsIntoView, renderConnectionsList, openAgentEditor, openSkillEditor, saveAgentFromEditor, selectAgent, renderPanel, renderDetailPanel, showAgentDetails, filterCards, filterSkillCards, selectAgentFromSidebar, startSkillChat, startAgentChat, getAgentPromptForEdit
 * TOOLS REGISTRADAS: nenhuma
 * NàƒO MODIFICAR SEM LER: app.js, chat.js, memory.js, utils.js (camada de apresentaçào completa)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// IMPORTS DOS Mà“DULOS REFATORADOS
// ============================================

import * as MarkdownRenderer from './ui/core/markdown-renderer.js';
import * as MessageRenderer from './ui/core/message-renderer.js';
import * as ModalManager from './ui/core/modal-manager.js';
import * as TypingAnimation from './ui/chat/typing-animation.js';
import * as ExecutionStatus from './ui/chat/execution-status.js';
import * as Composer from './ui/chat/composer.js';
import * as SelectionPopover from './ui/text-selection/selection-popover.js';
import * as AskSelection from './ui/text-selection/ask-selection.js';
import * as UIHelpers from './ui/utils/ui-helpers.js';
import * as UIFormatters from './ui/utils/ui-formatters.js';
import * as SidebarSkills from './ui/sidebar/sidebar-skills.js';
import * as SidebarConversations from './ui/sidebar/sidebar-conversations.js';
import * as SidebarProjects from './ui/sidebar/sidebar-projects.js';
import * as SearchOverlay from './ui/search/search-overlay.js';
import * as SearchEngine from './ui/search/search-engine.js';
import * as ConnectionsView from './ui/views/connections-view.js';
import * as ContextMemoryConstants from './ui/views/context-memory-constants.js';
import * as ContextMemoryStorage from './ui/views/context-memory-storage.js';
import * as ViewManager from './ui/views/view-manager.js';
import * as MemoryCardsNormalizers from './ui/memory-cards/memory-cards-normalizers.js';
import * as MemoryCardsLoader from './ui/memory-cards/memory-cards-loader.js';
import * as MemoryCardsView from './ui/memory-cards/memory-cards-view.js';
import * as SkillFilters from './ui/views/skill-filters.js';
import * as AgentCardRenderer from './ui/views/agent-card-renderer.js';
import * as AgentHelpers from './ui/views/agent-helpers.js';
import * as CustomSkillsNormalizers from './ui/views/custom-skills-normalizers.js';

// ============================================
// RE-EXPORTS GLOBAIS PARA COMPATIBILIDADE
// ============================================

// Markdown & Messages
window.renderMarkdown = MarkdownRenderer.renderMarkdown;
window.renderMessageHtml = MessageRenderer.renderMessageHtml;
window.renderAssistantTypingContent = MessageRenderer.renderAssistantTypingContent;
window.prepareAssistantDisplayMarkdown = MessageRenderer.prepareAssistantDisplayMarkdown;

// Modais
window.showConfirmModal = ModalManager.showConfirmModal;
window.closeConfirmModal = ModalManager.closeConfirmModal;

// Typing & Execution
window.animateAssistantReply = TypingAnimation.animateAssistantReply;
window.showExecutionStatus = ExecutionStatus.showExecutionStatus;
window.hideExecutionStatus = ExecutionStatus.hideExecutionStatus;
window.updateExecutionStatus = ExecutionStatus.updateExecutionStatus;
window.renderExecutionStatus = ExecutionStatus.renderExecutionStatus;
window.showExecutionIndicator = ExecutionStatus.showExecutionIndicator;
window.hideExecutionIndicator = ExecutionStatus.hideExecutionIndicator;

// Composer
window.renderModelSelector = Composer.renderModelSelector;
window.renderAgentSelector = Composer.renderAgentSelector;
window.renderSkillSelector = Composer.renderSkillSelector;
window.renderWorkModeSelector = Composer.renderWorkModeSelector;
window.refreshComposerControls = Composer.refreshComposerControls;
window.renderActiveSkillStatus = Composer.renderActiveSkillStatus;
window.autoResizeTextarea = Composer.autoResizeTextarea;
window.focusComposerInput = Composer.focusComposerInput;
window.setManualModel = Composer.setManualModel;
window.setComposerAgent = Composer.setComposerAgent;
window.setComposerSkill = Composer.setComposerSkill;

// Text Selection
window.showAskSelectionPopover = SelectionPopover.showAskSelectionPopover;
window.closeAskSelectionPopover = SelectionPopover.closeAskSelectionPopover;
window.getVisibleSelectionText = SelectionPopover.getVisibleSelectionText;
window.attachAskSelectionToComposer = AskSelection.attachAskSelectionToComposer;
window.openAskSelectionModal = AskSelection.openAskSelectionModal;
window.closeAskSelectionModal = AskSelection.closeAskSelectionModal;
window.renderAskSelectionComposerContext = AskSelection.renderAskSelectionComposerContext;
window.clearAskSelectionContext = AskSelection.clearAskSelectionContext;
window.submitAskSelectionQuestion = AskSelection.submitAskSelectionQuestion;
window.getAskSelectionContextText = AskSelection.getAskSelectionContextText;
window.buildAskSelectionPrompt = AskSelection.buildAskSelectionPrompt;

// Helpers & Formatters
window.hashString = UIHelpers.hashString;
window.formatMemoryDate = UIFormatters.formatMemoryDate;
window.normalizeSummaryText = UIFormatters.normalizeSummaryText;
window.capitalize = UIFormatters.capitalize;

// Sidebar
window.renderSidebarSkills = SidebarSkills.renderSidebarSkills;
window.renderSidebarConversations = SidebarConversations.renderSidebarConversations;
window.refreshSidebarConversations = SidebarConversations.refreshSidebarConversations;
window.deleteSidebarConversation = SidebarConversations.deleteSidebarConversation;
window.renderSidebarProjects = SidebarProjects.renderSidebarProjects;

// Search
window.openSearchOverlay = SearchOverlay.openSearchOverlay;
window.closeSearchOverlay = SearchOverlay.closeSearchOverlay;
window.searchWorionContent = SearchEngine.searchWorionContent;
window.openSearchResult = SearchEngine.openSearchResult;

// Connections View
window.connectionsTreeState = ConnectionsView.connectionsTreeState;
window.loadConnectionsTree = ConnectionsView.loadConnectionsTree;
window.filterConnectionsQuery = ConnectionsView.filterConnectionsQuery;
window.applyConnectionsSearch = ConnectionsView.applyConnectionsSearch;
window.openConnectionsCategory = ConnectionsView.openConnectionsCategory;
window.renderConnectionsTable = ConnectionsView.renderConnectionsTable;
window.renderConnectionsDetail = ConnectionsView.renderConnectionsDetail;
window.extractConnectionsRows = ConnectionsView.extractConnectionsRows;

// Context Memory Constants
window.CONTEXT_MEMORY_SELECTION_KEY = ContextMemoryConstants.CONTEXT_MEMORY_SELECTION_KEY;
window.CONTEXT_MEMORY_AUDIT_KEY = ContextMemoryConstants.CONTEXT_MEMORY_AUDIT_KEY;
window.CONTEXT_MEMORY_CACHE_KEY = ContextMemoryConstants.CONTEXT_MEMORY_CACHE_KEY;
window.CONTEXT_MEMORY_EXTRACTION_MODE = ContextMemoryConstants.CONTEXT_MEMORY_EXTRACTION_MODE;
window.CONTEXT_MEMORY_CHUNK_SIZE = ContextMemoryConstants.CONTEXT_MEMORY_CHUNK_SIZE;
window.CONTEXT_MEMORY_CHUNK_OVERLAP = ContextMemoryConstants.CONTEXT_MEMORY_CHUNK_OVERLAP;
window.CONTEXT_MEMORY_LOCAL_CONVERSATION_LIMIT = ContextMemoryConstants.CONTEXT_MEMORY_LOCAL_CONVERSATION_LIMIT;
window.CONTEXT_MEMORY_IMPORTED_CONVERSATION_LIMIT = ContextMemoryConstants.CONTEXT_MEMORY_IMPORTED_CONVERSATION_LIMIT;
window.CONTEXT_MEMORY_IMPORTED_CHUNK_LIMIT = ContextMemoryConstants.CONTEXT_MEMORY_IMPORTED_CHUNK_LIMIT;
window.CONTEXT_MEMORY_EXCERPT_LIMIT = ContextMemoryConstants.CONTEXT_MEMORY_EXCERPT_LIMIT;
window.CONTEXT_MEMORY_EXCERPT_MIN_LENGTH = ContextMemoryConstants.CONTEXT_MEMORY_EXCERPT_MIN_LENGTH;
window.CONTEXT_MEMORY_TOPICS = ContextMemoryConstants.CONTEXT_MEMORY_TOPICS;
window.contextMemoryState = ContextMemoryConstants.contextMemoryState;

// Context Memory Storage
window.loadContextMemorySelection = ContextMemoryStorage.loadContextMemorySelection;
window.saveContextMemorySelection = ContextMemoryStorage.saveContextMemorySelection;
window.loadContextMemoryAuditTrail = ContextMemoryStorage.loadContextMemoryAuditTrail;
window.saveContextMemoryAuditTrail = ContextMemoryStorage.saveContextMemoryAuditTrail;
window.loadContextMemoryCache = ContextMemoryStorage.loadContextMemoryCache;
window.saveContextMemoryCache = ContextMemoryStorage.saveContextMemoryCache;
window.recordContextMemorySelectionEvent = ContextMemoryStorage.recordContextMemorySelectionEvent;
window.getContextMemoryUserId = ContextMemoryStorage.getContextMemoryUserId;

// View Manager
window.setActiveView = ViewManager.setActiveView;
window.getActiveView = ViewManager.getActiveView;

// Memory Cards Normalizers
window.normalizeMemoryLegacyRows = MemoryCardsNormalizers.normalizeMemoryLegacyRows;
window.hydrateMemoryContextsAndCards = MemoryCardsNormalizers.hydrateMemoryContextsAndCards;

// Memory Cards Loader
window.loadMemoryCards = MemoryCardsLoader.loadMemoryCards;
window.loadMemoryContextCatalog = MemoryCardsLoader.loadMemoryContextCatalog;

// Memory Cards View
window.renderMemoryCardsView = MemoryCardsView.renderMemoryCardsView;
window.renderMemoryCardsGrid = MemoryCardsView.renderMemoryCardsGrid;
window.filterMemoryCards = MemoryCardsView.filterMemoryCards;
window.memoryV2HeaderLabel = MemoryCardsView.memoryV2HeaderLabel;
window.showMemoryLoading = MemoryCardsView.showMemoryLoading;
window.renderMemoryTabs = MemoryCardsView.renderMemoryTabs;

// Skill Filters
window.normalizeSkillFilterTerm = SkillFilters.normalizeSkillFilterTerm;
window.filterSkills = SkillFilters.filterSkills;

// Agent Card Renderer
window.renderAgentCard = AgentCardRenderer.renderAgentCard;
window.renderAgentCardHtml = AgentCardRenderer.renderAgentCardHtml;

// Agent Helpers
window.isAgentPersonaFile = AgentHelpers.isAgentPersonaFile;
window.getAgentPersonaFiles = AgentHelpers.getAgentPersonaFiles;
window.getAgentTitleFromPersona = AgentHelpers.getAgentTitleFromPersona;
window.getAgentDescFromPersona = AgentHelpers.getAgentDescFromPersona;
window.sanitizeAgentDocumentName = AgentHelpers.sanitizeAgentDocumentName;
window.getAgentDocumentRef = AgentHelpers.getAgentDocumentRef;
window.buildAgentMarkdownContent = AgentHelpers.buildAgentMarkdownContent;
window.buildAgentMarkdownFromPersona = AgentHelpers.buildAgentMarkdownFromPersona;
window.getAgentPromptForEdit = AgentHelpers.getAgentPromptForEdit;

// Custom Skills Normalizers
window.normalizeCustomSkill = CustomSkillsNormalizers.normalizeCustomSkill;
window.mergeCustomSkillsIntoRuntime = CustomSkillsNormalizers.mergeCustomSkillsIntoRuntime;
window.getSkillsForManagement = CustomSkillsNormalizers.getSkillsForManagement;
window.getSkillCardDescription = CustomSkillsNormalizers.getSkillCardDescription;
window.getSkillDocumentRef = CustomSkillsNormalizers.getSkillDocumentRef;
window.getCustomSkillIdFromName = CustomSkillsNormalizers.getCustomSkillIdFromName;

// ============================================
// ESTADO GLOBAL (mantido para compatibilidade)
// ============================================

var worionAskSelectionText = '';
var worionAskSelectionCandidateText = '';
var worionAskSelectionCandidateContext = null;
var activeAskSelectionContext = null;
var worionSelectionPointerDown = false;
window.agentsState = window.agentsState || {
  view: 'list',
  selectedAgentId: null,
  editingAgentDraft: null,
  activeConversationAgentId: null,
  searchQuery: ''
};

window.worionAskSelectionText = worionAskSelectionText;
window.worionAskSelectionCandidateText = worionAskSelectionCandidateText;
window.worionAskSelectionCandidateContext = worionAskSelectionCandidateContext;
window.activeAskSelectionContext = activeAskSelectionContext;

// ============================================
// INICIALIZAÇàO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  MarkdownRenderer.initializeFileLinks();
});

// ============================================
// FUNÇÕES QUE PERMANECEM NO UI.JS
// (O restante do código original continua abaixo)
// ============================================


// Funções específicas que ficam no ui.js
function openLocalFile(filePath) {
  const { shell } = require('electron');
  console.log('[UI] Abrindo arquivo:', filePath);
  shell.openPath(filePath).then(error => {
    if (error) {
      console.error('[UI] Erro ao abrir arquivo:', error);
      alert(`Não foi possível abrir o arquivo: ${error}`);
    } else {
      console.log('[UI] Arquivo aberto com sucesso');
    }
  });
}
window.openLocalFile = openLocalFile;

function renderAttachmentSummary(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return '';
  const imageExts = /\.(png|jpg|jpeg|webp|gif|bmp)$/i;
  return `<div class="message-attachments">${attachments.map(att => {
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
  }).join('')}</div>`;
}
window.renderAttachmentSummary = renderAttachmentSummary;

function updateAskSelectionComposerSlot() {
  document.querySelectorAll('[data-ask-selection-slot]').forEach(slot => {
    slot.innerHTML = renderAskSelectionComposerContext();
  });
}
window.updateAskSelectionComposerSlot = updateAskSelectionComposerSlot;

function clearComposerStateForNewChat() {
  const chatInput = document.getElementById('chat-in');
  const homeInput = document.getElementById('home-chat-in');
  if (chatInput) {
    chatInput.value = '';
    chatInput.style.height = 'auto';
  }
  if (homeInput) {
    homeInput.value = '';
    homeInput.style.height = 'auto';
  }
  if (typeof attachedFiles !== 'undefined' && Array.isArray(attachedFiles)) attachedFiles = [];
  clearAskSelectionContext();
  if (typeof updateAttachmentsPreview === 'function') updateAttachmentsPreview();
  if (typeof pendingArtifactRequest !== 'undefined') pendingArtifactRequest = null;
  document.querySelectorAll('[data-inline-context], .inline-context-chip, .upload-preview').forEach(node => node.remove());
  console.log('[NEW CHAT] composer state reset');
  console.log('[NEW CHAT] attachments cleared');
}
window.clearComposerStateForNewChat = clearComposerStateForNewChat;

// Event listeners para seleçào de texto
document.addEventListener('selectionchange', () => {
  if (worionSelectionPointerDown) return;
  if (document.querySelector('.memory-project-page,.memory-project-modal-backdrop')) {
    closeAskSelectionPopover();
    return;
  }
  window.clearTimeout(window.__worionAskSelectionTimer);
  window.__worionAskSelectionTimer = window.setTimeout(showAskSelectionPopover, 160);
});

document.addEventListener('mousedown', event => {
  worionSelectionPointerDown = true;
  if (event.target.closest?.('#worion-ask-selection-popover,#worion-ask-selection-modal')) return;
  closeAskSelectionPopover();
});

document.addEventListener('mouseup', () => {
  worionSelectionPointerDown = false;
  if (document.querySelector('.memory-project-page,.memory-project-modal-backdrop')) {
    closeAskSelectionPopover();
    return;
  }
  window.clearTimeout(window.__worionAskSelectionTimer);
  window.__worionAskSelectionTimer = window.setTimeout(showAskSelectionPopover, 80);
});

document.addEventListener('touchend', () => {
  worionSelectionPointerDown = false;
  if (document.querySelector('.memory-project-page,.memory-project-modal-backdrop')) {
    closeAskSelectionPopover();
    return;
  }
  window.clearTimeout(window.__worionAskSelectionTimer);
  window.__worionAskSelectionTimer = window.setTimeout(showAskSelectionPopover, 120);
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.shiftKey || event.defaultPrevented) return;
  const input = event.target?.closest?.('textarea[data-chat-input="true"]');
  if (!input) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  window.getSelection?.()?.removeAllRanges?.();

  if (input.id === 'home-chat-in' && typeof startNewChatFromHome === 'function') {
    Promise.resolve(startNewChatFromHome()).catch(error => console.error('[COMPOSER] erro ao enviar da home:', error));
    return;
  }
  if (typeof window.sendMsg === 'function') {
    Promise.resolve(window.sendMsg()).catch(error => console.error('[COMPOSER] erro ao enviar mensagem:', error));
  }
}, true);

function renderChatPanel() {
  // Debug silenciado
  // console.log('[RENDER CHAT] messages count:', messages.length, 'user:', messages.filter(m => m.role === 'user').length, 'assistant:', messages.filter(m => m.role === 'assistant').length);
  const panel = document.getElementById('main');
  const skill = getActiveSkill();
  const workModes = getActiveWorkModes();
  const isAgentChat = window.currentChatSource === 'agent';
  const activeLabel = skill?.name || (workModes.length ? workModes.map(mode => mode.name).join(' + ') : null) || 'Novo Chat';
  const title = currentProjectContext ? `${activeLabel} / ${currentProjectContext.title}` : activeLabel;
  const agentLabel = currentAgent?.name || 'Agente';
  const memoryContextChip = window.currentMemoryChatTitle
    ? `<div class="chat-memory-context-chip"><i class="ti ti-pin"></i><span>Usando: ${escapeHtml(window.currentMemoryChatTitle)}</span></div>`
    : '';
  const messagesHtml = messages.map((message, index) => renderMessageHtml(message, index)).join('');
  // console.log('[RENDER CHAT] messagesHtml length:', messagesHtml.length);

  panel.innerHTML = `
    <div class="chat-panel chat-panel-full same-room-chat">
      <div class="chat-main">
        <div class="chat-header">
          <div class="chat-header-left">
            <button class="chat-back" onclick="showHomeView()" title="Novo Chat">
              <i class="ti ti-arrow-left"></i>
            </button>
            <span class="chat-name">${escapeHtml(title)}</span>
            ${isAgentChat ? `<span class="chat-agent-badge"><i class="ti ti-robot" aria-hidden="true"></i> Agente: ${escapeHtml(agentLabel)}</span>` : ''}
          </div>
        </div>
        <div class="chat-messages" id="chat-msgs">
          ${messagesHtml}
          ${renderExecutionStatus()}
        </div>
        <div class="chat-input-wrap">
          <div class="chat-input-container">
            <div id="attachments-preview" class="attachments-preview" style="display:none"></div>
            <div data-ask-selection-slot>${renderAskSelectionComposerContext()}</div>
            ${memoryContextChip}
            <div class="chat-composer-toolbar">
              <button class="chat-attach-btn" onclick="triggerFileUpload()" title="Adicionar"><i class="ti ti-plus"></i></button>
              <textarea id="chat-in" data-chat-input="true" placeholder="${getAskSelectionContextText() ? 'Pergunte qualquer coisa' : 'O que vc está pensando...'}" rows="1" spellcheck="true" lang="pt-BR" oninput="autoResizeTextarea(this)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();window.sendMsg()}"></textarea>
              <div class="chat-composer-actions">
                ${renderModelSelector()}
                ${renderWorkModeSelector()}
                <button class="chat-send${isAssistantResponding ? ' stop' : ''}" onclick="${isAssistantResponding ? 'interruptCurrentResponse()' : 'window.sendMsg()'}" title="${isAssistantResponding ? 'Interromper resposta' : 'Enviar'}">
                  <i class="ti ${isAssistantResponding ? 'ti-player-stop-filled' : 'ti-send'}"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="ai-disclaimer">A IA pode cometer erros. Fa&ccedil;a uma verifica&ccedil;&atilde;o antes de assumir tudo como verdade factual.</div>
        </div>
      </div>
    </div>`;
  scrollChatToBottom();
  setTimeout(() => {
    setupDragAndDrop();
    setupPasteHandler();
    focusComposerInput();
  }, 100);
}

function renderGoalProgress() {
  return '';
}

function renderCards(list) {
  const area = document.getElementById('cards-area');
  if (!area) return;
  if (list.length === 0) {
    area.innerHTML = '<div class="empty-panel"><i class="ti ti-robot"></i><p>Nenhum agente encontrado.<br>Use Novo agente para criar um agente personalizado.</p></div>';
    return;
  }

  area.innerHTML = AgentCardRenderer.renderAgentCard(list, selected);
}
window.renderCards = renderCards;

function getAgentConversationHistory(agentId) {
  if (!agentId || !Array.isArray(conversations)) return [];
  return conversations
    .filter(conversation =>
      conversation?.agentId === agentId ||
      conversation?.currentAgentId === agentId ||
      conversation?.activeAgentId === agentId ||
      conversation?.metadata?.agentId === agentId ||
      conversation?.isAgentSession && conversation?.agent?.id === agentId
    )
    .slice(0, 8);
}

const CUSTOM_SKILLS_PATH = path.join(DATA_DIR, 'custom-skills.json');
const CUSTOM_SKILL_DOCS_DIR = path.join(DATA_DIR, 'skill-documents');
var customSkillsLoaded = false;
var pendingSkillDocuments = [];

function normalizeCustomSkill(skill = {}) {
  return CustomSkillsNormalizers.normalizeCustomSkill(skill);
}

function mergeCustomSkillsIntoRuntime(customSkills = []) {
  return CustomSkillsNormalizers.mergeCustomSkillsIntoRuntime(customSkills);
}

function loadCustomSkillsSync() {
  if (customSkillsLoaded) return QUICK_SKILLS;
  customSkillsLoaded = true;

  try {
    const fsSync = require('fs');
    if (!fsSync.existsSync(CUSTOM_SKILLS_PATH)) {
      mergeCustomSkillsIntoRuntime([]);
      return QUICK_SKILLS;
    }
    const parsed = JSON.parse(fsSync.readFileSync(CUSTOM_SKILLS_PATH, 'utf-8'));
    const customSkills = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.skills) ? parsed.skills : []);
    mergeCustomSkillsIntoRuntime(customSkills);
  } catch (error) {
    console.warn('[Skills] Nao foi possivel carregar skills personalizadas:', error.message);
  }

  return QUICK_SKILLS;
}

async function saveCustomSkillsToDisk() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const customSkills = (Array.isArray(QUICK_SKILLS) ? QUICK_SKILLS : [])
    .filter(skill => skill.customManaged)
    .map(skill => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      description: skill.description || skill.desc || '',
      prompt: skill.prompt || '',
      icon: skill.icon || 'ti-sparkles',
      documents: Array.isArray(skill.documents) ? skill.documents : [],
      customManaged: true,
      updatedAt: skill.updatedAt || new Date().toISOString()
    }));
  await fs.writeFile(CUSTOM_SKILLS_PATH, JSON.stringify({ skills: customSkills }, null, 2), 'utf-8');
}

function getSkillsForManagement() {
  loadCustomSkillsSync();
  return CustomSkillsNormalizers.getSkillsForManagement();
}

function getSkillCardDescription(skill) {
  return CustomSkillsNormalizers.getSkillCardDescription(skill);
}

function renderSkillCards(list = getSkillsForManagement()) {
  const area = document.getElementById('skills-cards-area');
  if (!area) return;
  if (list.length === 0) {
    area.innerHTML = '<div class="empty-panel"><i class="ti ti-sparkles"></i><p>Nenhuma skill encontrada.</p></div>';
    return;
  }

  area.innerHTML = list.map(skill => {
    const category = skill.category || 'Sem categoria';
    return `
      <div class="agent-card${activeSkillId === skill.id ? ' selected' : ''}" onclick="startSkillChat('${skill.id}')">
        <div class="card-header">
          <span class="card-title">${escapeHtml(skill.name)}</span>
          <span class="card-badge badge-green">Ativo</span>
        </div>
        <div class="card-desc">${escapeHtml(getSkillCardDescription(skill))}</div>
        <div class="card-footer">
          <span class="card-time">Categoria</span>
          <div class="card-tags">
            <span class="tag">${escapeHtml(category)}</span>
            ${Array.isArray(skill.documents) && skill.documents.length ? `<span class="tag">${skill.documents.length} docs</span>` : ''}
          </div>
        </div>
        <div class="agent-card-actions">
          <button class="btn-small" onclick="event.stopPropagation();openSkillEditor('${skill.id}')" title="Editar skill">
            <i class="ti ti-pencil"></i> Editar
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderConversationList() {
  const area = document.getElementById('conversations-area');
  if (!area) return;
  if (conversations.length === 0) {
    area.innerHTML = '<div class="empty-panel"><i class="ti ti-message"></i><p>Nenhuma conversa local ainda.<br>Use Novo Chat para começar.</p></div>';
    return;
  }
  area.innerHTML = conversations.map(session => `
    <div class="session-row" onclick="openConversation('${session.id}')">
      <div>
        <div class="session-title">${escapeHtml(session.title)}</div>
        <div class="session-meta">Agente: ${escapeHtml(session.agentName)}</div>
      </div>
      <span class="session-meta">${escapeHtml(session.updated)}</span>
    </div>
  `).join('');
}

function renderSidebarSkills() {
  const sidebar = document.getElementById('sidebar-skills');
  if (!sidebar) return;
  loadCustomSkillsSync();
  const group = document.getElementById('sidebar-skills-group');
  if (group) group.open = Boolean(activeSkillId);
  setupSidebarSkillsViewLink();
  // As categorias agora pertencem a skills.js; a UI apenas renderiza a lista recebida.
  const baseCategories = typeof getSkillCategories === 'function'
    ? getSkillCategories()
    : ['Foco e Aprendizagem', 'Estudantes', 'Pesquisa', 'Escrita', 'Produtividade', 'Negocios', 'Desenvolvimento', 'Espiritualidade'];
  const categories = Array.from(new Set([
    ...baseCategories,
    ...QUICK_SKILLS.map(skill => skill.category || 'Personalizadas')
  ]));
  sidebar.innerHTML = categories.map(category => {
    const skills = QUICK_SKILLS.filter(skill => skill.category === category);
    if (!skills.length) return '';
    const isOpen = skills.some(skill => skill.id === activeSkillId);
    return `
      <details class="skill-category"${isOpen ? ' open' : ''}>
        <summary><i class="ti ti-chevron-right" aria-hidden="true"></i>${escapeHtml(category)}</summary>
        <div class="skill-category-models">
          ${skills.map(skill => `
            <div class="sidebar-btn skill-btn${activeSkillId === skill.id ? ' active' : ''}" onclick="startSkillChat('${skill.id}')">
              <i class="ti ${skill.icon}" aria-hidden="true"></i> ${escapeHtml(skill.name)}
            </div>
          `).join('')}
        </div>
      </details>`;
  }).join('');
}

function setupSidebarSkillsViewLink() {
  const group = document.getElementById('sidebar-skills-group');
  const summary = group?.querySelector('.sidebar-summary');
  if (!summary) return;

  summary.dataset.view = 'skills';
  if (summary.dataset.skillsViewBound === 'true') return;

  summary.dataset.skillsViewBound = 'true';
  summary.addEventListener('click', () => {
    setTimeout(() => {
      showSkillsView().catch(error => console.error('Erro ao abrir Skills:', error));
    }, 0);
  });
}

function filterSkillCards(v) {
  const filtered = SkillFilters.filterSkills(
    getSkillsForManagement(),
    v,
    getSkillCardDescription
  );
  renderSkillCards(filtered);
}

function getFriendlyExecutionLabel(status = executionStatus, explicitLabel = executionStatusLabel) {
  if (explicitLabel) return explicitLabel;
  if (!status) return '';
  return TOOL_STATUS_LABELS?.[status] || TOOL_STATUS_LABELS?.default || 'Worion está analisando sua mensagem...';
}

function renderExecutionStatus() {
  const label = getFriendlyExecutionLabel();
  return `
    <div class="execution-status-slot">
      <div class="execution-status${label ? ' active' : ''}" id="executionStatus">
        <span id="executionStatusLabel" class="execution-label">${escapeHtml(label)}</span>
      </div>
    </div>`;
}

function updateExecutionStatus() {
  const status = document.getElementById('executionStatus');
  if (!status) return;
  const label = getFriendlyExecutionLabel();
  const labelEl = document.getElementById('executionStatusLabel') || status.querySelector('.execution-label');
  if (labelEl) labelEl.textContent = label;
  status.classList.toggle('active', Boolean(label));
}

function showExecutionStatus(label) {
  if (!isAssistantResponding) return;
  executionStatusLabel = label || TOOL_STATUS_LABELS?.default || 'Worion está analisando sua mensagem...';
  executionStatusTrail = [];
  updateExecutionStatus();
}

function hideExecutionStatus() {
  executionStatus = null;
  executionStatusLabel = '';
  executionStatusTrail = [];
  activeExecutionCount = 0;
  updateExecutionStatus();
}

function copyMessageContent(button) {
  const text = button?.dataset?.copy || '';
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    button.classList.add('copied');
    const icon = button.querySelector('i');
    if (icon) icon.className = 'ti ti-check';
    setTimeout(() => {
      button.classList.remove('copied');
      if (icon) icon.className = 'ti ti-copy';
    }, 1200);
  }).catch(error => {
    console.error('Erro ao copiar mensagem:', error);
  });
}

function waitForTypingFrame(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTypingWordsPerFrame(text) {
  const length = String(text || '').length;
  if (length > 4200) return 5;
  if (length > 2400) return 4;
  if (length > 1200) return 3;
  return 2;
}

function createAssistantTypingFrames(text) {
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

    const endsThought = /[.!?\u2026]\s*$/.test(token);
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

function getAssistantTypingDelay(previousText, nextText, fullText) {
  const added = nextText.slice(previousText.length);
  const length = String(fullText || '').length;
  const base = length > 4200 ? 48 : length > 2400 ? 58 : length > 1200 ? 72 : 88;

  if (/\n\s*\n\s*$/.test(nextText)) return base + 360;
  if (/\n\s*$/.test(nextText)) return base + 180;
  if (/[.!?\u2026]\s*$/.test(added.trim())) return base + 260;
  if (/[:;]\s*$/.test(added.trim())) return base + 180;
  if (/,\s*$/.test(added.trim())) return base + 90;
  return base + Math.min(90, Math.max(0, added.length - 10) * 4);
}

async function animateAssistantReply(messageIndex, fullText) {
  const text = prepareAssistantDisplayMarkdown(fullText);
  const createdAt = new Date().toISOString();
  messages[messageIndex] = { role: 'assistant', content: '', isTyping: true, createdAt };
  renderChatPanel();
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();

  const contentEl = document.getElementById(`assistant-message-content-${messageIndex}`);
  if (!contentEl || !text) {
    messages[messageIndex] = { role: 'assistant', content: text, createdAt };
    renderChatPanel();
    return;
  }

  const frames = createAssistantTypingFrames(text);
  let previousPartial = '';

  for (const frameIndex of frames) {
    if (responseAbortRequested) {
      messages[messageIndex] = { role: 'assistant', content: previousPartial || 'Resposta interrompida.', createdAt };
      renderChatPanel();
      return;
    }
    const partial = text.slice(0, frameIndex);
    messages[messageIndex].content = partial;
    contentEl.innerHTML = renderAssistantTypingContent(partial);
    if (window.__worionAutoScrollPaused) {
      const box = document.getElementById('chat-msgs');
      if (box && Number.isFinite(window.__worionPausedScrollTop)) box.scrollTop = window.__worionPausedScrollTop;
    } else {
      scrollChatToBottom();
    }
    await waitForTypingFrame(getAssistantTypingDelay(previousPartial, partial, text));
    previousPartial = partial;
  }

  messages[messageIndex] = { role: 'assistant', content: text, createdAt };
  renderChatPanel();
}

function openSearchOverlay() {
  closeSearchOverlay();
  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.id = 'search-overlay';
  overlay.innerHTML = `
    <div class="search-card" onclick="event.stopPropagation()">
      <div class="search-card-header">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input id="global-search-input" placeholder="Pesquisar conversas, projetos e memórias..." oninput="searchWorionContent(this.value)" autofocus>
        <button class="panel-close" onclick="closeSearchOverlay()"><i class="ti ti-x"></i></button>
      </div>
      <div id="global-search-results" class="search-results">
        <div class="search-empty">Digite para pesquisar no Worion.</div>
      </div>
    </div>`;
  overlay.addEventListener('click', closeSearchOverlay);
  document.body.appendChild(overlay);
  setActiveView('search');
  setTimeout(() => document.getElementById('global-search-input')?.focus(), 20);
}

function closeSearchOverlay() {
  document.getElementById('search-overlay')?.remove();
}

async function searchWorionContent(query) {
  const area = document.getElementById('global-search-results');
  if (!area) return;
  const term = String(query || '').trim().toLowerCase();
  if (term.length < 2) {
    area.innerHTML = '<div class="search-empty">Digite pelo menos 2 caracteres.</div>';
    return;
  }

  area.innerHTML = `<div class="loading">${typeof getWorionStatusLabel === 'function' ? getWorionStatusLabel('sources') : 'Worion: buscando fontes externas...'}</div>`;
  const results = [];

  try {
    const localConversations = await loadLocalConversations();
    localConversations
      .filter(item => `${item.title} ${item.agentName}`.toLowerCase().includes(term))
      .slice(0, 12)
      .forEach(item => results.push({
        type: 'conversation',
        id: item.id,
        title: item.title,
        meta: `Conversa · ${item.agentName} · ${item.updated}`,
        icon: 'ti-message'
      }));
  } catch (error) {
    console.warn('[Search] conversas indisponiveis:', error.message);
  }

  try {
    const localProjects = await loadLocalProjects();
    localProjects
      .filter(item => `${item.title || item.name || ''} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase().includes(term))
      .slice(0, 12)
      .forEach(item => results.push({
        type: 'project',
        id: item.id,
        title: item.title || item.name || 'Projeto sem titulo',
        meta: `Projeto · ${item.description || 'sem descrição'}`,
        icon: 'ti-folder'
      }));
  } catch (error) {
    console.warn('[Search] projetos indisponiveis:', error.message);
  }

  try {
    const memory = await memorySearch(term, '', 8);
    (memory.results || []).forEach(item => results.push({
      type: 'memory',
      id: item.conversation_id,
      title: item.snippet || item.conversation_id,
      meta: `Memória · ${item.source_id || 'worion'}`,
      icon: 'ti-database'
    }));
  } catch (error) {
    console.warn('[Search] Memória indisponivel:', error.message);
  }

  if (!results.length) {
    area.innerHTML = '<div class="search-empty">Nenhum resultado encontrado.</div>';
    return;
  }

  area.innerHTML = results.slice(0, 30).map(item => `
    <button class="search-result" onclick="openSearchResult('${item.type}','${escapeHtml(item.id)}')">
      <i class="ti ${item.icon}" aria-hidden="true"></i>
      <span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.meta)}</small>
      </span>
    </button>
  `).join('');
}

async function openSearchResult(type, id) {
  closeSearchOverlay();
  if (type === 'project') {
    projects = await loadLocalProjects();
    await openProjectChat(id);
    return;
  }
  await openConversation(id);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSearchOverlay();
});

function renderSidebarConversations() {
  const sidebar = document.getElementById('sidebar-conversations');
  if (!sidebar) return;
  if (!conversations.length) {
    sidebar.innerHTML = '<div class="sidebar-conversation"><div class="sidebar-conversation-title">Sem conversas ainda</div></div>';
    return;
  }
  sidebar.innerHTML = conversations.slice(0, 40).map(session => `
    <div class="sidebar-conversation${session.id === currentConversationId ? ' active' : ''}" onclick="openConversation('${session.id}')">
      <div class="sidebar-conversation-title">${escapeHtml(session.title)}</div>
      <div class="sidebar-conversation-meta">${escapeHtml(session.agentName)} · ${escapeHtml(session.updated)}</div>
    </div>
  `).join('');
}

async function refreshSidebarConversations() {
  conversations = await loadLocalConversations();
  if (typeof loadLocalProjects === 'function') {
    projects = await loadLocalProjects().catch(() => projects || []);
  }
  renderSidebarProjects();
  renderSidebarConversations();
}
window.refreshSidebarConversations = refreshSidebarConversations;

function renderSidebarProjects() {
  const sidebar = document.getElementById('sidebar-projects');
  if (!sidebar) return;
  const visibleProjects = (projects || []).slice(0, 10);
  if (!visibleProjects.length) {
    sidebar.innerHTML = '<div class="sidebar-project-empty">Sem projetos ainda</div>';
    return;
  }
  sidebar.innerHTML = visibleProjects.map(project => `
    <div class="sidebar-project${currentProjectContext?.id === project.id ? ' active' : ''}" onclick="openProjectChat('${project.id}')">
      <i class="ti ti-folder" aria-hidden="true"></i>
      <span>${escapeHtml(project.name || project.title || 'Projeto')}</span>
    </div>
  `).join('');
}

function scrollChatToBottom() {
  if (window.__worionAutoScrollPaused) return;
  setTimeout(() => {
    if (window.__worionAutoScrollPaused) return;
    const box = document.getElementById('chat-msgs');
    if (box) {
      box.scrollTop = box.scrollHeight;
      // Debug silenciado
      // console.log('[SCROLL] scrollTop set to:', box.scrollHeight, 'actual:', box.scrollTop);
    }
  }, 100);
}

function collapseSidebarForDetailView() {
  document.body.classList.add('sidebar-collapsed');
  try { localStorage.setItem('worion_sidebar_collapsed', 'true'); } catch {}
  const icon = document.querySelector('.sidebar-toggle-btn i');
  if (icon) icon.className = 'ti ti-layout-sidebar-left-expand';
}

function pauseWorionAutoScroll(event = null) {
  window.__worionAutoScrollPaused = true;
  const box = document.getElementById('chat-msgs');
  if (box) window.__worionPausedScrollTop = box.scrollTop;
  if (event?.currentTarget) {
    event.currentTarget.classList.add('reading-paused');
  }
}

function resumeWorionAutoScroll() {
  window.__worionAutoScrollPaused = false;
  window.__worionPausedScrollTop = null;
  scrollChatToBottom();
}

if (typeof window !== 'undefined') {
  window.pauseWorionAutoScroll = pauseWorionAutoScroll;
  window.resumeWorionAutoScroll = resumeWorionAutoScroll;
}

async function deleteSidebarConversation(id) {
  const conversationId = String(id || '').trim();
  if (!conversationId) return;
  const confirmed = await showConfirmModal({
    title: 'Excluir conversa?',
    message: 'Essa açào remove esta conversa da lista. Deseja continuar?',
    cancelLabel: 'Cancelar',
    confirmLabel: 'Excluir conversa',
    destructive: true
  });
  if (!confirmed) return;

  const deletingCurrentConversation = conversationId === currentConversationId;

  try {
    await deleteMemorySessionEverywhere(conversationId);
    if (deletingCurrentConversation) {
      currentConversationId = null;
      messages = [];
      sessionStartedAt = null;
      sessionSaved = false;
      autoSaveNotion = false;
      DEFERRED_ACTIONS = [];
      currentTurnPolicy = {
        explicitNotionWriteAuthorized: false,
        deferNotionWrite: false,
        shouldExecuteDeferredNow: false
      };
    }
    await refreshSidebarConversations();
  } catch (error) {
    console.error('Erro ao excluir conversa:', error);
    alert(`Erro ao excluir conversa: ${error.message}`);
    return;
  }

  if (deletingCurrentConversation) {
    await showHomeView();
  }
}

renderSidebarConversations = function renderSidebarConversationsWithDelete() {
  const sidebar = document.getElementById('sidebar-conversations');
  if (!sidebar) return;
  if (!conversations.length) {
    sidebar.innerHTML = '<div class="sidebar-conversation"><div class="sidebar-conversation-title">Sem conversas ainda</div></div>';
    return;
  }
  sidebar.innerHTML = conversations.slice(0, 40).map(session => `
    <div class="sidebar-conversation${session.id === currentConversationId ? ' active' : ''}" onclick="openConversation('${session.id}')">
      <div class="sidebar-conversation-main">
        <div class="sidebar-conversation-title">${escapeHtml(session.title)}</div>
        <div class="sidebar-conversation-meta">${escapeHtml(session.agentName)} · ${escapeHtml(session.updated)}</div>
      </div>
      <div class="sidebar-conversation-actions" onclick="event.stopPropagation()">
        <button class="sidebar-conversation-menu-btn" title="Menu da conversa" aria-label="Menu da conversa">
          <i class="ti ti-dots"></i>
        </button>
        <div class="conversation-hover-menu" role="menu" aria-label="Menu da Conversa">
          <div class="conversation-hover-title">Menu da Conversa</div>
          <button onclick="shareConversation('${session.id}')"><i class="ti ti-share"></i> Compartilhar</button>
          <button onclick="startGroupChatFromConversation('${session.id}')"><i class="ti ti-users"></i> Iniciar chat em grupo</button>
          <button onclick="renameConversation('${session.id}')"><i class="ti ti-pencil"></i> Renomear conversa</button>
          <button onclick="openMoveConversationToProjectModal('${session.id}')"><i class="ti ti-folder-symlink"></i> Mover para projeto</button>
          <button onclick="togglePinConversation('${session.id}')"><i class="ti ti-pin"></i> Fixar conversa</button>
          <button onclick="archiveConversation('${session.id}')"><i class="ti ti-archive"></i> Arquivar conversa</button>
          <button class="danger" onclick="deleteSidebarConversation('${session.id}')"><i class="ti ti-trash"></i> Excluir conversa</button>
        </div>
      </div>
    </div>
  `).join('');
};

async function updateConversationMetadata(id, updater) {
  const convo = await readConversationFile(id);
  const next = updater({ ...convo }) || convo;
  next.updatedAt = new Date().toISOString();
  next.id = next.id || next.conversationId || id;
  next.conversationId = next.conversationId || next.id;
  await fs.writeFile(getConversationPath(id), JSON.stringify(next, null, 2), 'utf-8');
  if (typeof saveMemorySessionToSupabase === 'function') {
    await saveMemorySessionToSupabase(next);
  }
  await refreshSidebarConversations();
  if (currentConversationId === id && chatMode) renderChatPanel();
  return next;
}

async function shareConversation(id) {
  const convo = await readConversationFile(id);
  const text = [
    convo.title || 'Conversa Worion',
    '',
    ...(convo.messages || [])
      .filter(item => ['user', 'assistant'].includes(item.role))
      .map(item => `${item.role === 'user' ? 'Usuario' : 'Worion'}: ${item.content || ''}`)
  ].join('\n').slice(0, 12000);
  await navigator.clipboard.writeText(text).catch(() => {});
  alert('Conversa copiada para a area de transferencia.');
}

async function startGroupChatFromConversation(id) {
  const convo = await readConversationFile(id);
  currentConversationId = null;
  messages = [
    { role: 'assistant', content: `Chat em grupo iniciado a partir de "${convo.title || 'conversa'}". Adicione participantes, papeis ou agentes que devem entrar nesta sala.`, createdAt: new Date().toISOString() }
  ];
  currentAgent = getDefaultAgent();
  selected = currentAgent?.id || null;
  window.currentChatSource = 'home';
  await startChat({ keepMessages: true, loadHistory: false });
}

async function renameConversation(id) {
  const convo = await readConversationFile(id);
  const title = prompt('Novo nome da conversa', convo.title || '');
  if (!title || !title.trim()) return;
  await updateConversationMetadata(id, item => ({ ...item, title: title.trim() }));
}

async function togglePinConversation(id) {
  await updateConversationMetadata(id, item => ({ ...item, pinned: !item.pinned }));
}

async function archiveConversation(id) {
  if (!confirm('Arquivar esta conversa?')) return;
  await updateConversationMetadata(id, item => ({ ...item, archived: true }));
}

async function openMoveConversationToProjectModal(id) {
  projects = await loadLocalProjects();
  const options = projects.map(project => `<option value="${project.id}">${escapeHtml(project.name || project.title)}</option>`).join('');
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'move-conversation-project-modal';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h2>Mover para projeto</h2>
        <button class="panel-close" onclick="closeMoveConversationToProjectModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-field">
          <div class="field-label">PROJETO</div>
          <select id="move-conversation-project-select" class="template-select">
            ${options || '<option value="">Nenhum projeto disponivel</option>'}
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-edit" onclick="closeMoveConversationToProjectModal()">Cancelar</button>
        <button class="btn-chat" onclick="moveConversationToProject('${id}')"><i class="ti ti-folder-symlink"></i> Mover</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function closeMoveConversationToProjectModal() {
  document.getElementById('move-conversation-project-modal')?.remove();
}

async function moveConversationToProject(id) {
  const projectId = document.getElementById('move-conversation-project-select')?.value;
  if (!projectId) return;
  const convo = await readConversationFile(id);
  const project = (await loadLocalProjects()).find(item => item.id === projectId);
  if (!project) return;
  project.conversations = [
    ...(Array.isArray(project.conversations) ? project.conversations.filter(item => item.id !== id) : []),
    { id, title: convo.title || 'Conversa sem titulo', updatedAt: new Date().toISOString() }
  ];
  await saveProject(project);
  await updateConversationMetadata(id, item => ({ ...item, projectId, projectTitle: project.name || project.title }));
  closeMoveConversationToProjectModal();
}

function autoResizeTextarea(textarea) {
  const maxHeight = textarea.id === 'home-chat-in' ? 300 : 320;
  textarea.style.height = 'auto';
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = nextHeight + 'px';
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

function renderSkillChips(onClick = 'setActiveSkillFromChip') {
  return '';
}

function renderWorkModeChips() {
  return '';
}

function getWorkModeShortLabel(mode) {
  if (!mode) return 'Normal';
  if (mode.id === 'deep-thinking') return 'Profundo';
  if (mode.id === 'smart-research') return 'Pesquisa';
  if (mode.id === 'document-generation') return 'Docs';
  return mode.name.split(/\s+/).slice(0, 2).join(' ');
}

function getWorkModeSelectorLabel(modes = getActiveWorkModes()) {
  if (!modes.length) return 'Normal';
  if (modes.length === 1) return getWorkModeShortLabel(modes[0]);
  return `${modes.length} modos`;
}

// Variável global para seleçào manual de modelo
window.manualSelectedModel = null;

function getAvailableModels() {
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

function setManualModel(modelId) {
  window.manualSelectedModel = modelId === 'auto' ? null : modelId;
  refreshComposerControls();
  console.log('[MODEL SELECTOR] Modelo manual selecionado:', window.manualSelectedModel);
}

function getModelSelectorLabel() {
  if (!window.manualSelectedModel) return 'Auto';
  const model = getAvailableModels().find(m => m.id === window.manualSelectedModel);
  return model ? model.name.split('(')[0].trim() : 'Auto';
}

function renderModelSelector() {
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

function getAgentSelectorLabel() {
  return currentAgent?.name || 'Padrào';
}

function setComposerAgent(agentId) {
  const nextAgent = agents.find(agent => agent.id === agentId) || getDefaultAgent();
  if (!nextAgent) return;
  selected = nextAgent.id;
  currentAgent = nextAgent;
  refreshComposerControls();
  const chatName = document.querySelector('.same-room-chat .chat-name');
  if (chatName && !currentProjectContext && !getActiveSkill() && !getActiveWorkModes().length) {
    chatName.textContent = nextAgent.name || 'Novo Chat';
  }
}

function renderAgentSelector() {
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

function getSkillSelectorLabel() {
  const skill = getActiveSkill();
  return skill ? skill.name : 'Skills';
}

function setComposerSkill(skillId) {
  if (!skillId) {
    activeSkillId = null;
  } else {
    activeSkillId = skillId;
    activeWorkModeId = null;
    activeWorkModeIds = [];
  }
  refreshComposerControls();
  if (typeof renderSidebarSkills === 'function') renderSidebarSkills();
  const chatName = document.querySelector('.same-room-chat .chat-name');
  const skill = getActiveSkill();
  if (chatName && !currentProjectContext) chatName.textContent = skill?.name || 'Novo Chat';
}

function renderSkillSelector() {
  loadCustomSkillsSync();
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

function renderWorkModeSelector() {
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

function refreshComposerControls() {
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


function renderActiveSkillStatus() {
  const skill = getActiveSkill();
  if (skill) return `<div class="skill-status"><i class="ti ${skill.icon}"></i><span>Skill ativa: ${escapeHtml(skill.name)}</span></div>`;
  const workMode = getActiveWorkMode();
  const workModes = getActiveWorkModes();
  if (workModes.length) return `<div class="skill-status"><i class="ti ${workModes.length > 1 ? 'ti-adjustments' : workModes[0].icon}"></i><span>Modos ativos: ${escapeHtml(workModes.map(mode => mode.name).join(' + '))}</span></div>`;
  return `<div class="skill-status"><i class="ti ti-message"></i><span>Novo Chat sem skill ativa</span></div>`;
}

function closeComposerModeMenu() {
  document.querySelectorAll('.composer-mode[open]').forEach(menu => {
    menu.removeAttribute('open');
  });
}

if (typeof window !== 'undefined' && !window.__worionComposerModeListener) {
  window.__worionComposerModeListener = true;
  document.addEventListener('click', event => {
    if (!event.target.closest?.('.composer-mode')) closeComposerModeMenu();
  });
}

function getLoadingStatus() {
  if (currentGoalRun) {
    if (currentGoalRun.status === 'cancelado') return 'Cancelado pelo usuario...';
    const step = currentGoalRun.step || 1;
    const total = currentGoalRun.totalSteps || 8;
    return `Executando workflow... etapa ${step} de ${total}`;
  }
  if (executionStatus) return getFriendlyExecutionLabel();
  if (pendingArtifactRequest?.type === 'pdf') return typeof getWorionStatusLabel === 'function' ? getWorionStatusLabel('composing') : 'Worion está construindo a resposta...';
  const skill = getActiveSkill();
  const workMode = getActiveWorkMode();
  if (skill?.category === 'Pesquisa' || workMode?.id === 'smart-research') return typeof getWorionStatusLabel === 'function' ? getWorionStatusLabel('sources') : 'Worion: buscando fontes externas...';
  if (skill?.category === 'Produtividade' || workMode?.id === 'document-generation') return typeof getWorionStatusLabel === 'function' ? getWorionStatusLabel('composing') : 'Worion está construindo a resposta...';
  return typeof getWorionStatusLabel === 'function' ? getWorionStatusLabel('thinking') : 'Worion está raciocinando...';
}

function setActiveView(view) {
  document.querySelectorAll('.sidebar-btn[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

function toggleProfileMenu() {
  document.getElementById('profile-menu')?.classList.toggle('hidden');
}

async function showSettingsView() {
  await saveCurrentSession({ silent: true });
  document.getElementById('profile-menu')?.classList.add('hidden');
  setActiveView('');
  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';
  document.getElementById('main').innerHTML = `
    <div class="main-header">
      <span class="main-title">Configuracoes</span>
      <button class="btn-new" onclick="saveSettingsFromView()"><i class="ti ti-device-floppy"></i> Salvar</button>
    </div>
    <div class="settings-layout">
      <div class="settings-tabs">
        <button class="settings-tab active">Geral</button>
        <button class="settings-tab">Conta</button>
        <button class="settings-tab">Preferencias</button>
        <button class="settings-tab">Contexto</button>
      </div>
      <div class="settings-panel">
        <h3 style="font-size:14px;margin-bottom:22px">Perfil</h3>
        <div class="settings-row">
          <label>Nome completo</label>
          <input id="settings-name" value="${escapeHtml(userProfile.name || '')}">
        </div>
        <div class="settings-row">
          <label>Como o Worion deve te chamar?</label>
          <input id="settings-display-name" value="${escapeHtml(userProfile.displayName || '')}">
        </div>
        <div class="settings-row">
          <label>Cidade</label>
          <input id="settings-city" placeholder="Ex: Montes Claros" value="${escapeHtml(userProfile.city || '')}">
        </div>
        <div class="settings-row">
          <label>Email ou identificador local</label>
          <input id="settings-email" value="${escapeHtml(userProfile.email || '')}">
        </div>
        <div class="settings-row" style="align-items:start">
          <label>Quem voce e e o que pretende construir aqui?</label>
          <textarea id="settings-intent">${escapeHtml(userProfile.intent || '')}</textarea>
        </div>
        <div class="settings-row" style="align-items:start">
          <label>O que voce quer que este espaco te devolva?</label>
          <textarea id="settings-return-style">${escapeHtml(userProfile.returnStyle || '')}</textarea>
        </div>
        <div class="settings-row">
          <label>Limite diario discreto (minutos)</label>
          <input id="settings-daily-limit" type="number" min="0" value="${escapeHtml(userProfile.dailyLimitMinutes || 0)}">
        </div>
      </div>
    </div>`;
}

async function saveSettingsFromView() {
  userProfile = {
    ...userProfile,
    name: document.getElementById('settings-name')?.value.trim() || '',
    displayName: document.getElementById('settings-display-name')?.value.trim() || '',
    city: document.getElementById('settings-city')?.value.trim() || '',
    email: document.getElementById('settings-email')?.value.trim() || '',
    intent: document.getElementById('settings-intent')?.value.trim() || '',
    returnStyle: document.getElementById('settings-return-style')?.value.trim() || '',
    dailyLimitMinutes: Number(document.getElementById('settings-daily-limit')?.value || 0)
  };
  await saveUserProfile();
  renderProfileSummary();
}

const AGENT_PERSONA_EXTENSIONS = ['.md', '.txt', '.json', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
const AGENT_TEXT_DOCUMENT_EXTENSIONS = ['.md', '.txt', '.json'];
var pendingAgentDocuments = [];

function isAgentPersonaFile(file) {
  return AgentHelpers.isAgentPersonaFile(file);
}

function getAgentPersonaFiles(fileList) {
  return AgentHelpers.getAgentPersonaFiles(fileList);
}

function setAgentImportStatus(message, isError = false, target = 'library') {
  const id = target === 'editor' ? 'agent-persona-status' : 'agent-import-status';
  const status = document.getElementById(id);
  if (!status) return;
  status.textContent = message || '';
  status.classList.toggle('error', Boolean(isError));
}

function triggerAgentPersonaUpload(target = 'library') {
  if (target !== 'editor') return;
  let input = document.getElementById(`agent-persona-upload-${target}`);
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = `agent-persona-upload-${target}`;
    input.multiple = true;
    input.style.display = 'none';
    input.onchange = event => handleAgentPersonaSelect(event, target);
    document.body.appendChild(input);
  }
  input.accept = AGENT_PERSONA_EXTENSIONS.join(',');
  input.value = '';
  input.click();
}

async function handleAgentPersonaSelect(event, target = 'library') {
  const files = getAgentPersonaFiles(event.target.files);
  if (!files.length) return;

  if (target === 'editor') await appendPersonaFilesToEditor(files);
}

function setupAgentPersonaDropZone(selector, target = 'library') {
  const zone = document.querySelector(selector);
  if (!zone || zone.dataset.agentDropReady === '1') return;
  zone.dataset.agentDropReady = '1';

  const prevent = event => {
    event.preventDefault();
    event.stopPropagation();
  };
  const activate = event => {
    prevent(event);
    zone.classList.add('drag-over');
  };
  const deactivate = event => {
    prevent(event);
    zone.classList.remove('drag-over');
  };

  zone.addEventListener('dragenter', activate);
  zone.addEventListener('dragover', activate);
  zone.addEventListener('dragleave', deactivate);
  zone.addEventListener('drop', async event => {
    deactivate(event);
    const files = getAgentPersonaFiles(event.dataTransfer?.files);
    if (!files.length) return;
    if (target === 'editor') await appendPersonaFilesToEditor(files);
  });
}

async function readAgentPersonaFile(file) {
  const ext = path.extname(file?.name || '').toLowerCase();
  if (!AGENT_TEXT_DOCUMENT_EXTENSIONS.includes(ext)) {
    if (file?.path) return { binary: true, filePath: file.path, content: '' };
    if (typeof file?.arrayBuffer === 'function') {
      const buffer = await file.arrayBuffer();
      return { binary: true, binaryContent: Buffer.from(buffer), content: '' };
    }
    throw new Error(`Nao foi possivel ler ${file.name}`);
  }
  if (typeof readAttachedFile === 'function') {
    const result = await readAttachedFile(file);
    return String(result?.content || '');
  }
  if (typeof readFileAs === 'function') {
    return String(await readFileAs(file, 'text') || '');
  }
  if (file.text) return String(await file.text() || '');
  if (file.path) return fs.readFile(file.path, 'utf-8');
  throw new Error(`Nao foi possivel ler ${file.name}`);
}

function getAgentTitleFromPersona(fileName, text) {
  return AgentHelpers.getAgentTitleFromPersona(fileName, text);
}

function getAgentDescFromPersona(text) {
  return AgentHelpers.getAgentDescFromPersona(text);
}

function sanitizeAgentDocumentName(fileName) {
  return AgentHelpers.sanitizeAgentDocumentName(fileName);
}

function getAgentDocumentRef(agentSlug, fileName) {
  return AgentHelpers.getAgentDocumentRef(agentSlug, fileName);
}

async function getAvailableAgentDocumentFileName(docDir, fileName, reserved = new Set()) {
  const sanitized = sanitizeAgentDocumentName(fileName);
  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);
  let candidate = sanitized;
  let index = 2;

  while (reserved.has(candidate.toLowerCase())) {
    candidate = `${base}-${index}${ext}`;
    index += 1;
  }

  while (true) {
    try {
      await fs.access(path.join(docDir, candidate));
      candidate = `${base}-${index}${ext}`;
      index += 1;
    } catch {
      return candidate;
    }
  }
}

function renderAgentDocumentList() {
  const list = document.getElementById('agent-document-list');
  if (!list) return;

  if (!pendingAgentDocuments.length) {
    list.innerHTML = '<div class="agent-document-empty">Nenhum documento anexado.</div>';
    return;
  }

  list.innerHTML = pendingAgentDocuments.map((doc, index) => {
    const name = doc.name || doc.path || 'documento.md';
    const isEditable = !doc.binaryContent && !doc.filePath && !doc.missing;
    const isOpen = Boolean(doc.editorOpen);
    return `
    <div class="agent-document-row ${isOpen ? 'editing' : ''}">
      <div class="agent-document-summary">
        <i class="ti ti-file-text" aria-hidden="true"></i>
        <span>${escapeHtml(name)}</span>
        ${doc.missing ? '<em>nao encontrado</em>' : ''}
        ${doc.edited ? '<em>editado</em>' : ''}
        ${isEditable ? `
          <button type="button" class="btn-small" onclick="openAgentDocumentEditor(${index})" title="Editar documento">
            <i class="ti ti-pencil" aria-hidden="true"></i>
          </button>
        ` : ''}
        <button type="button" class="btn-small" onclick="removeAgentDocument(${index})" title="Remover documento">
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>
      ${isOpen ? `
        <div class="agent-document-editor">
          <textarea data-agent-document-index="${index}" spellcheck="false">${escapeHtml(String(doc.content || ''))}</textarea>
          <div class="agent-inline-actions">
            <button class="btn-edit" type="button" onclick="closeAgentDocumentEditor(${index})">Fechar</button>
            <button class="btn-chat" type="button" onclick="saveAgentDocumentEditor(${index})"><i class="ti ti-device-floppy"></i> Salvar arquivo</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
  }).join('');
}

function collectAgentDocumentEditorChanges() {
  document.querySelectorAll('[data-agent-document-index]').forEach(textarea => {
    const index = Number(textarea.dataset.agentDocumentIndex);
    if (!Number.isInteger(index) || !pendingAgentDocuments[index]) return;
    const nextContent = String(textarea.value || '');
    if (nextContent !== String(pendingAgentDocuments[index].content || '')) {
      pendingAgentDocuments[index] = {
        ...pendingAgentDocuments[index],
        content: nextContent,
        edited: true,
        pending: true
      };
    }
  });
}

function openAgentDocumentEditor(index) {
  collectAgentDocumentEditorChanges();
  if (!pendingAgentDocuments[index]) return;
  pendingAgentDocuments = pendingAgentDocuments.map((doc, docIndex) => ({
    ...doc,
    editorOpen: docIndex === index ? !doc.editorOpen : false
  }));
  renderAgentDocumentList();
}

function closeAgentDocumentEditor(index) {
  collectAgentDocumentEditorChanges();
  if (!pendingAgentDocuments[index]) return;
  pendingAgentDocuments[index].editorOpen = false;
  renderAgentDocumentList();
}

async function saveAgentDocumentEditor(index) {
  collectAgentDocumentEditorChanges();
  if (!pendingAgentDocuments[index]) return;
  pendingAgentDocuments[index].editorOpen = false;
  renderAgentDocumentList();

  if (currentAgent?.id) {
    setAgentImportStatus('Salvando arquivo do agente...', false, 'editor');
    await saveAgentFromEditor(currentAgent.id, { silent: true });
    setAgentImportStatus('Arquivo salvo no agente.', false, 'editor');
  } else {
    setAgentImportStatus('Arquivo atualizado. Crie o agente para gravar em disco.', false, 'editor');
  }
}

function removeAgentDocument(index) {
  pendingAgentDocuments.splice(index, 1);
  renderAgentDocumentList();
  setAgentImportStatus('Documento removido da lista. Salve o agente para aplicar.', false, 'editor');
}

function buildAgentMarkdownContent({ name, desc, model, webhookUrl, prompt, documentRefs = [], sourceFiles = [] }) {
  return AgentHelpers.buildAgentMarkdownContent({ name, desc, model, webhookUrl, prompt, documentRefs, sourceFiles });
}

function stripHtmlCommentsForDisplay(value) {
  return String(value || '').replace(/<!--[\s\S]*?-->/g, '').trim();
}

function buildAgentMarkdownFromPersona({ name, desc, model, webhookUrl, sourceFiles, documentRefs = [] }) {
  return AgentHelpers.buildAgentMarkdownFromPersona({ name, desc, model, webhookUrl, sourceFiles, documentRefs });
}

async function getAvailableAgentFileName(name) {
  const base = slugifyFileName(name);
  let candidate = `${base}.md`;
  let index = 2;
  while (true) {
    try {
      await fs.access(path.join(AGENTS_DIR, candidate));
      candidate = `${base}-${index}.md`;
      index += 1;
    } catch {
      return candidate;
    }
  }
}

async function importPersonaFilesAsAgents(files) {
  setAgentImportStatus('Importando documentos de agente...', false, 'library');
  try {
    await fs.mkdir(AGENTS_DIR, { recursive: true });
    await fs.mkdir(AGENT_DOCS_DIR, { recursive: true });
    const savedFiles = [];
    for (const file of files) {
      const raw = await readAgentPersonaFile(file);
      const name = getAgentTitleFromPersona(file.name, raw);
      const desc = `Documento anexado: ${file.name}`;
      const targetFile = await getAvailableAgentFileName(name);
      const agentSlug = targetFile.replace(/\.md$/i, '');
      const docDir = path.join(AGENT_DOCS_DIR, agentSlug);
      await fs.mkdir(docDir, { recursive: true });
      const docFileName = await getAvailableAgentDocumentFileName(docDir, file.name);
      const documentRef = getAgentDocumentRef(agentSlug, docFileName);
      await fs.writeFile(path.join(docDir, docFileName), raw, 'utf-8');
      const content = buildAgentMarkdownFromPersona({
        name,
        desc,
        model: 'gpt-5.4-mini',
        webhookUrl: '',
        sourceFiles: [file.name],
        documentRefs: [{ name: file.name, path: documentRef }]
      });
      await fs.writeFile(path.join(AGENTS_DIR, targetFile), content, 'utf-8');
      savedFiles.push(targetFile);
    }

    await loadAgents();
    setAgentImportStatus(`${savedFiles.length} agente(s) salvo(s) com documento anexado.`, false, 'library');
    const lastSaved = agents.find(agent => agent.file === savedFiles[savedFiles.length - 1]);
    if (lastSaved) selectAgent(lastSaved.id);
  } catch (error) {
    console.error('Erro ao importar documento de agente:', error);
    setAgentImportStatus(`Erro ao importar: ${error.message}`, true, 'library');
    alert(`Erro ao importar agente: ${error.message}`);
  }
}

async function appendPersonaFilesToEditor(files) {
  const nameField = document.getElementById('agent-name');
  const descField = document.getElementById('agent-desc');
  if (!nameField || !descField) return;

  setAgentImportStatus('Lendo documentos...', false, 'editor');
  try {
    const attachedNames = [];
    for (const file of files) {
      const raw = await readAgentPersonaFile(file);
      const textContent = typeof raw === 'string' ? raw : '';
      if (!nameField.value.trim()) nameField.value = getAgentTitleFromPersona(file.name, textContent);
      pendingAgentDocuments.push({
        name: file.name,
        content: textContent,
        filePath: raw?.filePath || '',
        binaryContent: raw?.binaryContent || null,
        pending: true
      });
      attachedNames.push(file.name);
    }

    if (!descField.value.trim()) {
      descField.value = `Documentos anexados: ${attachedNames.join(', ')}`;
    }

    renderAgentDocumentList();
    if (currentAgent?.id) {
      setAgentImportStatus(`${attachedNames.length} documento(s) anexado(s). Salvando agente...`, false, 'editor');
      await saveAgentFromEditor(currentAgent.id, { silent: true });
    } else {
      setAgentImportStatus(`${attachedNames.length} documento(s) anexado(s). Crie o agente para aplicar.`, false, 'editor');
    }
  } catch (error) {
    console.error('Erro ao anexar documento ao editor:', error);
    setAgentImportStatus(`Erro ao anexar: ${error.message}`, true, 'editor');
    alert(`Erro ao anexar documento: ${error.message}`);
  }
}

async function showAgentsView() {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  if (!(await leaveChatIfNeeded())) return;
  setActiveView('agents');
  selected = null;
  currentAgent = null;
  window.agentsState = {
    ...window.agentsState,
    view: 'list',
    selectedAgentId: null,
    editingAgentDraft: null
  };
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  chatMode = false;
  messages = [];
  currentProjectContext = null;
  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="main-header page-header">
      <h1 class="main-title page-title">Agentes</h1>
      <div class="header-actions page-actions">
        <button class="btn-new" onclick="openAgentEditor()"><i class="ti ti-plus" aria-hidden="true"></i> Novo agente</button>
      </div>
    </div>
    <div class="search-wrap">
      <div class="search-container">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input type="text" placeholder="Buscar agentes..." value="${escapeHtml(window.agentsState.searchQuery || '')}" oninput="filterCards(this.value)">
      </div>
    </div>
    <div class="cards-area" id="cards-area"></div>`;
  renderCards(window.agentsState.searchQuery ? filterAgentsByQuery(window.agentsState.searchQuery) : agents);
}

async function showSkillsView() {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  if (!(await leaveChatIfNeeded())) return;
  selected = null;
  currentAgent = null;
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  chatMode = false;
  messages = [];
  currentConversationId = null;
  currentProjectContext = null;
  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';
  const skillsGroup = document.getElementById('sidebar-skills-group');
  const keepSkillsGroupOpen = skillsGroup ? skillsGroup.open : null;
  renderSidebarSkills();
  if (skillsGroup && keepSkillsGroupOpen !== null) skillsGroup.open = keepSkillsGroupOpen;
  setActiveView('skills');

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="main-header page-header">
      <h1 class="main-title page-title">Skills</h1>
      <div class="header-actions page-actions">
        <button class="btn-new" onclick="openSkillEditor()"><i class="ti ti-plus" aria-hidden="true"></i> Nova skill</button>
      </div>
    </div>
    <div class="search-wrap">
      <div class="search-container">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input type="text" placeholder="Buscar skills..." oninput="filterSkillCards(this.value)">
      </div>
    </div>
    <div class="cards-area" id="skills-cards-area"></div>`;

  renderSkillCards(getSkillsForManagement());
}

async function showConversationsView() {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  await saveCurrentSession({ silent: true });
  await refreshSidebarConversations();
  setActiveView('conversations');
  selected = null;
  currentAgent = null;
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  chatMode = false;
  messages = [];
  currentConversationId = null;
  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="main-header page-header">
      <h1 class="main-title page-title">Conversas</h1>
      <div class="page-actions">
        <button class="btn-new" onclick="showConversationsView()"><i class="ti ti-reload" aria-hidden="true"></i> Atualizar</button>
      </div>
    </div>
    <div class="content-area" id="conversations-area"><div class="loading">Carregando conversas locais...</div></div>`;

  renderConversationList();
}

async function showHomeView() {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  await saveCurrentSession({ silent: true });
  if (typeof window.resetChatRuntimeState === 'function') {
    window.resetChatRuntimeState();
  }
  setActiveView('new-chat');
  window.currentChatSource = 'home';
  window.currentMemoryChatTitle = '';
  selected = null;
  currentAgent = getDefaultAgent();
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  chatMode = false;
  messages = [];
  currentConversationId = null;
  sessionSaved = false;
  sessionStartedAt = null;
  currentProjectContext = null;
  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';

  renderSidebarSkills();
  document.getElementById('main').innerHTML = `
    <div class="home-view">
      <div class="home-title">${escapeHtml(getHomeTitle())}</div>
      <div class="home-input">
        <div class="home-input-container">
          <div id="home-attachments-preview" class="attachments-preview" style="display:none"></div>
          <div data-ask-selection-slot>${renderAskSelectionComposerContext()}</div>
          <div class="chat-composer-toolbar">
            <button class="chat-attach-btn" onclick="triggerFileUpload()" title="Adicionar"><i class="ti ti-plus"></i></button>
            <textarea id="home-chat-in" data-chat-input="true" placeholder="${getAskSelectionContextText() ? 'Pergunte qualquer coisa' : 'O que vc está pensando...'}" spellcheck="true" lang="pt-BR" oninput="autoResizeTextarea(this)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();startNewChatFromHome()}"></textarea>
            <div class="chat-composer-actions">
              ${renderModelSelector()}
              ${renderWorkModeSelector()}
              <button class="chat-send" onclick="startNewChatFromHome()"><i class="ti ti-send"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  updateAttachmentsPreview();
  Promise.resolve(refreshSidebarConversations())
    .catch(error => console.warn('[HOME] falha ao atualizar conversas recentes:', error.message));
  setTimeout(() => {
    setupDragAndDrop();
    setupPasteHandler();
    focusComposerInput();
  }, 100);
}

async function showInternalPlaceholder(title) {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  await saveCurrentSession({ silent: true });
  setActiveView(title === 'Projetos' ? 'projects' : 'connections');
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';
  document.getElementById('main').innerHTML = `
    <div class="main-header page-header">
      <h1 class="main-title page-title">${escapeHtml(title)}</h1>
    </div>
    <div class="empty-panel">
      <i class="ti ti-tools"></i>
      <p>${escapeHtml(title)} serao internos do Worion.<br>Por enquanto use o chat e os agentes; conectores entram como ferramentas chamadas pelo app.</p>
    </div>`;
}

async function showConnectionsPlaceholderDisabled() {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  if (!(await leaveChatIfNeeded())) return;
  setActiveView('connections');
  selected = null;
  currentAgent = null;
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  chatMode = false;
  messages = [];
  currentProjectContext = null;
  editingConnectionId = null;
  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="main-header page-header">
      <h1 class="main-title page-title">Memory Cards</h1>
    </div>
    <div class="empty-panel">
      <i class="ti ti-plug"></i>
      <p>Crie cards de contexto. Abra um card para iniciar um chat com o contexto anexado.</p>
    </div>`;
}

async function loadConnectionsIntoView() {
  if (typeof loadContextMemoryPanel === 'function') await loadContextMemoryPanel();
}

let connectionsTreeState = {
  open: { supabase: true, notion: true, memory: true },
  activePath: 'supabase/memories',
  query: ''
};

function loadConnectionsTree() {
  const tree = document.getElementById('connections-tree');
  if (!tree) return;
  const filter = document.getElementById('connections-source-filter')?.value || 'all';
  const sourceNodes = [
    { key: 'supabase', label: 'Supabase', children: ['memórias', 'Conversas', 'Vault', 'Inventários'] },
    { key: 'notion', label: 'Notion', children: ['Worion HQ', 'Sessàµes & Commits', 'Projetos', 'Páginas recentes'] },
    { key: 'memory', label: 'memórias', children: ['Claude', 'ChatGPT', 'Resumos'] }
  ].filter(node => filter === 'all' || filter === node.key);

  tree.innerHTML = sourceNodes.map(node => `
    <details class="tree-node" ${connectionsTreeState.open[node.key] ? 'open' : ''} data-tree-node="${node.key}" ontoggle="connectionsTreeState.open['${node.key}']=this.open">
      <summary class="tree-node-summary"><i class="ti ti-folder"></i><span>${escapeHtml(node.label)}</span></summary>
      <div class="tree-children">
        ${node.children.map(child => {
          const path = `${node.key}/${child.toLowerCase().replace(/\s+/g, '-')}`;
          return `<button class="tree-leaf${connectionsTreeState.activePath === path ? ' active' : ''}" onclick="openConnectionsCategory('${node.key}','${child}')">${escapeHtml(child)}</button>`;
        }).join('')}
      </div>
    </details>
  `).join('');
}

function filterConnectionsQuery(value) {
  connectionsTreeState.query = value || '';
}

async function applyConnectionsSearch() {
  const command = document.getElementById('connections-command')?.value || document.getElementById('connections-search')?.value || '';
  const source = document.getElementById('connections-source-filter')?.value || 'all';
  await openConnectionsCategory(source === 'all' ? 'supabase' : source, command || 'memórias');
}

async function openConnectionsCategory(source, label) {
  const path = `${source}/${String(label || '').toLowerCase().replace(/\s+/g, '-')}`;
  connectionsTreeState.activePath = path;
  loadConnectionsTree();
  const title = document.getElementById('connections-center-title');
  if (title) title.textContent = `${capitalize(source)} · ${label}`;
  const list = document.getElementById('connections-list');
  if (list) list.innerHTML = '<div class="loading">Carregando...</div>';
  try {
    let result = null;
    if (source === 'supabase' && /vault/i.test(label)) {
      result = await executeToolCallRaw('supabase_select', { table: 'api_keys_vault_v2', limit: 25, select: 'id,provider,key,store,updated_at' });
    } else if (source === 'supabase' && /conversas|mem/i.test(label)) {
      result = await executeToolCallRaw('supabase_select', { table: 'memory_conversations', limit: 25, select: 'id,source_id,external_id,title,summary,updated_at,imported_at' });
    } else if (source === 'supabase' && /invent/i.test(label)) {
      result = await executeToolCallRaw('supabase_select', { table: 'memory_conversations', limit: 10, select: 'id,source_id,external_id,title,summary,updated_at,imported_at', count: true });
    } else if (source === 'notion' && /worion hq/i.test(label)) {
      result = await executeToolCallRaw('notion_search_pages', { query: 'Worion HQ', limit: 10 });
    } else if (source === 'notion' && /sess/i.test(label)) {
      result = await executeToolCallRaw('notion_search_pages', { query: 'Sessàµes', limit: 10 });
    } else if (source === 'notion' && /projet/i.test(label)) {
      result = await executeToolCallRaw('notion_search_pages', { query: 'Projetos', limit: 10 });
    } else if (source === 'notion' && /p[aá]ginas recentes/i.test(label)) {
      result = await executeToolCallRaw('notion_list_children', { page_ref: '', limit: 20 });
    } else if (source === 'memory' && /claude/i.test(label)) {
      result = await executeToolCallRaw('memory_search', { query: 'Claude', limit: 20 });
    } else if (source === 'memory' && /chatgpt/i.test(label)) {
      result = await executeToolCallRaw('memory_search', { query: 'ChatGPT', limit: 20 });
    } else if (source === 'memory' && /resum/i.test(label)) {
      result = await executeToolCallRaw('memory_summarize_conversation', { conversation_id: (conversations[0] && conversations[0].id) || '' });
    } else {
      result = await executeToolCallRaw('memory_search', { query: String(label || 'Worion'), limit: 10 });
    }
    renderConnectionsTable(source, label, result);
    renderConnectionsDetail(source, label, 0, result);
  } catch (error) {
    if (list) list.innerHTML = `<div class="empty-panel"><i class="ti ti-alert-circle"></i><p>Erro ao carregar.<br>${escapeHtml(error.message)}</p></div>`;
  }
}

function renderConnectionsTable(source, label, result) {
  const list = document.getElementById('connections-list');
  if (!list) return;
  const rows = extractConnectionsRows(result, source, label);
  if (!rows.length) {
    list.innerHTML = '<div class="empty-panel"><i class="ti ti-plug"></i><p>Nenhum item encontrado.</p></div>';
    return;
  }
  list.innerHTML = `
    <div class="connections-table">
      <div class="connections-table-head">
        <span>Título</span><span>Origem</span><span>Tipo</span><span>Atualizado</span><span>Resumo</span><span>Ações</span>
      </div>
      ${rows.map((row, index) => `
        <button class="connections-row${index === 0 ? ' active' : ''}" onclick="renderConnectionsDetail('${source}','${label}', ${index})">
          <span>${escapeHtml(row.title)}</span>
          <span>${escapeHtml(row.source)}</span>
          <span>${escapeHtml(row.type)}</span>
          <span>${escapeHtml(row.updated)}</span>
          <span>${escapeHtml(row.summary)}</span>
          <span class="connections-row-actions"><i class="ti ti-chevron-right"></i></span>
        </button>`).join('')}
    </div>`;
}

function renderConnectionsDetail(source, label, rowIndex = 0, result = null) {
  const detail = document.getElementById('connections-detail');
  const title = document.getElementById('connections-detail-title');
  const current = result ? extractConnectionsRows(result, source, label) : (window.__connectionsLastRows || []);
  const row = current[rowIndex] || current[0];
  if (!detail || !row) return;
  if (title) title.textContent = row.title || `${capitalize(source)} · ${label}`;
  detail.innerHTML = `
    <div class="detail-block">
      <div class="detail-label">Título</div>
      <div class="detail-value">${escapeHtml(row.title)}</div>
    </div>
    <div class="detail-block">
      <div class="detail-label">Origem</div>
      <div class="detail-value">${escapeHtml(row.source)}</div>
    </div>
    <div class="detail-block">
      <div class="detail-label">Resumo</div>
      <div class="detail-value">${escapeHtml(row.summary)}</div>
    </div>
    <div class="detail-block">
      <div class="detail-label">Conteúdo</div>
      <div class="detail-content">${escapeHtml(row.content)}</div>
    </div>
    <details class="detail-tech">
      <summary>IDs técnicos</summary>
      <pre>${escapeHtml(JSON.stringify(row.raw, null, 2))}</pre>
    </details>`;
}

function extractConnectionsRows(result, source, label) {
  let rows = [];
  if (result?.rows) rows = result.rows;
  else if (Array.isArray(result?.pages)) rows = result.pages;
  else if (Array.isArray(result?.items)) rows = result.items;
  else if (Array.isArray(result?.results)) rows = result.results;
  else if (result?.summary) rows = [{ title: label, summary: normalizeSummaryText(result.summary), raw: result }];
  else if (result?.success && result?.query) rows = [{ title: result.query, summary: 'Resultado de busca', raw: result }];

  rows = rows.map((row, index) => {
    const title = row.title || row.name || row.provider || row.conversation_id || `${label} ${index + 1}`;
    const summary = normalizeSummaryText(row.summary || row.description || row.text || row.content || '');
    const content = String(row.content || row.text || row.summary || row.description || JSON.stringify(row, null, 2));
    return {
      title,
      source: source,
      type: row.type || row.role || row.provider || 'item',
      updated: row.updatedAt || row.updated_at || row.lastEditedTime || row.imported_at || row.created_at || '',
      summary,
      content,
      raw: row
    };
  });
  window.__connectionsLastRows = rows;
  return rows;
}

function normalizeSummaryText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function capitalize(text) {
  const value = String(text || '');
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const CONTEXT_MEMORY_SELECTION_KEY = 'worion_context_memory_selected_cards';
const CONTEXT_MEMORY_AUDIT_KEY = 'worion_context_memory_audit_log';
const CONTEXT_MEMORY_CACHE_KEY = 'worion_context_memory_cache_v1';
const CONTEXT_MEMORY_EXTRACTION_MODE = 'reversible';
const CONTEXT_MEMORY_CHUNK_SIZE = 3500;
const CONTEXT_MEMORY_CHUNK_OVERLAP = 350;
const CONTEXT_MEMORY_LOCAL_CONVERSATION_LIMIT = 36;
const CONTEXT_MEMORY_IMPORTED_CONVERSATION_LIMIT = 80;
const CONTEXT_MEMORY_IMPORTED_CHUNK_LIMIT = 420;
const CONTEXT_MEMORY_EXCERPT_LIMIT = 3500;
const CONTEXT_MEMORY_EXCERPT_MIN_LENGTH = 80;
const CONTEXT_MEMORY_TOPICS = [
  {
    id: 'ctx-worion-core-evolution',
    title: 'Worion Core Evolution',
    type: 'projeto',
    summary: 'Evolucao arquitetural e operacional do Worion Desktop.',
    keywords: ['worion core', 'worion', 'arquitetura', 'runtime', 'prompt', 'chat.js', 'contextguardian', 'chat-models', 'projeto', 'evolution']
  },
  {
    id: 'ctx-memory-system',
    title: 'Memória, Contexto e Supabase',
    type: 'contexto',
    summary: 'Memória operacional, importacoes, chunks, vocabulario semantico e persistencia.',
    keywords: ['Memória', 'memory', 'supabase', 'chunk', 'embedding', 'semantic', 'semantica', 'vocabulario', 'context memory', 'contexto']
  },
  {
    id: 'ctx-context-control',
    title: 'Controle de Contexto pelo Usuario',
    type: 'contexto',
    summary: 'Cards auditaveis, selecao de contexto, salvamento de conversa e controle de injecao.',
    keywords: ['context memory', 'card', 'cards', 'salvar conversa', 'injecao', 'injetar', 'contexto selecionado', 'painel', 'controle']
  },
  {
    id: 'ctx-notion-connectors',
    title: 'Notion e Memory Cards',
    type: 'contexto',
    summary: 'Leitura de Notion, Supabase, vault, ferramentas e conexoes externas.',
    keywords: ['notion', 'conector', 'connectors', 'vault', 'api', 'ferramenta', 'tool', 'brave', 'tavily', 'github']
  },
  {
    id: 'ctx-deepworion-runtime',
    title: 'DeepWorion e Execucao',
    type: 'contexto',
    summary: 'CLI, execucao assistida, leitura de contexto local e centro operacional.',
    keywords: ['deepworion', 'cli', 'execucao', 'terminal', 'runtime', 'comando', 'shell', 'centro de controle']
  },
  {
    id: 'ctx-ui-piano-black',
    title: 'UI/UX Piano Black',
    type: 'contexto',
    summary: 'Identidade visual, layout, black piano, cards, sidebar e experiencia do Worion.',
    keywords: ['ui', 'ux', 'black piano', 'piano black', 'layout', 'sidebar', 'interface', 'card', 'visual', 'tema']
  },
  {
    id: 'ctx-grounding-quality',
    title: 'Grounding, Qualidade e Modelo',
    type: 'contexto',
    summary: 'Regras de grounding, roteamento de modelo, compactacao e protecao contra erro de token.',
    keywords: ['grounding', 'modelo', 'gpt', 'openai', 'tpm', 'token', 'compactacao', 'rate limit', '429', 'roteamento']
  },
  {
    id: 'ctx-workestria-saas',
    title: 'Workestria, SaaS e Produto',
    type: 'projeto',
    summary: 'Estrategia de produto, SaaS, n8n, Shopify, clientes e pipelines operacionais.',
    keywords: ['workestria', 'saas', 'shopify', 'n8n', 'pipeline', 'cliente', 'luppet', 'cloudinary', 'workflow', 'bling']
  },
  {
    id: 'ctx-user-profile-continuity',
    title: 'Perfil, Continuidade e Estilo',
    type: 'contexto',
    summary: 'Preferencias do usuario, estilo de resposta, continuidade e comportamento desejado.',
    keywords: ['glaydson', 'usuario', 'continuidade', 'estilo', 'tom', 'tda', 'tdah', 'presenca', 'comportamento', 'identidade']
  }
];
let contextMemoryState = {
  filter: 'todos',
  query: '',
  cards: [],
  contexts: [],
  cardsV2: [],
  legacy: {},
  audit: null,
  activeTab: 'contexts',
  selectedContextId: null,
  selectedCardV2Id: null,
  sources: [],
  selectedIds: new Set(),
  supabaseSynced: false,
  extractionMode: CONTEXT_MEMORY_EXTRACTION_MODE,
  auditTrail: [],
  loading: false,
  loadingPhase: 'idle',
  loadToken: 0,
  lastLoadedAt: ''
};

function loadContextMemorySelection() {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(CONTEXT_MEMORY_SELECTION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveContextMemorySelection() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CONTEXT_MEMORY_SELECTION_KEY, JSON.stringify([...contextMemoryState.selectedIds]));
}

function loadContextMemoryAuditTrail() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONTEXT_MEMORY_AUDIT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveContextMemoryAuditTrail() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CONTEXT_MEMORY_AUDIT_KEY, JSON.stringify((contextMemoryState.auditTrail || []).slice(-200)));
}

function loadContextMemoryCache() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONTEXT_MEMORY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveContextMemoryCache(snapshot = {}) {
  if (typeof localStorage === 'undefined') return;
  const cache = {
    version: 1,
    savedAt: new Date().toISOString(),
    cards: Array.isArray(snapshot.cards) ? snapshot.cards.map(card => ({
      id: card.id,
      slug: card.slug,
      type: card.type,
      title: card.title,
      source: card.source,
      summary: card.summary,
      content: card.content,
      updated: card.updated,
      sources: Array.isArray(card.sources) ? card.sources.map(source => ({
        id: source.id,
        title: source.title,
        source: source.source,
        summary: source.summary,
        content: source.content,
        updated: source.updated,
        excerptHash: source.excerptHash || null
      })) : [],
      keywords: Array.isArray(card.keywords) ? card.keywords : [],
      raw: card.raw ? {
        topicId: card.raw.topicId || null,
        sourceCount: card.raw.sourceCount || null,
        fallback: Boolean(card.raw.fallback)
      } : {}
    })) : [],
    sources: Array.isArray(snapshot.sources) ? snapshot.sources.map(source => ({
      id: source.id,
      type: source.type,
      title: source.title,
      source: source.source,
      summary: source.summary,
      content: source.content,
      updated: source.updated,
      conversationId: source.conversationId || null,
      messageIndex: source.messageIndex ?? null,
      chunkIndex: source.chunkIndex ?? null,
      excerptHash: source.excerptHash || null,
      origin: source.origin || ''
    })) : [],
    selectedIds: Array.isArray(snapshot.selectedIds) ? snapshot.selectedIds : [...contextMemoryState.selectedIds],
    extractionMode: snapshot.extractionMode || contextMemoryState.extractionMode || CONTEXT_MEMORY_EXTRACTION_MODE,
    supabaseSynced: Boolean(snapshot.supabaseSynced),
    lastLoadedAt: snapshot.lastLoadedAt || new Date().toISOString()
  };

  try {
    localStorage.setItem(CONTEXT_MEMORY_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[ContextMemory] cache local indisponivel:', error.message);
  }
}

function recordContextMemorySelectionEvent(cardId, active, source = 'manual') {
  const card = contextMemoryState.cards.find(item => item.id === cardId);
  const entry = {
    id: makeId('ctx-audit'),
    cardId,
    cardTitle: card?.title || '',
    active: Boolean(active),
    source,
    mode: contextMemoryState.extractionMode || CONTEXT_MEMORY_EXTRACTION_MODE,
    timestamp: new Date().toISOString()
  };
  contextMemoryState.auditTrail = [...(contextMemoryState.auditTrail || []), entry].slice(-200);
  saveContextMemoryAuditTrail();
}

function getContextMemoryUserId() {
  return 'local';
}

function normalizeContextMemoryText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ \u00a0]+$/gm, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hashContextMemoryText(text) {
  let hash = 2166136261;
  const normalized = String(text || '');
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function makeContextMemoryChunks(text) {
  const source = normalizeContextMemoryText(text);
  if (!source) return [];

  const chunks = [];
  let index = 0;

  while (index < source.length) {
    let end = Math.min(index + CONTEXT_MEMORY_CHUNK_SIZE, source.length);
    if (end < source.length) {
      const paragraphBreak = source.lastIndexOf('\n\n', end);
      const lineBreak = source.lastIndexOf('\n', end);
      const boundary = paragraphBreak > index + CONTEXT_MEMORY_CHUNK_SIZE * 0.6 ? paragraphBreak : lineBreak;
      if (boundary > index + CONTEXT_MEMORY_CHUNK_SIZE * 0.6) end = boundary;
    }

    const content = source.slice(index, end).trim();
    if (content) chunks.push(content);
    if (end >= source.length) break;
    index = Math.max(end - CONTEXT_MEMORY_CHUNK_OVERLAP, index + 1);
  }

  return chunks;
}

function getConversationMessageText(message = {}) {
  return normalizeContextMemoryText(
    message.extractedText
    || message.text
    || message.content
    || message.summary
    || ''
  );
}

function getConversationOriginLabel(conversation = {}) {
  return String(
    conversation.agentName
    || conversation.source_id
    || conversation.source
    || conversation.provider
    || conversation.projectTitle
    || 'Conversa'
  ).trim() || 'Conversa';
}

function isContextMemoryNoise(text) {
  const value = normalizeContextMemoryText(text).toLowerCase();
  if (!value) return true;
  if (value.length < CONTEXT_MEMORY_EXCERPT_MIN_LENGTH && !/\b(api|supabase|claude|deepseek|worion|prompt|contexto|Memória|card|conversa|import|chunk)\b/i.test(value)) return true;
  return /^(ok|okay|certo|entendi|beleza|valeu|obrigado|obrigada|sim|Não|nao|teste|perfeito)[\s.!?]*$/i.test(value);
}

function scoreContextMemoryText(text) {
  const value = normalizeContextMemoryText(text).toLowerCase();
  if (!value) return 0;
  const keywords = [
    'Memória', 'memory', 'contexto', 'context memory', 'card', 'cards', 'supabase', 'claude', 'deepseek',
    'worion', 'prompt', 'chunk', 'chunks', 'import', 'sincron', 'audit', 'fonte', 'source', 'projeto',
    'workflow', 'api', 'erro', 'corrigir', 'implementar', 'ajustar', 'persist', 'conversa', 'chat'
  ];
  let score = 0;
  for (const keyword of keywords) {
    if (value.includes(keyword)) score += keyword.includes(' ') ? 4 : 2;
  }
  if (/[#*-]\s/.test(value)) score += 1;
  if (/\n/.test(value)) score += 1;
  if (value.length > 600) score += 1;
  if (/\b(?:precisa|vamos|deve|pode|nao|Não|use|troque|mude|suba|salve|revise|extrai|quebre)\b/i.test(value)) score += 2;
  return score;
}

function buildContextMemoryTranscript(conversation = {}) {
  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  const ordered = messages
    .filter(message => message && ['user', 'assistant', 'system'].includes(message.role))
    .map((message, index) => ({
      ...message,
      index,
      content: getConversationMessageText(message)
    }))
    .filter(message => message.content);

  if (!ordered.length) return normalizeContextMemoryText(conversation.summary || conversation.title || '');

  return normalizeContextMemoryText([
    `Conversa: ${conversation.title || 'Sem titulo'}`,
    `Origem: ${getConversationOriginLabel(conversation)}`,
    ...ordered.map(message => {
      const role = message.role === 'assistant' ? 'assistant' : message.role === 'system' ? 'system' : 'user';
      return `[${role} ${message.index + 1}] ${message.content}`;
    })
  ].join('\n\n'));
}

function extractContextMemorySourcesFromConversation(conversation = {}, options = {}) {
  const source = conversation || {};
  const sources = [];
  const conversationId = String(source.conversationId || source.id || source.external_id || makeId('context-conversation'));
  const title = String(source.title || source.name || source.external_id || 'Conversa').trim() || 'Conversa';
  const updated = source.updatedAt || source.updated_at || source.updated || source.imported_at || '';
  const origin = getConversationOriginLabel(source);
  const sourceType = inferContextMemoryType(source);

  const transcript = buildContextMemoryTranscript(source);
  const chunks = makeContextMemoryChunks(transcript);
  const fallbackContent = normalizeContextMemoryText(source.summary || source.content || source.text || title);

  const chunkCandidates = (chunks.length ? chunks : [fallbackContent])
    .map((content, index) => ({
      content,
      index,
      score: scoreContextMemoryText(content)
    }))
    .filter(item => item.content && !isContextMemoryNoise(item.content))
    .sort((a, b) => b.score - a.score || b.content.length - a.content.length)
    .slice(0, Number(options.maxChunks || 8));

  for (const chunk of chunkCandidates) {
    const chunkHash = hashContextMemoryText(`${conversationId}:${chunk.index}:${chunk.content}`);
    sources.push(normalizeContextMemorySource({
      id: `${conversationId}:chunk:${chunk.index}:${chunkHash}`,
      type: sourceType,
      title: `${title} · trecho ${chunk.index + 1}`,
      source: origin,
      summary: normalizeSummaryText(chunk.content),
      content: chunk.content.slice(0, CONTEXT_MEMORY_EXCERPT_LIMIT),
      updated,
      conversationId,
      messageIndex: chunk.index,
      chunkIndex: chunk.index,
      excerptHash: chunkHash,
      origin,
      raw: {
        conversationId,
        title,
        origin,
        updated,
        chunkIndex: chunk.index,
        extractionMode: contextMemoryState.extractionMode || CONTEXT_MEMORY_EXTRACTION_MODE,
        sourceType: sourceType,
        chunkLength: chunk.content.length,
        excerptHash: chunkHash,
        source: source
      }
    }));
  }

  if (!sources.length) {
    sources.push(normalizeContextMemorySource({
      id: `${conversationId}:fallback:${hashContextMemoryText(fallbackContent || title)}`,
      type: sourceType,
      title,
      source: origin,
      summary: normalizeSummaryText(fallbackContent || title),
      content: fallbackContent || title,
      updated,
      conversationId,
      origin,
      raw: {
        conversationId,
        title,
        origin,
        updated,
        extractionMode: contextMemoryState.extractionMode || CONTEXT_MEMORY_EXTRACTION_MODE,
        fallback: true,
        source
      }
    }));
  }

  return sources;
}

function dedupeContextMemorySources(sources = []) {
  const seen = new Set();
  return sources.filter(source => {
    const key = String(source.excerptHash || source.id || source.title || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanContextMemoryConversationText(text) {
  let value = normalizeContextMemoryText(text);
  if (!value) return '';

  value = value
    .replace(/\r/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\bConversa:\s*([^[]+?)\s+Origem:\s*([^[]+?)(?=\s+\[(?:user|assistant|system)\s+\d+\])/gi, '')
    .replace(/(^|\n)\s*Conversa:\s*[^\n]*(?=\n|$)/gi, '\n')
    .replace(/(^|\n)\s*Origem:\s*[^\n]*(?=\n|$)/gi, '\n')
    .replace(/\[(?:user|assistant|system)\s+\d+\]\s*/gi, '\n\n')
    .replace(/\[(?:user|assistant|system)\]\s*/gi, '\n\n')
    .replace(/(^|\n)\s*Fontes vinculadas:\s*[\s\S]*?(?=\n\s*Sinais associados:|\n\s*Trechos recentes:|$)/gi, '\n')
    .replace(/(^|\n)\s*Sinais associados:\s*[\s\S]*?(?=\n\s*Trechos recentes:|$)/gi, '\n')
    .replace(/(^|\n)\s*Trechos recentes:\s*/gi, '\n')
    .replace(/^\s*[\u2022-]\s+[^.\n]{0,180}\([^)]*\)\s*$/gm, '')
    .replace(/^\s*[\u2022-]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return value;
}

function getContextMemoryDetailText(card) {
  const sourceTexts = (card?.sources || [])
    .slice(0, 12)
    .map(source => cleanContextMemoryConversationText(source.content || source.summary || ''))
    .filter(text => text && text.length >= CONTEXT_MEMORY_EXCERPT_MIN_LENGTH);

  if (sourceTexts.length) return sourceTexts.join('\n\n');
  return cleanContextMemoryConversationText(card?.content || card?.summary || 'Sem conteudo expandido nesta fonte.');
}

function formatContextMemoryConversationBody(text) {
  const cleaned = cleanContextMemoryConversationText(text);
  const blocks = cleaned
    .split(/\n{2,}/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 18);

  if (!blocks.length) {
    return '<div class="context-memory-conversation-line">Sem conteudo expandido nesta fonte.</div>';
  }

  return blocks
    .map(block => `<div class="context-memory-conversation-turn">${escapeHtml(block)}</div>`)
    .join('');
}

async function contextMemoryFetchRows(table, params = {}) {
  if (typeof worionApiContextCardsFetchRows !== 'function') {
    throw new Error('Worion API context-cards indisponivel');
  }
  return worionApiContextCardsFetchRows(table, params);
}

async function contextMemoryUpsertRows(table, rows, conflictTarget) {
  if (!Array.isArray(rows) || !rows.length) return [];
  if (table === 'active_context_memory_cards' && typeof worionApiContextCardsSetActiveRows === 'function') {
    return worionApiContextCardsSetActiveRows(rows);
  }
  if (typeof worionApiContextCardsUpsertRows !== 'function') {
    throw new Error('Worion API context-cards indisponivel');
  }
  return worionApiContextCardsUpsertRows(table, rows, conflictTarget);
}

function contextMemoryCardRowFromGenerated(card) {
  return {
    slug: card.slug || card.id,
    title: card.title,
    type: card.type || 'contexto',
    summary: card.summary || '',
    content: card.content || card.summary || '',
    keywords: Array.isArray(card.keywords) ? card.keywords : [],
    status: 'active',
    confidence: Math.min(1, 0.45 + ((card.sources || []).length * 0.05)),
    source_count: (card.sources || []).length,
    last_source_at: card.updated || null
  };
}

function contextMemorySourceRowFromSource(source, cardId) {
  const sourceType = String(source.type || 'contexto').slice(0, 80);
  return {
    card_id: cardId,
    source_type: sourceType,
    source_id: String(source.id || makeId('context-source')).slice(0, 180),
    source_table: String(source.id || '').split(':')[0] || source.source || null,
    title: source.title || 'Fonte sem titulo',
    summary: source.summary || '',
    content_excerpt: String(source.content || source.summary || '').slice(0, CONTEXT_MEMORY_EXCERPT_LIMIT),
    metadata: {
      source: source.source || '',
      updated: source.updated || '',
      type: source.type || '',
      conversation_id: source.conversationId || source.raw?.conversationId || null,
      message_index: source.messageIndex ?? source.raw?.messageIndex ?? null,
      chunk_index: source.chunkIndex ?? source.raw?.chunkIndex ?? null,
      role: source.role || source.raw?.role || null,
      excerpt_hash: source.excerptHash || source.raw?.excerptHash || null,
      extraction_mode: source.raw?.extractionMode || contextMemoryState.extractionMode || CONTEXT_MEMORY_EXTRACTION_MODE,
      origin: source.origin || source.raw?.origin || '',
      score: source.score || source.raw?.score || 0
    }
  };
}

function contextMemoryCardFromSupabaseRow(row, localCard = null, linkedSources = []) {
  const slug = row.slug || localCard?.slug || localCard?.id || row.id;
  const provisionalCard = {
    id: slug,
    title: row.title || localCard?.title || 'Memória contextual',
    summary: row.summary || localCard?.summary || ''
  };
  const rawSources = localCard?.sources?.length ? localCard.sources : linkedSources.map(source => normalizeContextMemorySource({
    id: `${source.source_type || 'source'}:${source.source_id || source.id}`,
    type: source.source_type || 'contexto',
    title: source.title,
    source: source.metadata?.source || source.source_table || 'Supabase',
    summary: source.summary || source.content_excerpt || '',
    content: source.content_excerpt || source.summary || '',
    updated: source.metadata?.updated || source.created_at || '',
    raw: source
  }));
  const sources = rawSources.filter(source => validateContextCardSource(provisionalCard, source).compatible);
  return {
    id: slug,
    slug,
    supabaseId: row.id,
    type: row.type || localCard?.type || 'contexto',
    title: row.title || localCard?.title || 'Memória contextual',
    source: sources.length ? `${sources.length} fontes` : (localCard?.source || 'Supabase'),
    summary: row.summary || localCard?.summary || '',
    content: row.content || localCard?.content || row.summary || '',
    updated: row.last_source_at || row.updated_at || localCard?.updated || '',
    sources,
    keywords: row.keywords || localCard?.keywords || [],
    raw: {
      ...(localCard?.raw || {}),
      supabase: row
    }
  };
}

async function syncGeneratedContextMemoryCards(generatedCards) {
  const generatedBySlug = new Map(generatedCards.map(card => [card.slug || card.id, card]));
  const cardRows = generatedCards.map(contextMemoryCardRowFromGenerated);
  await contextMemoryUpsertRows('context_memory_cards', cardRows, 'slug');

  const supabaseCards = await contextMemoryFetchRows('context_memory_cards', {
    select: '*',
    order: 'updated_at.desc',
    limit: 100
  });
  const cardIdBySlug = new Map(supabaseCards.map(row => [row.slug, row.id]));
  const sourceRows = [];
  generatedCards.forEach(card => {
    const supabaseId = cardIdBySlug.get(card.slug || card.id);
    if (!supabaseId) return;
    (card.sources || []).forEach(source => sourceRows.push(contextMemorySourceRowFromSource(source, supabaseId)));
  });
  await contextMemoryUpsertRows('context_memory_sources', sourceRows, 'card_id,source_type,source_id');

  const storedSources = await contextMemoryFetchRows('context_memory_sources', {
    select: '*',
    limit: 500
  }).catch(() => []);
  const sourcesByCardId = new Map();
  storedSources.forEach(source => {
    const list = sourcesByCardId.get(source.card_id) || [];
    list.push(source);
    sourcesByCardId.set(source.card_id, list);
  });

  const cards = supabaseCards
    .map(row => contextMemoryCardFromSupabaseRow(row, generatedBySlug.get(row.slug), sourcesByCardId.get(row.id) || []))
    .filter(card => card.title || card.summary);

  const activeRows = await contextMemoryFetchRows('active_context_memory_cards', {
    select: 'card_id,active',
    user_id: `eq.${getContextMemoryUserId()}`
  }).catch(() => []);
  const slugByCardId = new Map(supabaseCards.map(row => [row.id, row.slug || row.id]));
  const activeIds = new Set(activeRows
    .filter(row => row.active)
    .map(row => slugByCardId.get(row.card_id))
    .filter(Boolean));
  if (activeRows.length) {
    contextMemoryState.selectedIds = activeIds;
    saveContextMemorySelection();
  }

  return cards;
}

async function persistContextMemoryActiveState(cardId, active) {
  const card = contextMemoryState.cards.find(item => item.id === cardId);
  if (!card?.supabaseId) return;
  await contextMemoryUpsertRows('active_context_memory_cards', [{
    user_id: getContextMemoryUserId(),
    card_id: card.supabaseId,
    active: Boolean(active)
  }], 'user_id,card_id');
}

async function clearContextMemoryActiveStateInSupabase() {
  const activeRows = contextMemoryState.cards
    .filter(card => card.supabaseId)
    .map(card => ({
      user_id: getContextMemoryUserId(),
      card_id: card.supabaseId,
      active: false
    }));
  await contextMemoryUpsertRows('active_context_memory_cards', activeRows, 'user_id,card_id');
}

function getContextMemoryTypeMeta(type) {
  const map = {
    conversa: { label: 'Conversa', icon: 'ti-messages', className: 'conversation' },
    contexto: { label: 'Contexto', icon: 'ti-brain', className: 'context' },
    resumo: { label: 'Resumo', icon: 'ti-notes', className: 'summary' },
    documento: { label: 'Documento', icon: 'ti-file-text', className: 'document' },
    projeto: { label: 'Projeto', icon: 'ti-folder', className: 'project' }
  };
  return map[type] || map.contexto;
}

function inferContextMemoryType(row = {}) {
  const source = String(row.source_id || row.source || '').toLowerCase();
  const title = String(row.title || row.name || '').toLowerCase();
  const role = String(row.role || row.type || '').toLowerCase();
  if (role === 'document' || source.includes('worion-doc') || title.includes('documento')) return 'documento';
  if (source.includes('claude') || source.includes('chatgpt')) return 'conversa';
  if (source.includes('deepseek') || source.includes('worion') || source.includes('chat') || role === 'assistant' || role === 'user') return 'conversa';
  if (source.includes('doc') || title.includes('.md') || title.includes('.txt')) return 'documento';
  if (title.includes('resumo') || source.includes('summary')) return 'resumo';
  return 'contexto';
}

function normalizeContextMemorySource(card) {
  const meta = getContextMemoryTypeMeta(card.type);
  return {
    id: String(card.id || makeId('memory-card')),
    type: card.type || 'contexto',
    subcluster: card.subcluster || classifyContextMemorySubcluster(card),
    title: card.title || 'Memória sem titulo',
    source: card.source || meta.label,
    summary: normalizeSummaryText(card.summary || card.content || ''),
    content: String(card.content || card.summary || ''),
    updated: card.updated || '',
    conversationId: card.conversationId || null,
    messageIndex: card.messageIndex ?? null,
    chunkIndex: card.chunkIndex ?? null,
    excerptHash: card.excerptHash || null,
    origin: card.origin || '',
    raw: card.raw || {}
  };
}

function getContextMemorySourceText(source) {
  return [
    source.title,
    source.source,
    source.summary,
    source.content,
    source.type
  ].filter(Boolean).join(' ').toLowerCase();
}

function classifyContextMemorySubcluster(source) {
  const text = getContextMemorySourceText(source);
  if (/\b(api|codigo|código|electron|node|supabase|n8n|backend|frontend|bug|commit)\b/i.test(text)) return 'tecnico';
  if (/\b(produto|saas|cliente|pipeline|shopify|workestria|catalogo|catálogo)\b/i.test(text)) return 'produto';
  if (/\b(espiritual|bashar|blavatsky|teosofia|sonho|ritual|reflexivo)\b/i.test(text)) return 'espiritual_reflexivo';
  if (/\b(perfil|preferencia|identidade|biografia pessoal)\b/i.test(text)) return 'perfil';
  if (/\b(sessao|sessào|historico|histórico|conversa)\b/i.test(text)) return 'historico_sessao';
  if (/\b(operacional|tarefa|rotina|processo|execucao|execuçào)\b/i.test(text)) return 'operacional';
  if (/\b(saude|saúde|tdah|sono|cansaà§o|cansaco)\b/i.test(text)) return 'saude_rotina';
  if (/\b(brave|tavily|fonte|pesquisa externa|http|https)\b/i.test(text)) return 'pesquisa_externa';
  return 'operacional';
}

function scoreContextMemoryTopic(source, topic) {
  const text = getContextMemorySourceText(source);
  return topic.keywords.reduce((score, keyword) => {
    const needle = String(keyword || '').toLowerCase();
    if (!needle) return score;
    let nextScore = score;
    if (text.includes(needle)) nextScore += needle.includes(' ') ? 4 : 2;
    if (String(source.title || '').toLowerCase().includes(needle)) nextScore += 2;
    return nextScore;
  }, 0);
}

function validateContextCardSource(card, source) {
  const cardTitle = String(card?.title || '').toLowerCase();
  const sourceText = normalizeContextMemoryText([
    source?.title,
    source?.source,
    source?.summary,
    source?.content,
    source?.type
  ].filter(Boolean).join(' ')).toLowerCase();
  console.log('[CONTEXT MEMORY] source-card validation', {
    card: card?.title || card?.id || '',
    source: source?.title || source?.id || ''
  });

  if (/Memória|memória|contexto|supabase/i.test(cardTitle)) {
    const accepted = [
      'Memória', 'memória', 'contexto', 'supabase', 'chunks', 'chunk',
      'vocabulario semantico', 'vocabulário semà¢ntico', 'persistencia', 'persistàªncia',
      'contextguardian', 'memory_conversations', 'memory_chunks',
      'context_memory_cards', 'active_context_memory_cards', 'importacao', 'importaçào',
      'embedding', 'sessao', 'sessào', 'fonte vinculada'
    ];
    const rejected = [
      'bashar', 'blavatsky', 'teosofia', 'espiritualidade', 'canalizacao', 'canalizaçào',
      'tesla', 'turing', 'gatos', 'sonhos', 'amor', 'biografia pessoal', 'rituais espirituais'
    ];
    const acceptScore = accepted.reduce((score, term) => score + (sourceText.includes(term) ? 1 : 0), 0);
    const rejectScore = rejected.reduce((score, term) => score + (sourceText.includes(term) ? 1 : 0), 0);
    if (rejectScore > 0 && acceptScore < 2) {
      console.warn('[CONTEXT MEMORY] incompatible source detected', {
        card: card?.title || card?.id || '',
        source: source?.title || source?.id || '',
        acceptScore,
        rejectScore
      });
      console.warn('[CONTEXT MEMORY] source moved/rejected/skipped');
      return { compatible: false, action: 'skipped', acceptScore, rejectScore };
    }
  }

  return { compatible: true, action: 'accepted' };
}

function aggregateContextMemoryCards(sources) {
  const topicMap = new Map(CONTEXT_MEMORY_TOPICS.map(topic => [topic.id, { ...topic, sources: [], score: 0 }]));
  const inbox = {
    id: 'ctx-context-inbox',
    title: 'Contextos a Classificar',
    type: 'resumo',
    summary: 'Assuntos recentes que ainda nao formaram um contexto dominante.',
    keywords: [],
    sources: [],
    score: 0
  };

  sources.forEach(source => {
    source.subcluster = source.subcluster || classifyContextMemorySubcluster(source);
    console.log('[CONTEXT MEMORY] subcluster=', source.subcluster, source.title || source.id || '');
    let bestTopic = null;
    let bestScore = 0;
    CONTEXT_MEMORY_TOPICS.forEach(topic => {
      const score = scoreContextMemoryTopic(source, topic);
      if (score > bestScore) {
        bestTopic = topic;
        bestScore = score;
      }
    });
    const target = bestTopic && bestScore > 0 ? topicMap.get(bestTopic.id) : inbox;
    const validation = validateContextCardSource(target, source);
    if (!validation.compatible) return;
    target.sources.push(source);
    target.score += bestScore;
  });

  const topics = [...topicMap.values(), inbox]
    .filter(topic => topic.sources.length)
    .sort((a, b) => b.sources.length - a.sources.length || b.score - a.score);

  return topics.map(topic => {
    const sortedSources = topic.sources
      .slice()
      .sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
    const uniqueSources = dedupeContextMemorySources(sortedSources);
    const content = uniqueSources
      .slice(0, 10)
      .map(source => cleanContextMemoryConversationText(source.content || source.summary || ''))
      .filter(text => text && text.length >= CONTEXT_MEMORY_EXCERPT_MIN_LENGTH)
      .join('\n\n') || topic.summary;

    return {
      id: topic.id,
      slug: topic.id,
      type: topic.type,
      title: topic.title,
      source: `${uniqueSources.length} fontes`,
      summary: `${topic.summary} ${uniqueSources.length} fonte${uniqueSources.length === 1 ? '' : 's'} vinculada${uniqueSources.length === 1 ? '' : 's'}.`,
      content,
      updated: uniqueSources[0]?.updated || '',
      sources: uniqueSources,
      keywords: topic.keywords,
      raw: {
        topicId: topic.id,
        sourceCount: uniqueSources.length,
        sources: uniqueSources.map(source => ({
          id: source.id,
          title: source.title,
          source: source.source,
          type: source.type,
          updated: source.updated,
          excerptHash: source.excerptHash || null
        }))
      }
    };
  });
}

async function collectContextMemoryLocalSources() {
  const cards = [];

  try {
    const localProjects = typeof loadLocalProjects === 'function' ? await loadLocalProjects() : [];
    localProjects.slice(0, 20).forEach(project => cards.push(normalizeContextMemorySource({
      id: `project:${project.id}`,
      type: 'projeto',
      title: project.name || project.title || 'Projeto',
      source: 'Projetos',
      summary: project.description || project.context || 'Projeto local do Worion.',
      content: [project.description, project.context].filter(Boolean).join('\n\n'),
      updated: project.updatedAt || project.createdAt || '',
      raw: project
    })));
  } catch (error) {
    console.warn('[ContextMemory] projetos indisponiveis:', error.message);
  }

  try {
    const localConversations = typeof loadLocalConversations === 'function' ? await loadLocalConversations() : [];
    const localConversationItems = localConversations.slice(0, CONTEXT_MEMORY_LOCAL_CONVERSATION_LIMIT);
    const localConversationDetails = await Promise.all(localConversationItems.map(async (conversation) => {
      if (conversation?.messages?.length) return conversation;
      if (typeof readConversationFile !== 'function') return conversation;
      try {
        return await readConversationFile(conversation.id);
      } catch {
        return conversation;
      }
    }));

    localConversationDetails.forEach(conversation => {
      const conversationSources = extractContextMemorySourcesFromConversation(conversation, { maxChunks: 6 });
      conversationSources.forEach(source => cards.push(source));
    });
  } catch (error) {
    console.warn('[ContextMemory] conversas locais indisponiveis:', error.message);
  }

  return dedupeContextMemorySources(cards);
}

async function collectContextMemoryImportedSources() {
  const cards = [];
  try {
    const importedConversations = await contextMemoryFetchRows('memory_conversations', {
      select: 'id,source_id,external_id,title,summary,updated_at,imported_at,metadata',
      order: 'updated_at.desc',
      limit: CONTEXT_MEMORY_IMPORTED_CONVERSATION_LIMIT
    });
    const importedChunks = await contextMemoryFetchRows('memory_chunks', {
      select: 'id,conversation_id,source_id,chunk_index,role,content,created_at,metadata',
      order: 'created_at.asc',
      limit: CONTEXT_MEMORY_IMPORTED_CHUNK_LIMIT
    });
    const conversationById = new Map(importedConversations.map(row => [row.id, row]));
    importedChunks.forEach(chunk => {
      const conversation = conversationById.get(chunk.conversation_id) || {};
      const chunkContent = normalizeContextMemoryText(chunk.content || '');
      if (!chunkContent) return;
      const excerptHash = hashContextMemoryText(`${chunk.conversation_id}:${chunk.chunk_index}:${chunkContent}`);
      cards.push(normalizeContextMemorySource({
        id: `memory:${chunk.conversation_id}:${chunk.chunk_index}:${excerptHash}`,
        type: inferContextMemoryType({
          source_id: chunk.source_id || conversation.source_id || '',
          title: conversation.title || '',
          role: chunk.role || ''
        }),
        title: `${conversation.title || chunk.source_id || 'Conversa'} · trecho ${Number(chunk.chunk_index || 0) + 1}`,
        source: conversation.source_id || chunk.source_id || 'memory_chunks',
        summary: normalizeSummaryText(chunkContent),
        content: chunkContent.slice(0, CONTEXT_MEMORY_EXCERPT_LIMIT),
        updated: chunk.created_at || conversation.updated_at || conversation.imported_at || '',
        conversationId: chunk.conversation_id,
        messageIndex: chunk.chunk_index,
        chunkIndex: chunk.chunk_index,
        excerptHash,
        origin: conversation.source_id || chunk.source_id || 'memory_chunks',
        raw: {
          conversationId: chunk.conversation_id,
          conversation,
          chunk,
          extractionMode: contextMemoryState.extractionMode || CONTEXT_MEMORY_EXTRACTION_MODE,
          sourceType: 'memory_chunks'
        }
      }));
    });
    importedConversations.forEach(row => {
      const hasChunks = importedChunks.some(chunk => chunk.conversation_id === row.id);
      if (hasChunks) return;
      const fallbackContent = normalizeContextMemoryText(row.summary || row.title || '');
      if (!fallbackContent) return;
      cards.push(normalizeContextMemorySource({
        id: `memory:${row.id}:summary:${hashContextMemoryText(fallbackContent)}`,
        type: inferContextMemoryType({
          source_id: row.source_id || '',
          title: row.title || '',
          role: ''
        }),
        title: row.title || row.external_id || row.id,
        source: row.source_id || 'memory_conversations',
        summary: normalizeSummaryText(fallbackContent),
        content: fallbackContent,
        updated: row.updated_at || row.imported_at || '',
        conversationId: row.id,
        origin: row.source_id || 'memory_conversations',
        raw: {
          conversation: row,
          extractionMode: contextMemoryState.extractionMode || CONTEXT_MEMORY_EXTRACTION_MODE,
          sourceType: 'memory_conversations',
          fallback: true
        }
      }));
    });
  } catch (error) {
    console.warn('[ContextMemory] memory_chunks/memory_conversations indisponiveis:', error.message);
  }

  return dedupeContextMemorySources(cards);
}

async function collectContextMemorySources() {
  const localSources = await collectContextMemoryLocalSources();
  const importedSources = await collectContextMemoryImportedSources();
  return dedupeContextMemorySources([...localSources, ...importedSources]);
}

function dedupeByStableKey(items, getKey) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = getKey(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values());
}

function contextMemoryCountFromAudit(audit, table) {
  const value = audit?.currentTables?.[table]?.rowCount;
  return value === null || value === undefined ? 0 : Number(value || 0);
}

function contextMemoryRulesList(rules) {
  if (Array.isArray(rules)) return rules;
  if (typeof rules === 'string' && rules.trim()) {
    try {
      const parsed = JSON.parse(rules);
      return Array.isArray(parsed) ? parsed : [rules];
    } catch {
      return [rules];
    }
  }
  return [];
}

async function loadContextMemoryPanel() {
  const grid = document.getElementById('context-memory-grid');
  if (grid) grid.innerHTML = '<div class="loading">Carregando Memory Cards...</div>';
  contextMemoryState.selectedIds = loadContextMemorySelection();
  contextMemoryState.auditTrail = loadContextMemoryAuditTrail();
  const refreshToken = Date.now();
  contextMemoryState.loadToken = refreshToken;
  contextMemoryState.loading = true;
  contextMemoryState.loadingPhase = 'v2';
  renderContextMemoryPanel();

  try {
    const [audit, contexts, cardsV2] = await Promise.all([
      typeof worionApiMemoryAudit === 'function' ? worionApiMemoryAudit() : null,
      typeof worionApiMemoryContexts === 'function' ? worionApiMemoryContexts({ limit: 200 }) : [],
      typeof worionApiMemoryCards === 'function' ? worionApiMemoryCards({ limit: 200 }) : []
    ]);
    if (contextMemoryState.loadToken !== refreshToken) return;
    contextMemoryState.audit = audit;
    contextMemoryState.contexts = dedupeByStableKey(contexts, context => context.id || context.slug);
    contextMemoryState.cardsV2 = dedupeByStableKey(cardsV2, card => card.id || card.slug);
    contextMemoryState.cards = contextMemoryState.cardsV2;
    contextMemoryState.sources = [];
    contextMemoryState.legacy = {
      context_memory_cards: contextMemoryCountFromAudit(audit, 'context_memory_cards'),
      context_memory_sources: contextMemoryCountFromAudit(audit, 'context_memory_sources'),
      active_context_memory_cards: contextMemoryCountFromAudit(audit, 'active_context_memory_cards')
    };
    contextMemoryState.supabaseSynced = true;
    contextMemoryState.lastLoadedAt = new Date().toISOString();
    contextMemoryState.loading = false;
    contextMemoryState.loadingPhase = 'idle';
    console.log('[CONTEXT MEMORY UX V2] audit:', {
      memory_contexts: contextMemoryCountFromAudit(audit, 'memory_contexts'),
      memory_cards_v2: contextMemoryCountFromAudit(audit, 'memory_cards_v2'),
      memory_files: contextMemoryCountFromAudit(audit, 'memory_files'),
      tableErrors: Array.isArray(audit?.tableErrors) ? audit.tableErrors.length : 0
    });
    console.log('[CONTEXT MEMORY UX V2] contexts loaded:', contextMemoryState.contexts.length);
    console.log('[CONTEXT MEMORY UX V2] cards loaded:', contextMemoryState.cardsV2.length);
    console.log('[CONTEXT MEMORY UX V2] legacy available:', contextMemoryState.legacy);
    renderContextMemoryPanel();
  } catch (error) {
    if (contextMemoryState.loadToken !== refreshToken) return;
    console.warn('[CONTEXT MEMORY UX V2] carregamento indisponivel:', error.message);
    contextMemoryState.loading = false;
    contextMemoryState.loadingPhase = 'idle';
    contextMemoryState.audit = null;
    contextMemoryState.contexts = [];
    contextMemoryState.cardsV2 = [];
    contextMemoryState.cards = [];
    contextMemoryState.sources = [];
    renderContextMemoryPanel();
  }
}

function getVisibleContextMemoryCards() {
  const query = String(contextMemoryState.query || '').toLowerCase().trim();
  return contextMemoryState.cards.filter(card => {
    const matchFilter = contextMemoryState.filter === 'todos' || card.type === contextMemoryState.filter;
    const haystack = `${card.title} ${card.source} ${card.summary} ${card.content}`.toLowerCase();
    return matchFilter && (!query || haystack.includes(query));
  });
}

function renderContextMemoryPanel() {
  const grid = document.getElementById('context-memory-grid');
  const mode = document.getElementById('context-memory-mode');
  const count = document.getElementById('context-memory-count');
  const selected = document.getElementById('context-memory-selected-count');
  if (!grid) return;
  const audit = contextMemoryState.audit;
  const contextCount = audit ? contextMemoryCountFromAudit(audit, 'memory_contexts') : contextMemoryState.contexts.length;
  const cardCount = audit ? contextMemoryCountFromAudit(audit, 'memory_cards_v2') : contextMemoryState.cardsV2.length;
  const fileCount = audit ? contextMemoryCountFromAudit(audit, 'memory_files') : 0;
  if (mode) mode.textContent = contextMemoryState.loading ? 'Carregando V2' : 'V2 fonte principal';
  if (count) count.textContent = audit
    ? `${contextCount} contextos · ${cardCount} cards V2 · ${fileCount} arquivos · Supabase`
    : 'status indisponivel';
  if (selected) selected.textContent = contextMemoryState.activeTab === 'legacy' ? 'legado/referencia' : 'draft V2';

  if (contextMemoryState.loading) {
    grid.innerHTML = '<div class="loading">Carregando Memory Cards...</div>';
    renderContextMemoryDetail(null);
    return;
  }

  if (contextMemoryState.activeTab === 'cards') {
    grid.innerHTML = renderMemoryCardsV2();
    renderContextMemoryDetail(contextMemoryState.cardsV2[0] || null, 'card');
    return;
  }
  if (contextMemoryState.activeTab === 'legacy') {
    grid.innerHTML = renderContextMemoryLegacy();
    renderContextMemoryDetail(null, 'legacy');
    return;
  }
  if (contextMemoryState.activeTab === 'audit') {
    grid.innerHTML = renderContextMemoryAudit();
    renderContextMemoryDetail(null, 'audit');
    return;
  }

  const contexts = getVisibleMemoryContextsV2();
  if (!contexts.length) {
    grid.innerHTML = '<div class="empty-panel"><i class="ti ti-brain"></i><p>Nenhum contexto V2 encontrado.</p></div>';
    renderContextMemoryDetail(null, 'context');
    return;
  }
  grid.innerHTML = contexts.map(context => renderMemoryContextV2(context)).join('');
  renderContextMemoryDetail(contexts[0], 'context');
}

function getVisibleMemoryContextsV2() {
  const query = String(contextMemoryState.query || '').toLowerCase().trim();
  return dedupeByStableKey(contextMemoryState.contexts, context => context.id || context.slug).filter(context => {
    const haystack = `${context.title} ${context.slug} ${context.domain} ${context.status} ${context.description}`.toLowerCase();
    return !query || haystack.includes(query);
  });
}

function renderMemoryContextV2(context) {
  const key = context.id || context.slug;
  return `
    <article class="context-memory-card" data-card-id="${escapeHtml(key)}" onclick="renderContextMemoryDetailById('${escapeHtml(key)}')">
      <div class="context-memory-card-header">
        <div class="context-memory-icon contexto"><i class="ti ti-folder" aria-hidden="true"></i></div>
        <span class="context-memory-tag contexto">${escapeHtml(context.status || 'draft')}</span>
      </div>
      <div class="context-memory-card-title">${escapeHtml(context.title)}</div>
      <div class="context-memory-card-meta">${escapeHtml(context.description || context.slug || 'Sem descrição')}</div>
      <div class="context-memory-card-footer">
        <span class="context-memory-tag contexto">${escapeHtml(context.domain || 'unknown')}</span>
        <span>${escapeHtml(context.confidence_score !== null && context.confidence_score !== undefined ? `score ${context.confidence_score}` : context.slug || '')}</span>
      </div>
    </article>`;
}

function renderMemoryCardsV2() {
  const cards = dedupeByStableKey(contextMemoryState.cardsV2, card => card.id || card.slug);
  if (!cards.length) {
    const drafts = contextMemoryState.contexts.filter(context => String(context.status || 'draft') === 'draft');
    return `
      <div class="empty-panel">
        <i class="ti ti-cards"></i>
        <h3>Nenhum Memory Card V2 criado ainda.</h3>
        <p>Proximo passo: criar card candidato a partir de um contexto draft.</p>
        <p>Contextos draft disponiveis: ${escapeHtml(String(drafts.length))}</p>
        <div class="context-memory-source-list">
          ${drafts.map(context => `<div class="context-memory-source-row"><strong>${escapeHtml(context.title)}</strong><span>${escapeHtml(context.slug || '')}</span></div>`).join('')}
        </div>
      </div>`;
  }
  return cards.map(card => `
    <article class="context-memory-card" onclick="renderContextMemoryDetailById('${escapeHtml(card.id || card.slug)}')">
      <div class="context-memory-card-title">${escapeHtml(card.title)}</div>
      <div class="context-memory-card-meta">${escapeHtml(card.summary || 'Sem resumo')}</div>
      <div class="context-memory-card-footer">
        <span class="context-memory-tag contexto">${escapeHtml(card.domain || 'unknown')}</span>
        <span>${escapeHtml(card.status || 'draft')}</span>
      </div>
    </article>`).join('');
}

function renderContextMemoryLegacy() {
  const legacy = contextMemoryState.legacy || {};
  return `
    <div class="empty-panel">
      <i class="ti ti-archive"></i>
      <h3>Fontes/Legado</h3>
      <p>Legado disponivel apenas para referencia. Nao e a fonte principal dos cards V2.</p>
      <div class="context-memory-source-list">
        <div class="context-memory-source-row"><strong>context_memory_cards v1</strong><span>${escapeHtml(String(legacy.context_memory_cards || 0))}</span></div>
        <div class="context-memory-source-row"><strong>context_memory_sources v1</strong><span>${escapeHtml(String(legacy.context_memory_sources || 0))}</span></div>
        <div class="context-memory-source-row"><strong>active_context_memory_cards v1</strong><span>${escapeHtml(String(legacy.active_context_memory_cards || 0))}</span></div>
      </div>
    </div>`;
}

function renderContextMemoryAudit() {
  const audit = contextMemoryState.audit || {};
  const tables = audit.currentTables || {};
  const names = ['memory_conversations', 'memory_chunks', 'memory_sources', 'memory_contexts', 'memory_cards_v2', 'memory_files'];
  return `
    <div class="empty-panel">
      <i class="ti ti-report-analytics"></i>
      <h3>Status do banco (Debug)</h3>
      <div class="context-memory-source-list">
        ${names.map(name => `<div class="context-memory-source-row"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(String(tables[name]?.rowCount ?? 'n/a'))}</span></div>`).join('')}
        <div class="context-memory-source-row"><strong>warnings</strong><span>${escapeHtml(String((audit.warnings || []).length))}</span></div>
        <div class="context-memory-source-row"><strong>tableErrors</strong><span>${escapeHtml(String((audit.tableErrors || []).length))}</span></div>
      </div>
    </div>`;
}

function renderContextMemoryDetailById(cardId) {
  if (contextMemoryState.activeTab === 'cards') {
    const card = contextMemoryState.cardsV2.find(item => (item.id || item.slug) === cardId);
    renderContextMemoryDetail(card || null, 'card');
    return;
  }
  const context = contextMemoryState.contexts.find(item => (item.id || item.slug) === cardId);
  renderContextMemoryDetail(context || null, 'context');
}

function renderContextMemoryDetail(card, kind = 'context') {
  const detail = document.getElementById('context-memory-detail');
  if (!detail) return;
  if (!card) {
    detail.innerHTML = '<div class="empty-panel"><i class="ti ti-brain"></i><p>Selecione um contexto para ver o conteudo.</p></div>';
    return;
  }
  contextMemoryState.viewedContextCardId = card.id || card.slug;
  console.log('[CONTEXT MEMORY UX V2] viewed=', card.id || card.slug);
  if (kind === 'card') {
    detail.innerHTML = `
      <div class="context-memory-detail-head">
        <span class="context-memory-tag contexto">card V2</span>
      </div>
      <h2>${escapeHtml(card.title)}</h2>
      <div class="context-memory-detail-meta">domain: ${escapeHtml(card.domain || 'unknown')} · status: ${escapeHtml(card.status || 'draft')}</div>
      <div class="context-memory-detail-section">
        <div class="detail-label">Resumo</div>
        <p>${escapeHtml(card.summary || 'Sem resumo.')}</p>
      </div>
      <details class="detail-tech">
        <summary>Dados tecnicos</summary>
        <pre>${escapeHtml(JSON.stringify(card, null, 2))}</pre>
      </details>`;
    return;
  }
  const inclusionRules = contextMemoryRulesList(card.inclusion_rules);
  const exclusionRules = contextMemoryRulesList(card.exclusion_rules);
  detail.innerHTML = `
    <div class="context-memory-detail-head">
      <span class="context-memory-tag contexto">domain: ${escapeHtml(card.domain || 'unknown')}</span>
      <span class="context-memory-tag contexto">status: ${escapeHtml(card.status || 'draft')}</span>
      <span class="context-memory-tag contexto">score: ${escapeHtml(card.confidence_score !== null && card.confidence_score !== undefined ? String(card.confidence_score) : 'n/a')}</span>
    </div>
    <h2>${escapeHtml(card.title)}</h2>
    <div class="context-memory-detail-meta">${escapeHtml(card.slug || '')}</div>
    <div class="context-memory-detail-section">
      <div class="detail-label">Resumo</div>
      <p>${escapeHtml(card.description || 'Sem descrição.')}</p>
    </div>
    <div class="context-memory-detail-section">
      <div class="detail-label">Regras de entrada</div>
      <div class="context-memory-source-list">
        ${inclusionRules.map(rule => `<div class="context-memory-source-row"><strong>${escapeHtml(rule)}</strong></div>`).join('') || '<p>Sem regras de entrada.</p>'}
      </div>
    </div>
    <div class="context-memory-detail-section">
      <div class="detail-label">Regras de exclusao</div>
      <div class="context-memory-source-list">
        ${exclusionRules.map(rule => `<div class="context-memory-source-row"><strong>${escapeHtml(rule)}</strong></div>`).join('') || '<p>Sem regras de exclusao.</p>'}
      </div>
    </div>
    <div class="context-memory-detail-section">
      <div class="detail-label">Acoes</div>
      <button class="btn-small">Ler contexto</button>
      <button class="btn-small" disabled title="MC-5 pendente">Criar card candidato</button>
      <button class="btn-small" disabled>Puxar para conversa</button>
      <button class="btn-small" disabled>Nova discussao</button>
      <button class="btn-small" disabled>Salvar neste contexto</button>
    </div>
    <details class="detail-tech">
      <summary>Dados tecnicos</summary>
      <pre>${escapeHtml(JSON.stringify(card, null, 2))}</pre>
    </details>`;
}

function setContextMemoryFilter(type, btn = null) {
  contextMemoryState.filter = type || 'todos';
  document.querySelectorAll('.context-memory-filter').forEach(item => item.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderContextMemoryPanel();
}

function setContextMemoryTab(tab, btn = null) {
  contextMemoryState.activeTab = tab || 'contexts';
  document.querySelectorAll('.context-memory-filter').forEach(item => item.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderContextMemoryPanel();
}

function filterContextMemoryCards(value) {
  contextMemoryState.query = value || '';
  renderContextMemoryPanel();
}

async function toggleContextMemoryCard(cardId) {
  const willSelect = !contextMemoryState.selectedIds.has(cardId);
  if (willSelect) contextMemoryState.selectedIds.add(cardId);
  else contextMemoryState.selectedIds.delete(cardId);
  contextMemoryState.selectedContextCardIds = Array.from(contextMemoryState.selectedIds);
  contextMemoryState.injectedContextCardIds = Array.from(contextMemoryState.selectedIds);
  console.log('[CONTEXT MEMORY] selected=', contextMemoryState.selectedContextCardIds.join(','));
  console.log('[CONTEXT MEMORY] injected=', contextMemoryState.injectedContextCardIds.join(','));
  saveContextMemorySelection();
  recordContextMemorySelectionEvent(cardId, willSelect, 'manual-toggle');
  renderContextMemoryPanel();
  renderContextMemoryDetailById(cardId);
  try {
    await persistContextMemoryActiveState(cardId, willSelect);
  } catch (error) {
    console.warn('[ContextMemory] selecao ativa nao sincronizada:', error.message);
  }
}

async function clearContextMemorySelection() {
  contextMemoryState.selectedIds = new Set();
  saveContextMemorySelection();
  (contextMemoryState.cards || []).forEach(card => recordContextMemorySelectionEvent(card.id, false, 'clear-selection'));
  renderContextMemoryPanel();
  try {
    await clearContextMemoryActiveStateInSupabase();
  } catch (error) {
    console.warn('[ContextMemory] limpeza ativa nao sincronizada:', error.message);
  }
}

const MEMORY_CARD_DEMO = [
  {
    id: 'mem-001',
    title: 'Briefing do Produto Worion 2.0',
    cat: 'produto',
    status: 'draft',
    date: '18/05/2025',
    score: 5,
    starred: true,
    desc: 'Contexto completo sobre visào, funcionalidades, posicionamento e público-alvo do Worion 2.0.',
    context: 'Visào geral do produto, funcionalidades centrais, diferenciais e decisàµes de posicionamento.',
    inclusionRules: ['Visào do produto', 'Funcionalidades principais', 'Posicionamento'],
    exclusionRules: ['Detalhes de implementaçào', 'Conteúdo genérico'],
    sugs: ['Resumir este contexto', 'Adicionar novo conteúdo', 'Abrir pontos principais']
  },
  {
    id: 'mem-002',
    title: 'Público-Alvo & Personas',
    cat: 'pesquisa',
    status: 'draft',
    date: '17/05/2025',
    score: 4,
    starred: false,
    desc: 'Perfis de usuários, dores, objetivos e comportamentos para guiar comunicaçào, design e decisàµes de produto.',
    context: 'Personas primárias, dores recorrentes, objetivos de uso e sinais de comportamento.',
    inclusionRules: ['Dores e objetivos', 'Contexto de uso', 'Comportamento observado'],
    exclusionRules: ['Hipóteses sem base', 'Branding de campanha'],
    sugs: ['Sintetizar personas', 'Adicionar eviDências', 'Listar dores principais']
  }
];

let memoryCards = [];
let memoryCardsFiltered = [];
let memoryContextsV2 = [];
let memoryCardsV2 = [];
let memoryFilesV2 = [];
let memoryLegacyRows = [];
let memoryAuditState = null;
let memoryCardsQuery = '';
let memoryCardsActiveFilter = 'all';
let memoryCardsActiveTab = 'cards';
let memoryCardsSelectedId = null;
let memoryCardsChatCardId = null;
let memoryCardsEditingId = null;
let memoryEditorAttachedFiles = [];
let memoryEditorSearchRows = [];
let memoryRuntimeSearchQuery = '';
let currentInspectorContextId = null;
let memoryCardsViewReady = false;
let memoryImportResultState = null;
let memoryContextCatalog = [];
let memoryContextsSeededThisSession = false;

function formatMemoryDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('pt-BR');
}

function memoryApiRows(result) {
  if (Array.isArray(result)) return result;
  return result?.rows || result?.cards || result?.items || [];
}

function dedupeMemoryCards(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter(card => {
    const key = String(card.id || `${card.title}:${card.context || card.desc || ''}`).slice(0, 260);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeMemoryCardV2(items) {
  return (Array.isArray(items) ? items : []).map(item => {
    const metadata = parseMemoryMetadata(item.metadata);
    const semanticText = metadata.semanticInstructions?.consumeMarkdown || metadata.consumptionMarkdown || '';
    return {
    id: item.id,
    slug: item.slug || item.id,
    title: item.title || 'Sem título',
    cat: item.domain || item.category || 'contexto',
    date: formatMemoryDate(item.updated_at || item.created_at),
    status: item.status || 'draft',
    score: Math.round((item.confidence_score || 0.5) * 5),
    starred: false,
    contextId: item.context_id || '',
    context_id: item.context_id || '',
    desc: item.summary || item.card_scope || item.description || semanticText || `Contexto de ${item.title || 'memória'} disponível para leitura e expansào.`,
    context: item.card_scope || semanticText || item.summary || item.description || item.title || '',
    inclusionRules: getMemoryRuleArray(item, ['inclusion_rules', 'entry_rules', 'include_rules']),
    exclusionRules: getMemoryRuleArray(item, ['exclusion_rules', 'exclude_rules']),
    sugs: ['Resumir este contexto', 'Adicionar novo conteúdo', 'Abrir pontos principais'],
    raw: item,
    persistedCard: true,
    kind: 'card_v2'
    };
  });
}

function normalizeMemoryContextV2(items) {
  return (Array.isArray(items) ? items : []).map(context => {
    const metadata = parseMemoryMetadata(context.metadata);
    const consumptionMarkdown = metadata.consumptionMarkdown || '';
    return {
    id: context.id || context.slug,
    title: context.title || 'Contexto sem titulo',
    cat: context.domain || 'contexto',
    date: formatMemoryDate(context.updated_at || context.created_at),
    status: context.status || 'draft',
    score: Math.round((context.confidence_score || 0.5) * 5),
    starred: false,
    desc: context.description || context.summary || consumptionMarkdown || context.title || '',
    context: consumptionMarkdown || context.description || context.summary || context.title || '',
    inclusionRules: getMemoryRuleArray(context, ['inclusion_rules', 'entry_rules', 'include_rules']),
    exclusionRules: getMemoryRuleArray(context, ['exclusion_rules', 'exclude_rules']),
    sugs: ['Resumir este contexto', 'Gerar card deste tema', 'Abrir pontos principais'],
    raw: context,
    sourceContext: context,
    kind: 'context'
    };
  });
}

function getMemoryRuleArray(row = {}, keys = []) {
  for (const key of keys) {
    const value = row?.[key];
    if (Array.isArray(value)) return value.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
      } catch {
        return value.split('\n').map(line => line.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean);
      }
    }
  }
  return [];
}

function parseMemoryMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function getMemoryRowText(row = {}) {
  const metadata = parseMemoryMetadata(row.metadata);
  return [
    row.raw_text,
    row.body,
    row.content,
    row.raw_content,
    row.normalized_content,
    row.context,
    row.description,
    row.summary,
    row.card_scope,
    metadata.consumptionMarkdown,
    metadata.semanticInstructions?.consumeMarkdown
  ].find(value => String(value || '').trim()) || '';
}

function normalizeMemoryFilesV2(items) {
  return (Array.isArray(items) ? items : []).map(file => ({
    id: file.id || file.slug,
    title: file.title || 'Arquivo importado',
    cat: file.source_origin || file.file_type || 'arquivo',
    date: formatMemoryDate(file.updated_at || file.created_at),
    status: 'imported',
    score: 0,
    starred: false,
    desc: String(file.normalized_content || file.raw_content || '').replace(/\s+/g, ' ').slice(0, 220),
    context: file.normalized_content || file.raw_content || '',
    raw: file,
    kind: 'file'
  }));
}

function normalizeMemoryLegacyRows(items) {
  return (Array.isArray(items) ? items : []).map(row => ({
    id: row.id || row.slug || row.card_id,
    title: row.title || row.name || 'Card legado V1',
    cat: row.domain || row.category || 'legado V1',
    date: formatMemoryDate(row.updated_at || row.created_at),
    status: 'legacy',
    score: 0,
    starred: false,
    desc: row.summary || row.description || row.content || '',
    context: row.content || row.summary || row.description || '',
    raw: row,
    kind: 'legacy'
  }));
}

function hydrateMemoryContextsAndCards(contexts = [], cards = [], files = [], links = []) {
  const fileById = new Map((Array.isArray(files) ? files : []).map(file => [String(file.raw?.id || file.id), file]));
  const textByContextId = new Map();
  const sourceTitlesByContextId = new Map();

  (Array.isArray(links) ? links : []).forEach(link => {
    const contextId = String(link.context_id || '');
    const file = fileById.get(String(link.file_id || ''));
    const text = String(file?.context || file?.desc || '').trim();
    if (!contextId || !text) return;
    const current = textByContextId.get(contextId) || '';
    if (!current.includes(text.slice(0, 120))) {
      textByContextId.set(contextId, [current, text].filter(Boolean).join('\n\n---\n\n'));
    }
    const titles = sourceTitlesByContextId.get(contextId) || [];
    if (file?.title && !titles.includes(file.title)) titles.push(file.title);
    sourceTitlesByContextId.set(contextId, titles);
  });

  const hydratedContexts = contexts.map(context => {
    const linkedText = textByContextId.get(String(context.raw?.id || context.id)) || '';
    const sourceTitles = sourceTitlesByContextId.get(String(context.raw?.id || context.id)) || [];
    const contextText = linkedText || context.context || context.desc || '';
    return {
      ...context,
      desc: context.desc || contextText.replace(/\s+/g, ' ').slice(0, 220),
      context: contextText,
      sourceTitles
    };
  });

  const contextById = new Map(hydratedContexts.map(context => [String(context.raw?.id || context.id), context]));
  const hydratedCards = cards.map(card => {
    const contextId = card.contextId || card.context_id || card.raw?.context_id || '';
    const parent = contextById.get(String(contextId || ''));
    const cardText = card.context && card.context !== card.title ? card.context : '';
    const contextText = cardText || parent?.context || card.desc || '';
    return {
      ...card,
      contextId,
      context_id: contextId,
      sourceContext: parent || null,
      contextTitle: parent?.title || '',
      desc: card.desc || contextText.replace(/\s+/g, ' ').slice(0, 220),
      context: contextText,
      sourceTitles: parent?.sourceTitles || []
    };
  });

  return { contexts: hydratedContexts, cards: hydratedCards };
}

async function loadMemoryCards() {
  if (!memoryContextsSeededThisSession && typeof window.worionApiMemorySeedContexts === 'function') {
    try {
      await window.worionApiMemorySeedContexts();
      memoryContextsSeededThisSession = true;
    } catch (err) {
      console.warn('[MEMORY CARDS UX] failed to seed canonical contexts', err);
    }
  }

  let loadedContexts = [];
  let loadedCards = [];
  let loadedFiles = [];
  let loadedContextFiles = [];
  let loadedLegacy = [];
  try {
    if (typeof window.worionApiMemoryCards === 'function') {
      loadedCards = normalizeMemoryCardV2(await window.worionApiMemoryCards({ limit: 200, order: 'updated_at.desc' }));
    }
  } catch (err) {
    console.warn('[MEMORY CARDS UX] failed to load real cards', err);
  }

  if (typeof window.worionApiMemoryContexts === 'function') {
    try {
      loadedContexts = normalizeMemoryContextV2(await window.worionApiMemoryContexts({ limit: 200, order: 'updated_at.desc' }));
    } catch (err) {
      console.warn('[MEMORY CARDS UX] failed to load contexts', err);
    }
  }

  if (typeof window.worionApiMemoryFiles === 'function') {
    try {
      loadedFiles = normalizeMemoryFilesV2(await window.worionApiMemoryFiles({ limit: 200, order: 'updated_at.desc' }));
    } catch (err) {
      console.warn('[MEMORY CARDS UX] failed to load memory files', err);
    }
  }

  if (typeof window.worionApiMemoryContextFiles === 'function') {
    try {
      loadedContextFiles = await window.worionApiMemoryContextFiles({ limit: 500, order: 'created_at.desc' });
    } catch (err) {
      console.warn('[MEMORY CARDS UX] failed to load context-file links', err);
    }
  }

  if (typeof window.worionApiContextCardsFetchRows === 'function') {
    try {
      loadedLegacy = await window.worionApiContextCardsFetchRows('context_memory_cards', {
        select: '*',
        order: 'updated_at.desc',
        limit: 100
      });
    } catch (err) {
      console.warn('[MEMORY CARDS UX] failed to load legacy cards', err);
    }
  }

  try {
    if (typeof window.worionApiMemoryAudit === 'function') memoryAuditState = await window.worionApiMemoryAudit();
  } catch (err) {
    console.warn('[MEMORY CARDS UX] failed to load audit', err);
  }

  memoryFilesV2 = dedupeMemoryCards(loadedFiles);
  const hydrated = hydrateMemoryContextsAndCards(
    dedupeMemoryCards(loadedContexts),
    dedupeMemoryCards(loadedCards),
    memoryFilesV2,
    loadedContextFiles
  );

  // TAXONOMIA 2026-06-05: Filtrar contextos (somente active) e cards (somente com context_id em contexto active)
  const allContexts = hydrated.contexts;
  const allCards = hydrated.cards;
  const activeContexts = allContexts.filter(ctx => ctx.status === 'active');
  const activeContextIds = new Set(activeContexts.map(ctx => ctx.id));
  const activeCards = allCards.filter(card => card.contextId && activeContextIds.has(card.contextId));

  const archivedDraftCount = allContexts.length - activeContexts.length;
  const orphanCardsCount = allCards.filter(card => !card.contextId).length;
  const invalidContextCardsCount = allCards.filter(card => card.contextId && !activeContextIds.has(card.contextId)).length;

  memoryContextsV2 = activeContexts;
  memoryCardsV2 = activeCards;
  memoryLegacyRows = normalizeMemoryLegacyRows(loadedLegacy);
  window.memoryContextsV2 = memoryContextsV2;
  window.memoryCardsV2 = memoryCardsV2;
  window.memoryFilesV2 = memoryFilesV2;
  window.memoryLegacyRows = memoryLegacyRows;
  memoryCards = memoryCardsActiveTab === 'cards'
    ? memoryCardsV2
    : memoryCardsActiveTab === 'files'
      ? [...memoryFilesV2, ...memoryLegacyRows]
      : memoryContextsV2;
  memoryCardsFiltered = [...memoryCards];
  console.log('[MEMORY RUNTIME] active contexts loaded:', activeContexts.length);
  console.log('[MEMORY RUNTIME] active cards loaded:', activeCards.length);
  console.log('[MEMORY RUNTIME] archived/draft contexts ignored:', archivedDraftCount);
  console.log('[MEMORY RUNTIME] orphan cards ignored:', orphanCardsCount);
  console.log('[MEMORY RUNTIME] cards with invalid context_id ignored:', invalidContextCardsCount);
  renderSidebarMemoryContexts();
  renderMemoryCardsView();
}

async function loadMemoryContextCatalog() {
  try {
    if (typeof window.worionApiMemoryContexts === 'function') {
      const rows = await window.worionApiMemoryContexts({ limit: 200, order: 'updated_at.desc' });
      memoryContextCatalog = Array.isArray(rows) ? rows : [];
    }
  } catch (error) {
    console.warn('[MEMORY CARDS UX] failed to load context catalog', error);
  }
}

function filterMemoryCards() {
  const query = memoryCardsQuery.trim().toLowerCase();
  memoryCards = memoryCardsActiveTab === 'cards'
    ? memoryCardsV2
    : memoryCardsActiveTab === 'files'
      ? [...memoryFilesV2, ...memoryLegacyRows]
      : memoryContextsV2;
  memoryCardsFiltered = memoryCards.filter(card => {
    const matchesQuery = !query || [card.title, card.desc, card.context, card.cat].join(' ').toLowerCase().includes(query);
    const matchesFilter = memoryCardsActiveFilter === 'all' || String(card.status || '').toLowerCase() === memoryCardsActiveFilter;
    return matchesQuery && matchesFilter;
  });
}

function memoryV2HeaderLabel() {
  const contextCount = memoryContextsV2.length;
  const cardCount = memoryCardsV2.length;
  const fileCount = memoryFilesV2.length;
  return `${contextCount} contextos · ${cardCount} cards V2 · ${fileCount} arquivos · Supabase`;
}

function showMemoryLoading(message = 'Carregando Memory Cards...') {
  const main = document.getElementById('main');
  if (!main) return;
  main.innerHTML = `
    <div class="memory-loading-view">
      <div class="loading-spinner"></div>
      <strong>${escapeHtml(message)}</strong>
      <span>Consultando Supabase e preparando a interface.</span>
    </div>`;
}

function renderMemoryContextsList() {
  if (memoryContextsV2.length === 0) {
    return '<div class="memory-contexts-empty">Nenhum contexto disponível</div>';
  }
  return memoryContextsV2.map(context => {
    const slug = escapeHtml(context.raw?.slug || context.slug || '');
    const title = escapeHtml(context.title || slug.replace(/-/g, ' '));
    return `
      <button class="memory-context-item" onclick="openMemoryContextEditor('${slug}')">
        <i class="ti ti-file-text"></i>
        <span class="memory-context-title">${title}</span>
      </button>`;
  }).join('');
}

function renderSidebarMemoryContexts() {
  const container = document.getElementById('sidebar-memory-contexts');
  if (!container) return;

  if (memoryContextsV2.length === 0) {
    container.innerHTML = '<div class="sidebar-context-empty">Nenhum contexto</div>';
    return;
  }

  container.innerHTML = memoryContextsV2.map(context => {
    const id = escapeHtml(context.id || '');
    const title = escapeHtml(context.title || 'Sem título');
    return `
      <button class="sidebar-context-item" onclick="openMemoryContextFromSidebar('${id}')">
        <i class="ti ti-file-text"></i>
        <span>${title}</span>
      </button>`;
  }).join('');
}

function openMemoryContextFromSidebar(contextId) {
  // Navegar para Memory Cards se Não estiver lá
  const currentView = document.querySelector('.sidebar-btn.active')?.dataset.view;
  if (currentView !== 'connections') {
    showConnectionsView();
  }

  // Abrir editor para o contexto
  setTimeout(() => {
    openMemoryInlineEditor(contextId);
  }, 100);
}

function toggleMemoryContextsSidebar() {
  const list = document.getElementById('memory-contexts-list');
  const header = document.querySelector('.memory-sidebar-header');
  list?.classList.toggle('hidden');
  header?.classList.toggle('collapsed');
}

function toggleMemorySearch() {
  const expanded = document.getElementById('memory-search-expanded');
  expanded?.classList.toggle('hidden');
}

function renderMemoryTabs() {
  const showDebug = new URLSearchParams(window.location.search).has('debug');
  const tabs = [
    ['cards', 'Cards V2', memoryCardsV2.length],
    ['files', 'Fontes/Legado', memoryFilesV2.length + memoryLegacyRows.length]
  ];
  if (showDebug) {
    tabs.push(['audit', 'Debug', null]);
  }
  return tabs.map(([key, label, count]) => `
    <button class="memory-tab ${memoryCardsActiveTab === key ? 'active' : ''}" onclick="setMemoryCardsTab('${key}')">
      ${escapeHtml(label)}${count === null ? '' : ` <span>${count}</span>`}
    </button>`).join('');
}

function renderMemoryCardsView() {
  const main = document.getElementById('main');
  const panel = document.getElementById('detail-panel');
  if (!main) return;
  setActiveView('connections');
  if (!memoryCardsViewReady) {
    main.innerHTML = `
      <div class="main-header page-header memory-page-header">
        <div>
          <h1 class="main-title page-title">Memory Cards</h1>
        </div>
      </div>
      <div class="memory-layout">
        <section class="memory-grid-wrap">
          <div class="memory-search-header">
            <button class="memory-search-toggle" onclick="toggleMemorySearch()">
              <i class="ti ti-search"></i>
              <span>Pesquisar...</span>
            </button>
            <div class="memory-search-expanded hidden" id="memory-search-expanded">
              <div class="memory-search-filters">
                <button class="memory-filter-btn ${memoryCardsActiveTab === 'cards' ? 'active' : ''}" onclick="setMemoryCardsTab('cards')">Cards V2</button>
                <button class="memory-filter-btn ${memoryCardsActiveTab === 'files' ? 'active' : ''}" onclick="setMemoryCardsTab('files')">Fontes/Legado</button>
                <input id="memory-search-other" type="text" class="memory-search-other" placeholder="Outros..." oninput="updateMemoryCardsQuery(this.value)">
              </div>
            </div>
          </div>
          <div id="memory-cards-grid" class="memory-cards-grid"></div>
          <div id="memory-empty-state" class="memory-empty-state hidden">
            <i class="ti ti-cards"></i>
            <h3>Nenhum item encontrado.</h3>
            <p>Importe uma conversa ou sincronize os contextos do Supabase.</p>
          </div>
          <div id="memory-editor-panel" class="memory-editor-panel hidden">
            <div class="memory-editor-content">
              <h3 class="memory-editor-title">Editar Contexto</h3>
              <div class="memory-editor-fields">
                <div class="memory-editor-field">
                  <label>Nome</label>
                  <input id="editor-name" type="text" placeholder="Nome do contexto">
                </div>
                <div class="memory-editor-field">
                  <label>Sobre</label>
                  <textarea id="editor-description" rows="2" placeholder="O que esse contexto guarda..."></textarea>
                </div>
                <div class="memory-editor-field">
                  <label>Atualizar pela memória</label>
                  <div class="memory-editor-search-row">
                    <input id="editor-memory-subject" type="text" placeholder="Assunto para buscar na Supabase">
                    <button type="button" class="btn-secondary" onclick="window.searchMemoryForEditorContext()"><i class="ti ti-refresh"></i> Atualizar</button>
                  </div>
                  <div id="editor-memory-search-status" class="memory-card-search-status"></div>
                  <div id="editor-memory-search-results" class="memory-editor-search-results hidden"></div>
                </div>
                <div class="memory-editor-field">
                  <label>Conteúdo</label>
                  <textarea id="editor-content" rows="6" placeholder="Cole texto ou documentaçào..."></textarea>
                  <button type="button" class="memory-import-btn" onclick="window.importFileToEditor()">
                    <i class="ti ti-paperclip"></i>
                    <span>Anexar arquivo</span>
                  </button>
                  <input type="file" id="editor-file-input" accept=".md,.txt,.json,.csv" style="display:none" onchange="window.handleEditorFileUpload(event)">
                  <div id="editor-attached-files" class="memory-files-preview"></div>
                </div>
              </div>
            </div>
            <div class="memory-editor-actions">
              <button type="button" class="btn-secondary" onclick="window.closeMemoryEditor()">Cancelar</button>
              <button type="button" class="btn-primary" onclick="window.saveMemoryEditor()">Salvar</button>
            </div>
          </div>
          <div class="memory-footer">
            <span id="memory-count-label">0 cards encontrados</span>
            <a href="?debug=true" class="memory-debug-link" title="Ver status técnico">Debug</a>
          </div>
        </section>
        <aside id="memory-chat-panel" class="memory-chat-panel hidden"></aside>
      </div>`;
    memoryCardsViewReady = true;
  }
  if (!memoryCardsChatCardId && panel) panel.style.display = 'none';
  const tabs = document.getElementById('memory-tabs');
  if (tabs) tabs.innerHTML = renderMemoryTabs();
  document.querySelector('.memory-layout')?.classList.toggle('chat-open', Boolean(memoryCardsChatCardId));
  renderMemoryCardsGrid();
  renderMemoryChatPanel();
}

function renderMemoryCardsGrid() {
  if (memoryCardsActiveTab === 'audit') {
    renderMemoryAuditTab();
    return;
  }
  filterMemoryCards();
  const grid = document.getElementById('memory-cards-grid');
  const empty = document.getElementById('memory-empty-state');
  const count = document.getElementById('memory-count-label');
  if (!grid) return;
  if (count) {
    const label = memoryCardsActiveTab === 'cards' ? 'cards V2'
      : memoryCardsActiveTab === 'files' ? 'fontes'
      : 'contextos';
    count.textContent = `${memoryCardsFiltered.length} ${label} encontrados`;
  }
  if (!memoryCardsFiltered.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');
  grid.innerHTML = renderMemoryCardsList();
}

function renderMemoryItemActions(card) {
  const cardId = escapeHtml(card.id);
  const contextSlug = escapeHtml(card.raw?.slug || '');

  return `
    <div class="memory-card-menu-wrapper">
      <button class="memory-card-menu-trigger" onclick="toggleMemoryCardMenu(event, '${cardId}')">
        <i class="ti ti-dots-vertical"></i>
      </button>
      <div class="memory-card-dropdown" data-card-id="${cardId}">
        <button onclick="openMemoryItemInChat('${cardId}'); event.stopPropagation();">
          <i class="ti ti-message-circle"></i>
          <span>Usar no chat</span>
        </button>
        <button onclick="openMemoryInlineEditor('${cardId}'); event.stopPropagation();">
          <i class="ti ti-edit"></i>
          <span>Editar</span>
        </button>
        <button onclick="toggleMemoryFavorite('${cardId}'); event.stopPropagation();">
          <i class="ti ti-star"></i>
          <span>Favoritar</span>
        </button>
        <button onclick="archiveMemoryCard('${cardId}'); event.stopPropagation();">
          <i class="ti ti-archive"></i>
          <span>Arquivar</span>
        </button>
        <button onclick="deleteMemoryCard('${cardId}', '${contextSlug}'); event.stopPropagation();" class="menu-item-danger">
          <i class="ti ti-trash"></i>
          <span>Apagar</span>
        </button>
      </div>
    </div>`;
}

function toggleMemoryCardMenu(event, cardId) {
  event.stopPropagation();
  const allDropdowns = document.querySelectorAll('.memory-card-dropdown');
  const targetDropdown = document.querySelector(`.memory-card-dropdown[data-card-id="${cardId}"]`);

  // Fechar todos os outros dropdowns
  allDropdowns.forEach(dropdown => {
    if (dropdown !== targetDropdown) {
      dropdown.classList.remove('active');
    }
  });

  // Toggle do dropdown atual
  targetDropdown?.classList.toggle('active');
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (event) => {
  if (!event.target.closest('.memory-card-menu-wrapper')) {
    document.querySelectorAll('.memory-card-dropdown').forEach(dropdown => {
      dropdown.classList.remove('active');
    });
  }
});

function openMemoryInlineEditor(cardId) {
  const card = memoryCardsFiltered.find(c => c.id === cardId) || memoryContextsV2.find(c => c.id === cardId);
  if (!card) return;

  memoryCardsEditingId = cardId;

  // Preencher campos do painel
  document.getElementById('editor-name').value = card.title || '';
  document.getElementById('editor-description').value = card.desc || card.raw?.description || '';
  document.getElementById('editor-content').value = card.context || card.raw?.consumption_markdown || '';
  const subjectInput = document.getElementById('editor-memory-subject');
  if (subjectInput) subjectInput.value = card.title || card.raw?.slug || '';
  const searchStatus = document.getElementById('editor-memory-search-status');
  if (searchStatus) searchStatus.textContent = '';
  const searchResults = document.getElementById('editor-memory-search-results');
  if (searchResults) {
    searchResults.innerHTML = '';
    searchResults.classList.add('hidden');
  }
  memoryEditorAttachedFiles = [];
  memoryEditorSearchRows = [];
  renderMemoryEditorAttachedFiles();

  // Mostrar painel
  document.getElementById('memory-editor-panel')?.classList.remove('hidden');

  // Destacar card
  renderMemoryCardsGrid();

  // Fechar dropdown
  document.querySelectorAll('.memory-card-dropdown').forEach(dropdown => {
    dropdown.classList.remove('active');
  });
}

function closeMemoryEditor() {
  memoryCardsEditingId = null;
  memoryEditorAttachedFiles = [];
  memoryEditorSearchRows = [];
  document.getElementById('memory-editor-panel')?.classList.add('hidden');
  renderMemoryCardsGrid();
}

async function saveMemoryEditor() {
  const card = memoryCardsFiltered.find(c => c.id === memoryCardsEditingId) || memoryContextsV2.find(c => c.id === memoryCardsEditingId);
  if (!card) return;

  const name = document.getElementById('editor-name')?.value.trim();
  const description = document.getElementById('editor-description')?.value.trim();
  const content = document.getElementById('editor-content')?.value || '';

  if (!name) {
    showMemoryToast('Nome é obrigatório.');
    return;
  }

  const contextId = card.raw?.id;
  const contextSlug = card.raw?.slug || name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  try {
    // PATCH /api/memory/contexts/:id
    if (contextId && typeof window.worionApiMemoryContextUpdate === 'function') {
      const response = await window.worionApiMemoryContextUpdate({
        contextSlug,
        title: name,
        description,
        consumptionMarkdown: content,
        inclusion_rules: [],
        exclusion_rules: [],
        status: 'active',
        domain: 'unknown',
        routingRules: []
      });

      if (response && response.error) {
        throw new Error(response.error);
      }
    }

    if (contextId && memoryEditorAttachedFiles.length) {
      await saveMemoryEditorAttachedFiles(contextId, contextSlug);
    }

    showMemoryToast('Contexto salvo com sucesso.');
    closeMemoryEditor();
    memoryCardsViewReady = false;
    await loadMemoryCards();
  } catch (error) {
    console.warn('[MEMORY CARDS V3] save editor failed', error);
    showMemoryToast('Erro ao salvar: ' + (error.message || 'Tente novamente'));
    // Mantém painel aberto em caso de erro
  }
}

async function saveMemoryEditorAttachedFiles(contextId, contextSlug) {
  if (typeof window.worionApiContextCardsUpsertRows !== 'function') {
    throw new Error('API de arquivos de Memória indisponivel');
  }

  const now = new Date().toISOString();
  const fileRows = memoryEditorAttachedFiles.map((file, index) => {
    const baseSlug = slugifyMemoryCardTitle(`${contextSlug}-${file.name}`) || `arquivo-${Date.now()}-${index}`;
    return {
      title: file.name,
      slug: `${baseSlug}-${Date.now()}-${index}`,
      file_type: String(file.name || '').split('.').pop()?.toLowerCase() || 'txt',
      content_format: file.type || 'text/plain',
      raw_content: file.content,
      normalized_content: file.content,
      source_origin: 'context_editor_upload',
      source_ref: contextSlug,
      checksum: String(file.content || '').length.toString(),
      metadata: {
        uploadedFrom: 'memory_editor',
        originalName: file.name,
        contextSlug,
        uploadedAt: now
      },
      created_at: now,
      updated_at: now
    };
  });

  const insertedFiles = await window.worionApiContextCardsUpsertRows('memory_files', fileRows, 'slug');
  const links = (insertedFiles || [])
    .filter(file => file.id)
    .map(file => ({
      context_id: contextId,
      file_id: file.id,
      relation_type: 'uploaded_source',
      relevance_score: 1,
      inclusion_reason: 'Arquivo anexado manualmente ao contexto.',
      metadata: { contextSlug, linkedAt: now },
      created_at: now
    }));
  if (links.length) await window.worionApiContextCardsUpsertRows('memory_context_files', links);
}

function renderMemoryEditorAttachedFiles() {
  const list = document.getElementById('editor-attached-files');
  if (!list) return;
  list.innerHTML = memoryEditorAttachedFiles.length
    ? memoryEditorAttachedFiles.map(file => `<div class="memory-file-item"><i class="ti ti-file"></i> ${escapeHtml(file.name)}</div>`).join('')
    : '';
}

function getEditorMemorySearchSubject() {
  return document.getElementById('editor-memory-subject')?.value.trim()
    || document.getElementById('editor-name')?.value.trim()
    || document.getElementById('editor-description')?.value.trim()
    || '';
}

async function searchMemoryForEditorContext() {
  const subject = getEditorMemorySearchSubject();
  const status = document.getElementById('editor-memory-search-status');
  const resultsBox = document.getElementById('editor-memory-search-results');
  if (!subject) {
    if (status) status.textContent = 'Digite um assunto para buscar.';
    return;
  }

  if (status) status.textContent = 'Buscando na Supabase...';
  if (resultsBox) {
    resultsBox.innerHTML = '';
    resultsBox.classList.add('hidden');
  }

  try {
    if (typeof memorySearch !== 'function') throw new Error('memorySearch indisponivel');
    const result = await memorySearch(subject, '', 20);
    const rows = Array.isArray(result?.results) ? result.results : [];
    if (!rows.length) {
      if (status) status.textContent = 'Nenhum trecho encontrado.';
      return;
    }

    if (resultsBox) {
      memoryEditorSearchRows = rows.slice(0, 12);
      resultsBox.innerHTML = `
        <div class="memory-editor-search-head">
          <strong>${rows.length} trecho(s) encontrados</strong>
          <button class="btn-secondary" onclick="applySelectedMemoryEditorSnippets()">Adicionar selecionados</button>
        </div>
        ${memoryEditorSearchRows.map((row, index) => `
          <label class="memory-editor-result">
            <input type="checkbox" data-memory-editor-result="${index}" checked>
            <span>${escapeHtml(row.snippet || '')}</span>
          </label>
        `).join('')}`;
      resultsBox.classList.remove('hidden');
    }
    if (status) status.textContent = 'Revise os trechos e adicione só o que presta.';
  } catch (error) {
    console.warn('[MEMORY CARDS V3] editor memory search failed', error);
    if (status) status.textContent = `Busca falhou: ${error.message}`;
  }
}

function applySelectedMemoryEditorSnippets() {
  const contentField = document.getElementById('editor-content');
  if (!contentField) return;

  const selected = Array.from(document.querySelectorAll('[data-memory-editor-result]:checked'))
    .map(input => memoryEditorSearchRows[Number(input.dataset.memoryEditorResult)])
    .filter(Boolean);
  if (!selected.length) {
    showMemoryToast('Nenhum trecho selecionado.');
    return;
  }

  const subject = getEditorMemorySearchSubject();
  const block = [
    contentField.value.trim(),
    '',
    `## memória recuperada: ${subject}`,
    ...selected.map((row, index) => [
      `### Trecho ${index + 1}`,
      row.snippet || '',
      row.source_id ? `Fonte: ${row.source_id}` : '',
      row.conversation_id ? `Conversa: ${row.conversation_id}` : ''
    ].filter(Boolean).join('\n\n'))
  ].filter(Boolean).join('\n\n');

  contentField.value = block;
  showMemoryToast(`${selected.length} trecho(s) adicionados ao conteúdo.`);
}

function importFileToEditor() {
  document.getElementById('editor-file-input')?.click();
}

function handleEditorFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result;
    if (content) {
      memoryEditorAttachedFiles.push({
        name: file.name,
        content: String(content),
        type: file.type || 'text/plain'
      });
      renderMemoryEditorAttachedFiles();
    }
    showMemoryToast(`Arquivo "${file.name}" anexado ao contexto.`);
  };
  reader.onerror = () => {
    showMemoryToast('Erro ao ler arquivo.');
  };
  reader.readAsText(file);
}

function toggleMemoryFavorite(cardId) {
  console.log('[MEMORY CARDS V3] toggleMemoryFavorite TODO', cardId);
  showMemoryToast('Funcionalidade em desenvolvimento.');
}

function archiveMemoryCard(cardId) {
  console.log('[MEMORY CARDS V3] archiveMemoryCard TODO', cardId);
  showMemoryToast('Funcionalidade em desenvolvimento.');
}

function renderMemoryCardsList() {
  return memoryCardsFiltered.map(card => {
    const selected = memoryCardsSelectedId === card.id ? ' selected' : '';
    const editing = memoryCardsEditingId === card.id ? ' editing' : '';
    const frame = ['frame-a', 'frame-b', 'frame-c', 'frame-d'][Math.abs(hashString(card.id || card.title)) % 4];
    return `
      <article class="memory-card ${frame}${selected}${editing}" data-id="${escapeHtml(card.id)}">
        <div class="memory-card-header">
          <h3 class="memory-card-title">${escapeHtml(card.title)}</h3>
          <div class="memory-card-actions">
            ${renderMemoryItemActions(card)}
          </div>
        </div>
        <p class="memory-card-desc">${escapeHtml(card.desc || card.context || '')}</p>
        <div class="memory-card-date">${escapeHtml(card.date)}</div>
      </article>`;
  }).join('');
}

function renderMemoryAuditTab() {
  const grid = document.getElementById('memory-cards-grid');
  const empty = document.getElementById('memory-empty-state');
  const count = document.getElementById('memory-count-label');
  if (!grid) return;
  empty?.classList.add('hidden');
  const tables = memoryAuditState?.currentTables || {};
  const rows = ['memory_contexts', 'memory_cards_v2', 'memory_files', 'context_memory_cards', 'context_memory_sources', 'active_context_memory_cards']
    .map(table => ({ table, count: tables[table]?.rowCount ?? 0 }));
  grid.innerHTML = `
    <div class="memory-audit-panel">
      <h3>Status do banco (Debug)</h3>
      <div class="memory-audit-grid">
        ${rows.map(row => `
          <div class="memory-audit-row">
            <span>${escapeHtml(row.table)}</span>
            <strong>${escapeHtml(String(row.count))}</strong>
          </div>`).join('')}
      </div>
      <div class="memory-audit-note">V1 aparece somente como referàªncia em Fontes/Legado. Esta aba mostra informações técnicas do Supabase.</div>
    </div>
    ${renderLocalAiDiagnosticPanel()}`;
  if (count) count.textContent = 'Status do banco (Debug)';
}

function renderLocalAiDiagnosticPanel() {
  return `
    <div class="memory-audit-panel local-ai-diagnostic-panel">
      <h3>Laboratório local-ai</h3>
      <div class="local-ai-diagnostic-actions">
        <button type="button" class="btn-secondary" onclick="testLocalAiBgeM3()">
          <i class="ti ti-vector"></i>
          Testar BGE-M3
        </button>
        <button type="button" class="btn-secondary" onclick="testLocalAiReranker()">
          <i class="ti ti-list-search"></i>
          Testar Reranker
        </button>
      </div>
      <div class="local-ai-diagnostic-grid">
        <div class="local-ai-diagnostic-result" id="local-ai-bge-result">
          <strong>BGE-M3</strong>
          <span>Aguardando teste.</span>
        </div>
        <div class="local-ai-diagnostic-result" id="local-ai-reranker-result">
          <strong>Reranker</strong>
          <span>Aguardando teste.</span>
        </div>
      </div>
    </div>`;
}

function setLocalAiDiagnosticResult(targetId, state, lines) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const safeState = state === 'ok' ? 'ok' : state === 'loading' ? 'loading' : 'error';
  target.className = `local-ai-diagnostic-result ${safeState}`;
  target.innerHTML = lines.map(line => {
    if (line?.label) {
      return `<span><strong>${escapeHtml(line.label)}</strong> ${escapeHtml(String(line.value ?? ''))}</span>`;
    }
    return `<span>${escapeHtml(String(line?.value ?? line ?? ''))}</span>`;
  }).join('');
}

async function testLocalAiBgeM3() {
  const startedAt = performance.now();
  setLocalAiDiagnosticResult('local-ai-bge-result', 'loading', [
    { label: 'BGE-M3', value: 'testando...' }
  ]);

  try {
    const response = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'bge-m3',
        input: 'procure na memória interna sobre TDAH'
      })
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
    }
    const embedding = Array.isArray(data?.embeddings?.[0])
      ? data.embeddings[0]
      : Array.isArray(data?.embedding)
        ? data.embedding
        : [];
    if (!embedding.length) {
      throw new Error('Embedding ausente na resposta.');
    }
    setLocalAiDiagnosticResult('local-ai-bge-result', 'ok', [
      { label: 'Status', value: 'OK' },
      { label: 'Dimensão', value: embedding.length },
      { label: 'Latência', value: `${latencyMs} ms` }
    ]);
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startedAt);
    setLocalAiDiagnosticResult('local-ai-bge-result', 'error', [
      { label: 'Status', value: 'ERRO' },
      { label: 'Latência', value: `${latencyMs} ms` },
      { label: 'Detalhe', value: err?.message || 'Falha desconhecida.' }
    ]);
  }
}

async function testLocalAiReranker() {
  const startedAt = performance.now();
  setLocalAiDiagnosticResult('local-ai-reranker-result', 'loading', [
    { label: 'Reranker', value: 'testando...' }
  ]);

  try {
    const response = await fetch('http://localhost:8010/rerank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'o que eu falei sobre TDAH?',
        documents: [
          'Glaydson falou sobre TDAH como vantagem cognitiva para usar com IAs.',
          'A Puppila Pet usa Shopify e Bling.',
          'O erro estava no endpoint /api/embedding no Electron.'
        ],
        top_k: 2,
        normalize: true
      })
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.detail || data?.error || data?.message || `HTTP ${response.status}`);
    }
    const topResult = Array.isArray(data?.results) ? data.results[0] : null;
    if (!topResult) {
      throw new Error('Resultado ausente na resposta.');
    }
    setLocalAiDiagnosticResult('local-ai-reranker-result', 'ok', [
      { label: 'Status', value: 'OK' },
      { label: 'Top document', value: topResult.document || '' },
      { label: 'Score', value: Number(topResult.score).toFixed(6) },
      { label: 'Latência', value: `${latencyMs} ms` }
    ]);
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startedAt);
    setLocalAiDiagnosticResult('local-ai-reranker-result', 'error', [
      { label: 'Status', value: 'ERRO' },
      { label: 'Latência', value: `${latencyMs} ms` },
      { label: 'Detalhe', value: err?.message || 'Falha desconhecida.' }
    ]);
  }
}

function renderMemoryScore(score = 0) {
  return `<div class="memory-score-bars">${Array.from({ length: 5 }, (_, idx) => `<span class="memory-score-bar ${idx < score ? 'on' : ''}"></span>`).join('')}</div>`;
}

function updateMemoryCardsQuery(value) {
  memoryCardsQuery = value || '';
  renderMemoryCardsGrid();
}

function setMemoryCardsFilter(value) {
  memoryCardsActiveFilter = value;
  renderMemoryCardsView();
}

function setMemoryCardsTab(value) {
  memoryCardsActiveTab = value || 'cards';
  memoryCardsActiveFilter = 'all';
  memoryCardsSelectedId = null;
  memoryCardsChatCardId = null;
  currentInspectorContextId = null;
  renderMemoryCardsView();
}

function normalizeMemoryCardLookupValue(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeMemoryCardRef(cardRef) {
  return typeof cardRef === 'object' && cardRef !== null
    ? cardRef
    : { id: cardRef, slug: cardRef, key: cardRef, title: cardRef, name: cardRef };
}

function getMemoryCardContextId(card) {
  return String(card?.contextId || card?.context_id || card?.raw?.context_id || card?.raw?.contextId || '').trim();
}

function getMemoryCardStatus(card) {
  return String(card?.status || card?.raw?.status || '').trim().toLowerCase();
}

function memoryCardMatchesRef(card, cardRef) {
  const ref = normalizeMemoryCardRef(cardRef);
  const candidates = [
    ['id', ref.id],
    ['slug', ref.slug || ref.raw?.slug],
    ['key', ref.key],
    ['title', ref.title],
    ['name', ref.name]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim());

  for (const [field, value] of candidates) {
    const normalizedValue = normalizeMemoryCardLookupValue(value);
    const raw = card?.raw || {};
    const possibleValues = field === 'slug'
      ? [card?.slug, raw.slug, card?.id, raw.id]
      : field === 'title'
        ? [card?.title, raw.title]
        : field === 'name'
          ? [card?.name, raw.name, card?.title, raw.title]
          : field === 'id'
            ? [card?.id, raw.id, card?.slug, raw.slug, card?.key, raw.key]
            : [card?.[field], raw[field]];
    if (possibleValues.some(possible => normalizeMemoryCardLookupValue(possible) === normalizedValue)) return true;
  }

  return false;
}

function findMemoryCardMatch(cards, cardRef) {
  return (Array.isArray(cards) ? cards : []).find(card => memoryCardMatchesRef(card, cardRef)) || null;
}

function getRuntimeMemoryCardsV2() {
  return [...new Map([...(window.memoryCardsV2 || []), ...memoryCardsV2].map(card => [String(card.raw?.id || card.id), card])).values()];
}

function getRuntimeMemoryContextsV2() {
  return [...new Map([...(window.memoryContextsV2 || []), ...memoryContextsV2].map(context => [String(context.raw?.id || context.id), context])).values()];
}

function resolveValidMemoryCardForRuntime(cardRef) {
  const ref = normalizeMemoryCardRef(cardRef);
  const directCard = ref?.kind === 'card_v2' || ref?.raw?.context_id || ref?.contextId || ref?.context_id ? ref : null;
  const supabaseCards = getRuntimeMemoryCardsV2();
  const card = directCard && memoryCardMatchesRef(directCard, ref)
    ? directCard
    : findMemoryCardMatch(supabaseCards, ref);

  if (!card) return { valid: false, reason: 'not_found', card: null, context: null, contextId: '' };

  const contextId = getMemoryCardContextId(card);
  if (!contextId) return { valid: false, reason: 'orphan', card, context: null, contextId: '' };

  const cardStatus = getMemoryCardStatus(card);
  if (cardStatus === 'archived' || cardStatus === 'draft') {
    return { valid: false, reason: cardStatus, card, context: null, contextId };
  }

  const context = getRuntimeMemoryContextsV2().find(ctx => String(ctx.id || ctx.raw?.id || '') === contextId) || null;
  const contextStatus = getMemoryCardStatus(context);
  if (!context || contextStatus !== 'active') {
    return { valid: false, reason: context ? contextStatus || 'inactive_context' : 'missing_context', card, context, contextId };
  }

  return { valid: true, reason: 'active', card, context, contextId };
}

function resolveMemoryCardByIdOrSlug(cardRef) {
  const validRuntimeCard = resolveValidMemoryCardForRuntime(cardRef);
  if (validRuntimeCard.valid) return validRuntimeCard.card;

  const runtime = memoryRuntime();
  const runtimeCards = runtime?.getMemoryCardsList?.() || [];
  const visualCards = [...memoryCardsV2, ...memoryContextsV2, ...memoryFilesV2, ...memoryLegacyRows, ...runtimeCards];
  const ref = normalizeMemoryCardRef(cardRef);
  const found = findMemoryCardMatch(visualCards, ref);
  if (found) return found;
  if (ref.id && runtime?.getCard) return runtime.getCard(ref.id);
  return null;
}

function getMemoryCardById(id) {
  return resolveMemoryCardByIdOrSlug({ id });
}

function getCurrentInspectorContext() {
  return currentInspectorContextId ? getMemoryCardById(currentInspectorContextId) : null;
}

function resolveMemoryActionCard(id = null) {
  if (id) {
    const explicit = getMemoryCardById(id);
    if (explicit) return explicit;
  }
  return getCurrentInspectorContext();
}

async function syncMemoryClassifications() {
  try {
    if (typeof window.worionApiMemorySeedContexts === 'function') {
      await window.worionApiMemorySeedContexts();
      memoryContextsSeededThisSession = true;
    }
    memoryCardsViewReady = false;
    await loadMemoryCards();
    showMemoryToast('Contextos sincronizados.');
  } catch (error) {
    console.warn('[MEMORY CARDS UX] sync classifications falhou', error);
  }
}

function toggleMemoryCardStar(id) {
  const card = getMemoryCardById(id);
  if (!card) return;
  card.starred = !card.starred;
  renderMemoryCardsGrid();
}

function openMemoryCardModal(id = null) {
  const card = id ? getMemoryCardById(id) : null;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop memory-modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-card memory-modal-card memory-card-editor-modal">
      <div class="modal-header">
        <h2>${card ? 'Editar card' : 'Novo card'}</h2>
        <button class="modal-close" onclick="closeMemoryCardModal(this)"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body memory-modal-body">
        <div class="form-field">
          <label class="field-label">Assunto</label>
          <div class="memory-subject-search">
            <input id="memory-card-subject" value="${escapeHtml(card?.title || '')}" placeholder="Ex: novelas, filmes, estudos, filosofia">
            <button class="btn-secondary" onclick="searchMemoryCardSubjectFromModal()"><i class="ti ti-search"></i> Buscar</button>
          </div>
          <div id="memory-card-search-status" class="memory-card-search-status"></div>
        </div>
        <div class="form-field">
          <label class="field-label">Título</label>
          <input id="memory-card-title" value="${escapeHtml(card?.title || '')}" placeholder="Ex: Arquitetura do sistema">
        </div>
        <div class="form-field">
          <label class="field-label">descrição (opcional)</label>
          <textarea id="memory-card-description" rows="2" placeholder="Breve resumo do que este contexto contém...">${escapeHtml(card?.desc || card?.raw?.description || '')}</textarea>
        </div>
        <div class="form-field">
          <label class="field-label">Conteúdo</label>
          <textarea id="memory-card-context" rows="12" placeholder="Cole o conteúdo em texto, markdown ou faça upload de arquivos abaixo...">${escapeHtml(card?.context || '')}</textarea>
        </div>
        <div class="form-field">
          <label class="field-label">Enriquecer conteúdo (opcional)</label>
          <div class="memory-file-upload-zone">
            <input type="file" id="memory-card-files" accept=".txt,.md,.pdf" multiple style="display:none">
            <button class="btn-secondary" onclick="document.getElementById('memory-card-files').click()">
              <i class="ti ti-upload"></i> Adicionar arquivos (TXT, MD, PDF)
            </button>
            <div id="memory-files-list" class="memory-files-preview"></div>
          </div>
        </div>
        <div class="memory-modal-grid">
          <div class="form-field">
            <label class="field-label">Regras de inclusão (opcional)</label>
            <textarea id="memory-card-inclusion" rows="3" placeholder="Uma regra por linha...">${escapeHtml((card?.inclusionRules || []).join('\n'))}</textarea>
          </div>
          <div class="form-field">
            <label class="field-label">Regras de exclusão (opcional)</label>
            <textarea id="memory-card-exclusion" rows="3" placeholder="Uma regra por linha...">${escapeHtml((card?.exclusionRules || []).join('\n'))}</textarea>
          </div>
        </div>
        <div class="memory-modal-actions-group">
          <button class="btn-secondary" onclick="openMemoryImportModal()"><i class="ti ti-upload"></i> Importar conversa</button>
          <button class="btn-secondary" onclick="syncMemoryClassifications()"><i class="ti ti-refresh"></i> Sincronizar contextos</button>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeMemoryCardModal(this)">Cancelar</button>
        <button class="btn-primary" onclick="generateMemoryCardFromModal()">${card ? 'Salvar alterações' : 'Salvar card'}</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  // Setup file upload handler
  const fileInput = document.getElementById('memory-card-files');
  const filesList = document.getElementById('memory-files-list');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length) {
        filesList.innerHTML = files.map(f => `<div class="memory-file-item"><i class="ti ti-file"></i> ${escapeHtml(f.name)}</div>`).join('');
      }
    });
  }
}

function closeMemoryCardModal(el) {
  el?.closest('.modal-backdrop')?.remove();
}

function splitMemoryLines(value) {
  return String(value || '').split('\n').map(line => line.trim()).filter(Boolean);
}

function inferMemoryThemeFromText(value) {
  const text = String(value || '').toLowerCase();
  const themes = [
    {
      key: 'memory-cards-context-memory',
      title: 'Worion / Memory Cards',
      cat: 'technical',
      hints: [/memory cards?/, /context memory/, /memory_contexts/, /memory_cards_v2/, /\/memory/]
    },
    {
      key: 'runtime-facts-introspeccao-modelo',
      title: 'Worion / Runtime Facts',
      cat: 'technical',
      hints: [/runtimemetadata/, /model router/, /provider/, /runtime facts/, /introspec/]
    },
    {
      key: 'command-intent-gate-execucao-deterministica',
      title: 'Worion / Command Intent Gate',
      cat: 'operational',
      hints: [/\/memory/, /command intent/, /gate/, /comando/, /intent/]
    },
    {
      key: 'health-routine-energy',
      title: 'Saúde / Rotina / Energia',
      cat: 'health_routine',
      hints: [/saude/, /rotina/, /energia/, /tdah/, /sono/, /medicacao/, /ansiedade/]
    },
    {
      key: 'spirituality-dreams-hermeticism',
      title: 'Espiritualidade / Sonhos / Hermetismo',
      cat: 'spiritual_reflective',
      hints: [/espiritual/, /sonhos?/, /hermetismo/, /meditacao/, /consciencia/]
    },
    {
      key: 'puppila-ecommerce',
      title: 'Puppila / E-commerce',
      cat: 'unknown',
      hints: [/puppila/, /e-commerce/, /ecommerce/, /loja/, /checkout/, /catálogo/]
    }
  ];
  for (const theme of themes) {
    const score = theme.hints.reduce((acc, regex) => acc + (regex.test(text) ? 1 : 0), 0);
    if (score > 0) return { ...theme, score };
  }
  return { key: 'a-revisar', title: 'A revisar', cat: 'unknown', score: 0 };
}

function buildCardContentFromTheme(theme, title, contextText, inclusionRules, exclusionRules) {
  const heading = title || theme.title;
  const context = contextText || [
    `Tema base: ${theme.title}.`,
    'Este card organiza a memória operacional em torno desse assunto.',
    'Use o chat lateral para complementar sem carregar conversa antiga inteira.'
  ].join(' ');
  return {
    title: heading,
    cat: theme.cat,
    context,
    desc: context.slice(0, 180),
    inclusionRules: inclusionRules.length ? inclusionRules : [
      `Conteúdo relacionado a ${theme.title}`,
      'Trechos que reforcem o contexto escolhido',
      'Respostas, Sínteses e apontamentos operacionais'
    ],
    exclusionRules: exclusionRules.length ? exclusionRules : [
      'Conteúdo fora do tema',
      'Discussões genéricas sem ligação com o contexto',
      'Ruído operacional Não relacionado'
    ]
  };
}

function slugifyMemoryCardTitle(value = '') {
  if (typeof slugifyFileName === 'function') return slugifyFileName(value);
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildMemoryCardSummary(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 360);
}

async function searchMemoryCardSubjectFromModal() {
  const subject = document.getElementById('memory-card-subject')?.value.trim() || '';
  const status = document.getElementById('memory-card-search-status');
  if (!subject) {
    if (status) status.textContent = 'Digite um assunto.';
    return;
  }

  if (status) status.textContent = 'Buscando na memória...';
  try {
    if (typeof memorySearch !== 'function') throw new Error('memorySearch indisponivel');
    const result = await memorySearch(subject, '', 12);
    const rows = Array.isArray(result?.results) ? result.results : [];
    if (!rows.length) {
      if (status) status.textContent = 'Nada encontrado. você ainda pode preencher manualmente.';
      return;
    }

    const content = [
      `# ${subject}`,
      '',
      ...rows.slice(0, 8).map((row, index) => [
        `## Trecho ${index + 1}`,
        row.snippet || '',
        row.source_id ? `Fonte: ${row.source_id}` : '',
        row.conversation_id ? `Conversa: ${row.conversation_id}` : ''
      ].filter(Boolean).join('\n'))
    ].join('\n\n');

    const titleInput = document.getElementById('memory-card-title');
    const descInput = document.getElementById('memory-card-description');
    const contentInput = document.getElementById('memory-card-context');
    const inclusionInput = document.getElementById('memory-card-inclusion');

    if (titleInput && !titleInput.value.trim()) titleInput.value = subject;
    if (descInput) descInput.value = buildMemoryCardSummary(rows[0]?.snippet || subject);
    if (contentInput) contentInput.value = content;
    if (inclusionInput && !inclusionInput.value.trim()) inclusionInput.value = subject;
    if (status) status.textContent = `${rows.length} trecho(s) encontrados. Revise e salve o card.`;
  } catch (error) {
    console.warn('[MEMORY CARDS UX] busca por assunto falhou', error);
    if (status) status.textContent = `Busca falhou: ${error.message}`;
  }
}

async function generateMemoryCardFromModal() {
  const payload = {
    title: document.getElementById('memory-card-title')?.value.trim() || 'Sem título',
    context: document.getElementById('memory-card-context')?.value.trim() || '',
    inclusion_rules: splitMemoryLines(document.getElementById('memory-card-inclusion')?.value || ''),
    exclusion_rules: splitMemoryLines(document.getElementById('memory-card-exclusion')?.value || '')
  };
  try {
    const theme = inferMemoryThemeFromText([payload.title, payload.context, payload.inclusion_rules.join(' '), payload.exclusion_rules.join(' ')].join(' '));
    const composed = buildCardContentFromTheme(theme, payload.title, payload.context, payload.inclusion_rules, payload.exclusion_rules);
    if (typeof window.worionApiContextCardsUpsertRows !== 'function') throw new Error('worionApiContextCardsUpsertRows indisponivel');
    const slug = slugifyMemoryCardTitle(composed.title || payload.title || `card-${Date.now()}`) || `card-${Date.now()}`;
    await window.worionApiContextCardsUpsertRows('memory_cards_v2', [{
      title: composed.title,
      slug,
      summary: composed.desc || buildMemoryCardSummary(composed.context),
      domain: composed.cat || 'unknown',
      status: 'card_active',
      card_scope: composed.context,
      inclusion_rules: composed.inclusionRules,
      exclusion_rules: composed.exclusionRules,
      allowed_actions: ['read', 'append', 'summarize'],
      confidence_score: 0.75,
      metadata: {
        createdFrom: 'subject_search_card_modal',
        sourceSubject: document.getElementById('memory-card-subject')?.value.trim() || payload.title,
        updatedAt: new Date().toISOString()
      }
    }], 'slug');
    closeMemoryCardModal(document.querySelector('.memory-modal-backdrop .modal-close'));
    showMemoryToast('Memory Card salvo.');
    memoryCardsViewReady = false;
    await loadMemoryCards();
    renderMemoryCardsView();
  } catch (err) {
    console.warn('[MEMORY CARDS UX] falha ao gerar card', err);
  }
}

async function saveMemoryCard(id) {
  const card = getMemoryCardById(id);
  if (!card) return;
  try {
    const semanticInstructions = {
      consumeMarkdown: card.context || '',
      includePatterns: card.inclusionRules || [],
      excludePatterns: card.exclusionRules || [],
      prioritySignals: [card.title, card.cat].filter(Boolean),
      routingOverrides: [],
      examples: { include: [], exclude: [] }
    };
    if (card.persistedCard && typeof window.worionApiMemoryCardSemanticInstructions === 'function') {
      await window.worionApiMemoryCardSemanticInstructions(card.id, semanticInstructions);
    } else if (card.sourceContext && typeof window.worionApiMemoryCardGenerateFromParentContext === 'function') {
      await window.worionApiMemoryCardGenerateFromParentContext({
        contextSlug: card.sourceContext.slug,
        title: card.title,
        mode: 'card_candidate'
      });
      memoryCardsViewReady = false;
      await loadMemoryCards();
    } else {
      console.warn('[MEMORY CARDS UX] TODO: persistir o card via endpoint dedicado de update');
    }
    showMemoryToast('Memory Card salvo.');
  } catch (err) {
    console.warn('[MEMORY CARDS UX] falha ao salvar card', err);
  }
}

async function suggestContextForMemoryCard(id) {
  try {
    const card = getMemoryCardById(id);
    if (!card) return;
    let result = null;
    if (card.persistedCard && typeof window.worionApiMemoryCardSuggestContext === 'function') {
      result = await window.worionApiMemoryCardSuggestContext(id);
    } else {
      const theme = inferMemoryThemeFromText([card.title, card.desc, card.context, card.cat].join(' '));
      result = {
        suggestedContext: {
          id: card.sourceContext?.id || null,
          title: card.sourceContext?.title || theme.title,
          slug: card.sourceContext?.slug || theme.key,
          domain: card.sourceContext?.domain || theme.cat,
          confidenceScore: theme.score ? 0.72 : 0.3,
          source: card.sourceContext ? 'existing_context' : 'local_theme',
          reason: card.sourceContext ? 'Este item ja veio de um Contexto Pai.' : 'Sugestao local por tema do card.'
        }
      };
    }
    const context = result?.suggestedContext;
    showMemoryToast(context ? `Contexto sugerido: ${context.title}` : 'Nenhum contexto sugerido.');
    if (context) {
      memoryCardsSelectedId = id;
      renderMemoryCardsGrid();
      showMemoryContextSuggestionPanel(result);
    }
  } catch (error) {
    console.warn('[MEMORY CARDS UX] suggest context falhou', error);
  }
}

function showMemoryContextSuggestionPanel(result) {
  const panel = document.getElementById('memory-chat-panel');
  if (!panel) return;
  const context = result?.suggestedContext;
  if (!context) return;
  document.querySelector('.memory-layout')?.classList.add('chat-open');
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div class="memory-chat-header">
      <div>
        <div class="memory-chat-kicker">Sugestà£o de contexto</div>
        <h3>${escapeHtml(context.title || context.slug || 'Contexto sugerido')}</h3>
        <p>${escapeHtml(context.reason || '')}</p>
      </div>
      <div class="memory-chat-header-actions">
        <button class="memory-chat-back" onclick="closeMemoryCardChat()"><i class="ti ti-arrow-left"></i> Voltar</button>
        <button class="memory-chat-close" onclick="closeMemoryCardChat()"><i class="ti ti-x"></i></button>
      </div>
    </div>
    <div class="memory-chat-notice">
      <i class="ti ti-bulb"></i>
      <div>O sistema sugeriu esse contexto para o card. você pode revisar antes de aplicar.</div>
    </div>
    <div class="memory-chat-message-list">
      <div class="memory-chat-system">
        <strong>Slug:</strong> ${escapeHtml(context.slug || '')}<br>
        <strong>Fonte:</strong> ${escapeHtml(context.source || '')}<br>
        <strong>Confianà§a:</strong> ${escapeHtml(String(context.confidenceScore || ''))}
      </div>
    </div>
    <div class="memory-chat-suggestions">
      <button class="memory-chat-chip" onclick="openMemoryContextEditor('${escapeHtml(context.slug || '')}')">Editar contexto</button>
    </div>`;
}

function openMemoryCardChat(id) {
  const card = getMemoryCardById(id);
  if (!card) return;
  memoryCardsSelectedId = card.id;
  memoryCardsChatCardId = card.id;
  currentInspectorContextId = card.id;
  selected = card.id;
  document.querySelector('.memory-layout')?.classList.add('chat-open');
  renderMemoryCardsGrid();
  renderMemoryChatPanel();
}

function openMemoryImportModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop memory-modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-card memory-modal-card memory-import-modal">
      <div class="modal-header">
        <h2>Importar conversa</h2>
        <button class="modal-close" onclick="closeMemoryImportModal(this)"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body memory-modal-body">
        <label>Título da importaçào<input id="memory-import-title" value="Conversa importada"></label>
        <label>Origem
          <select id="memory-import-origin">
            <option value="claude">Claude</option>
            <option value="gpt">GPT</option>
            <option value="worion">Worion</option>
            <option value="markdown">Markdown</option>
            <option value="manual">Manual</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>Arquivo de contexto<input id="memory-import-file" type="file" accept=".md,.txt,.json,.pdf,.docx" onchange="loadMemoryImportFileIntoTextarea()"></label>
        <label>Texto bruto<textarea id="memory-import-raw" rows="12" placeholder="Cole aqui a conversa ou material bruto, ou selecione um arquivo acima..."></textarea></label>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeMemoryImportModal(this)">Cancelar</button>
        <button class="btn-primary" onclick="analyzeMemoryImportFromModal()">Analisar e separar contextos</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
}

async function loadMemoryImportFileIntoTextarea() {
  const input = document.getElementById('memory-import-file');
  const file = input?.files?.[0];
  const textarea = document.getElementById('memory-import-raw');
  if (!file || !textarea) return;
  try {
    showMemoryToast('Lendo arquivo...');
    const filePath = file.path || '';
    const extension = String(file.name || filePath).split('.').pop().toLowerCase();
    let text = '';
    if (filePath && ['txt', 'md', 'json', 'csv'].includes(extension)) {
      text = await fs.readFile(filePath, 'utf-8');
    } else if (filePath && extension === 'docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value || '';
    } else if (filePath && extension === 'pdf') {
      const pdfParse = require('pdf-parse');
      const buffer = await fs.readFile(filePath);
      const result = await pdfParse(buffer);
      text = result.text || '';
    } else {
      text = await file.text();
    }
    textarea.value = text;
    if (!document.getElementById('memory-import-title')?.value || document.getElementById('memory-import-title')?.value === 'Conversa importada') {
      document.getElementById('memory-import-title').value = file.name.replace(/\.[^.]+$/, '');
    }
    showMemoryToast('Arquivo carregado.');
  } catch (error) {
    console.warn('[MEMORY CARDS UX] falha ao ler arquivo', error);
    showMemoryToast('Não consegui ler esse arquivo.');
  }
}

function closeMemoryImportModal(el) {
  el?.closest('.modal-backdrop')?.remove();
}

async function analyzeMemoryImportFromModal() {
  const payload = {
    title: document.getElementById('memory-import-title')?.value.trim() || 'Conversa importada',
    sourceType: 'chat_export',
    rawContent: document.getElementById('memory-import-raw')?.value || '',
    sourceOrigin: document.getElementById('memory-import-origin')?.value || 'unknown'
  };
  try {
    if (typeof window.worionApiMemoryImportAnalyze !== 'function') throw new Error('worionApiMemoryImportAnalyze indisponivel');
    const result = await window.worionApiMemoryImportAnalyze(payload);
    closeMemoryImportModal(document.querySelector('.memory-import-modal .modal-close'));
    showMemoryToast('Importaçào analisada.');
    memoryImportResultState = result;
    await loadMemoryContextCatalog();
    renderMemoryImportResults(result);
  } catch (error) {
    console.warn('[MEMORY CARDS UX] import analyze falhou', error);
  }
}

function renderMemoryImportResults(result) {
  const main = document.getElementById('main');
  if (!main) return;
  const contexts = Array.isArray(result?.detectedContexts) ? result.detectedContexts : [];
  memoryCardsViewReady = false;
  main.innerHTML = `
    <div class="main-header page-header memory-page-header">
      <div>
        <h1 class="main-title page-title">Memory Cards</h1>
        <p class="page-subtitle">Importe uma conversa. O Worion separa os Contextos Pai automaticamente e gera cards a partir deles.</p>
      </div>
      <div class="page-actions">
        <button class="btn-new memory-btn-new" onclick="openMemoryImportModal()"><i class="ti ti-upload" aria-hidden="true"></i> Importar conversa</button>
        <button class="btn-new memory-btn-new" onclick="openMemoryCardModal()"><i class="ti ti-plus" aria-hidden="true"></i> Novo card</button>
      </div>
    </div>
    <section class="memory-import-results">
      <div class="memory-import-results-head">
        <h2>Contextos detectados</h2>
        <button class="btn-new memory-btn-new" onclick="showConnectionsView()">Voltar para cards</button>
      </div>
      <div class="memory-import-results-list">
        ${contexts.map(context => `
          <article class="memory-import-result">
            <div>
              <strong>${escapeHtml(context.title || context.slug || 'Contexto')}</strong>
              <p>${escapeHtml(context.reason || '')}</p>
              <small>${escapeHtml(context.slug || '')} · ${escapeHtml(String(context.unitsCount || 0))} trechos</small>
            </div>
            <div class="memory-import-result-actions">
              <button class="memory-action" onclick="openMemoryContextEditor('${escapeHtml(context.slug || '')}')">Editar contexto</button>
              <button class="memory-action" onclick="generateCardFromContextSlug('${escapeHtml(context.slug || '')}')">Gerar candidato</button>
              <button class="memory-action" onclick="ignoreMemoryContext('${escapeHtml(context.slug || '')}')">Ignorar</button>
            </div>
          </article>`).join('')}
      </div>
    </section>
    <section class="memory-import-units">
      <h2>Unidades semà¢nticas</h2>
      <div class="memory-import-units-list">
        ${(Array.isArray(result?.semanticUnits) ? result.semanticUnits : []).map(unit => `
          <article class="memory-import-unit">
            <strong>${escapeHtml(unit.parentContextSlug || 'a-revisar')}</strong>
            <p>${escapeHtml(unit.summary || '')}</p>
          </article>`).join('')}
      </div>
    </section>`;
}

function getMemoryContextBySlug(slug) {
  return memoryContextCatalog.find(item => String(item.slug) === String(slug))
    || memoryContextsV2.find(item => String(item.raw?.slug || item.slug) === String(slug))?.raw
    || null;
}

function openMemoryContextEditor(slug) {
  const context = getMemoryContextBySlug(slug) || (memoryImportResultState?.detectedContexts || []).find(item => item.slug === slug);
  const metadata = parseMemoryMetadata(context?.metadata);
  const hydrated = memoryContextsV2.find(item => String(item.raw?.slug || item.slug) === String(slug));
  const title = context?.title || hydrated?.title || String(slug || '').replace(/-/g, ' ');
  const description = context?.description || hydrated?.raw?.description || hydrated?.desc || context?.reason || '';
  const consumptionMarkdown = metadata.consumptionMarkdown || hydrated?.context || '';

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop memory-modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-card memory-modal-card memory-context-modal memory-context-modal-simple">
      <div class="modal-header">
        <h2>${slug ? 'Editar contexto' : 'Novo contexto'}</h2>
        <button class="modal-close" onclick="closeMemoryContextModal(this)"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body memory-modal-body-simple">
        <input type="hidden" id="memory-context-slug-hidden" value="${escapeHtml(context?.slug || slug || '')}">

        <div class="form-field">
          <label class="field-label">Nome</label>
          <input
            id="memory-context-title"
            class="memory-input"
            value="${escapeHtml(title)}"
            placeholder="Ex: Projeto Worion, Rotina de saúde, Pesquisa técnica">
        </div>

        <div class="form-field">
          <label class="field-label">Sobre</label>
          <textarea
            id="memory-context-description"
            class="memory-textarea memory-textarea-short"
            placeholder="O que esse contexto guarda...">${escapeHtml(description)}</textarea>
        </div>

        <div class="form-field">
          <label class="field-label">Conteúdo</label>
          <textarea
            id="memory-context-content"
            class="memory-textarea memory-textarea-tall"
            placeholder="Cole texto, documentaçào, ou informações que quer que o Worion lembre...">${escapeHtml(consumptionMarkdown)}</textarea>
          <div class="memory-upload-hint">
            <i class="ti ti-info-circle"></i>
            <span>você também pode colar textos de arquivos .md, .txt, .pdf ou .docx</span>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeMemoryContextModal(this)">Cancelar</button>
        <button class="btn-primary" onclick="saveMemoryContextFromModal()">Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  // Focus no primeiro campo
  setTimeout(() => document.getElementById('memory-context-title')?.focus(), 100);
}

function closeMemoryContextModal(el) {
  el?.closest('.modal-backdrop')?.remove();
}

async function saveMemoryContextFromModal() {
  const existingSlug = document.getElementById('memory-context-slug-hidden')?.value.trim();
  const title = document.getElementById('memory-context-title')?.value.trim();
  const description = document.getElementById('memory-context-description')?.value.trim();
  const consumptionMarkdown = document.getElementById('memory-context-content')?.value || '';

  if (!title) {
    showMemoryToast('Nome é obrigatório.');
    return;
  }

  // Gerar slug automaticamente a partir do título
  const slug = existingSlug || title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaà§os por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-|-$/g, ''); // Remove hífens no início/fim

  try {
    if (typeof window.worionApiMemoryContextUpdate === 'function') {
      await window.worionApiMemoryContextUpdate({
        contextSlug: slug,
        title,
        description,
        inclusion_rules: [], // Gerenciado automaticamente pelo sistema
        exclusion_rules: [], // Gerenciado automaticamente pelo sistema
        status: 'active', // Sempre ativo ao criar/editar
        domain: 'unknown', // Classificado automaticamente pelo sistema
        consumptionMarkdown,
        routingRules: [] // Gerenciado automaticamente pelo sistema
      });
    }

    showMemoryToast('Contexto salvo.');
    closeMemoryContextModal(document.querySelector('.memory-context-modal .modal-close'));
    await loadMemoryContextCatalog();
    await loadMemoryCards();
    if (currentInspectorContextId) renderMemoryChatPanel();
    if (memoryImportResultState) renderMemoryImportResults(memoryImportResultState);
  } catch (error) {
    console.warn('[MEMORY CARDS UX] save context falhou', error);
    showMemoryToast('Erro ao salvar contexto.');
  }
}

function parseMemoryRoutingRules(text) {
  return String(text || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const [left, ...rest] = line.split('|').map(part => part.trim());
    const [pattern, targetContextSlug] = left.split('->').map(part => part.trim());
    return {
      pattern,
      targetContextSlug,
      reason: rest[0] || '',
      priority: Number(rest[1] || 0),
      active: rest[2] ? rest[2].toLowerCase() !== 'off' : true
    };
  }).filter(rule => rule.pattern && rule.targetContextSlug);
}

async function generateCardFromContextSlug(slug) {
  try {
    if (typeof window.worionApiMemoryCardGenerateFromParentContext !== 'function') return;
    const theme = inferMemoryThemeFromText(slug.replace(/-/g, ' '));
    await window.worionApiMemoryCardGenerateFromParentContext({
      contextSlug: slug,
      title: theme.title,
      mode: 'card_candidate'
    });
    memoryCardsViewReady = false;
    await loadMemoryCards();
    showMemoryToast('Card gerado.');
  } catch (error) {
    console.warn('[MEMORY CARDS UX] generate card falhou', error);
  }
}

function ignoreMemoryContext(slug) {
  console.log('[MEMORY CARDS UX] ignoreMemoryContext TODO', slug);
}

async function deleteMemoryCard(cardId, contextSlug) {
  const confirmed = await window.showConfirmModal({
    title: 'Excluir contexto',
    message: 'Tem certeza que deseja excluir este contexto? Esta ação Não pode ser desfeita.',
    confirmText: 'Excluir',
    cancelText: 'Cancelar'
  });

  if (!confirmed) return;

  try {
    // Se for um contexto, usar a API de contextos
    if (contextSlug && typeof window.worionApiMemoryContextDelete === 'function') {
      await window.worionApiMemoryContextDelete({ contextSlug });
    } else if (typeof window.worionApiMemoryCardDelete === 'function') {
      await window.worionApiMemoryCardDelete({ cardId });
    }

    showMemoryToast('Contexto excluído.');
    memoryCardsViewReady = false;
    await loadMemoryCards();
  } catch (error) {
    console.warn('[MEMORY CARDS UX] delete card falhou', error);
    showMemoryToast('Erro ao excluir contexto.');
  }
}

function renderMemoryChatPanel() {
  const panel = document.getElementById('memory-chat-panel');
  const card = getCurrentInspectorContext() || (memoryCardsChatCardId ? getMemoryCardById(memoryCardsChatCardId) : null);
  if (!panel) return;
  if (!card) {
    panel.classList.add('hidden');
    document.querySelector('.memory-layout')?.classList.remove('chat-open');
    return;
  }
  panel.classList.remove('hidden');

  const inclusionRules = card.inclusionRules || [];
  const exclusionRules = card.exclusionRules || [];
  const desc = card.desc || card.raw?.description || '';

  let rulesHtml = '';
  if (inclusionRules.length || exclusionRules.length) {
    rulesHtml = '<div class="memory-inspector-rules-section">';
    if (inclusionRules.length) {
      rulesHtml += `
        <div class="memory-inspector-rules-group">
          <h4 class="memory-inspector-rules-title">Regras de inclusão</h4>
          <ul class="memory-inspector-rules-list">
            ${inclusionRules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}
          </ul>
        </div>`;
    }
    if (exclusionRules.length) {
      rulesHtml += `
        <div class="memory-inspector-rules-group">
          <h4 class="memory-inspector-rules-title">Regras de exclusão</h4>
          <ul class="memory-inspector-rules-list">
            ${exclusionRules.map(rule => `<li>${escapeHtml(rule)}</li>`).join('')}
          </ul>
        </div>`;
    }
    rulesHtml += '</div>';
  }

  panel.innerHTML = `
    <div class="memory-inspector-header">
      <button class="memory-chat-close" onclick="closeMemoryCardChat()"><i class="ti ti-x"></i></button>
    </div>
    <div class="memory-inspector-scroll">
      <div class="memory-inspector-title-section">
        <h3 class="memory-inspector-title">${escapeHtml(card.title)}</h3>
        ${desc ? `<p class="memory-inspector-description">${escapeHtml(desc)}</p>` : ''}
      </div>
      <div class="memory-inspector-content" data-memory-selectable>
        ${renderMarkdown(card.context || 'Sem conteúdo para pré-visualizar.')}
      </div>
      ${rulesHtml}
      ${Array.isArray(card.sourceTitles) && card.sourceTitles.length ? `<div class="memory-inspector-sources"><strong>Fontes:</strong> ${escapeHtml(card.sourceTitles.join(', '))}</div>` : ''}
    </div>
    <div class="memory-inspector-footer">
      <div class="memory-inspector-actions">
        <button class="memory-action-btn" onclick="openMemorySelectionModal()"><i class="ti ti-text-recognition"></i> Selecionar trecho</button>
        <button class="memory-action-btn" onclick="openMemorySelectedTextInChat()"><i class="ti ti-corner-up-right"></i> Levar ao chat</button>
        ${card.kind === 'context' ? `<button class="memory-action-btn" onclick="generateCardFromContextSlug('${escapeHtml(card.raw?.slug || '')}')"><i class="ti ti-cards"></i> Gerar card</button>` : ''}
      </div>
      <button class="btn-primary memory-open-chat-btn" onclick="openMemoryItemInChat()"><i class="ti ti-message"></i> Abrir chat</button>
    </div>`;
}

function renderMemoryChatMessages(card) {
  const rules = [
    ...(card.inclusionRules || []).map(rule => `Inclui: ${rule}`),
    ...(card.exclusionRules || []).map(rule => `Exclui: ${rule}`)
  ];
  return `
    <div class="memory-chat-system">
      <strong>${escapeHtml(card.kind === 'legacy' ? 'Fonte/Legado' : card.kind === 'file' ? 'Arquivo' : card.kind === 'context' ? 'Contexto V2' : 'Card V2')}</strong><br>
      ${escapeHtml(card.cat || 'sem dominio')} · ${escapeHtml(card.status || 'sem status')} · ${escapeHtml(card.date || '')}
      ${Array.isArray(card.sourceTitles) && card.sourceTitles.length ? `<br><span>Fonte: ${escapeHtml(card.sourceTitles.join(', '))}</span>` : ''}
    </div>
    <div class="memory-inspector-content" data-memory-selectable>${renderMarkdown(card.context || card.desc || 'Sem conteúdo para pré-visualizar.')}</div>
    ${rules.length ? `<div class="memory-chat-system">${rules.map(rule => escapeHtml(rule)).join('<br>')}</div>` : ''}`;
}

function closeMemoryCardChat() {
  memoryCardsChatCardId = null;
  currentInspectorContextId = null;
  selected = null;
  document.querySelector('.memory-layout')?.classList.remove('chat-open');
  renderMemoryChatPanel();
  renderMemoryCardsGrid();
}

function setMemoryChatInput(value) {
  const input = document.getElementById('memory-chat-input');
  if (input) input.value = value;
  input?.focus();
}

function buildMemoryChatContext(card, selectionText = '') {
  const content = String(selectionText || card.context || card.desc || '').trim();
  const raw = card.raw || {};
  const rowText = getMemoryRowText(raw);
  return [
    `# Contexto carregado: ${card.title}`,
    '',
    raw.slug ? `Slug: ${raw.slug}` : '',
    raw.id ? `ID: ${raw.id}` : '',
    card.cat ? `Categoria/dominio: ${card.cat}` : '',
    card.status ? `Status: ${card.status}` : '',
    raw.created_at ? `Criado em: ${raw.created_at}` : '',
    raw.updated_at ? `Atualizado em: ${raw.updated_at}` : '',
    '',
    '## descrição',
    raw.description || card.desc || '(sem descrição)',
    '',
    '## Regras de entrada',
    (card.inclusionRules || []).length ? card.inclusionRules.map(rule => `- ${rule}`).join('\n') : '- nenhuma',
    '',
    '## Regras de exclusao',
    (card.exclusionRules || []).length ? card.exclusionRules.map(rule => `- ${rule}`).join('\n') : '- nenhuma',
    '',
    Array.isArray(card.sourceTitles) && card.sourceTitles.length ? '## Fontes vinculadas' : '',
    Array.isArray(card.sourceTitles) && card.sourceTitles.length ? card.sourceTitles.map(title => `- ${title}`).join('\n') : '',
    '',
    '## Conteudo bruto/contexto',
    '```md',
    content || rowText || '(sem conteudo)',
    '```'
  ].filter(Boolean).join('\n');
}

function buildVisibleMemoryContextMessage(card, selectionText = '') {
  const desc = card.desc || card.raw?.description || '';
  const descLine = desc ? `\n\n${desc.slice(0, 200)}${desc.length > 200 ? '...' : ''}` : '';

  return [
    `**Contexto ativo:** ${card.title}${descLine}`,
    '',
    'Pergunte, peça uma síntese ou selecione um trecho para aprofundar.'
  ].join('\n');
}

async function startChatWithCard(cardId, initialMessage = '') {
  if (!cardId) return;

  const runtime = memoryRuntime();
  const resolved = resolveValidMemoryCardForRuntime({ id: cardId });
  const card = resolved.card;
  const initialText = String(initialMessage || '').trim();
  console.log('[MEMORY CARD CHAT] requested card ref:', { id: cardId, hasInitialMessage: Boolean(initialText) });
  console.log('[MEMORY CARD CHAT] resolved card:', card ? {
    id: card.id || null,
    slug: card.slug || card.raw?.slug || null,
    key: card.key || null,
    title: card.title || card.name || '',
    contextId: resolved.contextId || null
  } : null);
  console.log('[MEMORY CARD CHAT] resolved context:', resolved.context ? {
    id: resolved.context.id || resolved.context.raw?.id || null,
    title: resolved.context.title || resolved.context.raw?.title || '',
    status: resolved.context.status || resolved.context.raw?.status || ''
  } : null);

  if (!resolved.valid) {
    if (resolved.reason === 'not_found') {
    console.warn('[MEMORY CARD CHAT] card not found:', { id: cardId });
    showMemoryToast('Card Não encontrado');
    return;
    }
    if (resolved.reason === 'orphan') {
      console.warn('[MEMORY CARD CHAT] blocked orphan card:', { id: card?.id, title: card?.title });
      showMemoryToast('Card órfão não pode ser ativado');
    return;
  }
    if (resolved.reason === 'archived' || resolved.reason === 'draft') {
      console.warn('[MEMORY CARD CHAT] blocked card with invalid status:', { id: card?.id, status: resolved.reason });
      showMemoryToast(`Card ${resolved.reason} não pode ser ativado`);
      return;
    }
    console.warn('[MEMORY CARD CHAT] blocked card with inactive/missing context:', {
      cardId: card?.id,
      contextId: resolved.contextId,
      reason: resolved.reason
    });
    showMemoryToast('Contexto do card não está ativo');
    return;
  }
  console.log('[MEMORY CARD CHAT] validated card:', { id: card.id, contextId: resolved.contextId, contextStatus: 'active' });

  const canonicalCardId = card.id || card.raw?.id || card.slug || card.key || cardId;
  if (window.ChatDelivery?.deliverMemoryCard) {
    await window.ChatDelivery.deliverMemoryCard(canonicalCardId);
  }
  const runtimeContextBlock = runtime?.activateMemoryCardForChat?.(canonicalCardId)
    || runtime?.buildMemoryCardChatContext?.(canonicalCardId)
    || '';
  if (!runtimeContextBlock) {
    console.warn('[MEMORY CARD CHAT] valid card has no runtime context block:', { id: canonicalCardId, contextId: resolved.contextId });
    showMemoryToast('Contexto do card indisponível.');
    return;
  }
  console.log('[MEMORY CARD CHAT] creating/opening chat with card:', {
    id: canonicalCardId,
    title: card.title || card.name || ''
  });

  // Configurar contexto
  window.activeMemoryCardId = canonicalCardId;
  window.currentMemoryCardProjectId = canonicalCardId;
  window.memoryCardChatStartedId = canonicalCardId;
  window.currentChatSource = 'home';
  window.currentMemoryChatTitle = card.title;

  // Reset chat
  currentAgent = null;
  currentProjectContext = null;
  currentConversationId = typeof makeId === 'function' ? makeId('memory') : `memory-${Date.now()}`;
  sessionStartedAt = null;
  messages = [];

  console.log('[MEMORY CARD CHAT] navigating to chat view');
  if (typeof window.startChat === 'function') {
    await window.startChat({ keepMessages: true, loadHistory: false });
  } else if (typeof startChat === 'function') {
    await startChat({ keepMessages: true, loadHistory: false });
  } else {
    console.warn('[MEMORY CARD CHAT] startChat unavailable');
    showMemoryToast('Chat indisponível.');
    return;
  }

  console.log('[MEMORY CARD CHAT] render target:', {
    view: 'new-chat',
    container: '#main',
    hasChatPanel: Boolean(document.querySelector('#main .chat-panel')),
    hasMemoryProjectPage: Boolean(document.querySelector('#main .memory-project-page'))
  });
  console.log('[MEMORY CARD CHAT] active memory card in chat:', {
    id: window.currentMemoryCardProjectId || null,
    title: window.currentMemoryChatTitle || ''
  });

  const input = document.getElementById('chat-in');
  if (input) {
    input.placeholder = `Pergunte usando ${card.title || 'Memory Card'}...`;
    if (initialText) {
      input.value = initialText;
      if (typeof autoResizeTextarea === 'function') autoResizeTextarea(input);
    }
    input.focus();
  }

  if (initialText && typeof window.sendMsg === 'function') {
    await window.sendMsg();
  }

  showMemoryToast(`Chat iniciado com: ${card.title}`);
}

async function openMemoryItemInChat(id = null, selectionText = '') {
  const card = resolveMemoryActionCard(id);
  if (!card) return;
  const resolved = resolveValidMemoryCardForRuntime(card);
  if (resolved.valid) {
    await startChatWithCard(resolved.card.id || resolved.card.raw?.id || id, selectionText);
    return;
  }
  window.currentChatSource = 'home';
  window.currentMemoryChatTitle = card.title;
  currentAgent = getDefaultAgent();
  currentProjectContext = null;
  currentConversationId = typeof makeId === 'function' ? makeId('memory') : `memory-${Date.now()}`;
  sessionStartedAt = null;
  messages = [{
    role: 'assistant',
    content: buildVisibleMemoryContextMessage(card, selectionText),
    createdAt: new Date().toISOString()
  }];
  resetSilentIncorporatedContext();
  appendSilentIncorporatedContext(buildMemoryChatContext(card, selectionText));
  await startChat({ keepMessages: true, loadHistory: false });
  await saveConversationSnapshot(buildConversationSnapshot({ title: card.title }), { silent: true });
  const input = document.getElementById('chat-in');
  if (input) {
    input.value = '';
    input.placeholder = selectionText ? 'Pergunte sobre o trecho selecionado...' : `Pergunte sobre ${card.title}...`;
    autoResizeTextarea(input);
    input.focus();
  }
}

function openMemorySelectionModal(id = null) {
  const card = resolveMemoryActionCard(id);
  if (!card) return;
  const selectedText = getVisibleSelectionText() || window.getSelection?.()?.toString()?.trim() || '';
  openAskSelectionModal(selectedText || String(card.context || card.desc || '').slice(0, 12000));
}

async function openMemorySelectedTextInChat(id = null) {
  const card = resolveMemoryActionCard(id);
  if (!card) return;
  const selectedText = getVisibleSelectionText() || window.getSelection?.()?.toString()?.trim() || '';
  await openMemoryItemInChat(card.id, selectedText || String(card.context || card.desc || '').slice(0, 12000));
}

function handleMemoryChatKeydown(event, id) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMemoryChatMessage(id);
  }
}

function sendMemoryChatMessage(id) {
  const input = document.getElementById('memory-chat-input');
  const text = input?.value.trim();
  if (!text) return;
  const list = document.getElementById('memory-chat-message-list');
  if (list) {
    list.insertAdjacentHTML('beforeend', `<div class="memory-chat-bubble memory-chat-user">${escapeHtml(text)}</div>`);
    list.insertAdjacentHTML('beforeend', `<div class="memory-chat-bubble memory-chat-bot">Abra o chat principal para consultar este conteúdo com o modelo.</div>`);
    list.scrollTop = list.scrollHeight;
  }
  if (input) input.value = '';
}

function showMemoryToast(message) {
  const toast = document.createElement('div');
  toast.className = 'memory-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  }, 1600);
}

function hashString(value) {
  let hash = 0;
  const str = String(value || '');
  for (let i = 0; i < str.length; i += 1) hash = ((hash << 5) - hash) + str.charCodeAt(i);
  return Math.abs(hash);
}

async function showConnectionsView() {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  if (!(await leaveChatIfNeeded())) return;
  if (window.WorionMemoryCardsRuntime) {
    showMemoryLoading();
    await loadMemoryCards();
    selected = null;
    currentAgent = null;
    window.currentMemoryCardProjectId = '';
    window.currentMemoryChatTitle = '';
    activeSkillId = null;
    activeWorkModeId = null;
    activeWorkModeIds = [];
    chatMode = false;
    messages = [];
    currentProjectContext = null;
    editingConnectionId = null;
    document.querySelector('.shell').classList.remove('chat-fullscreen');
    document.getElementById('detail-panel').style.display = 'none';
    renderMemoryRuntimeGovernancePanel();
    return;
  }
  showMemoryLoading();
  selected = null;
  currentAgent = null;
  window.currentMemoryChatTitle = '';
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  chatMode = false;
  messages = [];
  currentProjectContext = null;
  editingConnectionId = null;
  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';
  memoryCardsViewReady = false;
  await loadMemoryCards();
}

function memoryRuntime() {
  return window.WorionMemoryCardsRuntime || null;
}

function renderMemoryRuntimeGovernancePanel() {
  const runtime = memoryRuntime();
  const main = document.getElementById('main');
  if (!runtime || !main) return;
  setActiveView('connections');
  const query = memoryRuntimeSearchQuery.toLowerCase();
  const cards = runtime.getMemoryCardsList()
    .filter(card => resolveValidMemoryCardForRuntime(card).valid)
    .filter(card => !query || [card.title, card.description, ...(card.tags || [])].join(' ').toLowerCase().includes(query));

  main.innerHTML = `
    <div class="memory-projects-page">
      <div class="memory-projects-header">
        <h1>Memory Cards</h1>
        <button class="btn-primary" onclick="openMemoryCardModal()"><i class="ti ti-plus"></i> Novo card</button>
      </div>
      <div class="memory-projects-search">
        <i class="ti ti-search"></i>
        <input id="memory-runtime-search-input" type="text" value="${escapeHtml(memoryRuntimeSearchQuery)}" placeholder="Procurar memory cards..." oninput="memoryRuntimeFilterProjects(this.value)">
      </div>
      <div class="memory-projects-grid">
        ${cards.map(card => renderMemoryProjectCard(card)).join('') || '<div class="memory-runtime-empty-panel">Nenhum Memory Card encontrado.</div>'}
      </div>
    </div>`;
}

function renderMemoryProjectCard(card) {
  const updatedLabel = card.updatedAt ? `Atualizado ${new Date(card.updatedAt).toLocaleDateString('pt-BR')}` : '';
  return `
    <div class="memory-project-card">
      <div class="memory-project-card-head">
        <strong onclick="openMemoryCardProjectPage('${escapeHtml(card.id)}')">${escapeHtml(card.title)}</strong>
        <button onclick="toggleMemoryCardActionMenu(event, '${escapeHtml(card.id)}')"><i class="ti ti-dots"></i></button>
      </div>
      <p onclick="openMemoryCardProjectPage('${escapeHtml(card.id)}')">${escapeHtml(String(card.description || '').slice(0, 150))}${String(card.description || '').length > 150 ? '...' : ''}</p>
      ${updatedLabel ? `<span class="memory-project-card-updated">${escapeHtml(updatedLabel)}</span>` : ''}
      <div class="memory-project-card-actions">
        <button class="memory-project-card-btn" onclick="startChatWithCard('${escapeHtml(card.id)}')"><i class="ti ti-message-circle"></i> Iniciar Chat</button>
        <button class="memory-project-card-btn-secondary" onclick="openMemoryCardProjectPage('${escapeHtml(card.id)}')"><i class="ti ti-edit"></i> Editar</button>
      </div>
    </div>`;
}

function memoryRuntimeFilterProjects(value) {
  memoryRuntimeSearchQuery = String(value || '').trim();
  renderMemoryRuntimeGovernancePanel();
}

async function openMemoryCardProjectPage(cardId) {
  const runtime = memoryRuntime();
  const card = runtime?.openMemoryCardProject(cardId);
  if (!card) return;
  collapseSidebarForDetailView();
  window.currentChatSource = 'home';
  window.currentMemoryCardProjectId = cardId;
  window.currentMemoryChatTitle = card.title;
  currentAgent = null;
  currentProjectContext = null;
  currentConversationId = typeof makeId === 'function' ? makeId(`memory-${cardId}`) : `memory-${cardId}-${Date.now()}`;
  sessionStartedAt = null;
  messages = [];
  if (typeof resetSilentIncorporatedContext === 'function') resetSilentIncorporatedContext();
  runtime.activateMemoryCardForChat(cardId);
  renderMemoryCardProjectPage(cardId);
}

function renderMemoryCardProjectPage(cardId) {
  const runtime = memoryRuntime();
  const card = runtime?.getCard(cardId);
  const main = document.getElementById('main');
  if (!runtime || !card || !main) return;
  setActiveView('connections');
  closeAskSelectionPopover();
  const files = runtime.getMemoryCardFiles(cardId);
  const cards = runtime.getMemoryCardsList();
  const rulesInfo = runtime.getMemoryCardRulesInfo?.(card) || { text: runtime.getMemoryCardInstructions(cardId), fieldUsed: 'runtime.getMemoryCardInstructions' };
  const instructionsPreview = String(rulesInfo.text || '').split(/\r?\n/).filter(Boolean).slice(0, 3).join(' ');
  const messagesHtml = messages.map((message, index) => renderMessageHtml(message, index)).join('');
  const chatStarted = window.memoryCardChatStartedId === card.id && Boolean(chatMode);
  main.innerHTML = `
    <div class="memory-project-page">
      <main class="memory-project-main">
        <button class="memory-project-back" onclick="backToMemoryCardsList()">
          <i class="ti ti-arrow-left"></i> Todos os cards
        </button>
        <div class="memory-project-title-row">
          <div>
            <h1>${escapeHtml(card.title)}</h1>
            <p>${escapeHtml(card.content || '')}</p>
          </div>
          <div class="memory-project-icons">
            <button title="Menu" onclick="toggleMemoryCardActionMenu(event, '${escapeHtml(card.id)}')"><i class="ti ti-dots-vertical"></i></button>
            <button title="Favorito"><i class="ti ti-star"></i></button>
          </div>
        </div>
        <div class="memory-project-composer">
          <textarea id="memory-card-start-input" placeholder="O que vc está pensando..." rows="1" spellcheck="true" lang="pt-BR" oninput="autoResizeTextarea(this)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();startChatWithCard('${escapeHtml(card.id)}', this.value)}"></textarea>
          <div class="memory-project-composer-row">
            <button class="chat-attach-btn" onclick="triggerFileUpload()" title="Adicionar"><i class="ti ti-plus"></i></button>
            <button class="send-btn" onclick="startChatWithCard('${escapeHtml(card.id)}', document.getElementById('memory-card-start-input')?.value || '')" title="Enviar"><i class="ti ti-send"></i></button>
          </div>
        </div>
      </main>
      <aside class="memory-project-knowledge">
        <section class="memory-project-knowledge-section">
          <div>
            <h2>Conhecimento do card</h2>
            <p>Este card usa as instruções e arquivos abaixo como contexto silencioso nas conversas iniciadas aqui.</p>
          </div>
          <span>Ativo apenas neste card</span>
          <div class="memory-project-active-card">
            <small>Memory Card ativo</small>
            <strong>${escapeHtml(card.title)}</strong>
          </div>
          <ul class="memory-project-used-content">
            <li>Contextos integrados</li>
            <li>Arquivos anexados</li>
            <li>Resumo contextual</li>
          </ul>
          <button class="memory-project-text-action" onclick="updateMemoryCardKnowledgeFromPanel('${escapeHtml(card.id)}')" title="Atualizar card">
            <i class="ti ti-refresh"></i><span>Atualizar card</span>
          </button>
        </section>
        <section class="memory-project-knowledge-section split actionable" onclick="openMemoryCardInstructionsModal('${escapeHtml(card.id)}')">
          <div>
            <h3>Regras opcionais</h3>
            <p>Use apenas para regras específicas de uso deste card. O contexto principal vem do Conhecimento do card.</p>
            <small class="memory-project-instructions-preview">${escapeHtml(instructionsPreview.slice(0, 220))}${instructionsPreview.length > 220 ? '...' : ''}</small>
          </div>
          <button class="memory-project-text-action" onclick="event.stopPropagation();openMemoryCardInstructionsModal('${escapeHtml(card.id)}')" title="Editar regras">
            <i class="ti ti-plus"></i><span>Editar regras</span>
          </button>
        </section>
        <section class="memory-project-knowledge-section split">
          <div>
            <h3>Arquivos</h3>
            <p>${files.length} arquivo(s) anexado(s)</p>
          </div>
          <button class="memory-project-text-action" onclick="openMemoryCardFilePicker('${escapeHtml(card.id)}')" title="Anexar arquivo">
            <i class="ti ti-plus"></i><span>Anexar arquivo</span>
          </button>
        </section>
        <div class="memory-project-file-meter"><span style="width:${Math.min(100, files.length * 8)}%"></span></div>
        <div class="memory-project-files">
          ${files.length ? files.map(file => `
            <article class="memory-project-file">
              <div>
                <strong>${escapeHtml(file.name)}</strong>
                <small>${escapeHtml(formatMemoryCardFileMeta(file))}</small>
              </div>
              <button class="memory-project-remove-file" onclick="removeMemoryCardFile('${escapeHtml(card.id)}', '${escapeHtml(file.id)}')" title="Remover arquivo"><i class="ti ti-x"></i><span>Remover</span></button>
            </article>`).join('') : '<div class="memory-runtime-empty">Nenhum arquivo anexado.</div>'}
        </div>
      </aside>
    </div>`;
}

function formatMemoryCardFileMeta(file) {
  const ext = String(file.name || '').split('.').pop()?.toUpperCase() || (file.type || 'TXT').split('/').pop().toUpperCase();
  const size = Number(file.size || 0);
  const kb = size ? `${Math.max(1, Math.round(size / 1024))} KB` : '';
  const lines = file.lineCount ? `${file.lineCount} linhas` : '';
  return [ext, kb || lines, kb && lines ? lines : ''].filter(Boolean).join(' · ');
}

function toggleMemoryCardActionMenu(event, cardId) {
  event?.stopPropagation();
  document.querySelector('.memory-card-action-menu')?.remove();
  const menu = document.createElement('div');
  menu.className = 'memory-card-action-menu';
  menu.innerHTML = `
    <button onclick="editMemoryCardInline('${escapeHtml(cardId)}'); closeMemoryCardActionMenu();"><i class="ti ti-edit"></i> Editar nome/descrição</button>
    <button disabled><i class="ti ti-copy"></i> Duplicar card local <span>em breve</span></button>
    <button onclick="archiveMemoryCardLocal('${escapeHtml(cardId)}'); closeMemoryCardActionMenu();"><i class="ti ti-archive"></i> Arquivar card local</button>
    <button onclick="deleteMemoryCardLocal('${escapeHtml(cardId)}'); closeMemoryCardActionMenu();" class="danger"><i class="ti ti-trash"></i> Excluir card local</button>
  `;
  document.body.appendChild(menu);
  const rect = event.currentTarget.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.left = `${Math.min(window.innerWidth - 250, Math.max(12, rect.right - 240))}px`;
  setTimeout(() => {
    document.addEventListener('click', closeMemoryCardActionMenu, { once: true });
  }, 0);
}

function closeMemoryCardActionMenu() {
  document.querySelector('.memory-card-action-menu')?.remove();
}

async function editMemoryCardInline(cardId) {
  const card = memoryCardsV2.find(c => c.id === cardId) ||
               memoryContextsV2.find(c => c.id === cardId);

  if (!card) {
    showMemoryToast('Card Não encontrado');
    return;
  }

  const newTitle = prompt('Editar título:', card.title || '');
  if (newTitle === null) return; // Cancelou

  const newSummary = prompt('Editar descrição/resumo:', card.raw?.summary || card.desc || '');
  if (newSummary === null) return; // Cancelou

  try {
    const { createClient } = require('@supabase/supabase-js');
    const SUPABASE_URL = process.env.WORION_MEMORY_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.WORION_MEMORY_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const table = card.kind === 'card' ? 'memory_cards_v2' : 'memory_contexts';
    const updates = { title: newTitle.trim() };
    if (card.kind === 'card') updates.summary = newSummary.trim();
    if (card.kind === 'context') updates.description = newSummary.trim();

    const { error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', cardId);

    if (error) throw error;

    // Atualizar local
    card.title = newTitle.trim();
    if (card.kind === 'card') card.desc = newSummary.trim();
    if (card.kind === 'context') card.desc = newSummary.trim();

    renderMemoryCardsView();
    showMemoryToast('Card atualizado com sucesso');
  } catch (err) {
    console.error('[Memory] Erro ao editar card:', err);
    showMemoryToast('Erro ao editar card');
  }
}

async function archiveMemoryCardLocal(cardId) {
  if (!confirm('Arquivar este card? Ele ficará oculto mas Não será excluído.')) return;

  try {
    const { createClient } = require('@supabase/supabase-js');
    const SUPABASE_URL = process.env.WORION_MEMORY_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.WORION_MEMORY_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Determinar tabela
    const card = memoryCardsV2.find(c => c.id === cardId) ||
                 memoryContextsV2.find(c => c.id === cardId);
    if (!card) {
      showMemoryToast('Card Não encontrado');
      return;
    }

    const table = card.kind === 'card' ? 'memory_cards_v2' : 'memory_contexts';

    const { error } = await supabase
      .from(table)
      .update({ status: 'archived' })
      .eq('id', cardId);

    if (error) throw error;

    // Remover da lista local
    if (card.kind === 'card') {
      window.memoryCardsV2 = memoryCardsV2.filter(c => c.id !== cardId);
    } else {
      window.memoryContextsV2 = memoryContextsV2.filter(c => c.id !== cardId);
    }

    renderMemoryCardsView();
    showMemoryToast('Card arquivado com sucesso');
  } catch (err) {
    console.error('[Memory] Erro ao arquivar card:', err);
    showMemoryToast('Erro ao arquivar card');
  }
}

async function deleteMemoryCardLocal(cardId) {
  if (!confirm('Atenção: Excluir permanentemente este card? Esta ação Não pode ser desfeita.')) return;

  try {
    const { createClient } = require('@supabase/supabase-js');
    const SUPABASE_URL = process.env.WORION_MEMORY_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.WORION_MEMORY_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Determinar tabela
    const card = memoryCardsV2.find(c => c.id === cardId) ||
                 memoryContextsV2.find(c => c.id === cardId);
    if (!card) {
      showMemoryToast('Card Não encontrado');
      return;
    }

    const table = card.kind === 'card' ? 'memory_cards_v2' : 'memory_contexts';

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', cardId);

    if (error) throw error;

    // Remover da lista local
    if (card.kind === 'card') {
      window.memoryCardsV2 = memoryCardsV2.filter(c => c.id !== cardId);
    } else {
      window.memoryContextsV2 = memoryContextsV2.filter(c => c.id !== cardId);
    }

    renderMemoryCardsView();
    showMemoryToast('Card excluído permanentemente');
  } catch (err) {
    console.error('[Memory] Erro ao excluir card:', err);
    showMemoryToast('Erro ao excluir card');
  }
}

function toggleMemoryCardSwitcher(event) {
  event?.stopPropagation();
  const existing = document.getElementById('memory-card-switcher');
  if (existing) {
    closeMemoryCardSwitcher();
    return;
  }
  const runtime = memoryRuntime();
  const cards = runtime?.getMemoryCardsList?.() || [];
  const anchor = event?.currentTarget;
  const rect = anchor?.getBoundingClientRect?.();
  const menu = document.createElement('div');
  menu.id = 'memory-card-switcher';
  menu.className = 'memory-card-switcher open';
  menu.innerHTML = cards.map(item => `
    <button onclick="switchMemoryCardProject('${escapeHtml(item.id)}')">${escapeHtml(item.title)}</button>
  `).join('');
  document.body.appendChild(menu);
  const width = Math.min(360, window.innerWidth - 24);
  const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect ? rect.left : 12));
  const desiredTop = rect ? rect.bottom + 8 : 80;
  const maxTop = window.innerHeight - Math.min(320, window.innerHeight - 80) - 12;
  menu.style.width = `${width}px`;
  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(12, Math.min(desiredTop, maxTop))}px`;
  window.__memoryCardSwitcherEscHandler = switcherEvent => {
    if (switcherEvent.key === 'Escape') closeMemoryCardSwitcher();
  };
  document.addEventListener('keydown', window.__memoryCardSwitcherEscHandler);
  setTimeout(() => document.addEventListener('click', closeMemoryCardSwitcher, { once: true }), 0);
}

function closeMemoryCardSwitcher() {
  document.getElementById('memory-card-switcher')?.remove();
  if (window.__memoryCardSwitcherEscHandler) {
    document.removeEventListener('keydown', window.__memoryCardSwitcherEscHandler);
    window.__memoryCardSwitcherEscHandler = null;
  }
}

function switchMemoryCardProject(cardId) {
  closeMemoryCardSwitcher();
  const runtime = memoryRuntime();
  const card = runtime?.openMemoryCardProject(cardId);
  if (!card) return;
  window.currentMemoryCardProjectId = cardId;
  window.currentMemoryChatTitle = card.title;
  runtime.activateMemoryCardForChat(cardId);
  if (typeof resetSilentIncorporatedContext === 'function') resetSilentIncorporatedContext();
  renderMemoryCardProjectPage(cardId);
}

function backToMemoryCardsList() {
  window.currentMemoryCardProjectId = '';
  window.currentMemoryChatTitle = '';
  messages = [];
  if (typeof resetSilentIncorporatedContext === 'function') resetSilentIncorporatedContext();
  renderMemoryRuntimeGovernancePanel();
}

function openMemoryCardInstructionsModal(cardId) {
  const runtime = memoryRuntime();
  const card = runtime?.getCard(cardId);
  if (!runtime || !card) return;
  closeMemoryCardInstructionsModal(true);
  const modal = document.createElement('div');
  modal.className = 'memory-project-modal-backdrop';
  modal.id = 'memory-card-instructions-modal';
  const rulesInfo = runtime.getMemoryCardRulesInfo?.(card) || {
    text: runtime.getMemoryCardInstructions(cardId),
    fieldUsed: 'runtime.getMemoryCardInstructions'
  };
  const instructions = rulesInfo.text || '';
  console.log('[MEMORY CARD RULES] modal loaded:', {
    cardId: card.id || cardId,
    title: card.title || '',
    fieldUsed: rulesInfo.fieldUsed,
    textLength: instructions.length
  });
  modal.innerHTML = `
    <div class="memory-project-modal" onclick="event.stopPropagation()">
      <div class="memory-project-modal-header">
        <div>
          <h2>Criar instruções para o card</h2>
          <p>Dê ao Worion instruções e informações relevantes para conversas dentro deste Memory Card.</p>
        </div>
        <button class="memory-project-modal-close" onclick="closeMemoryCardInstructionsModal(true)" title="Fechar"><i class="ti ti-x"></i></button>
      </div>
      <div class="memory-project-modal-body">
        <textarea id="memory-card-instructions-text" data-original="${escapeHtml(instructions)}">${escapeHtml(instructions)}</textarea>
      </div>
      <div class="memory-project-modal-actions">
        <button class="btn-secondary" onclick="closeMemoryCardInstructionsModal(true)">Cancelar</button>
        <button class="btn-primary" onclick="saveMemoryCardInstructionsFromModal('${escapeHtml(cardId)}')">Salvar instruções</button>
      </div>
    </div>`;
  modal.addEventListener('click', () => closeMemoryCardInstructionsModal(false));
  document.body.appendChild(modal);
  window.__memoryCardInstructionsEscHandler = event => {
    if (event.key === 'Escape') closeMemoryCardInstructionsModal(false);
  };
  document.addEventListener('keydown', window.__memoryCardInstructionsEscHandler);
  setTimeout(() => {
    const textarea = document.getElementById('memory-card-instructions-text');
    textarea?.focus();
    textarea?.setSelectionRange(0, 0);
  }, 0);
}

function closeMemoryCardInstructionsModal(force = false) {
  const textarea = document.getElementById('memory-card-instructions-text');
  if (!force && textarea && textarea.value !== textarea.dataset.original) {
    if (!window.confirm('Descartar alterações nas instruções?')) return;
  }
  if (window.__memoryCardInstructionsEscHandler) {
    document.removeEventListener('keydown', window.__memoryCardInstructionsEscHandler);
    window.__memoryCardInstructionsEscHandler = null;
  }
  document.getElementById('memory-card-instructions-modal')?.remove();
}

async function saveMemoryCardInstructionsFromModal(cardId) {
  const text = document.getElementById('memory-card-instructions-text')?.value || '';
  const runtime = memoryRuntime();
  await runtime?.saveMemoryCardInstructions(cardId, text);
  if (window.currentMemoryCardProjectId === cardId && typeof resetSilentIncorporatedContext === 'function') {
    resetSilentIncorporatedContext();
  }
  closeMemoryCardInstructionsModal(true);
  renderMemoryCardProjectPage(cardId);
  showMemoryToast('instruções salvas.');
}

async function updateMemoryCardKnowledgeFromPanel(cardId) {
  const runtime = memoryRuntime();
  if (!runtime?.updateMemoryCardKnowledge) return;
  await runtime.updateMemoryCardKnowledge(cardId);
  if (window.currentMemoryCardProjectId === cardId && typeof resetSilentIncorporatedContext === 'function') {
    resetSilentIncorporatedContext();
  }
  renderMemoryCardProjectPage(cardId);
  showMemoryToast('Card atualizado.');
}

function openMemoryCardFilePicker(cardId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md,.txt,.pdf,text/markdown,text/plain,application/pdf';
  input.onchange = event => attachMemoryCardFileFromPicker(cardId, event.target.files?.[0]);
  input.click();
}

async function attachMemoryCardFileFromPicker(cardId, file) {
  if (!file) return;
  if (/\.pdf$/i.test(file.name)) {
    showMemoryToast('PDF ainda Não suportado nesta fase.');
    return;
  }
  if (!/\.(md|txt)$/i.test(file.name)) {
    showMemoryToast('Nesta fase, anexar aceita .md e .txt. PDF ainda Não suportado.');
    return;
  }
  await memoryRuntime()?.attachMemoryCardFile(cardId, file);
  renderMemoryCardProjectPage(cardId);
  showMemoryToast(`Arquivo anexado: ${file.name}`);
}

function removeMemoryCardFile(cardId, sourceId) {
  memoryRuntime()?.removeMemoryCardFile(cardId, sourceId);
  if (typeof resetSilentIncorporatedContext === 'function') resetSilentIncorporatedContext();
  renderMemoryCardProjectPage(cardId);
  showMemoryToast('Arquivo removido.');
}

function renderMemoryRuntimeTree() {
  const runtime = memoryRuntime();
  const state = runtime.getState();
  return runtime.getContexts().map(context => {
    const expanded = state.expandedContexts.includes(context.id);
    const checked = state.selectedContexts.includes(context.id);
    const active = state.activeContextId === context.id && !state.activeSubcontextId;
    const contextCardCount = new Set(context.subcontexts.flatMap(subcontext => subcontext.cards || [])).size;
    const contextSnippetCount = new Set(context.subcontexts.flatMap(subcontext => subcontext.snippets || [])).size;
    const contextSourceCount = runtime.getSourcesForContext(context.id).length;
    return `
      <article class="memory-runtime-context ${expanded ? 'expanded' : ''} ${active ? 'active' : ''}">
        <div class="memory-runtime-context-row">
          <button class="memory-runtime-expand" onclick="memoryRuntimeToggleContext('${escapeHtml(context.id)}')">
            <i class="ti ${expanded ? 'ti-chevron-down' : 'ti-chevron-right'}"></i>
          </button>
          <label class="memory-runtime-check">
            <input type="checkbox" ${checked ? 'checked' : ''} onchange="memoryRuntimeToggleContextSelection('${escapeHtml(context.id)}')">
          </label>
          <button class="memory-runtime-context-title" onclick="memoryRuntimeSelectContext('${escapeHtml(context.id)}')">
            <span>${escapeHtml(context.title)}</span>
            <small>${contextCardCount} card · ${contextSnippetCount} trechos · ${contextSourceCount} fontes</small>
          </button>
        </div>
        ${expanded ? `
          <div class="memory-runtime-subcontexts">
            ${context.subcontexts.length
              ? context.subcontexts.map(subcontext => renderMemoryRuntimeSubcontext(context, subcontext)).join('')
              : '<div class="memory-runtime-empty">Sem subcontextos locais nesta fase.</div>'}
          </div>` : ''}
      </article>`;
  }).join('');
}

function renderMemoryRuntimeSubcontext(context, subcontext) {
  const runtime = memoryRuntime();
  const state = runtime.getState();
  const active = state.activeSubcontextId === subcontext.id;
  const checked = (state.selectedSubcontexts || []).includes(`${context.id}:${subcontext.id}`);
  const sourceCount = runtime.getSourcesForSubcontext(context.id, subcontext.id).length;
  const snippetCount = (subcontext.snippets || []).length;
  return `
    <div class="memory-runtime-subcontext ${active ? 'active' : ''}">
      <label class="memory-runtime-check">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="memoryRuntimeToggleSubcontext('${escapeHtml(context.id)}','${escapeHtml(subcontext.id)}')">
      </label>
      <button onclick="memoryRuntimeSelectSubcontext('${escapeHtml(context.id)}','${escapeHtml(subcontext.id)}')">
        <span>${escapeHtml(subcontext.title)}</span>
        <small>${subcontext.cards.length} card · ${snippetCount} trechos · ${sourceCount} fontes</small>
      </button>
    </div>`;
}

function renderMemoryRuntimeDetail() {
  const runtime = memoryRuntime();
  const sandbox = runtime?.buildActiveMemorySandbox?.();
  if (!sandbox) return '<div class="memory-runtime-empty-panel">Selecione contextos, cards ou trechos à  esquerda para montar o contexto ativo.</div>';
  const activeContextTitle = sandbox.selectedContexts.map(context => context.title).join(', ');
  const attachContextId = sandbox.selectedContexts[0]?.id || runtime.getState().activeContextId || '';
  const attachSubcontextId = sandbox.selectedSubcontexts[0]?.id || runtime.getState().activeSubcontextId || '';
  const attachCardId = sandbox.selectedCards[0]?.id || runtime.getState().activeCardId || '';
  const hasSelection = sandbox.selectedContexts.length || sandbox.selectedSubcontexts.length || sandbox.selectedCards.length || sandbox.selectedSnippets.length;

  if (!hasSelection) {
    return `
      <div class="memory-runtime-sandbox">
        <div class="memory-runtime-detail-header">
          <div>
            <div class="memory-runtime-kicker">Contexto ativo</div>
            <h2>Nenhum contexto selecionado</h2>
          </div>
        </div>
        <div class="memory-runtime-empty-panel">Selecione contextos, cards ou trechos à  esquerda para montar o contexto ativo.</div>
      </div>`;
  }

  return `
    <div class="memory-runtime-sandbox">
      <div class="memory-runtime-detail-header">
        <div>
          <div class="memory-runtime-kicker">Contexto ativo</div>
          <h2>${escapeHtml(activeContextTitle || 'Contexto local')}</h2>
        </div>
      </div>
      <div class="memory-runtime-section">
        <h3>Selecionados</h3>
        <div class="memory-runtime-chip-list">
          ${sandbox.selectedSubcontexts.length
            ? sandbox.selectedSubcontexts.map(subcontext => `<span>${escapeHtml(subcontext.title)}</span>`).join('')
            : sandbox.selectedContexts.map(context => `<span>${escapeHtml(context.title)}</span>`).join('')}
        </div>
      </div>
      <div class="memory-runtime-section">
        <h3>memória</h3>
        <p class="memory-runtime-card-content">${escapeHtml(sandbox.summary || sandbox.selectedContexts.map(context => context.description).filter(Boolean).join('\n\n') || 'Nenhum resumo selecionado.')}</p>
      </div>
      <div class="memory-runtime-section">
        <h3>Trechos selecionados</h3>
        ${renderMemoryRuntimeSnippetList(sandbox.selectedSnippets)}
      </div>
      <div class="memory-runtime-section">
        <h3>Cards incluídos</h3>
        ${sandbox.selectedCards.length
          ? sandbox.selectedCards.map(card => renderMemoryRuntimeCardSelector(null, null, card)).join('')
          : '<div class="memory-runtime-empty">Nenhum card marcado.</div>'}
      </div>
      <div class="memory-runtime-section">
        <h3>Fontes / Arquivos</h3>
        ${renderMemoryRuntimeSources(sandbox.selectedSources)}
        <button class="btn-secondary" onclick="memoryRuntimeOpenAttach('${escapeHtml(attachContextId)}','${escapeHtml(attachSubcontextId)}','${escapeHtml(attachCardId)}')">
          <i class="ti ti-paperclip"></i> Anexar MD/TXT
        </button>
      </div>
      <div class="memory-runtime-actions memory-runtime-sandbox-actions">
        <button class="btn-primary" onclick="memoryRuntimeUseInChat()">
          <i class="ti ti-message-circle"></i> Usar no chat
        </button>
        <button class="btn-secondary" onclick="memoryRuntimeClearSelection('${escapeHtml(attachContextId)}')">Limpar seleçào</button>
        <button class="btn-secondary" onclick="memoryRuntimeSaveSelection()">Salvar seleçào local</button>
      </div>
    </div>`;
}

function renderMemoryRuntimeContextOverview(contextId) {
  const runtime = memoryRuntime();
  const state = runtime.getState();
  const overview = runtime.getContextOverview(contextId);
  if (!overview) return '<div class="memory-runtime-empty-panel">Contexto indisponível.</div>';
  const selectedSubcontexts = new Set(state.selectedSubcontexts || []);
  return `
    <div class="memory-runtime-detail-header">
      <div>
        <div class="memory-runtime-kicker">Contexto geral</div>
        <h2>${escapeHtml(overview.context.title)}</h2>
      </div>
      <div class="memory-runtime-actions">
        <button class="btn-secondary" onclick="memoryRuntimeClearSelection('${escapeHtml(overview.context.id)}')">Limpar seleçào</button>
        <button class="btn-primary" onclick="memoryRuntimeUseInChat('${escapeHtml(overview.context.id)}','','')">
          <i class="ti ti-message-circle"></i> Usar contexto no chat
        </button>
      </div>
    </div>
    <p class="memory-runtime-card-content">${escapeHtml(overview.context.description || '')}</p>
    <div class="memory-runtime-section">
      <h3>Subcontextos</h3>
      ${overview.subcontexts.map(subcontext => `
        <label class="memory-runtime-excerpt">
          <input type="checkbox" ${selectedSubcontexts.has(`${overview.context.id}:${subcontext.id}`) ? 'checked' : ''} onchange="memoryRuntimeToggleSubcontext('${escapeHtml(overview.context.id)}','${escapeHtml(subcontext.id)}')">
          <span>${escapeHtml(subcontext.title)} - ${subcontext.cards.length} card</span>
        </label>`).join('')}
    </div>
    <div class="memory-runtime-section">
      <h3>Cards disponíveis</h3>
      ${overview.cards.map(card => renderMemoryRuntimeCardSelector(overview.context, null, card)).join('')}
    </div>
    <div class="memory-runtime-section">
      <h3>Trechos selecionáveis agregados</h3>
      ${renderMemoryRuntimeSnippetList(overview.snippets)}
    </div>
    <div class="memory-runtime-section">
      <h3>Fontes locais</h3>
      ${renderMemoryRuntimeSources(overview.sources)}
      <button class="btn-secondary" onclick="memoryRuntimeOpenAttach('${escapeHtml(overview.context.id)}','','')">
        <i class="ti ti-paperclip"></i> Anexar fonte
      </button>
    </div>`;
}

function renderMemoryRuntimeSubcontextDetail(detail) {
  return `
    <div class="memory-runtime-detail-header">
      <div>
        <div class="memory-runtime-kicker">${escapeHtml(detail.context.title)} > ${escapeHtml(detail.subcontext.title)}</div>
        <h2>${escapeHtml(detail.subcontext.title)}</h2>
      </div>
      <button class="btn-primary" onclick="memoryRuntimeUseInChat('${escapeHtml(detail.context.id)}','${escapeHtml(detail.subcontext.id)}','${escapeHtml(detail.cards[0]?.id || '')}')">
        <i class="ti ti-message-circle"></i> Usar no chat
      </button>
    </div>
    <p class="memory-runtime-card-content">${escapeHtml(detail.subcontext.description || '')}</p>
    <div class="memory-runtime-section">
      <h3>Cards vinculados</h3>
      ${detail.cards.map(card => renderMemoryRuntimeCard(detail.context, detail.subcontext, card, detail.snippets)).join('')}
    </div>
    <div class="memory-runtime-section">
      <h3>Fontes locais</h3>
      ${renderMemoryRuntimeSources(detail.sources)}
      <button class="btn-secondary" onclick="memoryRuntimeOpenAttach('${escapeHtml(detail.context.id)}','${escapeHtml(detail.subcontext.id)}','${escapeHtml(detail.cards[0]?.id || '')}')">
        <i class="ti ti-paperclip"></i> Anexar fonte
      </button>
    </div>`;
}

function renderMemoryRuntimeCardSelector(context, subcontext, card) {
  const state = memoryRuntime().getState();
  return `
    <label class="memory-runtime-excerpt">
      <input type="checkbox" ${state.selectedCards.includes(card.id) ? 'checked' : ''} onchange="memoryRuntimeToggleCard('${escapeHtml(card.id)}')">
      <span>${escapeHtml(card.title)}</span>
    </label>`;
}

function renderMemoryRuntimeSnippetList(snippets = []) {
  const state = memoryRuntime().getState();
  return snippets.length
    ? snippets.map(snippet => `
      <label class="memory-runtime-excerpt">
        <input type="checkbox" ${state.selectedExcerpts.includes(snippet.id) ? 'checked' : ''} onchange="memoryRuntimeToggleExcerpt('${escapeHtml(snippet.id)}')">
        <span>${escapeHtml(snippet.text)}</span>
      </label>`).join('')
    : '<div class="memory-runtime-empty">Nenhum trecho local.</div>';
}

function renderMemoryRuntimeSources(sources = []) {
  return sources.length
    ? `<div class="memory-runtime-sources">${sources.map(source => `
      <div class="memory-runtime-source">
        <strong>${escapeHtml(source.name)}</strong>
        <p>${escapeHtml(source.content.slice(0, 240))}${source.content.length > 240 ? '...' : ''}</p>
      </div>`).join('')}</div>`
    : '<div class="memory-runtime-empty">Nenhuma fonte local anexada.</div>';
}

function renderMemoryRuntimeCard(context, subcontext, card, snippets = null) {
  const runtime = memoryRuntime();
  const state = runtime.getState();
  const checked = state.selectedCards.includes(card.id);
  const sources = runtime.getSourcesForCard(card.id);
  const visibleSnippets = Array.isArray(snippets) ? snippets : card.excerpts;
  return `
    <article class="memory-runtime-card">
      <div class="memory-runtime-card-head">
        <label class="memory-runtime-card-check">
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="memoryRuntimeToggleCard('${escapeHtml(card.id)}')">
          <span>${escapeHtml(card.title)}</span>
        </label>
        <button class="btn-primary" onclick="memoryRuntimeUseInChat('${escapeHtml(context.id)}','${escapeHtml(subcontext?.id || '')}','${escapeHtml(card.id)}')">
          <i class="ti ti-message-circle"></i> Usar no chat
        </button>
      </div>
      <p class="memory-runtime-card-content">${escapeHtml(card.content)}</p>
      <div class="memory-runtime-tags">${card.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="memory-runtime-section">
        <h3>Trechos selecionáveis</h3>
        ${renderMemoryRuntimeSnippetList(visibleSnippets)}
      </div>
      <div class="memory-runtime-section">
        <h3>Fontes locais</h3>
        ${renderMemoryRuntimeSources(sources)}
        <button class="btn-secondary" onclick="memoryRuntimeOpenAttach('${escapeHtml(context.id)}','${escapeHtml(subcontext?.id || '')}','${escapeHtml(card.id)}')">
          <i class="ti ti-paperclip"></i> Anexar MD/TXT
        </button>
      </div>
    </article>`;
}

function renderMemoryRuntimeSearch(value) {
  memoryRuntimeSearchQuery = String(value || '').trim();
  const target = document.getElementById('memory-runtime-search-results');
  if (!target) return;
  if (!memoryRuntimeSearchQuery) {
    target.classList.add('hidden');
    target.innerHTML = '';
    return;
  }
  target.classList.remove('hidden');
  target.innerHTML = renderMemoryRuntimeSearchResults(memoryRuntimeSearchQuery);
}

function renderMemoryRuntimeSearchResults(query) {
  const runtime = memoryRuntime();
  if (!runtime) return '';
  const results = runtime.search(query);
  return results.length
    ? results.map(result => `
      <button class="memory-runtime-search-result" onclick="memoryRuntimeSelectSearchResult('${escapeHtml(result.contextId)}','${escapeHtml(result.subcontextId || '')}','${escapeHtml(result.cardId || '')}')">
        <span>
          <strong>${escapeHtml(result.title)}</strong>
          ${Array.isArray(result.breadcrumbs) && result.breadcrumbs.length
            ? `<small>${result.breadcrumbs.map(item => escapeHtml(item)).join(' · ')}</small>`
            : `<small>${escapeHtml(result.meta || '')}</small>`}
        </span>
      </button>`).join('')
    : '<div class="memory-runtime-empty">Nenhum resultado local.</div>';
}

function rerenderMemoryRuntime() {
  renderMemoryRuntimeGovernancePanel();
}

function memoryRuntimeToggleContext(contextId) {
  memoryRuntime()?.toggleExpandedContext(contextId);
  rerenderMemoryRuntime();
}

function memoryRuntimeToggleContextSelection(contextId) {
  memoryRuntime()?.toggleContextSelection(contextId);
  rerenderMemoryRuntime();
}

function memoryRuntimeToggleSubcontext(contextId, subcontextId) {
  memoryRuntime()?.toggleSubcontextSelection(contextId, subcontextId);
  rerenderMemoryRuntime();
}

function memoryRuntimeSelectContext(contextId) {
  const runtime = memoryRuntime();
  runtime?.__updateState({
    expandedContexts: [...new Set([...(runtime.getState()?.expandedContexts || []), contextId])]
  });
  runtime?.activate({ contextId, subcontextId: '', cardId: '' });
  rerenderMemoryRuntime();
}

function memoryRuntimeSelectSubcontext(contextId, subcontextId) {
  const runtime = memoryRuntime();
  const subcontext = runtime?.getSubcontext(contextId, subcontextId);
  runtime?.__updateState({
    expandedContexts: [...new Set([...(runtime.getState()?.expandedContexts || []), contextId])]
  });
  runtime?.activate({ contextId, subcontextId, cardId: subcontext?.cards?.[0] || '' });
  rerenderMemoryRuntime();
}

function memoryRuntimeSelectSearchResult(contextId, subcontextId, cardId) {
  const runtime = memoryRuntime();
  const state = runtime?.getState();
  if (runtime && !state?.expandedContexts?.includes(contextId)) runtime.toggleExpandedContext(contextId);
  runtime?.activate({ contextId, subcontextId, cardId });
  rerenderMemoryRuntime();
}

function memoryRuntimeToggleCard(cardId) {
  memoryRuntime()?.toggleCardSelection(cardId);
  rerenderMemoryRuntime();
}

function memoryRuntimeToggleExcerpt(excerptId) {
  memoryRuntime()?.toggleExcerptSelection(excerptId);
  rerenderMemoryRuntime();
}

function memoryRuntimeClearSelection(contextId) {
  const runtime = memoryRuntime();
  const state = runtime?.getState();
  if (!runtime || !state) return;
  const context = runtime.getContext(contextId);
  const cardIds = new Set((context?.subcontexts || []).flatMap(subcontext => subcontext.cards || []));
  const snippetIds = new Set([...cardIds].flatMap(cardId => (runtime.getCard(cardId)?.excerpts || []).map(snippet => snippet.id)));
  const subcontextKeys = new Set((context?.subcontexts || []).map(subcontext => `${contextId}:${subcontext.id}`));
  const nextState = {
    selectedContexts: (state.selectedContexts || []).filter(id => id !== contextId),
    selectedSubcontexts: (state.selectedSubcontexts || []).filter(id => !subcontextKeys.has(id)),
    selectedCards: (state.selectedCards || []).filter(id => !cardIds.has(id)),
    selectedExcerpts: (state.selectedExcerpts || []).filter(id => !snippetIds.has(id))
  };
  if (typeof runtime.__updateState === 'function') runtime.__updateState(nextState);
  else {
    nextState.selectedContexts.forEach(id => id);
    localStorage.setItem('worion.memoryCardsRuntime.v1', JSON.stringify({ ...state, ...nextState }));
    window.WorionMemoryCardsRuntime = null;
    window.location.reload();
    return;
  }
  rerenderMemoryRuntime();
}

function memoryRuntimeSaveSelection() {
  const runtime = memoryRuntime();
  runtime?.__updateState({ savedAt: new Date().toISOString() });
  if (typeof showToast === 'function') showToast('seleçào local salva.');
  rerenderMemoryRuntime();
}

async function memoryRuntimeUseInChat(contextId, subcontextId, cardId) {
  const runtime = memoryRuntime();
  if (!runtime) return;
  const sandbox = runtime.buildActiveMemorySandbox?.();
  const block = sandbox?.injectionText || runtime.buildActiveMemoryPayload();
  if (!block) return;
  const activeContext = sandbox.selectedContexts[0] || runtime.getContext(contextId);
  const activeCard = sandbox.selectedCards[0] || runtime.getCard(cardId);
  runtime.activate({
    contextId: activeContext?.id || contextId || '',
    subcontextId: sandbox.selectedSubcontexts[0]?.id || subcontextId || '',
    cardId: activeCard?.id || cardId || ''
  });
  window.currentChatSource = 'home';
  window.currentMemoryChatTitle = [activeContext?.title, activeCard?.title].filter(Boolean).join(' / ') || 'Memory Card';
  currentAgent = getDefaultAgent();
  currentProjectContext = null;
  currentConversationId = typeof makeId === 'function' ? makeId('memory') : `memory-${Date.now()}`;
  sessionStartedAt = null;
  messages = [];
  console.log('[MEMORY RUNTIME] contexto injetado no chat:', {
    contexts: sandbox.selectedContexts.map(item => item.title),
    subcontexts: sandbox.selectedSubcontexts.map(item => item.title),
    cards: sandbox.selectedCards.map(item => item.title)
  });
  await startChat({ keepMessages: true, loadHistory: false });
  appendSilentIncorporatedContext(block);
  const input = document.getElementById('chat-in');
  if (input) {
    input.placeholder = `Pergunte usando ${activeCard?.title || activeContext?.title || 'Memory Card'}...`;
    input.focus();
  }
}

function memoryRuntimeOpenAttach(contextId, subcontextId, cardId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md,.txt,text/markdown,text/plain';
  input.onchange = event => memoryRuntimeHandleAttach(event, contextId, subcontextId, cardId);
  input.click();
}

function memoryRuntimeHandleAttach(event, contextId, subcontextId, cardId) {
  const file = event.target.files?.[0];
  if (!file) return;
  const valid = /\.(md|txt)$/i.test(file.name);
  if (!valid) {
    showMemoryToast('Apenas arquivos .md e .txt nesta fase.');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    memoryRuntime()?.addLocalSource({
      contextId,
      subcontextId,
      cardId,
      name: file.name,
      type: file.type || 'text/plain',
      content: String(e.target?.result || '')
    });
    showMemoryToast(`Fonte local anexada: ${file.name}`);
    rerenderMemoryRuntime();
  };
  reader.onerror = () => showMemoryToast('Erro ao ler arquivo.');
  reader.readAsText(file);
}

function openAgentEditor(id = null) {
  const agent = id ? agents.find(a => a.id === id) : null;
  collapseSidebarForDetailView();
  selected = agent ? agent.id : null;
  currentAgent = agent || null;
  window.agentsState = {
    ...window.agentsState,
    view: agent ? 'detail' : 'create',
    selectedAgentId: agent?.id || null,
    editingAgentDraft: agent ? { id: agent.id } : {}
  };
  pendingAgentDocuments = Array.isArray(agent?.documents)
    ? agent.documents.map(doc => ({ ...doc, pending: false }))
    : [];
  chatMode = false;
  document.querySelector('.shell').classList.remove('chat-fullscreen');
  const detailPanel = document.getElementById('detail-panel');
  if (detailPanel) detailPanel.style.display = 'none';
  const main = document.getElementById('main');
  if (!main) return;
  main.innerHTML = renderAgentEditorPage(agent);
  setupAgentPersonaDropZone('#agent-persona-drop', 'editor');
  renderAgentDocumentList();
}

function renderAgentEditorPage(agent = null) {
  const modeLabel = agent ? 'Editar agente' : 'Novo agente';
  const actionLabel = agent ? 'Salvar agente' : 'Criar agente';
  const documentsCount = Array.isArray(agent?.documents) ? agent.documents.length : 0;
  const promptText = getAgentPromptForEdit(agent);
  const promptPreview = stripHtmlCommentsForDisplay(promptText) || 'Adicione instrucoes para personalizar as respostas do agente.';
  const agentDesc = stripHtmlCommentsForDisplay(agent?.desc || '');
  const history = getAgentConversationHistory(agent?.id || '');
  const historyHtml = history.length
    ? history.map(conversation => `
      <button class="agent-history-row" onclick="openConversation('${escapeHtml(conversation.id)}')">
        <span>${escapeHtml(conversation.title || 'Conversa sem titulo')}</span>
        <small>${escapeHtml(conversation.updatedAt || conversation.createdAt || conversation.lastMessageAt || 'Conversa anterior')}</small>
      </button>
    `).join('')
    : '<div class="agent-history-empty">Nenhuma conversa anterior com este agente.</div>';
  return `
    <div class="agent-detail-page">
      <section class="agent-detail-main">
        <button class="agent-back-link" onclick="showAgentsView()"><i class="ti ti-arrow-left"></i> Todos os projetos</button>
        <div class="agent-detail-heading">
          <input id="agent-name" class="agent-title-input" value="${escapeHtml(agent?.name || '')}" placeholder="Nome do agente">
          <textarea id="agent-desc" class="agent-desc-input" rows="2" placeholder="descrição curta">${escapeHtml(agentDesc)}</textarea>
          <div id="agent-prompt-preview" class="agent-prompt-preview collapsed">${escapeHtml(promptPreview)}</div>
          <button type="button" class="agent-show-more" onclick="toggleAgentPromptPreview()">Mostrar mais</button>
        </div>

        <form class="agent-standard-composer" onsubmit="event.preventDefault();startAgentSandboxChat('${escapeHtml(agent?.id || '')}')">
          <div class="chat-input-container agent-chat-input-container">
            <div class="chat-composer-toolbar">
              <button type="button" class="chat-attach-btn" onclick="triggerAgentPersonaUpload('editor')" title="Adicionar"><i class="ti ti-plus"></i></button>
              <textarea id="agent-sandbox-input" placeholder="O que vc está pensando..." rows="1" spellcheck="true" lang="pt-BR" oninput="autoResizeTextarea(this)"></textarea>
              <div class="chat-composer-actions">
                <span class="agent-composer-model">${escapeHtml(agent?.model || 'Modelo automatico')}</span>
                <button type="submit" class="chat-send" title="Enviar"><i class="ti ti-send"></i></button>
              </div>
            </div>
          </div>
        </form>

        <section class="agent-history">
          ${historyHtml}
        </section>
      </section>

      <aside class="agent-side-panel">
        <section class="agent-side-section">
          <div class="agent-side-header">
            <strong>Memória</strong>
            <span class="agent-private-pill"><i class="ti ti-lock"></i> Apenas voce</span>
          </div>
          <p>A Memória semantica deste agente sera construida a partir das conversas.</p>
        </section>

        <section class="agent-side-section">
          <div class="agent-side-header">
            <strong>Instrucoes</strong>
            <button type="button" class="agent-side-plus" onclick="toggleAgentInstructionsEditor()" title="Editar instrucoes"><i class="ti ti-plus"></i></button>
          </div>
          <p>System prompt usado para personalizar as respostas do agente.</p>
          <div id="agent-instructions-editor" class="agent-inline-editor hidden">
            <textarea id="agent-prompt" rows="14" placeholder="Instrucoes do agente">${escapeHtml(promptText)}</textarea>
            <div class="agent-inline-actions">
              <button class="btn-edit" type="button" onclick="toggleAgentInstructionsEditor()">Fechar</button>
              <button class="btn-chat" type="button" onclick="saveAgentFromEditor('${agent?.id || ''}')"><i class="ti ti-device-floppy"></i> Salvar instrucoes</button>
            </div>
          </div>
        </section>

        <section class="agent-side-section">
          <div class="agent-side-header">
            <strong>Arquivos</strong>
            <button type="button" class="agent-side-plus" onclick="triggerAgentPersonaUpload('editor')" title="Enviar arquivo"><i class="ti ti-plus"></i></button>
          </div>
          <div class="agent-file-meter"><span style="width:${Math.min(100, Math.max(1, documentsCount * 8))}%"></span></div>
          <small>${documentsCount || 0} arquivo(s) vinculados</small>
          <div class="agent-persona-drop" id="agent-persona-drop" onclick="triggerAgentPersonaUpload('editor')">
            <i class="ti ti-upload" aria-hidden="true"></i>
            <span>Arraste arquivos aqui ou clique para enviar.</span>
          </div>
          <div class="agent-import-status" id="agent-persona-status">${documentsCount ? `${documentsCount} arquivo(s) anexado(s).` : ''}</div>
          <div class="agent-document-list" id="agent-document-list"></div>
        </section>

        <div class="agent-hidden-fields" aria-hidden="true">
          <select id="agent-model">${getModelOptions(agent?.model || 'gpt-5.4-mini')}</select>
          <input id="agent-model-custom" value="">
          <input id="agent-webhook" value="${escapeHtml(agent?.webhookUrl || '')}">
        </div>
      </aside>
    </div>`;
}

function toggleAgentPromptPreview() {
  const preview = document.getElementById('agent-prompt-preview');
  const button = document.querySelector('.agent-show-more');
  if (!preview) return;
  const collapsed = preview.classList.toggle('collapsed');
  if (button) button.textContent = collapsed ? 'Mostrar mais' : 'Mostrar menos';
}

function toggleAgentInstructionsEditor() {
  const editor = document.getElementById('agent-instructions-editor');
  if (!editor) return;
  editor.classList.toggle('hidden');
}

async function startAgentSandboxChat(agentId = '') {
  const input = document.getElementById('agent-sandbox-input');
  const text = String(input?.value || '').trim();
  if (!text) return;

  let agent = agentId ? agents.find(item => item.id === agentId) : currentAgent;
  if (!agent) {
    const saved = await saveAgentFromEditor('', { reopen: false, silent: true });
    agent = saved || currentAgent;
  }
  if (!agent) return;

  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  window.currentChatSource = 'agent';
  selected = agent.id;
  currentAgent = agent;
  window.agentsState = {
    ...(window.agentsState || {}),
    activeConversationAgentId: agent.id,
    selectedAgentId: agent.id
  };
  currentConversationId = null;
  messages = [];
  sessionStartedAt = null;
  if (typeof window.startChat === 'function') {
    await window.startChat({ keepMessages: true, loadHistory: false });
  } else if (typeof startChat === 'function') {
    await startChat({ keepMessages: true, loadHistory: false });
  } else {
    return;
  }
  const chatInput = document.getElementById('chat-in');
  if (chatInput) {
    chatInput.value = text;
    if (typeof autoResizeTextarea === 'function') autoResizeTextarea(chatInput);
  }
  if (typeof window.sendMsg === 'function') await window.sendMsg();
}

async function deleteAgentFromEditor(id = '') {
  const agent = agents.find(a => a.id === id);
  if (!agent?.file) return;
  const ok = confirm(`Excluir o agente "${agent.name}"? Esta acao remove o arquivo local do agente.`);
  if (!ok) return;
  try {
    const fullPath = path.join(AGENTS_DIR, agent.file);
    const agentSlug = agent.file.replace(/\.md$/i, '');
    await fs.unlink(fullPath);
    await fs.rm(path.join(AGENT_DOCS_DIR, agentSlug), { recursive: true, force: true }).catch(() => {});
    selected = null;
    currentAgent = null;
    window.agentsState = {
      ...window.agentsState,
      view: 'list',
      selectedAgentId: null,
      editingAgentDraft: null,
      activeConversationAgentId: window.agentsState.activeConversationAgentId === id ? null : window.agentsState.activeConversationAgentId
    };
    await loadAgents();
    await showAgentsView();
  } catch (error) {
    console.error('Erro ao excluir agente:', error);
    alert(`Erro ao excluir agente: ${error.message}`);
  }
}

function closePanel() {
  const panel = document.getElementById('detail-panel');
  if (!panel) return;
  panel.style.display = 'none';
  panel.innerHTML = '';
  pendingAgentDocuments = [];
}

function getAgentStatusForEdit(agent) {
  if (!agent) return 'active';
  const statusMatch = String(agent.content || '').match(/<!--\s*status:\s*(active|inactive)\s*-->/i);
  if (statusMatch) return statusMatch[1].toLowerCase();
  return agent.badge === 'Inativo' ? 'inactive' : 'active';
}

function getSkillDocumentRef(skillSlug, fileName) {
  return CustomSkillsNormalizers.getSkillDocumentRef(skillSlug, fileName);
}

function getCustomSkillIdFromName(name, existingId = '') {
  return CustomSkillsNormalizers.getCustomSkillIdFromName(name, existingId);
}

function setSkillImportStatus(message, isError = false) {
  const status = document.getElementById('skill-document-status');
  if (!status) return;
  status.textContent = message || '';
  status.classList.toggle('error', Boolean(isError));
}

function renderSkillDocumentList() {
  const list = document.getElementById('skill-document-list');
  if (!list) return;

  if (!pendingSkillDocuments.length) {
    list.innerHTML = '<div class="agent-document-empty">Nenhum documento anexado.</div>';
    return;
  }

  list.innerHTML = pendingSkillDocuments.map((doc, index) => `
    <div class="agent-document-row">
      <i class="ti ti-file-text" aria-hidden="true"></i>
      <span>${escapeHtml(doc.name || doc.path || 'documento.md')}</span>
      ${doc.missing ? '<em>nao encontrado</em>' : ''}
      <button type="button" class="btn-small" onclick="removeSkillDocument(${index})" title="Remover documento">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
    </div>
  `).join('');
}

function removeSkillDocument(index) {
  pendingSkillDocuments.splice(index, 1);
  renderSkillDocumentList();
  setSkillImportStatus('Documento removido da lista. Salve a skill para aplicar.');
}

function triggerSkillDocumentUpload() {
  let input = document.getElementById('skill-document-upload');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'skill-document-upload';
    input.multiple = true;
    input.style.display = 'none';
    input.onchange = event => appendSkillDocumentsToEditor(Array.from(event.target.files || []));
    document.body.appendChild(input);
  }
  input.removeAttribute('accept');
  input.value = '';
  input.click();
}

function setupSkillDocumentDropZone(selector) {
  const zone = document.querySelector(selector);
  if (!zone || zone.dataset.skillDropReady === '1') return;
  zone.dataset.skillDropReady = '1';

  const prevent = event => {
    event.preventDefault();
    event.stopPropagation();
  };
  const activate = event => {
    prevent(event);
    zone.classList.add('drag-over');
  };
  const deactivate = event => {
    prevent(event);
    zone.classList.remove('drag-over');
  };

  zone.addEventListener('dragenter', activate);
  zone.addEventListener('dragover', activate);
  zone.addEventListener('dragleave', deactivate);
  zone.addEventListener('drop', async event => {
    deactivate(event);
    await appendSkillDocumentsToEditor(Array.from(event.dataTransfer?.files || []));
  });
}

async function appendSkillDocumentsToEditor(files = []) {
  const validFiles = getAgentPersonaFiles(files);
  if (!validFiles.length) return;

  setSkillImportStatus('Lendo documentos...', false);
  try {
    const attachedNames = [];
    for (const file of validFiles) {
      const raw = await readAgentPersonaFile(file);
      pendingSkillDocuments.push({
        name: file.name,
        content: raw,
        pending: true
      });
      attachedNames.push(file.name);
    }
    renderSkillDocumentList();
    setSkillImportStatus(`${attachedNames.length} documento(s) anexado(s). O conteudo nao foi inserido no prompt da skill.`, false);
  } catch (error) {
    console.error('Erro ao anexar documento da skill:', error);
    setSkillImportStatus(`Erro ao anexar: ${error.message}`, true);
    alert(`Erro ao anexar documento: ${error.message}`);
  }
}

async function persistSkillDocuments(skillSlug, documents) {
  const docDir = path.join(CUSTOM_SKILL_DOCS_DIR, skillSlug);
  await fs.mkdir(docDir, { recursive: true });
  const existingEntries = await fs.readdir(docDir, { withFileTypes: true }).catch(() => []);
  const reserved = new Set(
    documents
      .filter(doc => doc.path && !doc.pending)
      .map(doc => path.basename(doc.path).toLowerCase())
  );
  const refs = [];
  const keepFileNames = new Set();

  for (const doc of documents) {
    if (doc.path && !doc.pending) {
      const fileName = path.basename(doc.path);
      keepFileNames.add(fileName.toLowerCase());
      refs.push({ name: doc.name || fileName, path: getSkillDocumentRef(skillSlug, fileName) });
      continue;
    }

    const docFileName = await getAvailableAgentDocumentFileName(docDir, doc.name || 'documento.md', reserved);
    reserved.add(docFileName.toLowerCase());
    await fs.writeFile(path.join(docDir, docFileName), String(doc.content || ''), 'utf-8');
    keepFileNames.add(docFileName.toLowerCase());
    refs.push({ name: doc.name || docFileName, path: getSkillDocumentRef(skillSlug, docFileName) });
  }

  for (const entry of existingEntries) {
    if (!entry.isFile()) continue;
    if (keepFileNames.has(entry.name.toLowerCase())) continue;
    await fs.unlink(path.join(docDir, entry.name)).catch(() => {});
  }

  return refs;
}

function openSkillEditor(id = null) {
  loadCustomSkillsSync();
  const skill = id ? getSkillsForManagement().find(item => item.id === id) : null;
  const panel = document.getElementById('detail-panel');
  selected = null;
  currentAgent = null;
  pendingSkillDocuments = Array.isArray(skill?.documents)
    ? skill.documents.map(doc => ({ ...doc, pending: false }))
    : [];
  chatMode = false;
  document.querySelector('.shell').classList.remove('chat-fullscreen');

  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.classList.add('panel-piano');
  panel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">${skill ? 'Editar skill' : 'Nova skill'}</span>
      <button class="panel-close" onclick="closeSkillPanel()"><i class="ti ti-x"></i></button>
    </div>
    <div class="panel-body">
      <div class="template-summary">
        <strong>Gestao local de skills</strong>
        <span>Skills personalizadas sao salvas em data/custom-skills.json. Documentos ficam anexados por referencia e nao entram no prompt.</span>
      </div>
      <div class="form-field">
        <div class="field-label">NOME</div>
        <input id="skill-name" value="${escapeHtml(skill?.name || '')}" placeholder="Nome da skill" style="background:#101010;border:0.5px solid rgba(255,255,255,0.10);border-radius:14px;color:var(--color-text-primary);padding:8px 10px">
      </div>
      <div class="form-field">
        <div class="field-label">CATEGORIA</div>
        <input id="skill-category" value="${escapeHtml(skill?.category || 'Personalizadas')}" placeholder="Categoria" style="background:#101010;border:0.5px solid rgba(255,255,255,0.10);border-radius:14px;color:var(--color-text-primary);padding:8px 10px">
      </div>
      <div class="form-field">
        <div class="field-label">Descrição curta</div>
        <input id="skill-description" value="${escapeHtml(skill?.description || skill?.desc || (skill ? getSkillCardDescription(skill) : ''))}" placeholder="Descrição curta" style="background:#101010;border:0.5px solid rgba(255,255,255,0.10);border-radius:14px;color:var(--color-text-primary);padding:8px 10px">
      </div>
      <div class="form-field">
        <div class="field-label">ICONE TABLER OPCIONAL</div>
        <input id="skill-icon" value="${escapeHtml(skill?.icon || 'ti-sparkles')}" placeholder="ti-sparkles" style="background:#101010;border:0.5px solid rgba(255,255,255,0.10);border-radius:14px;color:var(--color-text-primary);padding:8px 10px">
      </div>
      <div class="form-field">
        <div class="field-label">DOCUMENTOS DA SKILL</div>
        <div class="agent-persona-drop" id="skill-document-drop" onclick="triggerSkillDocumentUpload()">
          <i class="ti ti-paperclip" aria-hidden="true"></i>
          <span>Arraste ou anexe quantos arquivos quiser. Eles ficam como documentos vinculados, sem preencher o prompt.</span>
        </div>
        <div class="agent-document-list" id="skill-document-list"></div>
        <div class="agent-import-status" id="skill-document-status"></div>
      </div>
      <div class="form-field">
        <div class="field-label">PROMPT</div>
        <textarea id="skill-prompt" rows="12" placeholder="Instrucoes da skill">${escapeHtml(skill?.prompt || '')}</textarea>
      </div>
    </div>
    <div class="panel-actions">
      <button class="btn-edit" onclick="closeSkillPanel()">Cancelar</button>
      <button class="btn-chat" onclick="saveSkillFromEditor('${skill?.id || ''}')"><i class="ti ti-device-floppy"></i> Salvar skill</button>
      ${skill ? `<button class="btn-chat" onclick="startSkillChat('${skill.id}')"><i class="ti ti-message" aria-hidden="true"></i> Iniciar chat</button>` : ''}
    </div>`;
  setupSkillDocumentDropZone('#skill-document-drop');
  renderSkillDocumentList();
}

function closeSkillPanel() {
  document.getElementById('detail-panel').style.display = 'none';
}

async function saveSkillFromEditor(id = '') {
  const name = document.getElementById('skill-name')?.value.trim() || '';
  const category = document.getElementById('skill-category')?.value.trim() || 'Personalizadas';
  const description = document.getElementById('skill-description')?.value.trim() || '';
  const icon = document.getElementById('skill-icon')?.value.trim() || 'ti-sparkles';
  const prompt = document.getElementById('skill-prompt')?.value.trim() || '';

  if (!name) {
    alert('Nome da skill e obrigatorio.');
    return;
  }

  if (!prompt && !pendingSkillDocuments.length) {
    alert('Preencha o prompt da skill ou anexe pelo menos um documento.');
    return;
  }

  try {
    loadCustomSkillsSync();
    const skillId = getCustomSkillIdFromName(name, id);
    const documentRefs = await persistSkillDocuments(skillId, pendingSkillDocuments);
    const savedSkill = normalizeCustomSkill({
      id: skillId,
      name,
      category,
      description,
      prompt,
      icon,
      documents: documentRefs,
      updatedAt: new Date().toISOString()
    });
    const baseSkills = (Array.isArray(QUICK_SKILLS) ? QUICK_SKILLS : [])
      .filter(skill => skill.id !== skillId);
    QUICK_SKILLS = [...baseSkills, savedSkill];
    window.WORION_SKILLS = QUICK_SKILLS;
    await saveCustomSkillsToDisk();
    renderSidebarSkills();
    renderSkillCards(getSkillsForManagement());
    setSkillImportStatus('Skill salva. Documentos ficaram vinculados por referencia.', false);
  } catch (error) {
    console.error('Erro ao salvar skill:', error);
    alert(`Erro ao salvar skill: ${error.message}`);
  }
}

async function persistAgentDocuments(agentSlug, documents) {
  const docDir = path.join(AGENT_DOCS_DIR, agentSlug);
  await fs.mkdir(docDir, { recursive: true });
  const existingEntries = await fs.readdir(docDir, { withFileTypes: true }).catch(() => []);

  const reserved = new Set(
    documents
      .filter(doc => doc.path && !doc.pending)
      .map(doc => path.basename(doc.path).toLowerCase())
  );
  const refs = [];
  const keepFileNames = new Set();

  for (const doc of documents) {
    if (doc.path && !doc.pending && !doc.edited) {
      const fileName = path.basename(doc.path);
      keepFileNames.add(fileName.toLowerCase());
      refs.push({ name: doc.name || fileName, path: getAgentDocumentRef(agentSlug, fileName) });
      continue;
    }

    const docFileName = doc.path && doc.edited
      ? path.basename(doc.path)
      : await getAvailableAgentDocumentFileName(docDir, doc.name || 'documento.md', reserved);
    reserved.add(docFileName.toLowerCase());
    const targetPath = path.join(docDir, docFileName);
    if (doc.filePath) {
      await fs.copyFile(doc.filePath, targetPath);
    } else if (doc.binaryContent) {
      await fs.writeFile(targetPath, doc.binaryContent);
    } else {
      await fs.writeFile(targetPath, String(doc.content || ''), 'utf-8');
    }
    keepFileNames.add(docFileName.toLowerCase());
    refs.push({ name: doc.name || docFileName, path: getAgentDocumentRef(agentSlug, docFileName) });
  }

  for (const entry of existingEntries) {
    if (!entry.isFile()) continue;
    if (keepFileNames.has(entry.name.toLowerCase())) continue;
    await fs.unlink(path.join(docDir, entry.name)).catch(() => {});
  }

  return refs;
}

async function saveAgentFromEditor(id = '', options = {}) {
  collectAgentDocumentEditorChanges();
  const name = document.getElementById('agent-name').value.trim();
  const desc = document.getElementById('agent-desc').value.trim();
  const customModel = document.getElementById('agent-model-custom')?.value.trim();
  const model = customModel || document.getElementById('agent-model').value.trim() || 'gpt-5.4-mini';
  const webhookUrl = document.getElementById('agent-webhook').value.trim();
  const prompt = document.getElementById('agent-prompt').value.trim();

  if (!name) {
    alert('Nome do agente e obrigatorio.');
    return;
  }

  if (!prompt && !pendingAgentDocuments.length) {
    alert('Preencha o system prompt ou anexe pelo menos um documento.');
    return;
  }

  try {
    await fs.mkdir(AGENTS_DIR, { recursive: true });
    const existing = id ? agents.find(a => a.id === id) : null;
    const file = existing ? existing.file : await getAvailableAgentFileName(name);
    const fullPath = path.join(AGENTS_DIR, file);
    const agentSlug = file.replace(/\.md$/i, '');
    const documentRefs = await persistAgentDocuments(agentSlug, pendingAgentDocuments);
    const documentMetadata = documentRefs
      .map(doc => `<!-- document: ${doc.path} -->`)
      .join('\n');
    const content = buildAgentMarkdownContent({
      name,
      desc: desc || 'Agente personalizado',
      model,
      webhookUrl,
      prompt,
      documentRefs
    });

    await fs.writeFile(fullPath, content, 'utf-8');
    await loadAgents();
    const saved = agents.find(a => a.file === file);
    if (saved) {
      currentAgent = saved;
      selected = saved.id;
      if (options.reopen !== false) openAgentEditor(saved.id);
      else {
        renderCards(agents);
        renderSidebarSkills();
      }
      if (!options.silent) setAgentImportStatus('Agente salvo.', false, 'editor');
    }
    return saved || null;
  } catch (error) {
    console.error('Erro ao salvar agente:', error);
    if (!options.silent) alert(`Erro ao salvar agente: ${error.message}`);
    return null;
  }
}

async function integrateDocumentsIntoCurrentAgent(documents) {
  if (!currentAgent?.file || !Array.isArray(documents) || !documents.length) return null;

  await fs.mkdir(AGENTS_DIR, { recursive: true });
  await fs.mkdir(AGENT_DOCS_DIR, { recursive: true });

  const file = currentAgent.file;
  const fullPath = path.join(AGENTS_DIR, file);
  const agentSlug = file.replace(/\.md$/i, '');
  const existingDocuments = Array.isArray(currentAgent.documents)
    ? currentAgent.documents.map(doc => ({ ...doc, pending: false }))
    : [];
  const mergedDocuments = [
    ...existingDocuments,
    ...documents.map(doc => ({
      name: doc.name || 'documento.txt',
      content: String(doc.content || ''),
      pending: true
    }))
  ];
  const documentRefs = await persistAgentDocuments(agentSlug, mergedDocuments);
  const content = buildAgentMarkdownContent({
    name: currentAgent.name,
    desc: currentAgent.desc || 'Agente personalizado',
    model: currentAgent.model || 'gpt-5.4-mini',
    webhookUrl: currentAgent.webhookUrl || '',
    prompt: getAgentPromptForEdit(currentAgent),
    documentRefs
  });

  await fs.writeFile(fullPath, content, 'utf-8');
  await loadAgents();
  const saved = agents.find(agent => agent.file === file);
  if (saved) {
    currentAgent = saved;
    selected = saved.id;
    if (chatMode) renderChatPanel();
    else renderPanel();
  }
  return saved || currentAgent;
}

function selectAgent(id) {
  selected = id;
  chatMode = false;
  messages = [];
  currentProjectContext = null;
  currentAgent = agents.find(a => a.id === id);
  renderCards(agents);
  renderPanel();
}

function renderPanel() {
  const panel = document.getElementById('detail-panel');
  if (!selected || !currentAgent) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';

  if (chatMode) {
    renderChatPanel();
  } else {
    renderDetailPanel();
  }
}

function renderDetailPanel() {
  const panel = document.getElementById('detail-panel');
  const a = currentAgent;
  const promptText = getAgentPromptForEdit(a);
  const documentsHtml = Array.isArray(a.documents) && a.documents.length
    ? `
      <div>
        <div class="field-label">DOCUMENTOS ANEXADOS</div>
        <div class="agent-document-list readonly">
          ${a.documents.map(doc => `
            <div class="agent-document-row">
              <i class="ti ti-file-text" aria-hidden="true"></i>
              <span>${escapeHtml(doc.name || doc.path || 'documento.md')}</span>
              ${doc.missing ? '<em>nao encontrado</em>' : ''}
            </div>
          `).join('')}
        </div>
      </div>`
    : '';

  panel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">${a.name}</span>
      <button class="panel-close" onclick="closePanel()"><i class="ti ti-x"></i></button>
    </div>
    <div class="panel-body">
      <div>
        <div class="field-label">SYSTEM PROMPT</div>
        <textarea class="field-input" rows="8" readonly>${escapeHtml(promptText)}</textarea>
      </div>
      ${documentsHtml}
      <div>
        <div class="field-label">MODELO</div>
        <select style="width:100%;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);padding:7px 10px;font-size:13px;color:var(--color-text-primary)">
          ${getModelOptions(a.model)}
        </select>
      </div>
    </div>
    <div class="panel-actions">
      <button class="btn-edit" onclick="openAgentEditor('${a.id}')"><i class="ti ti-pencil"></i> Editar</button>
      <button class="btn-chat" onclick="startChat()"><i class="ti ti-message" aria-hidden="true"></i> Iniciar chat</button>
    </div>`;
}

function showAgentDetails(id) {
  selectAgent(id);
}

function filterCards(v) {
  window.agentsState = {
    ...window.agentsState,
    searchQuery: String(v || '')
  };
  renderCards(filterAgentsByQuery(v));
}

function filterAgentsByQuery(v = '') {
  const query = String(v || '').toLowerCase();
  return agents.filter(a =>
    String(a.name || '').toLowerCase().includes(query) ||
    String(a.desc || '').toLowerCase().includes(query)
  );
}

async function selectAgentFromSidebar(id) {
  if (!(await leaveChatIfNeeded())) return;
  await showAgentsView();
  await startAgentChat(id);
}

function getAgentPromptForEdit(agent) {
  return AgentHelpers.getAgentPromptForEdit(agent);
}

// ============================================
// EXECUTION INDICATOR
// ============================================

function showExecutionIndicator() {
  scrollChatToBottom();
}

function hideExecutionIndicator() {}

function createStarParticles() {}

// ============================================
// EXPORTAà‡à•ES GLOBAIS PARA VIEW FUNCTIONS
// ============================================
window.showHomeView = showHomeView;
window.showAgentsView = showAgentsView;
window.showConnectionsView = showConnectionsView;
window.showConversationsView = showConversationsView;
window.showSettingsView = showSettingsView;
window.toggleProfileMenu = toggleProfileMenu;
window.openSearchOverlay = openSearchOverlay;
window.triggerAgentPersonaUpload = triggerAgentPersonaUpload;
window.handleAgentPersonaSelect = handleAgentPersonaSelect;
window.removeAgentDocument = removeAgentDocument;
window.openAgentDocumentEditor = openAgentDocumentEditor;
window.closeAgentDocumentEditor = closeAgentDocumentEditor;
window.saveAgentDocumentEditor = saveAgentDocumentEditor;
window.openAgentEditor = openAgentEditor;
window.saveAgentFromEditor = saveAgentFromEditor;
window.toggleAgentPromptPreview = toggleAgentPromptPreview;
window.toggleAgentInstructionsEditor = toggleAgentInstructionsEditor;
window.startAgentSandboxChat = startAgentSandboxChat;
window.deleteAgentFromEditor = deleteAgentFromEditor;
window.closePanel = closePanel;
window.selectAgent = selectAgent;
window.showAgentDetails = showAgentDetails;
window.filterCards = filterCards;

// Memory Cards V3
window.openMemoryContextEditor = openMemoryContextEditor;
window.openMemoryCardChat = openMemoryCardChat;
window.setMemoryCardsTab = setMemoryCardsTab;
window.testLocalAiBgeM3 = testLocalAiBgeM3;
window.testLocalAiReranker = testLocalAiReranker;
window.toggleMemoryCardMenu = toggleMemoryCardMenu;
window.toggleMemoryContextsSidebar = toggleMemoryContextsSidebar;
window.toggleMemorySearch = toggleMemorySearch;
window.deleteMemoryCard = deleteMemoryCard;
window.renderChatPanel = renderChatPanel;
window.updateMemoryCardsQuery = updateMemoryCardsQuery;
window.openMemoryInlineEditor = openMemoryInlineEditor;
window.searchMemoryCardSubjectFromModal = searchMemoryCardSubjectFromModal;
window.searchMemoryForEditorContext = searchMemoryForEditorContext;
window.applySelectedMemoryEditorSnippets = applySelectedMemoryEditorSnippets;
window.closeMemoryEditor = closeMemoryEditor;
window.saveMemoryEditor = saveMemoryEditor;
window.importFileToEditor = importFileToEditor;
window.handleEditorFileUpload = handleEditorFileUpload;
window.toggleMemoryFavorite = toggleMemoryFavorite;
window.archiveMemoryCard = archiveMemoryCard;
window.renderSidebarMemoryContexts = renderSidebarMemoryContexts;
window.openMemoryContextFromSidebar = openMemoryContextFromSidebar;
window.renderMemoryRuntimeSearch = renderMemoryRuntimeSearch;
window.memoryRuntimeFilterProjects = memoryRuntimeFilterProjects;
window.openMemoryCardProjectPage = openMemoryCardProjectPage;
window.backToMemoryCardsList = backToMemoryCardsList;
window.resolveValidMemoryCardForRuntime = resolveValidMemoryCardForRuntime;
window.openMemoryCardInstructionsModal = openMemoryCardInstructionsModal;
window.closeMemoryCardInstructionsModal = closeMemoryCardInstructionsModal;
window.saveMemoryCardInstructionsFromModal = saveMemoryCardInstructionsFromModal;
window.updateMemoryCardKnowledgeFromPanel = updateMemoryCardKnowledgeFromPanel;
window.openMemoryCardFilePicker = openMemoryCardFilePicker;
window.removeMemoryCardFile = removeMemoryCardFile;
window.toggleMemoryCardActionMenu = toggleMemoryCardActionMenu;
window.startChatWithCard = startChatWithCard;
window.editMemoryCardInline = editMemoryCardInline;
window.archiveMemoryCardLocal = archiveMemoryCardLocal;
window.deleteMemoryCardLocal = deleteMemoryCardLocal;
window.toggleMemoryCardSwitcher = toggleMemoryCardSwitcher;
window.switchMemoryCardProject = switchMemoryCardProject;
window.memoryRuntimeToggleContext = memoryRuntimeToggleContext;
window.memoryRuntimeToggleContextSelection = memoryRuntimeToggleContextSelection;
window.memoryRuntimeToggleSubcontext = memoryRuntimeToggleSubcontext;
window.memoryRuntimeSelectContext = memoryRuntimeSelectContext;
window.memoryRuntimeSelectSubcontext = memoryRuntimeSelectSubcontext;
window.memoryRuntimeSelectSearchResult = memoryRuntimeSelectSearchResult;
window.memoryRuntimeToggleCard = memoryRuntimeToggleCard;
window.memoryRuntimeToggleExcerpt = memoryRuntimeToggleExcerpt;
window.memoryRuntimeClearSelection = memoryRuntimeClearSelection;
window.memoryRuntimeSaveSelection = memoryRuntimeSaveSelection;
window.memoryRuntimeUseInChat = memoryRuntimeUseInChat;
window.memoryRuntimeOpenAttach = memoryRuntimeOpenAttach;
