/**
 * @module ui/views/context-memory-constants
 * @description Constantes do sistema Context Memory
 * @dependencies Nenhuma
 * @exports CONTEXT_MEMORY_*, contextMemoryState
 */

export const CONTEXT_MEMORY_SELECTION_KEY = 'worion_context_memory_selected_cards';
export const CONTEXT_MEMORY_AUDIT_KEY = 'worion_context_memory_audit_log';
export const CONTEXT_MEMORY_CACHE_KEY = 'worion_context_memory_cache_v1';
export const CONTEXT_MEMORY_EXTRACTION_MODE = 'reversible';
export const CONTEXT_MEMORY_CHUNK_SIZE = 3500;
export const CONTEXT_MEMORY_CHUNK_OVERLAP = 350;
export const CONTEXT_MEMORY_LOCAL_CONVERSATION_LIMIT = 36;
export const CONTEXT_MEMORY_IMPORTED_CONVERSATION_LIMIT = 80;
export const CONTEXT_MEMORY_IMPORTED_CHUNK_LIMIT = 420;
export const CONTEXT_MEMORY_EXCERPT_LIMIT = 3500;
export const CONTEXT_MEMORY_EXCERPT_MIN_LENGTH = 80;

export const CONTEXT_MEMORY_TOPICS = [
  {
    id: 'ctx-worion-core-evolution',
    title: 'Worion Core Evolution',
    type: 'projeto',
    summary: 'Evolucao arquitetural e operacional do Worion Desktop.',
    keywords: ['worion core', 'worion', 'arquitetura', 'runtime', 'prompt', 'chat.js', 'contextguardian', 'chat-models', 'projeto', 'evolution']
  },
  {
    id: 'ctx-memory-system',
    title: 'Memoria, Contexto e Supabase',
    type: 'contexto',
    summary: 'Memoria operacional, importacoes, chunks, vocabulario semantico e persistencia.',
    keywords: ['memoria', 'memory', 'supabase', 'chunk', 'embedding', 'semantic', 'semantica', 'vocabulario', 'context memory', 'contexto']
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

export const contextMemoryState = {
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
  pendingContextItems: [],
  pendingHighlight: null
};
