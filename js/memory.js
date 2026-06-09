/**
 * MÓDULO: memory.js
 * RESPONSABILIDADE: Gerenciamento de perfil do usuário, conversas locais e sincronização com Supabase
 * DEPENDÊNCIAS: app.js, connectors.js, utils.js
 * EXPORTA: ensureLocalStore, loadUserProfile, saveUserProfile, getDefaultModels, loadModelsConfig, getModelOptions, normalizeDailyUsage, accountUsageTime, getDailyLimitReminder, renderProfileSummary, conversationToMemoryRow, memoryRowToConversation, conversationListItem, saveMemorySessionToSupabase, loadMemorySessionsFromSupabase, readMemorySessionFromSupabase, deleteMemorySessionEverywhere, readConversationFile, loadLocalConversations
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: app.js, connectors.js (usa estados globais e APIs Supabase)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// MEMORY & PROFILE
// ============================================

async function ensureLocalStore() {
  await fs.mkdir(CONVERSATIONS_DIR, { recursive: true });
}

async function loadUserProfile() {
  try {
    const stored = JSON.parse(await fs.readFile(PROFILE_PATH, 'utf-8'));
    userProfile = { ...userProfile, ...stored };
  } catch (error) {
    await saveUserProfile();
  }
  renderProfileSummary();
}

async function saveUserProfile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROFILE_PATH, JSON.stringify(userProfile, null, 2), 'utf-8');
}

function getDefaultModels() {
  return [
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano', group: 'Rápido', description: 'Router, classifier, writer e reducer leve.' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', group: 'Principal', description: 'Síntese privada média e pesquisa com síntese.' },
    { id: 'gpt-5.5', name: 'GPT-5.5', group: 'Crítico', description: 'Análise pesada, código e pesquisa profunda.' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', group: 'Legado', description: 'Legado não-raciocínio para fallback leve.' },
    { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', group: 'Manual', description: 'Modelo DeepSeek preservado para uso manual/especializado.' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', group: 'Manual', description: 'Modelo Haiku preservado para uso manual e fallback operacional.' },
    { id: 'gpt-4o', name: 'GPT-4o', group: 'Multimodal', description: 'Especialista multimodal/visão quando necessário.' }
  ];
}

async function loadModelsConfig() {
  try {
    availableModels = JSON.parse(await fs.readFile(MODELS_PATH, 'utf-8'));
    if (!Array.isArray(availableModels) || availableModels.length === 0) throw new Error('models.json vazio');
  } catch (error) {
    availableModels = getDefaultModels();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(MODELS_PATH, JSON.stringify(availableModels, null, 2), 'utf-8');
  }
}

function getModelOptions(selectedModel) {
  const selected = selectedModel || 'gpt-5.4-mini';
  const knownIds = new Set(availableModels.map(model => model.id));
  const models = knownIds.has(selected)
    ? availableModels
    : [{ id: selected, name: selected, group: 'Personalizado', description: 'Modelo definido no agente.' }, ...availableModels];

  return models.map(model => `
    <option value="${escapeHtml(model.id)}"${model.id === selected ? ' selected' : ''}>
      ${escapeHtml(model.name || model.id)} (${escapeHtml(model.id)})
    </option>
  `).join('');
}

function normalizeDailyUsage() {
  const today = new Date().toISOString().slice(0, 10);
  if (!userProfile.dailyUsage || userProfile.dailyUsage.date !== today) {
    userProfile.dailyUsage = { date: today, ms: 0 };
  }
}

async function accountUsageTime() {
  if (!usageAccountingStartedAt) return;
  normalizeDailyUsage();
  const now = Date.now();
  const delta = Math.max(0, now - usageAccountingStartedAt);
  userProfile.dailyUsage.ms = (userProfile.dailyUsage.ms || 0) + delta;
  usageAccountingStartedAt = now;
  await saveUserProfile();
  renderProfileSummary();
}

function getDailyLimitReminder() {
  const limit = Number(userProfile.dailyLimitMinutes || 0);
  if (!limit) return '';
  normalizeDailyUsage();
  if ((userProfile.dailyUsage.ms || 0) < limit * 60000) return '';
  return `\n\nNota discreta: voce passou de ${limit} min de uso hoje. Pode ignorar este lembrete e continuar normalmente.`;
}

function renderProfileSummary() {
  normalizeDailyUsage();
  const name = userProfile.name || userProfile.displayName || 'Usuario';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
  const avatar = document.getElementById('profile-avatar');
  const profileName = document.getElementById('profile-name');
  const email = document.getElementById('profile-menu-email');
  if (avatar) avatar.textContent = initials;
  if (profileName) profileName.textContent = name;
  if (email) email.textContent = userProfile.email || 'Perfil local do Worion';
  const sub = document.querySelector('.profile-sub');
  if (sub) sub.textContent = `Hoje: ${formatDuration(userProfile.dailyUsage.ms || 0)}`;
}

function conversationToMemoryRow(payload) {
  const id = payload.id || payload.conversationId;
  const createdAt = payload.createdAt || payload.sessionStartedAt || payload.updatedAt || new Date().toISOString();
  const updatedAt = payload.updatedAt || createdAt;
  return {
    id,
    user_id: 'local-user',
    title: payload.title || getConversationTitle(payload.messages || []),
    agent_id: payload.agentId,
    agent_name: payload.agentName,
    active_skill_id: payload.activeSkillId || null,
    project_id: payload.projectId || null,
    project_title: payload.projectTitle || null,
    created_at: createdAt,
    updated_at: updatedAt,
    payload: {
      ...payload,
      id,
      conversationId: payload.conversationId || id,
      createdAt,
      updatedAt
    }
  };
}

function memoryRowToConversation(row) {
  const payload = row.payload || {};
  const id = payload.id || payload.conversationId || row.id;
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  // Debug silenciado
  // console.log('[MEMORY] memoryRowToConversation:', {
  //   rowId: row.id,
  //   payloadId: payload.id,
  //   hasPayload: !!row.payload,
  //   messagesCount: messages.length,
  //   payloadKeys: Object.keys(payload),
  //   firstMessageRole: messages[0]?.role
  // });
  return {
    ...payload,
    id,
    conversationId: payload.conversationId || id,
    title: payload.title || row.title || 'Conversa sem titulo',
    agentId: payload.agentId || row.agent_id,
    agentName: payload.agentName || row.agent_name || 'Agente',
    activeSkillId: payload.activeSkillId || row.active_skill_id || null,
    activeWorkModeId: payload.activeWorkModeId || null,
    createdAt: payload.createdAt || row.created_at,
    updatedAt: payload.updatedAt || row.updated_at,
    messages
  };
}

function conversationListItem(item) {
  const id = item.id || item.conversationId;
  return {
    id,
    title: item.title || getConversationTitle(item.messages || []),
    agentName: item.agentName || 'Agente',
    activeSkillId: item.activeSkillId || null,
    activeWorkModeId: item.activeWorkModeId || null,
    activeWorkModeIds: Array.isArray(item.activeWorkModeIds) ? item.activeWorkModeIds : (item.activeWorkModeId ? [item.activeWorkModeId] : []),
    projectId: item.projectId || null,
    projectTitle: item.projectTitle || '',
    pinned: Boolean(item.pinned),
    archived: Boolean(item.archived),
    updatedAt: item.updatedAt || item.createdAt || new Date(0).toISOString(),
    updated: new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleString('pt-BR')
  };
}

async function saveMemorySessionToSupabase(payload) {
  try {
    const row = conversationToMemoryRow(payload);
    if (!row.id) throw new Error('conversa sem id para sincronizar');
    const response = await fetch(`${MEMORY_SUPABASE_URL}/rest/v1/${MEMORY_CONVERSATIONS_TABLE}?on_conflict=id`, {
      method: 'POST',
      headers: memorySupabaseHeaders({
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify(row)
    });
    if (!response.ok) throw new Error(`memory sync ${response.status}: ${(await response.text()).slice(0, 180)}`);
  } catch (error) {
    console.warn('Memoria Supabase indisponivel; conversa mantida localmente:', error.message);
  }
}

async function loadMemorySessionsFromSupabase() {
  try {
    const response = await fetch(`${MEMORY_SUPABASE_URL}/rest/v1/${MEMORY_CONVERSATIONS_TABLE}?select=id,title,agent_id,agent_name,active_skill_id,created_at,updated_at,payload&user_id=eq.local-user&order=updated_at.desc&limit=80`, {
      headers: memorySupabaseHeaders()
    });
    if (!response.ok) throw new Error(`memory load ${response.status}: ${(await response.text()).slice(0, 180)}`);
    return (await response.json()).map(memoryRowToConversation);
  } catch (error) {
    console.warn('Memoria Supabase nao carregada; usando conversas locais:', error.message);
    return [];
  }
}

async function readMemorySessionFromSupabase(id) {
  const response = await fetch(`${MEMORY_SUPABASE_URL}/rest/v1/${MEMORY_CONVERSATIONS_TABLE}?id=eq.${encodeURIComponent(id)}&user_id=eq.local-user&select=*&limit=1`, {
    headers: memorySupabaseHeaders()
  });
  if (!response.ok) throw new Error(`memory read ${response.status}`);
  const rows = await response.json();
  if (!rows.length) throw new Error('Conversa nao encontrada na memoria Supabase');
  return memoryRowToConversation(rows[0]);
}

async function deleteMemorySessionEverywhere(id) {
  const conversationId = String(id || '').trim();
  if (!conversationId) throw new Error('ID da conversa nao informado.');

  await ensureLocalStore();
  await fs.unlink(getConversationPath(conversationId)).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });

  try {
    const response = await fetch(`${MEMORY_SUPABASE_URL}/rest/v1/${MEMORY_CONVERSATIONS_TABLE}?id=eq.${encodeURIComponent(conversationId)}&user_id=eq.local-user`, {
      method: 'DELETE',
      headers: memorySupabaseHeaders({
        'Prefer': 'return=minimal'
      })
    });
    if (!response.ok) {
      throw new Error(`memory delete ${response.status}: ${(await response.text()).slice(0, 180)}`);
    }
  } catch (error) {
    console.warn('Falha ao excluir conversa na memoria Supabase:', error.message);
  }
}

async function readConversationFile(id) {
  try {
    return await readMemorySessionFromSupabase(id);
  } catch (error) {
    return JSON.parse(await fs.readFile(getConversationPath(id), 'utf-8'));
  }
}

async function loadLocalConversations() {
  await ensureLocalStore();
  const remoteRows = await loadMemorySessionsFromSupabase();
  const files = (await fs.readdir(CONVERSATIONS_DIR)).filter(f => f.endsWith('.json'));
  const rowsById = new Map();
  const localSyncPayloads = [];
  remoteRows.forEach(item => {
    const row = conversationListItem(item);
    if (row.id) rowsById.set(row.id, row);
  });
  for (const file of files) {
    try {
      const item = JSON.parse(await fs.readFile(path.join(CONVERSATIONS_DIR, file), 'utf-8'));
      const localRow = conversationListItem(item);
      if (!localRow.id) continue;
      const existing = rowsById.get(localRow.id);
      if (!existing || new Date(localRow.updatedAt) > new Date(existing.updatedAt)) {
        rowsById.set(localRow.id, localRow);
        localSyncPayloads.push({
          ...item,
          id: item.id || item.conversationId || localRow.id,
          conversationId: item.conversationId || item.id || localRow.id,
          title: item.title || localRow.title,
          updatedAt: item.updatedAt || localRow.updatedAt
        });
      }
    } catch (error) {
      if (error instanceof SyntaxError || /Unexpected end of JSON input/i.test(String(error?.message || ''))) {
        const sourcePath = path.join(CONVERSATIONS_DIR, file);
        const quarantineName = `${file.replace(/\.json$/i, '')}.corrupt-${Date.now()}.json`;
        const quarantinePath = path.join(CONVERSATIONS_DIR, quarantineName);
        let handled = false;

        // Tentativa 1: Mover para quarentena
        try {
          await fs.rename(sourcePath, quarantinePath);
          console.warn('[MEMORY] Conversa corrompida movida para quarentena:', quarantineName);
          handled = true;
        } catch (renameError) {
          // Tentativa 2: Se renomeação falhar (ENOENT ou outro erro), excluir permanentemente
          try {
            await fs.unlink(sourcePath);
            console.warn('[MEMORY] Conversa corrompida excluída (renomeação falhou):', file);
            handled = true;
          } catch (unlinkError) {
            // Arquivo pode já não existir ou estar inacessível
            // Logar apenas se ambas as tentativas falharam
            if (unlinkError.code !== 'ENOENT') {
              console.error('[MEMORY] Não foi possível remover arquivo corrompido:', file, {
                renameError: renameError?.code || renameError?.message,
                unlinkError: unlinkError?.code || unlinkError?.message
              });
            }
          }
        }
      } else {
        // Erro não é JSON corrompido, apenas logar
        console.warn('[MEMORY] Conversa local ignorada:', file, error?.message || error);
      }
    }
  }
  if (localSyncPayloads.length && typeof saveMemorySessionToSupabase === 'function') {
    await Promise.allSettled(localSyncPayloads.slice(0, 40).map(item => saveMemorySessionToSupabase(item)));
  }
  return Array.from(rowsById.values())
    .filter(item => !item.archived)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt) - new Date(a.updatedAt));
}
