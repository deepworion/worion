/**
 * @module ui/views/connections-view
 * @description View de conexões (Supabase, Notion, Memory)
 * @dependencies utils
 * @exports loadConnectionsTree, filterConnectionsQuery, applyConnectionsSearch, openConnectionsCategory, renderConnectionsTable, renderConnectionsDetail, extractConnectionsRows
 */

export const connectionsTreeState = {
  open: {},
  activePath: '',
  query: ''
};

export function loadConnectionsTree() {
  const escapeHtml = window.escapeHtml || (s => s);
  const tree = document.getElementById('connections-tree');
  if (!tree) return;
  const filter = document.getElementById('connections-source-filter')?.value || 'all';
  const sourceNodes = [
    { key: 'supabase', label: 'Supabase', children: ['Memórias', 'Conversas', 'Vault', 'Inventários'] },
    { key: 'notion', label: 'Notion', children: ['Worion HQ', 'Sessões & Commits', 'Projetos', 'Páginas recentes'] },
    { key: 'memory', label: 'Memórias', children: ['Claude', 'ChatGPT', 'Resumos'] }
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

export function filterConnectionsQuery(value) {
  connectionsTreeState.query = value || '';
}

export async function applyConnectionsSearch() {
  const command = document.getElementById('connections-command')?.value || document.getElementById('connections-search')?.value || '';
  const source = document.getElementById('connections-source-filter')?.value || 'all';
  await openConnectionsCategory(source === 'all' ? 'supabase' : source, command || 'Memórias');
}

export async function openConnectionsCategory(source, label) {
  const escapeHtml = window.escapeHtml || (s => s);
  const capitalize = window.capitalize || (s => String(s).charAt(0).toUpperCase() + String(s).slice(1));
  const executeToolCallRaw = window.executeToolCallRaw || (async () => null);
  const conversations = window.conversations || [];

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
      result = await executeToolCallRaw('notion_search_pages', { query: 'Sessões', limit: 10 });
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

export function renderConnectionsTable(source, label, result) {
  const escapeHtml = window.escapeHtml || (s => s);
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

export function renderConnectionsDetail(source, label, rowIndex = 0, result = null) {
  const escapeHtml = window.escapeHtml || (s => s);
  const capitalize = window.capitalize || (s => String(s).charAt(0).toUpperCase() + String(s).slice(1));
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

export function extractConnectionsRows(result, source, label) {
  const normalizeSummaryText = window.normalizeSummaryText || (s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 180));
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
