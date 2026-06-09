/**
 * MODULO: context-authority.js
 * RESPONSABILIDADE: contrato deterministico de autoridade entre intencao, agente,
 * historico, memoria, fontes e Writer.
 * DEPENDENCIAS: nenhuma.
 *
 * Este modulo nao altera o runtime por conta propria. Ele apenas classifica e
 * retorna uma decisao de autoridade para integracao posterior.
 */

const CONTEXT_AUTHORITY_ORDER = [
  'current_user_intent',
  'current_conversation_corrections',
  'active_agent_persona',
  'conversation_history',
  'global_worion_rules',
  'memory_cards',
  'external_sources',
  'writer'
];

const CONTEXT_AUTHORITY_INTENTS = Object.freeze({
  GREETING: 'greeting',
  IDENTITY_OR_ROLE_QUESTION: 'identity_or_role_question',
  META_FEEDBACK: 'meta_feedback',
  CONCEPTUAL_SYNTHESIS: 'conceptual_synthesis',
  FACTUAL_RESEARCH: 'factual_research',
  PRIVATE_CONTEXT_LOOKUP: 'private_context_lookup',
  EXECUTION_REQUEST: 'execution_request',
  CODE_OR_DEBUG: 'code_or_debug',
  DIRECT_ANSWER: 'direct_answer',
  CLARIFICATION_NEEDED: 'clarification_needed'
});

function normalizeAuthorityText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasActiveAgentForAuthority(currentAgent, currentChatSource) {
  return Boolean(currentAgent) && String(currentChatSource || '').toLowerCase() === 'agent';
}

function hasExplicitPublicResearchIntent(text = '') {
  const normalized = normalizeAuthorityText(text);
  return [
    /\bpesquise? (na internet|na web|reportagens|artigos|fontes|noticias|estudos)\b/,
    /\bbusque? (na internet|na web|reportagens|artigos|fontes|noticias|estudos)\b/,
    /\bfontes? (externas?|publicas?|confiaveis?)\b/,
    /\b(reportagens?|noticias?|artigos recentes|estudos recentes)\b/,
    /\bo que dizem as fontes\b/,
    /\btraga fontes\b/
  ].some(pattern => pattern.test(normalized));
}

function hasExplicitPrivateLookupIntent(text = '') {
  const normalized = normalizeAuthorityText(text);
  return [
    /\bcom base no que voce sabe sobre mim\b/,
    /\bleia meus registros\b/,
    /\bo que minhas memorias dizem\b/,
    /\banalise meu historico\b/,
    /\banalise meus padroes\b/,
    /\bminhas memorias\b/,
    /\bminha memoria\b/,
    /\bmeus registros\b/,
    /\bmeu historico\b/,
    /\bmeus projetos\b/,
    /\bmeus documentos privados\b/,
    /\bminhas conversas\b/
  ].some(pattern => pattern.test(normalized));
}

function isAuthorityGreeting(text = '') {
  return /^(oi|ola|e ai|hey|iae|salve|bom dia|boa tarde|boa noite)[\s.!?]*$/.test(normalizeAuthorityText(text));
}

function isAuthorityIdentityQuestion(text = '') {
  const normalized = normalizeAuthorityText(text);
  return [
    /\bqual.*seu papel\b/,
    /\bqual.*a sua funcao\b/,
    /\bqual.*sua funcao\b/,
    /\bo que voce faz\b/,
    /\bquem e voce\b/,
    /\bquem voce e\b/,
    /\bqual.*sua especialidade\b/,
    /\bqual.*a sua especialidade\b/,
    /\bqual.*seu proposito\b/,
    /\bqual.*o seu proposito\b/,
    /\bcomo voce atua\b/,
    /\bque espaco e esse\b/
  ].some(pattern => pattern.test(normalized));
}

function isAuthorityMetaFeedback(text = '') {
  const normalized = normalizeAuthorityText(text);
  return [
    /e assim que se responde/,
    /e e assim/,
    /isso foi uma resposta/,
    /ficou seco/,
    /ficou ruim/,
    /nao foi isso/,
    /voce errou/,
    /resposta ruim/,
    /nao gostei/,
    /melhore a resposta/,
    /tenta de novo/,
    /voce entendeu errado/,
    /combatendo o sintoma/,
    /agindo na minha cognicao/,
    /construindo para todos/,
    /o problema real e/,
    /voce esta tratando como/,
    /voce esta confundindo/
  ].some(pattern => pattern.test(normalized));
}

function isAuthorityCodeOrDebug(text = '') {
  const normalized = normalizeAuthorityText(text);
  return /\b(codigo|debug|bug|erro|stack trace|javascript|typescript|node|electron|api|json|sql|git|commit|pull request|implemente|corrija)\b/.test(normalized);
}

function isAuthorityExecutionRequest(text = '') {
  const normalized = normalizeAuthorityText(text);
  return /\b(crie|salve|gere|execute|rode|publique|envie|abra|edite|altere|instale|configure|aplique patch|faca commit)\b/.test(normalized);
}

function isAuthorityConceptualSynthesis(text = '') {
  const normalized = normalizeAuthorityText(text);
  return [
    /\bme fale sobre\b/,
    /\bfale sobre\b/,
    /\bexplique\b/,
    /\banalise\b/,
    /\binversao\b/,
    /\bconvergencia\b/,
    /\bmudanca de paradigma\b/,
    /\barquitetura cognitiva\b/,
    /\bhumano \+ ia\b/,
    /\bfuncao executiva externa\b/,
    /\bcognicao aumentada\b/,
    /\bantes\b[\s\S]{0,80}\bagora\b/,
    /\bera visto como defeito\b/,
    /\bvirar ferramenta de ia\b/
  ].some(pattern => pattern.test(normalized));
}

function buildAuthorityDecision(intent, options = {}) {
  const hasActiveAgent = Boolean(options.hasActiveAgent);
  const preserveAgentPersona = intent === CONTEXT_AUTHORITY_INTENTS.IDENTITY_OR_ROLE_QUESTION && hasActiveAgent;

  const base = {
    intent,
    authorityOrder: CONTEXT_AUTHORITY_ORDER.slice(),
    allowedRoutes: ['direct_answer'],
    forbiddenRoutes: [],
    preserveAgentPersona,
    sourcesCanSupportButNotLead: true,
    memoryCanSupportButNotLead: true,
    writerCanPolishButNotReframe: true,
    shouldBypassMemory: false,
    shouldBypassSources: false,
    shouldBypassWriter: false,
    reason: options.reason || intent
  };

  if (intent === CONTEXT_AUTHORITY_INTENTS.GREETING) {
    return {
      ...base,
      allowedRoutes: ['greeting'],
      forbiddenRoutes: ['private_context_synthesis', 'focused_research', 'comparative_research', 'deep_research'],
      shouldBypassMemory: true,
      shouldBypassSources: true,
      shouldBypassWriter: true,
      reason: 'pure_greeting_local_response'
    };
  }

  if (intent === CONTEXT_AUTHORITY_INTENTS.META_FEEDBACK) {
    return {
      ...base,
      allowedRoutes: ['meta_feedback', 'direct_answer'],
      forbiddenRoutes: ['private_context_synthesis', 'focused_research', 'comparative_research', 'deep_research'],
      shouldBypassMemory: true,
      shouldBypassSources: true,
      shouldBypassWriter: true,
      reason: 'immediate_feedback_or_correction'
    };
  }

  if (intent === CONTEXT_AUTHORITY_INTENTS.IDENTITY_OR_ROLE_QUESTION) {
    return {
      ...base,
      allowedRoutes: ['direct_answer'],
      forbiddenRoutes: ['private_context_synthesis', 'focused_research', 'comparative_research', 'deep_research'],
      shouldBypassMemory: true,
      shouldBypassSources: true,
      shouldBypassWriter: true,
      reason: hasActiveAgent ? 'active_agent_identity_has_priority' : 'identity_or_role_question'
    };
  }

  if (intent === CONTEXT_AUTHORITY_INTENTS.CONCEPTUAL_SYNTHESIS) {
    return {
      ...base,
      allowedRoutes: ['direct_answer', 'conceptual_synthesis'],
      forbiddenRoutes: ['private_context_synthesis', 'focused_research'],
      shouldBypassMemory: true,
      shouldBypassSources: true,
      shouldBypassWriter: false,
      reason: 'conceptual_axis_must_be_led_by_user_intent'
    };
  }

  if (intent === CONTEXT_AUTHORITY_INTENTS.FACTUAL_RESEARCH) {
    return {
      ...base,
      allowedRoutes: ['focused_research', 'comparative_research', 'deep_research', 'source_check'],
      forbiddenRoutes: ['private_context_synthesis'],
      shouldBypassMemory: true,
      shouldBypassSources: false,
      shouldBypassWriter: false,
      reason: 'explicit_public_research_intent'
    };
  }

  if (intent === CONTEXT_AUTHORITY_INTENTS.PRIVATE_CONTEXT_LOOKUP) {
    return {
      ...base,
      allowedRoutes: ['private_context_synthesis'],
      forbiddenRoutes: ['focused_research', 'comparative_research', 'deep_research'],
      shouldBypassMemory: false,
      shouldBypassSources: true,
      shouldBypassWriter: false,
      reason: 'explicit_private_context_lookup'
    };
  }

  if (intent === CONTEXT_AUTHORITY_INTENTS.CODE_OR_DEBUG) {
    return {
      ...base,
      allowedRoutes: ['code', 'internal_diagnostic', 'direct_answer'],
      forbiddenRoutes: ['private_context_synthesis'],
      shouldBypassMemory: true,
      shouldBypassSources: true,
      reason: 'code_or_debug_request'
    };
  }

  if (intent === CONTEXT_AUTHORITY_INTENTS.EXECUTION_REQUEST) {
    return {
      ...base,
      allowedRoutes: ['direct_answer', 'code'],
      forbiddenRoutes: ['private_context_synthesis', 'focused_research'],
      shouldBypassMemory: true,
      shouldBypassSources: true,
      reason: 'execution_request'
    };
  }

  if (intent === CONTEXT_AUTHORITY_INTENTS.CLARIFICATION_NEEDED) {
    return {
      ...base,
      allowedRoutes: ['direct_answer'],
      forbiddenRoutes: ['private_context_synthesis', 'focused_research'],
      shouldBypassMemory: true,
      shouldBypassSources: true,
      shouldBypassWriter: true,
      reason: 'empty_or_ambiguous_input'
    };
  }

  return {
    ...base,
    allowedRoutes: ['direct_answer'],
    forbiddenRoutes: ['private_context_synthesis'],
    shouldBypassMemory: false,
    shouldBypassSources: true,
    reason: 'default_direct_answer'
  };
}

function resolveContextAuthority(input = {}) {
  const content = String(input.content || '');
  const normalized = normalizeAuthorityText(content);
  const hasActiveAgent = hasActiveAgentForAuthority(input.currentAgent, input.currentChatSource);
  const explicitPublicResearch = Boolean(input.hasExplicitPublicResearchIntent) || hasExplicitPublicResearchIntent(content);
  const explicitPrivateLookup = Boolean(input.hasExplicitPrivateLookupIntent) || hasExplicitPrivateLookupIntent(content);

  if (!normalized) {
    return buildAuthorityDecision(CONTEXT_AUTHORITY_INTENTS.CLARIFICATION_NEEDED, { hasActiveAgent });
  }

  if (isAuthorityGreeting(content)) {
    return buildAuthorityDecision(CONTEXT_AUTHORITY_INTENTS.GREETING, { hasActiveAgent });
  }

  if (explicitPrivateLookup) {
    return buildAuthorityDecision(CONTEXT_AUTHORITY_INTENTS.PRIVATE_CONTEXT_LOOKUP, { hasActiveAgent });
  }

  if (explicitPublicResearch) {
    return buildAuthorityDecision(CONTEXT_AUTHORITY_INTENTS.FACTUAL_RESEARCH, { hasActiveAgent });
  }

  if (isAuthorityMetaFeedback(content)) {
    return buildAuthorityDecision(CONTEXT_AUTHORITY_INTENTS.META_FEEDBACK, { hasActiveAgent });
  }

  if (isAuthorityIdentityQuestion(content)) {
    return buildAuthorityDecision(CONTEXT_AUTHORITY_INTENTS.IDENTITY_OR_ROLE_QUESTION, { hasActiveAgent });
  }

  if (isAuthorityCodeOrDebug(content)) {
    return buildAuthorityDecision(CONTEXT_AUTHORITY_INTENTS.CODE_OR_DEBUG, { hasActiveAgent });
  }

  if (isAuthorityExecutionRequest(content)) {
    return buildAuthorityDecision(CONTEXT_AUTHORITY_INTENTS.EXECUTION_REQUEST, { hasActiveAgent });
  }

  if (isAuthorityConceptualSynthesis(content)) {
    return buildAuthorityDecision(CONTEXT_AUTHORITY_INTENTS.CONCEPTUAL_SYNTHESIS, { hasActiveAgent });
  }

  return buildAuthorityDecision(CONTEXT_AUTHORITY_INTENTS.DIRECT_ANSWER, { hasActiveAgent });
}

if (typeof window !== 'undefined') {
  window.CONTEXT_AUTHORITY_ORDER = CONTEXT_AUTHORITY_ORDER;
  window.CONTEXT_AUTHORITY_INTENTS = CONTEXT_AUTHORITY_INTENTS;
  window.resolveContextAuthority = resolveContextAuthority;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONTEXT_AUTHORITY_ORDER,
    CONTEXT_AUTHORITY_INTENTS,
    normalizeAuthorityText,
    resolveContextAuthority
  };
}
