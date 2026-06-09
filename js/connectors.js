/**
 * MÓDULO: connectors.js
 * RESPONSABILIDADE: Conectores para Supabase, Notion, Brave Search e n8n com autenticação e APIs
 * DEPENDÊNCIAS: utils.js
 * EXPORTA: supabaseHeaders, memorySupabaseHeaders, notionHeaders, getOpenAIKey, getAnthropicKey, loadConnections, editConnection, saveConnection, deleteConnection, getVaultRows, getVaultValueById, findVaultValue, findN8nBaseUrl, getBraveSearchKey, normalizeBraveResults, braveWebSearch, parseMcpSse, callN8nMcp, getN8nWorkflowsViaMcp, formatN8nWorkflowSnapshot, getNotionSnapshot, extractNotionPageId, searchNotionPages, listNotionChildren, findNotionPageByTitle, getN8nSnapshot, getConnectorContextForMessage, richTextToPlain, getPageTitle, getBlockPlainText, notionTextBlock, notionContentBlocks, createNotionPage, loadPageText, loadSavedSessions, loadNotionProjects
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: utils.js; credenciais reais devem vir de .env local e Vault Supabase
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// CONNECTORS
// ============================================

function getRuntimeEnv(name) {
  return typeof process !== 'undefined' && process.env ? String(process.env[name] || '').trim() : '';
}

function getRequiredRuntimeEnv(name) {
  const value = getRuntimeEnv(name);
  if (!value) throw new Error(`Configuracao obrigatoria ausente: ${name}`);
  return value;
}

const SUPABASE_URL = getRequiredRuntimeEnv('WORION_VAULT_SUPABASE_URL');
const SUPABASE_SERVICE_KEY = getRequiredRuntimeEnv('WORION_VAULT_SUPABASE_SERVICE_KEY');
const MEMORY_SUPABASE_URL = getRequiredRuntimeEnv('WORION_MEMORY_SUPABASE_URL');
const MEMORY_SUPABASE_ANON_KEY = getRequiredRuntimeEnv('WORION_MEMORY_SUPABASE_ANON_KEY');
const MEMORY_CONVERSATIONS_TABLE = 'worion_memory_conversations';
const NOTION_PARENT_PAGE_ID = getRequiredRuntimeEnv('WORION_NOTION_PARENT_PAGE_ID');
const NOTION_VERSION = '2022-06-28';
let n8nMcpUnauthorizedForSession = false;

function supabaseHeaders(extra = {}) {
  return {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    ...extra
  };
}

function memorySupabaseHeaders(extra = {}) {
  return {
    'apikey': MEMORY_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${MEMORY_SUPABASE_ANON_KEY}`,
    ...extra
  };
}

async function getNotionToken() {
  const byId = await getVaultValueById(44);
  if (byId) return byId;

  const rows = await getVaultRows('notion');
  const token = findVaultValue(rows, ['api_key', 'token', 'notion_token', 'value']);
  if (!token) throw new Error('Notion token nao encontrado na Vault Supabase (provider=notion).');
  return token;
}

async function notionHeaders() {
  return {
    'Authorization': `Bearer ${await getNotionToken()}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION
  };
}

async function getOpenAIKey() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/api_keys_vault_v2?provider=eq.openai&select=value&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase error: ${response.status}`);
  }

  const data = await response.json();
  if (data.length === 0) {
    throw new Error('OpenAI key não encontrada no Supabase');
  }

  return data[0].value;
}

async function getAnthropicKey() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/api_keys_vault_v2?provider=eq.claude.ai&select=value&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase error: ${response.status}`);
  }

  const data = await response.json();
  if (data.length === 0) {
    throw new Error('Anthropic key não encontrada no Supabase');
  }

  return data[0].value;
}

async function getDeepSeekKey() {
  const byId = await getVaultValueById(43);
  if (byId) return byId;

  const rows = await getVaultRows('deepseek');
  const byProvider = findVaultValue(rows, ['api_key', 'deepseek_api_key', 'token', 'value']);
  if (byProvider) return byProvider;

  throw new Error('DeepSeek key nao encontrada no Supabase');
}

async function loadConnections() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/api_keys_vault_v2?select=*&order=provider.asc,key.asc`, {
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    throw new Error(`Supabase error: ${response.status}`);
  }

  return await response.json();
}

function editConnection(id) {
  const item = connections.find(conn => conn.id === id);
  if (!item) return;

  editingConnectionId = id;
  document.getElementById('conn-provider').value = item.provider || '';
  document.getElementById('conn-key').value = item.key || '';
  document.getElementById('conn-store').value = item.store || '';
  document.getElementById('conn-value').value = item.value || '';
}

async function saveConnection() {
  const provider = document.getElementById('conn-provider').value.trim();
  const key = document.getElementById('conn-key').value.trim();
  const store = document.getElementById('conn-store').value.trim();
  const value = document.getElementById('conn-value').value.trim();

  if (!provider || !key || !value) {
    alert('Provider, key e value sao obrigatorios.');
    return;
  }

  const payload = {
    provider,
    key,
    value,
    store: store || null,
    updated_at: new Date().toISOString()
  };

  const url = editingConnectionId
    ? `${SUPABASE_URL}/rest/v1/api_keys_vault_v2?id=eq.${editingConnectionId}`
    : `${SUPABASE_URL}/rest/v1/api_keys_vault_v2`;

  const response = await fetch(url, {
    method: editingConnectionId ? 'PATCH' : 'POST',
    headers: supabaseHeaders({
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    alert(`Erro ao salvar conexao: ${error}`);
    return;
  }

  editingConnectionId = null;
  document.getElementById('conn-provider').value = '';
  document.getElementById('conn-key').value = '';
  document.getElementById('conn-store').value = '';
  document.getElementById('conn-value').value = '';
  await loadConnectionsIntoView();
}

async function deleteConnection(id) {
  const item = connections.find(conn => conn.id === id);
  if (!item) return;

  if (!confirm(`Remover a key "${item.key}" de "${item.provider}"?`)) return;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/api_keys_vault_v2?id=eq.${id}`, {
    method: 'DELETE',
    headers: supabaseHeaders()
  });

  if (!response.ok) {
    const error = await response.text();
    alert(`Erro ao remover conexao: ${error}`);
    return;
  }

  await loadConnectionsIntoView();
}

async function getVaultRows(provider) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/api_keys_vault_v2?provider=eq.${encodeURIComponent(provider)}&select=provider,key,store,value`, {
    headers: supabaseHeaders()
  });
  if (!response.ok) throw new Error(`Supabase vault error: ${response.status}`);
  return await response.json();
}

async function getVaultValueById(id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/api_keys_vault_v2?id=eq.${encodeURIComponent(id)}&select=id,provider,key,store,value&limit=1`, {
    headers: supabaseHeaders()
  });
  if (!response.ok) throw new Error(`Supabase vault id error: ${response.status}`);
  const rows = await response.json();
  return rows[0]?.value || null;
}

function findVaultValue(rows, keys) {
  const normalizedKeys = keys.map(k => k.toLowerCase());
  const row = rows.find(item => normalizedKeys.includes(String(item.key || '').trim().toLowerCase()));
  return row?.value || null;
}

function findN8nBaseUrl(rows) {
  const urlKeys = ['base_url', 'base_ur', 'url', 'host'];
  const row = rows.find(item => urlKeys.includes(String(item.key || '').trim().toLowerCase()));
  const candidates = [row?.value, row?.store].filter(Boolean);
  return candidates.find(value => /^https?:\/\//i.test(String(value).trim())) || null;
}

async function getBraveSearchKey() {
  const byId = await getVaultValueById(21);
  if (byId) return byId;

  const rows = await getVaultRows('brave');
  return findVaultValue(rows, ['api_key', 'token']);
}

async function getTavilySearchKey() {
  const rows = await getVaultRows('tavily');
  return findVaultValue(rows, ['api_key', 'token', 'value']);
}

function normalizeBraveResults(results = []) {
  return results.map(item => ({
    title: item.title || '',
    url: item.url || '',
    description: item.description || '',
    age: item.age || '',
    language: item.language || '',
    familyFriendly: item.family_friendly
  }));
}

function normalizeTavilyResults(results = []) {
  return results.map(item => ({
    title: item.title || '',
    url: item.url || '',
    description: item.content || item.description || '',
    snippet: item.content || item.description || '',
    rawContent: item.raw_content || '',
    score: item.score,
    favicon: item.favicon || '',
    source: 'tavily'
  }));
}

async function braveWebSearch(query, options = {}) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) throw new Error('Consulta Brave Search vazia.');

  const apiKey = await getBraveSearchKey();
  if (!apiKey) throw new Error('Brave Search nao encontrado na Vault Supabase.');

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', cleanQuery);
  url.searchParams.set('count', String(Math.min(Number(options.count || 8), 20)));
  url.searchParams.set('country', options.country || 'BR');
  url.searchParams.set('search_lang', options.search_lang || 'pt-br');
  url.searchParams.set('safesearch', options.safesearch || 'moderate');
  if (options.freshness) url.searchParams.set('freshness', options.freshness);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Brave Search error ${response.status}: ${JSON.stringify(data).slice(0, 240)}`);
  }

  return {
    query: cleanQuery,
    results: normalizeBraveResults(data.web?.results || []),
    news: normalizeBraveResults(data.news?.results || []),
    discussions: normalizeBraveResults(data.discussions?.results || [])
  };
}

function normalizeTavilyTimeRange(value) {
  const map = {
    pd: 'day',
    pw: 'week',
    pm: 'month',
    py: 'year',
    d: 'day',
    w: 'week',
    m: 'month',
    y: 'year',
    day: 'day',
    week: 'week',
    month: 'month',
    year: 'year'
  };
  return map[String(value || '').trim().toLowerCase()] || '';
}

function normalizeTavilyCountry(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'brazil';
  const map = {
    br: 'brazil',
    brasil: 'brazil',
    brazil: 'brazil',
    us: 'united states',
    usa: 'united states',
    eua: 'united states',
    uk: 'united kingdom'
  };
  return map[normalized] || normalized;
}

async function tavilyWebSearch(query, options = {}) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) throw new Error('Consulta Tavily vazia.');

  const apiKey = await getTavilySearchKey();
  if (!apiKey) throw new Error('Tavily API key nao encontrada na Vault Supabase (provider=tavily).');

  const body = {
    query: cleanQuery,
    max_results: Math.min(Number(options.count || options.max_results || 8), 20),
    topic: options.topic || 'general',
    search_depth: options.search_depth || 'basic',
    include_answer: options.include_answer ?? false,
    include_raw_content: options.include_raw_content || false,
    include_favicon: true
  };
  if (body.topic === 'general') body.country = normalizeTavilyCountry(options.country || 'BR');
  const timeRange = normalizeTavilyTimeRange(options.time_range || options.freshness);
  if (timeRange) body.time_range = timeRange;
  if (Array.isArray(options.include_domains) && options.include_domains.length) body.include_domains = options.include_domains;
  if (Array.isArray(options.exclude_domains) && options.exclude_domains.length) body.exclude_domains = options.exclude_domains;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Tavily Search error ${response.status}: ${JSON.stringify(data).slice(0, 240)}`);
  }

  return {
    query: data.query || cleanQuery,
    answer: data.answer || '',
    results: normalizeTavilyResults(data.results || []),
    images: data.images || [],
    responseTime: data.response_time,
    usage: data.usage || null,
    requestId: data.request_id || '',
    source: 'tavily'
  };
}

/**
 * Extrai conteudo completo de ate 20 URLs usando o endpoint /extract do Tavily.
 * Projetado para baixa latencia e seguranca contra prompt injection.
 * @param {string[]} urls - Lista de URLs para extrair (max 20)
 * @returns {Promise<Object>} - Objeto com results contendo raw_content por URL
 */
async function tavilyExtract(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('tavilyExtract requer array de URLs nao vazio.');
  }

  const cleanUrls = urls.filter(url => typeof url === 'string' && url.trim()).slice(0, 20);
  if (cleanUrls.length === 0) throw new Error('Nenhuma URL valida para extrair.');

  const apiKey = await getTavilySearchKey();
  if (!apiKey) throw new Error('Tavily API key nao encontrada na Vault Supabase (provider=tavily).');

  const response = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ urls: cleanUrls })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Tavily Extract error ${response.status}: ${JSON.stringify(data).slice(0, 240)}`);
  }

  return {
    results: (data.results || []).map(item => ({
      url: item.url || '',
      raw_content: item.raw_content || '',
      status: item.status || 'success'
    })),
    failed_results: data.failed_results || [],
    responseTime: data.response_time,
    usage: data.usage || null,
    source: 'tavily-extract'
  };
}

function parseMcpSse(text) {
  const line = text.split('\n').find(item => item.startsWith('data: '));
  return line ? JSON.parse(line.slice(6)) : null;
}

async function callN8nMcp(baseUrl, token, method, params = {}, id = 1) {
  if (!token) {
    console.log('[N8N MCP] skipped: missing credentials');
    throw new Error('n8n MCP token ausente.');
  }
  if (n8nMcpUnauthorizedForSession) {
    console.log('[N8N MCP] unauthorized: disabled for this session');
    throw new Error('n8n MCP desativado nesta sessao por 401 anterior.');
  }
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/mcp-server/http`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });
  const text = await response.text();
  const data = parseMcpSse(text);
  if (response.status === 401) {
    n8nMcpUnauthorizedForSession = true;
    console.warn('[N8N MCP] unauthorized: disabled for this session');
  }
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `MCP error ${response.status}: ${text.slice(0, 200)}`);
  }
  return data.result;
}

async function getN8nWorkflowsViaMcp(baseUrl, token) {
  await callN8nMcp(baseUrl, token, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'worion-desktop', version: '0.1.0' }
  }, 1);

  const result = await callN8nMcp(baseUrl, token, 'tools/call', {
    name: 'search_workflows',
    arguments: { limit: 200 }
  }, 2);

  return result.structuredContent?.data || [];
}

function formatN8nWorkflowSnapshot(workflows, source) {
  const active = workflows.filter(item => item.active);
  const inactive = workflows.filter(item => !item.active);
  const lines = [
    `Fonte: ${source}. Total: ${workflows.length} workflows. Ativos: ${active.length}. Inativos: ${inactive.length}.`,
    '',
    'Ativos:',
    ...(active.length ? active.map(item => `- ${item.name || item.id} (${item.id})`) : ['- Nenhum workflow ativo encontrado.']),
    '',
    'Inativos:',
    ...inactive.map(item => `- ${item.name || item.id} (${item.id})`)
  ];
  return `O Worion leu estes workflows reais do n8n agora. Use esta lista como acesso confirmado aos workflows:\n${lines.join('\n')}`;
}

async function getNotionSnapshot() {
  try {
    const response = await fetch(`https://api.notion.com/v1/blocks/${NOTION_PARENT_PAGE_ID}/children?page_size=20`, {
      headers: await notionHeaders()
    });
    if (!response.ok) return `Notion: token configurado, mas a leitura falhou com status ${response.status}.`;
    const data = await response.json();
    const pages = (data.results || [])
      .filter(block => block.type === 'child_page')
      .map(block => `- ${block.child_page.title}`)
      .slice(0, 12);
    return pages.length
      ? `Notion: conector configurado e lendo Workestria HQ. Paginas visiveis:\n${pages.join('\n')}`
      : 'Notion: conector configurado e lendo Workestria HQ, mas nenhuma pagina filha foi encontrada.';
  } catch (error) {
    return `Notion: conector configurado, mas ocorreu erro ao ler: ${error.message}`;
  }
}

function extractNotionPageId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const uuid = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuid) return uuid[0];
  const compact = raw.match(/[0-9a-f]{32}/i);
  if (!compact) return raw;
  const id = compact[0];
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

async function searchNotionPages(query = '', limit = 10) {
  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: await notionHeaders(),
    body: JSON.stringify({
      query,
      page_size: Math.min(Number(limit || 10), 25),
      filter: { value: 'page', property: 'object' }
    })
  });
  if (!response.ok) throw new Error(`Notion search error: ${response.status}`);
  const data = await response.json();
  return (data.results || []).map(page => ({
    id: page.id,
    title: getPageTitle(page) || '(sem titulo)',
    url: page.url,
    lastEditedTime: page.last_edited_time
  }));
}

async function listNotionChildren(pageRef = NOTION_PARENT_PAGE_ID, limit = 100) {
  const pageId = extractNotionPageId(pageRef) || NOTION_PARENT_PAGE_ID;
  const items = [];
  let cursor = null;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set('page_size', String(Math.min(Number(limit || 100), 100)));
    if (cursor) url.searchParams.set('start_cursor', cursor);

    const response = await fetch(url.toString(), { headers: await notionHeaders() });
    if (!response.ok) throw new Error(`Notion children error: ${response.status}`);
    const data = await response.json();

    for (const block of data.results || []) {
      const text = getBlockPlainText(block);
      items.push({
        id: block.id,
        type: block.type,
        title: block.type === 'child_page' ? block.child_page?.title || '' : '',
        text,
        hasChildren: Boolean(block.has_children),
        createdTime: block.created_time,
        lastEditedTime: block.last_edited_time
      });
    }

    cursor = data.has_more && items.length < limit ? data.next_cursor : null;
  } while (cursor);

  return { pageId, items: items.slice(0, limit) };
}

async function findNotionPageByTitle(title) {
  const target = normalizeSearchText(title);
  const pages = await searchNotionPages(title, 25);
  return pages.find(page => normalizeSearchText(page.title) === target)
    || pages.find(page => normalizeSearchText(page.title).includes(target) || target.includes(normalizeSearchText(page.title)))
    || null;
}

async function getN8nSnapshot() {
  try {
    const rows = await getVaultRows('n8n');
    const apiKey = findVaultValue(rows, ['api_key', 'token']);
    const mcpToken = findVaultValue(rows, ['mcp_token']);
    const baseUrl = findN8nBaseUrl(rows);
    if (!baseUrl) return 'n8n: api_key encontrada na Vault, mas falta cadastrar base_url/url/host com uma URL https para listar workflows.';

    if (mcpToken) {
      if (n8nMcpUnauthorizedForSession) {
        console.log('[N8N MCP] unauthorized: disabled for this session');
        return 'n8n MCP: desativado nesta sessao apos 401. Recarregue apos corrigir o token.';
      }
      const workflows = await getN8nWorkflowsViaMcp(baseUrl, mcpToken);
      return formatN8nWorkflowSnapshot(workflows, 'MCP search_workflows');
    }

    console.log('[N8N MCP] skipped: missing credentials');
    if (!apiKey) return 'n8n: nao ha api_key configurada na Vault.';

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    if (!response.ok) return `n8n: api_key e base_url configuradas, mas /api/v1/workflows retornou ${response.status}.`;
    const data = await response.json();
    const allWorkflows = data.data || data || [];
    return allWorkflows.length
      ? formatN8nWorkflowSnapshot(allWorkflows, 'Public API /api/v1/workflows')
      : 'n8n: API conectou, mas nao retornou workflows.';
  } catch (error) {
    return `n8n: erro ao consultar conector: ${error.message}`;
  }
}

async function getConnectorContextForMessage(text) {
  if (!wantsConnectorContext(text)) return '';
  const parts = [];
  if (/notion/i.test(text)) parts.push(await getNotionSnapshot());
  if (/(n8n|workflow|workflows)/i.test(text)) parts.push(await getN8nSnapshot());
  if (/(vault|conector|conectores|api|apis)/i.test(text) && parts.length === 0) {
    const n8n = await getN8nSnapshot();
    const notion = await getNotionSnapshot();
    parts.push(notion, n8n);
  }
  return parts.join('\n\n');
}

function richTextToPlain(richText = []) {
  return richText.map(part => part.plain_text || '').join('');
}

function getPageTitle(page) {
  const props = page.properties || {};
  for (const value of Object.values(props)) {
    if (value && value.type === 'title') {
      return richTextToPlain(value.title);
    }
  }
  return '';
}

function getBlockPlainText(block) {
  const content = block[block.type];
  if (!content) return '';

  if (content.rich_text) {
    return richTextToPlain(content.rich_text);
  }

  if (block.type === 'child_page') {
    return content.title || '';
  }

  return '';
}

function notionTextBlock(text) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{
        type: 'text',
        text: { content: text }
      }]
    }
  };
}

function notionContentBlocks(content) {
  const normalized = String(content || '').trim();
  const source = normalized || `Pagina criada pelo Worion em ${formatSessionDateTime(new Date())}.`;
  return chunkText(source, 1800).slice(0, 100).map(notionTextBlock);
}

async function createNotionPage(title, content) {
  const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  if (!cleanTitle) throw new Error('Titulo da pagina Notion nao informado.');

  // Tentar API local primeiro
  if (typeof worionApiNotionCreate === 'function') {
    try {
      console.log('[NOTION CREATE] Tentando Worion API local');
      const result = await worionApiNotionCreate(cleanTitle, content);

      if (result.ok && result.page) {
        console.log('[NOTION CREATE] Worion API respondeu:', {
          id: result.page.id,
          title: result.page.title,
          hasUrl: !!result.page.url
        });

        return {
          id: result.page.id,
          url: result.page.url,
          title: result.page.title
        };
      }
    } catch (error) {
      console.warn('[NOTION CREATE] Worion API falhou, usando fallback direto:', error.message);
    }
  }

  // Fallback: chamada direta ao Notion
  console.log('[NOTION CREATE] Usando fallback direto ao Notion');
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: await notionHeaders(),
    body: JSON.stringify({
      parent: { page_id: NOTION_PARENT_PAGE_ID },
      properties: {
        title: [{ text: { content: cleanTitle } }]
      },
      children: notionContentBlocks(content)
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Notion error: ${response.status} ${JSON.stringify(data)}`);
  }

  return {
    id: data.id,
    url: data.url,
    title: cleanTitle
  };
}

async function loadPageText(pageId) {
  const lines = [];
  let cursor = null;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);

    const response = await fetch(url.toString(), { headers: await notionHeaders() });
    if (!response.ok) {
      throw new Error(`Notion blocks error: ${response.status}`);
    }

    const data = await response.json();
    for (const block of data.results || []) {
      if (block.type === 'divider') {
        lines.push('---');
        continue;
      }

      const text = getBlockPlainText(block);
      if (text) lines.push(text);
    }

    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return lines.join('\n\n');
}

async function loadSavedSessions() {
  const sessions = [];
  let cursor = null;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${NOTION_PARENT_PAGE_ID}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);

    const response = await fetch(url.toString(), { headers: await notionHeaders() });
    if (!response.ok) {
      throw new Error(`Notion children error: ${response.status}`);
    }

    const data = await response.json();
    for (const block of data.results || []) {
      if (block.type !== 'child_page') continue;

      const title = block.child_page?.title || '';
      if (!title.toLowerCase().includes('sess')) continue;

      sessions.push({
        id: block.id,
        title,
        updatedAt: block.last_edited_time || block.created_time,
        updated: new Date(block.last_edited_time || block.created_time).toLocaleString('pt-BR')
      });
    }

    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function loadNotionProjects() {
  const items = [];
  let cursor = null;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${NOTION_PARENT_PAGE_ID}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);

    const response = await fetch(url.toString(), { headers: await notionHeaders() });
    if (!response.ok) {
      throw new Error(`Notion children error: ${response.status}`);
    }

    const data = await response.json();
    for (const block of data.results || []) {
      if (block.type !== 'child_page') continue;

      const title = block.child_page?.title || '';
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('sess')) continue;
      if (lowerTitle.includes('teste codex')) continue;

      items.push({
        id: block.id,
        title,
        updatedAt: block.last_edited_time || block.created_time,
        updated: new Date(block.last_edited_time || block.created_time).toLocaleString('pt-BR')
      });
    }

    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}
