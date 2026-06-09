/**
 * @module ui/sidebar/sidebar-conversations
 * @description Renderização de conversas na sidebar
 * @dependencies utils
 * @exports renderSidebarConversations, refreshSidebarConversations, deleteSidebarConversation
 */

export function renderSidebarConversations() {
  const escapeHtml = window.escapeHtml || (s => s);
  const conversations = window.conversations || [];
  const currentConversationId = window.currentConversationId;
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
}

export async function refreshSidebarConversations() {
  const loadLocalConversations = window.loadLocalConversations || (async () => []);
  const loadLocalProjects = window.loadLocalProjects || (async () => []);
  const renderSidebarProjects = window.renderSidebarProjects || (() => {});

  window.conversations = await loadLocalConversations();
  if (typeof loadLocalProjects === 'function') {
    window.projects = await loadLocalProjects().catch(() => window.projects || []);
  }
  renderSidebarProjects();
  renderSidebarConversations();
}

export async function deleteSidebarConversation(id) {
  const showConfirmModal = window.showConfirmModal || (async () => false);
  const deleteMemorySessionEverywhere = window.deleteMemorySessionEverywhere || (async () => {});
  const showHomeView = window.showHomeView || (async () => {});

  const conversationId = String(id || '').trim();
  if (!conversationId) return;
  const confirmed = await showConfirmModal({
    title: 'Excluir conversa?',
    message: 'Essa ação remove esta conversa da lista. Deseja continuar?',
    cancelLabel: 'Cancelar',
    confirmLabel: 'Excluir conversa',
    destructive: true
  });
  if (!confirmed) return;

  const deletingCurrentConversation = conversationId === window.currentConversationId;

  try {
    await deleteMemorySessionEverywhere(conversationId);
    if (deletingCurrentConversation) {
      window.currentConversationId = null;
      window.messages = [];
      window.sessionStartedAt = null;
      window.sessionSaved = false;
      window.autoSaveNotion = false;
      window.DEFERRED_ACTIONS = [];
      window.currentTurnPolicy = {
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
