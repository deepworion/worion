/**
 * MODULO: worion-api-client.js
 * RESPONSABILIDADE: Cliente HTTP do renderer para consumir a Worion API local
 * DEPENDENCIAS: fetch nativo do renderer
 * EXPORTA: worionApiRequest, worionApiHealth, worionApiRouteModel, worionApiMemorySearch, worionApiMemoryAudit, worionApiMemoryContexts, worionApiMemorySeedContexts, worionApiMemoryCards, worionApiMemoryFiles, worionApiMemoryContextCandidates, worionApiApplyMemoryContextCandidates, worionApiApplyMemoryContextCandidatesBySlug, worionApiMemoryImportAnalyze, worionApiMemoryContextRoutingRules, worionApiMemoryContextUpdate, worionApiMemoryCardSemanticInstructions, worionApiMemoryCardGenerateFromParentContext, worionApiMemoryCardSuggestContext, worionApiContextCardsFetchRows, worionApiContextCardsUpsertRows, worionApiContextCardsSetActiveRows, worionApiNotionFetch
 * TOOLS REGISTRADAS: nenhuma
 * NAO MODIFICAR SEM LER: main.js, worion-api/server.js, chat.js
 * PROBLEMAS CONHECIDOS: usa porta local fixa 3766 nesta fase inicial
 */

const WORION_API_BASE_URL = 'http://127.0.0.1:3766';

async function worionApiRequest(pathname, options = {}) {
  const response = await fetch(`${WORION_API_BASE_URL}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Worion API erro ${response.status}`);
  }
  return data;
}

async function worionApiHealth() {
  return worionApiRequest('/api/health');
}

async function worionApiRouteModel(message, options = {}) {
  const data = await worionApiRequest('/api/models/route', {
    method: 'POST',
    body: JSON.stringify({
      message,
      executionRoute: options.executionRoute,
      tenant_id: options.tenant_id || 'local',
      user_id: options.user_id || 'local-user',
      workspace_id: options.workspace_id || 'local-workspace'
    })
  });
  return data.selection;
}

async function worionApiMemorySearch(query, options = {}) {
  const params = new URLSearchParams({
    query: String(query || ''),
    limit: String(options.limit || 10),
    tenant_id: options.tenant_id || 'local',
    user_id: options.user_id || 'local-user',
    workspace_id: options.workspace_id || 'local-workspace'
  });
  if (options.source_id) params.set('source_id', options.source_id);
  return worionApiRequest(`/api/memory/search?${params.toString()}`);
}

async function worionApiMemoryAudit() {
  return worionApiRequest('/api/memory/audit');
}

async function worionApiMemoryContexts(options = {}) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.order) params.set('order', String(options.order));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const data = await worionApiRequest(`/api/memory/contexts${suffix}`);
  return data.rows || [];
}

async function worionApiMemorySeedContexts() {
  return worionApiRequest('/api/memory/contexts/seed', {
    method: 'POST'
  });
}

async function worionApiMemoryCards(options = {}) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.order) params.set('order', String(options.order));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const data = await worionApiRequest(`/api/memory/cards${suffix}`);
  return data.rows || [];
}

async function worionApiMemoryFiles(options = {}) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.order) params.set('order', String(options.order));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const data = await worionApiRequest(`/api/memory/files${suffix}`);
  return data.rows || [];
}

async function worionApiMemoryContextFiles(options = {}) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.order) params.set('order', String(options.order));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const data = await worionApiRequest(`/api/memory/context-files${suffix}`);
  return data.rows || [];
}

async function worionApiMemoryImportAnalyze(payload) {
  return worionApiRequest('/api/memory/import/analyze', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  });
}

async function worionApiMemoryContextRoutingRules(payload) {
  return worionApiRequest('/api/memory/context-routing-rules', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  });
}

async function worionApiMemoryContextUpdate(payload) {
  return worionApiRequest('/api/memory/contexts/update', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  });
}

async function worionApiMemoryCardSemanticInstructions(cardId, payload) {
  return worionApiRequest(`/api/memory/cards/${encodeURIComponent(cardId)}/semantic-instructions`, {
    method: 'POST',
    body: JSON.stringify(payload || {})
  });
}

async function worionApiMemoryCardGenerateFromParentContext(payload) {
  return worionApiRequest('/api/memory/cards/generate-from-parent-context', {
    method: 'POST',
    body: JSON.stringify(payload || {})
  });
}

async function worionApiMemoryCardSuggestContext(cardId) {
  return worionApiRequest(`/api/memory/cards/${encodeURIComponent(cardId)}/suggest-context`, {
    method: 'POST'
  });
}

async function worionApiMemoryContextCandidates(options = {}) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.minScore !== undefined) params.set('minScore', String(options.minScore));
  if (options.domain) params.set('domain', String(options.domain));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return worionApiRequest(`/api/memory/context-candidates${suffix}`);
}

async function worionApiApplyMemoryContextCandidates(candidates, mode = 'insert_missing_only') {
  return worionApiRequest('/api/memory/context-candidates/apply', {
    method: 'POST',
    body: JSON.stringify({
      candidates: Array.isArray(candidates) ? candidates : [],
      mode
    })
  });
}

async function worionApiApplyMemoryContextCandidatesBySlug(slugs, mode = 'insert_missing_only') {
  return worionApiRequest('/api/memory/context-candidates/apply-by-slug', {
    method: 'POST',
    body: JSON.stringify({
      slugs: Array.isArray(slugs) ? slugs : [],
      mode
    })
  });
}

async function worionApiContextCardsFetchRows(table, params = {}) {
  const query = new URLSearchParams({ table });
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const data = await worionApiRequest(`/api/context-cards?${query.toString()}`);
  return data.rows || [];
}

async function worionApiContextCardsUpsertRows(table, rows, conflictTarget) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const data = await worionApiRequest('/api/context-cards', {
    method: 'POST',
    body: JSON.stringify({
      table,
      rows,
      conflictTarget,
      tenant_id: 'local',
      user_id: 'local-user',
      workspace_id: 'local-workspace'
    })
  });
  return data.rows || [];
}

async function worionApiContextCardsSetActiveRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const data = await worionApiRequest('/api/context-cards/active', {
    method: 'POST',
    body: JSON.stringify({
      rows,
      tenant_id: 'local',
      user_id: 'local-user',
      workspace_id: 'local-workspace'
    })
  });
  return data.rows || [];
}

async function worionApiNotionFetch(text, options = {}) {
  return worionApiRequest('/api/notion/fetch', {
    method: 'POST',
    body: JSON.stringify({
      text,
      count: options.count,
      max_chars: options.max_chars,
      tenant_id: options.tenant_id || 'local',
      user_id: options.user_id || 'local-user',
      workspace_id: options.workspace_id || 'local-workspace'
    })
  });
}

async function worionApiChatMessages(messages, model, options = {}) {
  return worionApiRequest('/api/chat/messages', {
    method: 'POST',
    body: JSON.stringify({
      messages,
      model,
      options,
      tenant_id: options.tenant_id || 'local',
      user_id: options.user_id || 'local-user',
      workspace_id: options.workspace_id || 'local-workspace'
    })
  });
}

async function worionApiNotionCreate(title, content, options = {}) {
  return worionApiRequest('/api/notion/create', {
    method: 'POST',
    body: JSON.stringify({
      title,
      content,
      tenant_id: options.tenant_id || 'local',
      user_id: options.user_id || 'local-user',
      workspace_id: options.workspace_id || 'local-workspace'
    })
  });
}

if (typeof window !== 'undefined') {
  window.WORION_API_BASE_URL = WORION_API_BASE_URL;
  window.worionApiHealth = worionApiHealth;
  window.worionApiRouteModel = worionApiRouteModel;
  window.worionApiMemorySearch = worionApiMemorySearch;
  window.worionApiMemoryAudit = worionApiMemoryAudit;
  window.worionApiMemoryContexts = worionApiMemoryContexts;
  window.worionApiMemorySeedContexts = worionApiMemorySeedContexts;
  window.worionApiMemoryCards = worionApiMemoryCards;
  window.worionApiMemoryFiles = worionApiMemoryFiles;
  window.worionApiMemoryContextFiles = worionApiMemoryContextFiles;
  window.worionApiMemoryImportAnalyze = worionApiMemoryImportAnalyze;
  window.worionApiMemoryContextRoutingRules = worionApiMemoryContextRoutingRules;
  window.worionApiMemoryContextUpdate = worionApiMemoryContextUpdate;
  window.worionApiMemoryCardSemanticInstructions = worionApiMemoryCardSemanticInstructions;
  window.worionApiMemoryCardGenerateFromParentContext = worionApiMemoryCardGenerateFromParentContext;
  window.worionApiMemoryCardSuggestContext = worionApiMemoryCardSuggestContext;
  window.worionApiMemoryContextCandidates = worionApiMemoryContextCandidates;
  window.worionApiApplyMemoryContextCandidates = worionApiApplyMemoryContextCandidates;
  window.worionApiApplyMemoryContextCandidatesBySlug = worionApiApplyMemoryContextCandidatesBySlug;
  window.worionApiContextCardsFetchRows = worionApiContextCardsFetchRows;
  window.worionApiContextCardsUpsertRows = worionApiContextCardsUpsertRows;
  window.worionApiContextCardsSetActiveRows = worionApiContextCardsSetActiveRows;
  window.worionApiNotionFetch = worionApiNotionFetch;
  window.worionApiChatMessages = worionApiChatMessages;
  window.worionApiNotionCreate = worionApiNotionCreate;
}
