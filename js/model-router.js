/**
 * MÓDULO: model-router.js
 * RESPONSABILIDADE: Seleção inteligente de modelos baseada em heurísticas de conteúdo e rotas de execução
 * DEPENDÊNCIAS: Nenhuma (módulo standalone)
 * EXPORTA: selectModelForMessage, isModelRouterEnabled
 * CRIADO: 2026-05-23
 *
 * LÓGICA DE ROTEAMENTO:
 * - Router/classifier → gpt-5.4-nano
 * - Writer/reducer → gpt-5.4-nano ou gpt-5.4-mini
 * - Síntese privada média → gpt-5.4-mini
 * - Análise/código pesada → gpt-5.5
 * - Pesquisa com síntese → gpt-5.4-mini ou gpt-5.5
 * - Legado não-raciocínio → gpt-4.1-mini
 */

function getRuntimeEnv(name) {
  return typeof process !== 'undefined' && process.env ? String(process.env[name] || '').trim() : '';
}

const MODEL_ROUTER_ENABLED = getRuntimeEnv('WORION_MODEL_ROUTER_ENABLED') !== 'false';

// Log de inicialização
// Debug silenciado
// console.log('[MODEL ROUTER] Inicialização:', {
//   enabled: MODEL_ROUTER_ENABLED,
//   envValue: getRuntimeEnv('WORION_MODEL_ROUTER_ENABLED'),
//   processEnvExists: typeof process !== 'undefined' && !!process.env
// });

// Mapeamento de modelos disponíveis (sincronizar com chat-models.js)
const AVAILABLE_MODELS = {
  // OpenAI
  'gpt-5.4-nano': { provider: 'openai', context: 128000, cost: 'low', specialty: 'router-classifier-writer' },
  'gpt-5.4-mini': { provider: 'openai', context: 128000, cost: 'medium', specialty: 'private-synthesis-research' },
  'gpt-5.5': { provider: 'openai', context: 128000, cost: 'high', specialty: 'heavy-reasoning-code' },
  'gpt-4.1-mini': { provider: 'openai', context: 128000, cost: 'low', specialty: 'legacy-non-reasoning' }
};

/**
 * Normaliza texto para análise (lowercase, remove acentos).
 * @param {string} text - Texto a normalizar
 * @returns {string} - Texto normalizado
 */
function normalizeForRouting(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Detecta se a mensagem é silêncio ou vazia.
 * @param {string} message - Mensagem a verificar
 * @returns {boolean}
 */
function isSilence(message) {
  const normalized = String(message || '').trim();
  return !normalized || /^\s*\.+\s*$/.test(normalized) || normalized.length < 2;
}

/**
 * Detecta se a mensagem é sobre código ou debug.
 * @param {string} normalized - Mensagem normalizada
 * @returns {boolean}
 */
function isCodeRelated(normalized) {
  const codeKeywords = [
    // Português
    'codigo', 'função', 'funcao', 'erro', 'debug', 'depurar', 'bug',
    'javascript', 'python', 'java', 'typescript', 'node', 'npm',
    'api', 'endpoint', 'json', 'xml', 'sql', 'database',
    'git', 'commit', 'branch', 'merge', 'pull request',
    'console', 'log', 'exception', 'stack trace',

    // Inglês
    'function', 'const ', 'let ', 'var ', 'import ', 'export ',
    'async', 'await', 'promise', 'callback',
    'class', 'interface', 'type', 'enum',
    'return', 'throw', 'catch', 'try'
  ];

  return codeKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Detecta se a mensagem pede comparação ou análise profunda.
 * @param {string} normalized - Mensagem normalizada
 * @returns {boolean}
 */
function isDeepAnalysis(normalized) {
  const analysisKeywords = [
    // Português
    'compare', 'comparar', 'comparacao', 'comparação',
    'analise', 'análise', 'analisa', 'analisar',
    'semelhancas', 'semelhanças', 'diferencas', 'diferenças',
    'convergencia', 'convergência', 'divergencia', 'divergência',
    'pontos em comum', 'pontos comuns',
    'versus', 'vs.', 'vs', 'entre',

    // Inglês
    'compare', 'comparison', 'analyze', 'analysis',
    'similarities', 'differences', 'convergence', 'divergence'
  ];

  const hasKeyword = analysisKeywords.some(keyword => normalized.includes(keyword));
  const wordCount = normalized.split(/\s+/).length;
  const hasMultipleEntities = normalized.split(/\s+e\s+|\s+and\s+/).length > 2;

  return hasKeyword || (wordCount > 50 && hasMultipleEntities);
}

/**
 * Detecta se a mensagem pede resumo, tradução ou organização.
 * @param {string} normalized - Mensagem normalizada
 * @returns {boolean}
 */
function isSummaryTask(normalized) {
  const summaryKeywords = [
    // Português
    'resuma', 'resumir', 'resumo',
    'traduza', 'traduzir', 'traducao', 'tradução',
    'organize', 'organizar', 'organizacao', 'organização',
    'simplifique', 'simplificar',
    'extraia', 'extrair',
    'liste', 'listar', 'lista',

    // Inglês
    'summarize', 'summary', 'tldr', 'tl;dr',
    'translate', 'translation',
    'organize', 'organization',
    'simplify', 'extract', 'list'
  ];

  return summaryKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Detecta se a mensagem pede pesquisa factual.
 * @param {string} normalized - Mensagem normalizada
 * @returns {boolean}
 */
function isResearchTask(normalized) {
  const researchKeywords = [
    // Português
    'pesquise', 'pesquisar', 'pesquisa',
    'busque', 'buscar', 'procure', 'procurar',
    'encontre', 'encontrar',
    'me conte', 'me fale', 'fale sobre',
    'quem e', 'quem é', 'o que e', 'o que é',
    'quando', 'onde', 'como', 'por que', 'porque',
    'fonte', 'fontes', 'referencia', 'referência',

    // Inglês
    'research', 'search', 'find',
    'who is', 'what is', 'when', 'where', 'how', 'why',
    'source', 'sources', 'reference'
  ];

  return researchKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Seleciona o modelo mais adequado para a mensagem do usuário.
 * @param {string} message - Mensagem do usuário
 * @param {Object} options - Opções adicionais (executionRoute, route, etc.)
 * @returns {Object} - { model: string, reason: string, confidence: number }
 */
function selectModelForMessage(message, options = {}) {
  // Se MODEL_ROUTER desabilitado, retornar padrão
  if (!MODEL_ROUTER_ENABLED) {
    return { model: 'gpt-4.1-mini', reason: 'router-disabled-legacy-non-reasoning', confidence: 1.0 };
  }

  const normalized = normalizeForRouting(message);
  const executionRoute = options.executionRoute || options.route || '';
  const rawText = String(message || '');
  const length = rawText.length;
  const hasMultipleTopics = /,\s| e | ou |compare|comparar|diferen[cç]|versus| vs\.?/i.test(rawText);
  const isCode = /function\s|\bimport\b|\.js\b|\.py\b|```\s*|erro|debug|bug|stack trace/i.test(rawText);

  // 1. Silêncio → modelo leve
  if (isSilence(message)) {
    return { model: 'gpt-4.1-mini', reason: 'silence-legacy-non-reasoning', confidence: 1.0 };
  }

  // 2. Rota de execução conhecida tem prioridade sobre heurística de conteúdo
  if (executionRoute) {
    switch (executionRoute) {
      case 'greeting':
      case 'meta_feedback':
        return { model: 'local-deterministic', reason: `route:${executionRoute}-deterministic`, confidence: 1.0 };

      case 'silence':
        return { model: 'gpt-4.1-mini', reason: 'route:silence-legacy-non-reasoning', confidence: 1.0 };

      case 'opinion':
      case 'direct_answer':
        return { model: 'gpt-5.4-nano', reason: `route:${executionRoute}-router-classifier`, confidence: 1.0 };

      case 'private_context_synthesis':
      case 'private_memory_context':
      case 'private_project_context':
        return { model: 'gpt-5.4-mini', reason: `route:${executionRoute}-private-synthesis`, confidence: 1.0 };

      case 'definition':
        return { model: 'gpt-5.4-nano', reason: 'route:definition-router-classifier', confidence: 0.9 };

      case 'focused_research':
      case 'source_check':
        return { model: 'gpt-5.4-mini', reason: `route:${executionRoute}-research-synthesis`, confidence: 0.95 };

      case 'comparative_research':
      case 'deep_research':
        return { model: 'gpt-5.5', reason: `route:${executionRoute}-heavy-research-synthesis`, confidence: 0.95 };

      case 'code':
      case 'internal_diagnostic':
        return { model: 'gpt-5.5', reason: `route:${executionRoute}-heavy-code-analysis`, confidence: 1.0 };
    }
  }

  if (isCode) {
    return { model: 'gpt-5.5', reason: 'code-debug-heavy-gpt-5.5', confidence: 0.95 };
  }

  if (length <= 200 && !hasMultipleTopics && (!executionRoute || ['direct_answer', 'definition', 'opinion'].includes(executionRoute))) {
    return { model: 'gpt-5.4-nano', reason: 'short-direct-router-nano', confidence: 0.95 };
  }

  // 3. Análise por conteúdo (heurísticas)

  // Código ou debug → DeepSeek (especializado em raciocínio lógico)
  if (isCodeRelated(normalized)) {
    return { model: 'gpt-5.5', reason: 'code-debug-heavy-gpt-5.5', confidence: 0.85 };
  }

  // Comparação ou análise profunda → GPT-5.5
  if (isDeepAnalysis(normalized)) {
    return { model: 'gpt-5.5', reason: 'deep-analysis-gpt-5.5', confidence: 0.8 };
  }

  // Resumo/redução/writer → GPT-5.4 nano
  if (isSummaryTask(normalized)) {
    return { model: 'gpt-5.4-nano', reason: 'writer-reducer-gpt-5.4-nano', confidence: 0.75 };
  }

  // Pesquisa factual → GPT-5.4 mini
  if (isResearchTask(normalized)) {
    return { model: 'gpt-5.4-mini', reason: 'research-synthesis-gpt-5.4-mini', confidence: 0.7 };
  }

  // 4. Padrão → GPT-5.4 nano para lógica/semântica leve
  return { model: 'gpt-5.4-nano', reason: 'default-router-classifier-gpt-5.4-nano', confidence: 0.5 };
}

/**
 * Verifica se o roteador de modelos está habilitado.
 * @returns {boolean}
 */
function isModelRouterEnabled() {
  return MODEL_ROUTER_ENABLED;
}

/**
 * Retorna informações sobre um modelo.
 * @param {string} modelName - Nome do modelo
 * @returns {Object|null} - Informações do modelo ou null se não encontrado
 */
function getModelInfo(modelName) {
  return AVAILABLE_MODELS[modelName] || null;
}

/**
 * Log estruturado do roteamento de modelo.
 * @param {string} message - Mensagem do usuário
 * @param {Object} selection - Resultado de selectModelForMessage
 */
function logModelSelection(message, selection) {
  const snippet = message.length > 80 ? message.slice(0, 80) + '...' : message;
  const modelInfo = getModelInfo(selection.model);

  // Debug silenciado
  // console.log('[MODEL ROUTER]', {
  //   selected: selection.model,
  //   reason: selection.reason,
  //   confidence: selection.confidence,
  //   provider: modelInfo?.provider || 'unknown',
  //   specialty: modelInfo?.specialty || 'unknown',
  //   message: snippet
  // });
}

// Exportações
if (typeof window !== 'undefined') {
  window.selectModelForMessage = selectModelForMessage;
  window.isModelRouterEnabled = isModelRouterEnabled;
  window.getModelInfo = getModelInfo;
  window.logModelSelection = logModelSelection;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    selectModelForMessage,
    isModelRouterEnabled,
    getModelInfo,
    logModelSelection
  };
}
