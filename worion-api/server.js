const http = require('http');
const { selectModelForMessage, isModelRouterEnabled } = require('../js/model-router');

const DEFAULT_PORT = Number(process.env.WORION_API_PORT || 3766);
const MAX_JSON_PAYLOAD_BYTES = 1024 * 1024;
const PROVIDER_TIMEOUT_MS = Number(process.env.WORION_PROVIDER_TIMEOUT_MS || 45000);
const NOTION_VERSION = '2022-06-28';
const MEMORY_TABLES = new Set([
  'context_memory_cards',
  'context_memory_sources',
  'active_context_memory_cards',
  'memory_conversations',
  'memory_chunks'
]);
const MEMORY_AUDIT_TABLES = [
  'memory_conversations',
  'memory_chunks',
  'memory_sources',
  'context_memory_cards',
  'context_memory_sources',
  'active_context_memory_cards',
  'memory_files',
  'memory_contexts',
  'memory_context_files',
  'memory_cards_v2',
  'memory_card_sources_v2',
  'conversation_memory_bindings',
  'memory_card_events'
];
const MEMORY_CARDS_V2_MIGRATION_FILE = 'artifacts/migrations/memory-cards-v2-20260527.sql';
const MEMORY_CLASSIFICATION_SURFACE_FIELDS = [
  'metadata',
  'status',
  'domain',
  'context_id',
  'context_slug',
  'source_type',
  'tags',
  'type',
  'keywords'
];
const MEMORY_EXPLICIT_CLASSIFICATION_FIELDS = [
  'domain',
  'context_id',
  'context_slug',
  'source_type',
  'tags'
];
const MEMORY_CARD_TABLES = new Set(['context_memory_cards', 'memory_cards_v2']);
const MEMORY_NON_CONTENT_TABLES = new Set(['active_context_memory_cards', 'conversation_memory_bindings', 'memory_card_events']);
const MEMORY_PRIMARY_CONTEXT_TABLES = new Set([
  'memory_conversations',
  'memory_chunks',
  'context_memory_cards',
  'context_memory_sources'
]);
const MEMORY_OPTIONAL_V2_TABLES = new Set([
  'memory_files',
  'memory_contexts',
  'memory_context_files',
  'memory_cards_v2',
  'memory_card_sources_v2',
  'conversation_memory_bindings',
  'memory_card_events'
]);
const MEMORY_CARDS_V2_EXPECTED_SCHEMAS = {
  memory_files: [
    'id',
    'title',
    'slug',
    'file_type',
    'content_format',
    'raw_content',
    'normalized_content',
    'source_origin',
    'source_ref',
    'checksum',
    'metadata',
    'created_at',
    'updated_at'
  ],
  memory_contexts: [
    'id',
    'title',
    'slug',
    'domain',
    'description',
    'inclusion_rules',
    'exclusion_rules',
    'status',
    'confidence_score',
    'metadata',
    'created_at',
    'updated_at'
  ],
  memory_context_files: [
    'id',
    'context_id',
    'file_id',
    'relation_type',
    'relevance_score',
    'inclusion_reason',
    'exclusion_reason',
    'metadata',
    'created_at'
  ],
  memory_cards_v2: [
    'id',
    'context_id',
    'title',
    'slug',
    'summary',
    'domain',
    'status',
    'card_scope',
    'inclusion_rules',
    'exclusion_rules',
    'allowed_actions',
    'confidence_score',
    'metadata',
    'created_at',
    'updated_at'
  ],
  memory_card_sources_v2: [
    'id',
    'card_id',
    'file_id',
    'chunk_id',
    'source_table',
    'source_ref',
    'source_role',
    'relevance_score',
    'metadata',
    'created_at'
  ],
  conversation_memory_bindings: [
    'id',
    'conversation_id',
    'card_id',
    'context_id',
    'binding_mode',
    'created_by',
    'created_at',
    'expires_at',
    'metadata'
  ],
  memory_card_events: [
    'id',
    'card_id',
    'context_id',
    'conversation_id',
    'event_type',
    'event_payload',
    'created_at'
  ]
};
const MEMORY_DOMAINS = [
  'technical',
  'product',
  'operational',
  'session_history',
  'external_research',
  'profile',
  'health_routine',
  'spiritual_reflective',
  'unknown'
];
const MEMORY_DOMAIN_PATTERNS = {
  technical: /\b(api|codigo|code|javascript|typescript|node|electron|supabase|postgres|sql|backend|frontend|router|prompt|llm|mcp|erro|bug|deploy|git|docker|schema|migration)\b/i,
  product: /\b(produto|feature|funcionalidade|roadmap|ux|ui|interface|usuario|cliente|fluxo|card|cards|workspace|app)\b/i,
  operational: /\b(operacional|processo|rotina|workflow|execucao|validacao|auditoria|tarefa|plano|prioridade|handoff|retomada)\b/i,
  session_history: /\b(sessao|session|conversa|chat|retomada|historico|mensagem|transcricao|claude|chatgpt|gpt)\b/i,
  external_research: /\b(pesquisa|research|fonte|referencia|artigo|paper|web|brave|tavily|google|notion|site|url|http)\b/i,
  profile: /\b(perfil|preferencia|usuario|eu gosto|meu jeito|minha rotina|personalidade|objetivo pessoal)\b/i,
  health_routine: /\b(saude|sono|dieta|treino|exercicio|medicacao|tdah|ansiedade|energia|rotina fisica)\b/i,
  spiritual_reflective: /\b(espiritual|reflexao|meditacao|bashar|hermetismo|filosofia|sentido|consciencia|emocional)\b/i
};
const MEMORY_CONTEXT_CANDIDATE_TABLES = [
  'memory_conversations',
  'memory_chunks',
  'context_memory_cards',
  'context_memory_sources'
];
const MEMORY_CONTEXT_CANDIDATE_PROFILES = [
  {
    title: 'Runtime Facts e Introspeccao de Modelo',
    slug: 'runtime-facts-introspeccao-modelo',
    domain: 'technical',
    description: 'Contexto para fatos de runtime, introspeccao do modelo, provider usado e guardrails de resposta sobre identidade/modelo.',
    patterns: [
      /\bruntimeMetadata\b/i,
      /\blastAssistantRuntimeFacts\b/i,
      /\bmodel router\b/i,
      /\bprovider\b.*\bmodel\b/i,
      /\bmodelo usado\b/i,
      /\bintrospec/i,
      /\bguardrail\b.*\bmodelo\b/i
    ],
    inclusionRules: [
      'inclui runtimeMetadata',
      'inclui lastAssistantRuntimeFacts',
      'inclui model router',
      'inclui provider/model used',
      'inclui guardrail de introspeccao',
      'inclui respostas sobre modelo usado'
    ],
    exclusionRules: [
      'exclui pesquisa factual generica',
      'exclui Memory Cards',
      'exclui Notion Create',
      'exclui espiritualidade',
      'exclui e-commerce'
    ]
  },
  {
    title: 'Memory Cards / Context Memory',
    slug: 'memory-cards-context-memory',
    domain: 'technical',
    description: 'Contexto para arquitetura de Memory Cards, Context Memory, classificacao de memorias, selecao explicita e vinculos conversa-memoria.',
    patterns: [
      /\bmemory cards?\b/i,
      /\bcontext memory\b/i,
      /\bcontext_memory_cards\b/i,
      /\bmemory_contexts\b/i,
      /\bmemory_cards_v2\b/i,
      /\/memory\b/i,
      /\bvinculos?\b.*\bmemoria\b/i,
      /\bconversation_memory_bindings\b/i,
      /\bclassifica[cç][aã]o\b.*\bmem[oó]rias?\b/i
    ],
    inclusionRules: [
      'inclui context_memory_cards',
      'inclui memory_contexts',
      'inclui classificacao de memorias',
      'inclui /memory',
      'inclui vinculos conversa-memoria'
    ],
    exclusionRules: [
      'exclui model router',
      'exclui Notion publicacao',
      'exclui pesquisa externa',
      'exclui produto/e-commerce'
    ]
  },
  {
    title: 'Notion Fetch/Create via API Local',
    slug: 'notion-fetch-create-api-local',
    domain: 'operational',
    description: 'Contexto para leitura e criacao de paginas Notion via API local, com comando explicito e confirmacao de ferramenta.',
    patterns: [
      /\bnotion\b.*\bfetch\b/i,
      /\bnotion\b.*\bcreate\b/i,
      /\bapi local\b.*\bnotion\b/i,
      /\bworionApiNotion/i,
      /\bcria[rc]?\b.*\bpagina\b.*\bnotion\b/i,
      /\bsalv[ae]\b.*\bnotion\b/i
    ],
    inclusionRules: [
      'inclui Notion Fetch',
      'inclui Notion Create',
      'inclui API local como fronteira de seguranca',
      'inclui publicacao sob comando explicito'
    ],
    exclusionRules: [
      'exclui autosave passivo',
      'exclui memoria principal',
      'exclui Memory Cards V2',
      'exclui pesquisa factual generica'
    ]
  },
  {
    title: 'Command Intent Gate e Execucao Deterministica',
    slug: 'command-intent-gate-execucao-deterministica',
    domain: 'operational',
    description: 'Contexto para comandos explicitos interceptados antes de LLM, memoria, pesquisa ou roteamento.',
    patterns: [
      /\bcommand intent gate\b/i,
      /\bexecu[cç][aã]o determin/i,
      /\bdeterministic/i,
      /\bcomando explicito\b/i,
      /\bintercepta\b.*\bcomando\b/i,
      /\bantes de LLM\b/i
    ],
    inclusionRules: [
      'inclui Command Intent Gate',
      'inclui comandos explicitos',
      'inclui execucao deterministica',
      'inclui encerramento de pipeline apos ferramenta confirmada'
    ],
    exclusionRules: [
      'exclui conversa aberta sem comando',
      'exclui criacao automatica de memoria',
      'exclui pesquisa externa sem pedido'
    ]
  },
  {
    title: 'Pesquisa Factual e Evidence Pack',
    slug: 'pesquisa-factual-evidence-pack',
    domain: 'external_research',
    description: 'Contexto para pesquisa factual, coleta de evidencias, web search e fontes externas.',
    patterns: [
      /\bevidence pack\b/i,
      /\bpesquisa factual\b/i,
      /\bbrave\b/i,
      /\btavily\b/i,
      /\bweb search\b/i,
      /\bfonte[s]?\b.*\bcita/i,
      /\brefer[eê]ncias?\b/i
    ],
    inclusionRules: [
      'inclui pesquisa factual',
      'inclui evidence pack',
      'inclui fontes externas',
      'inclui Brave/Tavily quando citados'
    ],
    exclusionRules: [
      'exclui memoria interna sem fonte externa',
      'exclui Notion Create',
      'exclui runtime facts'
    ]
  },
  {
    title: 'Worion API Local',
    slug: 'worion-api-local',
    domain: 'technical',
    description: 'Contexto para backend local do Worion, endpoints HTTP, seguranca de chaves e fronteira entre renderer e servicos externos.',
    patterns: [
      /\bworion api\b/i,
      /\bapi local\b/i,
      /\/api\/chat\/messages\b/i,
      /\/api\/memory\b/i,
      /\bbackend local\b/i,
      /\bfronteira de seguran[cç]a\b/i,
      /\bsegredos?\b.*\bbackend\b/i
    ],
    inclusionRules: [
      'inclui Worion API local',
      'inclui endpoints /api',
      'inclui chaves sensiveis no backend',
      'inclui fronteira renderer-backend'
    ],
    exclusionRules: [
      'exclui UI visual',
      'exclui Notion como produto final',
      'exclui cards ativos'
    ]
  },
  {
    title: 'UI/UX e Composer do Worion',
    slug: 'ui-ux-composer-worion',
    domain: 'product',
    description: 'Contexto para interface, composer, sidebar, experiencia do usuario e componentes visuais do Worion.',
    patterns: [
      /\bui\/ux\b/i,
      /\bcomposer\b/i,
      /\bsidebar\b/i,
      /\brenderer\b/i,
      /\binterface\b/i,
      /\bexperi[eê]ncia do usu[aá]rio\b/i,
      /\bfrontend\b/i
    ],
    inclusionRules: [
      'inclui UI/UX do Worion',
      'inclui composer',
      'inclui sidebar',
      'inclui renderer/frontend'
    ],
    exclusionRules: [
      'exclui backend puro',
      'exclui pesquisa factual',
      'exclui espiritualidade'
    ]
  },
  {
    title: 'Puppila / E-commerce / Produto',
    slug: 'puppila-ecommerce-produto',
    domain: 'product',
    description: 'Contexto para Puppila, e-commerce, produto, loja, catalogo e operacao comercial relacionada.',
    patterns: [
      /\bpuppila\b/i,
      /\be-?commerce\b/i,
      /\bshopify\b/i,
      /\bloja\b/i,
      /\bproduto\b/i,
      /\bcat[aá]logo\b/i,
      /\bvenda[s]?\b/i
    ],
    inclusionRules: [
      'inclui Puppila',
      'inclui e-commerce',
      'inclui produto/loja/catalogo',
      'inclui Shopify quando relacionado'
    ],
    exclusionRules: [
      'exclui Memory Cards',
      'exclui runtime/model router',
      'exclui espiritualidade'
    ]
  },
  {
    title: 'Perfil Operacional do Usuario',
    slug: 'perfil-operacional-usuario',
    domain: 'profile',
    description: 'Contexto para preferencias operacionais, modo de trabalho, continuidade, decisoes pessoais e perfil de uso do Worion.',
    patterns: [
      /\bperfil operacional\b/i,
      /\bprefer[eê]ncias?\b/i,
      /\bmodo de trabalho\b/i,
      /\bmeu jeito\b/i,
      /\bcontinuidade\b/i,
      /\bdecis[oõ]es pessoais\b/i,
      /\busuario\b.*\bprefere\b/i
    ],
    inclusionRules: [
      'inclui preferencias operacionais do usuario',
      'inclui modo de trabalho',
      'inclui continuidade entre sessoes',
      'inclui decisoes pessoais de configuracao'
    ],
    exclusionRules: [
      'exclui dados tecnicos sem preferencia do usuario',
      'exclui conteudo de saude sem rotina operacional',
      'exclui fontes externas genericas'
    ]
  },
  {
    title: 'Espiritualidade / Sonhos / Hermetismo',
    slug: 'espiritualidade-sonhos-hermetismo',
    domain: 'spiritual_reflective',
    description: 'Contexto para espiritualidade, sonhos, hermetismo, Bashar, reflexoes e temas simbolicos.',
    patterns: [
      /\bespiritual/i,
      /\bsonhos?\b/i,
      /\bhermetismo\b/i,
      /\bbashar\b/i,
      /\bmedita[cç][aã]o\b/i,
      /\breflex[aã]o\b/i,
      /\bconsciencia\b/i
    ],
    inclusionRules: [
      'inclui espiritualidade',
      'inclui sonhos',
      'inclui hermetismo',
      'inclui Bashar',
      'inclui reflexoes simbolicas'
    ],
    exclusionRules: [
      'exclui Worion API',
      'exclui Memory Cards tecnicos',
      'exclui e-commerce'
    ]
  }
];

const MEMORY_CANONICAL_CONTEXTS = [
  ...MEMORY_CONTEXT_CANDIDATE_PROFILES,
  {
    title: 'Workestria / Produto e SaaS',
    slug: 'workestria-produto-saas',
    domain: 'product',
    description: 'Contexto para Workestria, produto, SaaS, operacao, posicionamento e roadmap.',
    inclusionRules: ['inclui Workestria', 'inclui produto SaaS', 'inclui roadmap e operacao'],
    exclusionRules: ['exclui Worion tecnico', 'exclui espiritualidade', 'exclui saude pessoal']
  },
  {
    title: 'Saude / Rotina / Energia',
    slug: 'saude-rotina-energia',
    domain: 'health_routine',
    description: 'Contexto para saude, rotina, energia, sono, TDAH, ansiedade e autocuidado.',
    inclusionRules: ['inclui saude', 'inclui TDAH quando nao houver override espiritual', 'inclui rotina e energia'],
    exclusionRules: ['exclui protocolos medicos como verdade clinica', 'exclui espiritualidade quando regra explicita mandar para espiritualidade']
  },
  {
    title: 'Sessoes e Handoffs',
    slug: 'sessoes-handoffs',
    domain: 'session_history',
    description: 'Contexto para retomadas, handoffs, historico de sessoes e continuidade operacional.',
    inclusionRules: ['inclui retomadas', 'inclui handoffs', 'inclui historico de decisoes'],
    exclusionRules: ['exclui conteudo tematico que tenha contexto mais especifico']
  },
  {
    title: 'A revisar',
    slug: 'a-revisar',
    domain: 'unknown',
    description: 'Fila de triagem para material que ainda nao tem contexto confiavel.',
    inclusionRules: ['inclui conteudo ambiguo', 'inclui importacoes sem classificacao clara'],
    exclusionRules: ['exclui conteudo que casa com regra explicita do usuario']
  }
];

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function getHttpErrorStatus(error) {
  if (Number.isInteger(error?.statusCode)) return error.statusCode;
  if (error?.message === 'JSON invalido.') return 400;
  if (error?.message === 'Payload muito grande.') return 413;
  return 500;
}

function getMessageContentLength(message = {}) {
  const content = message.content;
  if (typeof content === 'string') return content.length;
  if (Array.isArray(content)) {
    return content.reduce((total, part) => {
      if (!part) return total;
      if (typeof part === 'string') return total + part.length;
      return total + String(part.text || part.content || '').length;
    }, 0);
  }
  return content ? JSON.stringify(content).length : 0;
}

function getChatPayloadDiagnostics(payload = {}) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const messageChars = messages.reduce((total, message) => total + getMessageContentLength(message), 0);
  return {
    model: payload.model || null,
    messagesCount: messages.length,
    messageChars,
    approxTokens: Math.ceil(messageChars / 4),
    options: {
      max_tokens: payload.options?.max_tokens || payload.options?.max_completion_tokens || null,
      hasTools: Array.isArray(payload.options?.tools) && payload.options.tools.length > 0
    }
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(`Provider timeout after ${timeoutMs}ms`);
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_JSON_PAYLOAD_BYTES) {
        const error = new Error('Payload muito grande.');
        error.statusCode = 413;
        reject(error);
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON invalido.'));
      }
    });
    req.on('error', reject);
  });
}

function buildTenantContext(payload = {}) {
  return {
    tenant_id: payload.tenant_id || 'local',
    user_id: payload.user_id || 'local-user',
    workspace_id: payload.workspace_id || 'local-workspace'
  };
}

function getRuntimeEnv(name) {
  return String(process.env[name] || '').trim();
}

function getRequiredRuntimeEnv(name) {
  const value = getRuntimeEnv(name);
  if (!value) throw new Error(`Configuracao obrigatoria ausente: ${name}`);
  return value;
}

function getMemorySupabaseConfig() {
  const url = getRuntimeEnv('WORION_MEMORY_SUPABASE_URL').replace(/\/$/, '');
  const key = getRuntimeEnv('WORION_MEMORY_SUPABASE_ANON_KEY');
  if (!url || !key) throw new Error('WORION_MEMORY_SUPABASE_URL/ANON_KEY indisponiveis');
  return { url, key };
}

async function getAnthropicKeyFromVault() {
  const vaultConfig = getVaultSupabaseConfig();
  const response = await fetch(`${vaultConfig.url}/rest/v1/api_keys_vault_v2?provider=eq.claude.ai&select=value&limit=1`, {
    headers: {
      'apikey': vaultConfig.key,
      'Authorization': `Bearer ${vaultConfig.key}`
    }
  });
  if (!response.ok) throw new Error(`Vault error: ${response.status}`);
  const data = await response.json();
  if (!data || !data[0] || !data[0].value) throw new Error('Anthropic API key not found in vault');
  return data[0].value;
}

function getVaultSupabaseConfig() {
  const url = getRequiredRuntimeEnv('WORION_VAULT_SUPABASE_URL').replace(/\/$/, '');
  const key = getRequiredRuntimeEnv('WORION_VAULT_SUPABASE_SERVICE_KEY');
  return { url, key };
}

function memorySupabaseHeaders(extra = {}) {
  const { key } = getMemorySupabaseConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function vaultSupabaseHeaders(extra = {}) {
  const { key } = getVaultSupabaseConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

function assertAllowedMemoryTable(table) {
  if (!MEMORY_TABLES.has(table) && !MEMORY_AUDIT_TABLES.includes(table)) throw new Error(`Tabela nao permitida: ${table}`);
}

function normalizePlainText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNotionUrl(text) {
  return String(text || '').match(/https?:\/\/(?:[\w-]+\.)?(?:notion\.so|notion\.site)\/\S+/i)?.[0]?.replace(/[).,;]+$/, '') || '';
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

function notionPageUrlFromId(id) {
  return `https://www.notion.so/${String(id || '').replace(/-/g, '')}`;
}

function richTextToPlain(richText = []) {
  return richText.map(part => part.plain_text || '').join('');
}

function getPageTitle(page) {
  const props = page.properties || {};
  for (const value of Object.values(props)) {
    if (value && value.type === 'title') return richTextToPlain(value.title);
  }
  return '';
}

function getBlockPlainText(block) {
  const content = block[block.type];
  if (!content) return '';
  if (content.rich_text) return richTextToPlain(content.rich_text);
  if (block.type === 'child_page') return content.title || '';
  return '';
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pt-BR');
}

function formatNotionReadSource(pagesWithContent = []) {
  return pagesWithContent.map((page, index) => [
    `# ${index + 1}. ${page.title}`,
    page.updatedAt ? `Atualizada em: ${formatDateTime(page.updatedAt)}` : 'Atualizada em: data indisponivel',
    `Link: ${page.url}`,
    '',
    page.content || '[Sem texto extraido pela API]'
  ].join('\n')).join('\n\n---\n\n');
}

function getRequestedNotionSessionCount(text) {
  const raw = normalizePlainText(text);
  const numeric = raw.match(/\b(\d{1,2})\s+(?:ultimas?|primeiras?|sessoes|paginas)\b/i);
  if (numeric) return Math.max(1, Math.min(10, Number(numeric[1])));
  if (/\btres\b|\b3\b/i.test(raw)) return 3;
  if (/\bduas\b|\b2\b/i.test(raw)) return 2;
  if (/\buma\b|\b1\b/i.test(raw)) return 1;
  return /\bultimas?\b/i.test(raw) ? 3 : 5;
}

async function getVaultRows(provider) {
  const { url: base } = getVaultSupabaseConfig();
  const url = new URL(`${base}/rest/v1/api_keys_vault_v2`);
  url.searchParams.set('provider', `eq.${provider}`);
  url.searchParams.set('select', 'provider,key,store,value');
  const response = await fetch(url.toString(), { headers: vaultSupabaseHeaders() });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase vault error ${response.status}: ${text.slice(0, 180)}`);
  return JSON.parse(text || '[]');
}

async function getVaultValueById(id) {
  const { url: base } = getVaultSupabaseConfig();
  const url = new URL(`${base}/rest/v1/api_keys_vault_v2`);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('select', 'id,provider,key,store,value');
  url.searchParams.set('limit', '1');
  const response = await fetch(url.toString(), { headers: vaultSupabaseHeaders() });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase vault id error ${response.status}: ${text.slice(0, 180)}`);
  return JSON.parse(text || '[]')[0]?.value || null;
}

function findVaultValue(rows, keys) {
  const normalizedKeys = keys.map(key => key.toLowerCase());
  const row = rows.find(item => normalizedKeys.includes(String(item.key || '').trim().toLowerCase()));
  return row?.value || null;
}

async function getOpenAIKey() {
  const fromEnv = getRuntimeEnv('WORION_OPENAI_KEY');
  if (fromEnv) return fromEnv;
  const rows = await getVaultRows('openai');
  const key = findVaultValue(rows, ['api_key', 'key', 'openai_key', 'value']);
  if (!key) throw new Error('OpenAI key nao encontrada na Vault Supabase (provider=openai).');
  return key;
}

async function getDeepSeekKey() {
  const fromEnv = getRuntimeEnv('WORION_DEEPSEEK_KEY');
  if (fromEnv) return fromEnv;
  const byId = await getVaultValueById(43);
  if (byId) return byId;
  const rows = await getVaultRows('deepseek');
  const key = findVaultValue(rows, ['api_key', 'deepseek_api_key', 'key', 'value']);
  if (!key) throw new Error('DeepSeek key nao encontrada na Vault Supabase (provider=deepseek).');
  return key;
}

async function getAnthropicKey() {
  const fromEnv = getRuntimeEnv('WORION_ANTHROPIC_KEY');
  if (fromEnv) return fromEnv;
  const rows = await getVaultRows('claude.ai');
  const key = findVaultValue(rows, ['api_key', 'key', 'anthropic_key', 'value']);
  if (!key) throw new Error('Anthropic key nao encontrada na Vault Supabase (provider=claude.ai).');
  return key;
}

async function getNotionToken() {
  const fromEnv = getRuntimeEnv('WORION_NOTION_TOKEN');
  if (fromEnv) return fromEnv;
  const byId = await getVaultValueById(44);
  if (byId) return byId;
  const rows = await getVaultRows('notion');
  const token = findVaultValue(rows, ['api_key', 'token', 'notion_token', 'value']);
  if (!token) throw new Error('Notion token nao encontrado na Vault Supabase (provider=notion).');
  return token;
}

async function notionHeaders() {
  return {
    Authorization: `Bearer ${await getNotionToken()}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION
  };
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
  const text = await response.text();
  if (!response.ok) throw new Error(`Notion search error ${response.status}: ${text.slice(0, 180)}`);
  const data = JSON.parse(text || '{}');
  return (data.results || []).map(page => ({
    id: page.id,
    title: getPageTitle(page) || '(sem titulo)',
    url: page.url,
    lastEditedTime: page.last_edited_time
  }));
}

async function listNotionChildren(pageRef, limit = 100) {
  const pageId = extractNotionPageId(pageRef) || getRequiredRuntimeEnv('WORION_NOTION_PARENT_PAGE_ID');
  const items = [];
  let cursor = null;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set('page_size', String(Math.min(Number(limit || 100), 100)));
    if (cursor) url.searchParams.set('start_cursor', cursor);
    const response = await fetch(url.toString(), { headers: await notionHeaders() });
    const text = await response.text();
    if (!response.ok) throw new Error(`Notion children error ${response.status}: ${text.slice(0, 180)}`);
    const data = JSON.parse(text || '{}');
    for (const block of data.results || []) {
      items.push({
        id: block.id,
        type: block.type,
        title: block.type === 'child_page' ? block.child_page?.title || '' : '',
        text: getBlockPlainText(block),
        hasChildren: Boolean(block.has_children),
        createdTime: block.created_time,
        lastEditedTime: block.last_edited_time
      });
    }
    cursor = data.has_more && items.length < limit ? data.next_cursor : null;
  } while (cursor);

  return { pageId, items: items.slice(0, limit) };
}

async function loadPageText(pageId) {
  const lines = [];
  let cursor = null;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);
    const response = await fetch(url.toString(), { headers: await notionHeaders() });
    const text = await response.text();
    if (!response.ok) throw new Error(`Notion blocks error ${response.status}: ${text.slice(0, 180)}`);
    const data = JSON.parse(text || '{}');
    for (const block of data.results || []) {
      if (block.type === 'divider') {
        lines.push('---');
        continue;
      }
      const plain = getBlockPlainText(block);
      if (plain) lines.push(plain);
    }
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return lines.join('\n\n');
}

function getModelProvider(modelId) {
  const normalized = String(modelId || '').toLowerCase();
  if (normalized.includes('deepseek')) return 'deepseek';
  if (normalized.includes('claude') || normalized.includes('anthropic')) return 'anthropic';
  if (normalized.includes('gpt') || normalized.includes('openai')) return 'openai';
  return 'deepseek';
}

function isOpenAIResponsesModel(model = '') {
  const normalized = String(model || '').toLowerCase().replace(/\s+/g, '-');
  return /^gpt-5\.[45](?:-|$)/i.test(normalized) || normalized === 'gpt-5.5';
}

function getOpenAIReasoningEffort(model = '', options = {}) {
  if (options.reasoningEffort || options.reasoning_effort) {
    return options.reasoningEffort || options.reasoning_effort;
  }
  return String(model || '').toLowerCase().includes('gpt-5.5') ? 'medium' : '';
}

function getResponsesInputText(content) {
  if (typeof content === 'string') return content;
  if (!content) return '';
  if (Array.isArray(content)) {
    return content.map(part => typeof part === 'string' ? part : (part?.text || part?.content || '')).join('\n');
  }
  return String(content?.text || content?.content || JSON.stringify(content));
}

function buildResponsesInput(messages = []) {
  const systemMessages = [];
  const input = [];
  for (const message of Array.isArray(messages) ? messages : []) {
    const role = message?.role || 'user';
    const content = getResponsesInputText(message?.content);
    if (!content) continue;
    if (role === 'system') {
      systemMessages.push(content);
    } else {
      input.push({
        role: role === 'assistant' ? 'assistant' : 'user',
        content
      });
    }
  }
  return {
    instructions: systemMessages.join('\n\n'),
    input: input.length ? input : [{ role: 'user', content: messages.map(msg => `${msg.role}: ${getResponsesInputText(msg.content)}`).join('\n') }]
  };
}

function extractResponsesOutputText(data = {}) {
  if (data.output_text) return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    const text = content.map(part => part?.text || part?.content || '').filter(Boolean).join('');
    if (text) return text;
  }
  return '';
}

function sanitizeModelContent(value) {
  if (value == null) return '';

  if (Array.isArray(value)) {
    return value.map(part => {
      if (typeof part === 'string') return sanitizeModelContent(part);
      if (!part || typeof part !== 'object') return part;
      const clean = { ...part };
      if (typeof clean.text === 'string') clean.text = sanitizeModelContent(clean.text);
      if (typeof clean.content === 'string') clean.content = sanitizeModelContent(clean.content);
      return clean;
    });
  }

  if (typeof value === 'object') {
    const clean = { ...value };
    if (typeof clean.text === 'string') clean.text = sanitizeModelContent(clean.text);
    if (typeof clean.content === 'string') clean.content = sanitizeModelContent(clean.content);
    return clean;
  }

  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\\x(?![0-9a-fA-F]{2})/g, '\\\\x')
    .replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u');
}

function sanitizeModelMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).map(message => ({
    ...message,
    role: message?.role || 'user',
    content: sanitizeModelContent(message?.content)
  }));
}

function normalizeMessagesForDeepSeek(messages = []) {
  return messages.map(message => {
    const normalized = { ...message };
    let content = message.content;
    if (Array.isArray(content)) {
      const textParts = content.map(part => {
        if (!part) return '';
        if (typeof part === 'string') return part;
        if (part.type === 'text') return part.text || part.content || '';
        if (part.type === 'image_url') return '';
        return part.text || part.content || '';
      }).filter(Boolean);
      content = textParts.join('\n');
    }
    normalized.role = normalized.role || 'user';
    normalized.content = sanitizeModelContent(typeof content === 'string' ? content : String(content || ''));
    delete normalized.attachments;
    delete normalized.createdAt;
    return normalized;
  });
}

async function callOpenAIProvider(model, messages, options = {}) {
  const apiKey = await getOpenAIKey();
  if (isOpenAIResponsesModel(model)) {
    const responseInput = buildResponsesInput(messages);
    const reasoningEffort = getOpenAIReasoningEffort(model, options);
    const payload = {
      model,
      input: responseInput.input,
      max_output_tokens: options.max_tokens || options.max_completion_tokens || 4000
    };

    if (responseInput.instructions) payload.instructions = responseInput.instructions;
    if (reasoningEffort) payload.reasoning = { effort: reasoningEffort };
    if (!reasoningEffort) payload.temperature = options.temperature ?? 0.4;

    const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`OpenAI Responses error ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = JSON.parse(text || '{}');
    if (data.error) {
      throw new Error(`OpenAI Responses error: ${JSON.stringify(data.error).slice(0, 300)}`);
    }

    return {
      content: extractResponsesOutputText(data),
      model: data.model || model,
      usage: data.usage || {},
      finish_reason: data.status || 'completed',
      tool_calls: []
    };
  }

  const payload = {
    model,
    messages,
    temperature: options.temperature ?? 0.4,
    max_completion_tokens: options.max_tokens || options.max_completion_tokens || 4000
  };

  if (options.tools?.length) {
    payload.tools = options.tools;
    payload.tool_choice = options.tool_choice ?? 'auto';
  }

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text || '{}');
  if (data.error) {
    throw new Error(`OpenAI error: ${JSON.stringify(data.error).slice(0, 300)}`);
  }

  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
    usage: data.usage || {},
    finish_reason: data.choices?.[0]?.finish_reason || 'stop',
    tool_calls: data.choices?.[0]?.message?.tool_calls || []
  };
}

async function callDeepSeekProvider(model, messages, options = {}) {
  const apiKey = await getDeepSeekKey();
  const normalizedMessages = normalizeMessagesForDeepSeek(messages);

  const payload = {
    model,
    messages: normalizedMessages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.max_tokens || options.max_completion_tokens || 8000
  };

  if (options.tools?.length) {
    payload.tools = options.tools;
    payload.tool_choice = options.tool_choice ?? 'auto';
  }

  const response = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`DeepSeek error ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text || '{}');
  if (data.error) {
    throw new Error(`DeepSeek error: ${JSON.stringify(data.error).slice(0, 300)}`);
  }

  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
    usage: data.usage || {},
    finish_reason: data.choices?.[0]?.finish_reason || 'stop',
    tool_calls: data.choices?.[0]?.message?.tool_calls || []
  };
}

async function callAnthropicProvider(model, messages, options = {}) {
  const apiKey = await getAnthropicKey();

  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : String(m.content || '')
    }));

  const payload = {
    model,
    messages: anthropicMessages,
    max_tokens: options.max_tokens || options.max_completion_tokens || 4000,
    temperature: options.temperature ?? 0.4
  };

  if (systemMessage) {
    payload.system = systemMessage;
  }

  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Anthropic error ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text || '{}');
  if (data.error) {
    throw new Error(`Anthropic error: ${JSON.stringify(data.error).slice(0, 300)}`);
  }

  const content = data.content?.[0]?.text || '';

  return {
    content,
    model: data.model || model,
    usage: data.usage || {},
    finish_reason: data.stop_reason || 'end_turn',
    tool_calls: []
  };
}

async function processChatMessages(payload) {
  const model = payload.model || 'gpt-5.4-mini';
  const messages = sanitizeModelMessages(payload.messages || []);
  const options = payload.options || {};
  const provider = getModelProvider(model);
  const diagnostics = getChatPayloadDiagnostics({ ...payload, messages, options });

  console.log('[CHAT] Processando chat:', {
    model,
    provider,
    messagesCount: messages.length,
    messageChars: diagnostics.messageChars,
    approxTokens: diagnostics.approxTokens
  });

  let result;
  if (provider === 'openai') {
    result = await callOpenAIProvider(model, messages, options);
  } else if (provider === 'deepseek') {
    result = await callDeepSeekProvider(model, messages, options);
  } else if (provider === 'anthropic') {
    result = await callAnthropicProvider(model, messages, options);
  } else {
    throw new Error(`Provider desconhecido: ${provider}`);
  }

  return {
    content: result.content,
    model: result.model,
    provider,
    usage: result.usage,
    finish_reason: result.finish_reason,
    tool_calls: result.tool_calls
  };
}

function chunkText(text, maxChars) {
  const source = String(text || '').trim();
  if (source.length <= maxChars) return [source];
  const chunks = [];
  let current = '';
  for (const line of source.split('\n')) {
    if ((current + line + '\n').length > maxChars && current) {
      chunks.push(current.trim());
      current = '';
    }
    current += line + '\n';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [source.slice(0, maxChars)];
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
  const timestamp = new Date().toLocaleString('pt-BR');
  const source = normalized || `Pagina criada pelo Worion em ${timestamp}.`;
  return chunkText(source, 1800).slice(0, 100).map(notionTextBlock);
}

async function createNotionPageInBackend(title, content) {
  const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  if (!cleanTitle) throw new Error('Titulo da pagina Notion nao informado.');

  const parentPageId = getRequiredRuntimeEnv('WORION_NOTION_PARENT_PAGE_ID');
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: await notionHeaders(),
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: {
        title: [{ text: { content: cleanTitle } }]
      },
      children: notionContentBlocks(content)
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Notion create error ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text || '{}');
  if (data.error) {
    throw new Error(`Notion create error: ${JSON.stringify(data.error).slice(0, 300)}`);
  }

  return {
    id: data.id,
    url: data.url,
    title: cleanTitle
  };
}

async function findNotionReadablePageRef(text) {
  const url = extractNotionUrl(text);
  if (url) return url;

  const raw = String(text || '');
  const normalized = normalizePlainText(raw);
  const targetQueries = [];
  if (/\bworkestria hq\b/i.test(normalized)) targetQueries.push('Workestria HQ');
  if (/\bworion workspace hq\b/i.test(normalized)) targetQueries.push('Worion Workspace HQ');
  if (/\bworion hq\b/i.test(normalized)) targetQueries.push('Worion HQ');
  if (/\bdaily reports?\b/i.test(normalized)) targetQueries.push('Daily Reports');
  const explicitSearch = raw.match(/\b(?:pesquise|pesquisar|busque|buscar|procure|procurar|varredura|consulte)\b[\s\S]{0,30}?\b(?:sobre|por|de)?\s*([^.\n?]+?)(?:\s+(?:no|na|em)\s+notion|\s*$)/i);
  if (explicitSearch?.[1]) {
    const query = explicitSearch[1]
      .replace(/\b(notion|pagina|página|sessoes|sessões|sessao|sessão)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (query && !/^(mim|me|eu)$/i.test(query)) targetQueries.push(query);
  }

  for (const query of targetQueries) {
    const pages = await searchNotionPages(query, 10);
    const found = pages.find(page => normalizePlainText(page.title || '').includes(normalizePlainText(query))) || pages[0];
    if (found) return found.id;
  }

  const parentPageId = getRequiredRuntimeEnv('WORION_NOTION_PARENT_PAGE_ID');
  const root = await listNotionChildren(parentPageId, 100);
  const sessionChild = root.items.find(item => item.type === 'child_page' && /sess[oõ]es?/i.test(item.title || ''));
  if (sessionChild) return sessionChild.id;

  for (const query of ['Sessões de Desenvolvimento', 'Sessoes de Desenvolvimento', 'sessões', 'sessoes']) {
    const pages = await searchNotionPages(query, 10);
    const found = pages.find(page => /sess/i.test(normalizePlainText(page.title || ''))) || pages[0];
    if (found) return found.id;
  }

  return parentPageId;
}

async function fetchNotionForText(text, options = {}) {
  const count = Math.max(1, Math.min(10, Number(options.count || getRequestedNotionSessionCount(text))));
  const maxChars = Math.max(1000, Math.min(Number(options.max_chars || 12000), 60000));
  const pageRef = await findNotionReadablePageRef(text);
  const pageId = extractNotionPageId(pageRef);
  const directUrl = extractNotionUrl(text);
  const wantsChildPages = /\b(ultimas?|recentes?|sessoes|sessao|subpaginas?|children|filhos|liste|listar|lista)\b/i.test(normalizePlainText(text));

  if (directUrl && !wantsChildPages) {
    const content = await loadPageText(pageId);
    const pages = [{
      id: pageId,
      title: 'Página do Notion',
      updatedAt: '',
      url: notionPageUrlFromId(pageId),
      content: content.slice(0, maxChars)
    }];
    return { pageId, pageUrl: notionPageUrlFromId(pageId), directUrl: true, pages, source: formatNotionReadSource(pages) };
  }

  const latestPages = (await listNotionChildren(pageId, 100)).items
    .filter(item => item.type === 'child_page')
    .sort((a, b) => new Date(b.lastEditedTime || b.createdTime || 0) - new Date(a.lastEditedTime || a.createdTime || 0))
    .slice(0, count)
    .map(item => ({
      id: item.id,
      title: item.title || '(sem titulo)',
      updatedAt: item.lastEditedTime || item.createdTime || '',
      url: notionPageUrlFromId(item.id)
    }));

  const pages = [];
  if (!latestPages.length) {
    const content = await loadPageText(pageId);
    if (content.trim()) {
      pages.push({
        id: pageId,
        title: 'Página do Notion',
        updatedAt: '',
        url: notionPageUrlFromId(pageId),
        content: content.slice(0, maxChars)
      });
    }
  } else {
    for (const page of latestPages) {
      const content = await loadPageText(page.id).catch(error => `[Erro ao ler pagina: ${error.message}]`);
      pages.push({ ...page, content: String(content || '').slice(0, maxChars) });
    }
  }

  return { pageId, pageUrl: notionPageUrlFromId(pageId), directUrl: false, pages, source: formatNotionReadSource(pages) };
}

function getQueryObject(url) {
  return Object.fromEntries(url.searchParams.entries());
}

function memorySnippet(content, query, radius = 220) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  const needle = String(query || '').toLowerCase();
  const index = text.toLowerCase().indexOf(needle);
  if (index < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + needle.length + radius);
  return `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`;
}

async function memoryFetchRows(table, params = {}) {
  assertAllowedMemoryTable(table);
  const { url: base } = getMemorySupabaseConfig();
  const url = new URL(`${base}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    if (['table', 'tenant_id', 'user_id', 'workspace_id'].includes(key)) return;
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url.toString(), { headers: memorySupabaseHeaders() });
  const text = await response.text();
  if (!response.ok) throw new Error(`${table} ${response.status}: ${text.slice(0, 180)}`);
  return JSON.parse(text || '[]');
}

function parsePostgrestCount(value, fallback = 0) {
  const match = String(value || '').match(/\/(\d+|\*)$/);
  if (!match || match[1] === '*') return fallback;
  return Number(match[1]);
}

async function memoryAuditFetch(table, params = {}, options = {}) {
  if (!MEMORY_AUDIT_TABLES.includes(table)) throw new Error(`Tabela de auditoria nao permitida: ${table}`);
  const { url: base } = getMemorySupabaseConfig();
  const url = new URL(`${base}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url.toString(), {
    headers: memorySupabaseHeaders(options.count ? { Prefer: 'count=exact' } : {})
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${table} ${response.status}: ${text.slice(0, 180)}`);
  const rows = JSON.parse(text || '[]');
  return {
    rows,
    count: options.count ? parsePostgrestCount(response.headers.get('content-range'), rows.length) : null
  };
}

function rowAuditText(row = {}) {
  return [
    row.title,
    row.summary,
    row.content,
    row.raw_content,
    row.normalized_content,
    row.source_origin,
    row.source_id,
    row.external_id,
    JSON.stringify(row.metadata || {})
  ].filter(Boolean).join(' ');
}

function detectMemoryDomain(row = {}) {
  const explicit = String(row.domain || '').trim();
  if (MEMORY_DOMAINS.includes(explicit)) return explicit;
  const text = rowAuditText(row);
  for (const domain of MEMORY_DOMAINS) {
    if (domain !== 'unknown' && MEMORY_DOMAIN_PATTERNS[domain]?.test(text)) return domain;
  }
  return 'unknown';
}

function inferMemoryFields(rows = []) {
  return [...new Set(rows.flatMap(row => Object.keys(row || {})))].sort();
}

function hasNonEmptyField(row = {}, field) {
  const value = row[field];
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function getClassificationSurfaceFieldsForRow(row = {}) {
  return MEMORY_CLASSIFICATION_SURFACE_FIELDS.filter(field => hasNonEmptyField(row, field));
}

function getExplicitClassificationFieldsForRow(table, row = {}) {
  const fields = MEMORY_EXPLICIT_CLASSIFICATION_FIELDS.filter(field => hasNonEmptyField(row, field));
  if (MEMORY_CARD_TABLES.has(table) && hasNonEmptyField(row, 'status')) fields.push('status');
  return fields;
}

function hasUsefulClassification(table, row = {}) {
  return getExplicitClassificationFieldsForRow(table, row).length > 0;
}

function tableClassificationNote(table, hasSurface, hasExplicit) {
  if (MEMORY_NON_CONTENT_TABLES.has(table)) return 'Tabela operacional; nao representa conteudo primario para classificacao.';
  if (hasExplicit) return 'Amostra contem classificacao explicita por campos de contexto/dominio.';
  if (hasSurface) return 'Amostra contem metadata/status/campos auxiliares, mas nao classificacao explicita por contexto.';
  return 'Amostra sem superficie de classificacao explicita.';
}

function getFieldCoverage(rows = [], fields = []) {
  return fields.filter(field => rows.some(row => {
    const value = row[field];
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return value !== undefined && value !== null && String(value).trim() !== '';
  }));
}

function summarizeTableClassification(table, rows, totalCount, hasClassificationSurface, hasExplicitClassification) {
  const sampleSize = rows.length;
  const unclassifiedSample = rows.filter(row => !hasUsefulClassification(table, row)).length;
  const ratio = sampleSize ? unclassifiedSample / sampleSize : 0;
  return {
    table,
    totalCount,
    sampleSize,
    hasClassificationSurface,
    hasExplicitClassification,
    unclassifiedByExplicitFieldsEstimate: Math.round(Number(totalCount || 0) * ratio),
    note: tableClassificationNote(table, hasClassificationSurface, hasExplicitClassification)
  };
}

function memoryGroupQualityWarning(domain, examples = [], sampleCount = 0) {
  const text = examples.map(example => `${example.title || ''} ${example.auditText || ''}`).join(' ');
  if (sampleCount < 3) return 'Amostra insuficiente.';
  if (domain === 'session_history') return 'Grupo amplo demais; precisa de subdivisao.';
  if (domain === 'product' && /\b(terapia|perfil|profile|ui|interface|saude|tdah|espiritual|bashar)\b/i.test(text)) {
    return 'Possivel mistura de dominio.';
  }
  if (domain === 'unknown') return 'Dominio desconhecido; nao sugerir como card.';
  return '';
}

function buildMemoryAuditGroups(tableRowsByName) {
  const domainMap = new Map();
  const sourceMap = new Map();
  for (const [table, rows] of Object.entries(tableRowsByName)) {
    if (!MEMORY_PRIMARY_CONTEXT_TABLES.has(table)) continue;
    for (const row of rows) {
      const domain = detectMemoryDomain(row);
      const domainKey = domain || 'unknown';
      if (!domainMap.has(domainKey)) {
        domainMap.set(domainKey, { domain: domainKey, sampleCount: 0, tables: new Set(), examples: [] });
      }
      const domainGroup = domainMap.get(domainKey);
      domainGroup.sampleCount += 1;
      domainGroup.tables.add(table);
      if (domainGroup.examples.length < 5) {
        domainGroup.examples.push({
          table,
          id: row.id || null,
          title: row.title || row.summary || String(row.content || '').slice(0, 80) || '(sem titulo)',
          auditText: rowAuditText(row).slice(0, 300)
        });
      }

      const source = String(row.source_id || row.source_origin || row.source_type || row.provider || '').trim();
      if (source) sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    }
  }

  const domainBreakdown = [...domainMap.values()]
    .map(group => ({
      domain: group.domain,
      sampleCount: group.sampleCount,
      tables: [...group.tables].sort()
    }))
    .sort((a, b) => b.sampleCount - a.sampleCount);

  const candidateContextGroups = [...domainMap.values()]
    .filter(group => group.sampleCount > 0 && group.domain !== 'unknown')
    .map(group => ({
      title: `Contexto ${group.domain}`,
      slug: `context-${group.domain.replace(/_/g, '-')}`,
      domain: group.domain,
      basis: 'heuristic_sample_domain',
      sampleCount: group.sampleCount,
      sourceTables: [...group.tables].sort(),
      examples: group.examples.map(({ auditText, ...example }) => example),
      qualityWarning: memoryGroupQualityWarning(group.domain, group.examples, group.sampleCount)
    }))
    .sort((a, b) => b.sampleCount - a.sampleCount);

  const suggestedCards = candidateContextGroups.slice(0, 8).map(group => ({
    title: `Memory Card: ${group.domain}`,
    slug: `memory-card-${group.domain.replace(/_/g, '-')}`,
    domain: group.domain,
    status: 'card_candidate',
    sourceContextSlug: group.slug,
    allowedActions: [
      'read_context',
      'pull_context_without_conversation',
      'start_new_discussion',
      'save_new_content_to_context'
    ]
  }));

  return {
    domainBreakdown,
    candidateContextGroups,
    suggestedCards,
    sourceBreakdown: [...sourceMap.entries()]
      .map(([source, sampleCount]) => ({ source, sampleCount }))
      .sort((a, b) => b.sampleCount - a.sampleCount)
      .slice(0, 20)
  };
}

async function buildMemoryAudit() {
  const currentTables = {};
  const schemaFindings = {};
  const classificationStatus = {};
  const tableErrors = [];
  const warnings = [];
  const rowsByTable = {};

  for (const table of MEMORY_AUDIT_TABLES) {
    try {
      const countResult = await memoryAuditFetch(table, { select: '*', limit: '1' }, { count: true });
      const sampleResult = await memoryAuditFetch(table, {
        select: '*',
        order: table === 'memory_chunks' ? 'created_at.desc' : 'updated_at.desc',
        limit: '50'
      }).catch(() => memoryAuditFetch(table, { select: '*', limit: '50' }));
      const rows = sampleResult.rows || [];
      let fields = inferMemoryFields(rows);
      let schemaSource = 'sample_rows';
      if (!fields.length && Number(countResult.count || 0) === 0 && MEMORY_CARDS_V2_EXPECTED_SCHEMAS[table]) {
        fields = MEMORY_CARDS_V2_EXPECTED_SCHEMAS[table];
        schemaSource = 'expected_v2_schema';
      }
      const classificationSurfaceFields = getFieldCoverage(rows, MEMORY_CLASSIFICATION_SURFACE_FIELDS);
      const explicitClassificationFields = getFieldCoverage(rows, MEMORY_EXPLICIT_CLASSIFICATION_FIELDS);
      if (MEMORY_CARD_TABLES.has(table) && rows.some(row => hasNonEmptyField(row, 'status'))) {
        explicitClassificationFields.push('status');
      }
      const uniqueExplicitClassificationFields = [...new Set(explicitClassificationFields)].sort();
      const hasClassificationSurface = classificationSurfaceFields.length > 0;
      const hasExplicitClassification = uniqueExplicitClassificationFields.length > 0;
      rowsByTable[table] = rows;
      currentTables[table] = {
        rowCount: countResult.count,
        sampleSize: rows.length,
        fields,
        schemaSource
      };
      schemaFindings[table] = {
        fields,
        schemaSource,
        classificationSurfaceFields: classificationSurfaceFields.sort(),
        explicitClassificationFields: uniqueExplicitClassificationFields,
        missingExplicitClassificationFields: MEMORY_EXPLICIT_CLASSIFICATION_FIELDS
          .concat(MEMORY_CARD_TABLES.has(table) ? ['status'] : [])
          .filter(field => !uniqueExplicitClassificationFields.includes(field)),
        hasClassificationSurface,
        hasExplicitClassification
      };
      classificationStatus[table] = summarizeTableClassification(
        table,
        rows,
        countResult.count,
        hasClassificationSurface,
        hasExplicitClassification
      );
      if (schemaSource === 'expected_v2_schema') {
        warnings.push(`${table}: tabela acessivel e vazia; schema exibido a partir da definicao V2 esperada.`);
      } else if (!fields.length && Number(countResult.count || 0) === 0) {
        warnings.push(`${table}: tabela acessivel e vazia; sem schema esperado registrado para exibir campos.`);
      }
    } catch (error) {
      const errorMessage = error.message || String(error);
      if (!MEMORY_OPTIONAL_V2_TABLES.has(table)) {
        tableErrors.push({ table, error: errorMessage });
      }
      currentTables[table] = { rowCount: null, sampleSize: 0, fields: [], schemaSource: 'unavailable' };
      schemaFindings[table] = {
        fields: [],
        schemaSource: 'unavailable',
        classificationSurfaceFields: [],
        explicitClassificationFields: [],
        missingExplicitClassificationFields: MEMORY_EXPLICIT_CLASSIFICATION_FIELDS.concat(MEMORY_CARD_TABLES.has(table) ? ['status'] : []),
        hasClassificationSurface: false,
        hasExplicitClassification: false
      };
      classificationStatus[table] = {
        table,
        totalCount: null,
        sampleSize: 0,
        hasClassificationSurface: false,
        hasExplicitClassification: false,
        unclassifiedByExplicitFieldsEstimate: null,
        note: tableClassificationNote(table, false, false)
      };
    }
  }

  const groups = buildMemoryAuditGroups(rowsByTable);
  for (const table of ['memory_files', 'memory_contexts', 'memory_cards_v2']) {
    if (currentTables[table]?.rowCount === null) warnings.push(`${table} ainda nao existe ou nao esta acessivel; sera criada pela migration v2 proposta.`);
    if (currentTables[table]?.rowCount === 0) warnings.push(`${table} existe e esta vazia; nenhum dado antigo foi migrado.`);
  }
  if (groups.domainBreakdown.some(group => group.domain === 'unknown')) {
    warnings.push('Dominios unknown foram reportados para diagnostico, mas nao geram sugestao de card.');
  }

  return {
    ok: true,
    type: 'memory_audit',
    generatedAt: new Date().toISOString(),
    currentTables,
    schemaFindings,
    classificationStatus,
    domainBreakdown: groups.domainBreakdown,
    candidateContextGroups: groups.candidateContextGroups,
    suggestedCards: groups.suggestedCards,
    sourceBreakdown: groups.sourceBreakdown,
    recommendedMigrationFile: MEMORY_CARDS_V2_MIGRATION_FILE,
    warnings,
    tableErrors
  };
}

function slugifyMemoryContext(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function normalizeMemoryRuleList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
  return String(value).split('\n').map(line => line.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean);
}

function safeJsonObject(value, fallback = {}) {
  if (!value) return { ...fallback };
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return { ...fallback };
}

function mergeMemoryMetadata(base = {}, patch = {}) {
  return {
    ...base,
    ...patch,
    routingRules: Array.isArray(patch.routingRules) ? patch.routingRules : base.routingRules || [],
    manualAliases: Array.isArray(patch.manualAliases) ? patch.manualAliases : base.manualAliases || [],
    mergeCandidates: Array.isArray(patch.mergeCandidates) ? patch.mergeCandidates : base.mergeCandidates || [],
    splitRules: Array.isArray(patch.splitRules) ? patch.splitRules : base.splitRules || [],
    semanticInstructions: patch.semanticInstructions || base.semanticInstructions || null,
    consumptionMarkdown: patch.consumptionMarkdown || base.consumptionMarkdown || ''
  };
}

function extractMemoryTextBlocks(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean);
}

function detectParentContext(text, options = {}) {
  const sample = String(text || '');
  const lower = sample.toLowerCase();
  const metadata = options.metadata || {};
  const userRoutingRules = Array.isArray(options.userRoutingRules) ? options.userRoutingRules : [];
  const contextRoutingRules = Array.isArray(options.contextRoutingRules) ? options.contextRoutingRules : [];
  const cardSemanticInstructions = safeJsonObject(options.cardSemanticInstructions || {}, {});
  const manualCorrections = Array.isArray(options.manualCorrections) ? options.manualCorrections : [];

  const explicitChecks = [];
  const pushRuleMatch = (rule, source) => {
    if (!rule || !rule.active) return null;
    const pattern = String(rule.pattern || '').trim();
    if (!pattern) return null;
    const regex = new RegExp(pattern, 'i');
    if (!regex.test(sample)) return null;
    return {
      contextSlug: slugifyMemoryContext(rule.targetContextSlug || rule.contextSlug || ''),
      domain: rule.domain || metadata.domain || 'unknown',
      confidenceScore: 0.95,
      source,
      matchedRule: rule,
      reason: rule.reason || `Regra explícita casou com ${pattern}`
    };
  };

  const semanticRules = Array.isArray(cardSemanticInstructions.routingOverrides) ? cardSemanticInstructions.routingOverrides : [];
  for (const rule of semanticRules) {
    const match = pushRuleMatch(rule, 'card_markdown');
    if (match) return match;
  }

  for (const rule of contextRoutingRules) {
    const match = pushRuleMatch(rule, 'context_rule');
    if (match) return match;
  }

  for (const rule of userRoutingRules) {
    const match = pushRuleMatch(rule, 'user_rule');
    if (match) return match;
  }

  for (const correction of manualCorrections) {
    const match = pushRuleMatch(correction, 'manual_correction');
    if (match) return match;
  }

  const heuristicChecks = [
    { slug: 'memory-cards-context-memory', domain: 'technical', source: 'system_heuristic', reason: 'Conteúdo menciona Memory Cards, Context Memory ou roteamento de memoria.', test: /\b(memory cards?|context memory|memory_contexts|memory_cards_v2|\/memory)\b/i },
    { slug: 'runtime-facts-introspeccao-modelo', domain: 'technical', source: 'system_heuristic', reason: 'Conteúdo menciona runtime facts, modelo ou introspecção.', test: /\b(runtimeMetadata|model router|provider|introspec|runtime facts)\b/i },
    { slug: 'health-routine-energy', domain: 'health_routine', source: 'system_heuristic', reason: 'Conteúdo menciona saúde, rotina, energia ou TDAH.', test: /\b(saude|rotina|energia|tdah|ansiedade|sono|medicacao)\b/i },
    { slug: 'spirituality-dreams-hermeticism', domain: 'spiritual_reflective', source: 'system_heuristic', reason: 'Conteúdo menciona espiritualidade, sonhos ou hermetismo.', test: /\b(espiritual|sonhos?|hermetismo|meditacao|consciencia)\b/i },
    { slug: 'pupilla-ecommerce', domain: 'unknown', source: 'system_heuristic', reason: 'Conteúdo menciona e-commerce ou Puppila.', test: /\b(puppila|e-commerce|ecommerce|produto.*loja)\b/i }
  ];
  for (const item of heuristicChecks) {
    if (item.test.test(sample)) {
      return {
        contextSlug: item.slug,
        domain: item.domain,
        confidenceScore: 0.72,
        source: item.source,
        matchedRule: null,
        reason: item.reason
      };
    }
  }

  return {
    contextSlug: 'a-revisar',
    domain: 'unknown',
    confidenceScore: 0.3,
    source: 'fallback',
    matchedRule: null,
    reason: 'Nenhuma regra explícita ou heurística forte identificada.'
  };
}

function analyzeMemoryTextUnits(text) {
  const blocks = extractMemoryTextBlocks(text);
  return blocks.map((block, index) => ({
    index,
    title: block.split(/\n/)[0].slice(0, 120) || `Trecho ${index + 1}`,
    summary: block.slice(0, 240),
    sourceRange: { start: index, end: index }
  }));
}

function buildConsumptionMarkdownForContext(context) {
  const inclusion = normalizeMemoryRuleList(context.inclusionRules || context.inclusion_rules);
  const exclusion = normalizeMemoryRuleList(context.exclusionRules || context.exclusion_rules);
  return [
    '# Consumo do Contexto',
    '',
    '## Este contexto consome',
    ...(inclusion.length ? inclusion.map(item => `- ${item}`) : ['- Conteudo relacionado ao tema principal do contexto.']),
    '',
    '## Este contexto nao consome',
    ...(exclusion.length ? exclusion.map(item => `- ${item}`) : ['- Conteudo que tenha contexto mais especifico.']),
    '',
    '## Prioridade',
    '- Regras explicitas do usuario vencem a heuristica padrao.',
    '- Se houver conflito, enviar para revisao em vez de impor classificacao.',
    '',
    '## Exemplos que entram',
    `- Trechos que mencionam ${context.title}.`,
    '',
    '## Exemplos que nao entram',
    '- Trechos sem relacao semantica com este contexto.'
  ].join('\n');
}

async function seedMemoryCanonicalContexts() {
  const inserted = [];
  const skipped = [];
  const errors = [];
  for (const context of MEMORY_CANONICAL_CONTEXTS) {
    const slug = slugifyMemoryContext(context.slug || context.title);
    try {
      const existing = await fetchMemoryContextBySlug(slug).catch(() => null);
      if (existing) {
        skipped.push({ slug, reason: 'already_exists' });
        continue;
      }
      const row = {
        title: context.title,
        slug,
        domain: context.domain || 'unknown',
        description: context.description || '',
        inclusion_rules: normalizeMemoryRuleList(context.inclusionRules),
        exclusion_rules: normalizeMemoryRuleList(context.exclusionRules),
        status: 'draft',
        confidence_score: 0.72,
        metadata: {
          generated_by: 'canonical_memory_context_seed',
          classificationHints: Array.isArray(context.patterns) ? context.patterns.map(pattern => String(pattern)) : [],
          routingRules: [],
          manualAliases: [],
          mergeCandidates: [],
          splitRules: [],
          consumptionMarkdown: buildConsumptionMarkdownForContext(context),
          seededAt: new Date().toISOString()
        }
      };
      const rows = await memoryInsertRows('memory_contexts', [row]);
      inserted.push(rows[0] || row);
    } catch (error) {
      errors.push({ slug, error: error.message || String(error) });
    }
  }
  console.log('[MEMORY CONTEXT SEED] inserted=%s skipped=%s errors=%s', inserted.length, skipped.length, errors.length);
  return {
    ok: true,
    type: 'memory_context_seed',
    inserted,
    skipped,
    errors
  };
}

async function suggestContextForCard(cardId) {
  const card = await fetchMemoryCardById(cardId);
  if (!card) throw new Error(`Card nao encontrado: ${cardId}`);
  const contexts = await memoryAuditFetch('memory_contexts', {
    select: '*',
    order: 'updated_at.desc',
    limit: '200'
  }).catch(() => ({ rows: [] }));
  const text = [
    card.title,
    card.summary,
    card.card_scope,
    normalizeMemoryRuleList(card.inclusion_rules).join(' '),
    normalizeMemoryRuleList(card.exclusion_rules).join(' '),
    JSON.stringify(card.metadata || {})
  ].join(' ');
  const detection = detectParentContext(text, {
    metadata: { domain: card.domain || 'unknown' },
    cardSemanticInstructions: safeJsonObject(card.metadata || {}, {}).semanticInstructions || {},
    manualCorrections: [],
    userRoutingRules: [],
    contextRoutingRules: (contexts.rows || []).flatMap(context => {
      const metadata = safeJsonObject(context.metadata, {});
      return Array.isArray(metadata.routingRules) ? metadata.routingRules : [];
    })
  });
  const matched = (contexts.rows || []).find(context => slugifyMemoryContext(context.slug) === slugifyMemoryContext(detection.contextSlug));
  return {
    ok: true,
    type: 'memory_card_context_suggestion',
    cardId,
    suggestedContext: matched ? {
      id: matched.id,
      title: matched.title,
      slug: matched.slug,
      domain: matched.domain,
      confidenceScore: detection.confidenceScore,
      source: detection.source,
      reason: detection.reason
    } : {
      id: null,
      title: detection.contextSlug.replace(/-/g, ' '),
      slug: detection.contextSlug,
      domain: detection.domain,
      confidenceScore: detection.confidenceScore,
      source: detection.source,
      reason: detection.reason
    }
  };
}

async function fetchMemoryContextBySlug(slug) {
  const result = await memoryAuditFetch('memory_contexts', {
    select: '*',
    slug: `eq.${slug}`
  });
  return result.rows?.[0] || null;
}

async function fetchMemoryCardById(id) {
  const result = await memoryAuditFetch('memory_cards_v2', {
    select: '*',
    id: `eq.${id}`
  });
  return result.rows?.[0] || null;
}

function clampMemoryScore(value) {
  return Math.max(0, Math.min(0.98, Number(value || 0)));
}

function memoryCandidateSourceTitle(row = {}) {
  return String(row.title || row.summary || row.name || row.source_ref || row.source_id || row.external_id || row.id || row.content || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140) || '(sem titulo)';
}

function memoryCandidateReason(profile, row) {
  const text = rowAuditText(row);
  const matched = profile.patterns.find(pattern => pattern.test(text));
  if (!matched) return `dominio inferido como ${detectMemoryDomain(row)}`;
  return `corresponde ao padrao ${String(matched).slice(1, 80)}`;
}

async function fetchMemoryContextCandidateRows(sampleLimit) {
  const rowsByTable = {};
  const errors = [];
  for (const table of MEMORY_CONTEXT_CANDIDATE_TABLES) {
    try {
      const result = await memoryAuditFetch(table, {
        select: '*',
        order: table === 'memory_chunks' ? 'created_at.desc' : 'updated_at.desc',
        limit: String(sampleLimit)
      }).catch(() => memoryAuditFetch(table, { select: '*', limit: String(sampleLimit) }));
      rowsByTable[table] = result.rows || [];
    } catch (error) {
      rowsByTable[table] = [];
      errors.push({ table, error: error.message || String(error) });
    }
  }
  return { rowsByTable, errors };
}

function qualityWarningsForContextCandidate(profile, matches, sourceSummary) {
  const warnings = [];
  const sampleCount = matches.length;
  const text = matches.map(match => `${match.title || ''} ${match.auditText || ''}`).join(' ');
  if (sampleCount < 3) warnings.push('amostra insuficiente');
  if (profile.domain === 'session_history' || sampleCount > 80) warnings.push('Grupo amplo demais; precisa de subdivisao.');
  if (['spiritual_reflective', 'external_research'].includes(profile.domain) && sampleCount > 35) {
    warnings.push('Grupo amplo demais; precisa de subdivisao.');
  }
  if (profile.domain === 'product' && /\b(terapia|perfil|profile|ui|interface|saude|tdah|espiritual|bashar)\b/i.test(text)) {
    warnings.push('Possivel mistura de dominio.');
  }
  if (sourceSummary.legacySources > 0 && sourceSummary.conversations + sourceSummary.chunks + sourceSummary.legacyCards === 0) {
    warnings.push('Fonte operacional, nao conteudo primario.');
  }
  return [...new Set(warnings)];
}

function memoryCandidateSourceTotal(sourceSummary = {}) {
  return Number(sourceSummary.conversations || 0)
    + Number(sourceSummary.chunks || 0)
    + Number(sourceSummary.legacyCards || 0)
    + Number(sourceSummary.legacySources || 0);
}

function evaluateCandidateQuality(candidate = {}) {
  const qualityWarnings = [...new Set(candidate.qualityWarnings || [])];
  const sourceSummary = candidate.sourceSummary || {};
  const total = memoryCandidateSourceTotal(sourceSummary);
  const legacyTotal = Number(sourceSummary.legacyCards || 0) + Number(sourceSummary.legacySources || 0);
  const sampleText = (candidate.sampleSources || [])
    .map(source => `${source.title || ''} ${source.reason || ''}`)
    .join(' ');
  let applyAllowed = true;
  let qualityScore = Number(candidate.confidenceScore || 0);

  function block(message, penalty = 0.25) {
    applyAllowed = false;
    qualityScore -= penalty;
    qualityWarnings.push(message);
  }

  function warn(message, penalty = 0.08) {
    qualityScore -= penalty;
    qualityWarnings.push(message);
  }

  if (candidate.domain === 'unknown') block('Dominio unknown nao e aplicavel.');
  if (total < 3) block('amostra insuficiente');
  if (/^Contexto\s+/i.test(candidate.title || '')) block('Titulo generico demais.');
  if (qualityWarnings.some(warning => normalizePlainText(warning).includes('grupo amplo demais'))) {
    block('Grupo amplo demais; precisa de subdivisao.');
  }

  if (candidate.domain === 'product' && /\b(terapia|cognitiv[ao]s?|perfil|espiritualidade|espiritual|sonhos?|hermetismo|ui generica|interface generica|limite cognitivo)\b/i.test(sampleText)) {
    block('Mistura forte de dominio em candidato de produto.');
  }
  if (candidate.slug === 'ui-ux-composer-worion' && /\b(canva|n8n|workflow)\b/i.test(sampleText) && !/\b(ui|ux|composer|interface|frontend|renderer|sidebar)\b/i.test(sampleText)) {
    block('Mistura forte de dominio: amostras operacionais nao UI.');
  }
  if (candidate.slug === 'worion-api-local' && sourceSummary.legacyCards > 0 && sourceSummary.conversations === 0 && sourceSummary.chunks === 0) {
    block('Worion API Local sustentado apenas por legacyCards.');
  }
  if (candidate.domain === 'spiritual_reflective' && /\b(terapia|notion|revis[aã]o|review)\b/i.test(sampleText) && !/\b(espiritual|sonhos?|hermetismo|bashar|medita[cç][aã]o|consciencia)\b/i.test(sampleText)) {
    block('Mistura forte de dominio em candidato espiritual/reflexivo.');
  }
  if (candidate.domain === 'external_research' && !/\b(evidence|grounding|fonte|fontes|web|brave|tavily|pesquisa|refer[eê]ncia|cita)\b/i.test(sampleText)) {
    block('Pesquisa externa sem sinal claro de evidence/grounding/fonte/web.');
  }

  if (Number(candidate.confidenceScore || 0) < 0.7) warn('confidenceScore abaixo de 0.7.');
  if (Number(sourceSummary.conversations || 0) === 0 && Number(sourceSummary.chunks || 0) < 5) {
    warn('Pouco suporte em conversations/chunks.');
  }
  if (total > 0 && legacyTotal / total > 0.7) warn('Legado domina mais de 70% das fontes.');

  return {
    applyAllowed,
    qualityScore: Number(Math.max(0, Math.min(0.98, qualityScore)).toFixed(2)),
    qualityWarnings: [...new Set(qualityWarnings)]
  };
}

function buildMemoryContextCandidatesFromRows(rowsByTable, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 12), 50));
  const minScore = Math.max(0, Math.min(Number(options.minScore ?? 0.35), 0.95));
  const domainFilter = String(options.domain || '').trim();
  const candidates = [];
  const warnings = [];
  const allRows = [];

  for (const [table, rows] of Object.entries(rowsByTable)) {
    for (const row of rows || []) {
      allRows.push({
        table,
        row,
        auditText: rowAuditText(row),
        title: memoryCandidateSourceTitle(row)
      });
    }
  }

  for (const profile of MEMORY_CONTEXT_CANDIDATE_PROFILES) {
    if (domainFilter && profile.domain !== domainFilter) continue;
    const matches = allRows.filter(item => profile.patterns.some(pattern => pattern.test(item.auditText)));
    if (!matches.length) continue;

    const sourceSummary = {
      conversations: matches.filter(item => item.table === 'memory_conversations').length,
      chunks: matches.filter(item => item.table === 'memory_chunks').length,
      legacyCards: matches.filter(item => item.table === 'context_memory_cards').length,
      legacySources: matches.filter(item => item.table === 'context_memory_sources').length
    };
    const primaryCount = sourceSummary.conversations + sourceSummary.chunks + sourceSummary.legacyCards;
    const confidenceScore = clampMemoryScore(0.42 + Math.min(primaryCount, 20) * 0.022 + Math.min(matches.length, 60) * 0.004);
    const qualityWarnings = qualityWarningsForContextCandidate(profile, matches, sourceSummary);
    if (confidenceScore < minScore) continue;

    const candidate = {
      title: profile.title,
      slug: profile.slug || slugifyMemoryContext(profile.title),
      domain: profile.domain,
      description: profile.description,
      confidenceScore: Number(confidenceScore.toFixed(2)),
      inclusionRules: profile.inclusionRules,
      exclusionRules: profile.exclusionRules,
      sourceSummary,
      sampleSources: matches.slice(0, 8).map(item => ({
        table: item.table,
        id: item.row.id || null,
        title: item.title,
        reason: memoryCandidateReason(profile, item.row)
      })),
      qualityWarnings,
      suggestedStatus: 'draft'
    };
    Object.assign(candidate, evaluateCandidateQuality(candidate));
    candidates.push(candidate);
  }

  candidates.sort((a, b) => b.confidenceScore - a.confidenceScore || a.title.localeCompare(b.title));
  if (!candidates.length) warnings.push('Nenhum contexto candidato especifico foi sustentado pela amostra atual.');
  if (domainFilter && !MEMORY_DOMAINS.includes(domainFilter)) warnings.push(`Dominio desconhecido ignorado: ${domainFilter}`);
  return { candidates: candidates.slice(0, limit), warnings };
}

function isValidMemoryContextCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') return false;
  if (!candidate.title || !candidate.slug || !candidate.domain || !candidate.description) return false;
  if (!MEMORY_DOMAINS.includes(candidate.domain) || candidate.domain === 'unknown') return false;
  if (!Array.isArray(candidate.inclusionRules) || !Array.isArray(candidate.exclusionRules)) return false;
  if (!Array.isArray(candidate.sampleSources) || !candidate.sampleSources.length) return false;
  return candidate.suggestedStatus === 'draft';
}

async function buildMemoryContextCandidates(params = {}) {
  console.log('[MEMORY CONTEXT CANDIDATES] start');
  const limit = Math.max(1, Math.min(Number(params.limit || 12), 50));
  const sampleLimit = Math.max(80, Math.min(limit * 40, 400));
  const { rowsByTable, errors } = await fetchMemoryContextCandidateRows(sampleLimit);
  const generated = buildMemoryContextCandidatesFromRows(rowsByTable, {
    limit,
    minScore: params.minScore,
    domain: params.domain
  });
  const domains = [...new Set(generated.candidates.map(candidate => candidate.domain))].sort();
  console.log('[MEMORY CONTEXT CANDIDATES] generated:', {
    count: generated.candidates.length,
    domains
  });
  return {
    ok: true,
    type: 'memory_context_candidates',
    generatedAt: new Date().toISOString(),
    dryRun: true,
    candidates: generated.candidates,
    warnings: generated.warnings,
    errors
  };
}

async function memoryInsertRows(table, rows) {
  if (!MEMORY_AUDIT_TABLES.includes(table)) throw new Error(`Tabela nao permitida: ${table}`);
  if (!Array.isArray(rows) || !rows.length) return [];
  const { url: base } = getMemorySupabaseConfig();
  const url = new URL(`${base}/rest/v1/${table}`);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: memorySupabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
    body: JSON.stringify(rows)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${table} ${response.status}: ${text.slice(0, 180)}`);
  return JSON.parse(text || '[]');
}

async function applyMemoryContextCandidates(payload = {}) {
  const mode = String(payload.mode || 'insert_missing_only');
  if (mode !== 'insert_missing_only') throw new Error(`Modo nao suportado: ${mode}`);
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const inserted = [];
  const skipped = [];
  const errors = [];
  const validCandidates = candidates.filter(candidate => {
    const valid = isValidMemoryContextCandidate(candidate);
    if (!valid) errors.push({ slug: candidate?.slug || null, error: 'candidate invalido ou nao aplicavel' });
    return valid;
  });

  for (const candidate of validCandidates) {
    const slug = slugifyMemoryContext(candidate.slug);
    if (candidate.applyAllowed === false) {
      skipped.push({
        slug,
        reason: 'quality_gate_blocked',
        qualityWarnings: candidate.qualityWarnings || []
      });
      continue;
    }
    try {
      const existing = await memoryAuditFetch('memory_contexts', {
        select: 'id,title,slug,status',
        slug: `eq.${slug}`,
        limit: '1'
      });
      if (existing.rows?.length) {
        skipped.push({ slug, reason: 'slug_exists', row: existing.rows[0] });
        continue;
      }

      const rows = await memoryInsertRows('memory_contexts', [{
        title: String(candidate.title).slice(0, 180),
        slug,
        domain: candidate.domain,
        description: String(candidate.description || '').slice(0, 2000),
        inclusion_rules: candidate.inclusionRules,
        exclusion_rules: candidate.exclusionRules,
        status: 'draft',
        confidence_score: candidate.confidenceScore ?? null,
        metadata: {
          generated_by: 'memory_context_candidates',
          source_summary: candidate.sourceSummary || {},
          sample_sources: candidate.sampleSources || [],
          quality_warnings: candidate.qualityWarnings || []
        }
      }]);
      inserted.push(...rows.map(row => ({ id: row.id, title: row.title, slug: row.slug, domain: row.domain, status: row.status })));
    } catch (error) {
      errors.push({ slug, error: error.message || String(error) });
    }
  }

  console.log('[MEMORY CONTEXT CANDIDATES] apply:', {
    received: candidates.length,
    inserted: inserted.length,
    skipped: skipped.length,
    errors: errors.length
  });

  return {
    ok: true,
    type: 'memory_context_candidates_apply',
    inserted,
    skipped,
    errors
  };
}

async function applyMemoryContextCandidatesBySlug(payload = {}) {
  const requested = [...new Set((Array.isArray(payload.slugs) ? payload.slugs : [])
    .map(slug => slugifyMemoryContext(slug))
    .filter(Boolean))];
  const mode = String(payload.mode || 'insert_missing_only');
  if (mode !== 'insert_missing_only') throw new Error(`Modo nao suportado: ${mode}`);

  const generated = await buildMemoryContextCandidates({ limit: 50, minScore: 0 });
  const candidateBySlug = new Map((generated.candidates || []).map(candidate => [candidate.slug, candidate]));
  const missing = [];
  const selected = [];
  const errors = [];
  const qualitySkipped = [];

  for (const slug of requested) {
    const candidate = candidateBySlug.get(slug);
    if (!candidate) {
      missing.push(slug);
      continue;
    }
    if (candidate.domain === 'unknown') {
      qualitySkipped.push({ slug, reason: 'quality_gate_blocked', qualityWarnings: ['Dominio unknown nao e aplicavel.'] });
      continue;
    }
    if (candidate.applyAllowed === false) {
      qualitySkipped.push({
        slug,
        reason: 'quality_gate_blocked',
        qualityWarnings: candidate.qualityWarnings || []
      });
      continue;
    }
    selected.push(candidate);
  }

  const applied = selected.length
    ? await applyMemoryContextCandidates({ candidates: selected, mode })
    : { inserted: [], skipped: [], errors: [] };
  const combinedErrors = errors.concat(applied.errors || []);
  const skipped = qualitySkipped.concat(applied.skipped || []);

  console.log('[MEMORY CONTEXT CANDIDATES] apply-by-slug:', {
    requested: requested.length,
    inserted: applied.inserted?.length || 0,
    skipped: skipped.length,
    missing: missing.length,
    errors: combinedErrors.length
  });

  return {
    ok: true,
    type: 'memory_context_candidates_apply_by_slug',
    requested,
    inserted: applied.inserted || [],
    skipped,
    missing,
    errors: combinedErrors
  };
}

async function upsertMemoryContextRoutingRules(payload = {}) {
  const contextSlug = slugifyMemoryContext(payload.contextSlug);
  if (!contextSlug) throw new Error('contextSlug obrigatorio');
  const rules = Array.isArray(payload.rules) ? payload.rules : [];
  const existing = await fetchMemoryContextBySlug(contextSlug);
  if (!existing) throw new Error(`Contexto nao encontrado: ${contextSlug}`);
  const metadata = safeJsonObject(existing.metadata, {});
  const mergedRules = Array.isArray(metadata.routingRules) ? [...metadata.routingRules] : [];
  for (const rule of rules) {
    const normalized = {
      pattern: String(rule.pattern || '').trim(),
      targetContextSlug: slugifyMemoryContext(rule.targetContextSlug || contextSlug),
      reason: String(rule.reason || '').trim(),
      priority: Number(rule.priority || 0),
      active: rule.active !== false
    };
    if (!normalized.pattern) continue;
    const index = mergedRules.findIndex(item => item.pattern === normalized.pattern && item.targetContextSlug === normalized.targetContextSlug);
    if (index >= 0) mergedRules[index] = { ...mergedRules[index], ...normalized };
    else mergedRules.push(normalized);
  }
  metadata.routingRules = mergedRules;
  metadata.updatedAt = new Date().toISOString();
  await memoryUpsertRows('memory_contexts', [{
    ...existing,
    metadata
  }], 'slug');
  await memoryInsertRows('memory_card_events', [{
    context_id: existing.id,
    event_type: 'routing_rules_updated',
    event_payload: JSON.stringify({ contextSlug, rules: mergedRules }),
    created_at: new Date().toISOString()
  }]).catch(() => []);
  return {
    ok: true,
    type: 'memory_context_routing_rules',
    contextSlug,
    rules: mergedRules
  };
}

async function updateMemoryContext(payload = {}) {
  const contextSlug = slugifyMemoryContext(payload.contextSlug);
  if (!contextSlug) throw new Error('contextSlug obrigatorio');
  const existing = await fetchMemoryContextBySlug(contextSlug);
  if (!existing) throw new Error(`Contexto nao encontrado: ${contextSlug}`);
  const metadata = safeJsonObject(existing.metadata, {});
  const nextMetadata = mergeMemoryMetadata(metadata, {
    routingRules: Array.isArray(payload.routingRules) ? payload.routingRules : metadata.routingRules || [],
    manualAliases: Array.isArray(payload.manualAliases) ? payload.manualAliases : metadata.manualAliases || [],
    mergeCandidates: Array.isArray(payload.mergeCandidates) ? payload.mergeCandidates : metadata.mergeCandidates || [],
    splitRules: Array.isArray(payload.splitRules) ? payload.splitRules : metadata.splitRules || [],
    consumptionMarkdown: String(payload.consumptionMarkdown || metadata.consumptionMarkdown || ''),
    updatedAt: new Date().toISOString()
  });
  const rows = await memoryUpsertRows('memory_contexts', [{
    ...existing,
    title: payload.title || existing.title,
    domain: payload.domain || existing.domain,
    status: payload.status || existing.status,
    description: payload.description !== undefined ? payload.description : existing.description,
    inclusion_rules: Array.isArray(payload.inclusion_rules) ? payload.inclusion_rules : existing.inclusion_rules || [],
    exclusion_rules: Array.isArray(payload.exclusion_rules) ? payload.exclusion_rules : existing.exclusion_rules || [],
    metadata: nextMetadata
  }], 'slug');
  await memoryInsertRows('memory_card_events', [{
    context_id: existing.id,
    event_type: 'context_updated',
    event_payload: JSON.stringify({ contextSlug, ...payload }),
    created_at: new Date().toISOString()
  }]).catch(() => []);
  return {
    ok: true,
    type: 'memory_context_updated',
    context: rows[0] || existing
  };
}

async function updateMemoryCardSemanticInstructions(cardId, payload = {}) {
  const card = await fetchMemoryCardById(cardId);
  if (!card) throw new Error(`Card nao encontrado: ${cardId}`);
  const metadata = safeJsonObject(card.metadata, {});
  metadata.semanticInstructions = {
    consumeMarkdown: String(payload.consumeMarkdown || ''),
    includePatterns: Array.isArray(payload.includePatterns) ? payload.includePatterns : [],
    excludePatterns: Array.isArray(payload.excludePatterns) ? payload.excludePatterns : [],
    prioritySignals: Array.isArray(payload.prioritySignals) ? payload.prioritySignals : [],
    routingOverrides: Array.isArray(payload.routingOverrides) ? payload.routingOverrides : [],
    examples: payload.examples && typeof payload.examples === 'object' ? payload.examples : { include: [], exclude: [] }
  };
  metadata.updatedAt = new Date().toISOString();
  await memoryUpsertRows('memory_cards_v2', [{
    ...card,
    metadata
  }], 'id');
  await memoryInsertRows('memory_card_events', [{
    card_id: card.id,
    context_id: card.context_id || null,
    event_type: 'semantic_instructions_updated',
    event_payload: JSON.stringify(metadata.semanticInstructions),
    created_at: new Date().toISOString()
  }]).catch(() => []);
  return {
    ok: true,
    type: 'memory_card_semantic_instructions',
    cardId: card.id,
    semanticInstructions: metadata.semanticInstructions
  };
}

async function generateMemoryCardFromParentContext(payload = {}) {
  const contextSlug = slugifyMemoryContext(payload.contextSlug);
  if (!contextSlug) throw new Error('contextSlug obrigatorio');
  const context = await fetchMemoryContextBySlug(contextSlug);
  if (!context) throw new Error(`Contexto nao encontrado: ${contextSlug}`);
  const existing = await memoryAuditFetch('memory_cards_v2', {
    select: '*',
    slug: `eq.${slugifyMemoryContext(payload.title || context.title)}`
  }).catch(() => ({ rows: [] }));
  if (existing.rows?.length) {
    return { ok: true, type: 'memory_card_generate_from_parent_context', skipped: true, reason: 'already_exists', card: existing.rows[0] };
  }
  const cardSlug = slugifyMemoryContext(payload.title || context.title);
  const card = {
    context_id: context.id,
    title: String(payload.title || context.title || 'Sem titulo'),
    slug: cardSlug,
    summary: context.description || context.title,
    domain: context.domain || 'unknown',
    status: String(payload.mode || 'candidate'),
    card_scope: context.description || context.title || '',
    inclusion_rules: context.inclusion_rules || [],
    exclusion_rules: context.exclusion_rules || [],
    allowed_actions: ['read', 'append', 'summarize'],
    confidence_score: Number(context.confidence_score || 0.75),
    metadata: {
      generatedFromParentContext: true,
      parentContextSlug: contextSlug,
      parentContextId: context.id,
      generatedAt: new Date().toISOString()
    }
  };
  const inserted = await memoryInsertRows('memory_cards_v2', [card]);
  const cardRow = inserted[0] || card;
  await memoryInsertRows('memory_card_sources_v2', []).catch(() => []);
  await memoryInsertRows('memory_card_events', [{
    card_id: cardRow.id || null,
    context_id: context.id,
    event_type: 'card_generated_from_parent_context',
    event_payload: JSON.stringify({ contextSlug, cardSlug }),
    created_at: new Date().toISOString()
  }]).catch(() => []);
  return {
    ok: true,
    type: 'memory_card_generate_from_parent_context',
    skipped: false,
    card: cardRow
  };
}

async function analyzeAndImportMemory(payload = {}) {
  const title = String(payload.title || 'Memory Import').trim();
  const rawContent = String(payload.rawContent || '');
  const sourceOrigin = String(payload.sourceOrigin || 'unknown');
  const sourceType = String(payload.sourceType || 'chat_export');
  if (!rawContent.trim()) throw new Error('rawContent obrigatorio');

  const fileRows = await memoryInsertRows('memory_files', [{
    title,
    slug: slugifyMemoryContext(title),
    file_type: sourceType,
    content_format: 'text/plain',
    raw_content: rawContent,
    normalized_content: rawContent,
    source_origin: sourceOrigin,
    source_ref: payload.sourceRef || null,
    checksum: String(rawContent.length),
    metadata: { importedAt: new Date().toISOString() }
  }]);
  const file = fileRows[0];
  const units = analyzeMemoryTextUnits(rawContent);
  const userRoutingRules = normalizeMemoryRuleList(payload.userRoutingRules);
  const contextRoutingRules = [];
  const cardSemanticInstructions = safeJsonObject(payload.cardSemanticInstructions, {});
  const manualCorrections = normalizeMemoryRuleList(payload.manualCorrections);
  const detectedContexts = [];
  const semanticUnits = [];
  for (const unit of units) {
    const detection = detectParentContext(unit.summary, {
      metadata: { domain: 'unknown' },
      userRoutingRules,
      contextRoutingRules,
      cardSemanticInstructions,
      manualCorrections
    });
    const contextSlug = slugifyMemoryContext(detection.contextSlug || 'a-revisar');
    const contextTitle = detection.contextSlug === 'a-revisar' ? 'A revisar' : contextSlug.replace(/-/g, ' / ');
    const existingContext = await fetchMemoryContextBySlug(contextSlug).catch(() => null);
    let contextId = existingContext?.id || null;
    if (!existingContext) {
      const created = await memoryInsertRows('memory_contexts', [{
        title: contextTitle,
        slug: contextSlug,
        domain: detection.domain || 'unknown',
        description: detection.reason || '',
        inclusion_rules: [],
        exclusion_rules: [],
        status: 'draft',
        confidence_score: detection.confidenceScore || 0.5,
        metadata: {
          routingRules: [],
          manualAliases: [],
          mergeCandidates: [],
          splitRules: [],
          consumptionMarkdown: ''
        }
      }]);
      contextId = created[0]?.id || null;
    }
    if (contextId && file?.id) {
      await memoryInsertRows('memory_context_files', [{
        context_id: contextId,
        file_id: file.id,
        relation_type: 'semantic_unit',
        relevance_score: detection.confidenceScore || 0.5,
        inclusion_reason: detection.reason || '',
        exclusion_reason: '',
        metadata: { sourceOrigin, unitIndex: unit.index }
      }]).catch(() => []);
    }
    detectedContexts.push({
      title: contextTitle,
      slug: contextSlug,
      domain: detection.domain || 'unknown',
      confidenceScore: detection.confidenceScore || 0.5,
      existingContextId: existingContext?.id || null,
      createdContextId: existingContext ? null : contextId,
      unitsCount: 1,
      reason: detection.reason || '',
      source: detection.source
    });
    semanticUnits.push({
      parentContextSlug: contextSlug,
      title: unit.title,
      summary: unit.summary,
      confidenceScore: detection.confidenceScore || 0.5,
      inclusionReason: detection.reason || '',
      sourceRange: unit.sourceRange
    });
  }
  return {
    ok: true,
    type: 'memory_import_analysis',
    file: {
      id: file?.id || null,
      title,
      sourceOrigin
    },
    detectedContexts,
    semanticUnits,
    warnings: [],
    errors: []
  };
}

async function memoryUpsertRows(table, rows, conflictTarget) {
  assertAllowedMemoryTable(table);
  if (!Array.isArray(rows) || !rows.length) return [];
  const { url: base } = getMemorySupabaseConfig();
  const url = new URL(`${base}/rest/v1/${table}`);
  if (conflictTarget) url.searchParams.set('on_conflict', conflictTarget);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: memorySupabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    }),
    body: JSON.stringify(rows)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${table} ${response.status}: ${text.slice(0, 180)}`);
  return JSON.parse(text || '[]');
}

async function handleRoute(req, res, url) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'worion-api',
      version: '0.1.0',
      local: true,
      time: new Date().toISOString()
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/models/route') {
    const payload = await readJson(req);
    const message = String(payload.message || payload.content || '');
    if (!message.trim()) {
      return sendJson(res, 400, { ok: false, error: 'message obrigatorio' });
    }

    const selection = selectModelForMessage(message, {
      executionRoute: payload.executionRoute,
      route: payload.route
    });

    return sendJson(res, 200, {
      ok: true,
      ...buildTenantContext(payload),
      router_enabled: isModelRouterEnabled(),
      selection
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat/messages') {
    const payload = await readJson(req);
    if (!payload.messages || !Array.isArray(payload.messages)) {
      return sendJson(res, 400, {
        ok: false,
        ...buildTenantContext(payload),
        error: 'messages obrigatorio e deve ser array'
      });
    }

    try {
      const result = await processChatMessages(payload);
      return sendJson(res, 200, {
        ok: true,
        ...buildTenantContext(payload),
        ...result
      });
    } catch (error) {
      const statusCode = getHttpErrorStatus(error);
      const diagnostics = getChatPayloadDiagnostics(payload);
      console.error('[CHAT] Erro ao processar mensagens:', {
        error: error.message,
        statusCode,
        diagnostics
      });
      return sendJson(res, statusCode, {
        ok: false,
        ...buildTenantContext(payload),
        error: error.message || 'Erro ao processar chat',
        diagnostics
      });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/memory/search') {
    const params = getQueryObject(url);
    const query = String(params.q || params.query || '').trim();
    console.log('[MEMORY SEARCH] Tentando Worion API local');
    if (!query) {
      console.log('[MEMORY SEARCH] Resultados encontrados: 0');
      return sendJson(res, 200, {
        ok: true,
        ...buildTenantContext(params),
        results: [],
        stub: true
      });
    }
    const cleanQuery = /\bworion\b/i.test(query) ? 'Worion' : query;
    const results = await memoryFetchRows('memory_chunks', {
      select: 'conversation_id,source_id,chunk_index,role,content,created_at',
      content: `ilike.*${cleanQuery.replace(/[%*]/g, '')}*`,
      source_id: params.source_id ? `eq.${params.source_id}` : '',
      order: 'created_at.desc',
      limit: params.limit || 20
    });
    console.log(`[MEMORY SEARCH] Resultados encontrados: ${results.length}`);
    return sendJson(res, 200, {
      ok: true,
      ...buildTenantContext(params),
      success: true,
      query: cleanQuery,
      source_id: params.source_id || null,
      results: results.map(row => ({
        conversation_id: row.conversation_id,
        source_id: row.source_id,
        role: row.role,
        chunk_index: row.chunk_index,
        snippet: memorySnippet(row.content, cleanQuery),
        created_at: row.created_at
      }))
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/memory/audit') {
    const audit = await buildMemoryAudit();
    return sendJson(res, 200, audit);
  }

  if (req.method === 'GET' && url.pathname === '/api/memory/contexts') {
    const params = getQueryObject(url);
    const result = await memoryAuditFetch('memory_contexts', {
      select: params.select || '*',
      order: params.order || 'created_at.asc',
      limit: params.limit || '100'
    });
    return sendJson(res, 200, {
      ok: true,
      type: 'memory_contexts',
      rows: result.rows || []
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/memory/contexts/seed') {
    const result = await seedMemoryCanonicalContexts();
    return sendJson(res, 200, result);
  }

  if (req.method === 'GET' && url.pathname === '/api/memory/cards') {
    const params = getQueryObject(url);
    const result = await memoryAuditFetch('memory_cards_v2', {
      select: params.select || '*',
      order: params.order || 'created_at.asc',
      limit: params.limit || '100'
    });
    return sendJson(res, 200, {
      ok: true,
      type: 'memory_cards_v2',
      rows: result.rows || []
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/memory/files') {
    const params = getQueryObject(url);
    const result = await memoryAuditFetch('memory_files', {
      select: params.select || '*',
      order: params.order || 'created_at.asc',
      limit: params.limit || '100'
    });
    return sendJson(res, 200, {
      ok: true,
      type: 'memory_files',
      rows: result.rows || []
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/memory/context-files') {
    const params = getQueryObject(url);
    const result = await memoryAuditFetch('memory_context_files', {
      select: params.select || '*',
      order: params.order || 'created_at.asc',
      limit: params.limit || '500'
    });
    return sendJson(res, 200, {
      ok: true,
      type: 'memory_context_files',
      rows: result.rows || []
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/memory/import/analyze') {
    const payload = await readJson(req);
    const result = await analyzeAndImportMemory(payload);
    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname === '/api/memory/context-routing-rules') {
    const payload = await readJson(req);
    const result = await upsertMemoryContextRoutingRules(payload);
    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname === '/api/memory/contexts/update') {
    const payload = await readJson(req);
    const result = await updateMemoryContext(payload);
    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/memory/cards/') && url.pathname.endsWith('/semantic-instructions')) {
    const cardId = url.pathname.split('/')[4];
    const payload = await readJson(req);
    const result = await updateMemoryCardSemanticInstructions(cardId, payload);
    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname === '/api/memory/cards/generate-from-parent-context') {
    const payload = await readJson(req);
    const result = await generateMemoryCardFromParentContext(payload);
    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname.startsWith('/api/memory/cards/') && url.pathname.endsWith('/suggest-context')) {
    const cardId = url.pathname.split('/')[4];
    const result = await suggestContextForCard(cardId);
    return sendJson(res, 200, result);
  }

  if (req.method === 'GET' && url.pathname === '/api/memory/context-candidates') {
    const params = getQueryObject(url);
    const result = await buildMemoryContextCandidates(params);
    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname === '/api/memory/context-candidates/apply') {
    const payload = await readJson(req);
    const result = await applyMemoryContextCandidates(payload);
    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname === '/api/memory/context-candidates/apply-by-slug') {
    const payload = await readJson(req);
    const result = await applyMemoryContextCandidatesBySlug(payload);
    return sendJson(res, 200, result);
  }

  if (req.method === 'GET' && url.pathname === '/api/context-cards') {
    const params = getQueryObject(url);
    const table = String(params.table || 'context_memory_cards');
    const rows = await memoryFetchRows(table, params);
    return sendJson(res, 200, {
      ok: true,
      ...buildTenantContext(params),
      table,
      rows
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/context-cards') {
    const payload = await readJson(req);
    const table = String(payload.table || '');
    const rows = await memoryUpsertRows(table, payload.rows || [], payload.conflictTarget);
    return sendJson(res, 200, {
      ok: true,
      ...buildTenantContext(payload),
      table,
      rows
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/context-cards/active') {
    const payload = await readJson(req);
    const rows = await memoryUpsertRows('active_context_memory_cards', payload.rows || [], 'user_id,card_id');
    return sendJson(res, 200, {
      ok: true,
      ...buildTenantContext(payload),
      rows
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/notion/fetch') {
    const payload = await readJson(req);
    const text = String(payload.text || payload.query || payload.message || '').trim();
    if (!text) {
      return sendJson(res, 400, { ok: false, error: 'text obrigatorio' });
    }
    if (text.length > 20000) {
      return sendJson(res, 400, { ok: false, error: 'text excede limite de 20000 caracteres' });
    }
    console.log('[NOTION FETCH] Tentando Worion API local');
    const result = await fetchNotionForText(text, {
      count: payload.count,
      max_chars: payload.max_chars
    });
    console.log('[NOTION FETCH] pages=%s sourceLength=%s', Array.isArray(result.pages) ? result.pages.length : 0, String(result.source || '').length);
    console.log('[NOTION FETCH] Worion API respondeu');
    return sendJson(res, 200, {
      ok: true,
      ...buildTenantContext(payload),
      type: 'notion_fetch',
      request: {
        text,
        count: payload.count || null,
        max_chars: payload.max_chars || null
      },
      ...result
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/notion/create') {
    const payload = await readJson(req);
    const title = String(payload.title || '').trim();
    const content = String(payload.content || '').trim();

    if (!title) {
      return sendJson(res, 400, {
        ok: false,
        ...buildTenantContext(payload),
        error: 'title obrigatorio'
      });
    }

    if (title.length > 200) {
      return sendJson(res, 400, {
        ok: false,
        ...buildTenantContext(payload),
        error: 'title excede limite de 200 caracteres'
      });
    }

    if (content.length > 100000) {
      return sendJson(res, 400, {
        ok: false,
        ...buildTenantContext(payload),
        error: 'content excede limite de 100000 caracteres'
      });
    }

    try {
      console.log('[NOTION CREATE] Tentando Worion API local');
      const page = await createNotionPageInBackend(title, content);
      console.log('[NOTION CREATE] Worion API respondeu');
      console.log('[NOTION] Pagina criada:', {
        id: page.id,
        title: page.title,
        urlLength: page.url?.length || 0
      });

      return sendJson(res, 200, {
        ok: true,
        ...buildTenantContext(payload),
        type: 'notion_create',
        page: {
          id: page.id,
          url: page.url,
          title: page.title
        }
      });
    } catch (error) {
      console.error('[NOTION] Erro ao criar pagina:', error.message);
      return sendJson(res, 500, {
        ok: false,
        ...buildTenantContext(payload),
        error: error.message || 'Erro ao criar pagina no Notion'
      });
    }
  }

  // ─────────────────────────────────────────────
  // POST /memory/classify-and-create-cards
  // ─────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/memory/classify-and-create-cards') {
    try {
      console.log('[Memory] Iniciando classificação via Haiku...');

      const memoryConfig = getMemorySupabaseConfig();
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(memoryConfig.url, memoryConfig.key);

      const { data: openers, error: e1 } = await supabase
        .from('memory_chunks')
        .select('conversation_id, source_id, content, chunk_index, role')
        .order('chunk_index', { ascending: true });

      if (e1) throw e1;

      const convMap = {};
      for (const chunk of openers) {
        if (!convMap[chunk.conversation_id]) convMap[chunk.conversation_id] = [];
        if (convMap[chunk.conversation_id].length < 2)
          convMap[chunk.conversation_id].push(chunk);
      }

      const convIds = Object.keys(convMap);
      console.log(`[Memory] ${convIds.length} conversas para classificar`);

      const CATEGORIAS = ['worion','workestria','luppet','pessoal','espiritual','tcc','tecnico','outro'];
      const classified = {};

      const ANTHROPIC_KEY = await getAnthropicKeyFromVault();
      const BATCH = 10;

      for (let i = 0; i < convIds.length; i += BATCH) {
        const batch = convIds.slice(i, i + BATCH);
        await Promise.all(batch.map(async (convId) => {
          const chunks = convMap[convId];
          const preview = chunks.map(c => `[${c.role}]: ${c.content.slice(0, 300)}`).join('\n');
          const source = chunks[0]?.source_id || 'claude';

          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': ANTHROPIC_KEY,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 20,
              system: `Classifique a conversa em UMA das categorias: ${CATEGORIAS.join(', ')}. Responda APENAS com o nome da categoria, sem mais nada.`,
              messages: [{ role: 'user', content: `source: ${source}\n\n${preview}` }]
            })
          });

          const data = await resp.json();
          const cat = (data.content?.[0]?.text || 'outro').trim().toLowerCase();
          const finalCat = CATEGORIAS.includes(cat) ? cat : 'outro';
          if (!classified[finalCat]) classified[finalCat] = [];
          classified[finalCat].push(convId);
        }));
        console.log(`[Memory] Batch ${Math.floor(i/BATCH)+1} concluído`);
      }

      const cardDefs = {
        worion:     { title: 'Worion — Desenvolvimento & Arquitetura', domain: 'técnico',     icon: '🧠' },
        workestria: { title: 'Workestria — SaaS & Workflows',          domain: 'produto',     icon: '⚙️' },
        luppet:     { title: 'Luppet — Pipeline de Imagens',           domain: 'produto',     icon: '🐾' },
        pessoal:    { title: 'Rotina & Reflexões Pessoais',            domain: 'pessoal',     icon: '📔' },
        espiritual: { title: 'Espiritualidade & Filosofia',            domain: 'espiritual',  icon: '🌀' },
        tcc:        { title: 'TCC & Escrita Acadêmica',                domain: 'pesquisa',    icon: '📚' },
        tecnico:    { title: 'Técnico Geral — Infra & Código',         domain: 'técnico',     icon: '🔧' },
        outro:      { title: 'Conversas Diversas',                     domain: 'operacional', icon: '💬' },
      };

      const createdCards = [];

      for (const [cat, convList] of Object.entries(classified)) {
        if (!convList.length) continue;
        const def = cardDefs[cat] || cardDefs.outro;

        const { data: card, error: e2 } = await supabase
          .from('memory_cards_v2')
          .insert({
            title: def.title,
            slug: cat,
            domain: def.domain,
            status: 'active',
            confidence_score: 70,
            summary: `${convList.length} conversas classificadas automaticamente via Haiku.`,
            metadata: { icon: def.icon, source_conversations: convList.length, classified_at: new Date().toISOString(), auto_classified: true }
          })
          .select()
          .single();

        if (e2) { console.error(`[Memory] Erro card ${cat}:`, e2); continue; }

        for (const convId of convList) {
          await supabase
            .from('memory_chunks')
            .update({ metadata: supabase.raw(`metadata || '{"context_id": "${card.id}"}'::jsonb`) })
            .eq('conversation_id', convId);
        }

        createdCards.push({ id: card.id, title: def.title, conversations: convList.length, category: cat });
        console.log(`[Memory] ✅ ${def.title} — ${convList.length} conversas`);
      }

      return sendJson(res, 200, {
        ok: true,
        cards_created: createdCards.length,
        total_conversations: convIds.length,
        breakdown: Object.fromEntries(Object.entries(classified).map(([k,v]) => [k, v.length])),
        cards: createdCards
      });

    } catch (err) {
      console.error('[Memory] Erro:', err);
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/embedding') {
    try {
      const payload = await readJson(req);
      const text = String(payload.text || '').trim();
      if (!text) {
        return sendJson(res, 400, { ok: false, error: 'text obrigatorio' });
      }
      const apiKey = await getOpenAIKey();
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text
        })
      });
      const result = await response.text();
      if (!response.ok) {
        throw new Error(`OpenAI embedding error ${response.status}: ${result.slice(0, 300)}`);
      }
      const data = JSON.parse(result || '{}');
      if (data.error) {
        throw new Error(`OpenAI embedding error: ${JSON.stringify(data.error).slice(0, 300)}`);
      }
      const embedding = data.data?.[0]?.embedding;
      if (!Array.isArray(embedding)) {
        throw new Error('Embedding nao foi retornado pela API OpenAI');
      }
      return sendJson(res, 200, {
        ok: true,
        embedding
      });
    } catch (error) {
      const statusCode = getHttpErrorStatus(error);
      console.error('[MEMORY SEGMENTS] erro ao gerar embedding:', error.message);
      return sendJson(res, statusCode, {
        ok: false,
        error: error.message || 'Erro ao gerar embedding'
      });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/memory-segments-search') {
    try {
      const payload = await readJson(req);
      const embedding = payload.embedding || payload.query_embedding;
      const limit = Math.max(1, Math.min(Number(payload.limit || payload.match_count || 5), 100));
      const threshold = Number(payload.threshold || payload.match_threshold || 0.3);
      if (!Array.isArray(embedding) || embedding.length === 0) {
        return sendJson(res, 400, { ok: false, error: 'embedding deve ser um array nao vazio' });
      }
      const memoryConfig = getMemorySupabaseConfig();
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(memoryConfig.url, memoryConfig.key);
      const { data: segments, error } = await supabase
        .rpc('search_similar_conversation_segments', {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: limit
        });
      if (error) {
        throw new Error(`Supabase RPC error: ${error.message}`);
      }
      return sendJson(res, 200, {
        ok: true,
        segments: Array.isArray(segments) ? segments : []
      });
    } catch (error) {
      const statusCode = getHttpErrorStatus(error);
      console.log('[MEMORY SEGMENTS] erro ao buscar segmentos:', error.message);
      return sendJson(res, statusCode, {
        ok: false,
        error: error.message || 'Erro ao buscar segmentos de memoria'
      });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/memory-search-answer') {
    try {
      const payload = await readJson(req);
      const { query, segments = [], model = 'gpt-5.4-nano' } = payload;

      if (!query || !Array.isArray(segments)) {
        return sendJson(res, 400, { ok: false, error: 'query e segments obrigatorios' });
      }

      // Montar contexto de memória
      const memoryContext = segments
        .map((seg, i) => `${i + 1}. [${(seg.similarity * 100).toFixed(0)}% relevancia]\n${seg.segment_summary || seg.content}`)
        .join('\n\n');

      // Montar prompt com contexto de memória (SEM MODEL SAFETY cortando)
      const systemPrompt = `Você é Worion, assistente pessoal do usuário. Você tem acesso à memória pessoal dele.

CONTEXTO PESSOAL ENCONTRADO NA MEMÓRIA:
${memoryContext}

Responda usando APENAS as informações da memória pessoal acima. Seja específico e cite os detalhes encontrados.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ];

      // Chamar modelo usando função existente (evita duplicação)
      const response = await callOpenAIProvider(model, messages, { max_tokens: 1024 });
      const answer = response.content || '';

      console.log('[MEMORY SEARCH ANSWER] resposta gerada:', { queryLen: query.length, answerLen: answer.length });

      return sendJson(res, 200, {
        ok: true,
        answer: answer,
        segmentsUsed: segments.length,
        model: model
      });
    } catch (error) {
      const statusCode = getHttpErrorStatus(error);
      console.error('[MEMORY SEARCH ANSWER] erro:', error.message);
      return sendJson(res, statusCode, {
        ok: false,
        error: error.message || 'Erro ao gerar resposta de memória'
      });
    }
  }

  return sendJson(res, 404, { ok: false, error: 'rota nao encontrada' });
}

function createWorionApiServer(options = {}) {
  const port = Number(options.port || DEFAULT_PORT);
  const host = options.host || '127.0.0.1';
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
    handleRoute(req, res, url).catch(error => {
      const statusCode = getHttpErrorStatus(error);
      console.error('[Worion API] Erro não tratado:', {
        method: req.method,
        path: url.pathname,
        statusCode,
        error: error.message
      });
      sendJson(res, statusCode, {
        ok: false,
        error: error.message || 'erro interno'
      });
    });
  });

  return {
    server,
    port,
    host,
    start() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.off('error', reject);
          resolve({ host, port });
        });
      });
    },
    stop() {
      return new Promise(resolve => server.close(() => resolve()));
    }
  };
}

module.exports = { createWorionApiServer };

if (require.main === module) {
  const api = createWorionApiServer();
  api.start().then(({ host, port }) => {
    console.log(`[Worion API] listening on http://${host}:${port}`);
  }).catch(error => {
    console.error('[Worion API] Erro ao iniciar:', error);
    process.exit(1);
  });
}
