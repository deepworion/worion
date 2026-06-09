/**
 * MÓDULO: chat-sessions.js
 * RESPONSABILIDADE: título de conversa, limpeza de mensagens, carga/salvamento e lifecycle de sessão
 * DEPENDÊNCIAS: js/tools.js, js/memory.js, js/prompt.js, js/app.js, js/chat.js
 * EXPORTA: getConversationTitle, getCleanMessages, getDefaultAgent, shouldIntegrateAttachmentsToAgent, isLikelyConversationHistoryText, extractHistoryKeywords, inspectAttachmentHistory, enrichAttachmentsForRuntime, flushDeferredActionsForConversationEnd, loadPreviousSessionsContext, saveCurrentSession, buildConversationSnapshot, isOriginConversationActive, renderOriginConversation, saveConversationSnapshot, startChat, startNewChatFromHome, openConversation, endSession, backToAgents, closePanel, leaveChatIfNeeded, resetChatToAgents, handleBeforeUnload
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: js/memory.js, js/prompt.js, js/app.js, js/chat.js
 * PROBLEMAS CONHECIDOS: persistência e restauração ainda dependem de estado global compartilhado
 */

function getConversationTitle(sourceMessages = messages) {
  if (window.currentMemoryChatTitle) return String(window.currentMemoryChatTitle).slice(0, 64).replace(/\s+/g, ' ');
  const items = Array.isArray(sourceMessages) ? sourceMessages : [];
  const firstUser = items.find(message => message?.role === 'user' && String(message.content || '').trim());
  const text = String(firstUser?.content || '').trim();
  if (!text) return 'Nova conversa';
  return text.slice(0, 64).replace(/\s+/g, ' ');
}

function getCleanMessages(sourceMessages = messages) {
  if (!Array.isArray(sourceMessages)) return [];
  // Remove mensagens falsy, tool calls (contexto interno) e exec (debug)
  return sourceMessages.filter(msg => msg && msg.role !== 'tool' && msg.role !== 'exec');
}

function getDefaultAgent() {
  const availableAgents = Array.isArray(agents) && agents.length
    ? agents
    : (Array.isArray(window?.WORION_AGENTS) ? window.WORION_AGENTS : []);

  if (currentAgent && availableAgents.some(agent => agent.id === currentAgent.id)) {
    return currentAgent;
  }

  return availableAgents.find(agent => /worion|padrao|padr[aã]o|default/i.test(`${agent.name || ''} ${agent.id || ''}`))
    || availableAgents[0]
    || null;
}

function shouldIntegrateAttachmentsToAgent(text, attachments = []) {
  return Boolean(text) && Array.isArray(attachments) && attachments.some(file => file.kind === 'text');
}

function isLikelyConversationHistoryText(text) {
  return /\b(conversa|chat|hist[oó]rico|history)\b/i.test(String(text || ''));
}

function extractHistoryKeywords(text, limit = 4) {
  return String(text || '')
    .split(/\s+/)
    .filter(word => word.length > 4)
    .slice(0, limit);
}

async function inspectAttachmentHistory(file) {
  return file?.historyContext || null;
}

async function enrichAttachmentsForRuntime(attachments = []) {
  return attachments;
}

async function flushDeferredActionsForConversationEnd() {
  if (Array.isArray(DEFERRED_ACTIONS) && DEFERRED_ACTIONS.length && typeof executeDeferredActions === 'function') {
    await executeDeferredActions({ force: true });
  }
}

async function loadPreviousSessionsContext(agent) {
  return '';
}

// Debounce e proteção contra loop de saves
var saveConversationDebounceTimer = null;
var isSavingConversation = false;

async function saveCurrentSession({ silent = true } = {}) {
  if (!currentConversationId) return;
  const snapshot = buildConversationSnapshot({});
  await saveConversationSnapshot(snapshot, { silent });
}

function buildConversationSnapshot(overrides = {}) {
  const now = new Date().toISOString();
  const sourceMessages = Array.isArray(overrides.messages) ? overrides.messages : messages;
  const cleanMessages = getCleanMessages(sourceMessages);
  const conversationId = overrides.conversationId || overrides.id || currentConversationId;
  const startedAt = overrides.sessionStartedAt || sessionStartedAt?.toISOString?.() || now;
  const chatSource = overrides.chatSource || window.currentChatSource || 'home';
  const isSkillChat = chatSource === 'skill';
  const isAgentChat = chatSource === 'agent';
  const activeSkill = isSkillChat && typeof getActiveSkill === 'function' ? getActiveSkill() : null;
  const snapshot = {
    id: conversationId,
    conversationId,
    title: overrides.title || getConversationTitle(cleanMessages),
    agentId: isAgentChat ? (currentAgent?.id || null) : null,
    agentName: isAgentChat
      ? (currentAgent?.name || currentAgent?.title || 'Agente')
      : (isSkillChat ? (activeSkill?.name || 'Skill') : 'Novo Chat'),
    chatSource,
    activeSkillId: isSkillChat ? (activeSkillId || null) : null,
    activeWorkModeId: isSkillChat ? null : (activeWorkModeId || null),
    activeWorkModeIds: isSkillChat ? [] : (Array.isArray(activeWorkModeIds) ? activeWorkModeIds : (activeWorkModeId ? [activeWorkModeId] : [])),
    projectId: currentProjectContext?.id || null,
    projectTitle: currentProjectContext?.title || currentProjectContext?.name || '',
    autoSaveNotion: Boolean(autoSaveNotion),
    silentIncorporatedContext: String(silentIncorporatedContext || ''),
    deferredActions: Array.isArray(DEFERRED_ACTIONS) ? DEFERRED_ACTIONS : [],
    messages: cleanMessages,
    sessionStartedAt: startedAt,
    createdAt: startedAt,
    updatedAt: now,
    ...overrides
  };
  snapshot.id = snapshot.id || snapshot.conversationId;
  snapshot.conversationId = snapshot.conversationId || snapshot.id;
  snapshot.messages = getCleanMessages(snapshot.messages);
  snapshot.title = snapshot.title || getConversationTitle(snapshot.messages);
  if (snapshot.chatSource !== 'skill') {
    snapshot.activeSkillId = null;
  }
  if (snapshot.chatSource === 'skill') {
    snapshot.activeWorkModeId = null;
    snapshot.activeWorkModeIds = [];
  }
  if (snapshot.chatSource !== 'agent') {
    snapshot.agentId = null;
    snapshot.agentName = snapshot.chatSource === 'skill'
      ? ((typeof getActiveSkill === 'function' ? getActiveSkill()?.name : '') || 'Skill')
      : 'Novo Chat';
  }
  snapshot.updatedAt = now;
  // Debug silenciado
  // console.log('[BUILD] buildConversationSnapshot criado', {
  //   conversationId: snapshot.conversationId || snapshot.id,
  //   messageCount: snapshot.messages?.length,
  //   overrides: Object.keys(overrides)
  // });
  return snapshot;
}

function isOriginConversationActive(originConversationId) {
  return currentConversationId === originConversationId;
}

function renderOriginConversation(originConversationId) {
  if (isOriginConversationActive(originConversationId) && typeof renderChatPanel === 'function') {
    renderChatPanel();
  }
}

async function saveConversationSnapshot(snapshot, { silent = true } = {}) {
  // Debug silenciado
  // console.log('[SAVE] saveConversationSnapshot chamada', { conversationId: snapshot?.conversationId, hasSnapshot: !!snapshot });

  // Não salvar durante carregamento inicial
  if (!snapshot?.messages || snapshot.messages.length === 0) {
    // console.log('[SAVE] Abortado: carregamento inicial (sem mensagens)');
    return;
  }

  const conversationId = snapshot?.conversationId || snapshot?.id;
  if (!conversationId) {
    console.warn('[SAVE] Abortado: snapshot sem conversationId', snapshot);
    return;
  }

  // Proteção contra múltiplas chamadas simultâneas
  if (isSavingConversation) {
    // console.log('[SAVE] Abortado: save já em andamento');
    return;
  }

  // Debounce: cancelar timer anterior e agendar novo save
  if (saveConversationDebounceTimer) {
    clearTimeout(saveConversationDebounceTimer);
  }

  saveConversationDebounceTimer = setTimeout(async () => {
    isSavingConversation = true;
    try {
      await performSaveConversation(snapshot, silent, conversationId);
    } finally {
      isSavingConversation = false;
      saveConversationDebounceTimer = null;
    }
  }, 2000);
}

async function performSaveConversation(snapshot, silent, conversationId) {
  snapshot.id = snapshot.id || conversationId;
  snapshot.conversationId = snapshot.conversationId || conversationId;
  snapshot.messages = getCleanMessages(snapshot.messages);
  snapshot.title = snapshot.title || getConversationTitle(snapshot.messages);
  snapshot.createdAt = snapshot.createdAt || snapshot.sessionStartedAt || new Date().toISOString();
  snapshot.chatSource = snapshot.chatSource || window.currentChatSource || 'home';
  if (snapshot.chatSource !== 'skill') {
    snapshot.activeSkillId = null;
  }
  if (snapshot.chatSource === 'skill') {
    snapshot.activeWorkModeId = null;
    snapshot.activeWorkModeIds = [];
  }
  if (snapshot.chatSource !== 'agent') {
    snapshot.agentId = null;
    snapshot.agentName = snapshot.chatSource === 'skill'
      ? ((typeof getActiveSkill === 'function' ? getActiveSkill()?.name : '') || 'Skill')
      : 'Novo Chat';
  }
  snapshot.updatedAt = new Date().toISOString();

  const path = getConversationPath(conversationId);
  // console.log('[SAVE] Salvando em:', path);
  try {
    await fs.writeFile(path, JSON.stringify(snapshot, null, 2), 'utf-8');
    // console.log('[SAVE] Arquivo salvo com sucesso');
  } catch (error) {
    console.error('[SAVE] Erro ao salvar:', error);
    throw error;
  }

  if (snapshot.projectId && typeof attachConversationToProject === 'function') {
    await attachConversationToProject(conversationId, snapshot.projectId, snapshot);
  }

  if (typeof saveMemorySessionToSupabase === 'function') {
    await saveMemorySessionToSupabase(snapshot);
    // console.log('[SAVE] Supabase sincronizada');
  } else {
    console.warn('[SAVE] saveMemorySessionToSupabase nao disponivel');
  }

  // Atualiza sidebar após salvar (recarrega do disco)
  if (typeof refreshSidebarConversations === 'function') {
    await refreshSidebarConversations();
    // console.log('[SAVE] Sidebar atualizada');
  } else {
    console.warn('[SAVE] refreshSidebarConversations nao disponivel');
  }
}

async function startChat(options = {}) {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  if (!currentAgent) currentAgent = getDefaultAgent();
  if (!currentAgent) {
    alert('Nenhum agente encontrado.');
    return;
  }

  // Debug silenciado
  // console.log('[START CHAT] Before mutations:', { messagesCount: messages.length, keepMessages: options.keepMessages });
  chatMode = true;
  if (!options.keepMessages) messages = [];
  // console.log('[START CHAT] After keepMessages check:', messages.length);
  if (!options.keepMessages || messages.length === 0) resetSilentIncorporatedContext();
  sessionStartedAt = sessionStartedAt || new Date();
  usageAccountingStartedAt = Date.now();
  sessionSaved = false;
  previousSessionsContext = '';
  // console.log('[START CHAT] Before injectRecentMemory:', messages.length);

  if (!deepseekKey) {
    try {
      deepseekKey = await getDeepSeekKey();
    } catch (error) {
      console.error('Erro ao buscar DeepSeek key:', error);
      alert('Erro ao carregar DeepSeek API key da Vault Supabase.');
      return;
    }
  }

  if (!openaiKey) {
    try {
      openaiKey = await getOpenAIKey();
    } catch (error) {
      console.warn('[OPENAI] API key nao encontrada - imagens e especialistas OpenAI ficam indisponiveis:', error.message);
    }
  }

  if (!anthropicKey) {
    try {
      anthropicKey = await getAnthropicKey();
    } catch (error) {
      console.warn('[ANTHROPIC] Claude API key nao encontrada - Anthropic indisponivel salvo selecao explicita:', error.message);
    }
  }

  await injectRecentMemory();
  // console.log('[START CHAT] After injectRecentMemory:', messages.length);

  if (messages.length === 0 && !options.keepMessages) {
    const welcome = getWelcomeMessage();
    messages.push({ role: 'assistant', content: welcome, createdAt: new Date().toISOString() });
  }
  // console.log('[START CHAT] Before renderChatPanel:', messages.length);

  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';
  setActiveView(window.currentChatSource === 'agent' ? 'agents' : 'new-chat');
  selected = currentAgent.id;
  renderChatPanel();
  // console.log('[START CHAT] After renderChatPanel:', messages.length);
  renderSidebarSkills();
  renderSidebarConversations();
}

async function startNewChatFromHome() {
  const input = document.getElementById('home-chat-in');
  const text = input ? input.value.trim() : '';
  const agent = getDefaultAgent();
  if (!agent) {
    alert('Crie um agente antes de iniciar um chat.');
    return;
  }

  selected = agent.id;
  currentAgent = agent;
  window.currentChatSource = 'home';
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  currentProjectContext = null;
  currentConversationId = null;
  messages = [];
  sessionStartedAt = null;
  resetSilentIncorporatedContext();
  await startChat({ keepMessages: true, loadHistory: false });
  if (text) {
    const chatInput = document.getElementById('chat-in');
    chatInput.value = text;
    if (typeof window.sendMsg === 'function') {
      await window.sendMsg();
    } else {
      console.error('[CHAT] sendMsg indisponivel no runtime');
    }
  }
}

async function openConversation(id) {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  const convo = await readConversationFile(id);
  console.log('[OPEN CONVERSATION]', {
    id,
    hasMessages: !!convo.messages,
    messagesCount: Array.isArray(convo.messages) ? convo.messages.length : 0,
    convoKeys: Object.keys(convo),
    firstMessage: convo.messages?.[0]
  });
  const now = new Date();
  const last = convo.lastOpenedAt || convo.updatedAt || convo.createdAt;
  currentConversationId = convo.id;
  currentAgent = agents.find(a => a.id === convo.agentId) || getDefaultAgent();
  const defaultAgent = getDefaultAgent();
  window.currentChatSource = convo.chatSource || (convo.isAgentSession || (convo.agentId && convo.agentId !== defaultAgent?.id) ? 'agent' : 'home');
  activeSkillId = window.currentChatSource === 'skill' ? (convo.activeSkillId || null) : null;
  activeWorkModeIds = window.currentChatSource === 'skill'
    ? []
    : (Array.isArray(convo.activeWorkModeIds) ? convo.activeWorkModeIds : (convo.activeWorkModeId ? [convo.activeWorkModeId] : []));
  activeWorkModeId = activeWorkModeIds[0] || null;
  autoSaveNotion = Boolean(convo.autoSaveNotion);
  silentIncorporatedContext = String(convo.silentIncorporatedContext || '');
  DEFERRED_ACTIONS = Array.isArray(convo.deferredActions) ? convo.deferredActions : [];
  selected = currentAgent?.id || null;
  messages = Array.isArray(convo.messages) ? convo.messages : [];
  console.log('[OPEN CONVERSATION] messages variable set:', messages.length);
  if (last) {
    const gap = now - new Date(last);
    if (gap > 5 * 60000) {
      const resumeEvent = {
        openedAt: now.toISOString(),
        previousActivityAt: last || null,
        gapMs: gap,
        note: `Retomado em ${formatDateTime(now.toISOString())}. Intervalo desde a ultima atividade: ${formatDuration(gap)}.`
      };
      logAction('session_resume', 'success', JSON.stringify(resumeEvent));
      if (WORION_UX_CONFIG.showSessionResumeMarkers) {
        messages.push({ role: 'event', content: resumeEvent.note, createdAt: now.toISOString() });
      }
    }
  }
  convo.lastOpenedAt = now.toISOString();
  convo.accessLog = [...(Array.isArray(convo.accessLog) ? convo.accessLog : []), { openedAt: now.toISOString(), previousActivityAt: last || null }];
  await fs.writeFile(getConversationPath(id), JSON.stringify({ ...convo, messages }, null, 2), 'utf-8');
  sessionStartedAt = new Date(convo.createdAt || Date.now());
  sessionSaved = true;
  window.__worionAutoScrollPaused = false;
  await startChat({ keepMessages: true, loadHistory: false });
}

async function endSession() {
  await flushDeferredActionsForConversationEnd();
  await saveCurrentSession({ silent: true });
  await refreshSidebarConversations();
  await showHomeView();
}

async function backToAgents() {
  await flushDeferredActionsForConversationEnd();
  await saveCurrentSession({ silent: true });
  await showAgentsView();
}

async function closePanel() {
  await flushDeferredActionsForConversationEnd();
  await saveCurrentSession({ silent: true });
  resetChatToAgents();
}

async function leaveChatIfNeeded() {
  await flushDeferredActionsForConversationEnd();
  await saveCurrentSession({ silent: true });
  return true;
}

function resetChatToAgents() {
  selected = null;
  currentAgent = null;
  window.currentChatSource = 'home';
  chatMode = false;
  messages = [];
  sessionStartedAt = null;
  previousSessionsContext = '';
  currentProjectContext = null;
  autoSaveNotion = false;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  resetSilentIncorporatedContext();
  DEFERRED_ACTIONS = [];
  currentTurnPolicy = {
    explicitNotionWriteAuthorized: false,
    deferNotionWrite: false,
    shouldExecuteDeferredNow: false
  };
  renderCards(agents);
  document.getElementById('detail-panel').style.display = 'none';
  document.querySelector('.shell').classList.remove('chat-fullscreen');
}

function handleBeforeUnload(event) {
  flushDeferredActionsForConversationEnd();
  saveCurrentSession({ silent: true });
}

window.buildConversationSnapshot = buildConversationSnapshot;
window.saveConversationSnapshot = saveConversationSnapshot;
