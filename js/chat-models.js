/**
 * MÓDULO: chat-models.js
 * RESPONSABILIDADE: chamadas aos modelos, retry, seleção de API e execução com tools
 * DEPENDÊNCIAS: js/connectors.js, js/tools.js, js/prompt.js, js/chat-routing.js, js/chat-normalization.js, js/chat.js
 * EXPORTA: getResponsesInputText, buildResponsesPrompt, extractResponsesOutputText, adaptResponsesData, callOpenAIWithRetry, getModelConfig, resolveModelId, getModelProvider, getVisibleModelName, callModelWithRetry, callOpenAIProviderWithRetry, callDeepSeekWithRetry, chooseAPIForContext, callAnthropicWithRetry, normalizeToolName, parseToolArguments, buildToolMessage, stripDsmlToolBlocks, isDsmlToolCallOnly, buildToolResultsSynthesisContext, buildFallbackResearchReply, getSearchItemsForFetch, getSourcePriorityScore, cleanResearchAxisFragment, normalizeResearchAxisText, extractCandidateResearchAxes, buildQueriesForAxis, createSearchVariations, assessSourceReliability, verifyTopicRelevance, buildBiographicalSynthesisPrompt, getDeterministicResearchQueries, runDeterministicResearchRoute, extractJsonObjectCandidate, parseTextToolCall, runOpenAIWithTools, extractOpenAIUsage, traceOpenAIResponse, traceOpenAIError
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: js/connectors.js, js/tools.js, js/prompt.js, js/chat-routing.js, js/chat-normalization.js, js/chat.js
 * PROBLEMAS CONHECIDOS: comportamento de retry e escolha de provider ainda segue regras históricas do chat original
 *
 * MELHORIAS DE PESQUISA v1 (2026-05-23):
 * - verifyTopicRelevance(): Verifica se resultados de busca são realmente relevantes para o tópico
 * - runDeterministicResearchRoute(): Agora detecta termos desconhecidos e pede esclarecimentos ao usuário
 * - Mensagens de lacunas mais detalhadas (termo desconhecido vs resultados irrelevantes)
 * - Verificação de relevância aplicada a Brave e Tavily antes de marcar como cobertura válida
 *
 * MELHORIAS DE PESQUISA v2 (2026-05-23):
 * - createSearchVariations(): Cria variações de busca para mitigar erros de digitação (remove acentos, normaliza espaços, busca exata)
 * - assessSourceReliability(): Avalia confiabilidade de fontes (.edu/.gov/Wikipedia vs blogs/redes sociais)
 * - buildBiographicalSynthesisPrompt(): Estrutura síntese biográfica comparativa (biografia, obras, controvérsias, pontos comuns)
 * - Fallback automático: Se Brave não retornar resultados relevantes, tenta variações de ortografia
 * - Estatísticas de confiabilidade por tópico: alerta quando < 50% das fontes são confiáveis
 * - Síntese comparativa aprimorada: compara apenas tópicos com material, declara lacunas explicitamente
 * - Opção de aprofundamento ao final: "Deseja que eu liste as obras principais de X?"
 */

const PRIMARY_REASONING_MODEL = 'gpt-5.4-mini';

// Constantes de proteção para Memory Context
const WORION_MEMORY_CONTEXT_BEGIN = '[WORION_MEMORY_CONTEXT_BEGIN]';
const WORION_MEMORY_CONTEXT_END = '[WORION_MEMORY_CONTEXT_END]';
const WORION_MEMORY_CONTEXT_TYPE_CARD = '[WORION_MEMORY_CONTEXT_TYPE:MEMORY_CARD]';
const WORION_MEMORY_CONTEXT_TYPE_SEGMENTS = '[WORION_MEMORY_CONTEXT_TYPE:MEMORY_SEGMENTS]';

function getResponsesInputText(content) {
  if (typeof content === 'string') return content;
  if (!content) return '';
  return Array.isArray(content) ? content.map(part => part?.text || part?.content || '').join('\n') : String(content);
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

function toDeepSeekTextContent(content) {
  if (typeof content === 'string') return content;
  if (content == null) return '';

  if (Array.isArray(content)) {
    let imageCount = 0;
    const chunks = [];

    for (const part of content) {
      if (!part) continue;
      if (typeof part === 'string') {
        chunks.push(part);
        continue;
      }
      if (part.type === 'text') {
        chunks.push(String(part.text || part.content || ''));
        continue;
      }
      if (part.type === 'image_url') {
        imageCount += 1;
        continue;
      }
      const fallback = part.text || part.content;
      if (typeof fallback === 'string') chunks.push(fallback);
    }

    if (imageCount > 0) chunks.push(`[${imageCount} imagem(ns) anexada(s)]`);
    return chunks.filter(Boolean).join('\n').trim();
  }

  if (typeof content === 'object') {
    const textCandidate = content.text || content.content;
    if (typeof textCandidate === 'string') return textCandidate;
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }

  return String(content);
}

function normalizeMessagesForDeepSeek(messages = []) {
  if (!Array.isArray(messages)) return [];
  return messages.map(message => {
    const normalized = { ...message };
    normalized.role = normalized.role || 'user';
    normalized.content = sanitizeModelContent(toDeepSeekTextContent(message?.content));
    if (normalized.content == null) normalized.content = '';
    delete normalized.attachments;
    return normalized;
  });
}

function buildResponsesPrompt(messages = []) {
  return messages.map(msg => `${msg.role}: ${getResponsesInputText(msg.content)}`).join('\n');
}

function extractResponsesOutputText(data) {
  if (data?.output_text) return data.output_text;
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;
  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    const text = content
      .map(part => part?.text || part?.content || '')
      .filter(Boolean)
      .join('');
    if (text) return text;
  }
  return '';
}

function adaptResponsesData(data) {
  return {
    choices: [{
      message: {
        content: extractResponsesOutputText(data),
        tool_calls: data?.tool_calls || []
      }
    }],
    usage: data?.usage || {}
  };
}

async function callOpenAIWithRetry(payload, retries = 2) {
  return callModelWithRetry(payload, retries);
}

function getModelConfig(modelId) {
  if (typeof getModelById === 'function') return getModelById(modelId);
  const models = Array.isArray(availableModels) ? availableModels : [];
  return models.find(model => model.id === modelId) || { id: modelId };
}

function resolveModelId(requestedModel, options = {}) {
  const model = String(requestedModel || options?.model || '').trim();
  if (!model) return PRIMARY_REASONING_MODEL;
  return model;
}

function getOpenAIModelRequest(modelId) {
  const modelConfig = getModelConfig(modelId) || {};
  const normalized = String(modelId || '').toLowerCase().replace(/\s+/g, '-');
  const isReasoningModel = /^gpt-5\.[45](?:-|$)/i.test(normalized) || normalized === 'gpt-5.5';
  return {
    apiModel: modelConfig.api_model || modelId,
    reasoningEffort: modelConfig.reasoning_effort || (isReasoningModel && normalized.includes('5.5') ? 'medium' : ''),
    endpoint: modelConfig.endpoint || (isReasoningModel ? 'responses' : 'chat')
  };
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
    input: input.length ? input : [{ role: 'user', content: buildResponsesPrompt(messages) }]
  };
}

function getModelProvider(modelId) {
  const normalized = String(modelId || '').toLowerCase();
  if (normalized.includes('deepseek')) return 'deepseek';
  if (normalized.includes('claude') || normalized.includes('anthropic')) return 'anthropic';
  if (normalized.includes('gpt') || normalized.includes('openai')) return 'openai';
  const configuredProvider = String(getModelConfig(modelId)?.provider || '').toLowerCase();
  if (['deepseek', 'openai', 'anthropic'].includes(configuredProvider)) return configuredProvider;
  return 'deepseek';
}

function getVisibleModelName(modelId) {
  return getModelConfig(modelId)?.name || modelId;
}

// ============================================
// DISPATCHER DE MODELOS — 3 ROTAS OBRIGATÓRIAS
// ============================================

/**
 * Retorna resposta local para saudações (zero API call)
 * @returns {string}
 */
function getGreetingResponse(input = '') {
  const text = String(input || '').trim().toLowerCase();
  if (/^bom dia[\s.!?]*$/i.test(text)) return 'Bom dia. Estou por aqui.';
  if (/^boa tarde[\s.!?]*$/i.test(text)) return 'Boa tarde. Estou por aqui.';
  if (/^boa noite[\s.!?]*$/i.test(text)) return 'Boa noite. Estou por aqui.';
  return 'Oi. Estou por aqui.';
}

/**
 * Seleciona modelo e provider baseado na rota de execução
 * @param {string} route - Rota de execução (trivial, focused_research, etc)
 * @param {Object} flags - Flags adicionais
 * @param {boolean} flags.isTrivial - Se é pergunta trivial
 * @param {boolean} flags.isGreeting - Se é saudação
 * @param {boolean} flags.isSelfReferential - Se é auto-referencial
 * @param {boolean} flags.hasAgentDocs - Se agente tem documentos
 * @returns {Object} { provider: string, model: string }
 */
function selectModelForRoute(route = '', flags = {}) {
  // ROTA 1 — TRIVIAL
  if (flags.isTrivial) {
    // Subcase: saudação → resposta local (sem API call)
    if (flags.isGreeting) {
      return { provider: 'local', model: 'greeting-response' };
    }
    // Demais triviais → GPT-5.4 nano
    return { provider: 'openai', model: 'gpt-5.4-nano' };
  }

  // ROTA 2 — LÓGICA / SEMÂNTICA / IDENTIDADE
  if (
    flags.isSelfReferential ||
    route === 'private_context_synthesis' ||
    route === 'private_memory_context' ||
    route === 'private_project_context' ||
    route === 'definition' ||
    route === 'opinion' ||
    route === 'direct_answer'
  ) {
    return {
      provider: 'openai',
      model: route === 'private_context_synthesis' ? 'gpt-5.4-mini' : 'gpt-5.4-nano'
    };
  }

  // ROTA 3 — PESQUISA PROFUNDA / CÓDIGO / ANÁLISE
  if (
    route === 'focused_research' ||
    route === 'comparative_research' ||
    route === 'deep_research' ||
    route === 'source_check' ||
    route === 'code' ||
    route === 'internal_diagnostic' ||
    (route === 'private_agent_context' && flags.hasAgentDocs)
  ) {
    return {
      provider: 'openai',
      model: ['deep_research', 'comparative_research', 'code', 'internal_diagnostic'].includes(route)
        ? 'gpt-5.5'
        : 'gpt-5.4-mini'
    };
  }

  return { provider: 'openai', model: PRIMARY_REASONING_MODEL };
}

// Patch 3.1 — Timeout helper para chamadas à Worion API local
function withTimeout(promise, timeoutMs, label = 'operation') {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
}

async function callModelWithRetry(payload, retries = 2) {
  const callStartTime = Date.now();
  let requestedModel = payload?.model || null;

  // DISPATCHER: Se há flags de roteamento, usar dispatcher
  if (payload?.routeFlags) {
    const dispatched = selectModelForRoute(payload.routeFlags.route, payload.routeFlags);
    console.log('[MODEL DISPATCHER]', {
      route: payload.routeFlags.route,
      flags: payload.routeFlags,
      dispatched
    });

    // Se dispatcher retornar 'local', usar resposta hardcoded
    if (dispatched.provider === 'local') {
      return {
        choices: [{
          message: {
            content: getGreetingResponse(payload.routeFlags?.input || payload.routeFlags?.content || ''),
            tool_calls: []
          },
          finish_reason: 'local'
        }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model: 'local-greeting',
        provider: 'local',
        _runtimeMetadata: { source: 'local-greeting', latencyMs: 0 }
      };
    }

    // Sobrescrever modelo se dispatcher definiu
    if (!requestedModel || dispatched.model !== PRIMARY_REASONING_MODEL) {
      requestedModel = dispatched.model;
    }
  }

  const resolvedModel = resolveModelId(requestedModel);
  const provider = getModelProvider(resolvedModel);
  const attachRuntimeMetadata = (response, source) => {
    const runtimeMetadata = {
      requestedModel,
      resolvedModelFinal: response?.model || resolvedModel,
      providerFinal: response?.provider || provider,
      source,
      latencyMs: Date.now() - callStartTime
    };
    // Debug silenciado
    // console.log('[MODEL CALL] runtimeMetadata:', runtimeMetadata);
    return {
      ...(response || {}),
      _runtimeMetadata: runtimeMetadata
    };
  };

  console.log('[MODEL ROUTE]', {
    requestedModel,
    resolvedModel,
    provider
  });

  // Tentar API local primeiro
  if (typeof worionApiChatMessages === 'function') {
    try {
      console.log('[MODEL CALL] Tentando Worion API local');
      const outputTokens = payload.max_tokens || payload.max_completion_tokens || payload.maxTokens || 4000;
      const compactedForLocal = compactMessagesForTotalBudget(
        sanitizeModelMessages(payload.messages || []),
        resolvedModel,
        outputTokens
      );
      const apiMessages = compactedForLocal.messages;
      const memoryCardCompactionLog = JSON.stringify(apiMessages);
      const protectedContextMessages = apiMessages.filter(hasProtectedMemoryContext);
      console.log('[MEMORY CARD CONTEXT] after compaction:', {
        containsMemoryCardContext: protectedContextMessages.length > 0 || memoryCardCompactionLog.includes('Memory Card') || memoryCardCompactionLog.includes('Conhecimento do card'),
        protectedContextCount: protectedContextMessages.length,
        totalChars: memoryCardCompactionLog.length
      });
      if (compactedForLocal.compacted) {
        console.warn('[MODEL SAFETY] Contexto reduzido antes da Worion API local', {
          resolvedModel,
          messagesCount: apiMessages.length
        });
      }

      // Fallback: Se contexto protegido desapareceu, restaurar minimal
      const originalMessages = sanitizeModelMessages(payload.messages || []);
      const hasProtectedAfter = apiMessages.some(hasProtectedMemoryContext);
      if (!hasProtectedAfter && originalMessages.some(hasProtectedMemoryContext)) {
        console.warn('[MODEL SAFETY] protected memory context missing after compaction; attempting minimal restoration');

        const criticalMessages = originalMessages.filter(hasProtectedMemoryContext);
        if (criticalMessages.length > 0) {
          const systemIndex = apiMessages.findIndex(m => m.role === 'system');

          if (systemIndex >= 0) {
            const messagesToInsert = criticalMessages.map(msg => ({
              ...msg,
              __worionRestoredContext: true
            }));
            apiMessages.splice(systemIndex + 1, 0, ...messagesToInsert);
            console.log('[MODEL SAFETY] Restaurado', messagesToInsert.length, 'mensagens de contexto crítico');
          }
        }
      }

      const result = await withTimeout(worionApiChatMessages(
        apiMessages,
        resolvedModel,
        {
          temperature: payload.temperature,
          max_tokens: payload.max_tokens || payload.max_completion_tokens || payload.maxTokens,
          tools: payload.tools,
          tool_choice: payload.tool_choice
        }
      ), 45000, 'worion-api-chat');

      console.log('[MODEL CALL] Worion API respondeu:', {
        model: result.model,
        provider: result.provider,
        contentLength: result.content?.length || 0
      });

      // Adaptar resposta da API local para formato esperado
      return attachRuntimeMetadata({
        choices: [{
          message: {
            content: result.content,
            tool_calls: result.tool_calls || []
          },
          finish_reason: result.finish_reason || 'stop'
        }],
        usage: result.usage || {},
        model: result.model,
        provider: result.provider
      }, 'worion-api');
    } catch (error) {
      console.warn('[MODEL CALL] Worion API local falhou/timeout, usando fallback direct-provider:', error.message);
    }
  }

  // Fallback: chamada direta ao provedor
  console.log('[MODEL CALL] Usando fallback direto ao provedor com contexto ja reduzido quando necessario');
  if (provider === 'deepseek') {
    const response = await callDeepSeekWithRetry({ ...payload, model: resolvedModel }, retries);
    return attachRuntimeMetadata(response, 'direct-provider');
  }

  if (provider === 'openai') {
    const response = await callOpenAIProviderWithRetry({ ...payload, model: resolvedModel }, retries);
    return attachRuntimeMetadata(response, 'direct-provider');
  }

  if (provider === 'anthropic') {
    const response = await callAnthropicWithRetry({ ...payload, model: resolvedModel }, retries);
    return attachRuntimeMetadata(response, 'direct-provider');
  }

  throw new Error(`[MODEL ROUTE] Provider desconhecido para modelo: ${resolvedModel}`);
}

// Proteção contra estouro de TPM: limites máximos por modelo
const MODEL_MAX_TOKENS = {
  'gpt-5.4-nano': 8000,
  'gpt-5.4-mini': 12000,
  'gpt-5.5': 16000,
  'gpt-4.1-mini': 8000,
  'gpt-4o-mini': 8000,
  'gpt-4o': 12000,
  'deepseek-v4-pro': 16000,
  'deepseek-chat': 16000,
  'claude-sonnet-4-20250514': 16000
};

function getSafeMaxTokens(model, requestedMaxTokens) {
  const modelLimit = MODEL_MAX_TOKENS[model] || 16000;
  const requestedLimit = requestedMaxTokens || 4000;
  const safeLimit = Math.min(requestedLimit, modelLimit);
  if (safeLimit < requestedLimit) {
    console.log(`[MODEL SAFETY] Reduzindo max_tokens de ${requestedLimit} para ${safeLimit} (limite do modelo ${model})`);
  }
  return safeLimit;
}

const MODEL_SAFE_TOTAL_TOKENS = {
  'gpt-5.4-nano': 18000,
  'gpt-5.4-mini': 32000,
  'gpt-5.5': 42000,
  'gpt-4.1-mini': 24000,
  'gpt-4o': 26000,
  'gpt-4o-mini': 24000,
  'deepseek-v4-pro': 42000,
  'deepseek-chat': 42000
};

function estimateTextTokens(value = '') {
  return Math.ceil(String(value || '').length / 4);
}

function getMessageTextForBudget(message = {}) {
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(part => part?.text || part?.content || '').join('\n');
  }
  return content ? JSON.stringify(content) : '';
}

function estimateMessagesTokens(messages = []) {
  return messages.reduce((total, message) => total + estimateTextTokens(getMessageTextForBudget(message)) + 8, 0);
}

// Funções de proteção para Memory Context antes da compactação
function hasProtectedMemoryContext(message) {
  const content = String(message?.content || '');

  return (
    content.includes(WORION_MEMORY_CONTEXT_BEGIN) ||
    content.includes(WORION_MEMORY_CONTEXT_TYPE_CARD) ||
    content.includes(WORION_MEMORY_CONTEXT_TYPE_SEGMENTS) ||
    content.includes('[MEMORY CARD CONTEXT]') ||
    content.includes('[MEMORY SEGMENTS]') ||
    content.includes('[WORION MEMORY CONTEXT]')
  );
}

function protectMemoryContextMessage(message) {
  const content = String(message?.content || '');

  if (!hasProtectedMemoryContext(message)) {
    return message;
  }

  if (content.includes(WORION_MEMORY_CONTEXT_BEGIN)) {
    return message;
  }

  return {
    ...message,
    __worionProtectedContext: true,
    __worionContextType: 'memory',
    content: [
      WORION_MEMORY_CONTEXT_BEGIN,
      WORION_MEMORY_CONTEXT_TYPE_CARD,
      '[INSTRUCTION] The following block is active private memory context. Use it when answering the user.',
      content,
      WORION_MEMORY_CONTEXT_END
    ].join('\n')
  };
}

function compactProtectedMemoryContext(content, maxChars) {
  const text = String(content || '');

  if (text.length <= maxChars) {
    return text;
  }

  const beginIndex = text.indexOf(WORION_MEMORY_CONTEXT_BEGIN);

  if (beginIndex === -1) {
    return compactTextMiddle(text, maxChars);
  }

  const headerBudget = 1200;
  const tailBudget = 800;
  const bodyBudget = Math.max(2000, maxChars - headerBudget - tailBudget - 300);

  const head = text.slice(0, headerBudget);
  const tail = text.slice(-tailBudget);
  const bodyStart = headerBudget;
  const bodyEnd = Math.max(bodyStart, text.length - tailBudget);
  const body = text.slice(bodyStart, bodyEnd).slice(0, bodyBudget);

  return [
    head,
    '',
    '[WORION_MEMORY_CONTEXT_TRUNCATED_BY_BUDGET]',
    body,
    '',
    tail.includes(WORION_MEMORY_CONTEXT_END) ? tail : `${tail}\n${WORION_MEMORY_CONTEXT_END}`
  ].join('\n');
}

function compactTextMiddle(text = '', maxChars = 12000, label = 'conteudo') {
  const source = String(text || '');
  if (source.length <= maxChars) return source;
  const head = Math.floor(maxChars * 0.58);
  const tail = Math.max(1000, maxChars - head - 220);
  return [
    source.slice(0, head),
    '',
    `[${label} compactado pelo Worion: ${source.length - head - tail} caracteres omitidos para respeitar limite de tokens.]`,
    '',
    source.slice(-tail)
  ].join('\n');
}

function compactMessageForBudget(message = {}, maxChars = 12000) {
  const copy = { ...message };
  if (typeof copy.content === 'string') {
    // Usar compactação inteligente para contexto protegido
    const compactFunc = hasProtectedMemoryContext(message) ? compactProtectedMemoryContext : compactTextMiddle;
    copy.content = compactFunc(copy.content, maxChars, copy.role === 'system' ? 'system prompt' : 'mensagem');
    return copy;
  }
  if (Array.isArray(copy.content)) {
    copy.content = copy.content.map(part => {
      if (!part || part.type !== 'text') return part;
      const text = part.text || part.content || '';
      const compactFunc = hasProtectedMemoryContext(message) ? compactProtectedMemoryContext : compactTextMiddle;
      return { ...part, text: compactFunc(text, maxChars, 'parte textual') };
    });
    return copy;
  }
  return copy;
}

function compactMessagesForTotalBudget(messages = [], model = '', outputTokens = 4000) {
  const totalBudget = MODEL_SAFE_TOTAL_TOKENS[model] || 30000;
  const inputBudget = Math.max(4000, totalBudget - Math.min(outputTokens, 6000) - 1200);
  if (estimateMessagesTokens(messages) <= inputBudget) return { messages, compacted: false };

  // Proteger contexto crítico ANTES de compactação
  const protectedMessages = messages.map(protectMemoryContextMessage);

  const systemMessages = protectedMessages.filter(message => message.role === 'system');
  const conversationMessages = protectedMessages.filter(message => message.role !== 'system');

  // Compactar TODOS os system messages (incluindo memória) para evitar estouro TPM
  let compacted = [
    ...systemMessages.map(message => compactMessageForBudget(message, 16000)), // REDUZIDO: 28k→16k
    ...conversationMessages.slice(-10).map(message => compactMessageForBudget(message, 10000))
  ];

  while (estimateMessagesTokens(compacted) > inputBudget && compacted.filter(message => message.role !== 'system').length > 4) {
    const firstNonSystem = compacted.findIndex(message => message.role !== 'system');
    if (firstNonSystem < 0) break;
    compacted.splice(firstNonSystem, 1);
  }

  if (estimateMessagesTokens(compacted) > inputBudget) {
    compacted = [
      ...systemMessages.map(message => compactMessageForBudget(message, 18000)),
      ...conversationMessages.slice(-4).map(message => compactMessageForBudget(message, 7000))
    ];
  }

  if (estimateMessagesTokens(compacted) > inputBudget) {
    compacted = compacted.map(message => compactMessageForBudget(message, message.role === 'system' ? 12000 : 4000));
  }

  console.warn('[MODEL SAFETY] Prompt compactado para evitar estouro de TPM', {
    model,
    beforeTokens: estimateMessagesTokens(messages),
    afterTokens: estimateMessagesTokens(compacted),
    inputBudget,
    outputTokens
  });

  return { messages: compacted, compacted: true };
}

async function callOpenAIProviderWithRetry(payload, retries = 2) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await callOpenAIProvider(payload);
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function callOpenAIProvider(payload) {
  const selectedModel = resolveModelId(payload.model);
  if (getModelProvider(selectedModel) !== 'openai') {
    throw new Error(`[MODEL ROUTE] callOpenAIProvider recebeu modelo nao OpenAI: ${selectedModel}`);
  }
  const modelRequest = getOpenAIModelRequest(selectedModel);
  console.log('[MODEL CALL] OpenAI', {
    model: selectedModel,
    apiModel: modelRequest.apiModel,
    reasoningEffort: modelRequest.reasoningEffort || undefined
  });
  if (!openaiKey && typeof getOpenAIKey === 'function') openaiKey = await getOpenAIKey();
  if (!openaiKey) throw new Error('OpenAI API key indisponivel.');

  const requestedTokens = payload.max_completion_tokens ?? payload.max_tokens ?? payload.maxTokens ?? 1200;
  let safeMaxTokens = getSafeMaxTokens(selectedModel, requestedTokens);
  const safeTotalTokens = MODEL_SAFE_TOTAL_TOKENS[selectedModel] || 30000;
  const estimatedInputTokens = estimateMessagesTokens(payload.messages || []);
  if (estimatedInputTokens + safeMaxTokens > safeTotalTokens) {
    const reducedOutput = Math.max(1200, Math.min(safeMaxTokens, safeTotalTokens - estimatedInputTokens - 1200));
    if (reducedOutput < safeMaxTokens) {
      console.warn('[MODEL SAFETY] Reduzindo saida OpenAI para caber no TPM', {
        model: selectedModel,
        estimatedInputTokens,
        from: safeMaxTokens,
        to: reducedOutput
      });
      safeMaxTokens = reducedOutput;
    }
  }
  const compacted = compactMessagesForTotalBudget(payload.messages || [], selectedModel, safeMaxTokens);
  const compactedInputTokens = estimateMessagesTokens(compacted.messages);
  if (compactedInputTokens + safeMaxTokens > safeTotalTokens) {
    safeMaxTokens = Math.max(800, safeTotalTokens - compactedInputTokens - 800);
    console.warn('[MODEL SAFETY] Ajuste final de saida apos compactacao', {
      model: selectedModel,
      compactedInputTokens,
      safeMaxTokens
    });
  }

  if (modelRequest.endpoint === 'responses') {
    const responseInput = buildResponsesInput(compacted.messages);
    const responsesPayload = {
      model: modelRequest.apiModel,
      input: responseInput.input,
      max_output_tokens: safeMaxTokens
    };

    if (responseInput.instructions) responsesPayload.instructions = responseInput.instructions;
    const reasoningEffort = payload.reasoningEffort || payload.reasoning_effort || modelRequest.reasoningEffort;
    if (reasoningEffort) responsesPayload.reasoning = { effort: reasoningEffort };
    if (!reasoningEffort) responsesPayload.temperature = payload.temperature ?? 0.4;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: currentResponseController?.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify(responsesPayload)
    });

    const text = await response.text();
    if (response.ok) {
      const data = text ? JSON.parse(text) : {};
      if (data.error) throw new Error(`OpenAI Responses error: ${JSON.stringify(data.error).slice(0, 300)}`);
      const adapted = adaptResponsesData(data);
      await traceOpenAIResponse({
        model: selectedModel,
        prompt: responseInput.instructions || responseInput.input?.[0]?.content || '',
        data,
        adapted
      });
      return {
        ...adapted,
        model: data.model || modelRequest.apiModel,
        usage: data.usage || adapted.usage || {}
      };
    }

    const error = new Error(`OpenAI Responses error ${response.status}: ${text.slice(0, 300)}`);
    await traceOpenAIError(error, selectedModel, responseInput.instructions || responseInput.input?.[0]?.content || '');
    throw error;
  }

  const chatPayload = {
    model: modelRequest.apiModel,
    messages: compacted.messages,
    max_completion_tokens: safeMaxTokens
  };

  chatPayload.temperature = payload.temperature ?? 0.4;

  if (payload.tools?.length) {
    chatPayload.tools = payload.tools;
    chatPayload.tool_choice = payload.tool_choice ?? 'auto';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: currentResponseController?.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify(chatPayload)
  });

  const text = await response.text();
  if (response.ok) {
    const data = text ? JSON.parse(text) : {};
    if (data.error) throw new Error(`OpenAI error: ${JSON.stringify(data.error).slice(0, 300)}`);
    await traceOpenAIResponse({
      model: selectedModel,
      prompt: chatPayload.messages?.[0]?.content || '',
      data,
      adapted: data
    });
    return data;
  }

  const error = new Error(`OpenAI error ${response.status}: ${text.slice(0, 300)}`);
  await traceOpenAIError(error, selectedModel, chatPayload.messages?.[0]?.content || '');
  throw error;
}

async function callDeepSeekWithRetry(payload, retries = 2) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await callDeepSeek(payload);
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  console.error('[MODEL CALL] DeepSeek falhou sem fallback automatico', {
    model: payload?.model || PRIMARY_REASONING_MODEL,
    error: lastError?.message || String(lastError || '')
  });
  throw lastError;
}

async function callDeepSeek(payload) {
  const selectedModel = resolveModelId(payload.model);
  console.log('[MODEL CALL] DeepSeek', { model: selectedModel });
  const modelConfig = getModelConfig(selectedModel) || {};
  const baseUrl = String(modelConfig.base_url || 'https://api.deepseek.com').replace(/\/$/, '');
  if (!deepseekKey && typeof getDeepSeekKey === 'function') deepseekKey = await getDeepSeekKey();
  if (!deepseekKey) throw new Error('DeepSeek API key indisponivel.');

  const requestedTokens = payload.max_completion_tokens ?? payload.max_tokens ?? payload.maxTokens ?? 8000;
  const safeMaxTokens = getSafeMaxTokens(selectedModel, requestedTokens);

  const chatPayload = {
    model: selectedModel,
    messages: normalizeMessagesForDeepSeek(payload.messages || []),
    temperature: payload.temperature ?? 0.4,
    max_tokens: safeMaxTokens
  };

  if (payload.tools?.length) {
    chatPayload.tools = payload.tools;
    chatPayload.tool_choice = payload.tool_choice ?? 'auto';
  }

  if (modelConfig.thinking_mode) {
    const thinkingEnabled = payload.thinking !== 'disabled';
    chatPayload.reasoning_effort = payload.reasoningEffort || payload.reasoning_effort || 'high';
    chatPayload.extra_body = { thinking: { type: thinkingEnabled ? 'enabled' : 'disabled' } };
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    signal: currentResponseController?.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekKey}`
    },
    body: JSON.stringify(chatPayload)
  });

  const text = await response.text();
  if (response.ok) {
    const data = text ? JSON.parse(text) : {};
    if (data.error) throw new Error(`DeepSeek error: ${JSON.stringify(data.error).slice(0, 300)}`);
    await traceOpenAIResponse({
      model: selectedModel,
      prompt: chatPayload.messages?.[0]?.content || '',
      data,
      adapted: data
    });
    return data;
  }

  if (response.status === 400) console.error('[DEEPSEEK ERROR BODY]', text);
  const error = new Error(`DeepSeek error ${response.status}: ${text.slice(0, 300)}`);
  await traceOpenAIError(error, selectedModel, chatPayload.messages?.[0]?.content || '');
  throw error;
}

function chooseAPIForContext(isSearch = false, verificationDomain = 'general') {
  return 'deepseek';
}

async function callAnthropicWithRetry(payload, retries = 2) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await callAnthropic(payload);
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function callAnthropic(payload) {
  const selectedModel = resolveModelId(payload.model);
  if (getModelProvider(selectedModel) !== 'anthropic') {
    throw new Error(`[MODEL ROUTE] callAnthropic recebeu modelo nao Anthropic: ${selectedModel}`);
  }
  console.log('[MODEL CALL] Anthropic', { model: selectedModel });
  if (!anthropicKey && typeof getAnthropicKey === 'function') anthropicKey = await getAnthropicKey();
  if (!anthropicKey) throw new Error('Anthropic API key indisponivel.');

  const systemMessage = payload.messages?.find(message => message.role === 'system')?.content || '';
  const anthropicMessages = [];

  for (const message of (payload.messages || [])) {
    if (message.role === 'system') continue;

    if (message.role === 'tool') {
      anthropicMessages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: message.tool_call_id,
          content: message.content
        }]
      });
    } else if (message.role === 'assistant' && message.tool_calls?.length) {
      const content = [];
      if (message.content) content.push({ type: 'text', text: message.content });
      for (const toolCall of message.tool_calls) {
        content.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function.name,
          input: parseToolArguments(toolCall.function.arguments)
        });
      }
      anthropicMessages.push({ role: 'assistant', content });
    } else {
      anthropicMessages.push({
        role: message.role,
        content: message.content
      });
    }
  }

  const requestedTokens = payload.max_completion_tokens || payload.max_tokens || 1200;
  const safeMaxTokens = getSafeMaxTokens(selectedModel, requestedTokens);

  const anthropicPayload = {
    model: selectedModel,
    max_tokens: safeMaxTokens,
    messages: anthropicMessages,
    temperature: payload.temperature ?? 0.4
  };

  if (systemMessage) anthropicPayload.system = systemMessage;
  if (payload.tools?.length) {
    anthropicPayload.tools = payload.tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters
    }));
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: currentResponseController?.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(anthropicPayload)
  });

  const text = await response.text();
  if (response.ok) {
    const data = text ? JSON.parse(text) : {};
    if (data.error) throw new Error(`Anthropic error: ${JSON.stringify(data.error).slice(0, 300)}`);
    const textContent = data.content?.find(item => item.type === 'text')?.text || '';
    const toolUses = data.content?.filter(item => item.type === 'tool_use') || [];

    return {
      id: data.id,
      model: data.model,
      choices: [{
        message: {
          role: 'assistant',
          content: textContent,
          tool_calls: toolUses.length > 0 ? toolUses.map(item => ({
            id: item.id,
            type: 'function',
            function: {
              name: item.name,
              arguments: JSON.stringify(item.input || {})
            }
          })) : undefined
        },
        finish_reason: data.stop_reason === 'tool_use' ? 'tool_calls' : data.stop_reason
      }],
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }

  throw new Error(`Anthropic error ${response.status}: ${text.slice(0, 300)}`);
}

function normalizeToolName(name) {
  return String(name || '').trim();
}

function parseToolArguments(rawArgs) {
  if (!rawArgs) return {};
  if (typeof rawArgs === 'object') return rawArgs;
  try { return JSON.parse(rawArgs); } catch { return {}; }
}

function buildToolMessage(toolCall, toolName, toolResult) {
  return {
    role: 'tool',
    tool_call_id: toolCall.id,
    name: toolName,
    content: JSON.stringify(toolResult)
  };
}

function stripDsmlToolBlocks(content = '') {
  return String(content || '').replace(/```tool[\s\S]*?```/gi, '').trim();
}

function isDsmlToolCallOnly(content = '') {
  return /^```tool[\s\S]*?```$/i.test(String(content || '').trim());
}

function buildToolResultsSynthesisContext(toolResults = [], limit = 18000) {
  return toolResults.slice(0, 20).map(item => JSON.stringify(item).slice(0, limit)).join('\n\n');
}

function buildFallbackResearchReply(toolResults = []) {
  return toolResults.length
    ? `Encontrei ${toolResults.length} resultado(s), mas nao consegui sintetizar uma resposta conclusiva.`
    : 'Nao consegui encontrar evidencias suficientes.';
}

function getSearchItemsForFetch(searchResult = {}, limit = 3) {
  const seen = new Set();
  const items = [
    ...(searchResult.results || []),
    ...(searchResult.news || []),
    ...(searchResult.discussions || [])
  ];
  return items.filter(item => {
    const url = String(item?.url || '').trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  }).slice(0, limit);
}

function getResearchQueryTokens(query = '') {
  const stop = new Set([
    'sobre', 'entre', 'como', 'para', 'pela', 'pelo', 'essa', 'esse', 'esta', 'este',
    'uma', 'umas', 'uns', 'que', 'das', 'dos', 'com', 'sem', 'mais', 'menos', 'quais',
    'qual', 'quem', 'onde', 'quando', 'porque', 'historia', 'historico', 'origem',
    'significado', 'curiosidade', 'curiosidades', 'fonte', 'fontes', 'oficial',
    'confiavel', 'confiaveis', 'lista', 'relacao', 'conte', 'conta', 'fale'
  ]);
  return [...new Set((String(query || '').toLowerCase().match(/[a-zà-ÿ0-9]{4,}/gi) || [])
    .map(word => word.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .filter(word => !stop.has(word)))]
    .slice(0, 12);
}

function getSearchItemRelevanceScore(item = {}, query = '') {
  const tokens = getResearchQueryTokens(query);
  if (!tokens.length) return 0;
  const haystack = normalizeResearchAxisText([
    item.title,
    item.url,
    item.description,
    item.snippet,
    Array.isArray(item.extra_snippets) ? item.extra_snippets.join(' ') : item.extra_snippets
  ].filter(Boolean).join(' '));
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function getSourcePriorityScore(item = {}) {
  const url = String(item.url || '').toLowerCase();
  const title = String(item.title || '').toLowerCase();
  const text = `${url} ${title}`;
  if (/\.(gov|edu|mil)(\.|\/|$)|gov\.br|jus\.br|leg\.br|who\.int|un\.org|europa\.eu/i.test(text)) return 100;
  if (/wikipedia\.org|britannica\.com|stanford\.edu|mit\.edu|harvard\.edu|nature\.com|sciencedirect\.com|springer\.com|jstor\.org/i.test(text)) return 80;
  if (/docs\.|documentation|manual|whitepaper|pdf/i.test(text)) return 70;
  if (/blog|medium\.com|reddit\.com|quora\.com|forum/i.test(text)) return 20;
  return 50;
}

function sourceQualityScore(source = {}, queryType = 'general') {
  const url = String(source.url || '').toLowerCase();
  const title = String(source.title || '').toLowerCase();
  const text = `${url} ${title}`;
  let score = 50;
  const reasons = [];

  if (/\.(gov|edu|mil)(\.|\/|$)|\.ac\.|stanford\.edu|mit\.edu|harvard\.edu|ox\.ac\.uk|cam\.ac\.uk/i.test(text)) {
    score += 35;
    reasons.push('academic_domain');
  }
  if (/britannica\.com|plato\.stanford\.edu|encyclopedia\.com/i.test(text)) {
    score += 35;
    reasons.push('encyclopedia');
  }
  if (/turingarchive\.org|turing\.ac\.uk|tesla-museum\.org|ieee\.org|royalsociety\.org|nobelprize\.org|si\.edu|archives\.gov|loc\.gov|museum|archive/i.test(text)) {
    score += 35;
    reasons.push('museum_archive_official');
  }
  if (/history\.com/i.test(text)) {
    score += 10;
    reasons.push('secondary_history');
  }
  if (/reddit\.com|quora\.com|prezi\.com|papersowl\.com|slideshare\.net|medium\.com|essay|studocu|coursehero|scribd\.com|academia\.edu/i.test(text)) {
    score -= queryType === 'historical_comparison' ? 80 : 45;
    reasons.push('weak_ugc_essay_site');
  }
  if (/blogspot|wordpress\.com|wixsite|weebly|ranker\.com|thefamouspeople/i.test(text)) {
    score -= 35;
    reasons.push('weak_blog_seo');
  }

  return {
    score,
    accepted: score >= (queryType === 'historical_comparison' ? 55 : 35),
    reasons
  };
}

function getResearchQueryType(content = '', route = '') {
  const text = String(content || '').toLowerCase();
  if (route === 'comparative_research' && /\b(turing|tesla|biografia|historia|histórico|compare|comparar)\b/i.test(text)) {
    return 'historical_comparison';
  }
  return route || 'general';
}

function cleanResearchAxisFragment(fragment = '') {
  return String(fragment || '')
    .replace(/^[\s\-*#>]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeResearchAxisText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCandidateResearchAxes(content = '') {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  const stop = new Set(['eles', 'ele', 'ela', 'com', 'entre', 'versus', 'vs', 'gere', 'faca', 'faça', 'explique', 'aponte', 'crie', 'liste', 'compare', 'comparar', 'junte', 'conecte']);
  const fragments = text
    .split(/\b(?:versus|vs\.?| e | com | entre |,|;|\+)\b/i)
    .map(cleanResearchAxisFragment)
    .map(fragment => fragment.replace(/^(compare|comparar|junte|conecte|explique|aponte|crie|liste)\s+/i, '').trim())
    .filter(fragment => fragment.length >= 3 && fragment.length <= 80)
    .filter(fragment => !stop.has(normalizeResearchAxisText(fragment)));

  return [...new Set(fragments)].slice(0, 4);
}

function buildQueriesForAxis(label = '', originalContent = '') {
  const cleanLabel = cleanResearchAxisFragment(label);
  const normalizedLabel = normalizeResearchAxisText(cleanLabel);
  const stop = new Set([
    'sobre', 'entre', 'como', 'para', 'pela', 'pelo', 'essa', 'esse', 'uma', 'que',
    'das', 'dos', 'com', 'sem', 'mais', 'menos', 'compare', 'comparar', 'junte',
    'conecte', 'explique', 'aponte', 'crie', 'liste', ...normalizedLabel.split(/\s+/)
  ]);
  const contextTerms = [...new Set((String(originalContent || '').toLowerCase().match(/[a-zà-ÿ0-9]{4,}/gi) || [])
    .map(word => word.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .filter(word => !stop.has(word)))]
    .slice(0, 3)
    .join(' ');
  if (/\bturing\b/i.test(cleanLabel)) {
    return [
      `${cleanLabel} Britannica Stanford Encyclopedia Turing Archive`,
      `${cleanLabel} official archive biography`
    ];
  }
  if (/\btesla\b/i.test(cleanLabel)) {
    return [
      `${cleanLabel} Britannica Nikola Tesla Museum IEEE`,
      `${cleanLabel} official museum biography`
    ];
  }
  return [
    [cleanLabel, contextTerms].filter(Boolean).join(' '),
    cleanLabel
  ].filter(Boolean);
}

function isWeakResearchFollowUpText(content = '') {
  const plain = normalizeResearchAxisText(content);
  return /^(e|e ai|e agora|sim|isso|me conta|conta|conte|pode contar|cade|cade a resposta|cade a lista|qual e|quais sao|mostra|mostre|manda|traz|continue|continua|resultado|resposta)$/.test(plain)
    || /\b(cade|faltou|lista|resultado|resposta|continua|continue|me conta|pode contar)\b/.test(plain);
}

function hasResearchQuestionIntent(content = '') {
  const plain = normalizeResearchAxisText(content);
  return /\b(quem|qual|quais|quando|onde|por que|porque|como|de onde|existe|tem|houve|havia|foi|sao|eram)\b/.test(plain)
    || /\b(origem|significado|historia|historico|curiosidades?|lista|relacao|nomes|dados|informacoes|fatos|fontes?|referencias?|registro|documento|evidencia)\b/.test(plain)
    || /\b(me conte|me conta|conte|conta|fale sobre|me fale sobre|explique sobre|descreva|relate|traga|liste|pesquise|busque|procure)\b/.test(plain);
}

function isContextDependentResearchText(content = '') {
  const plain = normalizeResearchAxisText(content);
  if (isWeakResearchFollowUpText(plain)) return true;
  const words = plain.split(/\s+/).filter(Boolean);
  if (words.length <= 2 && !hasResearchQuestionIntent(plain)) return true;
  return hasResearchQuestionIntent(plain) && !/\b(de|da|do|em|para|sobre)\s+[a-z0-9]{3,}/.test(plain) && words.length <= 4;
}

function getRecentUserResearchContext(messages = [], currentContent = '') {
  if (!Array.isArray(messages)) return '';
  const current = normalizeResearchAxisText(currentContent);
  const ignored = /^(e|e ai|e agora|sim|isso|me conta|conta|conte|pode contar|cade|cade a resposta|cade a lista|qual e|quais sao|mostra|mostre|manda|traz|continue|continua|resultado|resposta)$/;
  const candidates = messages
    .filter(message => message?.role === 'user')
    .map(message => String(message.content || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter(text => normalizeResearchAxisText(text) !== current)
    .filter(text => !ignored.test(normalizeResearchAxisText(text)))
    .reverse();
  const factual = candidates.find(text => {
    const plain = normalizeResearchAxisText(text);
    return hasResearchQuestionIntent(plain);
  });
  return factual || candidates[0] || '';
}

function buildContextualResearchContent(content = '', messages = []) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  const needsContext = isContextDependentResearchText(text);
  if (!needsContext) return text;

  const recentContext = getRecentUserResearchContext(messages, text);
  if (!recentContext) return text;
  return isWeakResearchFollowUpText(text) ? recentContext : `${recentContext} ${text}`.replace(/\s+/g, ' ').trim();
}

/**
 * Cria variações de um termo para busca ampla (mitigação de erros de digitação).
 * @param {string} term - Termo original
 * @returns {string[]} - Array de variações do termo
 */
function createSearchVariations(term) {
  if (!term) return [];

  const normalized = String(term).trim();
  const variations = new Set([normalized]);

  // Variação sem acentos
  const noAccents = normalized
    .replace(/[áàâãä]/gi, 'a')
    .replace(/[éèêë]/gi, 'e')
    .replace(/[íìîï]/gi, 'i')
    .replace(/[óòôõö]/gi, 'o')
    .replace(/[úùûü]/gi, 'u')
    .replace(/[ç]/gi, 'c')
    .replace(/[ñ]/gi, 'n');
  variations.add(noAccents);

  // Variação com espaços normalizados
  const normalized_spaces = normalized.replace(/\s+/g, ' ');
  variations.add(normalized_spaces);

  // Para nomes próprios, adicionar variações comuns
  if (/^[A-Z]/.test(normalized)) {
    // Variação com aspas para busca exata
    variations.add(`"${normalized}"`);
    if (noAccents !== normalized) {
      variations.add(`"${noAccents}"`);
    }
  }

  return Array.from(variations).filter(v => v.length > 2);
}

/**
 * Verifica a confiabilidade de um domínio/URL.
 * @param {string} url - URL a verificar
 * @returns {Object} - { reliable: boolean, category: string }
 */
function assessSourceReliability(url) {
  if (!url) return { reliable: false, category: 'unknown' };

  const urlLower = String(url).toLowerCase();

  // Domínios altamente confiáveis
  const highlyReliable = [
    '.edu', '.gov', '.org',
    'wikipedia.org', 'britannica.com', 'encyclopedia.com',
    'bbc.com', 'reuters.com', 'apnews.com', 'nytimes.com',
    'theguardian.com', 'washingtonpost.com', 'ft.com',
    'nature.com', 'science.org', 'sciencedirect.com',
    'scholar.google', 'jstor.org', 'pubmed', 'ncbi.nlm.nih.gov',
    'folha.uol.com.br', 'estadao.com.br', 'g1.globo.com',
    'bbc.co.uk', 'scielo.org'
  ];

  if (highlyReliable.some(domain => urlLower.includes(domain))) {
    return { reliable: true, category: 'academic-news-encyclopedia' };
  }

  // Domínios moderadamente confiáveis
  const moderatelyReliable = [
    'medium.com', 'substack.com', 'wordpress.com',
    'blogspot.com', 'wixsite.com', 'weebly.com'
  ];

  if (moderatelyReliable.some(domain => urlLower.includes(domain))) {
    return { reliable: false, category: 'blog-personal' };
  }

  // Domínios de baixa confiabilidade (promocionais, vendas)
  const lowReliability = [
    'amazon.com', 'mercadolivre', 'shopee',
    'youtube.com', 'facebook.com', 'instagram.com',
    'twitter.com', 'tiktok.com'
  ];

  if (lowReliability.some(domain => urlLower.includes(domain))) {
    return { reliable: false, category: 'social-commerce' };
  }

  // Default: confiabilidade desconhecida
  return { reliable: true, category: 'general-web' };
}

/**
 * Verifica se um termo/tópico tem cobertura relevante nos resultados de busca.
 * Retorna true se os resultados mencionarem o termo ou variações próximas.
 * @param {string} topic - Tópico a verificar
 * @param {Array} results - Resultados da busca (Brave ou Tavily)
 * @returns {boolean} - true se há cobertura relevante
 */
function verifyTopicRelevance(topic, results = []) {
  if (!results || results.length === 0) return false;

  const normalizedTopic = String(topic || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

  // Extrair termos principais do tópico (palavras com 4+ caracteres)
  const topicTerms = normalizedTopic
    .split(/\s+/)
    .filter(word => word.length >= 4 && !/^(the|and|for|with|from|sobre|para|como|entre|versus)$/i.test(word));

  if (topicTerms.length === 0) return results.length > 0;

  // Verificar se pelo menos um resultado menciona algum termo principal do tópico
  return results.some(result => {
    const title = String(result.title || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const snippet = String(result.snippet || result.description || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const combined = `${title} ${snippet}`;

    // Pelo menos um termo do tópico deve aparecer no título ou snippet
    return topicTerms.some(term => combined.includes(term));
  });
}

/**
 * Estrutura para síntese de biografias comparativas.
 * @param {Array} topicsData - Array com dados coletados por tópico
 * @returns {string} - Prompt estruturado para síntese biográfica
 */
function buildBiographicalSynthesisPrompt(topicsData = []) {
  const hasMultipleTopics = topicsData.length > 1;

  const instructions = [
    'TAREFA: Criar uma síntese estruturada sobre os tópicos pesquisados.',
    '',
    'Para cada tópico, inclua:',
    '1. **Quem é / O que é**: Biografia resumida, origem, contexto',
    '2. **Principais obras/doutrinas**: Livros, ensinamentos centrais, filosofias',
    '3. **Controvérsias ou críticas**: Se houver, mencione de forma equilibrada',
    '4. **Fontes confiáveis vs. limitações**: Indique se as fontes são acadêmicas/jornalísticas ou apenas promocionais/testemunhais',
    ''
  ];

  if (hasMultipleTopics) {
    instructions.push(
      '**ANÁLISE COMPARATIVA**:',
      '5. **Pontos em comum**: Identifique temas, conceitos ou abordagens compartilhadas',
      '6. **Diferenças principais**: Destaque divergências importantes em doutrinas, origens ou metodologias',
      ''
    );
  }

  instructions.push(
    '**FORMATO DE RESPOSTA**:',
    '- Use seções claras com markdown (##, ###, **negrito**, listas)',
    '- Seja factual e cite informações das fontes',
    '- Se faltar informação confiável, declare explicitamente: "As fontes disponíveis são limitadas a blogs e canais de podcast"',
    '- Ao final, ofereça opções de aprofundamento: "Deseja que eu liste as obras principais de X ou explique detalhadamente a doutrina Y?"',
    ''
  );

  return instructions.join('\n');
}

function getDeterministicResearchQueries(content = '', route = 'focused_research', messages = []) {
  const text = buildContextualResearchContent(content, messages);
  const centralMatch = text.match(/minha pergunta central\s*(?:e|é|:)?\s*:?\s*([\s\S]*?)(?:\s+(?:ao investigar|considere|nao busco|não busco)|$)/i);
  const central = (centralMatch?.[1] || text).replace(/[*#>`]/g, '').replace(/\s+/g, ' ').trim();
  const stop = new Set(['gostaria', 'investigar', 'questao', 'pergunta', 'central', 'considere', 'quero', 'apenas', 'sobre', 'entre', 'como', 'para', 'pela', 'pelo', 'essa', 'esse', 'uma', 'que', 'das', 'dos', 'com', 'sem', 'mais', 'menos']);
  const keywords = [...new Set((text.toLowerCase().match(/[a-zà-ÿ0-9]{5,}/gi) || [])
    .map(word => word.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .filter(word => !stop.has(word)))]
    .slice(0, 10)
    .join(' ');
  const queries = route === 'source_check'
    ? [central]
    : [
      central.slice(0, 180),
      `${central.slice(0, 140)} fontes confiaveis`,
      `${central.slice(0, 140)} fonte oficial`,
      keywords
    ];
  const limit = route === 'deep_research' ? 4 : 2;
  return [...new Set(queries.map(query => query.replace(/\s+/g, ' ').trim()).filter(query => query.length > 8))].slice(0, limit);
}

function normalizePrivateRouteText(value = '') {
  if (typeof normalizeRouteText === 'function') return normalizeRouteText(value);
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createPrivateReadReport(scope = 'conversation_or_general') {
  return {
    route: 'private_context_synthesis',
    scope,
    sourcesRequested: [],
    sourcesFound: [],
    sourcesFetched: [],
    failedSources: [],
    totalFound: 0,
    totalFetched: 0
  };
}

function addPrivateReportItem(list, item) {
  if (!Array.isArray(list) || !item) return;
  const key = String(item.key || item.id || item.label || JSON.stringify(item));
  if (list.some(existing => String(existing.key || existing.id || existing.label || JSON.stringify(existing)) === key)) return;
  list.push(item);
}

function finalizePrivateReadReport(report) {
  report.totalFound = Array.isArray(report.sourcesFound) ? report.sourcesFound.length : 0;
  report.totalFetched = Array.isArray(report.sourcesFetched) ? report.sourcesFetched.length : 0;
  return report;
}

function truncateSource(text, maxChars = 1200) {
  const value = String(text || '');
  return value.length > maxChars
    ? `${value.slice(0, maxChars)}...`
    : value;
}

function truncatePrivateRouteSources(report, sourceBlocks, maxSources = 5, maxChars = 1200) {
  const sourcesBefore = Array.isArray(report?.sourcesFetched) ? report.sourcesFetched.length : 0;
  console.log(`[PRIVATE ROUTE] sources before truncation: ${sourcesBefore}`);

  if (report && Array.isArray(report.sourcesFetched)) {
    report.sourcesFetched = report.sourcesFetched.slice(0, maxSources).map(source => ({
      ...source,
      ...(source?.content || source?.text
        ? { content: truncateSource(source.content || source.text || '', maxChars) }
        : {})
    }));
  }

  if (Array.isArray(sourceBlocks)) {
    const truncatedBlocks = sourceBlocks
      .slice(0, maxSources)
      .map(block => truncateSource(block, maxChars));
    sourceBlocks.splice(0, sourceBlocks.length, ...truncatedBlocks);
  }

  const sourcesAfter = Array.isArray(report?.sourcesFetched) ? report.sourcesFetched.length : 0;
  console.log(`[PRIVATE ROUTE] sources after truncation: ${sourcesAfter} (max ${maxChars} chars each)`);
}

function buildPrivateWriterSources(report, sourceBlocks) {
  const fetched = Array.isArray(report?.sourcesFetched) ? report.sourcesFetched : [];
  const blocks = Array.isArray(sourceBlocks) ? sourceBlocks : [];
  return fetched.map((source, index) => ({
    ...source,
    title: source?.label || source?.key || `fonte privada ${index + 1}`,
    content: truncateSource(source?.content || source?.text || blocks[index] || '', 1200)
  }));
}

function isPrivateReadComplete(report) {
  return Boolean(report && report.totalFound > 0 && report.totalFetched === report.totalFound);
}

function getPrivateReadNotice(report) {
  if (!report || report.totalFound <= 0) {
    return 'Não encontrei contexto privado carregado suficiente para afirmar que li suas fontes pessoais.';
  }
  if (report.totalFetched < report.totalFound) {
    return `Li ${report.totalFetched} de ${report.totalFound} fontes. A síntese abaixo é parcial.`;
  }
  return '';
}

function enforcePrivateReadLanguage(content = '', report) {
  let reply = String(content || '').trim();
  const complete = isPrivateReadComplete(report);
  const claimsFullRead = /\bli\s+(tudo|todas as sessoes|todas as sessões|todos os arquivos|todo o conteudo|todo o conteúdo)\b/i.test(reply);
  const notice = getPrivateReadNotice(report);

  if (!complete && claimsFullRead) {
    reply = reply.replace(/\bli\s+(tudo|todas as sessoes|todas as sessões|todos os arquivos|todo o conteudo|todo o conteúdo)\b/gi, 'li o contexto privado disponível');
  }

  if (notice && report?.totalFound > 0 && report.totalFetched < report.totalFound && !reply.startsWith(notice)) {
    reply = `${notice}\n\n${reply}`;
  }

  if (!reply && report?.totalFound <= 0) return notice;
  return reply || notice;
}

function buildPrivateAttachmentSources(files = [], report) {
  const blocks = [];
  for (const file of Array.isArray(files) ? files : []) {
    const name = file?.name || file?.fileName || file?.id || 'arquivo';
    const key = `file:${name}`;
    addPrivateReportItem(report.sourcesRequested, { key, type: 'uploaded_file', label: name });
    addPrivateReportItem(report.sourcesFound, { key, type: 'uploaded_file', label: name });

    const body = String(file?.extractedText || file?.text || '').trim();
    const isImage = file?.kind === 'image' && file?.data;
    if (body || isImage) {
      addPrivateReportItem(report.sourcesFetched, { key, type: 'uploaded_file', label: name });
      blocks.push([
        `Fonte privada: arquivo anexado - ${name}`,
        body
          ? body.slice(0, 24000)
          : '[Imagem anexada disponível no contexto multimodal da mensagem.]'
      ].join('\n'));
    } else {
      addPrivateReportItem(report.failedSources, { key, type: 'uploaded_file', label: name, reason: 'sem texto extraido no runtime' });
    }
  }
  return blocks;
}

function buildPrivateProjectSource(projectContext, report) {
  if (!projectContext) return '';
  const label = projectContext.title || projectContext.name || projectContext.id || 'projeto atual';
  const key = `project:${projectContext.id || label}`;
  const body = String(projectContext.content || projectContext.summary || projectContext.description || '').trim();
  addPrivateReportItem(report.sourcesRequested, { key, type: 'private_project', label });
  addPrivateReportItem(report.sourcesFound, { key, type: 'private_project', label });
  if (body) {
    addPrivateReportItem(report.sourcesFetched, { key, type: 'private_project', label });
    return [`Fonte privada: projeto atual - ${label}`, body.slice(0, 24000)].join('\n');
  }
  addPrivateReportItem(report.failedSources, { key, type: 'private_project', label, reason: 'sem conteudo textual no projeto atual' });
  return '';
}

function buildConversationContextSource(sourceMessages = [], report) {
  const recent = (Array.isArray(sourceMessages) ? sourceMessages : [])
    .filter(message => message && ['user', 'assistant'].includes(message.role) && message.content && message.content !== '...')
    .slice(-10);
  if (!recent.length) return '';
  const key = 'conversation:recent';
  addPrivateReportItem(report.sourcesRequested, { key, type: 'conversation_context', label: 'conversa atual' });
  addPrivateReportItem(report.sourcesFound, { key, type: 'conversation_context', label: 'conversa atual' });
  addPrivateReportItem(report.sourcesFetched, { key, type: 'conversation_context', label: 'conversa atual' });
  return [
    'Fonte privada: conversa atual recente',
    recent.map(message => `${message.role}: ${String(message.content || '').slice(0, 4000)}`).join('\n\n')
  ].join('\n');
}

function buildPrivateMemoryQueries(userMessage = '', routeOptions = {}) {
  const normalized = normalizePrivateRouteText(userMessage);
  const profileName = typeof userProfile !== 'undefined'
    ? String(userProfile.displayName || userProfile.name || '').trim()
    : '';
  const projectName = routeOptions.currentProjectContext?.title || routeOptions.currentProjectContext?.name || '';
  const queries = [userMessage];

  if (/\b(quem sou eu|o que eu sou|quem eu sou|sobre mim|me descreva|me defina|qual meu perfil|meus padroes|minha historia)\b/.test(normalized)) {
    queries.push(
      'perfil do usuario',
      'historia do usuario',
      'padroes do usuario',
      'preferencias do usuario',
      'decisoes do usuario',
      'projetos do usuario'
    );
  }
  if (/\b(sessoes|conversas|historico|memoria)\b/.test(normalized)) {
    queries.push('sessoes do usuario', 'conversas anteriores', 'memoria semantica', 'decisoes recentes');
  }
  if (profileName) queries.push(profileName);
  if (projectName) queries.push(projectName);

  return [...new Set(queries.map(query => String(query || '').replace(/\s+/g, ' ').trim()).filter(query => query.length >= 3))].slice(0, 6);
}

async function collectSupabaseSemanticMemorySources(userMessage, routeOptions, report) {
  const blocks = [];
  const queries = buildPrivateMemoryQueries(userMessage, routeOptions).slice(0, 4);

  for (const query of queries) {
    const requestKey = `semantic_memory:${query}`;
    addPrivateReportItem(report.sourcesRequested, { key: requestKey, type: 'private_memory_context', label: query });

    if (typeof searchInternalMemory === 'function') {
      try {
        const semanticContext = await searchInternalMemory(query);
        if (semanticContext) {
          addPrivateReportItem(report.sourcesFound, { key: requestKey, type: 'private_memory_context', label: query });
          addPrivateReportItem(report.sourcesFetched, { key: requestKey, type: 'private_memory_context', label: query });
          blocks.push([
            `Fonte privada: memória semântica Supabase - ${query}`,
            String(semanticContext).slice(0, 20000)
          ].join('\n'));
        }
      } catch (error) {
        addPrivateReportItem(report.failedSources, { key: requestKey, type: 'private_memory_context', label: query, reason: error.message });
      }
    }
  }

  if (typeof executeToolCall === 'function') {
    const seenConversationIds = new Set();
    const conversationsToRead = [];
    const prefersAtomMemory = typeof isMemoryAtomQuery === 'function'
      ? isMemoryAtomQuery(userMessage)
      : /\b(quem sou eu|perfil|identidade|sobre mim|prefer[eê]ncia|estilo|decis[aã]o|decidimos|regra|tdah|diagn[oó]stico|sa[uú]de|padr[aã]o)\b/i.test(userMessage);
    const needsNarrativeContinuity = typeof isConversationNarrativeQuery === 'function'
      ? isConversationNarrativeQuery(userMessage)
      : /\b(sessão|sessao|ontem|conversa anterior|última vez|ultima vez|semana passada|mês passado|mes passado|onde paramos|continuidade|o que aconteceu)\b/i.test(userMessage);

    for (const query of queries.slice(0, 3)) {
      try {
        if (typeof showWorionStatus === 'function') showWorionStatus('evidence');
        const result = await executeToolCall('memory_search', { query, limit: 8 });
        const rows = Array.isArray(result?.results) ? result.results : [];
        for (const row of rows) {
          const isAtom = row.kind === 'memory_atom' || result.source_table === 'memory_atoms_v1';
          if (prefersAtomMemory && !needsNarrativeContinuity && !isAtom) continue;

          const conversationId = row.conversation_id || row.conversationId || '';
          const chunkContent = isAtom
            ? row.content
            : (row.content || row.chunk || '');
          const sourceKey = conversationId
            ? `${isAtom ? 'memory_atom' : 'memory_chunk'}:${conversationId}:${row.atom_id || row.chunk_index || rows.indexOf(row)}`
            : `${isAtom ? 'memory_atom' : 'memory_chunk'}:${query}:${row.atom_id || row.chunk_index || rows.indexOf(row)}`;

          addPrivateReportItem(report.sourcesFound, {
            key: sourceKey,
            type: 'private_memory_context',
            label: isAtom
              ? `atom ${row.type || '-'}: ${row.title || row.atom_id || '-'}`
              : `chunk ${row.chunk_index ?? '-'} (${row.source_id || 'unknown'})`,
            sourceId: row.source_id || ''
          });

          if (chunkContent) {
            addPrivateReportItem(report.sourcesFetched, {
              key: sourceKey,
              type: 'private_memory_context',
              label: isAtom ? `atom ${row.type || '-'}` : `chunk ${row.chunk_index ?? '-'}`,
              sourceId: row.source_id || ''
            });
            blocks.push(isAtom
              ? [
                  `[Memory Atom V1 - ${row.type || 'unknown'}]`,
                  row.title ? `Titulo: ${row.title}` : '',
                  `Memoria: ${chunkContent}`,
                  row.retrieval_text ? `Retrieval: ${row.retrieval_text}` : '',
                  Array.isArray(row.source_chunk_ids) && row.source_chunk_ids.length
                    ? `Source chunks: ${row.source_chunk_ids.slice(0, 6).join(', ')}`
                    : ''
                ].filter(Boolean).join('\n')
              : `[Memória — ${row.source_id || 'fonte desconhecida'}]\n${chunkContent}`);
          }

          // Coleta conversation_id para leitura completa apenas se houver intenção narrativa
          if (needsNarrativeContinuity && !isAtom && conversationId && !seenConversationIds.has(conversationId)) {
            seenConversationIds.add(conversationId);
            conversationsToRead.push({ conversationId, sourceId: row.source_id || '', query });
          }
        }
      } catch (error) {
        addPrivateReportItem(report.failedSources, { key: `memory_search:${query}`, type: 'private_memory_context', label: query, reason: error.message });
      }
    }

    // Só chama memory_read_conversation se houver intenção de continuidade narrativa
    if (needsNarrativeContinuity && conversationsToRead.length > 0) {
      console.log('[MEMORY] Continuidade narrativa detectada — lendo conversas completas:', conversationsToRead.length);
      for (const item of conversationsToRead.slice(0, 3)) {
        const key = `memory_conversation:${item.conversationId}`;
        try {
          const conversation = await executeToolCall('memory_read_conversation', {
            conversation_id: item.conversationId,
            max_chars: 2000
          });
          if (!conversation?.error && (conversation.transcript || conversation.summary)) {
            addPrivateReportItem(report.sourcesFetched, {
              key,
              type: 'private_memory_context',
              label: conversation.title || item.conversationId,
              sourceId: conversation.source_id || item.sourceId || ''
            });
            blocks.push([
              `Fonte privada: conversa completa - ${conversation.title || item.conversationId}`,
              conversation.summary ? `Resumo: ${conversation.summary}` : '',
              String(conversation.transcript || '').slice(0, 2000)
            ].filter(Boolean).join('\n'));
          } else {
            addPrivateReportItem(report.failedSources, { key, type: 'private_memory_context', label: item.conversationId, reason: conversation?.error || 'sem transcript retornado' });
          }
        } catch (error) {
          addPrivateReportItem(report.failedSources, { key, type: 'private_memory_context', label: item.conversationId, reason: error.message });
        }
      }
    } else if (conversationsToRead.length > 0) {
      console.log('[MEMORY] Chunks diretos suficientes — memory_read_conversation não chamado');
    }
  }

  return blocks;
}

async function collectPrivateConnectorSources(userMessage, report) {
  const blocks = [];
  const normalized = normalizePrivateRouteText(userMessage);
  const mentionsNotion = /\b(notion|sessoes|sessao|pagina|paginas|daily reports|worion hq|workestria hq)\b/.test(normalized)
    || /notion\.(?:so|site)/i.test(String(userMessage || ''));

  if (mentionsNotion) {
    const key = 'connector:notion';
    addPrivateReportItem(report.sourcesRequested, { key, type: 'private_connector_context', label: 'Notion' });
    if (typeof executeDirectNotionReadRequest === 'function') {
      try {
        if (typeof showWorionStatus === 'function') showWorionStatus('openingSources');
        if (typeof showExecutionStatus === 'function') showExecutionStatus('Acessando seus dados...');
        const result = await executeDirectNotionReadRequest(userMessage);
        const pages = Array.isArray(result?.pages) ? result.pages : [];
        if (result?.success && pages.length) {
          for (const page of pages) {
            const pageKey = `notion:${page.id || page.url || page.title}`;
            addPrivateReportItem(report.sourcesFound, { key: pageKey, type: 'private_connector_context', label: page.title || page.url || 'Notion' });
            if (page.content) {
              addPrivateReportItem(report.sourcesFetched, { key: pageKey, type: 'private_connector_context', label: page.title || page.url || 'Notion' });
            } else {
              addPrivateReportItem(report.failedSources, { key: pageKey, type: 'private_connector_context', label: page.title || page.url || 'Notion', reason: 'pagina sem texto extraido' });
            }
          }
          const source = result.source || pages.map(page => [
            `# ${page.title || 'Página do Notion'}`,
            page.url || '',
            String(page.content || '').slice(0, 12000)
          ].join('\n')).join('\n\n---\n\n');
          blocks.push(['Fonte privada: Notion', source.slice(0, 36000)].join('\n'));
          if (typeof showExecutionStatus === 'function') showExecutionStatus('Processando o que encontrei...');
          if (typeof appendSilentIncorporatedContext === 'function') {
            appendSilentIncorporatedContext(['Contexto incorporado do Notion pela rota privada.', source.slice(0, 50000)].join('\n\n'));
          }
        } else {
          addPrivateReportItem(report.failedSources, { key, type: 'private_connector_context', label: 'Notion', reason: result?.reply || result?.error || 'sem paginas retornadas' });
        }
      } catch (error) {
        addPrivateReportItem(report.failedSources, { key, type: 'private_connector_context', label: 'Notion', reason: error.message });
      }
    } else {
      addPrivateReportItem(report.failedSources, { key, type: 'private_connector_context', label: 'Notion', reason: 'conector Notion indisponivel no runtime' });
    }
  }

  for (const connectorName of ['gmail', 'google drive', 'drive', 'docs']) {
    if (!normalized.includes(connectorName)) continue;
    const key = `connector:${connectorName}`;
    addPrivateReportItem(report.sourcesRequested, { key, type: 'private_connector_context', label: connectorName });
    addPrivateReportItem(report.failedSources, { key, type: 'private_connector_context', label: connectorName, reason: 'conector privado nao registrado neste runtime' });
  }

  return blocks;
}

async function runPrivateContextSynthesisRoute(userMessage, routeOptions = {}) {
  const scope = routeOptions.scope || (
    typeof classifyQuestionScope === 'function'
      ? classifyQuestionScope(userMessage, routeOptions)
      : 'conversation_or_general'
  );

  // P2: Status honesto - "meus registros" APENAS para rotas de memória/projeto privado
  const isMemoryOrProjectScope = scope === 'private_memory_context' ||
    scope === 'private_project_context';

  if (typeof showExecutionStatus === 'function' && isMemoryOrProjectScope) {
    showExecutionStatus('Vou localizar nos meus registros...');
  } else if (typeof showExecutionStatus === 'function') {
    // Contexto privado genérico (agente, anexos, etc)
    showExecutionStatus('Analisando o contexto...');
  }

  const report = createPrivateReadReport(scope);
  const sourceBlocks = [];

  sourceBlocks.push(...buildPrivateAttachmentSources(routeOptions.files || routeOptions.attachments || [], report));

  if (routeOptions.currentProjectContext) {
    const projectBlock = buildPrivateProjectSource(routeOptions.currentProjectContext, report);
    if (projectBlock) sourceBlocks.push(projectBlock);
  }

  if (routeOptions.connectorContext) {
    const key = 'connector:preloaded_context';
    addPrivateReportItem(report.sourcesRequested, { key, type: 'private_connector_context', label: 'contexto de conector pre-carregado' });
    addPrivateReportItem(report.sourcesFound, { key, type: 'private_connector_context', label: 'contexto de conector pre-carregado' });
    addPrivateReportItem(report.sourcesFetched, { key, type: 'private_connector_context', label: 'contexto de conector pre-carregado' });
    sourceBlocks.push(['Fonte privada: contexto de conector já carregado', String(routeOptions.connectorContext).slice(0, 18000)].join('\n'));
  }

  sourceBlocks.push(...await collectPrivateConnectorSources(userMessage, report));

  if (routeOptions.internalMemoryContext) {
    const key = 'memory:preloaded_internal';
    addPrivateReportItem(report.sourcesRequested, { key, type: 'private_memory_context', label: 'memoria interna pre-carregada' });
    addPrivateReportItem(report.sourcesFound, { key, type: 'private_memory_context', label: 'memoria interna pre-carregada' });
    addPrivateReportItem(report.sourcesFetched, { key, type: 'private_memory_context', label: 'memoria interna pre-carregada' });
    sourceBlocks.push(['Fonte privada: memória interna já carregada', String(routeOptions.internalMemoryContext).slice(0, 18000)].join('\n'));
  }

  if (routeOptions.memoryCardsContext) {
    const key = 'memory:cards';
    addPrivateReportItem(report.sourcesRequested, { key, type: 'private_memory_context', label: 'memory cards ativos' });
    addPrivateReportItem(report.sourcesFound, { key, type: 'private_memory_context', label: 'memory cards ativos' });
    addPrivateReportItem(report.sourcesFetched, { key, type: 'private_memory_context', label: 'memory cards ativos' });
    sourceBlocks.push(['Fonte privada: memory cards ativos', String(routeOptions.memoryCardsContext).slice(0, 18000)].join('\n'));
  }

  sourceBlocks.push(...await collectSupabaseSemanticMemorySources(userMessage, routeOptions, report));

  const conversationBlock = buildConversationContextSource(routeOptions.sourceMessages || [], report);
  if (conversationBlock) sourceBlocks.push(conversationBlock);

  if (routeOptions.silentIncorporatedContext) {
    const key = 'conversation:silent_incorporated_context';
    addPrivateReportItem(report.sourcesRequested, { key, type: 'conversation_context', label: 'contexto incorporado anteriormente' });
    addPrivateReportItem(report.sourcesFound, { key, type: 'conversation_context', label: 'contexto incorporado anteriormente' });
    addPrivateReportItem(report.sourcesFetched, { key, type: 'conversation_context', label: 'contexto incorporado anteriormente' });
    sourceBlocks.push(['Fonte privada: contexto já incorporado', String(routeOptions.silentIncorporatedContext).slice(0, 24000)].join('\n'));
  }

  truncatePrivateRouteSources(report, sourceBlocks, 5, 1200);
  finalizePrivateReadReport(report);
  const privateWriterSources = buildPrivateWriterSources(report, sourceBlocks);
  console.log('[PRIVATE ROUTE] read report:', report);

  // Detectar se há agente ativo e extrair identidade para reforço
  const baseMessages = Array.isArray(routeOptions.messages) ? routeOptions.messages : [];
  const agentSystemMessage = baseMessages.find(msg =>
    msg?.role === 'system' &&
    (msg?.content?.includes('Agente ativo') || msg?.content?.includes('operando como'))
  );
  const hasActiveAgent = Boolean(agentSystemMessage);

  // Extrair nome e primeiras linhas da persona do agente
  let agentName = '';
  let agentIdentityCore = '';
  if (hasActiveAgent && agentSystemMessage?.content) {
    const nameMatch = agentSystemMessage.content.match(/operando como\s+([^\n.]+)/i) ||
                      agentSystemMessage.content.match(/Você é o?\s+([^\n.]+)/i);
    agentName = nameMatch ? nameMatch[1].trim() : 'agente especializado';

    // Extrair primeiras 2-3 linhas após "Você é" ou "operando como"
    const identityMatch = agentSystemMessage.content.match(/(?:Você é|operando como)[^\n]*\n([^\n]+(?:\n[^\n]+)?(?:\n[^\n]+)?)/i);
    agentIdentityCore = identityMatch ? identityMatch[1].trim().split('\n').slice(0, 2).join(' ') : '';
  }

  const privateRoutePrompt = [
    'ROTA: private_context_synthesis.',
    `Escopo classificado: ${scope}.`,
    '',
    'Use apenas contexto privado, memória Supabase, conectores privados, anexos, projeto atual e conversa atual fornecidos nesta chamada.',
    'Nunca use Brave, Tavily, fetch_url público, Wikipedia, Pensador, letras de música ou fonte pública genérica para substituir memória pessoal.',
    'A memória semântica Supabase deve ser tratada como evidência privada: sintetize padrões, lacunas e sinais recorrentes, mas não invente fatos ausentes.',
    'Se houver pouca evidência, seja proativo: diga o que conseguiu inferir, o grau de confiança e qual fonte privada faltaria consultar em seguida.',
    '',
    'REGRA DE LEITURA:',
    'Só diga "li tudo", "li todas as sessões" ou "li todo o conteúdo" se privateReadReport.totalFound > 0 e totalFetched === totalFound.',
    'Se a leitura foi parcial, comece a resposta com exatamente: "Li X de Y fontes. A síntese abaixo é parcial."',
    'Se nenhuma fonte privada foi encontrada, diga que falta contexto privado carregado antes de descrever o usuário com segurança.',
    '',
    `privateReadReport:\n${JSON.stringify(report, null, 2)}`,
    '',
    sourceBlocks.length
      ? `FONTES PRIVADAS DISPONÍVEIS:\n\n${sourceBlocks.join('\n\n---\n\n').slice(0, 120000)}`
      : 'FONTES PRIVADAS DISPONÍVEIS: nenhuma fonte privada foi encontrada ou carregada neste turno.',
    '',
    '',
    hasActiveAgent
      ? `🔴🔴🔴 ATENÇÃO FINAL — REFORÇO DE IDENTIDADE 🔴🔴🔴

Você é ${agentName}.
${agentIdentityCore}

Responda EXCLUSIVAMENTE dentro dessa persona.
Os memory cards acima são contexto de fundo — NÃO MUDE SUA IDENTIDADE por causa deles.
Não liste projetos genéricos. Não use tom de assistente. Seja ${agentName}.`
      : ''
  ].filter(Boolean).join('\n');

  const systemMessages = baseMessages.filter(message => message?.role === 'system');
  const conversationalMessages = baseMessages.filter(message => message?.role !== 'system');

  // ORDEM CORRETA: agente (persona) → histórico → memory cards → fontes
  const synthesisMessages = [
    ...systemMessages,                                    // 1. System prompt do agente (persona, identidade, regras)
    ...conversationalMessages,                            // 2. Histórico da conversa atual
    { role: 'system', content: privateRoutePrompt }       // 3. Memory cards + fontes truncadas (contexto de fundo)
  ];

  console.log('[PRIVATE ROUTE] prompt order: agent_system → history → cards → sources', {
    systemMessagesCount: systemMessages.length,
    conversationalMessagesCount: conversationalMessages.length,
    hasMemoryCards: Boolean(routeOptions.memoryCardsContext),
    sourcesCount: sourceBlocks.length,
    agentReinforcement: hasActiveAgent ? `YES - ${agentName}` : 'NO'
  });

  // Status antes de chamar o modelo
  if (typeof showExecutionStatus === 'function') {
    showExecutionStatus('Encontrei. Construindo resposta...');
  }

  const data = typeof callModelWithRetry === 'function'
    ? await callModelWithRetry({
        ...(routeOptions.model ? { model: routeOptions.model } : {}),
        messages: synthesisMessages,
        temperature: routeOptions.temperature ?? 0.35,
        max_tokens: routeOptions.max_tokens || 10000
      }, 2)
    : await callOpenAIWithRetry({
        ...(routeOptions.model ? { model: routeOptions.model } : {}),
        messages: synthesisMessages,
        temperature: routeOptions.temperature ?? 0.35,
        max_tokens: routeOptions.max_tokens || 10000
      }, 2);

  const rawContent = data?.content || data?.output_text || data?.choices?.[0]?.message?.content || '';
  const content = enforcePrivateReadLanguage(rawContent, report);
  data._privateReadReport = report;
  return {
    content,
    data,
    privateReadReport: report,
    _privateReadReport: report,
    privateSources: privateWriterSources,
    fetchedPages: privateWriterSources,
    toolResults: { privateReadReport: report, privateSources: privateWriterSources },
    finishReason: data?.choices?.[0]?.finish_reason || 'private_context_synthesis'
  };
}

async function runDeterministicResearchRoute(messages, content, profile = {}, options = {}) {
  const route = options.executionRoute || options.route || 'focused_research';
  const queryType = getResearchQueryType(content, route);
  const maxFetches = Math.max(0, Math.min(Number(profile.maxFetches || 3), 6));
  const maxTokens = profile.maxTokens || options.max_tokens || getResponseTokenBudget(content);
  const candidateAxes = route === 'comparative_research' ? extractCandidateResearchAxes(content) : [];
  const usesAxisSearch = route === 'comparative_research' && candidateAxes.length >= 2;
  const maxLoops = 2; // Limitar a 2 loops de pesquisa para reduzir latência

  // Bug fix: Reduzir limites para gpt-4o no deep_research para evitar estouro de TPM
  const isGPT4o = String(options.model || '').includes('gpt-4o') && !String(options.model || '').includes('mini');
  const isDeepResearch = route === 'deep_research';
  const shouldReduceLimits = isGPT4o && isDeepResearch;

  let queries = usesAxisSearch
    ? candidateAxes.slice(0, Math.max(2, maxFetches)).map(axis => buildQueriesForAxis(axis, content)[0] || axis)
    : getDeterministicResearchQueries(content, route, messages);

  // Limitar número de queries para evitar loops excessivos
  queries = queries.slice(0, maxLoops);
  const toolResults = [];
  const toolCalls = [];
  const fetchedUrls = new Set();
  const fetchedPages = [];
  const searchResults = [];
  const topicCoverage = {}; // Rastreamento de cobertura por tópico

  const runTool = async (name, args) => {
    const toolCall = {
      id: `det_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'function',
      function: { name, arguments: JSON.stringify(args || {}) }
    };
    toolCalls.push(toolCall);
    const result = typeof executeToolCall === 'function'
      ? await executeToolCall(name, args || {})
      : { error: 'executeToolCall indisponivel' };
    toolResults.push({ toolCall, result });
    return result;
  };

  // Processar cada query/tópico individualmente
  for (const query of queries) {
    if (typeof showWorionStatus === 'function') showWorionStatus('sources');
    if (typeof showExecutionStatus === 'function') showExecutionStatus('Vou fazer uma busca...');

    // Inicializar cobertura do tópico
    topicCoverage[query] = { sources: 0, hasContent: false, method: null };

    // Tentativa 1: Brave Search
    const search = await runTool('brave_search', {
      query,
      count: shouldReduceLimits ? 4 : (route === 'deep_research' ? 8 : 5),
      country: 'BR',
      search_lang: /\b(the|and|official|primary|source|paper|research)\b/i.test(query) ? 'en' : 'pt-br'
    });

    const braveResults = [
      ...(search?.results || []),
      ...(search?.news || []),
      ...(search?.discussions || [])
    ];

    console.log('[RESEARCH ROUTE] brave_search result:', {
      query,
      error: search?.error || null,
      results: braveResults.length
    });

    // Verificar se os resultados do Brave são realmente relevantes para o tópico
    const isRelevant = verifyTopicRelevance(query, braveResults);

    console.log('[RESEARCH ROUTE] topic relevance check:', {
      query,
      hasResults: braveResults.length > 0,
      isRelevant
    });

    // Se Brave retornou resultados RELEVANTES, marcar cobertura
    if (braveResults.length > 0 && isRelevant) {
      topicCoverage[query].sources = braveResults.length;
      topicCoverage[query].method = 'brave';
      topicCoverage[query].isRelevant = true;
      searchResults.push({ query, search });
      continue; // Próximo tópico
    }

    // Se Brave retornou resultados mas não são relevantes, tentar variações de busca
    if (braveResults.length === 0 || !isRelevant) {
      console.log('[RESEARCH ROUTE] Trying search variations for:', query);

      const variations = createSearchVariations(query);
      let variationResults = [];

      // Tentar variações até encontrar resultados relevantes
      for (const variation of variations.slice(1)) { // Pular a primeira (já tentada)
        const varSearch = await runTool('brave_search', {
          query: variation,
          count: 5,
          country: 'BR',
          search_lang: /\b(the|and|official|primary|source|paper|research)\b/i.test(variation) ? 'en' : 'pt-br'
        });

        const varResults = [
          ...(varSearch?.results || []),
          ...(varSearch?.news || []),
          ...(varSearch?.discussions || [])
        ];

        const varIsRelevant = verifyTopicRelevance(query, varResults);

        if (varResults.length > 0 && varIsRelevant) {
          console.log('[RESEARCH ROUTE] Found relevant results with variation:', variation);
          topicCoverage[query].sources = varResults.length;
          topicCoverage[query].method = 'brave-variation';
          topicCoverage[query].isRelevant = true;
          topicCoverage[query].usedVariation = variation;
          searchResults.push({ query, search: varSearch });
          variationResults = varResults;
          break;
        }
      }

      // Se encontrou com variações, pular para próximo tópico
      if (variationResults.length > 0) continue;

      // Se não encontrou com variações, marcar como irrelevante
      console.log('[RESEARCH ROUTE] No relevant results with variations for:', query);
      topicCoverage[query].sources = 0;
      topicCoverage[query].method = braveResults.length > 0 ? 'brave-irrelevant' : 'none';
      topicCoverage[query].isRelevant = false;
    }

    // Tentativa 2: Tavily Search com search_depth advanced
    if (profile.secondaryTools?.includes('tavily_search')) {
      console.log('[RESEARCH ROUTE] Tavily fallback (advanced) for topic:', query);

      const tavily = await runTool('tavily_search', {
        query,
        count: 5,
        search_depth: 'advanced', // Pesquisa profunda quando Brave falha
        country: 'BR',
        include_answer: true,
        include_raw_content: true // Pedir conteúdo já extraído
      });

      const tavilyResults = tavily?.results || [];
      const tavilyIsRelevant = verifyTopicRelevance(query, tavilyResults);

      console.log('[RESEARCH ROUTE] tavily_search result:', {
        query,
        error: tavily?.error || null,
        results: tavilyResults.length,
        hasRawContent: tavilyResults.some(r => r.raw_content),
        isRelevant: tavilyIsRelevant
      });

      if (tavilyResults.length > 0 && tavilyIsRelevant) {
        topicCoverage[query].sources = tavilyResults.length;
        topicCoverage[query].method = 'tavily';
        topicCoverage[query].hasContent = tavilyResults.some(r => r.raw_content);
        topicCoverage[query].isRelevant = true;
        searchResults.push({ query, search: tavily });
      } else if (tavilyResults.length > 0 && !tavilyIsRelevant) {
        // Marca que este tópico tem resultados mas não são relevantes
        console.log('[RESEARCH ROUTE] Tavily results exist but not relevant for:', query);
        topicCoverage[query].sources = 0;
        topicCoverage[query].method = 'tavily-irrelevant';
        topicCoverage[query].isRelevant = false;
      } else {
        // Marca que este tópico não tem fontes
        topicCoverage[query].sources = 0;
        topicCoverage[query].method = 'none';
        topicCoverage[query].isRelevant = false;
      }
    } else {
      // Sem fallback Tavily configurado
      topicCoverage[query].sources = 0;
      topicCoverage[query].method = 'none';
    }
  }

  // Processar resultados e coletar conteúdo
  const candidates = [];
  const urlsForExtract = []; // URLs para extrair em batch via Tavily
  const reliabilityStats = {}; // Estatísticas de confiabilidade por tópico

  for (const batch of searchResults) {
    const items = getSearchItemsForFetch(batch.search, maxFetches);
    const queryKey = batch.query;
    if (!reliabilityStats[queryKey]) {
      reliabilityStats[queryKey] = { reliable: 0, unreliable: 0, total: 0 };
    }

    for (const item of items) {
      const relevance = getSearchItemRelevanceScore(item, batch.query);
      const hasRawContent = Boolean(item.raw_content);
      const reliability = assessSourceReliability(item.url);
      const quality = sourceQualityScore(item, queryType);

      // Atualizar estatísticas
      reliabilityStats[queryKey].total += 1;
      if (reliability.reliable) {
        reliabilityStats[queryKey].reliable += 1;
      } else {
        reliabilityStats[queryKey].unreliable += 1;
      }

      // Se já tem raw_content do Tavily, usar diretamente
      if (!quality.accepted) {
        console.warn('[RESEARCH QUALITY] rejected weak sources', {
          query: batch.query,
          url: item.url,
          score: quality.score,
          reasons: quality.reasons
        });
        continue;
      }

      if (hasRawContent) {
        fetchedPages.push({
          ...item,
          query: batch.query,
          priority: getSourcePriorityScore(item),
          quality,
          relevance,
          reliability,
          fetched: {
            text: item.raw_content,
            content: item.raw_content,
            url: item.url,
            contentType: 'text/html',
            source: 'tavily-raw-content'
          }
        });
        fetchedUrls.add(item.url);
        continue;
      }

      candidates.push({
        ...item,
        query: batch.query,
        priority: getSourcePriorityScore(item),
        quality,
        relevance,
        reliability
      });
    }
  }

  // Log de confiabilidade das fontes
  console.log('[RESEARCH ROUTE] Source reliability stats:', reliabilityStats);
  console.log('[RESEARCH QUALITY] accepted sources', candidates.map(item => ({
    title: item.title,
    url: item.url,
    score: item.quality?.score
  })));

  // Ordenar candidatos por relevância e prioridade
  const relevantCandidates = candidates.filter(item => (item.relevance || 0) > 0);
  const fetchCandidates = relevantCandidates.length ? relevantCandidates : candidates;
  fetchCandidates.sort((a, b) => ((b.quality?.score || 0) - (a.quality?.score || 0)) || ((b.relevance || 0) - (a.relevance || 0)) || ((b.priority || 0) - (a.priority || 0)));
  if (queryType === 'historical_comparison' && !fetchCandidates.length && candidates.length === 0) {
    console.warn('[RESEARCH QUALITY] retrying with authoritative query');
  }

  // Separar URLs para fetch individual vs batch extract
  const candidatesToFetch = fetchCandidates.slice(0, maxFetches);
  const shouldUseBatchExtract = candidatesToFetch.length >= 3 && profile.secondaryTools?.includes('tavily_search');

  if (shouldUseBatchExtract) {
    // Usar tavily_extract para múltiplas URLs de uma vez
    const urlsForBatch = candidatesToFetch
      .map(item => item.url)
      .filter(url => url && !fetchedUrls.has(url))
      .slice(0, 20); // Máximo 20 URLs

    if (urlsForBatch.length > 0) {
      if (typeof showWorionStatus === 'function') showWorionStatus('openingSources');
      console.log('[RESEARCH ROUTE] Using tavily_extract for batch:', urlsForBatch.length, 'URLs');

      const extracted = await runTool('tavily_extract', { urls: urlsForBatch });
      const extractedResults = extracted?.results || [];

      for (const result of extractedResults) {
        if (result.status === 'success' && result.raw_content) {
          const candidate = candidatesToFetch.find(c => c.url === result.url);
          if (candidate) {
            fetchedPages.push({
              ...candidate,
              fetched: {
                text: result.raw_content,
                content: result.raw_content,
                url: result.url,
                contentType: 'text/html',
                source: 'tavily-extract'
              }
            });
            fetchedUrls.add(result.url);
          }
        }
      }
    }
  } else {
    // Fetch paralelo com Promise.all() para reduzir latência
    console.log('[RESEARCH ROUTE] Using parallel fetch_url for:', candidatesToFetch.length, 'URLs');

    if (typeof showWorionStatus === 'function') showWorionStatus('openingSources');
    if (typeof showExecutionStatus === 'function') showExecutionStatus('Encontrei algumas fontes, verificando...');

    // Preparar todas as URLs para fetch paralelo
    const fetchPromises = candidatesToFetch
      .filter(item => {
        const url = String(item.url || '').trim();
        return url && !fetchedUrls.has(url);
      })
      .slice(0, maxFetches)
      .map(async (item) => {
        const url = String(item.url || '').trim();
        fetchedUrls.add(url);

        const page = await runTool('fetch_url', {
          url,
          max_chars: shouldReduceLimits ? 8000 : (route === 'deep_research' ? 16000 : 9000)
        });

        console.log('[RESEARCH ROUTE] fetch_url result:', {
          url,
          error: page?.error || null,
          chars: String(page?.text || page?.content || '').length
        });

        if (!page?.error && (page.text || page.content)) {
          return { ...item, fetched: page };
        }
        return null;
      });

    // Executar todos os fetches em paralelo
    const results = await Promise.all(fetchPromises);

    // Adicionar resultados válidos
    results.forEach(result => {
      if (result) fetchedPages.push(result);
    });
  }

  if (!fetchedPages.length && queryType === 'historical_comparison') {
    const noAuthoritativeReply = [
      'Não encontrei fontes institucionais suficientes para sustentar essa comparação com rigor.',
      'As fontes fracas retornadas pela busca foram rejeitadas pelo quality gate; refaça a pesquisa com termos como Britannica, Stanford Encyclopedia, Turing Archive, IEEE ou Nikola Tesla Museum.'
    ].join('\n');
    return {
      content: noAuthoritativeReply,
      message: { role: 'assistant', content: noAuthoritativeReply },
      data: { choices: [{ message: { role: 'assistant', content: noAuthoritativeReply }, finish_reason: 'weak_sources_rejected' }] },
      messages,
      toolCalls,
      toolResults,
      finishReason: 'weak_sources_rejected',
      topicCoverage
    };
  }

  // Verificar cobertura e identificar lacunas
  const topicsWithGaps = queries.filter(query => topicCoverage[query]?.sources === 0);
  const topicsWithContent = queries.filter(query => {
    const coverage = topicCoverage[query] || {};
    return coverage.sources > 0 || fetchedPages.some(p => p.query === query);
  });

  console.log('[RESEARCH ROUTE] Topic coverage:', {
    total: queries.length,
    withContent: topicsWithContent.length,
    withGaps: topicsWithGaps.length,
    coverage: topicCoverage
  });

  // Se nenhum tópico tem fontes, retornar mensagem clara com pedido de esclarecimento
  if (!fetchedPages.length && topicsWithContent.length === 0) {
    // Separar tópicos por tipo de problema
    const unknownTopics = topicsWithGaps.filter(t => {
      const method = topicCoverage[t]?.method;
      return method === 'none' || !method;
    });
    const irrelevantTopics = topicsWithGaps.filter(t => {
      const method = topicCoverage[t]?.method;
      return method === 'brave-irrelevant' || method === 'tavily-irrelevant';
    });

    const clarificationMessages = [];

    if (unknownTopics.length > 0) {
      clarificationMessages.push(
        `**Termos sem resultados encontrados:**\n${unknownTopics.map(t => `- "${t}" → Por favor, verifique a grafia ou forneça mais contexto sobre este termo.`).join('\n')}`
      );
    }

    if (irrelevantTopics.length > 0) {
      clarificationMessages.push(
        `**Termos com resultados não relacionados:**\n${irrelevantTopics.map(t => `- "${t}" → Os resultados encontrados não parecem relacionados. Poderia especificar melhor o que procura?`).join('\n')}`
      );
    }

    const noMatchReply = [
      'Consultei as fontes disponíveis (Brave e Tavily), mas não encontrei material confiável suficiente para responder com segurança.',
      '',
      ...clarificationMessages,
      '',
      'Por favor, reformule a pergunta ou forneça mais detalhes sobre o que está procurando.'
    ].join('\n');

    return {
      content: noMatchReply,
      message: { role: 'assistant', content: noMatchReply },
      data: { choices: [{ message: { role: 'assistant', content: noMatchReply }, finish_reason: 'no_research_match' }] },
      messages,
      toolCalls,
      toolResults,
      finishReason: 'no_research_match',
      topicCoverage
    };
  }

  // TRUNCAR FONTES ANTES DA SÍNTESE (máximo 5)
  const truncatedPages = typeof truncateSources === 'function'
    ? truncateSources(fetchedPages, 5)
    : fetchedPages.slice(0, 5);

  if (fetchedPages.length > truncatedPages.length) {
    console.log(`[WRITER] sources truncated: ${fetchedPages.length}→${truncatedPages.length}`);
  }

  // Construir material por tópico
  const materialByTopic = {};
  for (const page of truncatedPages) {
    const topic = page.query || 'geral';
    if (!materialByTopic[topic]) materialByTopic[topic] = [];
    materialByTopic[topic].push(page);
  }

  const material = truncatedPages.map((page, index) => {
    const reliability = page.reliability || assessSourceReliability(page.url);
    const reliabilityLabel = reliability.reliable
      ? `✓ Confiável (${reliability.category})`
      : `⚠ Baixa confiabilidade (${reliability.category})`;

    return [
      `Fonte ${index + 1}: ${page.title || page.url}`,
      `URL: ${page.url}`,
      `Tópico: ${page.query || 'geral'}`,
      `Método: ${page.fetched?.source || 'fetch_url'}`,
      `Confiabilidade: ${reliabilityLabel}`,
      `Prioridade: ${page.priority || getSourcePriorityScore(page)}`,
      '',
      String(page.fetched?.text || page.fetched?.content || '').slice(0, shouldReduceLimits ? 6000 : (route === 'deep_research' ? 12000 : 7000))
    ].join('\n');
  }).join('\n\n---\n\n');

  // Construir nota sobre eixos e lacunas
  const axisNote = usesAxisSearch
    ? `Eixos detectados: ${candidateAxes.join(' | ')}`
    : '';

  // Construir advertência detalhada sobre lacunas
  let gapWarning = '';
  if (topicsWithGaps.length > 0) {
    const gapDetails = topicsWithGaps.map(topic => {
      const coverage = topicCoverage[topic] || {};
      const method = coverage.method || 'none';

      if (method === 'none') {
        return `- "${topic}": Nenhum resultado encontrado (termo pode estar incorreto ou ser muito específico)`;
      } else if (method === 'brave-irrelevant' || method === 'tavily-irrelevant') {
        return `- "${topic}": Resultados encontrados mas não relacionados ao termo`;
      }
      return `- "${topic}": Sem fontes confiáveis`;
    });

    gapWarning = [
      '\n\nALERTA DE LACUNAS: Os seguintes tópicos não tiveram fontes confiáveis encontradas:',
      ...gapDetails,
      '',
      'INSTRUÇÕES CRÍTICAS:',
      '1. Para cada tópico com lacuna, informe explicitamente ao usuário que não há fontes confiáveis.',
      '2. Sugira verificar a grafia ou fornecer mais contexto sobre termos desconhecidos.',
      '3. NÃO especule, invente ou compare tópicos sem material suficiente.',
      route === 'comparative_research' ? '4. Como esta é uma pesquisa comparativa, APENAS compare os tópicos que têm material. Não force comparações sem dados.' : ''
    ].filter(Boolean).join('\n');
  }

  // Construir nota sobre confiabilidade das fontes
  const reliabilityNote = Object.keys(reliabilityStats).length > 0
    ? [
        '\n\nAVALIAÇÃO DE CONFIABILIDADE DAS FONTES:',
        ...Object.entries(reliabilityStats).map(([topic, stats]) => {
          const reliablePercent = stats.total > 0 ? Math.round((stats.reliable / stats.total) * 100) : 0;
          const warning = reliablePercent < 50
            ? ' ⚠ ATENÇÃO: Maioria das fontes são blogs/redes sociais'
            : '';
          return `- ${topic}: ${stats.reliable} confiáveis / ${stats.unreliable} não confiáveis (${reliablePercent}% confiáveis)${warning}`;
        }),
        ''
      ].join('\n')
    : '';

  // Usar prompt biográfico estruturado para pesquisas comparativas
  const biographicalPrompt = route === 'comparative_research' && topicsWithContent.length > 1
    ? buildBiographicalSynthesisPrompt(topicsWithContent)
    : '';

  if (typeof showWorionStatus === 'function') showWorionStatus('composing');
  if (typeof showExecutionStatus === 'function') showExecutionStatus('Analisando o conteúdo encontrado...');

  const synthesisMessages = [
    ...(messages || []),
    {
      role: 'user',
      content: [
        'Use somente o material coletado abaixo como base principal da sintese.',
        'REGRA CRÍTICA: Quando faltar material para um tópico (veja ALERTA DE LACUNAS), informe explicitamente ao usuário que não há fontes confiáveis. NÃO invente, extrapole ou compare sem dados.',
        'Priorize fontes oficiais, primarias ou institucionais quando existirem.',
        'Nao despeje resultados crus. Entregue uma resposta em portugues natural, estruturada e util.',
        'Se houver fontes abertas, coloque 3 a 5 links relevantes no fim em markdown.',
        biographicalPrompt,
        route === 'comparative_research' ? 'Como esta e uma pesquisa comparativa, compare apenas os tópicos que têm material. Para tópicos sem fontes, apenas informe a lacuna.' : '',
        axisNote,
        gapWarning,
        reliabilityNote,
        '',
        'Material coletado:',
        material || 'Nenhum material util foi aberto. Responda com transparencia sobre a busca feita e a lacuna encontrada, sem inventar fonte.'
      ].filter(Boolean).join('\n')
    }
  ];

  const data = await callOpenAIWithRetry({
    ...options,
    messages: synthesisMessages,
    tools: [],
    tool_choice: undefined,
    max_tokens: maxTokens,
    thinking: profile.thinking
  }, 2);
  const message = data?.choices?.[0]?.message;
  const contentOut = stripDsmlToolBlocks(message?.content || '') || buildFallbackResearchReply(toolResults);
  return {
    content: contentOut,
    message,
    data,
    messages: synthesisMessages,
    toolCalls,
    toolResults,
    finishReason: data?.choices?.[0]?.finish_reason || null,
    topicCoverage, // Informações sobre cobertura por tópico
    topicsWithGaps, // Tópicos sem fontes
    topicsWithContent // Tópicos com fontes
  };
}

function extractJsonObjectCandidate(content = '') {
  const match = String(content || '').match(/\{[\s\S]*\}/);
  return match ? match[0] : '';
}

function parseTextToolCall(content, allowedTools = []) {
  const json = extractJsonObjectCandidate(content);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    const rawName = parsed?.function?.name || parsed.recipient_name || parsed.name || parsed.tool;
    const name = normalizeToolName(String(rawName || '').replace(/^functions\./, ''));
    const allowedNames = allowedTools
      .map(tool => typeof tool === 'string' ? tool : tool?.function?.name)
      .filter(Boolean);
    if (!name || (allowedNames.length && !allowedNames.includes(name))) return null;
    return {
      id: parsed.id || `synthetic_tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'function',
      function: {
        name,
        arguments: JSON.stringify(parsed.parameters || parsed.arguments || parsed.function?.arguments || {})
      }
    };
  } catch {}
  return null;
}

async function runOpenAIWithTools(messages, tools, options = {}) {
  return callOpenAIWithRetry({
    model: options.model || undefined,
    messages,
    tools,
    tool_choice: options.tool_choice || 'auto',
    temperature: options.temperature ?? 0.2,
    max_tokens: options.max_tokens ?? 6500
  }, options.retries ?? 2);
}

function extractOpenAIUsage(data = {}) {
  return data?.usage || {};
}

async function traceOpenAIResponse({ model, prompt, data, adapted }) {
  if (typeof traceModelResponse === 'function') {
    await traceModelResponse({ model, prompt, data, adapted });
  }
}

async function traceOpenAIError(error, model, prompt) {
  if (typeof traceModelError === 'function') {
    await traceModelError(error, model, prompt);
  }
}
