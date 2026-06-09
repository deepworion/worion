# RAW REPO SWEEP - 2026-05-22

## 1. Arquivos contendo Grounding Gates / Narrative Claim Validator / Evidence Pack / validateGroundedResponse
- js\chat.js
- js\verification.js

## 3. Arquivo contendo a rota comparative_research
js\chat.js:62:   if (asksComparative) return 'comparative_research';
js\chat.js:102:   comparative_research: {
js\chat.js:2097:   const candidateAxes = route === 'comparative_research'
js\chat.js:2100:   const usesAxisSearch = route === 'comparative_research' && candidateAxes.length >= 2;
js\chat.js:2109:     : getDeterministicResearchQueries(content, route === 'comparative_research' ? 'focused_research' : route);
js\chat.js:2117:   if (route === 'comparative_research') {
js\chat.js:3374:       ['focused_research', 'deep_research', 'source_check', 'comparative_research'].includes(executionRoute);
js\chat.js:3452:       if (['focused_research', 'deep_research', 'source_check', 'comparative_research'].includes(route)) {

## 3. Todas as ocorrencias de maxTokens em js/chat.js
js\chat.js:84:     maxTokens: 8000,
js\chat.js:96:     maxTokens: 16000,
js\chat.js:106:     maxTokens: 8000,
js\chat.js:118:     maxTokens: 24000,
js\chat.js:130:     maxTokens: 12000,
js\chat.js:140:     maxTokens: 8000,
js\chat.js:150:     maxTokens: 16000,
js\chat.js:1565:     payload.maxTokens ??
js\chat.js:1623:       ?? payload.maxTokens
js\chat.js:2095:   const maxTokens = profile.maxTokens || getResponseTokenBudget(content);
js\chat.js:2335:     max_tokens: maxTokens,
js\chat.js:3439:       const maxTokens = executionProfile.maxTokens || getResponseTokenBudget(content);
js\chat.js:3449:       console.log('[EXECUTION ROUTER TEST] maxTokens:', executionProfile.maxTokens);
js\chat.js:3450:       console.log('[TOKEN BUDGET] route:', route, 'max_tokens:', maxTokens, 'source:', 'execution_router_or_goal_engine');
js\chat.js:3456:           max_tokens: maxTokens,
js\chat.js:3466:           max_tokens: maxTokens,
js\chat.js:3600:             max_tokens: repairProfile?.maxTokens || getResponseTokenBudget(content),
js\chat.js:4005:   const maxTokens = executionProfile?.maxTokens || getResponseTokenBudget(content);
js\chat.js:4006:   console.log('[TOKEN BUDGET] route:', route || 'goal_engine', 'max_tokens:', maxTokens, 'source:', 'execution_router_or_goal_engine');
js\chat.js:4024:       max_tokens: maxTokens,

## 4. Tamanho em linhas de cada arquivo JS em js/
agents.js: 86
app.js: 688
artifacts.js: 401
chat.js: 4065
cognitive-skills.js: 669
connectors.js: 622
contextGuardian.js: 145
logger.js: 38
memory.js: 228
projects.js: 514
prompt.js: 918
skills.js: 271
tools.js: 1392
tracing.js: 242
ui.js: 1889
utils.js: 156
v12-turbo.js: 173
verification.js: 518

## 1 e 2. Conteudo bruto completo dos arquivos

===== BEGIN FILE: js\chat.js =====
/**
 * MÃ“DULO: chat.js
 * RESPONSABILIDADE: LÃ³gica principal de chat, execuÃ§Ã£o de objetivos compostos, classificaÃ§Ã£o de pedidos e Goal Execution Engine
 * DEPENDÃŠNCIAS: connectors.js, tools.js, artifacts.js, memory.js, logger.js, prompt.js, utils.js, app.js
 * EXPORTA: callOpenAIWithRetry, getConversationTitle, getCleanMessages, getDefaultAgent, loadPreviousSessionsContext, saveCurrentSession, sendMsg, classifyUserRequest, classifyRequestHeuristic, getToolDefinition, getGoalTools, executeCompoundGoal, executeGoalToolCall, collectGoalFindings, goalExecutionState, cancelCurrentGoal, buildGoalExecutionPrompt, buildGoalReport, isComplexRequest, getSequentialThinkingContext, normalizeAssistantReply, startChat, startNewChatFromHome, openConversation, endSession, backToAgents, closePanel, leaveChatIfNeeded, resetChatToAgents, handleBeforeUnload
 * TOOLS REGISTRADAS: nenhuma
 * NÃƒO MODIFICAR SEM LER: tools.js, artifacts.js, prompt.js, app.js (orquestra todo o fluxo de chat)
 * PROBLEMAS CONHECIDOS: Goal Execution Engine v2 estÃ¡ em implementaÃ§Ã£o parcial conforme checkpoint
 */

// ============================================
// CHAT WITH OPENAI & ANTHROPIC
// ============================================

var openaiKey;
var deepseekKey;
var anthropicKey;
var silentIncorporatedContext = typeof silentIncorporatedContext === 'string' ? silentIncorporatedContext : '';
const PRIMARY_REASONING_MODEL = 'deepseek-v4-pro';
const DEEPSEEK_DEFAULT_MAX_TOKENS = 16000;
const DEEPSEEK_LONG_FORM_MAX_TOKENS = 24000;
const LEGACY_OPENAI_DEFAULTS = new Set(['gpt-4o-mini', 'gpt-4o']);
const SAFE_EXTERNAL_EVIDENCE_BLOCK = 'NÃ£o encontrei evidÃªncia externa suficiente para responder com seguranÃ§a. Para evitar inventar dados, nÃ£o vou listar nomes, datas ou fatos especÃ­ficos sem fonte verificÃ¡vel.';
const FACTUAL_BLOCKERS_TEST_MODE = true;
const WORION_EXECUTION_ROUTER_TEST = true;
const WORION_TAVILY_SECONDARY_LOCK = false;
const FACTUAL_BLOCKERS_TEST_DIRECTIVE = `## TEST MODE - Bloqueios factuais desativados

Nesta execuÃ§Ã£o de teste, Grounding Gate, Verification Engine, Narrative Claim Validator, Evidence Gate e fallback extrativo sÃ£o apenas observabilidade.
NÃ£o substitua a resposta por "nÃ£o confirmado", "nÃ£o encontrei evidÃªncia suficiente" ou mensagem genÃ©rica de bloqueio apenas por ausÃªncia de fonte, Evidence Pack vazio ou validaÃ§Ã£o factual insuficiente.
Se fontes forem coletadas, use-as e cite-as. Se faltarem dados no corpus, responda da melhor forma possÃ­vel e marque lacunas como nÃ£o confirmadas, sem bloquear a resposta final.`;

function getExecutionRoute(content = '') {
  const text = String(content || '').toLowerCase().trim();

  const asksForProof =
    /\b(comprove|prova|registro|fonte direta|onde tem registro|documento|evidÃªncia|evidencia)\b/i.test(text);

  const asksForSources =
    /\b(fonte|fontes|referÃªncia|referencia|referÃªncias|referencias|pesquise|pesquisar|tudo que encontrar|tudo que vocÃª encontrar|tudo que voce encontrar)\b/i.test(text);

  const asksDeep =
    /\b(riqueza de detalhes|anÃ¡lise densa|analise densa|pesquisa profunda|dossiÃª|dossie|relatÃ³rio completo|relatorio completo|profundo|profunda|completo|completa)\b/i.test(text);

  const asksSimple =
    /^(quem foi|quem Ã©|quem e|o que Ã©|o que e|me fale sobre|explique|resuma)\b/i.test(text);

  const asksFactualLookup =
    /\b(de onde veio|origem|etimologia|significado do nome|hist[oÃ³]ria do nome|nome .* vem de|por que .* chama|porque .* chama)\b/i.test(text);
  const asksComparative =
    /\b(compare|comparar|comparaÃ§Ã£o|comparacao|versus|vs\.?|junte|conecte)\b/i.test(text)
    || /\bentre\b[\s\S]{2,120}\be\b/i.test(text);

  if (/\b(log|logs|erro|debug|depurar|worion|deepseek|tavily|brave|grounding|gate|validator|evidence|tool loop|agent loop)\b/i.test(text)) {
    return 'internal_diagnostic';
  }

  if (/\b(cÃ³digo|codigo|json|bug|corrija|implemente|javascript|node|electron|n8n|github|commit|branch)\b/i.test(text)) {
    return 'code';
  }

  if (asksComparative) return 'comparative_research';

  if (asksForProof) return 'source_check';

  if (asksFactualLookup) return 'focused_research';

  if (asksForSources && asksDeep) return 'deep_research';

  if (asksForSources) return 'focused_research';

  if (asksDeep) return 'deep_research';

  if (asksSimple) return 'direct_answer';

  return 'direct_answer';
}

const EXECUTION_PROFILES = {
  direct_answer: {
    thinking: 'disabled',
    maxToolRounds: 0,
    tools: [],
    maxTokens: 8000,
    maxSearches: 0,
    maxFetches: 0,
    synthesisRequired: true
  },

  focused_research: {
    thinking: 'enabled',
    maxToolRounds: 2,
    tools: ['brave_search', 'fetch_url'],
    secondaryTools: ['tavily_search'],
    secondaryPolicy: 'use_tavily_only_if_brave_and_fetch_cannot_produce_an_answer',
    maxTokens: 16000,
    maxSearches: 1,
    maxFetches: 3,
    synthesisRequired: true
  },

  comparative_research: {
    thinking: 'enabled',
    maxToolRounds: 2,
    tools: ['brave_search', 'fetch_url'],
    maxTokens: 8000,
    maxSearches: 4,
    maxFetches: 4,
    synthesisRequired: true
  },

  deep_research: {
    thinking: 'enabled',
    maxToolRounds: 5,
    tools: ['brave_search', 'fetch_url'],
    secondaryTools: ['tavily_search'],
    secondaryPolicy: 'use_tavily_only_if_brave_and_fetch_cannot_produce_an_answer',
    maxTokens: 24000,
    maxSearches: 2,
    maxFetches: 5,
    synthesisRequired: true
  },

  source_check: {
    thinking: 'enabled',
    maxToolRounds: 3,
    tools: ['brave_search', 'fetch_url'],
    secondaryTools: ['tavily_search'],
    secondaryPolicy: 'use_tavily_only_if_brave_and_fetch_cannot_produce_an_answer',
    maxTokens: 12000,
    maxSearches: 1,
    maxFetches: 4,
    synthesisRequired: true
  },

  internal_diagnostic: {
    thinking: 'disabled',
    maxToolRounds: 0,
    tools: [],
    maxTokens: 8000,
    maxSearches: 0,
    maxFetches: 0,
    synthesisRequired: true
  },

  code: {
    thinking: 'enabled',
    maxToolRounds: 2,
    tools: ['github_search', 'github_fetch_file', 'fetch_url'],
    maxTokens: 16000,
    maxSearches: 0,
    maxFetches: 2,
    synthesisRequired: true
  }
};

function selectToolsByProfile(allTools = [], profile = {}) {
  const allowed = new Set(profile.tools || []);
  if (!allowed.size) return [];
  return allTools.filter(tool => allowed.has(tool.function?.name));
}

function getResearchMaterialCounts(toolResults = []) {
  return toolResults.reduce((counts, item) => {
    const name = item.toolCall?.function?.name || '';
    if (/fetch_url/i.test(name)) counts.fetchCount += 1;
    if (/(brave_search|tavily_search)/i.test(name)) counts.searchCount += 1;
    return counts;
  }, { fetchCount: 0, searchCount: 0 });
}

function hasEnoughResearchMaterial(toolResults = [], profile = {}) {
  if (!toolResults.length) return false;

  const { fetchCount, searchCount } = getResearchMaterialCounts(toolResults);
  const maxFetches = profile.maxFetches ?? 3;
  const maxSearches = profile.maxSearches ?? 2;

  return (maxFetches > 0 && fetchCount >= maxFetches)
    || (maxSearches > 0 && searchCount >= maxSearches);
}

function filterToolCallsByProfile(calls = [], toolResults = [], profile = {}) {
  const maxFetches = profile.maxFetches ?? Infinity;
  const maxSearches = profile.maxSearches ?? Infinity;
  const counts = getResearchMaterialCounts(toolResults);
  const allowedCalls = [];

  for (const call of calls) {
    const name = normalizeToolName(call.function?.name || '');
    if (/fetch_url/i.test(name)) {
      if (counts.fetchCount >= maxFetches) continue;
      counts.fetchCount += 1;
    }
    if (/(brave_search|tavily_search)/i.test(name)) {
      if (counts.searchCount >= maxSearches) continue;
      counts.searchCount += 1;
    }
    allowedCalls.push(call);
  }

  return allowedCalls;
}

function registerEvidenceSource(evidenceSources, source = {}) {
  if (!Array.isArray(evidenceSources)) return;
  evidenceSources.push({
    title: source.title || '',
    url: source.url || '',
    content: source.text || source.content || source.snippet || source.description || ''
  });
}

function hasUsableEvidence(evidenceSources) {
  return Array.isArray(evidenceSources)
    && evidenceSources.some(source =>
      source
      && source.url
      && typeof source.content === 'string'
      && source.content.trim().length >= 80
    );
}

function answerMentionsSourcesWithoutEvidence(answer, evidenceSources) {
  const mentionsSource =
    /fonte|fontes|segundo|wikip[eÃ©]dia|ibge|tre|lei estadual|arquivo|registro/i.test(answer || '');

  if (!mentionsSource) return false;

  if (!hasUsableEvidence(evidenceSources)) return true;

  const evidenceText = evidenceSources
    .map(source => `${source.title || ''} ${source.url || ''} ${source.content || ''}`)
    .join('\n')
    .toLowerCase();
  const namedSources = [
    /wikip[eÃ©]dia|wikipedia/i,
    /ibge/i,
    /\btre\b/i,
    /lei estadual/i
  ];

  return namedSources.some(pattern => pattern.test(answer || '') && !pattern.test(evidenceText));
}

// ============================================
// GROUNDING OBRIGATÃ“RIO
// ============================================

/**
 * Detecta perguntas sobre o funcionamento interno do Worion.
 * Quando true, desativa Grounding Gate, Evidence Pack externo e Narrative Claim Validator.
 * Impede que diagnÃ³stico interno seja tratado como pesquisa factual externa.
 */
function isInternalDiagnosticRequest(userMessage = '') {
  const normalized = String(userMessage || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[Ì€-Í¯]/g, '');

  const diagnosticPatterns = [
    // Perguntas sobre por que o sistema fez/nÃ£o fez algo
    /por\s*que\s+(voce|vocÃª|o\s+worion|o\s+sistema)\s+(nao|nÃ£o)\s+(est[aÃ¡]|foi|fez|consultou|usou|chamou|buscou|ativou|encontrou)/i,
    /por\s*que\s+(voce|vocÃª|o\s+worion)\s+(est[aÃ¡]|foi|fez|consultou|usou|chamou|buscou)/i,
    // Pedido de explicaÃ§Ã£o sobre comportamento do sistema
    /me\s+explica\s+(por\s*que|o\s+que|como)\s+(voce|vocÃª|o\s+worion|o\s+sistema)/i,
    /explica\s+(o\s+que|por\s*que|como)\s+(aconteceu|ocorreu|voc[eÃª]\s+fez|o\s+sistema\s+fez)/i,
    // Debugging direto
    /\b(debug|debugar|depurar|diagnosticar|investigar\s+o\s+sistema|verificar\s+o\s+sistema)\b/i,
    // Perguntas sobre componentes internos por nome
    /\b(grounding\s+gate|evidence\s+pack|verification\s+engine|narrative\s+(claim\s+)?validator|tool\s+loop|agent\s+loop)\b/i,
    /\b(brave\s+search|tavily|fetch.url|externalEvidenceRecords|evidenceSources|verificationPlan)\b/i,
    // Perguntas sobre fontes externas no contexto de diagnÃ³stico
    /por\s*que\s+(voce|vocÃª)\s+(nao|nÃ£o)\s+est[aÃ¡]\s+(consultando|usando|chamando)\s+(fonte|fontes|busca|pesquisa)\s+externa/i,
    /por\s*que\s+(as\s+)?fontes?\s+externas?\s+(nao|nÃ£o)\s+(foram|estao|estÃ£o|aparec)/i,
    // Perguntas sobre logs, tracing, fluxo interno
    /\b(log|logs|tracing|langsmith|trace|fluxo\s+interno|fluxo\s+real|pipeline)\b.*\b(worion|sistema|engine)\b/i,
    /\b(worion|sistema)\b.*\b(log|logs|tracing|trace|fluxo\s+interno|pipeline)\b/i,
    // Perguntas sobre o prÃ³prio comportamento em primeira pessoa
    /\b(voce|vocÃª)\s+(nao|nÃ£o)\s+(est[aÃ¡]|foi|fez|consultou|usou|chamou|buscou|ativou|respondeu)\b/i,
    /como\s+(voce|vocÃª|o\s+worion)\s+(decide|detecta|processa|trata|roteio|roteia|escolhe)\b/i,
    // Perguntas meta-operacionais
    /o\s+que\s+(est[aÃ¡]|foi)\s+(acontecendo|ocorrendo|bloqueando|impedindo)\b/i,
    /\b(bloqueio|bloqueado|impedido|barrado|interceptado)\b.*\b(resposta|sistema|engine|gate|validator)\b/i,
    /\b(resposta|sistema|engine|gate|validator)\b.*\b(bloqueio|bloqueado|impedido|barrado)\b/i,
  ];

  const isDiagnostic = diagnosticPatterns.some(p => p.test(normalized) || p.test(userMessage));

  if (isDiagnostic) {
    console.log('[INTERNAL DIAGNOSTIC] Pergunta de diagnÃ³stico interno detectada - grounding externo desativado');
  }

  return isDiagnostic;
}

/**
 * Detecta se a mensagem Ã© um pedido factual que exige fontes externas (GROUNDING GATE)
 */
function looksLikeFactualRequest(userMessage = '') {
  const normalized = String(userMessage || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[Ì€-Í¯]/g, '');

  // FILTRO 1: Follow-ups contextuais NÃƒO sÃ£o pedidos factuais
  const contextualFollowups = [
    /^(mas|porem|porÃ©m|e|entÃ£o|entao|ah|ok|certo)\s+(voce|vocÃª)\s+(disse|falou|listou|mencionou|respondeu)/i,
    /^(o que|como assim|por que|porque)\s+(voce|vocÃª)\s+(disse|falou|parou|cortou)/i,
    /^(continua|continue|prossiga|termine|completa)/i,
    /^(e\s+)?(o\s+)?(que|qual)\s+(mais|resto|restante)\??$/i
  ];

  if (contextualFollowups.some(p => p.test(normalized))) {
    console.log('[GROUNDING GATE] Follow-up contextual detectado - grounding desativado');
    return false;
  }

  // FILTRO 2: Mensagens muito curtas (<15 chars) provavelmente sÃ£o follow-ups
  if (normalized.length < 15 && !/\b(liste|lista|quando|onde|quem|qual)\b/.test(normalized)) {
    return false;
  }

  // PadrÃµes que indicam pedido factual OBRIGATÃ“RIO
  const factualPatterns = [
    // Listas de autoridades/cargos
    /\b(liste|lista|listar|todos|todas|relaÃ§Ã£o|relacao)\b.*\b(prefeitos?|governadores?|deputados?|senadores?|ministros?|secretÃ¡rios?|secretarios|vereadores?|gestores?|autoridades?)\b/i,
    // PerÃ­odos histÃ³ricos
    /\b(desde|a partir de|entre|de|atÃ©|ate)\s+\d{4}/i,
    /\b(histÃ³ria|histÃ³rico|historia|historico|levantamento|cronologia|linha do tempo)\b/i,
    // Perguntas factuais diretas
    /\b(quando|onde|quem|qual|quanto|quantos|quantas)\b.*\b(foi|Ã©|e|sÃ£o|sao|eram|nasceu|morreu|fundou|criou|estabeleceu)\b/i,
    // Dados demogrÃ¡ficos/geogrÃ¡ficos
    /\b(populaÃ§Ã£o|populacao|habitantes|Ã¡rea|area|territÃ³rio|territorio|capital|municÃ­pio|municipio|cidade)\b.*\b(de|em|do|da)\b/i,
    // Dados legais
    /\b(lei|decreto|portaria|resoluÃ§Ã£o|resolucao|artigo|norma)\b.*\b(nÃºmero|numero|n[oÂºÂ°])\b/i,
    // Dados econÃ´micos
    /\b(preÃ§o|preco|valor|cotaÃ§Ã£o|cotacao|taxa|Ã­ndice|indice)\b.*\b(de|em|do|da|atual|hoje)\b/i,
    // EstatÃ­sticas
    /\b(dados|estatÃ­sticas|estatisticas|nÃºmeros|numeros|Ã­ndices|indices|censo|pesquisa)\b.*\b(de|sobre|do|da)\b/i,
    // Datas especÃ­ficas
    /\b(data|dia|ano|perÃ­odo|periodo)\b.*\b(de|do|da|em que)\b.*\b(fundaÃ§Ã£o|fundacao|criaÃ§Ã£o|criacao|emancipaÃ§Ã£o|emancipacao|nascimento|morte)\b/i
  ];

  const isFactual = factualPatterns.some(pattern => pattern.test(normalized));

  if (isFactual) {
    if (!(FACTUAL_BLOCKERS_TEST_MODE && WORION_EXECUTION_ROUTER_TEST)) {
      console.log('[GROUNDING GATE] Pedido factual detectado - grounding obrigatÃ³rio ativado');
    }
  }

  return isFactual;
}

/**
 * Busca fontes externas usando Brave/Tavily DIRETAMENTE (grounding gate obrigatÃ³rio)
 */
async function fetchExternalGrounding(userMessage) {
  if (!userMessage || typeof executeToolCall !== 'function') return null;

  console.log('[GROUNDING GATE] Buscando fontes externas OBRIGATÃ“RIAS via Brave/Tavily...');

  try {
    const evidencePack = await collectEvidencePack(userMessage, { mustUseExternalEvidence: true }, {
      mode: 'grounding',
      count: 8,
      maxSources: 8,
      fetchLimit: 3,
      timeoutMs: 12000
    });

    if (!evidencePack.count) {
      console.warn('[GROUNDING GATE] Nenhuma fonte retornada por Brave/Tavily.');
      return null;
    }

    console.log(`[GROUNDING GATE] ${evidencePack.count} fontes carregadas via ${evidencePack.provider.toUpperCase()} (${evidencePack.fetchedPages.length} com conteÃºdo completo)`);

    return {
      text: evidencePack.text,
      sources: evidencePack.sources,
      count: evidencePack.count,
      provider: evidencePack.provider,
      evidencePack
    };
  } catch (error) {
    console.error('[GROUNDING GATE] ERRO CRÃTICO - Brave e Tavily falharam:', error);
    return null;
  }
}

// ============================================
// WIKIPEDIA GATE
// ============================================

const WIKIPEDIA_GATE_DOMAINS = ['history', 'geography', 'biography', 'politics'];

function extractWikipediaTopic(userMessage) {
  const text = String(userMessage || '').trim();

  const patterns = [
    // "BrasÃ­lia de Minas â€” A HistÃ³ria" (title format with dash/em-dash)
    /^([A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§]+(?:\s+(?:de|do|da|dos|das|e|d[ou]s)\s+[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§]+)*)\s*[â€”â€“\-]/,
    // "histÃ³ria de X" / "histÃ³ria do/da X"
    /\bhist[oÃ³]ria\s+(?:de|do|da|dos|das)\s+([A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§]+(?:\s+(?:de|do|da|dos|das|e)\s+[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§]+)*)/i,
    // "sobre X" / "fale sobre X" / "me conta sobre X"
    /(?:fale\s+sobre|me\s+conta\s+sobre|sobre)\s+([A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§]+(?:\s+(?:de|do|da|dos|das|e)\s+[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§]+)*)/i,
    // "quando foi fundado X" / "quem fundou X"
    /(?:quando|quem|como|onde)\s+(?:foi|fundou|criou|descobriu)\s+(?:o|a|os|as)?\s*([A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§]+(?:\s+(?:de|do|da|dos|das|e)\s+[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§]+)*)/i,
    // "X Ã© uma cidade/municÃ­pio/paÃ­s/estado"
    /^([A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§]+(?:\s+(?:de|do|da|dos|das|e)\s+[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§]+)*)\s+[eÃ©]\s+(?:um[ao]?|o|a)\s+(?:cidade|munic[Ã­i]pio|pa[Ã­i]s|estado|regi[aÃ£]o|bairro|vila|distrito)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 3) {
      return match[1].trim();
    }
  }
  return null;
}

async function fetchWikipediaDirectGrounding(userMessage, options = {}) {
  if (!userMessage || typeof executeToolCall !== 'function') return null;

  const topic = extractWikipediaTopic(userMessage);
  if (!topic) {
    console.log('[WIKIPEDIA GATE] TÃ³pico nÃ£o identificÃ¡vel na mensagem');
    return null;
  }

  const urlTopic = topic.replace(/\s+/g, '_');
  const url = `https://pt.wikipedia.org/wiki/${encodeURIComponent(urlTopic)}`;
  console.log(`[WIKIPEDIA GATE] Fetch direto: ${url}`);

  try {
    const maxChars = options.maxChars || 15000;
    const pageResult = await executeToolCall('fetch_url', { url, max_chars: maxChars });
    const content = pageResult?.text || pageResult?.content || pageResult?.rawContent || '';

    if (pageResult?.error || !content || content.trim().length < 300) {
      console.warn(`[WIKIPEDIA GATE] Falhou para "${topic}": ${pageResult?.error || 'conteÃºdo insuficiente'}`);
      return null;
    }

    console.log(`[WIKIPEDIA GATE] Sucesso â€” ${content.length} chars de pt.wikipedia.org/wiki/${urlTopic}`);

    const source = {
      title: topic,
      url,
      content: content.slice(0, maxChars),
      snippet: content.slice(0, 500),
      description: `Artigo Wikipedia pt: ${topic}`,
      source: 'wikipedia',
      fetched: true,
      rank: 1,
      sourceHierarchy: '[FONTE PRIMÃRIA]'
    };

    const evidenceSources = [source];
    const context = typeof formatVerificationExternalEvidence === 'function'
      ? formatVerificationExternalEvidence(evidenceSources, { mustUseExternalEvidence: true }, { mode: 'grounding', query: userMessage })
      : `[FONTE PRIMÃRIA] Wikipedia â€” ${topic}\n\n${content.slice(0, maxChars)}`;

    return {
      query: userMessage,
      text: context,
      context,
      sources: evidenceSources,
      evidenceSources,
      evidenceRecords: [{ function: { name: 'fetch_url' } }],
      fetchedPages: [{ url, content: content.slice(0, maxChars), title: topic, ok: true }],
      count: 1,
      provider: 'wikipedia',
      errors: []
    };
  } catch (error) {
    console.warn('[WIKIPEDIA GATE] Erro:', error.message);
    return null;
  }
}

/**
 * Valida se a resposta estÃ¡ ancorada nas fontes fornecidas (BARREIRA FINAL)
 */
function validateGroundedResponse(responseText, groundingData) {
  if (!responseText || typeof responseText !== 'string') {
    return { valid: true };
  }

  // BARREIRA 1: Se nÃ£o havia fontes, resposta NÃƒO PODE conter dados factuais
  if (!groundingData || !groundingData.sources?.length) {
    const factualPatterns = [
      /\b\d{4}\b/,  // Anos
      /\b[A-ZÃÃ‰ÃÃ“ÃšÃ‚ÃŠÃ”ÃƒÃ•][a-zÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£Ãµ]+\s+(?:[A-ZÃÃ‰ÃÃ“ÃšÃ‚ÃŠÃ”ÃƒÃ•][a-zÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£Ãµ]+\s*){1,3}\b/,  // Nomes prÃ³prios
      /\b(prefeito|governador|deputado|senador|ministro|secretÃ¡rio|vereador)/i,  // Cargos
      /\b(lei|decreto|portaria|resoluÃ§Ã£o)\s+n[Ãºu]mero/i,  // Leis
      /\bpopula[cÃ§][aÃ£]o.*\d/i  // PopulaÃ§Ã£o com nÃºmeros
    ];

    const hasFactualContent = factualPatterns.some(p => p.test(responseText));

    if (hasFactualContent) {
      return {
        valid: false,
        reason: 'GROUNDING GATE VIOLADO: Resposta contÃ©m dados factuais sem que Brave/Tavily tenham retornado fontes.'
      };
    }

    return { valid: true };
  }

  // BARREIRA 2: Se havia fontes, nomes mencionados DEVEM estar nas fontes
  const namesInResponse = responseText.match(/\b[A-ZÃÃ‰ÃÃ“ÃšÃ‚ÃŠÃ”ÃƒÃ•][a-zÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£Ãµ]+\s+(?:[A-ZÃÃ‰ÃÃ“ÃšÃ‚ÃŠÃ”ÃƒÃ•][a-zÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£Ãµ]+\s*){1,4}\b/g) || [];

  if (namesInResponse.length === 0) {
    return { valid: true }; // Sem nomes especÃ­ficos, OK
  }

  // Filtra nomes comuns (meses, dias, etc.)
  const commonWords = new Set([
    'Janeiro', 'Fevereiro', 'MarÃ§o', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    'Segunda', 'TerÃ§a', 'Quarta', 'Quinta', 'Sexta', 'SÃ¡bado', 'Domingo',
    'Brasil', 'Minas', 'Gerais', 'SÃ£o Paulo', 'Rio', 'Janeiro'
  ]);

  const relevantNames = namesInResponse.filter(name => {
    const firstName = name.split(' ')[0];
    return !commonWords.has(firstName);
  });

  if (relevantNames.length === 0) {
    return { valid: true };
  }

  // Concatena todo o conteÃºdo das fontes
  const sourcesContent = groundingData.sources
    .map(s => `${s.title || ''} ${s.snippet || ''} ${s.description || ''} ${s.content || ''}`)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[Ì€-Í¯]/g, '');

  // Verifica se ao menos 60% dos nomes relevantes aparecem nas fontes (threshold mais alto)
  const validNames = relevantNames.filter(name => {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[Ì€-Í¯]/g, '');
    return sourcesContent.includes(normalized);
  });

  const validationRatio = validNames.length / relevantNames.length;
  const groundingConfig = worionConfig?.grounding || {};
  const minimumVerificationPercent = Number(groundingConfig.minimumVerificationPercent ?? 10);
  const primarySourceDomains = Array.isArray(groundingConfig.fallbackPrimarySources)
    ? groundingConfig.fallbackPrimarySources
    : ['wikipedia.org', 'gov.br', 'leg.br', 'jus.br', 'org.br'];
  const primarySources = (groundingData.sources || []).filter(source => {
    const url = String(source?.url || '').toLowerCase();
    return primarySourceDomains.some(domain => url.includes(String(domain).toLowerCase()));
  });
  const hasPrimarySource = primarySources.length > 0;

  // Threshold dinÃ¢mico: documentos histÃ³ricos extensos (>40 nomes) usam threshold mais baixo
  // porque incluem contexto narrativo alÃ©m dos dados principais
  const threshold = relevantNames.length > 40 ? 0.10 : 0.45;

  // Para documentos extensos, se validou pelo menos 5 nomes absolutos, considerar OK
  // (indica que os dados principais estÃ£o corretos, resto Ã© contexto)
  const hasEnoughAbsoluteValidation = relevantNames.length > 40 && validNames.length >= 5;

  if (validationRatio < threshold && !hasEnoughAbsoluteValidation) {
    const verificationPercent = Math.round(validationRatio * 100);
    if (
      groundingConfig.fallbackToPrimarySource !== false &&
      hasPrimarySource
    ) {
      const disclaimer = groundingConfig.includeDisclaimerOnFallback !== false
        ? `\n\n${groundingConfig.disclaimerText || 'Nem todos os dados puderam ser confirmados em fontes independentes. Consulte fontes oficiais para validacao completa.'}`
        : '';
      console.warn('[GROUNDING GATE] Degradacao graciosa ativada por fonte primaria:', {
        relevantNames: relevantNames.length,
        validNames: validNames.length,
        ratio: `${verificationPercent}%`,
        primarySources: primarySources.map(source => source.url).slice(0, 3)
      });
      return {
        valid: true,
        mode: 'fallback_primary_source',
        disclaimer,
        verifiedPercent: verificationPercent,
        primarySources
      };
    }

    console.warn('[GROUNDING GATE] BARREIRA FINAL ATIVADA:', {
      relevantNames: relevantNames.length,
      validNames: validNames.length,
      ratio: `${Math.round(validationRatio * 100)}%`,
      threshold: `${threshold * 100}%`,
      invalidNames: relevantNames.filter(n => !validNames.includes(n)).slice(0, 5)
    });

    return {
      valid: false,
      reason: `GROUNDING GATE VIOLADO: ${validNames.length} de ${relevantNames.length} nomes verificados nas fontes (${Math.round(validationRatio * 100)}%). MÃ­nimo: ${threshold * 100}%.`
    };
  }

  console.log('[GROUNDING GATE] ValidaÃ§Ã£o passou:', {
    relevantNames: relevantNames.length,
    validNames: validNames.length,
    ratio: `${Math.round(validationRatio * 100)}%`
  });

  return { valid: true };
}

function normalizeClaimText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNarrativeClaims(responseText = '') {
  return String(responseText || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(line => line.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)
    .filter(line => !/^<small>fontes:/i.test(line))
    .filter(line => !/^fontes?:/i.test(line))
    .filter(line => !/^_?motivo tÃ©cnico:/i.test(line))
    .filter(line => {
      return /\b(?:1[5-9]\d{2}|20\d{2})\b/.test(line)
        || /\b\d+(?:[.,]\d+)?\s?(?:%|km|habitantes|anos|r\$|us\$|mil|milh[oÃµ]es?|bilh[oÃµ]es?)\b/i.test(line)
        || /\b(prefeito|governador|deputado|senador|ministro|secret[aÃ¡]rio|vereador|lei|decreto|portaria|resolu[cÃ§][aÃ£]o|fundou|nasceu|morreu|ocorreu|criou)\b/i.test(line)
        || /\b[A-ZÃÃ‰ÃÃ“ÃšÃ‚ÃŠÃ”ÃƒÃ•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£ÃµÃ§]+\s+(?:[A-ZÃÃ‰ÃÃ“ÃšÃ‚ÃŠÃ”ÃƒÃ•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£ÃµÃ§]+|d[aeo]s?|e)\s+[A-ZÃÃ‰ÃÃ“ÃšÃ‚ÃŠÃ”ÃƒÃ•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£ÃµÃ§]+/u.test(line);
    })
    .slice(0, 24);
}

function extractClaimAnchors(claim = '') {
  const anchors = [];
  const years = claim.match(/\b(?:1[5-9]\d{2}|20\d{2})\b/g) || [];
  const numbers = claim.match(/\b\d+(?:[.,]\d+)?\s?(?:%|km|habitantes|anos|r\$|us\$|mil|milh[oÃµ]es?|bilh[oÃµ]es?)\b/gi) || [];
  const legalRefs = claim.match(/\b(?:lei|decreto|portaria|resolu[cÃ§][aÃ£]o)\s+(?:n[Âºo.]?\s*)?\d[\w./-]*/gi) || [];
  const names = claim.match(/\b[A-ZÃÃ‰ÃÃ“ÃšÃ‚ÃŠÃ”ÃƒÃ•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£ÃµÃ§]+\s+(?:(?:d[aeo]s?|e)\s+)?[A-ZÃÃ‰ÃÃ“ÃšÃ‚ÃŠÃ”ÃƒÃ•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£ÃµÃ§]+(?:\s+(?:(?:d[aeo]s?|e)\s+)?[A-ZÃÃ‰ÃÃ“ÃšÃ‚ÃŠÃ”ÃƒÃ•Ã‡][a-zÃ¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã£ÃµÃ§]+){0,3}\b/gu) || [];
  const commonNames = new Set(['nao confirmado', 'brave search', 'tavily search', 'tribunal regional eleitoral']);

  for (const item of [...years, ...numbers, ...legalRefs, ...names]) {
    const normalized = normalizeClaimText(item);
    if (normalized.length >= 3 && !commonNames.has(normalized)) anchors.push(normalized);
  }

  return [...new Set(anchors)];
}

function validateNarrativeClaims(responseText, evidencePack = {}, options = {}) {
  if (!options.enabled || options.hasArtifact || options.isContextualFollowup) {
    return { valid: true, skipped: true, reason: 'ValidaÃ§Ã£o narrativa nÃ£o aplicÃ¡vel.' };
  }

  const sources = evidencePack?.evidenceSources || evidencePack?.sources || [];
  if (!Array.isArray(sources) || !sources.length) {
    return { valid: true, skipped: true, reason: 'Sem Evidence Pack; gates existentes tratam ausÃªncia de fonte.' };
  }

  const evidenceText = normalizeClaimText(
    sources.map(source => [
      source.title,
      source.url,
      source.content,
      source.snippet,
      source.description
    ].filter(Boolean).join(' ')).join('\n')
  );
  if (!evidenceText) return { valid: true, skipped: true, reason: 'Evidence Pack sem texto validÃ¡vel.' };

  const claims = extractNarrativeClaims(responseText);
  if (!claims.length) return { valid: true, claimsChecked: 0 };

  const unsupported = [];
  for (const claim of claims) {
    const anchors = extractClaimAnchors(claim);
    if (!anchors.length) continue;
    const hits = anchors.filter(anchor => evidenceText.includes(anchor));
    const requiredHits = anchors.length >= 4 ? 2 : 1;
    if (hits.length < requiredHits) {
      unsupported.push({ claim, anchors: anchors.slice(0, 5), hits });
    }
  }

  const unsupportedRatio = unsupported.length / Math.max(claims.length, 1);
  const shouldBlock = unsupported.length >= 3 || (claims.length >= 3 && unsupportedRatio > 0.35);
  if (shouldBlock) {
    return {
      valid: false,
      claimsChecked: claims.length,
      unsupportedCount: unsupported.length,
      unsupported: unsupported.slice(0, 5),
      reason: `${unsupported.length} de ${claims.length} afirmaÃ§Ãµes narrativas nÃ£o encontraram Ã¢ncoras suficientes no Evidence Pack.`
    };
  }

  return {
    valid: true,
    claimsChecked: claims.length,
    unsupportedCount: unsupported.length
  };
}

function buildOfficialEvidenceExtractiveAnswer(userMessage = '', evidencePack = {}) {
  const sources = (evidencePack?.evidenceSources || evidencePack?.sources || [])
    .filter(source => isOfficialEvidenceUrl(source.url) && String(source.content || '').trim());
  if (!sources.length) return '';

  const source = sources[0];
  const sourceHost = (() => {
    try {
      return new URL(String(source.url || '')).hostname;
    } catch {
      return 'fonte oficial';
    }
  })();
  const title = String(userMessage || '').trim()
    ? `Pesquisa: ${String(userMessage || '').trim()}`
    : (source.title || 'Pesquisa com fonte oficial');
  const paragraphs = String(source.content || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=\.)\s+/)
    .map(part => part.trim())
    .filter(part => part.length >= 80)
    .filter(part => !/javascript|cookie|menu|compartilhe|facebook|twitter|instagram/i.test(part));
  const relevant = paragraphs
    .filter(part => /hist[oÃ³]rico|hist[oÃ³]ria|munic[iÃ­]pio|distrito|vila|cidade|lei|decreto|criado|criada|elevad|denomina|gent[iÃ­]lico|forma[cÃ§][aÃ£]o|administrativ/i.test(part))
    .slice(0, 8);
  const selected = relevant.length ? relevant : paragraphs.slice(0, 6);
  if (!selected.length) return '';

  return [
    `## ${title}`,
    '',
    'Resposta baseada exclusivamente no conteÃºdo oficial aberto abaixo. NÃ£o estou completando lacunas com conhecimento interno.',
    '',
    ...selected.map(part => `- ${part}`),
    '',
    `<small>Fonte: [${source.title || sourceHost}](${source.url})</small>`
  ].join('\n');
}

function applyEvidenceGate(finalAnswer, verificationPlan, evidenceSources) {
  const needsEvidence = verificationPlan?.mustUseExternalEvidence === true;
  const hasEvidence = hasUsableEvidence(evidenceSources);
  const hasFakeSourceRisk = answerMentionsSourcesWithoutEvidence(finalAnswer, evidenceSources);

  if (FACTUAL_BLOCKERS_TEST_MODE) {
    if (needsEvidence && (!hasEvidence || hasFakeSourceRisk)) {
      console.warn('[EVIDENCE GATE] TEST MODE: bloqueio factual desativado; resposta preservada.', {
        needsEvidence,
        hasEvidence,
        hasFakeSourceRisk
      });
    }
    return finalAnswer;
  }

  if (needsEvidence && (!hasEvidence || hasFakeSourceRisk)) {
    return SAFE_EXTERNAL_EVIDENCE_BLOCK;
  }

  return finalAnswer;
}

function enforceEvidencePlanForSensitiveQuery(verificationPlan = {}, userMessage = '') {
  const normalized = String(userMessage || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');
  const mentionsPublicOffice = /\b(prefeito|prefeita|prefeitos|prefeitas|vereador|vereadora|vereadores|vereadoras|governante|autoridade|autoridades)\b/i.test(normalized);
  const asksForListOrTimeline = /\b(lista|liste|listar|todos|todas|desde|inicio|fundacao|mandato|mandatos|gestao|gestoes)\b/i.test(normalized);
  const municipalHistory = /\b(historia|historico|fundacao|criacao|criado|criada|emancipacao|desmembrad[ao]|municipio|cidade)\b/i.test(normalized);

  if (!(mentionsPublicOffice && asksForListOrTimeline) && !municipalHistory) {
    return verificationPlan;
  }

  return {
    ...verificationPlan,
    requiresVerification: true,
    mustUseExternalEvidence: true,
    domain: mentionsPublicOffice ? 'politics' : (verificationPlan.domain || 'history'),
    minimumSources: Math.max(Number(verificationPlan.minimumSources || 0), 2),
    priority: 1,
    forcedBy: 'sensitive_public_authority_or_municipal_history'
  };
}

function registerToolEvidenceSources(evidenceSources, toolCall, result) {
  const toolName = String(toolCall?.function?.name || toolCall?.name || '').toLowerCase();
  if (!/(brave_search|tavily_search|fetch_url|web_search|search)/i.test(toolName) || !result || result.error) return;

  const directUrl = result.url || result.sourceUrl || '';
  const directContent = result.text || result.content || result.markdown || result.body || result.snippet || '';
  if (directUrl || directContent) {
    registerEvidenceSource(evidenceSources, {
      title: result.title || result.name || toolName,
      url: directUrl,
      content: directContent
    });
  }

  for (const item of getExternalEvidenceItems(result)) {
    registerEvidenceSource(evidenceSources, {
      title: item.title || '',
      url: item.url || '',
      content: item.text || item.content || item.snippet || item.description || ''
    });
  }
}

function getExternalEvidenceItems(result) {
  if (!result || result.error) return [];
  const seen = new Set();
  return [...(result.results || []), ...(result.news || []), ...(result.discussions || [])]
    .filter(item => item?.url || item?.title || item?.description)
    .filter(item => {
      const key = item.url || `${item.title}|${item.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mergeExternalSearchResults(query, batches = []) {
  const merged = {
    query,
    results: [],
    news: [],
    discussions: [],
    providers: [],
    errors: []
  };
  const seen = new Set();

  for (const batch of batches) {
    const provider = batch.provider || batch.source || 'search';
    merged.providers.push(provider);
    if (batch.error) {
      merged.errors.push({ provider, error: batch.error });
      continue;
    }

    for (const bucket of ['results', 'news', 'discussions']) {
      for (const item of batch[bucket] || []) {
        const key = item.url || `${item.title}|${item.description || item.snippet || ''}`;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged[bucket].push({ ...item, source: item.source || provider });
      }
    }
  }

  if (!merged.results.length && !merged.news.length && !merged.discussions.length && merged.errors.length) {
    merged.error = merged.errors.map(item => `${item.provider}: ${item.error}`).join(' | ');
  }

  return merged;
}

async function searchExternalSources(query, options = {}, timeoutMs = 9000) {
  const shared = {
    query,
    count: options.count || 5,
    freshness: options.freshness,
    country: options.country || 'BR'
  };
  const tavilyAllowed =
    !WORION_TAVILY_SECONDARY_LOCK ||
    options.allowTavilyFallback === true ||
    options.forceTavily === true;
  const searches = [
    {
      provider: 'brave',
      promise: executeToolCall('brave_search', {
        ...shared,
        search_lang: options.search_lang || 'pt-br'
      })
    }
  ];

  if (tavilyAllowed) {
    searches.push({
      provider: 'tavily',
      promise: executeToolCall('tavily_search', {
        ...shared,
        topic: options.topic || 'general',
        search_depth: options.search_depth || 'basic',
        include_answer: options.include_answer || false,
        include_raw_content: options.include_raw_content || false
      })
    });
  } else {
    console.log('[SEARCH ROUTER] Tavily secundÃ¡ria bloqueada; usando Brave como busca primÃ¡ria.');
  }

  const batches = await Promise.all(searches.map(async item => {
    const result = await withTimeout(
      item.promise,
      timeoutMs,
      { error: 'Pesquisa externa excedeu o tempo limite.' }
    );
    return { provider: item.provider, ...(result || {}) };
  }));

  return mergeExternalSearchResults(query, batches);
}

function getSearchEvidenceItems(searchResult = {}) {
  const seen = new Set();
  return [...(searchResult.results || []), ...(searchResult.news || []), ...(searchResult.discussions || [])]
    .filter(item => item && (item.url || item.title || item.snippet || item.description || item.rawContent))
    .filter(item => {
      const key = item.url || `${item.title}|${item.snippet || item.description || ''}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getEvidenceProviderName(source = {}) {
  return String(source.source || source.provider || 'search').trim().toLowerCase();
}

function getEvidenceToolName(provider = '') {
  const normalized = String(provider || '').toLowerCase();
  if (normalized.includes('tavily')) return 'tavily_search';
  if (normalized.includes('fetch')) return 'fetch_url';
  return 'brave_search';
}

function buildEvidenceRecords(evidenceSources = [], fetchedPages = []) {
  const records = [];
  const providerNames = new Set(
    evidenceSources
      .map(source => getEvidenceProviderName(source))
      .filter(provider => provider && provider !== 'search')
  );

  for (const provider of providerNames) {
    records.push({ function: { name: getEvidenceToolName(provider) } });
  }
  for (const page of fetchedPages) {
    if (page?.url) records.push({ function: { name: 'fetch_url' } });
  }

  return records;
}

const PRIMARY_EVIDENCE_SOURCE_MARKER = '[FONTE PRIMÃRIA]';
const SECONDARY_EVIDENCE_SOURCE_MARKER = '[FONTE SECUNDÃRIA]';
const SOURCE_HIERARCHY_INSTRUCTION = [
  'HIERARQUIA DE FONTES OBRIGATÃ“RIA:',
  '1. Use EXCLUSIVAMENTE o conteÃºdo das [FONTE PRIMÃRIA] para dados populacionais, datas, leis e nÃºmeros.',
  '2. [FONTE SECUNDÃRIA] pode complementar contexto narrativo mas NUNCA sobrescrever dado de [FONTE PRIMÃRIA].',
  '3. Se [FONTE PRIMÃRIA] nÃ£o contiver um dado, responda: "[dado nÃ£o encontrado nas fontes oficiais]".',
  '4. NUNCA complete lacunas com conhecimento interno em questÃµes factuais.'
].join('\n');

function getEvidenceUrlHost(url = '') {
  try {
    return new URL(String(url || '')).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeEvidenceMarkerText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHighTrustPrimaryEvidenceSource(source = {}) {
  const host = getEvidenceUrlHost(source.url);
  if (!host) return false;
  if (host === 'ibge.gov.br' || host.endsWith('.ibge.gov.br')) return true;
  if (host === 'wikipedia.org' || host.endsWith('.wikipedia.org')) return true;

  const isGovBr = host === 'gov.br' || host.endsWith('.gov.br');
  if (!isGovBr) return false;

  const sourceText = normalizeEvidenceMarkerText([
    source.url,
    source.title,
    source.content,
    source.snippet,
    source.description
  ].filter(Boolean).join(' '));

  return /\bprefeitura\b|\bprefeitura municipal\b|\bmunicipio\b|\bmunicipal\b/.test(sourceText);
}

function getEvidenceSourceHierarchyMarker(source = {}) {
  return isHighTrustPrimaryEvidenceSource(source)
    ? PRIMARY_EVIDENCE_SOURCE_MARKER
    : SECONDARY_EVIDENCE_SOURCE_MARKER;
}

function isOfficialEvidenceUrl(url = '') {
  const host = getEvidenceUrlHost(url);
  return Boolean(host) && (
    host.endsWith('.gov.br') ||
    host.endsWith('.leg.br') ||
    host.endsWith('.jus.br') ||
    host.endsWith('.mp.br')
  );
}

function createEmptyEvidencePack(content = '', reason = '') {
  return {
    query: content,
    text: '',
    context: '',
    sources: [],
    evidenceSources: [],
    evidenceRecords: [],
    fetchedPages: [],
    count: 0,
    provider: 'none',
    searchResult: null,
    errors: reason ? [reason] : []
  };
}

function formatVerificationExternalEvidence(results = [], verificationPlan = {}, options = {}) {
  const sources = Array.isArray(results) ? results : [];
  if (!sources.length) return '';
  const mode = options.mode === 'grounding' ? 'GROUNDING GATE' : 'EVIDENCE PACK';
  const header = options.query ? `Busca realizada: "${options.query}"` : '';
  const instruction = [
    `## ${mode} - EVIDÃŠNCIA EXTERNA COLETADA AUTOMATICAMENTE`,
    header,
    '',
    SOURCE_HIERARCHY_INSTRUCTION,
    '',
    'Use exclusivamente o conteÃºdo das fontes abaixo. Se uma fonte falhou ou estÃ¡ vazia, descarte-a completamente. NÃ£o complete lacunas com conhecimento interno.',
    '**INSTRUÃ‡ÃƒO CRÃTICA:** Use estas fontes como base factual primÃ¡ria.',
    'NÃ£o complete nomes, datas, cargos, nÃºmeros ou eventos com memÃ³ria interna.',
    'Se uma afirmaÃ§Ã£o factual nÃ£o estiver sustentada pelo conteÃºdo abaixo, trate como nÃ£o confirmada.',
    'Cite URLs quando usar dados especÃ­ficos.'
  ].filter(Boolean).join('\n');

  const sourceText = sources.map((source, index) => {
    const provider = getEvidenceProviderName(source).toUpperCase() || 'SEARCH';
    const fetched = source.fetched ? 'sim' : 'nÃ£o';
    const sourceHierarchy = source.sourceHierarchy || getEvidenceSourceHierarchyMarker(source);
    return [
      `### Fonte ${index + 1} ${sourceHierarchy} (${provider})`,
      `ClassificaÃ§Ã£o da fonte: ${sourceHierarchy}`,
      `URL: ${source.url || 'N/A'}`,
      `TÃ­tulo: ${source.title || 'N/A'}`,
      `ConteÃºdo aberto com fetch_url: ${fetched}`,
      `ConteÃºdo ${sourceHierarchy}: ${source.content || source.snippet || source.description || 'N/A'}`
    ].join('\n');
  }).join('\n\n');

  return `\n\n${instruction}\n\n${sourceText}`;
}

async function collectEvidencePack(content, verificationPlan = {}, options = {}) {
  if (!content || typeof executeToolCall !== 'function') {
    return createEmptyEvidencePack(content, 'executeToolCall indisponÃ­vel');
  }
  if (!verificationPlan?.mustUseExternalEvidence && !options.force && options.mode !== 'grounding') {
    return createEmptyEvidencePack(content);
  }

  const maxSources = Math.max(1, Math.min(Number(options.maxSources || options.count || 5), 10));
  const fetchLimit = Math.max(0, Math.min(Number(options.fetchLimit ?? 3), maxSources));
  const maxContentChars = Math.max(1000, Math.min(Number(options.maxContentChars || 5000), 12000));
  const timeoutMs = Math.max(3000, Math.min(Number(options.timeoutMs || 9000), 20000));

  let searchResult;
  try {
    searchResult = await searchExternalSources(content, {
      count: maxSources,
      country: options.country || 'BR',
      search_lang: options.search_lang || 'pt-br',
      topic: options.topic || 'general',
      search_depth: options.search_depth || 'basic',
      include_raw_content: Boolean(options.include_raw_content)
    }, timeoutMs);
  } catch (error) {
    console.error('[EVIDENCE PACK] Falha na busca externa:', error);
    return createEmptyEvidencePack(content, error.message);
  }

  const searchItems = getSearchEvidenceItems(searchResult).slice(0, maxSources);
  if (!searchItems.length) {
    return {
      ...createEmptyEvidencePack(content, searchResult?.error || 'Nenhuma fonte retornada'),
      searchResult,
      errors: searchResult?.errors || (searchResult?.error ? [searchResult.error] : [])
    };
  }

  const hasRealContent = value => String(value || '').trim().length > 0;
  const getFetchedContent = pageResult => (
    pageResult?.text ||
    pageResult?.content ||
    pageResult?.rawContent ||
    pageResult?.raw_content ||
    ''
  );
  const fetchCandidates = searchItems.filter(item => item.url);
  const primaryFetchCandidates = fetchCandidates.filter(item => isHighTrustPrimaryEvidenceSource(item));
  const fetchTargetLimit = Math.max(fetchLimit, Math.min(primaryFetchCandidates.length, maxSources));
  const fetchTargets = [];
  const seenFetchUrls = new Set();
  for (const item of [...primaryFetchCandidates, ...fetchCandidates]) {
    if (!item.url || seenFetchUrls.has(item.url)) continue;
    seenFetchUrls.add(item.url);
    fetchTargets.push(item);
    if (fetchTargets.length >= fetchTargetLimit) break;
  }
  const fetchResults = await Promise.all(fetchTargets.map(async item => {
    try {
      const pageResult = await executeToolCall('fetch_url', { url: item.url, max_chars: maxContentChars });
      const pageContent = getFetchedContent(pageResult);
      if (!pageResult?.error && hasRealContent(pageContent)) {
        return {
          ok: true,
          url: item.url,
          title: item.title || '',
          content: pageContent.slice(0, maxContentChars)
        };
      }
      return {
        ok: false,
        url: item.url,
        error: pageResult?.error || 'fetch_url retornou conteÃºdo vazio'
      };
    } catch (error) {
      console.warn('[EVIDENCE PACK] Falha ao abrir URL:', item.url, error.message);
      return {
        ok: false,
        url: item.url,
        error: error.message
      };
    }
  }));

  const failedFetchUrls = new Set(fetchResults.filter(page => !page.ok).map(page => page.url));
  const fetchedPages = fetchResults.filter(page => page.ok);
  const fetchedByUrl = new Map(fetchedPages.map(page => [page.url, page]));
  const evidenceSourcesFromFetchedPages = searchItems.map((item, index) => {
    if (item.url && failedFetchUrls.has(item.url)) return null;
    const fetched = item.url ? fetchedByUrl.get(item.url) : null;
    if (!fetched) return null;
    const content = fetched.content;

    return {
      title: item.title || fetched?.title || '',
      url: item.url || '',
      content,
      snippet: item.snippet || item.description || '',
      description: item.description || item.snippet || '',
      source: item.source || item.provider || '',
      fetched: Boolean(fetched),
      rank: index + 1
    };
  }).filter(source => source && hasRealContent(source.content));
  const evidenceSources = evidenceSourcesFromFetchedPages.map(source => ({
    ...source,
    sourceHierarchy: getEvidenceSourceHierarchyMarker(source)
  }));

  const providerNames = [...new Set(evidenceSources.map(source => getEvidenceProviderName(source)).filter(Boolean))];
  const provider = providerNames.length ? providerNames.join('+') : 'search';
  const context = formatVerificationExternalEvidence(evidenceSources, verificationPlan, {
    mode: options.mode,
    query: content
  });
  const evidenceRecords = buildEvidenceRecords(evidenceSources, fetchedPages);

  console.log('[EVIDENCE PACK] Fontes:', evidenceSources.length, 'fetch_url:', fetchedPages.length, 'providers:', provider);

  return {
    query: content,
    text: context,
    context,
    sources: evidenceSources,
    evidenceSources,
    evidenceRecords,
    fetchedPages,
    count: evidenceSources.length,
    provider,
    searchResult,
    errors: searchResult?.errors || []
  };
}

async function collectVerificationExternalEvidence(content, verificationPlan = {}) {
  return collectEvidencePack(content, verificationPlan, {
    mode: 'verification',
    count: 5,
    maxSources: 5,
    fetchLimit: 3,
    timeoutMs: 9000
  });
}

function buildAssimilationReplyFromNotionRead(result, userRequest) {
  if (!result || typeof result !== 'object' || result.type !== 'notion_read') return String(result || '');
  rememberNotionReadContext(result, userRequest);
  if (!result.success) return result.reply || 'Consegui acessar o Notion, mas nao veio texto suficiente para assimilar com seguranca.';
  if (!result.silent) return result.reply || result.confirmation || '';
  if (typeof generateContextualAssimilationResponse !== 'function') {
    return result.confirmation || '';
  }

  const pages = Array.isArray(result.pages) ? result.pages : [];
  const content = pages.map(page => [
    page.title || '',
    page.updatedAt || '',
    page.content || ''
  ].filter(Boolean).join('\n')).join('\n\n');

  return generateContextualAssimilationResponse({
    sourceType: 'notion_sessions',
    activeAgent: currentAgent,
    userProfile,
    content,
    projects: typeof inferAssimilationProjects === 'function' ? inferAssimilationProjects(content) : [],
    extractedThemes: typeof inferAssimilationThemes === 'function' ? inferAssimilationThemes(content) : [],
    insights: typeof inferAssimilationInsights === 'function' ? inferAssimilationInsights(content) : [],
    sourceCount: pages.length
  });
}

function shouldAssimilateAttachmentsOnly(text, attachments = []) {
  if (!Array.isArray(attachments) || !attachments.length) return false;
  const normalized = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');
  const wantsAssimilation = /\b(leia|ler|entenda|entender|incorpore|incorporar|assimile|assimilar|guarde|contexto|carregue|carregar)\b/i.test(normalized);
  const wantsExposition = /\b(resuma|resumo|sintetize|liste|analise|explique|mostre|quais|qual|o que|pontos principais|detalhe)\b/i.test(normalized) || /\?/.test(text || '');
  return wantsAssimilation && !wantsExposition;
}

function buildAttachmentAssimilationReply(attachments = []) {
  const textAttachments = attachments.filter(file => (file.kind === 'text' || file.kind === 'unsupported') && (file.extractedText || file.text));
  const content = textAttachments.map(file => [
    `# ${file.name || 'arquivo'}`,
    file.extractedText || file.text || ''
  ].join('\n')).join('\n\n---\n\n');

  if (!content.trim()) {
    return 'O anexo entrou na conversa, mas nao trouxe texto legivel para eu assimilar com seguranca.';
  }

  if (content && typeof appendSilentIncorporatedContext === 'function') {
    appendSilentIncorporatedContext([
      'Arquivo assimilado como contexto interno.',
      content.slice(0, 24000)
    ].join('\n\n'));
  }

  if (typeof generateContextualAssimilationResponse !== 'function') return '';
  return generateContextualAssimilationResponse({
    sourceType: 'attached_files',
    activeAgent: currentAgent,
    userProfile,
    content,
    projects: typeof inferAssimilationProjects === 'function' ? inferAssimilationProjects(content) : [],
    extractedThemes: typeof inferAssimilationThemes === 'function' ? inferAssimilationThemes(content) : [],
    insights: typeof inferAssimilationInsights === 'function' ? inferAssimilationInsights(content) : [],
    sourceCount: textAttachments.length
  });
}

function resetSilentIncorporatedContext() {
  silentIncorporatedContext = '';
}

function getSilentIncorporatedContextForPrompt() {
  return String(silentIncorporatedContext || '').trim();
}

function appendSilentIncorporatedContext(entry) {
  const cleanEntry = String(entry || '').trim();
  if (!cleanEntry) return;
  const next = [silentIncorporatedContext, cleanEntry].filter(Boolean).join('\n\n---\n\n');
  silentIncorporatedContext = next.slice(-80000);
}

function formatNotionReadContextForPrompt(result, userRequest) {
  const pages = Array.isArray(result?.pages) ? result.pages : [];
  if (!pages.length) return '';

  const metadata = pages.map((page, index) => [
    `${index + 1}. ${page.title || 'PÃ¡gina do Notion'}`,
    page.updatedAt ? `Atualizada em: ${formatDateTime(page.updatedAt)}` : '',
    page.url ? `Link: ${page.url}` : ''
  ].filter(Boolean).join('\n')).join('\n\n');

  const content = pages.map((page, index) => [
    `# ${index + 1}. ${page.title || 'PÃ¡gina do Notion'}`,
    page.url ? `Link: ${page.url}` : '',
    '',
    String(page.content || '').slice(0, 12000)
  ].join('\n')).join('\n\n---\n\n');

  return [
    'Contexto incorporado do Notion.',
    `Pedido original do usuÃ¡rio: ${userRequest}`,
    '',
    'PÃ¡ginas lidas:',
    metadata,
    '',
    'ConteÃºdo lido:',
    content
  ].join('\n');
}

function rememberNotionReadContext(result, userRequest) {
  if (!result || result.type !== 'notion_read' || !result.success) return;
  const entry = formatNotionReadContextForPrompt(result, userRequest);
  appendSilentIncorporatedContext(entry);
}

function buildDirectNotionReadReply(result, userRequest) {
  if (!result || typeof result !== 'object' || result.type !== 'notion_read') {
    return String(result || '');
  }

  rememberNotionReadContext(result, userRequest);

  if (!result.success) {
    return result.reply || 'Consegui acessar o Notion, mas nao veio texto suficiente para assimilar com seguranca.';
  }

  if (result.silent) {
    return result.confirmation || '';
  }

  return result.reply || result.confirmation || '';
}

function getAgentDomainResearchCache(agent = currentAgent) {
  if (!agent) return null;
  if (!agent.domainResearchCache) {
    agent.domainResearchCache = {
      profileKey: '',
      context: '',
      queries: [],
      updatedAt: ''
    };
  }
  return agent.domainResearchCache;
}

function getAgentDomainResearchProfileKey(agent = currentAgent) {
  const profile = agent?.specializationProfile || {};
  return JSON.stringify({
    domains: (profile.domains || []).map(domain => domain.id || domain.label),
    anchors: (profile.queryAnchors || []).slice(0, 16),
    docs: (agent?.documents || []).map(doc => [doc.name || doc.path || '', String(doc.content || '').length])
  });
}

function hasMeaningfulAgentDomainContext(agent = currentAgent) {
  const profile = agent?.specializationProfile || {};
  return Boolean(agent && Array.isArray(agent.documents) && agent.documents.some(doc => doc?.content) && profile.hasSpecialization);
}

async function buildAgentDomainResearchContext(userMessage, attachments = []) {
  if (!hasMeaningfulAgentDomainContext(currentAgent)) return '';
  if (typeof executeToolCall !== 'function' || typeof buildAgentDomainResearchQueries !== 'function') return '';

  const decision = typeof shouldAutoResearchAgentDomain === 'function'
    ? shouldAutoResearchAgentDomain(userMessage, currentAgent, attachments)
    : { shouldResearch: true, reason: 'perfil especializado do agente ativo' };
  const cache = getAgentDomainResearchCache(currentAgent);
  const profileKey = getAgentDomainResearchProfileKey(currentAgent);

  if (cache.context && cache.profileKey === profileKey && !decision.shouldResearch) {
    return cache.context;
  }

  if (cache.context && cache.profileKey === profileKey && cache.updatedAt) {
    const ageMs = Date.now() - new Date(cache.updatedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs < 30 * 60 * 1000 && !decision.shouldResearch) {
      return cache.context;
    }
  }

  if (!decision.shouldResearch && cache.context) return cache.context;
  if (!decision.shouldResearch && !cache.context) {
    const normalized = String(userMessage || '').trim();
    if (normalized.length < 25) return '';
  }

  const queries = buildAgentDomainResearchQueries(userMessage, currentAgent);
  if (!queries.length) return cache.context || '';

  const batches = [];
  const shouldPersistInConversation = !cache.context || cache.profileKey !== profileKey;
  for (const query of queries) {
    try {
      if (typeof showWorionStatus === 'function') showWorionStatus('sources');
      const result = await searchExternalSources(query, {
        count: 5,
        country: 'BR',
        search_lang: /\b(scientific|review|paper|official|documentation|theory|evidence)\b/i.test(query) ? 'en' : 'pt-br'
      }, 9000);
      batches.push({ query, ...result });
    } catch (error) {
      batches.push({ query, error: error.message });
      if (/brave search|tavily|subscription|api|vault/i.test(error.message)) break;
    }
  }

  const context = typeof formatAgentDomainResearchResults === 'function'
    ? formatAgentDomainResearchResults(batches, currentAgent)
    : '';
  if (context) {
    cache.profileKey = profileKey;
    cache.context = context;
    cache.queries = queries;
    cache.updatedAt = new Date().toISOString();
    if (shouldPersistInConversation && typeof appendSilentIncorporatedContext === 'function') {
      appendSilentIncorporatedContext([
        'Conhecimento de dominio pesquisado e incorporado ao agente ativo.',
        `Agente: ${currentAgent?.name || 'agente ativo'}`,
        `Consultas: ${queries.join(' | ')}`,
        '',
        context
      ].join('\n'));
    }
  }

  return context || cache.context || '';
}

function getResponsesInputText(content) {
  if (Array.isArray(content)) {
    return content.map(item => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      if (item.type === 'text' || item.type === 'input_text' || item.type === 'output_text') return item.text || '';
      if (item.type === 'image_url' || item.image_url) return '[Imagem anexada]';
      return JSON.stringify(item);
    }).filter(Boolean).join('\n');
  }
  if (typeof content === 'string') return content;
  if (content == null) return '';
  return JSON.stringify(content);
}

function buildResponsesPrompt(messages = []) {
  return messages.map(message => {
    const role = (message.role || 'user').toUpperCase();
    const content = getResponsesInputText(message.content);
    if (!content) return '';
    return `## ${role}\n${content}`;
  }).filter(Boolean).join('\n\n');
}

function extractResponsesOutputText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const output = Array.isArray(data?.output) ? data.output : [];
  return output.flatMap(item => Array.isArray(item.content) ? item.content : [])
    .map(part => part?.text || part?.output_text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function adaptResponsesData(data) {
  const content = extractResponsesOutputText(data);
  return {
    ...data,
    choices: [{
      finish_reason: 'stop',
      message: {
        role: 'assistant',
        content
      }
    }]
  };
}

async function callOpenAIWithRetry(payload, retries = 2) {
  return callModelWithRetry(payload, retries);
}

function getModelConfig(modelId) {
  const models = Array.isArray(availableModels) ? availableModels : [];
  return models.find(model => model.id === modelId) || null;
}

function resolveModelId(requestedModel, options = {}) {
  const task = options.task || null;
  const taskModels = {
    image_generation: 'gpt-4o',
    vision: 'gpt-4o',
    multimodal: 'gpt-4o',
    nuanced_analysis: 'claude-sonnet-4-20250514',
    long_context: 'claude-sonnet-4-20250514',
    creative_writing: 'claude-sonnet-4-20250514'
  };

  if (task && taskModels[task]) return taskModels[task];
  if (requestedModel && String(requestedModel).startsWith('claude-')) return requestedModel;
  if (requestedModel && String(requestedModel).startsWith('deepseek-')) return requestedModel;
  if (requestedModel && !LEGACY_OPENAI_DEFAULTS.has(requestedModel)) return requestedModel;
  return PRIMARY_REASONING_MODEL;
}

function getModelProvider(modelId) {
  const config = getModelConfig(modelId);
  if (config?.provider) return config.provider;
  if (String(modelId || '').startsWith('claude-')) return 'anthropic';
  if (String(modelId || '').startsWith('deepseek-')) return 'deepseek';
  return 'openai';
}

function getVisibleModelName(modelId) {
  return getModelConfig(modelId)?.name || modelId || 'modelo';
}

async function callModelWithRetry(payload, retries = 2) {
  const requestedModel = payload.model || currentAgent?.model || PRIMARY_REASONING_MODEL;
  const selectedModel = resolveModelId(requestedModel, payload);
  const provider = getModelProvider(selectedModel);
  if (typeof showWorionStatus === 'function') showWorionStatus('thinking');

  if (provider === 'deepseek') return callDeepSeekWithRetry({ ...payload, model: selectedModel }, retries);
  if (provider === 'anthropic') return callAnthropicWithRetry({ ...payload, model: selectedModel }, retries);
  return callOpenAIProviderWithRetry({ ...payload, model: selectedModel }, retries);
}

async function callOpenAIProviderWithRetry(payload, retries = 2) {
  let lastError = null;
  const selectedModel = payload.model || currentAgent?.model || 'gpt-4o-mini';

  // Montar payload correto para API OpenAI Chat Completions
  const chatPayload = {
    model: selectedModel,
    messages: payload.messages || [],
    temperature: payload.temperature ?? 0.4
  };

  const maxOutputTokens =
    payload.max_completion_tokens ??
    payload.max_tokens ??
    payload.maxTokens ??
    1200;

  chatPayload.max_completion_tokens = maxOutputTokens;

  if (payload.tools?.length) {
    chatPayload.tools = payload.tools;
    chatPayload.tool_choice = payload.tool_choice ?? 'auto';
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
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
      const data = JSON.parse(text);
      if (data.error) throw new Error(`OpenAI error: ${JSON.stringify(data.error).slice(0, 300)}`);

      // API Chat Completions jÃ¡ retorna no formato correto, nÃ£o precisa adaptaÃ§Ã£o
      await traceOpenAIResponse({
        model: selectedModel,
        prompt: chatPayload.messages?.[0]?.content || '',
        data,
        adapted: data
      });
      return data;
    }

    const retryable = [500, 502, 503, 504].includes(response.status);
    lastError = new Error(`OpenAI error ${response.status}: ${text.slice(0, 300)}`);
    await traceOpenAIError(lastError, selectedModel, chatPayload.messages?.[0]?.content || '');
    if (!retryable || attempt === retries) throw lastError;
    await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
  }
  throw lastError;
}

async function callDeepSeekWithRetry(payload, retries = 2) {
  let lastError = null;
  const selectedModel = payload.model || PRIMARY_REASONING_MODEL;
  const modelConfig = getModelConfig(selectedModel) || {};
  const baseUrl = String(modelConfig.base_url || 'https://api.deepseek.com').replace(/\/$/, '');
  if (!deepseekKey) deepseekKey = await getDeepSeekKey();

  const chatPayload = {
    model: selectedModel,
    messages: payload.messages || [],
    temperature: payload.temperature ?? 0.4,
    max_tokens: payload.max_completion_tokens
      ?? payload.max_tokens
      ?? payload.maxTokens
      ?? DEEPSEEK_DEFAULT_MAX_TOKENS
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

  for (let attempt = 0; attempt <= retries; attempt++) {
    console.log('[DEEPSEEK] max_tokens:', chatPayload.max_tokens);
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
      const data = JSON.parse(text);
      if (data.error) throw new Error(`DeepSeek error: ${JSON.stringify(data.error).slice(0, 300)}`);

      await traceOpenAIResponse({
        model: selectedModel,
        prompt: chatPayload.messages?.[0]?.content || '',
        data,
        adapted: data
      });
      return data;
    }

    if (response.status === 400) {
      console.error('[DEEPSEEK ERROR BODY]', text);
    }

    const retryable = [429, 500, 502, 503, 504].includes(response.status);
    lastError = new Error(`DeepSeek error ${response.status}: ${text.slice(0, 300)}`);
    await traceOpenAIError(lastError, selectedModel, chatPayload.messages?.[0]?.content || '');
    if (!retryable || attempt === retries) throw lastError;
    await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
  }
  throw lastError;
}

/**
 * Escolhe qual API usar baseado no contexto e domÃ­nio de verificaÃ§Ã£o.
 *
 * Regras:
 * - DomÃ­nios factuais crÃ­ticos (history, politics, legal, etc.): Claude Sonnet
 *   Haiku alucina nesses domÃ­nios; OpenAI gera rate limit em pesquisa intensiva.
 * - Pesquisas em domÃ­nios nÃ£o-crÃ­ticos: Claude Haiku (barato, suficiente)
 * - Demais casos: OpenAI gpt-4o-mini
 */
function chooseAPIForContext(isSearch = false, verificationDomain = 'general') {
  return {
    provider: 'deepseek',
    model: PRIMARY_REASONING_MODEL,
    callFn: callModelWithRetry
  };

  const CRITICAL_FACTUAL_DOMAINS = ['history', 'politics', 'legal', 'medical', 'finance', 'biography', 'geography'];
  const isCriticalDomain = CRITICAL_FACTUAL_DOMAINS.includes(verificationDomain);

  if (anthropicKey) {
    if (isSearch && isCriticalDomain) {
      // Sonnet para sÃ­ntese factual crÃ­tica: mais capaz que Haiku, sem rate limit OpenAI
      console.log(`[API SELECTION] DomÃ­nio crÃ­tico "${verificationDomain}" â€” usando Claude Sonnet`);
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        callFn: callAnthropicWithRetry
      };
    }
    if (isSearch && !isCriticalDomain) {
      // Haiku para pesquisas nÃ£o-crÃ­ticas: barato e suficiente
      console.log('[API SELECTION] Usando Claude Haiku para pesquisa (mais barato)');
      return {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        callFn: callAnthropicWithRetry
      };
    }
  }

  return {
    provider: 'openai',
    model: currentAgent?.model || 'gpt-4o-mini',
    callFn: callOpenAIWithRetry
  };
}

async function callAnthropicWithRetry(payload, retries = 2) {
  let lastError = null;
  // SEMPRE usa modelo Claude, ignora se vier modelo OpenAI
  const selectedModel = (payload.model && payload.model.startsWith('claude-'))
    ? payload.model
    : 'claude-sonnet-4-6'; // Sonnet 4.6 por padrÃ£o

  // Separar system message do restante
  const systemMessage = payload.messages?.find(m => m.role === 'system')?.content || '';

  // Converter mensagens OpenAI â†’ Anthropic format
  const anthropicMessages = [];
  for (const msg of (payload.messages || [])) {
    if (msg.role === 'system') continue; // System vai separado

    if (msg.role === 'tool') {
      // Tool results â†’ user message com tool_result content
      anthropicMessages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: msg.tool_call_id,
          content: msg.content
        }]
      });
    } else if (msg.role === 'assistant' && msg.tool_calls?.length) {
      // Assistant com tool_calls â†’ content array com text + tool_use
      const content = [];
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }
      for (const tc of msg.tool_calls) {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments || '{}')
        });
      }
      anthropicMessages.push({ role: 'assistant', content });
    } else {
      // User/assistant normais
      anthropicMessages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }

  // Montar payload para API Anthropic
  const anthropicPayload = {
    model: selectedModel,
    max_tokens: payload.max_completion_tokens || payload.max_tokens || 1200,
    messages: anthropicMessages,
    temperature: payload.temperature ?? 0.4
  };

  if (systemMessage) {
    anthropicPayload.system = systemMessage;
  }

  if (payload.tools?.length) {
    // Converter tools do formato OpenAI para Anthropic
    anthropicPayload.tools = payload.tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters
    }));
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
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
      const data = JSON.parse(text);
      if (data.error) throw new Error(`Anthropic error: ${JSON.stringify(data.error).slice(0, 300)}`);

      // Converter resposta Anthropic para formato OpenAI-like
      const textContent = data.content?.find(c => c.type === 'text')?.text || '';
      const toolUses = data.content?.filter(c => c.type === 'tool_use') || [];

      const adapted = {
        id: data.id,
        model: data.model,
        choices: [{
          message: {
            role: 'assistant',
            content: textContent,
            tool_calls: toolUses.length > 0 ? toolUses.map(c => ({
              id: c.id,
              type: 'function',
              function: {
                name: c.name,
                arguments: JSON.stringify(c.input || {})
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

      console.log('[ANTHROPIC] Resposta recebida:', selectedModel, adapted.usage);
      return adapted;
    }

    const retryable = [500, 502, 503, 504, 529].includes(response.status);
    lastError = new Error(`Anthropic error ${response.status}: ${text.slice(0, 300)}`);
    if (!retryable || attempt === retries) throw lastError;
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  throw lastError;
}

function normalizeToolName(name) {
  return String(name || '')
    .replace(/^functions\./, '')
    .trim();
}

function parseToolArguments(rawArgs) {
  if (!rawArgs) return {};
  if (typeof rawArgs === 'object') return rawArgs;
  try {
    return JSON.parse(rawArgs);
  } catch (error) {
    console.warn('[AGENT LOOP] argumentos invalidos:', error?.message || error);
    return {};
  }
}

function buildToolMessage(toolCall, toolName, toolResult) {
  return {
    role: 'tool',
    tool_call_id: toolCall.id,
    name: toolName,
    content: JSON.stringify(toolResult ?? {})
  };
}

function stripDsmlToolBlocks(content = '') {
  return String(content || '')
    .replace(/<ï½œï½œDSMLï½œï½œtool_calls>[\s\S]*?<\/ï½œï½œDSMLï½œï½œtool_calls>/g, '')
    .replace(/<\|\|DSML\|\|tool_calls>[\s\S]*?<\/\|\|DSML\|\|tool_calls>/g, '')
    .trim();
}

function isDsmlToolCallOnly(content = '') {
  const text = String(content || '').trim();
  if (!text) return false;
  if (!/<(?:ï½œï½œ|\|\|)DSML(?:ï½œï½œ|\|\|)tool_calls>/.test(text)) return false;
  return stripDsmlToolBlocks(text).length === 0;
}

function buildToolResultsSynthesisContext(toolResults = [], limit = 18000) {
  const blocks = [];
  for (const item of toolResults) {
    const toolName = item.toolCall?.function?.name || 'tool';
    const result = item.result || {};
    const results = Array.isArray(result.results) ? result.results : [];
    const url = result.url || '';
    const text = result.text || result.content || result.answer || result.description || '';
    const lines = [`Tool: ${toolName}`];

    if (url) lines.push(`URL: ${url}`);
    if (text) lines.push(`Conteudo: ${String(text).slice(0, 1800)}`);
    for (const entry of results.slice(0, 6)) {
      lines.push([
        `- ${entry.title || 'Sem titulo'}`,
        entry.url ? `URL: ${entry.url}` : '',
        entry.description || entry.snippet ? `Resumo: ${entry.description || entry.snippet}` : ''
      ].filter(Boolean).join('\n  '));
    }

    const block = lines.join('\n');
    blocks.push(block.slice(0, 3500));
    if (blocks.join('\n\n').length >= limit) break;
  }

  return blocks.join('\n\n').slice(0, limit);
}

function buildFallbackResearchReply(toolResults = []) {
  const sources = [];
  for (const item of toolResults) {
    const result = item.result || {};
    if (result.url) sources.push({ title: result.title || result.url, url: result.url });
    for (const entry of (Array.isArray(result.results) ? result.results : []).slice(0, 5)) {
      if (entry.url) sources.push({ title: entry.title || entry.url, url: entry.url });
    }
  }

  const uniqueSources = [];
  const seen = new Set();
  for (const source of sources) {
    if (!source.url || seen.has(source.url)) continue;
    seen.add(source.url);
    uniqueSources.push(source);
    if (uniqueSources.length >= 8) break;
  }

  return [
    'Encontrei material, mas a etapa de sÃ­ntese do modelo voltou vazia. Para nÃ£o perder a pesquisa, seguem as fontes coletadas para conferÃªncia:',
    '',
    ...uniqueSources.map(source => `- [${source.title}](${source.url})`)
  ].join('\n');
}

function getSearchItemsForFetch(searchResult = {}, limit = 3) {
  const seen = new Set();
  const items = [...(searchResult.results || []), ...(searchResult.news || []), ...(searchResult.discussions || [])];
  return items
    .filter(item => item?.url)
    .filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .sort((a, b) => getSourcePriorityScore(b) - getSourcePriorityScore(a))
    .slice(0, limit);
}

function getSourcePriorityScore(item = {}) {
  const url = String(item.url || '').toLowerCase();
  const title = String(item.title || '').toLowerCase();
  const description = String(item.description || item.snippet || '').toLowerCase();
  const haystack = `${url} ${title} ${description}`;
  let score = 0;

  if (/\b(official|oficial|site oficial|about|quem somos|who is|principles|formula|mission|foundation)\b/i.test(haystack)) score += 20;
  if (/\b(org|edu|gov)\b/i.test(url)) score += 8;
  if (/\/(about|official|principles|formula|mission|foundation|who-is|quem-somos)\b/i.test(url)) score += 12;
  if (/\b(reddit|medium|blogspot|pdfcoffee|pinterest|facebook|instagram|tiktok|youtube)\b/i.test(url)) score -= 10;
  if (/\b(blog|opini[aÃ£]o|forum|resumo|summary)\b/i.test(haystack)) score -= 3;

  return score;
}

function cleanResearchAxisFragment(fragment = '') {
  return String(fragment || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[()[\]{}"'â€œâ€â€˜â€™`Â´]/g, ' ')
    .replace(/[?!;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeResearchAxisText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function extractCandidateResearchAxes(content = '') {
  const text = cleanResearchAxisFragment(content)
    .replace(/\bvs\.?\b/gi, ' versus ');
  if (!text) return [];

  const fragments = text
    .split(/\s+(?:e|com|entre|junte|conecte|compare|versus)\s+/i)
    .map(cleanResearchAxisFragment)
    .filter(fragment => fragment.length >= 2);
  const stopwords = new Set([
    'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'sobre', 'sob', 'ao', 'aos', 'Ã ',
    'Ã s', 'que', 'qual', 'quais', 'como', 'quando', 'onde', 'porque', 'porquÃª', 'me',
    'faÃ§a', 'faca', 'fazer', 'pesquisa', 'pesquisar', 'explique', 'analise', 'pesquise', 'sintetize', 'relacione', 'relaÃ§ao', 'relaÃ§Ã£o',
    'diferenÃ§as', 'diferencas', 'semelhanÃ§as', 'semelhancas', 'fontes', 'fonte'
  ]);
  const connectorStopwords = new Set(['conecte', 'junte', 'compare', 'relacione', 'entre', 'versus']);
  const normalizeAxis = normalizeResearchAxisText;
  const startsWithImperative = value => /^(?:gere|faÃ§a|faca|explique|aponte|crie|liste)\b/i.test(String(value || '').trim());
  const labels = [];
  const seen = new Set();

  for (const fragment of fragments) {
    const cleanedFragment = cleanResearchAxisFragment(fragment)
      .replace(/^(?:faÃ§a|faca|fazer|pesquisa|pesquisar|uma|um|sobre)\s+/i, '')
      .replace(/^(?:as|os|a|o)\s+/i, '');
    const properNames = fragment.match(/\b[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][A-Za-zÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡Ã¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§0-9.-]+(?:\s+(?:de|da|do|dos|das|e|y|van|von|del|di)\s+|\s+)[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][A-Za-zÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡Ã¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§0-9.-]+(?:\s+(?:de|da|do|dos|das|e|y|van|von|del|di)\s+|\s+[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][A-Za-zÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡Ã¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§0-9.-]+)*/g) || [];
    const properSingle = cleanedFragment.match(/\b[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡][A-Za-zÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡Ã¡Ã©Ã­Ã³ÃºÃ Ã¢Ã£ÃªÃ´ÃµÃ§0-9.-]{2,}\b/g) || [];
    const acronym = cleanedFragment.match(/\b[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡0-9]{2,}(?:-[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡0-9]+)?\b/g) || [];
    const conceptual = cleanedFragment
      .split(/\s+/)
      .map(word => word.replace(/^[^\wÃ€-Ã¿]+|[^\wÃ€-Ã¿]+$/g, ''))
      .filter(word => word.length >= 3 && !stopwords.has(word.toLowerCase()))
      .slice(0, 6)
      .join(' ');
    const label = cleanResearchAxisFragment([...properNames, ...acronym, ...properSingle][0] || conceptual || cleanedFragment);
    const key = normalizeAxis(label);
    const words = label.split(/\s+/).filter(Boolean);

    if (!key || seen.has(key)) continue;
    if (words.length === 1 && label.length < 5) continue;
    if (connectorStopwords.has(key)) continue;
    if (startsWithImperative(label)) continue;
    seen.add(key);
    labels.push(label);
  }

  return labels;
}

function buildQueriesForAxis(label = '', originalContent = '') {
  const cleanLabel = cleanResearchAxisFragment(label);
  if (!cleanLabel) return [];

  const labelTerms = new Set(
    normalizeResearchAxisText(cleanLabel)
      .split(/\s+/)
      .filter(Boolean)
  );
  const thematicStopwords = new Set([
    'sobre', 'pesquisa', 'pesquisar', 'faÃ§a', 'faca', 'fazer', 'explique', 'aponte',
    'crie', 'liste', 'junte', 'conecte', 'compare', 'relacione', 'entre', 'versus',
    'com', 'para', 'como', 'qual', 'quais', 'onde', 'quando', 'porque', 'contexto',
    'fonte', 'fontes', 'termos', 'tema', 'eixo'
  ]);
  const original = String(originalContent || '');
  const thematicTerms = [];
  const seen = new Set();

  for (const match of original.matchAll(/\b[\p{L}][\p{L}-]{4,}\b/gu)) {
    const term = match[0];
    const normalized = normalizeResearchAxisText(term);
    if (!normalized || seen.has(normalized)) continue;
    if (labelTerms.has(normalized) || thematicStopwords.has(normalized)) continue;
    if (/^(?:gere|faca|faÃ§a|explique|aponte|crie|liste)$/i.test(term)) continue;
    if (/^[A-ZÃÃ‰ÃÃ“ÃšÃ€Ã‚ÃƒÃŠÃ”Ã•Ã‡]/.test(term)) continue;

    seen.add(normalized);
    thematicTerms.push(term.toLowerCase());
    if (thematicTerms.length >= 3) break;
  }

  const primary = [cleanLabel, ...thematicTerms].join(' ').replace(/\s+/g, ' ').trim();
  return [...new Set([primary, cleanLabel].filter(Boolean))];
}

function getDeterministicResearchQueries(content = '', route = 'focused_research') {
  const baseQueries = typeof buildSmartResearchQueries === 'function'
    ? buildSmartResearchQueries(content)
    : [content];
  const limit = route === 'deep_research' ? 3 : 2;

  if (route === 'source_check') {
    return [String(content || '').trim()].filter(Boolean);
  }

  return [...new Set(baseQueries.map(query => String(query || '').trim()).filter(Boolean))]
    .slice(0, limit);
}

async function runDeterministicResearchRoute(messages, content, profile = {}, options = {}) {
  const maxFetches = Math.max(0, Math.min(Number(profile.maxFetches || 3), 5));
  const maxTokens = profile.maxTokens || getResponseTokenBudget(content);
  const route = options.executionRoute || getExecutionRoute(content);
  const candidateAxes = route === 'comparative_research'
    ? extractCandidateResearchAxes(content)
    : [];
  const usesAxisSearch = route === 'comparative_research' && candidateAxes.length >= 2;
  const axisQueries = usesAxisSearch
    ? candidateAxes.slice(0, Math.max(2, maxFetches)).map(label => ({
      label,
      query: buildQueriesForAxis(label, content)[0] || label
    }))
    : [];
  const searchQueries = usesAxisSearch
    ? axisQueries.map(axis => axis.query)
    : getDeterministicResearchQueries(content, route === 'comparative_research' ? 'focused_research' : route);
  const toolResults = [];
  const toolCalls = [];
  const axisEvidence = [];

  console.log('[DETERMINISTIC RESEARCH] route:', route);
  console.log('[DETERMINISTIC RESEARCH] primarySearch:', 'brave_search');
  console.log('[DETERMINISTIC RESEARCH] queries:', searchQueries);
  if (route === 'comparative_research') {
    console.log('[DETERMINISTIC RESEARCH] comparativeAxes:', candidateAxes);
    console.log('[DETERMINISTIC RESEARCH] axisSearch:', usesAxisSearch);
  }
  console.log('[DETERMINISTIC RESEARCH] maxFetches:', maxFetches);

  const searchResults = [];
  const fetchedUrls = new Set();

  if (usesAxisSearch) {
    const axisSearches = await Promise.all(searchQueries.map(async (query, index) => {
      const searchCall = {
        id: `deterministic_brave_${Date.now()}_${index}`,
        type: 'function',
        function: {
          name: 'brave_search',
          arguments: JSON.stringify({
            query,
            count: Math.max(5, maxFetches + 2),
            country: 'BR',
            search_lang: /\b(the|and|self|information|consciousness|principles|teachings)\b/i.test(query) ? 'en' : 'pt-br'
          })
        }
      };
      const searchResult = await executeToolCall('brave_search', parseToolArguments(searchCall.function.arguments));
      return { index, query, searchCall, searchResult };
    }));

    for (const { index, query, searchCall, searchResult } of axisSearches) {
      const axisLabel = axisQueries[index]?.label || query;
      searchResults.push(searchResult);
      toolCalls.push(searchCall);
      toolResults.push({ toolCall: searchCall, result: searchResult });

      let axisItems = getSearchItemsForFetch(searchResult, Math.max(1, maxFetches + 2));
      let axisItem = axisItems.find(item => item?.url && !fetchedUrls.has(item.url));
      if (!axisItem && axisItems.length > 0) {
        const tavilyCall = {
          id: `deterministic_tavily_axis_${Date.now()}_${index}`,
          type: 'function',
          function: {
            name: 'tavily_search',
            arguments: JSON.stringify({
              query: axisLabel,
              max_results: 3,
              max_tokens: 2000,
              max_chars: 2000,
              search_depth: 'basic'
            })
          }
        };
        const tavilyResult = await executeToolCall('tavily_search', parseToolArguments(tavilyCall.function.arguments));
        toolCalls.push(tavilyCall);
        toolResults.push({ toolCall: tavilyCall, result: tavilyResult });
        axisItems = getSearchItemsForFetch(tavilyResult, 3);
        axisItem = axisItems.find(item => item?.url && !fetchedUrls.has(item.url));
      }
      if (!axisItem?.url) {
        axisEvidence.push({ label: axisLabel, query, gap: true, reason: 'Brave nao retornou fonte abrivel para este eixo.' });
        continue;
      }
      fetchedUrls.add(axisItem.url);

      const fetchCall = {
        id: `deterministic_axis_fetch_${Date.now()}_${index}`,
        type: 'function',
        function: {
          name: 'fetch_url',
          arguments: JSON.stringify({ url: axisItem.url, max_chars: 8000 })
        }
      };

      try {
        const fetchResult = await executeToolCall('fetch_url', parseToolArguments(fetchCall.function.arguments));
        toolCalls.push(fetchCall);
        toolResults.push({ toolCall: fetchCall, result: fetchResult });
        const fetchedText = fetchResult?.text || fetchResult?.content || fetchResult?.markdown || fetchResult?.body || '';
        if (fetchResult?.error || !String(fetchedText || '').trim()) {
          axisEvidence.push({
            label: axisLabel,
            query,
            gap: true,
            reason: fetchResult?.error || 'fetch_url retornou conteudo vazio.',
            source: { title: axisItem.title || axisItem.url, url: axisItem.url }
          });
        } else {
          axisEvidence.push({
            label: axisLabel,
            query,
            source: {
              title: fetchResult?.title || axisItem.title || axisItem.url,
              url: fetchResult?.url || axisItem.url,
              content: String(fetchedText).slice(0, 2200)
            }
          });
        }
      } catch (error) {
        toolCalls.push(fetchCall);
        toolResults.push({
          toolCall: fetchCall,
          result: { success: false, url: axisItem.url, error: String(error?.message || error) }
        });
        axisEvidence.push({
          label: axisLabel,
          query,
          gap: true,
          reason: String(error?.message || error),
          source: { title: axisItem.title || axisItem.url, url: axisItem.url }
        });
      }
    }
  } else {
    for (const [index, query] of searchQueries.entries()) {
      const searchCall = {
        id: `deterministic_brave_${Date.now()}_${index}`,
        type: 'function',
        function: {
          name: 'brave_search',
          arguments: JSON.stringify({
            query,
            count: Math.max(5, maxFetches + 2),
            country: 'BR',
            search_lang: /\b(the|and|self|information|consciousness|principles|teachings)\b/i.test(query) ? 'en' : 'pt-br'
          })
        }
      };
      const searchResult = await executeToolCall('brave_search', parseToolArguments(searchCall.function.arguments));
      searchResults.push(searchResult);
      toolCalls.push(searchCall);
      toolResults.push({ toolCall: searchCall, result: searchResult });
    }
  }

  if (!usesAxisSearch) {
    const mergedSearchResult = {
      results: searchResults.flatMap(result => Array.isArray(result?.results) ? result.results : []),
      news: searchResults.flatMap(result => Array.isArray(result?.news) ? result.news : []),
      discussions: searchResults.flatMap(result => Array.isArray(result?.discussions) ? result.discussions : [])
    };

    for (const item of getSearchItemsForFetch(mergedSearchResult, maxFetches)) {
      if (fetchedUrls.has(item.url)) continue;
      fetchedUrls.add(item.url);
      const fetchCall = {
        id: `deterministic_fetch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'function',
        function: {
          name: 'fetch_url',
          arguments: JSON.stringify({ url: item.url, max_chars: 8000 })
        }
      };

      try {
        const fetchResult = await executeToolCall('fetch_url', parseToolArguments(fetchCall.function.arguments));
        toolCalls.push(fetchCall);
        toolResults.push({ toolCall: fetchCall, result: fetchResult });
      } catch (error) {
        toolCalls.push(fetchCall);
        toolResults.push({
          toolCall: fetchCall,
          result: { success: false, url: item.url, error: String(error?.message || error) }
        });
      }
    }
  }

  const material = buildToolResultsSynthesisContext(toolResults, 22000);
  const axisMaterial = usesAxisSearch
    ? axisEvidence.map(axis => [
      `Eixo: ${axis.label}`,
      axis.query ? `Query: ${axis.query}` : '',
      axis.gap ? `Lacuna: ${axis.reason || 'sem fonte aberta para este eixo'}` : '',
      axis.source?.title ? `Fonte: ${axis.source.title}` : '',
      axis.source?.url ? `URL: ${axis.source.url}` : '',
      axis.source?.content ? `Evidencia: ${axis.source.content}` : ''
    ].filter(Boolean).join('\n')).join('\n\n')
    : '';
  const synthesisMessages = [
    ...(messages || []).filter(message => message.role === 'system'),
    {
      role: 'user',
      content: [
        `Pedido original: ${content}`,
        '',
        'Voce recebeu uma pesquisa deterministica feita com Brave e leitura direta de paginas via fetch_url.',
        'Priorize fontes primarias, oficiais ou institucionais quando elas estiverem no material. Use fontes secundarias apenas para contexto, contraste ou interpretacao.',
        'Se houver conflito entre fonte primaria e fonte secundaria, apresente primeiro a formulacao da fonte primaria e marque a secundaria como interpretacao ou aproximacao.',
        'Leia o material antes de escrever. Preserve termos, listas, principios, fundamentos e formulas exatamente como aparecem nas fontes.',
        'Quando a fonte trouxer termos em ingles, cite o original em ingles e traduza para portugues em seguida.',
        'Nao substitua conceitos especificos encontrados por frameworks parecidos de memoria.',
        '',
        'Obrigatorio:',
        '- Comece com um titulo curto em markdown.',
        '- Quando houver fonte primaria/oficial, abra a resposta dizendo que a sintese separa nucleo oficial, interpretacao pratica e variacoes secundarias.',
        '- Apresente uma descricao conceitual precisa do tema.',
        '- Extraia conceitos-chave diretamente das fontes, distinguindo alegacao, interpretacao e evidencias externas.',
        '- Se o material trouxer listas oficiais, formulas ou principios, cite a lista oficial antes de qualquer lista secundaria.',
        '- Explicite convergencias, tensoes, paradoxos e limites epistemologicos quando o material permitir.',
        '- Proponha ao final um modelo integrador com nome, camadas e criterio de uso quando o pedido for amplo.',
        '- Use topicos verticais quando houver listas, principios ou formulas.',
        '- Fontes ficam no fim em markdown, com nome legivel e URL.',
        '- Se a busca externa for fraca, diga isso discretamente e nao invente fonte.',
        usesAxisSearch ? '- Esta e uma pesquisa comparativa por eixos: use a evidencia de cada eixo separadamente antes de integrar. Se um eixo estiver marcado como lacuna, cite a lacuna na sintese sem bloquear a resposta.' : '',
        '',
        usesAxisSearch ? 'Evidencia por eixo:' : '',
        axisMaterial,
        usesAxisSearch ? '' : '',
        'Material coletado:',
        material || 'Nenhum material coletado.'
      ].join('\n')
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
    finishReason: data?.choices?.[0]?.finish_reason || null
  };
}

function extractJsonObjectCandidate(content = '') {
  const text = String(content || '').trim();
  if (!text) return '';
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?\{[\s\S]*?\})\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return '';
  return text.slice(start, end + 1).trim();
}

function parseTextToolCall(content, allowedTools = []) {
  const candidate = extractJsonObjectCandidate(content);
  if (!candidate || !/^\{[\s\S]*\}$/.test(candidate)) return null;
  try {
    const parsed = JSON.parse(candidate);
    const rawName = parsed.recipient_name || parsed.name || parsed.tool;
    if (!rawName) return null;
    const toolName = normalizeToolName(rawName);
    const allowedNames = new Set((allowedTools || []).map(tool => tool.function?.name).filter(Boolean));
    if (allowedNames.size && !allowedNames.has(toolName)) return null;
    if (!allowedNames.size && !/^functions\./.test(String(rawName))) return null;
    const topLevelArgs = { ...parsed };
    delete topLevelArgs.recipient_name;
    delete topLevelArgs.name;
    delete topLevelArgs.tool;
    const args = parsed.parameters || parsed.arguments || parsed.input || topLevelArgs;
    return {
      id: `synthetic_tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'function',
      function: {
        name: toolName,
        arguments: JSON.stringify(args || {})
      }
    };
  } catch (error) {
    return null;
  }
}

async function runOpenAIWithTools(messages, tools, options = {}) {
  const MAX_TOOL_ROUNDS = Number.isFinite(options.maxToolRounds)
    ? options.maxToolRounds
    : 6;
  const workingMessages = [...(messages || [])];
  const executedToolCalls = [];
  const toolResults = [];
  let lastData = null;
  const normalizedTools = Array.isArray(tools) ? tools : [];
  const executionProfile = options.executionProfile
    || EXECUTION_PROFILES[options.executionRoute]
    || {};

  // Detecta se Ã© pesquisa (tools incluem brave_search ou fetch_url)
  const isSearch = normalizedTools.some(t =>
    /brave_search|fetch_url|tavily_search|web_search/.test(t.function?.name || '')
  );

  // Escolhe API com base no contexto e domÃ­nio de verificaÃ§Ã£o
  const verificationDomain = options.verificationDomain || 'general';
  const apiChoice = chooseAPIForContext(isSearch, verificationDomain);
  if (isSearch && apiChoice.provider === 'anthropic') {
    console.log(`[API SELECTION] Usando ${apiChoice.model} para pesquisa`);
  }

  const synthesizeFromMaterial = async (reason = 'material_suficiente') => {
    console.log('[AGENT LOOP] sintetizando sem novas tools:', reason);
    const synthesisMessages = [
      ...workingMessages,
      {
        role: 'user',
        content: [
          'Use o material coletado nas ferramentas e entregue a sintese final agora.',
          'Antes de escrever, leia o material e preserve os termos, listas, principios, fundamentos e formulas exatamente como aparecem nas fontes.',
          'Quando a fonte trouxer termos em ingles, cite o original em ingles e traduza para portugues em seguida.',
          'Nao substitua conceitos especificos encontrados por frameworks parecidos de memoria. So cite nomes de listas, ciclos, leis, formulas ou fundamentos quando eles aparecerem explicitamente no material coletado.',
          'Nao peÃ§a novas ferramentas. Nao emita DSML, tool_calls ou sequential_thinking. Se houver lacunas, indique-as de forma breve e conclua a resposta.'
        ].join('\n')
      }
    ];
    const data = await apiChoice.callFn({
      ...options,
      model: apiChoice.model,
      messages: synthesisMessages
    });
    const message = data?.choices?.[0]?.message;
    if (!message) {
      throw new Error('OpenAI retornou resposta vazia.');
    }
    let content = stripDsmlToolBlocks(message.content || '');

    if ((!content || isDsmlToolCallOnly(message.content)) && toolResults.length > 0) {
      console.warn('[AGENT LOOP] sintese vazia/DSML; refazendo com material compacto.');
      const compactMaterial = buildToolResultsSynthesisContext(toolResults);
      const compactMessages = [
        ...workingMessages.filter(message => message.role === 'system'),
        {
          role: 'user',
          content: [
            'Responda ao pedido original usando apenas o material coletado abaixo.',
            'Entregue texto final em portuguÃªs, com resumo rico e fontes em markdown.',
            'Preserve termos, listas, principios, fundamentos e formulas no idioma original da fonte quando forem conceitos-chave; traduza logo depois para portuguÃªs.',
            'Nao substitua um conceito especifico encontrado por outro parecido de memoria. Distingua claramente o que veio da fonte do que e interpretacao.',
            'Nao use ferramentas, DSML, tool_calls ou sequential_thinking.',
            '',
            'Material coletado:',
            compactMaterial || 'Material indisponivel.'
          ].join('\n')
        }
      ];
      const retryData = await apiChoice.callFn({
        ...options,
        model: apiChoice.model,
        messages: compactMessages
      });
      const retryMessage = retryData?.choices?.[0]?.message;
      content = stripDsmlToolBlocks(retryMessage?.content || '');
      if (!content) content = buildFallbackResearchReply(toolResults);
      return {
        content,
        message: retryMessage,
        data: retryData,
        messages: compactMessages,
        toolCalls: executedToolCalls,
        toolResults,
        finishReason: retryData?.choices?.[0]?.finish_reason || null
      };
    }

    return {
      content,
      message,
      data,
      messages: synthesisMessages,
      toolCalls: executedToolCalls,
      toolResults,
      finishReason: data?.choices?.[0]?.finish_reason || null
    };
  };

  if (!normalizedTools.length || MAX_TOOL_ROUNDS <= 0) {
    const data = await apiChoice.callFn({
      ...options,
      model: apiChoice.model,
      messages: workingMessages
    });
    const message = data?.choices?.[0]?.message;
    if (!message) {
      throw new Error('OpenAI retornou resposta vazia.');
    }

    const finishReason = data?.choices?.[0]?.finish_reason || null;
    return {
      content: message.content || '',
      message,
      data,
      messages: workingMessages,
      toolCalls: executedToolCalls,
      toolResults,
      finishReason
    };
  }

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    console.log('[AGENT LOOP] round:', round);
    const data = await apiChoice.callFn({
      ...options,
      model: apiChoice.model, // SEMPRE usa o modelo da API escolhida
      messages: workingMessages,
      tools: normalizedTools,
      tool_choice: options.tool_choice ?? 'auto'
    });
    lastData = data;
    const finishReason = data?.choices?.[0]?.finish_reason || null;
    console.log('[AGENT LOOP] finish_reason:', finishReason);

    const message = data?.choices?.[0]?.message;
    if (!message) {
      throw new Error('OpenAI retornou resposta vazia.');
    }

    if (isDsmlToolCallOnly(message.content) && toolResults.length > 0) {
      return synthesizeFromMaterial('pseudo_tool_call_dsml');
    }

    let calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    const textToolCall = calls.length ? null : parseTextToolCall(message.content, normalizedTools);
    if (textToolCall) calls = [textToolCall];
    console.log('[AGENT LOOP] tool_calls recebidas:', calls.length);

    if (calls.length === 0) {
      console.log('[AGENT LOOP] resposta final sem tool_calls');
      return {
        content: stripDsmlToolBlocks(message.content || ''),
        message,
        data,
        messages: workingMessages,
        toolCalls: executedToolCalls,
        toolResults,
        finishReason
      };
    }

    if (hasEnoughResearchMaterial(toolResults, executionProfile)) {
      return synthesizeFromMaterial('suficiencia_antes_de_novas_tools');
    }

    const requestedCalls = calls.length;
    calls = filterToolCallsByProfile(calls, toolResults, executionProfile);
    if (calls.length < requestedCalls) {
      console.log('[AGENT LOOP] tool_calls limitadas pelo perfil:', calls.length, 'de', requestedCalls);
    }

    if (!calls.length && toolResults.length > 0) {
      return synthesizeFromMaterial('limite_de_tools_por_tipo');
    }

    workingMessages.push(textToolCall
      ? { role: 'assistant', content: null, tool_calls: calls }
      : { ...message, tool_calls: calls });

    for (const toolCall of calls) {
      const rawName = toolCall.function?.name || '';
      const toolName = normalizeToolName(rawName);
      const args = parseToolArguments(toolCall.function?.arguments || '{}');

      console.log('[AGENT LOOP] executando:', toolName);

      const normalizedToolCall = {
        ...toolCall,
        function: {
          ...(toolCall.function || {}),
          name: toolName,
          arguments: JSON.stringify(args)
        }
      };
      executedToolCalls.push(normalizedToolCall);

      let toolResult;
      try {
        toolResult = await executeToolCall(toolName, args);
      } catch (error) {
        toolResult = {
          success: false,
          error: String(error?.message || error)
        };
      }

      console.log('[AGENT LOOP] resultado chars:', JSON.stringify(toolResult || '').length);
      toolResults.push({ toolCall: normalizedToolCall, result: toolResult });
      workingMessages.push(buildToolMessage(toolCall, toolName, toolResult));
    }

    if (hasEnoughResearchMaterial(toolResults, executionProfile)) {
      return synthesizeFromMaterial('material_suficiente');
    }
  }

  if (toolResults.length > 0) {
    return synthesizeFromMaterial('limite_de_rounds_com_material');
  }

  const error = new Error('NÃ£o consegui concluir a execuÃ§Ã£o das ferramentas dentro do limite seguro.');
  error.code = 'TOOL_ROUND_LIMIT';
  error.lastData = lastData;
  error.toolCalls = executedToolCalls;
  error.toolResults = toolResults;
  throw error;
}

function extractOpenAIUsage(data = {}) {
  const usage = data.usage || {};
  return {
    inputTokens: usage.input_tokens ?? usage.prompt_tokens ?? null,
    outputTokens: usage.output_tokens ?? usage.completion_tokens ?? null,
    totalTokens: usage.total_tokens ?? null,
    cost: usage.cost ?? null
  };
}

async function traceOpenAIResponse({ model, prompt, data, adapted }) {
  try {
    const traceRun = typeof getCurrentTraceRun === 'function' ? getCurrentTraceRun() : null;
    if (!traceRun || typeof logStep !== 'function') return;
    const outputText = adapted?.choices?.[0]?.message?.content || extractResponsesOutputText(data);
    await logStep(traceRun, 'openaiResponse', {
      model,
      prompt,
      promptSize: String(prompt || '').length
    }, {
      model,
      responseId: data?.id || null,
      usage: extractOpenAIUsage(data),
      finishReason: adapted?.choices?.[0]?.finish_reason || null,
      output: outputText
    });
  } catch {}
}

async function traceOpenAIError(error, model, prompt) {
  try {
    const traceRun = typeof getCurrentTraceRun === 'function' ? getCurrentTraceRun() : null;
    if (!traceRun) return;
    if (typeof logStep === 'function') {
      await logStep(traceRun, 'openaiResponse', {
        model,
        prompt,
        promptSize: String(prompt || '').length
      }, {
        model,
        error: error?.message || String(error)
      });
    }
    if (typeof traceError === 'function') await traceError(traceRun, 'openaiResponse', error);
  } catch {}
}

function getConversationTitle(sourceMessages = messages) {
  const firstUser = sourceMessages.find(m => m.role === 'user' && m.content);
  if (!firstUser) return `Novo Chat`;
  return firstUser.content.replace(/\s+/g, ' ').trim().slice(0, 70);
}

function getCleanMessages(sourceMessages = messages) {
  return sourceMessages.filter(m => m.content && m.content !== '...' && ['user', 'assistant'].includes(m.role));
}

function getDefaultAgent() {
  return agents.find(a => a.file === 'worion-assistente.md') || agents[0] || null;
}

function shouldIntegrateAttachmentsToAgent(text, attachments = []) {
  if (!currentAgent || !attachments.length) return false;
  const normalized = String(text || '');
  if (!/\b(agente|contexto permanente|conhecimento do agente|documentos do agente)\b/i.test(normalized)) return false;
  return /\b(integre|integrar|adicione|adicionar|anexe|anexar|use)\b/i.test(normalized);
}

function isLikelyConversationHistoryText(text) {
  const raw = String(text || '');
  const markers = [
    /\b(Usu[aÃ¡]rio|Assistente|User|Assistant)\s*:/gi,
    /\b\d{1,2}:\d{2}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g
  ];
  const hits = markers.reduce((total, pattern) => total + ((raw.match(pattern) || []).length), 0);
  return hits >= 4;
}

function extractHistoryKeywords(text, limit = 4) {
  const stopwords = new Set(['usuario', 'assistente', 'user', 'assistant', 'para', 'com', 'uma', 'isso', 'esta', 'esse', 'mais', 'depois', 'quando', 'sobre', 'como', 'porque', 'muito', 'ainda', 'entre', 'foram', 'essa', 'este']);
  const counts = new Map();
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/\b[a-z0-9_-]{4,}\b/g)
    ?.forEach(token => {
      if (stopwords.has(token)) return;
      counts.set(token, (counts.get(token) || 0) + 1);
    });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(entry => entry[0]);
}

async function inspectAttachmentHistory(file) {
  const content = String(file?.extractedText || file?.text || '').trim();
  if (!content || !isLikelyConversationHistoryText(content) || typeof memorySearch !== 'function') return null;

  const keywords = extractHistoryKeywords(content, 4);
  const foundResults = [];

  for (const keyword of keywords) {
    try {
      const result = await memorySearch(keyword, '', 3);
      if (Array.isArray(result?.results) && result.results.length) {
        foundResults.push(...result.results);
      }
    } catch (error) {
      console.warn('[CHAT] Falha ao inspecionar historico anexado:', error.message);
      break;
    }
  }

  const uniqueConversationIds = [...new Set(foundResults.map(item => item.conversation_id).filter(Boolean))].slice(0, 2);
  if (!uniqueConversationIds.length) {
    return { suspected: true, confirmed: false, keywords, summary: '' };
  }

  const firstConversationId = uniqueConversationIds[0];
  let summary = '';
  if (typeof memoryReadConversation === 'function') {
    try {
      const conversation = await memoryReadConversation(firstConversationId, 2400);
      summary = String(conversation?.summary || conversation?.transcript || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    } catch (error) {
      console.warn('[CHAT] Falha ao ler conversa relacionada:', error.message);
    }
  }

  return {
    suspected: true,
    confirmed: true,
    keywords,
    conversationIds: uniqueConversationIds,
    summary
  };
}

async function enrichAttachmentsForRuntime(attachments = []) {
  const enriched = [];
  for (const file of attachments) {
    const copy = { ...file };
    if (copy.kind === 'text' && (copy.extractedText || copy.text)) {
      copy.historyContext = await inspectAttachmentHistory(copy);
    }
    enriched.push(copy);
  }
  return enriched;
}

async function flushDeferredActionsForConversationEnd() {
  if (typeof executeDeferredActions !== 'function') return [];
  return await executeDeferredActions({ force: false });
}

async function loadPreviousSessionsContext(agent) {
  const sessionPages = (await loadSavedSessions())
    .filter(page => page.title.includes(agent.name) || page.title.toLowerCase().includes('sess'))
    .slice(0, 5);

  const sessions = [];
  for (const page of sessionPages) {
    const body = await loadPageText(page.id);
    if (body) {
      sessions.push(`# ${page.title}\n${body.slice(0, 2500)}`);
    }
  }

  return sessions.join('\n\n---\n\n');
}

async function saveCurrentSession({ silent = true } = {}) {
  if (!currentAgent || isSavingSession) return false;
  const cleanMessages = getCleanMessages();
  if (cleanMessages.length === 0) return false;

  isSavingSession = true;
  try {
    await accountUsageTime();
    await ensureLocalStore();
    if (!currentConversationId) currentConversationId = makeId('conversation');

    const now = new Date().toISOString();
    const existing = await readConversationFile(currentConversationId).catch(() => null);
    const accessLog = Array.isArray(existing?.accessLog) ? existing.accessLog : [];
    const payload = {
      id: currentConversationId,
      title: getConversationTitle(),
      agentId: currentAgent.id,
      agentName: currentAgent.name,
      chatSource: window.currentChatSource || 'home',
      isAgentSession: window.currentChatSource === 'agent',
      activeSkillId: activeSkillId || null,
      activeWorkModeId: getActiveWorkModeIds?.()[0] || null,
      activeWorkModeIds: typeof getActiveWorkModeIds === 'function' ? getActiveWorkModeIds() : (activeWorkModeId ? [activeWorkModeId] : []),
      autoSaveNotion,
      silentIncorporatedContext: getSilentIncorporatedContextForPrompt(),
      deferredActions: Array.isArray(DEFERRED_ACTIONS) ? DEFERRED_ACTIONS : [],
      projectId: currentProjectContext?.id || null,
      projectTitle: currentProjectContext?.title || null,
      createdAt: existing?.createdAt || sessionStartedAt?.toISOString() || now,
      updatedAt: now,
      lastOpenedAt: existing?.lastOpenedAt || now,
      accessLog,
      messages: cleanMessages
    };

    await fs.writeFile(getConversationPath(currentConversationId), JSON.stringify(payload, null, 2), 'utf-8');
    await saveMemorySessionToSupabase(payload);
    if (currentProjectContext?.id && typeof attachConversationToProject === 'function') {
      await attachConversationToProject(currentConversationId, currentProjectContext.id);
    }
    sessionSaved = true;
    await refreshSidebarConversations();
    return true;
  } catch (error) {
    console.error('Erro ao salvar conversa local:', error);
    if (!silent) alert(`Erro ao salvar conversa local: ${error.message}`);
    return false;
  } finally {
    isSavingSession = false;
  }
}

function buildConversationSnapshot(overrides = {}) {
  return {
    conversationId: overrides.conversationId || currentConversationId || makeId('conversation'),
    agent: overrides.agent || currentAgent,
    chatSource: overrides.chatSource || window.currentChatSource || 'home',
    activeSkillId: overrides.activeSkillId ?? activeSkillId ?? null,
    activeWorkModeId: overrides.activeWorkModeId ?? (getActiveWorkModeIds?.()[0] || null),
    activeWorkModeIds: overrides.activeWorkModeIds || (typeof getActiveWorkModeIds === 'function' ? getActiveWorkModeIds() : (activeWorkModeId ? [activeWorkModeId] : [])),
    autoSaveNotion: overrides.autoSaveNotion ?? autoSaveNotion,
    silentIncorporatedContext: overrides.silentIncorporatedContext ?? getSilentIncorporatedContextForPrompt(),
    deferredActions: Array.isArray(overrides.deferredActions) ? overrides.deferredActions : (Array.isArray(DEFERRED_ACTIONS) ? [...DEFERRED_ACTIONS] : []),
    project: overrides.project || (currentProjectContext ? { ...currentProjectContext } : null),
    sessionStartedAt: overrides.sessionStartedAt || sessionStartedAt || new Date(),
    messages: overrides.messages || messages
  };
}

function isOriginConversationActive(originConversationId) {
  return currentConversationId === originConversationId && chatMode;
}

function renderOriginConversation(originConversationId) {
  const allowed = isOriginConversationActive(originConversationId);
  console.log('[CHAT] activeConversationId no final:', currentConversationId);
  console.log('[CHAT] render permitido:', allowed);
  if (allowed) renderChatPanel();
  return allowed;
}

async function saveConversationSnapshot(snapshot, { silent = true } = {}) {
  if (!snapshot?.agent || !snapshot.conversationId) return false;
  const cleanMessages = getCleanMessages(snapshot.messages || []);
  if (cleanMessages.length === 0) return false;

  try {
    if (isOriginConversationActive(snapshot.conversationId)) await accountUsageTime();
    await ensureLocalStore();

    const now = new Date().toISOString();
    const existing = await readConversationFile(snapshot.conversationId).catch(() => null);
    const accessLog = Array.isArray(existing?.accessLog) ? existing.accessLog : [];
    const activeWorkModeIdsSnapshot = Array.isArray(snapshot.activeWorkModeIds)
      ? snapshot.activeWorkModeIds
      : (snapshot.activeWorkModeId ? [snapshot.activeWorkModeId] : []);
    const payload = {
      id: snapshot.conversationId,
      title: getConversationTitle(snapshot.messages || []),
      agentId: snapshot.agent.id,
      agentName: snapshot.agent.name,
      chatSource: snapshot.chatSource || 'home',
      isAgentSession: snapshot.chatSource === 'agent',
      activeSkillId: snapshot.activeSkillId || null,
      activeWorkModeId: activeWorkModeIdsSnapshot[0] || null,
      activeWorkModeIds: activeWorkModeIdsSnapshot,
      autoSaveNotion: Boolean(snapshot.autoSaveNotion),
      silentIncorporatedContext: snapshot.silentIncorporatedContext || '',
      deferredActions: Array.isArray(snapshot.deferredActions) ? snapshot.deferredActions : [],
      projectId: snapshot.project?.id || null,
      projectTitle: snapshot.project?.title || null,
      createdAt: existing?.createdAt || snapshot.sessionStartedAt?.toISOString?.() || now,
      updatedAt: now,
      lastOpenedAt: existing?.lastOpenedAt || now,
      accessLog,
      messages: cleanMessages
    };

    await fs.writeFile(getConversationPath(snapshot.conversationId), JSON.stringify(payload, null, 2), 'utf-8');
    await saveMemorySessionToSupabase(payload);
    if (snapshot.project?.id && typeof attachConversationToProject === 'function') {
      await attachConversationToProject(snapshot.conversationId, snapshot.project.id);
    }
    if (isOriginConversationActive(snapshot.conversationId)) sessionSaved = true;
    await refreshSidebarConversations();
    return true;
  } catch (error) {
    console.error('Erro ao salvar conversa local:', error);
    if (!silent) alert(`Erro ao salvar conversa local: ${error.message}`);
    return false;
  }
}

function getActiveTraceWorkModeId() {
  if (typeof getActiveWorkModeIds === 'function') return getActiveWorkModeIds()[0] || null;
  return activeWorkModeId || null;
}

function buildTurnTraceMetadata(content = '') {
  return {
    userMessage: content,
    agentId: currentAgent?.id || null,
    agentName: currentAgent?.name || null,
    activeSkillId: activeSkillId || null,
    activeWorkModeId: getActiveTraceWorkModeId(),
    model: currentAgent?.model || 'gpt-4o-mini',
    documentsCount: Array.isArray(currentAgent?.documents) ? currentAgent.documents.length : 0,
    memoryContextSize: 0,
    promptSize: 0,
    hasNotionCall: false,
    hasExternalSearch: false,
    conversationId: currentConversationId || null
  };
}

function getTraceAgentDocumentsSnapshot() {
  const documents = Array.isArray(currentAgent?.documents) ? currentAgent.documents : [];
  return documents.map(doc => ({
    name: doc?.name || doc?.path || 'documento',
    path: doc?.path || '',
    missing: Boolean(doc?.missing),
    size: String(doc?.content || '').length
  }));
}

async function traceAgentDocumentsStep(traceRun, userMessage) {
  try {
    if (!traceRun || typeof logStep !== 'function') return;
    const documents = getTraceAgentDocumentsSnapshot();
    await logStep(traceRun, 'loadAgentDocuments', {
      agentId: currentAgent?.id || null,
      query: userMessage
    }, {
      documentsCount: documents.length,
      documents
    });
  } catch {}
}

async function traceMemoryStep(traceRun, query, memoryContext) {
  try {
    if (!traceRun || typeof logStep !== 'function') return;
    const memoryContextSize = String(memoryContext || '').length;
    if (typeof updateTraceMetadata === 'function') updateTraceMetadata(traceRun, { memoryContextSize });
    await logStep(traceRun, 'retrieveMemory', {
      query
    }, {
      memoryContextSize,
      memoryContext
    });
  } catch {}
}

async function traceIntentStep(traceRun, input, output) {
  try {
    if (!traceRun || typeof logStep !== 'function') return;
    await logStep(traceRun, 'detectIntent', input, output);
  } catch {}
}

async function tracePromptStep(traceRun, prompt, extra = {}) {
  try {
    if (!traceRun || typeof logStep !== 'function') return;
    const promptSize = String(prompt || '').length;
    if (typeof updateTraceMetadata === 'function') updateTraceMetadata(traceRun, { promptSize });
    await logStep(traceRun, 'buildPrompt', {
      agentId: currentAgent?.id || null,
      model: currentAgent?.model || 'gpt-4o-mini',
      ...extra
    }, {
      promptSize,
      prompt
    });
  } catch {}
}

async function finalizeTurnTrace(traceRun, assistantIndex, fallbackOutput = '', sourceMessages = messages) {
  try {
    if (!traceRun) return;
    const finalContent = String(sourceMessages?.[assistantIndex]?.content || fallbackOutput || '').trim();
    if (finalContent && finalContent !== '...' && typeof logStep === 'function') {
      await logStep(traceRun, 'finalAnswer', {}, { answer: finalContent });
    }
    if (typeof endTrace === 'function') {
      await endTrace(traceRun, { answer: finalContent || null });
    }
  } catch {}
}

async function sendMsg() {
  if (isAssistantResponding) {
    interruptCurrentResponse();
    return;
  }

  const inp = document.getElementById('chat-in');
  const txt = inp.value.trim();
  if (!txt && attachedFiles.length === 0) return;
  let turnTraceRun = null;

  const attachments = attachedFiles.slice();
  const rawText = txt ? applyTypoCorrections(txt) : '';
  const content = rawText || `Anexo enviado: ${attachments.map(file => file.name).join(', ')}`;
  pendingArtifactRequest = detectArtifactRequest(content);
  const now = new Date().toISOString();
  if (!currentConversationId) currentConversationId = makeId('conversation');
  const originConversationId = currentConversationId;
  const originSessionId = sessionStartedAt?.toISOString?.() || now;
  const originMessages = messages;
  const originSnapshot = buildConversationSnapshot({
    conversationId: originConversationId,
    messages: originMessages,
    sessionStartedAt: sessionStartedAt || new Date(now)
  });
  console.log('[CHAT] originConversationId:', originConversationId);
  console.log('[CHAT] originSessionId:', originSessionId);

  // Preservar attachments com todo o contexto extraÃ­do
  const preservedAttachments = await enrichAttachmentsForRuntime(attachments.map(file => ({
    id: file.id,
    name: file.name,
    type: file.type,
    size: file.size,
    kind: file.kind,
    data: file.data,
    text: file.text,
    extractedText: file.extractedText || file.text
  })));

  if (typeof shouldEnableNotionAutoSave === 'function' && shouldEnableNotionAutoSave(content)) {
    autoSaveNotion = true;
  }
  currentTurnPolicy = {
    explicitNotionWriteAuthorized: typeof hasExplicitNotionWriteAuthorization === 'function' ? hasExplicitNotionWriteAuthorization(content) : false,
    deferNotionWrite: typeof hasDeferredTimeTrigger === 'function' ? (hasDeferredTimeTrigger(content) && /\bnotion\b/i.test(content)) : false,
    shouldExecuteDeferredNow: typeof shouldExecuteDeferredActionsNow === 'function' ? shouldExecuteDeferredActionsNow(content) : false
  };
  if (typeof startTrace === 'function') {
    turnTraceRun = startTrace('Worion Desktop message', buildTurnTraceMetadata(content));
  }
  const confirmedHistoryAttachments = preservedAttachments.filter(file => file.historyContext?.confirmed);

  console.log('[CHAT] Mensagem com', preservedAttachments.length, 'anexos:', preservedAttachments.map(f => `${f.name} (${f.kind}, texto: ${f.extractedText?.length || 0})`));

  originMessages.push({ role: 'user', content, createdAt: now, attachments: preservedAttachments });
  attachedFiles = [];
  sessionSaved = false;
  inp.value = '';
  inp.style.height = 'auto';
  updateAttachmentsPreview();
  connectorContext = await getConnectorContextForMessage(`${content}\n${attachments.map(file => file.text || '').join('\n')}`);
  internalMemoryContext = typeof searchInternalMemory === 'function' ? await searchInternalMemory(content) : '';
  if (confirmedHistoryAttachments.length) {
    const historyNotes = confirmedHistoryAttachments.map(file => {
      const ids = (file.historyContext.conversationIds || []).join(', ') || 'sem id';
      const summary = file.historyContext.summary || 'Conversa relacionada encontrada na memoria.';
      return `Historico anexado confirmado para ${file.name}. Conversas relacionadas: ${ids}. Resumo: ${summary}`;
    }).join('\n');
    internalMemoryContext = [internalMemoryContext, historyNotes].filter(Boolean).join('\n\n');
  }
  await traceMemoryStep(turnTraceRun, content, internalMemoryContext);
  await traceAgentDocumentsStep(turnTraceRun, content);
  renderOriginConversation(originConversationId);
  await saveConversationSnapshot(originSnapshot, { silent: true });

  originMessages.push({ role: 'assistant', content: '...' });
  const assistantIndex = originMessages.length - 1;
  isAssistantResponding = true;
  responseAbortRequested = false;
  currentResponseController = new AbortController();
  renderOriginConversation(originConversationId);
  if (typeof showWorionStatus === 'function') showWorionStatus('thinking');

  const setAssistantReply = async (reply, { animate = true } = {}) => {
    const finalContent = String(reply || '');
    originMessages[assistantIndex] = { role: 'assistant', content: finalContent, createdAt: new Date().toISOString() };
    if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
    if (!isOriginConversationActive(originConversationId)) {
      console.log('[CHAT] Resposta concluÃ­da para conversa em segundo plano:', originConversationId);
    }
    renderOriginConversation(originConversationId);
  };

  const saveOriginAndReturn = async () => {
    sessionSaved = false;
    await saveConversationSnapshot(originSnapshot, { silent: true });
    if (isOriginConversationActive(originConversationId) && typeof focusComposerInput === 'function') focusComposerInput();
  };

  try {
    if (currentTurnPolicy.shouldExecuteDeferredNow && Array.isArray(DEFERRED_ACTIONS) && DEFERRED_ACTIONS.length) {
      await traceIntentStep(turnTraceRun, { message: content }, { category: 'deferred_actions', count: DEFERRED_ACTIONS.length });
      const deferredResults = await executeDeferredActions({ force: true });
      const executed = deferredResults.filter(item => item.success).length;
      const blocked = deferredResults.filter(item => item.blocked).length;
      const failed = deferredResults.filter(item => !item.success && !item.blocked).length;
      originMessages[assistantIndex] = {
        role: 'assistant',
        content: `Executei ${executed} acao(oes) diferida(s).${blocked ? ` ${blocked} continuaram bloqueadas.` : ''}${failed ? ` ${failed} falharam.` : ''}`,
        createdAt: new Date().toISOString()
      };
      await saveOriginAndReturn();
      return;
    }

    if (shouldIntegrateAttachmentsToAgent(content, preservedAttachments)) {
      await traceIntentStep(turnTraceRun, { message: content }, { category: 'integrate_agent_documents', attachmentsCount: preservedAttachments.length });
      const textDocuments = preservedAttachments
        .filter(file => file.kind === 'text' && (file.extractedText || file.text))
        .map(file => ({ name: file.name, content: file.extractedText || file.text }));
      if (!textDocuments.length) {
        originMessages[assistantIndex] = { role: 'assistant', content: 'Nao encontrei nenhum anexo textual para integrar ao agente ativo.', createdAt: new Date().toISOString() };
      } else {
        await integrateDocumentsIntoCurrentAgent(textDocuments);
        const assimilatedContent = textDocuments.map(doc => `# ${doc.name}\n${doc.content}`).join('\n\n---\n\n');
        const reply = typeof generateContextualAssimilationResponse === 'function'
          ? generateContextualAssimilationResponse({
              sourceType: 'agent_documents',
              activeAgent: currentAgent,
              userProfile,
              content: assimilatedContent,
              projects: typeof inferAssimilationProjects === 'function' ? inferAssimilationProjects(assimilatedContent) : [],
              extractedThemes: typeof inferAssimilationThemes === 'function' ? inferAssimilationThemes(assimilatedContent) : [],
              insights: typeof inferAssimilationInsights === 'function' ? inferAssimilationInsights(assimilatedContent) : [],
              sourceCount: textDocuments.length
            })
          : `${textDocuments.length} documento(s) entraram no agente e agora orientam identidade, metodo e resposta.`;
        originMessages[assistantIndex] = { role: 'assistant', content: reply, createdAt: new Date().toISOString() };
      }
      await saveOriginAndReturn();
      return;
    }

    const notionCreateRequest = typeof detectNotionPageRequest === 'function' ? detectNotionPageRequest(content) : null;
    if (notionCreateRequest) {
      await traceIntentStep(turnTraceRun, { message: content }, { category: 'notion_create_page', title: notionCreateRequest.title });
      if (currentTurnPolicy.deferNotionWrite) {
        deferAction('create_notion_page', notionCreateRequest, 'Escrita no Notion adiada pelo usuario', { authorized: currentTurnPolicy.explicitNotionWriteAuthorized });
        originMessages[assistantIndex] = { role: 'assistant', content: 'Deixei a escrita no Notion agendada para o fim da conversa.', createdAt: new Date().toISOString() };
        await saveOriginAndReturn();
        return;
      }
      if (typeof showWorionStatus === 'function') showWorionStatus('composing');
      const notionT0 = Date.now();
      let reply;
      try {
        reply = await executeNotionPageRequest(notionCreateRequest);
        if (typeof markTraceFlag === 'function') markTraceFlag(turnTraceRun, 'hasNotionCall', true);
        if (typeof logStep === 'function') {
          await logStep(turnTraceRun, 'notionToolCall', {
            toolName: 'create_notion_page',
            args: notionCreateRequest
          }, {
            durationMs: Date.now() - notionT0,
            result: reply
          });
        }
      } catch (error) {
        if (typeof traceError === 'function') await traceError(turnTraceRun, 'notionToolCall', error);
        throw error;
      }
      originMessages[assistantIndex] = { role: 'assistant', content: reply, createdAt: new Date().toISOString() };
      await saveOriginAndReturn();
      return;
    }

    if (typeof shouldForceNotionToolAttempt === 'function' && shouldForceNotionToolAttempt(content)) {
      await traceIntentStep(turnTraceRun, { message: content }, { category: 'notion_read' });
      if (typeof showWorionStatus === 'function') showWorionStatus('sources');
      let notionReadResult;
      const notionT0 = Date.now();
      try {
        notionReadResult = await executeDirectNotionReadRequest(content);
        if (typeof markTraceFlag === 'function') markTraceFlag(turnTraceRun, 'hasNotionCall', true);
        if (typeof logStep === 'function') {
          await logStep(turnTraceRun, 'notionToolCall', {
            toolName: 'direct_notion_read',
            args: { message: content }
          }, {
            durationMs: Date.now() - notionT0,
            result: {
              success: Boolean(notionReadResult?.success),
              pages: notionReadResult?.pages || [],
              pageId: notionReadResult?.pageId || null
            }
          });
        }
      } catch (error) {
        if (typeof traceError === 'function') await traceError(turnTraceRun, 'notionToolCall', error);
        const finalReply = `Falhou ao acessar o Notion: ${error.message}`;
        await setAssistantReply(finalReply);
        await saveOriginAndReturn();
        return;
      }
      const reply = buildAssimilationReplyFromNotionRead(notionReadResult, content);
      const finalReply = normalizeAssistantReply(reply, content);
      await setAssistantReply(finalReply);
      await saveOriginAndReturn();
      return;
    }

    if (shouldAssimilateAttachmentsOnly(content, preservedAttachments)) {
      await traceIntentStep(turnTraceRun, { message: content }, { category: 'assimilate_attachments', attachmentsCount: preservedAttachments.length });
      const reply = buildAttachmentAssimilationReply(preservedAttachments);
      const finalReply = normalizeAssistantReply(reply, content);
      await setAssistantReply(finalReply);
      await saveOriginAndReturn();
      return;
    }

    if (typeof showWorionStatus === 'function') showWorionStatus('sources');

    // ROTA INTERNA: perguntas sobre o prÃ³prio Worion nunca ativam grounding externo
    const isInternalDiagnostic = isInternalDiagnosticRequest(content);
    const executionRoute = getExecutionRoute(content);
    const routerGroundingObserveOnly = FACTUAL_BLOCKERS_TEST_MODE && WORION_EXECUTION_ROUTER_TEST;

    // GROUNDING OBRIGATÃ“RIO: Detecta pedidos factuais e busca fontes ANTES da geraÃ§Ã£o
    const isFactualRequest = !isInternalDiagnostic && looksLikeFactualRequest(content);
    let groundingData = null;
    let groundingContext = '';

    // VERIFICATION ENGINE: Criar plano de verificaÃ§Ã£o ANTES de qualquer roteamento
    let verificationPlan = isInternalDiagnostic
      ? { requiresVerification: false, domain: 'internal_diagnostic', isChallenge: false, mustUseExternalEvidence: false, minimumSources: 0, priority: 0 }
      : (typeof window !== 'undefined' && window.WorionVerificationEngine)
        ? window.WorionVerificationEngine.createVerificationPlan(content)
        : { requiresVerification: false, mustUseExternalEvidence: false };
    if (!isInternalDiagnostic) verificationPlan = enforceEvidencePlanForSensitiveQuery(verificationPlan, content);
    let evidenceSources = [];
    let externalEvidenceContext = '';
    let externalEvidenceRecords = [];
    let evidencePack = createEmptyEvidencePack(content);

    if (!routerGroundingObserveOnly && (isFactualRequest || verificationPlan.mustUseExternalEvidence)) {
      if (typeof showWorionStatus === 'function') showWorionStatus('sources');

      // WIKIPEDIA GATE: para domÃ­nios histÃ³ricos/geogrÃ¡ficos, tenta fetch direto antes do Brave/Tavily
      const isWikipediaGateDomain = WIKIPEDIA_GATE_DOMAINS.includes(verificationPlan?.domain);
      if (isFactualRequest && isWikipediaGateDomain) {
        if (typeof showWorionStatus === 'function') showWorionStatus('openingSources');
        const wikiPack = await fetchWikipediaDirectGrounding(content);
        if (wikiPack && wikiPack.count > 0) {
          evidencePack = wikiPack;
          console.log(`[WIKIPEDIA GATE] Usando Wikipedia como fonte primÃ¡ria (${wikiPack.evidenceSources[0]?.title})`);
          // Wikipedia Ã© FONTE PRIMÃRIA de alta confianÃ§a â€” 1 fonte Ã© suficiente
          if (verificationPlan.minimumSources > 1) {
            verificationPlan = { ...verificationPlan, minimumSources: 1 };
            console.log('[WIKIPEDIA GATE] minimumSources reduzido para 1 (fonte primÃ¡ria Wikipedia)');
          }
        }
      }

      // Fallback: Brave/Tavily se Wikipedia Gate nÃ£o retornou ou domÃ­nio nÃ£o elegÃ­vel
      if (!evidencePack.count) {
        evidencePack = await collectEvidencePack(content, {
          ...verificationPlan,
          mustUseExternalEvidence: true
        }, {
          mode: isFactualRequest ? 'grounding' : 'verification',
          count: isFactualRequest ? 8 : 5,
          maxSources: isFactualRequest ? 8 : 5,
          fetchLimit: 3,
          timeoutMs: isFactualRequest ? 12000 : 9000
        });
      }

      if (evidencePack.count) {
        if (isFactualRequest) {
          groundingData = {
            text: evidencePack.text,
            sources: evidencePack.sources,
            count: evidencePack.count,
            provider: evidencePack.provider
          };
          groundingContext = evidencePack.context;
          console.log(`[GROUNDING GATE] Contexto injetado: ${groundingData.count} fontes via ${groundingData.provider.toUpperCase()}`);
        } else {
          externalEvidenceContext = evidencePack.context;
          console.log('[VERIFICATION] Evidence Pack injetado:', evidencePack.count, 'fontes');
        }

        for (const source of evidencePack.evidenceSources) {
          registerEvidenceSource(evidenceSources, source);
        }
        externalEvidenceRecords.push(...evidencePack.evidenceRecords);
      } else if (isFactualRequest) {
        groundingContext = `\n\n${FACTUAL_BLOCKERS_TEST_DIRECTIVE}

Busca factual executada, mas o Evidence Pack retornou vazio. Continue a resposta sem substituir por mensagem de bloqueio; registre lacunas como nao confirmadas quando necessario.`;
        console.log('[GROUNDING GATE] TEST MODE: Evidence Pack vazio; resposta livre preservada.');
      }

      if (typeof markTraceFlag === 'function') {
        markTraceFlag(turnTraceRun, 'evidence_pack_built', true);
        markTraceFlag(turnTraceRun, 'evidence_pack_sources_count', evidencePack.count);
        markTraceFlag(turnTraceRun, 'evidence_pack_fetched_pages_count', evidencePack.fetchedPages.length);
        markTraceFlag(turnTraceRun, 'evidence_pack_provider', evidencePack.provider);
      }
      if (typeof logStep === 'function') {
        await logStep(turnTraceRun, 'buildEvidencePack', {
          query: content,
          mode: isFactualRequest ? 'grounding' : 'verification',
          verificationPlan
        }, {
          sourcesCount: evidencePack.count,
          fetchedPagesCount: evidencePack.fetchedPages.length,
          provider: evidencePack.provider,
          urls: evidencePack.evidenceSources.map(source => source.url).filter(Boolean).slice(0, 8),
          errors: evidencePack.errors
        });
      }
    }

    const classification = await classifyUserRequest(content, attachments);
    await traceIntentStep(turnTraceRun, { message: content, attachmentsCount: attachments.length }, classification);
    await logInternalAction('request_classified', 'success', classification);
    if (classification.category === 'simple_query' && /^m[aÃ£]os agradecendo emoji[!.? ]*$/i.test(content.trim())) {
      if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
      originMessages[assistantIndex] = { role: 'assistant', content: 'ðŸ™', createdAt: new Date().toISOString() };
      renderOriginConversation(originConversationId);
      await saveConversationSnapshot(originSnapshot, { silent: true });
      return;
    }
    if (typeof hasActiveWorkMode === 'function' ? hasActiveWorkMode('smart-research') : activeWorkModeId === 'smart-research') {
      if (typeof showWorionStatus === 'function') showWorionStatus('sources');
      let finalReport = await generateSmartResearchReply(content, attachments, verificationPlan, originMessages);
      finalReport = applyEvidenceGate(finalReport, verificationPlan, evidenceSources);
      const finalReply = normalizeAssistantReply(finalReport, content);
      await setAssistantReply(finalReply);
      await saveOriginAndReturn();
      return;
    }
    const shouldBypassGoalEngine =
      WORION_EXECUTION_ROUTER_TEST &&
      ['focused_research', 'deep_research', 'source_check', 'comparative_research'].includes(executionRoute);
    if (!shouldBypassGoalEngine && shouldUseGoalEngineForRequest(content, attachments, classification)) {
      if (typeof showWorionStatus === 'function') showWorionStatus('thinking');
      let finalReport = await executeCompoundGoal(content, attachments, classification, verificationPlan);
      finalReport = applyEvidenceGate(finalReport, verificationPlan, evidenceSources);
      const finalReply = normalizeAssistantReply(finalReport, content);
      await setAssistantReply(finalReply);
      await saveOriginAndReturn();
      return;
    }

    const thinkingContext = await getSequentialThinkingContext(content, attachments);
    const agentDomainResearchContext = await buildAgentDomainResearchContext(content, preservedAttachments);

    // VerificaÃ§Ã£o factual
    let verificationInstruction = '';
    let verificationMetadata = null;
    if (typeof window !== 'undefined' && window.WorionVerificationEngine && window.WorionVerificationEngine.requiresVerification(content)) {
      const domain = window.WorionVerificationEngine.detectDomain(content);
      verificationInstruction = FACTUAL_BLOCKERS_TEST_MODE
        ? FACTUAL_BLOCKERS_TEST_DIRECTIVE
        : window.WorionVerificationEngine.buildVerificationInstruction(content);
      verificationMetadata = {
        verification_required: true,
        verification_domain: domain,
        verification_policy: FACTUAL_BLOCKERS_TEST_MODE ? 'test_mode_observe_only' : 'multi_source_consensus'
      };
      console.log('[VERIFICATION] VerificaÃ§Ã£o factual ativada para domÃ­nio:', domain, FACTUAL_BLOCKERS_TEST_MODE ? '(TEST MODE: sem bloqueio)' : '');
    }

    // Incluir contexto de attachments explicitamente no system prompt quando houver
    let attachmentContext = '';
    if (preservedAttachments.length > 0) {
      const textAttachments = preservedAttachments.filter(f => (f.kind === 'text' || f.kind === 'unsupported') && (f.extractedText || f.text));
      if (textAttachments.length > 0) {
        attachmentContext = `\n\nðŸ“Ž ARQUIVOS ANEXADOS NESTA MENSAGEM (${textAttachments.length}):\n` +
          textAttachments.map(f => `- ${f.name} (${(f.size/1024).toFixed(1)}KB) - texto extraÃ­do disponÃ­vel`).join('\n') +
          '\n\nO conteÃºdo completo dos arquivos estÃ¡ incluÃ­do na mensagem do usuÃ¡rio. Use esse conteÃºdo para responder.';
      }
    }

    const systemPrompt = [
      buildSystemPrompt(content, preservedAttachments, [groundingContext, attachmentContext, agentDomainResearchContext, externalEvidenceContext, verificationInstruction].filter(Boolean).join('\n\n')),
      FACTUAL_BLOCKERS_TEST_MODE ? FACTUAL_BLOCKERS_TEST_DIRECTIVE : ''
    ].filter(Boolean).join('\n\n');
    await tracePromptStep(turnTraceRun, systemPrompt, {
      route: 'chat_completion',
      attachmentsCount: preservedAttachments.length,
      ...(verificationMetadata || {})
    });
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...(thinkingContext ? [{ role: 'system', content: thinkingContext }] : []),
      ...originMessages.filter(m => m.content !== '...' && ['user', 'assistant'].includes(m.role)).map(formatMessageForOpenAI)
    ];

    console.log('[CHAT] Enviando', apiMessages.length, 'mensagens ao modelo. Ãšltima mensagem formatada:', JSON.stringify(apiMessages[apiMessages.length - 1]).slice(0, 500));
    console.log('[DEBUG] WORION_TOOLS inventario total:', WORION_TOOLS.length);
    if (typeof showWorionStatus === 'function') showWorionStatus('composing');
    let agentResult;

    if (WORION_EXECUTION_ROUTER_TEST) {
      const route = executionRoute;
      const executionProfile = EXECUTION_PROFILES[route] || EXECUTION_PROFILES.direct_answer;
      const selectedTools = selectToolsByProfile(WORION_TOOLS, executionProfile);
      const maxTokens = executionProfile.maxTokens || getResponseTokenBudget(content);

      console.log('[EXECUTION ROUTER TEST] enabled:', true);
      console.log('[EXECUTION ROUTER TEST] route:', route);
      console.log('[EXECUTION ROUTER TEST] selectedTools:', selectedTools.map(t => t.function?.name));
      console.log('[EXECUTION ROUTER TEST] secondaryTools:', executionProfile.secondaryTools || []);
      console.log('[EXECUTION ROUTER TEST] tavilySecondaryLock:', WORION_TAVILY_SECONDARY_LOCK);
      console.log('[EXECUTION ROUTER TEST] secondaryPolicy:', executionProfile.secondaryPolicy || 'none');
      console.log('[EXECUTION ROUTER TEST] maxToolRounds:', executionProfile.maxToolRounds);
      console.log('[EXECUTION ROUTER TEST] thinking:', executionProfile.thinking);
      console.log('[EXECUTION ROUTER TEST] maxTokens:', executionProfile.maxTokens);
      console.log('[TOKEN BUDGET] route:', route, 'max_tokens:', maxTokens, 'source:', 'execution_router_or_goal_engine');

      if (['focused_research', 'deep_research', 'source_check', 'comparative_research'].includes(route)) {
        agentResult = await runDeterministicResearchRoute(apiMessages, content, executionProfile, {
          model: currentAgent.model || 'gpt-4o-mini',
          temperature: 0.35,
          max_tokens: maxTokens,
          verificationDomain: verificationPlan?.domain || 'general',
          thinking: executionProfile.thinking,
          executionRoute: route,
          executionProfile
        });
      } else {
        agentResult = await runOpenAIWithTools(apiMessages, selectedTools, {
          model: currentAgent.model || 'gpt-4o-mini',
          temperature: 0.4,
          max_tokens: maxTokens,
          verificationDomain: verificationPlan?.domain || 'general',
          maxToolRounds: executionProfile.maxToolRounds,
          thinking: executionProfile.thinking,
          executionRoute: route,
          executionProfile
        });
      }
    } else {
      console.log('[EXECUTION ROUTER TEST] disabled. Usando fluxo anterior.');

      agentResult = await runOpenAIWithTools(apiMessages, WORION_TOOLS, {
        model: currentAgent.model || 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: getResponseTokenBudget(content),
        verificationDomain: verificationPlan?.domain || 'general'
      });
    }

    let reply = agentResult.content;
    const allToolCalls = [...externalEvidenceRecords, ...agentResult.toolCalls];
    console.log('[VERIFICATION] externalEvidenceRecords:', externalEvidenceRecords.length, 'registros');
    console.log('[VERIFICATION] agentResult.toolCalls:', agentResult.toolCalls.length, 'tool calls do modelo');
    console.log('[VERIFICATION] allToolCalls total:', allToolCalls.length, 'para validaÃ§Ã£o');
    for (const item of agentResult.toolResults) {
      registerToolEvidenceSources(evidenceSources, item.toolCall, item.result);
    }

    // TEST MODE: Verification Engine fica apenas em observabilidade; nao altera reply.
    if (verificationPlan.mustUseExternalEvidence && typeof window !== 'undefined' && window.WorionVerificationEngine) {
      if (typeof showWorionStatus === 'function') showWorionStatus('evidence');
      const evidenceUsed = window.WorionVerificationEngine.countExternalEvidence(allToolCalls);
      const validation = window.WorionVerificationEngine.validateResponse(verificationPlan, evidenceUsed);

      // Registrar no LangSmith
      if (typeof markTraceFlag === 'function') {
        markTraceFlag(turnTraceRun, 'verification_required', true);
        markTraceFlag(turnTraceRun, 'verification_domain', verificationPlan.domain);
        markTraceFlag(turnTraceRun, 'external_evidence_used', evidenceUsed.hasExternalEvidence);
        markTraceFlag(turnTraceRun, 'external_tool_calls_count', evidenceUsed.count);
      }

      console.log('[VERIFICATION] ValidaÃ§Ã£o:', validation);
      console.log('[VERIFICATION] EvidÃªncia usada:', evidenceUsed);

      if (!validation.approved) {
        console.warn('[VERIFICATION] TEST MODE: bloqueio factual desativado; resposta preservada.', validation.reason);
        if (typeof markTraceFlag === 'function') {
          markTraceFlag(turnTraceRun, 'verification_blocker_disabled_test_mode', true);
          markTraceFlag(turnTraceRun, 'verification_validation_reason', validation.reason);
        }
      }
    }

    const hadPendingArtifactRequest = Boolean(pendingArtifactRequest);
    if (pendingArtifactRequest) {
      const artifactResult = pendingArtifactRequest.type === 'image'
        ? ''
        : await executeArtifactWebhook(pendingArtifactRequest, reply);
      if (artifactResult) reply = `${reply}\n\n${artifactResult}`;
      pendingArtifactRequest = null;
    }
    if (typeof showWorionStatus === 'function') showWorionStatus('evidence');
    const gatedReply = applyEvidenceGate(reply, verificationPlan, evidenceSources);
    reply = gatedReply;
    if (typeof showWorionStatus === 'function') showWorionStatus('composing');
    reply = normalizeAssistantReply(reply, content);

    // GROUNDING VALIDATION: em TEST MODE, valida apenas para log e nunca altera reply.
    // EXCEÃ‡ÃƒO: Se gerou artifact (PDF, cÃ³digo, etc), nÃ£o valida nomes na mensagem de texto
    const hasArtifact = hadPendingArtifactRequest || agentResult.toolCalls.some(tc =>
      tc.function?.name === 'generate_pdf' ||
      tc.function?.name === 'create_artifact'
    );

    if (isFactualRequest && !hasArtifact) {
      if (typeof showWorionStatus === 'function') showWorionStatus('evidence');
      const validation = validateGroundedResponse(reply, groundingData);

      if (!validation.valid) {
        console.warn('[GROUNDING GATE] TEST MODE: barreira final desativada; resposta preservada.', validation.reason);

        if (typeof markTraceFlag === 'function') {
          markTraceFlag(turnTraceRun, 'grounding_gate_blocker_disabled_test_mode', true);
          markTraceFlag(turnTraceRun, 'grounding_validation_failed', true);
          markTraceFlag(turnTraceRun, 'grounding_validation_reason', validation.reason);
        }
      } else {
        // Marcar no trace
        if (typeof markTraceFlag === 'function') {
          markTraceFlag(turnTraceRun, 'grounding_validation_passed', true);
          markTraceFlag(turnTraceRun, 'grounding_sources_used', groundingData?.count || 0);
        }
        if (validation.mode === 'fallback_primary_source') {
          console.warn('[GROUNDING GATE] TEST MODE: fallback por fonte primaria registrado sem alterar reply.');
          if (typeof markTraceFlag === 'function') {
            markTraceFlag(turnTraceRun, 'grounding_fallback_primary_source', true);
            markTraceFlag(turnTraceRun, 'grounding_verified_percent', validation.verifiedPercent || 0);
          }
        }
      }
    }

    // EVASIVE ANSWER REPAIR: Detecta e corrige respostas evasivas em pedidos de pesquisa
    if (typeof window !== 'undefined' && window.WorionVerificationEngine) {
      const isResearchRequest = window.WorionVerificationEngine.looksLikeResearchRequest(content);
      const isEvasive = window.WorionVerificationEngine.isEvasiveResearchAnswer(reply, content);

      if (isResearchRequest && isEvasive && !isFactualRequest) { // SÃ³ repara se nÃ£o passou pelo grounding
        console.log('[EVASIVE_REPAIR] Resposta evasiva detectada em pedido de pesquisa. Refazendo...');
        if (typeof showWorionStatus === 'function') showWorionStatus('composing');

        const repairPrompt = window.WorionVerificationEngine.buildResearchRepairPrompt(content);
        const repairMessages = [
          { role: 'system', content: systemPrompt },
          ...(thinkingContext ? [{ role: 'system', content: thinkingContext }] : []),
          ...originMessages.filter(m => m.content !== '...' && ['user', 'assistant'].includes(m.role)).map(formatMessageForOpenAI),
          { role: 'assistant', content: reply },
          { role: 'user', content: repairPrompt }
        ];

        try {
          const repairRoute = WORION_EXECUTION_ROUTER_TEST ? getExecutionRoute(content) : null;
          const repairProfile = repairRoute ? (EXECUTION_PROFILES[repairRoute] || EXECUTION_PROFILES.direct_answer) : null;
          const repairTools = WORION_EXECUTION_ROUTER_TEST
            ? selectToolsByProfile(WORION_TOOLS, repairProfile || {})
            : WORION_TOOLS;

          console.log('[EVASIVE_REPAIR] route:', repairRoute || 'legacy');
          console.log('[EVASIVE_REPAIR] selectedTools:', repairTools.map(tool => tool.function?.name));

          const repairResult = await runOpenAIWithTools(repairMessages, repairTools, {
            model: currentAgent.model || 'gpt-4o-mini',
            temperature: 0.2, // temperatura mais baixa para execuÃ§Ã£o objetiva
            max_tokens: repairProfile?.maxTokens || getResponseTokenBudget(content),
            maxToolRounds: repairProfile?.maxToolRounds,
            thinking: repairProfile?.thinking,
            executionRoute: repairRoute,
            executionProfile: repairProfile
          });

          // Registrar evidÃªncias do reparo
          for (const item of repairResult.toolResults) {
            registerToolEvidenceSources(evidenceSources, item.toolCall, item.result);
          }

          const repairedReply = repairResult.content;
          const stillEvasive = window.WorionVerificationEngine.isEvasiveResearchAnswer(repairedReply, content);

          if (!stillEvasive && repairedReply && repairedReply.length > 50) {
            console.log('[EVASIVE_REPAIR] Resposta reparada com sucesso.');
            reply = normalizeAssistantReply(repairedReply, content);

            // Marcar no trace
            if (typeof markTraceFlag === 'function') {
              markTraceFlag(turnTraceRun, 'evasive_answer_detected', true);
              markTraceFlag(turnTraceRun, 'evasive_answer_repaired', true);
            }
          } else {
            console.warn('[EVASIVE_REPAIR] Resposta reparada ainda evasiva ou muito curta. Mantendo resposta original.');
            if (typeof markTraceFlag === 'function') {
              markTraceFlag(turnTraceRun, 'evasive_answer_detected', true);
              markTraceFlag(turnTraceRun, 'evasive_answer_repair_failed', true);
            }
          }
        } catch (repairError) {
          console.error('[EVASIVE_REPAIR] Erro ao reparar resposta:', repairError);
          if (typeof markTraceFlag === 'function') {
            markTraceFlag(turnTraceRun, 'evasive_answer_detected', true);
            markTraceFlag(turnTraceRun, 'evasive_answer_repair_error', true);
          }
          // MantÃ©m resposta original em caso de erro
        }
      }
    }

    const finalEvidencePack = {
      ...evidencePack,
      sources: evidenceSources,
      evidenceSources,
      count: Array.isArray(evidenceSources) ? evidenceSources.length : evidencePack.count
    };

    const narrativeValidation = validateNarrativeClaims(reply, finalEvidencePack, {
      enabled: !isInternalDiagnostic && (isFactualRequest || verificationPlan.mustUseExternalEvidence),
      hasArtifact,
      isContextualFollowup: isInternalDiagnostic || (!isFactualRequest && !verificationPlan.mustUseExternalEvidence)
    });
    if (typeof markTraceFlag === 'function') {
      markTraceFlag(turnTraceRun, 'narrative_claim_validation_checked', !narrativeValidation.skipped);
      markTraceFlag(turnTraceRun, 'narrative_claim_validation_passed', narrativeValidation.valid);
      markTraceFlag(turnTraceRun, 'narrative_claims_checked', narrativeValidation.claimsChecked || 0);
      markTraceFlag(turnTraceRun, 'narrative_claims_unsupported', narrativeValidation.unsupportedCount || 0);
    }
    if (!narrativeValidation.valid) {
      console.warn('[NARRATIVE CLAIM VALIDATOR] TEST MODE: bloqueio factual desativado; resposta preservada.', narrativeValidation.reason);
      if (typeof markTraceFlag === 'function') {
        markTraceFlag(turnTraceRun, 'narrative_claim_validation_blocker_disabled_test_mode', true);
        markTraceFlag(turnTraceRun, 'narrative_claim_validation_reason', narrativeValidation.reason);
      }
      if (typeof logStep === 'function') {
        await logStep(turnTraceRun, 'narrativeClaimValidation', {
          enabled: true,
          hasArtifact,
          query: content
        }, {
          approved: false,
          reason: narrativeValidation.reason,
          unsupported: narrativeValidation.unsupported
        });
      }
    } else if (!narrativeValidation.skipped && typeof logStep === 'function') {
      await logStep(turnTraceRun, 'narrativeClaimValidation', {
        enabled: true,
        hasArtifact,
        query: content
      }, {
        approved: true,
        claimsChecked: narrativeValidation.claimsChecked || 0,
        unsupportedCount: narrativeValidation.unsupportedCount || 0
      });
    }

    await setAssistantReply(reply);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    if (typeof traceError === 'function') await traceError(turnTraceRun, 'finalAnswer', error);
    pendingArtifactRequest = null;
    const aborted = responseAbortRequested || error.name === 'AbortError';
    const safeToolLimit = error?.code === 'TOOL_ROUND_LIMIT';
    originMessages[assistantIndex] = {
      role: 'assistant',
      content: aborted
        ? 'Resposta interrompida.'
        : (safeToolLimit ? 'NÃ£o consegui concluir a execuÃ§Ã£o das ferramentas dentro do limite seguro.' : `Erro: ${error.message}`),
      createdAt: new Date().toISOString()
    };
  } finally {
    if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
    isAssistantResponding = false;
    responseAbortRequested = false;
    currentResponseController = null;
    currentTurnPolicy = {
      explicitNotionWriteAuthorized: false,
      deferNotionWrite: false,
      shouldExecuteDeferredNow: false
    };
    await finalizeTurnTrace(turnTraceRun, assistantIndex, '', originMessages);
  }

  sessionSaved = false;
  renderOriginConversation(originConversationId);
  await saveConversationSnapshot(originSnapshot, { silent: true });
  if (originConversationId && typeof queueContextIndexing === 'function') {
    queueContextIndexing(originConversationId, getCleanMessages(originMessages));
  }

  // Retorna foco ao input apÃ³s resposta
  setTimeout(() => {
    if (isOriginConversationActive(originConversationId) && typeof focusComposerInput === 'function') focusComposerInput();
  }, 100);
}

async function classifyUserRequest(content, attachments = []) {
  const heuristic = classifyRequestHeuristic(content, attachments);
  if (!openaiKey || heuristic.category === 'simple_query') return heuristic;

  const classifierModel = resolveModelId(currentAgent?.model || PRIMARY_REASONING_MODEL);
  if (getModelProvider(classifierModel) === 'deepseek') {
    console.log('[CLASSIFIER] DeepSeek detectado; usando heurÃ­stica local para evitar tool_choice incompatÃ­vel.');
    return heuristic;
  }

  try {
    const data = await callOpenAIWithRetry({
      model: currentAgent.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Classifique o pedido do usuario. Use simple_query para saudacoes/perguntas triviais; direct_action para uma unica tool; compound_goal para duas ou mais etapas, fallback, analise, verificacao, pesquisa, Notion+acao, Supabase+analise ou troubleshooting. Na duvida, compound_goal.' },
        { role: 'user', content }
      ],
      temperature: 0,
      max_tokens: 120,
      tools: [getToolDefinition('classify_request')],
      tool_choice: { type: 'function', function: { name: 'classify_request' } }
    }, 1);
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return heuristic;
    const result = await executeToolCall('classify_request', call.function.arguments);
    return result.error ? heuristic : result;
  } catch (error) {
    await logInternalAction('request_classification_fallback', 'error', { error: error.message, heuristic });
    return heuristic;
  }
}

function classifyRequestHeuristic(text, attachments = []) {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized && attachments.length === 0) return { category: 'simple_query', reason: 'pedido vazio', confidence: 1 };
  if (/^(oi|ola|olÃ¡|bom dia|boa tarde|boa noite|ok|sim|nao|nÃ£o|valeu|obrigado|m[aÃ£]os agradecendo emoji)[!.? ]*$/i.test(normalized)) {
    return { category: 'simple_query', reason: 'saudacao ou pedido simples', confidence: 0.95 };
  }

  const compoundTriggers = /(acesse|aceda|leia|execute|realize|teste|valide|audite|corrija|pesquise|encontre|atualize|salve|verifique|analise|compare|migre|sincronize|resuma|junte|consolide|notion.*supabase|supabase.*notion|troubleshooting|auditoria)/i;
  const hasMultipleSteps = /(e depois|depois|em seguida|e salve|e faÃ§a|e faca|junte|consolide|relat[oÃ³]rio|resumo)/i.test(normalized);
  if (attachments.length > 0 || compoundTriggers.test(normalized) || hasMultipleSteps) {
    return { category: 'compound_goal', reason: 'pedido exige execucao em multiplas etapas ou fallback', confidence: 0.82 };
  }

  const directAction = /(crie|salve|gere|liste|conte|busque|leia)/i.test(normalized);
  return directAction
    ? { category: 'direct_action', reason: 'uma acao direta parece suficiente', confidence: 0.72 }
    : { category: 'simple_query', reason: 'pergunta direta sem execucao composta', confidence: 0.7 };
}

function getToolDefinition(name) {
  return WORION_TOOLS.find(tool => tool.function.name === name);
}

function getGoalTools() {
  return WORION_TOOLS.filter(tool => tool.function.name !== 'classify_request');
}

function isToolExecutionRequest(text, attachments = []) {
  const normalized = String(text || '').toLowerCase();
  if (attachments.length > 0) return true;
  return /(pdf|notion|supabase|arquivo|salve|crie uma pagina|crie pÃ¡gina|gere arquivo|gere pdf|execute|rode|corrija|implemente|edite|modifique|liste|leia|workflow|n8n|api|banco de dados|deploy|commit|filesystem|conector|webhook)/i.test(normalized);
}

function isConceptualSynthesisRequest(text) {
  const normalized = String(text || '').toLowerCase();
  return /(explique|analise|investigue|pesquise|sintetize|compare|discuta|elabore|proponha|quero uma sintese|quero uma sÃ­ntese|pesquisa profunda|interdisciplinar|modelo integrador|pergunta central|filosofia|fisica|fÃ­sica|matematica|matemÃ¡tica|biologia|neurociencia|neurociÃªncia|metafisica|metafÃ­sica)/i.test(normalized);
}

function shouldUseGoalEngineForRequest(content, attachments = [], classification = {}) {
  if (!worionConfig.enableGoalEngine) return false;
  if (typeof getActiveWorkModeIds === 'function' ? getActiveWorkModeIds().length : activeWorkModeId) return false;
  if (isConceptualSynthesisRequest(content) && !isToolExecutionRequest(content, attachments)) return false;
  return classification.category === 'compound_goal';
}

function getResponseTokenBudget(content = '') {
  const text = String(content || '').toLowerCase();

  const asksLongForm =
    /\b(riqueza de detalhes|detalhadamente|com detalhes|completo|completa|profundo|profunda|pesquisa completa|histÃ³ria completa|historia completa|relatÃ³rio|relatorio|auditoria|dossiÃª|dossie|linha do tempo|cronologia|anÃ¡lise densa|analise densa)\b/i.test(text);

  const asksResearch =
    /\b(histÃ³ria|historia|histÃ³rico|historico|fundaÃ§Ã£o|fundacao|origem|cronologia|linha do tempo|pesquise|fontes|comprove|registro|liste|lista|todos|todas|prefeitos|vereadores|gestores|mandatos)\b/i.test(text);

  if (asksLongForm) return DEEPSEEK_LONG_FORM_MAX_TOKENS;
  if (asksResearch) return DEEPSEEK_DEFAULT_MAX_TOKENS;

  return DEEPSEEK_DEFAULT_MAX_TOKENS;
}

function buildAttachmentContextForPrompt(attachments = []) {
  if (!attachments.length) return '';
  const textAttachments = attachments.filter(file => (file.kind === 'text' || file.kind === 'unsupported') && (file.extractedText || file.text));
  if (!textAttachments.length) return '';
  return `\n\nARQUIVOS ANEXADOS NESTA MENSAGEM (${textAttachments.length}):\n` +
    textAttachments.map(file => {
      const text = String(file.extractedText || file.text || '');
      return `- ${file.name} (${(file.size / 1024).toFixed(1)}KB)\nConteudo extraido:\n${text.slice(0, 50000)}`;
    }).join('\n\n');
}

function buildSmartResearchQueries(content) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  const centralMatch = String(content || '').match(/minha pergunta central\s*(?:e|Ã©|:)?\s*:?\s*([\s\S]*?)(?:\n\s*(?:ao investigar|considere|nao busco|nÃ£o busco)|$)/i);
  const central = (centralMatch?.[1] || text).replace(/[*#>`]/g, '').replace(/\s+/g, ' ').trim();
  const stopwords = new Set(['gostaria', 'investigar', 'questao', 'pergunta', 'central', 'considere', 'quero', 'apenas', 'sobre', 'entre', 'como', 'para', 'pela', 'pelo', 'essa', 'esse', 'uma', 'que', 'das', 'dos', 'com', 'sem', 'mais', 'menos']);
  const keywords = [...new Set((text.toLowerCase().match(/[a-zÃ -Ã¿]{5,}/gi) || [])
    .map(word => word.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .filter(word => !stopwords.has(word)))]
    .slice(0, 10)
    .join(' ');
  const queries = [
    central.slice(0, 180),
    `${central.slice(0, 140)} site oficial fonte primaria`,
    `${central.slice(0, 140)} official site primary source`,
    `${keywords} fontes oficiais principios formula fundamentos`
  ];

  if (/\b(an[aÃ¡]lise densa|pesquisa profunda|dossi[eÃª]|relat[oÃ³]rio completo|profundo|profunda|completo|completa)\b/i.test(text)) {
    queries.push(`${keywords} analise critica fontes secundarias contexto`);
  }

  return [...new Set(queries.map(query => query.replace(/\s+/g, ' ').trim()).filter(query => query.length > 12))].slice(0, 5);
}

function formatResearchResults(results = []) {
  const lines = [];
  const seen = new Set();
  for (const batch of results) {
    if (batch.error) {
      lines.push(`Consulta: ${batch.query}\nErro: ${batch.error}`);
      continue;
    }
    const items = [...(batch.results || []), ...(batch.news || []), ...(batch.discussions || [])];
    for (const item of items) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      lines.push(`- ${item.title || 'Sem titulo'}\n  URL: ${item.url}\n  Resumo: ${item.description || ''}`);
      if (lines.length >= 16) return lines.join('\n');
    }
  }
  return lines.join('\n');
}

function withTimeout(promise, ms, fallback) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise(resolve => {
      timer = setTimeout(() => resolve(fallback), ms);
    })
  ]);
}

async function generateSmartResearchReply(content, attachments = [], verificationPlan = null, sourceMessages = messages) {
  const queries = buildSmartResearchQueries(content).slice(0, 3);
  const researchResults = [];
  for (const query of queries) {
    if (typeof showWorionStatus === 'function') showWorionStatus('sources');
    const result = await searchExternalSources(query, {
      count: 5,
      country: 'BR',
      search_lang: /\b(the|and|self|information|consciousness)\b/i.test(query) ? 'en' : 'pt-br'
    }, 8500);
    researchResults.push({ query, ...result });
    if (result.error && /brave search|tavily|subscription|api|vault/i.test(result.error)) break;
  }

  // VERIFICATION ENGINE: Smart Research sempre usa evidÃªncia externa, entÃ£o estÃ¡ OK
  if (verificationPlan?.mustUseExternalEvidence && typeof window !== 'undefined' && window.WorionVerificationEngine) {
    const successfulSearches = researchResults.filter(r => !r.error).length;
    console.log('[VERIFICATION] Smart Research executou', successfulSearches, 'pesquisa(s) externa(s)');
  }

  if (typeof showWorionStatus === 'function') showWorionStatus('composing');
  const thinkingContext = await getSequentialThinkingContext(content, attachments);
  const attachmentContext = buildAttachmentContextForPrompt(attachments);
  const agentDomainResearchContext = await buildAgentDomainResearchContext(content, attachments);
  const sourceContext = formatResearchResults(researchResults);
  const researchDirective = `

## Protocolo de Pesquisa Inteligente

Responda ao pedido do usuario como uma sintese interdisciplinar profunda. Nao devolva objetivo/status. Nao resuma o prompt do usuario.

Obrigatorio:
- Comece com um titulo curto em markdown.
- Apresente uma descricao do problema em linguagem conceitual precisa.
- Conecte as areas solicitadas sem reduzir uma area a outra.
- Explicite convergencias, tensoes, paradoxos e limites epistemologicos.
- Proponha ao final um modelo integrador com nome, camadas e criterio de uso.
- Use topicos verticais quando houver listas.
- Fontes ficam apenas no fim como: <small>Fontes: [Nome](URL) Â· [Nome](URL)</small>
- Se a busca externa falhar, diga isso discretamente no encerramento e entregue a melhor sintese conceitual sem fingir fontes.

Resultados de pesquisa coletados:
${sourceContext || 'Nenhum resultado externo disponivel.'}
`;

  const systemPrompt = buildSystemPrompt(content, attachments, [attachmentContext, agentDomainResearchContext, researchDirective].filter(Boolean).join('\n\n'));
  await tracePromptStep(typeof getCurrentTraceRun === 'function' ? getCurrentTraceRun() : null, systemPrompt, {
    route: 'smart_research',
    attachmentsCount: attachments.length
  });
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...(thinkingContext ? [{ role: 'system', content: thinkingContext }] : []),
    ...sourceMessages.filter(m => m.content !== '...' && ['user', 'assistant'].includes(m.role)).slice(-8).map(formatMessageForOpenAI)
  ];

  const data = await callOpenAIWithRetry({
    model: currentAgent.model || 'gpt-4o-mini',
    messages: apiMessages,
    temperature: 0.35,
    max_tokens: 6500
  }, 2);

  return data.choices?.[0]?.message?.content || '';
}

async function executeCompoundGoal(content, attachments = [], classification = {}, verificationPlan = null) {
  currentGoalAborted = false;
  const startedAt = Date.now();
  const timeoutMs = Math.max(10, Number(worionConfig.goalTimeout || 120)) * 1000;
  const goalId = makeId('goal');
  currentGoalRun = {
    id: goalId,
    objective: content,
    status: 'running',
    startedAt: new Date().toISOString(),
    tools: [],
    errors: [],
    findings: [],
    actions: [],
    verificationPlan: verificationPlan || null
  };

  await logInternalAction('goal_started', 'success', { goalId, objective: content, classification, verificationRequired: verificationPlan?.mustUseExternalEvidence });
  const thinkingContext = await getSequentialThinkingContext(content, attachments);
  const agentDomainResearchContext = await buildAgentDomainResearchContext(content, attachments);
  const toolHistory = [];
  let finalText = '';
  let status = 'concluido';

  // Incluir contexto de attachments no goal execution
  let attachmentContext = '';
  if (attachments.length > 0) {
    const textAttachments = attachments.filter(f => (f.kind === 'text' || f.kind === 'unsupported') && (f.extractedText || f.text));
    if (textAttachments.length > 0) {
      attachmentContext = `\n\nðŸ“Ž ARQUIVOS ANEXADOS (${textAttachments.length}):\n` +
        textAttachments.map(f => {
          const excerpt = (f.extractedText || f.text || '').slice(0, 200);
          return `- ${f.name} (${(f.size/1024).toFixed(1)}KB)\n  InÃ­cio: ${excerpt}...`;
        }).join('\n') +
        '\n\nO conteÃºdo completo estÃ¡ na mensagem do usuÃ¡rio. Use-o para responder. NUNCA diga "arquivo nÃ£o foi encontrado" - o conteÃºdo estÃ¡ disponÃ­vel acima.';
    }
  }

  const goalSystemPrompt = buildSystemPrompt(content, attachments, [attachmentContext, agentDomainResearchContext].filter(Boolean).join('\n\n'));
  await tracePromptStep(typeof getCurrentTraceRun === 'function' ? getCurrentTraceRun() : null, goalSystemPrompt, {
    route: 'compound_goal',
    attachmentsCount: attachments.length
  });

  const goalMessages = [
    { role: 'system', content: buildGoalExecutionPrompt() },
    { role: 'system', content: goalSystemPrompt },
    ...(thinkingContext ? [{ role: 'system', content: thinkingContext }] : []),
    formatMessageForOpenAI({ role: 'user', content, attachments })
  ];

  console.log('[GOAL] Iniciando com', attachments.length, 'anexos');
  const route = WORION_EXECUTION_ROUTER_TEST ? getExecutionRoute(content) : null;
  const executionProfile = route ? EXECUTION_PROFILES[route] : null;
  const maxTokens = executionProfile?.maxTokens || getResponseTokenBudget(content);
  console.log('[TOKEN BUDGET] route:', route || 'goal_engine', 'max_tokens:', maxTokens, 'source:', 'execution_router_or_goal_engine');

  for (let step = 1; step <= 8; step++) {
    if (currentGoalAborted) {
      status = 'cancelado';
      break;
    }
    if (Date.now() - startedAt > timeoutMs) {
      status = 'parcial';
      currentGoalRun.errors.push(`Timeout apos ${Math.round(timeoutMs / 1000)}s`);
      break;
    }

    goalExecutionState(step, 8, 'analyzing_context');
    const data = await callOpenAIWithRetry({
      model: currentAgent.model || 'gpt-4o-mini',
      messages: goalMessages,
      temperature: 0.2,
      max_tokens: maxTokens,
      tools: getGoalTools(),
      tool_choice: 'auto'
    });

    const message = data.choices?.[0]?.message;
    let calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
    const textToolCall = calls.length ? null : parseTextToolCall(message?.content, getGoalTools());
    if (textToolCall) calls = [textToolCall];
    console.log('[AGENT LOOP] round:', step - 1);
    console.log('[AGENT LOOP] tool_calls recebidas:', calls.length);
    if (!calls.length) {
      console.log('[AGENT LOOP] resposta final sem tool_calls');
      finalText = message?.content || '';
      break;
    }

    goalMessages.push(textToolCall
      ? { role: 'assistant', content: null, tool_calls: calls }
      : message);
    goalExecutionState(step, 8, 'analyzing_context');
    const execResults = worionConfig.enableGoalParallelTools && calls.length > 1
      ? await Promise.all(calls.map(call => executeGoalToolCall(call, step)))
      : [];
    if (!worionConfig.enableGoalParallelTools || calls.length <= 1) {
      for (const call of calls) execResults.push(await executeGoalToolCall(call, step));
    }

    for (const item of execResults) {
      toolHistory.push(item);
      goalMessages.push({ role: 'tool', tool_call_id: item.tool_call_id, name: item.name, content: JSON.stringify(item.result) });
    }
  }

  if (!finalText && status === 'concluido') {
    status = 'parcial';
    finalText = 'NÃ£o consegui concluir a execuÃ§Ã£o das ferramentas dentro do limite seguro.';
    currentGoalRun.errors.push(finalText);
  }
  if (currentGoalRun.errors.length && status === 'concluido') status = 'parcial';
  currentGoalRun.status = status;
  currentGoalRun.finishedAt = new Date().toISOString();
  goalExecutionState(null, null, '');
  await logInternalAction('goal_finished', status, { goalId, tools: currentGoalRun.tools, errors: currentGoalRun.errors });

  // TEST MODE: Verification Engine fica apenas em observabilidade; nao altera reportToReturn.
  let reportToReturn = buildGoalReport({
    status,
    objective: content,
    tools: currentGoalRun.tools,
    findings: currentGoalRun.findings,
    actions: currentGoalRun.actions,
    errors: currentGoalRun.errors,
    finalText
  });

  if (verificationPlan?.mustUseExternalEvidence && typeof window !== 'undefined' && window.WorionVerificationEngine) {
    const allToolCalls = toolHistory.map(item => ({ function: { name: item.name } }));
    const evidenceUsed = window.WorionVerificationEngine.countExternalEvidence(allToolCalls);
    const validation = window.WorionVerificationEngine.validateResponse(verificationPlan, evidenceUsed);

    console.log('[VERIFICATION] Compound Goal - ValidaÃ§Ã£o:', validation);
    console.log('[VERIFICATION] Compound Goal - EvidÃªncia usada:', evidenceUsed);

    if (!validation.approved) {
      console.warn('[VERIFICATION] Compound Goal - TEST MODE: bloqueio factual desativado; relatÃ³rio preservado.', validation.reason);
    }
  }

  currentGoalRun = null;
  currentGoalAborted = false;
  return reportToReturn;
}

async function executeGoalToolCall(call, step) {
  const name = normalizeToolName(call.function.name);
  const args = call.function.arguments;
  console.log('[AGENT LOOP] executando:', name);
  const result = await executeToolCall(name, args);
  console.log('[AGENT LOOP] resultado chars:', JSON.stringify(result || '').length);
  const ok = !result.error;
  const parsedArgs = (() => { try { return typeof args === 'string' ? JSON.parse(args) : args; } catch { return {}; } })();
  currentGoalRun.tools.push(name);
  if (ok) {
    currentGoalRun.actions.push(`${name} executado`);
    collectGoalFindings(name, result);
  } else {
    currentGoalRun.errors.push(`${name}: ${result.error}`);
  }
  await logInternalAction('goal_tool_call', ok ? 'success' : 'error', { name, args: parsedArgs, result });
  return { tool_call_id: call.id, name, result };
}

function collectGoalFindings(name, result) {
  if (result?.pages?.length) {
    currentGoalRun.findings.push(...result.pages.slice(0, 5).map(page => `${page.title || page.id}`));
  }
  if (result?.results?.length) {
    currentGoalRun.findings.push(...result.results.slice(0, 5).map(item => item.title || item.url || item.snippet || item.conversation_id || 'resultado'));
  }
  if (result?.rows?.length) {
    currentGoalRun.findings.push(`${result.rows.length} linha(s) em ${result.table || name}`);
  }
  if (typeof result?.count === 'number') {
    currentGoalRun.findings.push(`${result.count} registro(s) em ${result.table || name}`);
  }
  if (result?.url) currentGoalRun.findings.push(result.url);
}

function goalExecutionState(step, total, detail) {
  if (!currentGoalRun) return;
  currentGoalRun.step = step;
  currentGoalRun.totalSteps = total;
  currentGoalRun.detail = detail;
  executionStatus = step ? (detail || 'analyzing_context') : null;
  executionStatusLabel = getFriendlyExecutionLabel?.(executionStatus) || '';
  if (step && typeof showExecutionStatus === 'function') showExecutionStatus(executionStatusLabel);
  if (!step && typeof hideExecutionStatus === 'function') hideExecutionStatus();
}

function cancelCurrentGoal() {
  if (!currentGoalRun) return;
  currentGoalAborted = true;
  currentGoalRun.status = 'cancelado';
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  logInternalAction('goal_cancel_requested', 'cancelled', { goalId: currentGoalRun.id });
  renderChatPanel();
}

function interruptCurrentResponse() {
  responseAbortRequested = true;
  currentGoalAborted = true;
  if (currentResponseController) {
    try { currentResponseController.abort(); } catch {}
  }
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  renderChatPanel();
}

function buildGoalExecutionPrompt() {
  return `O Worion e um executor orientado a objetivos.
Classifique este pedido como objetivo composto ja tratado internamente.
Execute antes de responder. Use tools concretas. Nao pare na primeira falha: tente fallback e alternativas.
Se tools independentes forem necessarias, chame-as na mesma rodada.
Nao exponha sequential_thinking. Nao use frases genericas de encerramento.
CRITICO: Nunca declare acao como concluida (gerado, salvo, criado) sem confirmacao da tool. Se pedir PDF, use generate_pdf. Se pedir Notion, use create_notion_page. Sem tool disponivel, seja honesto.
Quando terminar, responda com resultado verificavel e mencione pendencias reais.`;
}

function buildGoalReport({ status, objective, tools, findings, actions, errors, finalText }) {
  // Modo normal: retornar apenas a resposta final
  if (!worionConfig.internalLogs) {
    return normalizeAssistantReply(finalText || 'ExecuÃ§Ã£o concluÃ­da.');
  }

  // Modo debug: retornar relatÃ³rio completo
  const uniqueTools = [...new Set(tools)].filter(Boolean);
  const uniqueFindings = [...new Set(findings)].filter(Boolean).slice(0, 12);
  const uniqueActions = [...new Set(actions)].filter(Boolean).slice(0, 12);
  const pending = errors.length ? errors : ['nenhuma'];
  return normalizeAssistantReply(`**Resultado**
Status: ${status}
Objetivo: ${objective}
Tools usadas: ${uniqueTools.length ? uniqueTools.join(', ') : 'nenhuma'}

Itens encontrados:
${uniqueFindings.length ? uniqueFindings.map(item => `- ${item}`).join('\n') : '- nenhum'}

Acoes realizadas:
${uniqueActions.length ? uniqueActions.map(item => `- ${item}`).join('\n') : '- nenhuma'}

Pendencias reais:
${pending.map(item => `- ${item}`).join('\n')}

${finalText ? `Detalhes:\n${finalText}` : ''}`);
}

function isComplexRequest(text, attachments = []) {
  if (!WORION_UX_CONFIG.autoSequentialThinking) return false;
  const normalized = String(text || '').toLowerCase();
  if (normalized.length < 80 && attachments.length === 0) return false;
  if (/^(oi|ola|olÃ¡|bom dia|boa tarde|boa noite|ok|sim|nao|nÃ£o|valeu|obrigado)[!.? ]*$/i.test(normalized.trim())) return false;

  const complexPatterns = [
    /arquitetura|planej(a|amento)|compar(a|e|aÃ§Ã£o)|diagn[oÃ³]stico|troubleshooting|decis(Ã£o|oes|Ãµes)|estrat[eÃ©]g/i,
    /implementar|refatorar|integrar|migrar|debug|corrigir|investigar|analisar|documento|sistema/i,
    /m[Ãºu]ltiplas etapas|passo a passo|tradeoff|roadmap|prioridade|backlog|workflow|mcp|supabase|notion|github/i
  ];

  return attachments.length > 0 || complexPatterns.some(pattern => pattern.test(normalized));
}

async function getSequentialThinkingContext(content, attachments = []) {
  if (!isComplexRequest(content, attachments)) return '';
  const result = await executeToolCall('sequential_thinking', {
    goal: content.slice(0, 500),
    context: [
      currentProjectContext ? `Projeto: ${currentProjectContext.title}` : '',
      attachments.length ? `Anexos: ${attachments.map(file => file.name).join(', ')}` : '',
      connectorContext ? 'Ha contexto real de conectores carregado.' : ''
    ].filter(Boolean).join('\n'),
    steps: '1. Identificar o objetivo real do usuario.\n2. Separar contexto, restricoes e ferramentas disponiveis.\n3. Executar tools quando houver acao real a fazer.\n4. Responder apenas com o resultado util, sem expor raciocinio interno desnecessario.',
    next_action: 'Responder de forma objetiva, estruturada e verificavel.'
  });
  if (result?.error) return '';
  return `Planejamento interno do Worion para esta resposta. Use como orientacao silenciosa; nao exponha como raciocinio interno:\n${JSON.stringify(result)}`;
}

function normalizeAssistantReply(reply, userMessage = '') {
  let text = cleanAgentResponse(reply);
  const genericAssimilation = /^(?:li|terminei de ler|acessei|carreguei)\s+(?:as ultimas sessoes|o conteudo solicitado|o conteudo do notion|esse conteudo|o material|os arquivos?).{0,180}(?:incorporei|incorporado|vou usar|proximas respostas)/i;
  if (genericAssimilation.test(String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
    const incorporated = typeof getSilentIncorporatedContextForPrompt === 'function' ? getSilentIncorporatedContextForPrompt() : '';
    if (typeof generateContextualAssimilationResponse === 'function') {
      text = generateContextualAssimilationResponse({
        sourceType: 'contexto_assimilado',
        activeAgent: currentAgent,
        userProfile,
        content: [incorporated, userMessage].filter(Boolean).join('\n\n'),
        projects: typeof inferAssimilationProjects === 'function' ? inferAssimilationProjects(incorporated || userMessage) : [],
        extractedThemes: typeof inferAssimilationThemes === 'function' ? inferAssimilationThemes(incorporated || userMessage) : [],
        insights: typeof inferAssimilationInsights === 'function' ? inferAssimilationInsights(incorporated || userMessage) : []
      });
    }
  }
  text = repairGenericSemanticReply(text, userMessage);
  if (!WORION_UX_CONFIG.suppressGenericClosings) return text;
  const closings = [
    /(?:\n|\s)*(se precisar de mais informa[cÃ§][oÃµ]es,?\s*me avise\.?)$/i,
    /(?:\n|\s)*(se precisar de mais informa[cÃ§][oÃµ]es ou detalhes espec[Ã­i]ficos[^.]*\.?)$/i,
    /(?:\n|\s)*(se precisar de mais detalhes[^.]*\.?)$/i,
    /(?:\n|\s)*(estou [Ã a] disposi[cÃ§][aÃ£]o\.?)$/i,
    /(?:\n|\s)*(posso ajudar em mais alguma coisa\??)$/i,
    /(?:\n|\s)*(posso ajudar com mais pesquisas ou an[Ã¡a]lises\.?)$/i,
    /(?:\n|\s)*(me avise se quiser continuar\.?)$/i,
    /(?:\n|\s)*(se precisar de algo mais,?\s*me avise\.?)$/i,
    /(?:\n|\s)*(caso queira,?\s*posso[^.]*\.?)$/i,
    /(?:\n|\s)*(se quiser,?\s*posso[^.]*\.?)$/i,
    /(?:\n|\s)*(me avise se precisar[^.]*\.?)$/i
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of closings) {
      const next = text.replace(pattern, '').trim();
      if (next !== text) {
        text = next;
        changed = true;
      }
    }
  }
  return text;
}

function repairGenericSemanticReply(reply, userMessage = '') {
  const text = String(reply || '').trim();
  if (!text || !userMessage) return text;
  if (typeof analyzeSemanticIntent !== 'function') return text;

  const context = typeof getRecentSemanticContext === 'function' ? getRecentSemanticContext(10) : '';
  const state = analyzeSemanticIntent(userMessage, context);
  if (!state.needsPresence) return text;

  const normalizedReply = typeof normalizeSearchText === 'function' ? normalizeSearchText(text) : text.toLowerCase();
  const genericPatterns = [
    /entendo.*deve ser dificil/i,
    /como voce esta se sentindo/i,
    /como voc[eÃª] est[aÃ¡] se sentindo/i,
    /cansad[oa]? como/i,
    /tem algo especifico/i,
    /tem algo espec[iÃ­]fico/i,
    /voce tem conseguido fazer pausas/i,
    /voc[eÃª] tem conseguido fazer pausas/i,
    /momentos de descanso/i,
    /algo que voce gosta de fazer para relaxar/i,
    /algo que voc[eÃª] gosta de fazer para relaxar/i,
    /musica e uma otima forma/i,
    /m[uÃº]sica [eÃ©] uma [oÃ³]tima forma/i,
    /qual artista ou genero/i,
    /qual artista ou g[eÃª]nero/i,
    /que bom que voce/i,
    /que bom que voc[eÃª]/i,
    /a sensacao de solidao pode intensificar/i,
    /a sensa[cÃ§][aÃ£]o de solid[aÃ£]o pode intensificar/i
  ];

  const looksGeneric = genericPatterns.some(pattern => pattern.test(text) || pattern.test(normalizedReply));
  if (!looksGeneric) return text;

  const fallback = buildSemanticFallbackReply(userMessage, state);
  return fallback || text;
}

function buildSemanticFallbackReply(userMessage = '', state = {}) {
  const current = typeof normalizeSemanticText === 'function'
    ? normalizeSemanticText(userMessage)
    : String(userMessage || '').toLowerCase();
  const flags = state.flags || {};

  if (flags.pushback) {
    return [
      'NÃ£o. NÃ£o precisava.',
      '',
      'Trabalhar num domingo, com TDAH, morando sozinho e ainda carregando trabalho de DEV jÃ¡ explica o peso. Eu forcei uma pergunta onde cabia reconhecer o Ã³bvio: isso nÃ£o Ã© apenas cansaÃ§o; Ã© saturaÃ§Ã£o de sustentar tudo sem um corte claro entre vida, casa e entrega.',
      '',
      'Hoje eu baixaria a exigÃªncia, nÃ£o investigaria mais.'
    ].join('\n');
  }

  if (flags.decompressionMusic) {
    return [
      'EntÃ£o fica na mÃºsica.',
      '',
      'NÃ£o como tÃ©cnica de produtividade. Como descompressÃ£o mesmo: som preenchendo a casa, tirando o domingo da cabeÃ§a e devolvendo um pouco de companhia para um corpo que passou o dia em modo trabalho.',
      '',
      'Hoje isso jÃ¡ Ã© bastante.'
    ].join('\n');
  }

  if (flags.shortFatigue) {
    return [
      'Faz sentido vocÃª estar cansado.',
      '',
      'Pelo fio da conversa, nÃ£o parece preguiÃ§a nem drama. Parece saturaÃ§Ã£o: trabalho tÃ©cnico demais, TDAH segurando foco no braÃ§o, domingo invadido e a casa sem alguÃ©m para marcar o fim do expediente.',
      '',
      'O trabalho acabou por hoje, ou ainda ficou alguma coisa te puxando?'
    ].join('\n');
  }

  if (flags.workOverload && flags.neurodivergent) {
    return [
      'Isso pesa de um jeito especÃ­fico.',
      '',
      'NÃ£o Ã© sÃ³ "trabalhei muito". Ã‰ trabalho tÃ©cnico, TDAH, morar sozinho e domingo virando extensÃ£o da semana. Sem um corte externo, a cabeÃ§a continua em modo entrega mesmo quando o corpo jÃ¡ pediu fechamento.',
      '',
      'Eu ficaria no simples agora: acabou por hoje?'
    ].join('\n');
  }

  if (/puxad|pesad|cansad|exaust|esgotad/.test(current)) {
    return [
      'Puxado desse jeito deixa resto.',
      '',
      'DÃ¡ para sentir que nÃ£o foi sÃ³ volume de tarefa; foi desgaste acumulado. Quando o dia cobra demais, a conversa nÃ£o precisa virar interrogatÃ³rio.',
      '',
      'Me diz sÃ³ uma coisa: vocÃª quer companhia em silÃªncio ou quer organizar o fim do dia?'
    ].join('\n');
  }

  return '';
}

function cleanAgentResponse(rawResponse) {
  let text = stripDsmlToolBlocks(rawResponse);
  if (!text) return '';

  const technicalHeader =
    /^\s*(?:\*\*)?\s*Resultado\s*(?:\*\*)?\s*$/im.test(text) ||
    /^\s*(?:\*\*)?\s*Status\s*:\s*(?:concluido|conclu[iÃ­]do|parcial|erro|cancelado)/im.test(text) ||
    /^\s*(?:\*\*)?\s*Objetivo\s*:/im.test(text) ||
    /^\s*(?:\*\*)?\s*Tools usadas\s*:/im.test(text) ||
    /^\s*(?:\*\*)?\s*Itens encontrados\s*:/im.test(text) ||
    /^\s*(?:\*\*)?\s*A[cÃ§][oÃµ]es realizadas\s*:/im.test(text) ||
    /^\s*(?:\*\*)?\s*Pend[eÃª]ncias reais\s*:/im.test(text);
  const detailsMatch = text.match(/(?:^|\n)\s*(?:\*\*)?\s*Detalhes\s*:?\s*(?:\*\*)?\s*\n?/i);

  if (technicalHeader && detailsMatch) {
    text = text.slice((detailsMatch.index || 0) + detailsMatch[0].length).trim();
  }

  return text
    .replace(/^\s*(?:\*\*)?\s*Detalhes\s*:?\s*(?:\*\*)?\s*/i, '')
    .trim();
}

async function startChat(options = {}) {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  if (!currentAgent) currentAgent = getDefaultAgent();
  if (!currentAgent) {
    alert('Nenhum agente encontrado.');
    return;
  }

  chatMode = true;
  if (!options.keepMessages) messages = [];
  if (!options.keepMessages || messages.length === 0) resetSilentIncorporatedContext();
  sessionStartedAt = sessionStartedAt || new Date();
  usageAccountingStartedAt = Date.now();
  sessionSaved = false;
  previousSessionsContext = '';

  if (!deepseekKey) {
    try {
      deepseekKey = await getDeepSeekKey();
      console.log('[DEEPSEEK] API key carregada - modelo principal disponivel');
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
      console.log('[ANTHROPIC] Claude API key carregada - Haiku disponÃ­vel para pesquisas');
    } catch (error) {
      console.warn('[ANTHROPIC] Claude API key nÃ£o encontrada - usando apenas OpenAI:', error.message);
      // NÃ£o bloqueia - OpenAI continua funcionando
    }
  }

  // V12 Turbo: Injetar memÃ³ria recente
  await injectRecentMemory();

  // Mensagem de boas-vindas contextual
  if (messages.length === 0 && !options.keepMessages) {
    const welcome = getWelcomeMessage();
    messages.push({ role: 'assistant', content: welcome, createdAt: new Date().toISOString() });
  }

  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';
  setActiveView(window.currentChatSource === 'agent' ? 'agents' : 'new-chat');
  selected = currentAgent.id;
  renderChatPanel();
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
  currentConversationId = null;
  messages = [];
  resetSilentIncorporatedContext();
  await startChat({ keepMessages: true, loadHistory: false });
  if (text) {
    const chatInput = document.getElementById('chat-in');
    chatInput.value = text;
    await sendMsg();
  }
}

async function openConversation(id) {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  const convo = await readConversationFile(id);
  const now = new Date();
  const last = convo.lastOpenedAt || convo.updatedAt || convo.createdAt;
  currentConversationId = convo.id;
  currentAgent = agents.find(a => a.id === convo.agentId) || getDefaultAgent();
  const defaultAgent = getDefaultAgent();
  window.currentChatSource = convo.chatSource || (convo.isAgentSession || (convo.agentId && convo.agentId !== defaultAgent?.id) ? 'agent' : 'home');
  activeSkillId = convo.activeSkillId || null;
  activeWorkModeIds = Array.isArray(convo.activeWorkModeIds) ? convo.activeWorkModeIds : (convo.activeWorkModeId ? [convo.activeWorkModeId] : []);
  activeWorkModeId = activeWorkModeIds[0] || null;
  autoSaveNotion = Boolean(convo.autoSaveNotion);
  silentIncorporatedContext = String(convo.silentIncorporatedContext || '');
  DEFERRED_ACTIONS = Array.isArray(convo.deferredActions) ? convo.deferredActions : [];
  selected = currentAgent?.id || null;
  messages = Array.isArray(convo.messages) ? convo.messages : [];
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

===== END FILE: js\chat.js =====

===== BEGIN FILE: js\verification.js =====
/**
 * MÃ“DULO: verification.js
 * RESPONSABILIDADE: Camada de verificaÃ§Ã£o factual para reduzir alucinaÃ§Ãµes
 * DEPENDÃŠNCIAS: nenhuma
 * EXPORTA: window.WorionVerificationEngine
 * TOOLS REGISTRADAS: nenhuma
 * NÃƒO MODIFICAR SEM LER: prompt.js, chat.js (este mÃ³dulo Ã© injetado no fluxo de prompt e chat)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// VERIFICATION ENGINE
// ============================================

(function() {
  'use strict';

  // DomÃ­nios que exigem verificaÃ§Ã£o obrigatÃ³ria
  const CRITICAL_DOMAINS = {
    history: {
      keywords: /\b(aconteceu|ocorreu|foi|era|estava|histÃ³ria|histÃ³rico|guerra|revoluÃ§Ã£o|sÃ©culo|ano|Ã©poca|perÃ­odo|data|quando)\b/i,
      requires: 2,
      priority: 1
    },
    politics: {
      keywords: /\b(governo|governador|presidente|ministro|deputado|senador|partido|eleiÃ§Ã£o|lei|polÃ­tica|polÃ­tico|parlamento|congresso|votaÃ§Ã£o)\b/i,
      requires: 2,
      priority: 1
    },
    legal: {
      keywords: /\b(lei|artigo|cÃ³digo|jurÃ­dico|jurisprudÃªncia|tribunal|processo|sentenÃ§a|constitucional|legal|ilegal|crime|direito)\b/i,
      requires: 2,
      priority: 1
    },
    medical: {
      keywords: /\b(doenÃ§a|sintoma|tratamento|medicamento|remÃ©dio|diagnÃ³stico|mÃ©dico|saÃºde|clÃ­nico|paciente|terapia|dose)\b/i,
      requires: 2,
      priority: 1
    },
    finance: {
      keywords: /\b(investimento|aÃ§Ã£o|bolsa|dÃ³lar|taxa|juros|inflaÃ§Ã£o|economia|mercado|financeiro|banco|crÃ©dito)\b/i,
      requires: 2,
      priority: 1
    },
    biography: {
      keywords: /\b(nasceu|morreu|viveu|fundou|criou|descobriu|inventou|biografia|quem foi|quem Ã©|nascimento|morte)\b/i,
      requires: 2,
      priority: 1
    },
    geography: {
      keywords: /\b(fica|localiza|situa|capital|paÃ­s|cidade|estado|regiÃ£o|continente|fronteira|populaÃ§Ã£o|Ã¡rea)\b/i,
      requires: 1,
      priority: 2
    },
    technical: {
      keywords: /\b(especificaÃ§Ã£o|padrÃ£o|protocolo|norma|standard|rfc|iso|api|biblioteca|framework|versÃ£o)\b/i,
      requires: 1,
      priority: 2
    },
    general: {
      keywords: /\b(fato|dados|estatÃ­stica|pesquisa|estudo|fonte|referÃªncia|evidÃªncia|confirmado|comprovado)\b/i,
      requires: 1,
      priority: 3
    }
  };

  // PadrÃµes que indicam pedido factual direto
  const FACTUAL_PATTERNS = [
    /^(quando|onde|quem|qual|quanto|como)\s/i,
    /\b(verdade|verdadeiro|correto|certo|errado|falso|fato|dados)\b/i,
    /\b(aconteceu|ocorreu|existe|existiu|Ã©|foi|sÃ£o|foram)\b/i,
    /\b(pesquise|pesquisa|busque|busca|procure|procura|verifique|verifica|confirme|confirma)\b/i
  ];

  // PadrÃµes que indicam contestaÃ§Ã£o do usuÃ¡rio
  const CHALLENGE_PATTERNS = [
    /\b(nÃ£o|nao|errado|incorreto|discordo|diverge|contradiz|contraditÃ³rio|contestÃ¡vel)\b/i,
    /\b(tem certeza|vocÃª tem certeza|estÃ¡ certo|esta certo)\b/i,
    /\b(na verdade|mas|porÃ©m|contudo|entretanto)\b/i
  ];

  // Hierarquia de fontes por domÃ­nio
  const SOURCE_HIERARCHY = {
    history: [
      'fontes primÃ¡rias histÃ³ricas',
      'bases acadÃªmicas (JSTOR, Academia.edu)',
      'instituiÃ§Ãµes histÃ³ricas oficiais',
      'publicaÃ§Ãµes revisadas por pares',
      'fontes secundÃ¡rias referenciadas'
    ],
    politics: [
      'diÃ¡rios oficiais',
      'portais governamentais oficiais',
      'legislaÃ§Ã£o publicada',
      'veÃ­culos institucionais',
      'fontes jornalÃ­sticas mÃºltiplas'
    ],
    legal: [
      'legislaÃ§Ã£o oficial',
      'jurisprudÃªncia publicada',
      'bases jurÃ­dicas oficiais',
      'doutrina referenciada',
      'anÃ¡lises de especialistas'
    ],
    medical: [
      'bases mÃ©dicas oficiais (PubMed, CID, Anvisa)',
      'estudos clÃ­nicos revisados por pares',
      'diretrizes de Ã³rgÃ£os mÃ©dicos',
      'literatura mÃ©dica referenciada',
      'consensos mÃ©dicos'
    ],
    finance: [
      'dados de instituiÃ§Ãµes financeiras oficiais',
      'bases econÃ´micas governamentais',
      'relatÃ³rios auditados',
      'anÃ¡lises de instituiÃ§Ãµes reconhecidas',
      'fontes mÃºltiplas do mercado'
    ],
    biography: [
      'registros oficiais',
      'biografias autorizadas',
      'bases biogrÃ¡ficas institucionais',
      'fontes primÃ¡rias documentadas',
      'fontes mÃºltiplas independentes'
    ],
    geography: [
      'bases geogrÃ¡ficas oficiais',
      'dados governamentais',
      'institutos de geografia',
      'atlas e referÃªncias oficiais',
      'fontes mÃºltiplas'
    ],
    technical: [
      'documentaÃ§Ã£o oficial',
      'especificaÃ§Ãµes publicadas',
      'bases tÃ©cnicas reconhecidas',
      'repositÃ³rios oficiais',
      'documentaÃ§Ã£o referenciada'
    ],
    general: [
      'fontes oficiais',
      'bases institucionais',
      'fontes acadÃªmicas',
      'fontes secundÃ¡rias referenciadas',
      'memÃ³ria do modelo'
    ]
  };

  /**
   * Classifica o tipo de questÃ£o do usuÃ¡rio
   * @param {string} userMessage - Mensagem do usuÃ¡rio
   * @returns {string} - 'factual', 'opinion', 'procedural', 'conversational'
   */
  function classifyQuestionType(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') return 'conversational';

    const normalized = userMessage.toLowerCase().trim();

    // Verifica padrÃµes factuais
    for (const pattern of FACTUAL_PATTERNS) {
      if (pattern.test(normalized)) return 'factual';
    }

    // Verifica domÃ­nios crÃ­ticos
    for (const [domain, config] of Object.entries(CRITICAL_DOMAINS)) {
      if (config.keywords.test(normalized)) return 'factual';
    }

    // PadrÃµes de opiniÃ£o
    if (/\b(acho|acredito|opiniÃ£o|penso|sinto|parece|sugere|recomenda)\b/i.test(normalized)) {
      return 'opinion';
    }

    // PadrÃµes procedurais
    if (/\b(como fazer|passo a passo|tutorial|instruÃ§Ã£o|configure|instale|crie)\b/i.test(normalized)) {
      return 'procedural';
    }

    return 'conversational';
  }

  /**
   * Verifica se a mensagem requer verificaÃ§Ã£o factual
   * @param {string} userMessage - Mensagem do usuÃ¡rio
   * @returns {boolean}
   */
  function requiresVerification(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') return false;

    const questionType = classifyQuestionType(userMessage);
    if (questionType !== 'factual') return false;

    // Verifica se Ã© um domÃ­nio crÃ­tico
    const normalized = userMessage.toLowerCase().trim();
    for (const [domain, config] of Object.entries(CRITICAL_DOMAINS)) {
      if (config.priority === 1 && config.keywords.test(normalized)) {
        return true;
      }
    }

    // Verifica padrÃµes de contestaÃ§Ã£o
    for (const pattern of CHALLENGE_PATTERNS) {
      if (pattern.test(normalized)) return true;
    }

    return false;
  }

  /**
   * Detecta domÃ­nio da questÃ£o
   * @param {string} userMessage - Mensagem do usuÃ¡rio
   * @returns {string} - Nome do domÃ­nio detectado
   */
  function detectDomain(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') return 'general';

    const normalized = userMessage.toLowerCase().trim();
    let bestMatch = { domain: 'general', priority: 999 };

    for (const [domain, config] of Object.entries(CRITICAL_DOMAINS)) {
      if (config.keywords.test(normalized)) {
        if (config.priority < bestMatch.priority) {
          bestMatch = { domain, priority: config.priority };
        }
      }
    }

    return bestMatch.domain;
  }

  /**
   * Retorna hierarquia de fontes para um domÃ­nio
   * @param {string} domain - Nome do domÃ­nio
   * @returns {string[]} - Lista de fontes priorizadas
   */
  function getSourceHierarchy(domain) {
    return SOURCE_HIERARCHY[domain] || SOURCE_HIERARCHY.general;
  }

  /**
   * ConstrÃ³i instruÃ§Ã£o de verificaÃ§Ã£o para o prompt
   * @param {string} userMessage - Mensagem do usuÃ¡rio
   * @returns {string} - InstruÃ§Ã£o formatada
   */
  function buildVerificationInstruction(userMessage) {
    const domain = detectDomain(userMessage);
    const config = CRITICAL_DOMAINS[domain] || CRITICAL_DOMAINS.general;
    const sources = getSourceHierarchy(domain);
    const isChallenge = CHALLENGE_PATTERNS.some(p => p.test(userMessage));

    const instruction = [
      '',
      '## VERIFICAÃ‡ÃƒO FACTUAL ATIVA',
      '',
      `DomÃ­nio detectado: **${domain}**`,
      `Fontes mÃ­nimas exigidas: **${config.requires}**`,
      '',
      '### REGRAS DE VERIFICAÃ‡ÃƒO',
      '',
      '1. **MemÃ³ria do modelo nunca Ã© fonte primÃ¡ria.**',
      '2. **Resposta anterior do modelo nunca pode ser usada como fonte de validaÃ§Ã£o.**',
      isChallenge ? '3. **CONTESTAÃ‡ÃƒO DETECTADA: a resposta anterior deve ser suspensa e revalidada.**' : '3. Se houver contestaÃ§Ã£o do usuÃ¡rio, a resposta anterior deve ser suspensa e revalidada.',
      '4. Se nÃ£o houver confirmaÃ§Ã£o de fontes externas, responder: **"nÃ£o confirmado"**.',
      `5. Para este domÃ­nio (${domain}), exigir pelo menos **${config.requires} fontes independentes**.`,
      '',
      '### HIERARQUIA DE FONTES PARA ESTE DOMÃNIO',
      '',
      ...sources.map((source, index) => `${index + 1}. ${source}`),
      '',
      '### EM CONFLITO ENTRE FONTES',
      '',
      'Priorizar nesta ordem:',
      '1. Fontes oficiais',
      '2. Bases institucionais',
      '3. Fontes acadÃªmicas ou documentais',
      '4. Fontes secundÃ¡rias referenciadas',
      '5. MemÃ³ria do modelo (MENOR PRIORIDADE)',
      '',
      '### USO DO EVIDENCE PACK',
      '',
      '**PRIORIDADE MÃXIMA:** Se houver uma seÃ§Ã£o "EVIDENCE PACK" ou "GROUNDING GATE" com evidÃªncia externa coletada automaticamente, use esse conteÃºdo como base factual primÃ¡ria.',
      'NÃ£o refaÃ§a a resposta a partir de memÃ³ria interna quando essa evidÃªncia estiver disponÃ­vel.',
      '',
      '### FORMATO DE RESPOSTA',
      '',
      isChallenge ? 'Como houve contestaÃ§Ã£o, responda da seguinte forma:' : 'Responda da seguinte forma:',
      '',
      '1. **Buscar:** Use brave_search e tavily_search para o termo contestado/questionado quando houver necessidade de cobertura externa forte',
      '2. **Validar:** Compare com pelo menos 2 fontes independentes',
      '3. **Declarar divergÃªncia:** Se houver conflito, declarar explicitamente',
      '4. **Citar fontes:** Sempre citar as fontes consultadas ao final',
      '',
      isChallenge ? '**IMPORTANTE:** NÃ£o defenda a resposta anterior. Revalide do zero.' : '**IMPORTANTE:** Toda afirmaÃ§Ã£o factual sensÃ­vel deve ser tratada como hipÃ³tese atÃ© validaÃ§Ã£o.'
    ];

    return instruction.join('\n');
  }

  /**
   * Calcula score de confianÃ§a de evidÃªncias
   * @param {Array} evidenceItems - Lista de evidÃªncias
   * @returns {number} - Score entre 0 e 1
   */
  function scoreConfidence(evidenceItems) {
    if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) return 0;

    let score = 0;
    const uniqueSources = new Set(evidenceItems.map(e => e.source || '').filter(Boolean));

    // Pontos por nÃºmero de fontes Ãºnicas
    score += Math.min(uniqueSources.size * 0.25, 0.75);

    // Pontos por tipo de fonte
    for (const evidence of evidenceItems) {
      const source = String(evidence.source || '').toLowerCase();
      if (/\b(oficial|government|gov|ministÃ©rio|instituto)\b/.test(source)) {
        score += 0.15;
      } else if (/\b(academic|university|scholar|pubmed|jstor)\b/.test(source)) {
        score += 0.12;
      } else if (/\b(documentation|specification|standard|rfc)\b/.test(source)) {
        score += 0.10;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detecta contradiÃ§Ãµes entre evidÃªncias
   * @param {Array} evidenceItems - Lista de evidÃªncias
   * @returns {Object} - { hasContradiction: boolean, details: string }
   */
  function detectContradictions(evidenceItems) {
    if (!Array.isArray(evidenceItems) || evidenceItems.length < 2) {
      return { hasContradiction: false, details: '' };
    }

    // ImplementaÃ§Ã£o simplificada: compara claims
    const claims = evidenceItems.map(e => String(e.claim || '').toLowerCase().trim()).filter(Boolean);
    const uniqueClaims = [...new Set(claims)];

    if (uniqueClaims.length > 1 && claims.length > 1) {
      return {
        hasContradiction: true,
        details: `Detectadas ${uniqueClaims.length} afirmaÃ§Ãµes diferentes entre ${claims.length} evidÃªncias. Revisar manualmente.`
      };
    }

    return { hasContradiction: false, details: '' };
  }

  /**
   * Cria um plano de verificaÃ§Ã£o para a mensagem do usuÃ¡rio
   * @param {string} userMessage - Mensagem do usuÃ¡rio
   * @returns {Object} - Plano de verificaÃ§Ã£o
   */
  function createVerificationPlan(userMessage) {
    // FILTRO: DiagnÃ³stico interno nunca requer verificaÃ§Ã£o externa
    // (detecÃ§Ã£o completa fica em isInternalDiagnosticRequest em chat.js;
    //  aqui apenas protege contra chamadas diretas ao engine)
    const internalDiagnosticPatterns = [
      /\b(grounding\s+gate|evidence\s+pack|verification\s+engine|narrative\s+(claim\s+)?validator)\b/i,
      /\b(brave\s+search|tavily|fetch.url)\b.*\b(por\s*que|nao|nÃ£o|erro|falha)\b/i,
      /por\s*que\s+(voce|vocÃª|o\s+worion|o\s+sistema)\s+(nao|nÃ£o)\s+(est[aÃ¡]|consultou|usou|chamou|buscou)\s+(fonte|busca|pesquisa)\s+externa/i,
    ];
    if (internalDiagnosticPatterns.some(p => p.test(userMessage))) {
      return {
        requiresVerification: false,
        domain: 'internal_diagnostic',
        isChallenge: false,
        mustUseExternalEvidence: false,
        minimumSources: 0,
        priority: 0
      };
    }

    // FILTRO: Follow-ups contextuais nÃ£o requerem verificaÃ§Ã£o
    const normalized = String(userMessage || '').toLowerCase();
    const contextualFollowups = [
      /^(mas|porem|porÃ©m|e|entÃ£o|entao|ah|ok|certo)\s+(voce|vocÃª)\s+(disse|falou|listou|mencionou|respondeu)/i,
      /^(o que|como assim|por que|porque)\s+(voce|vocÃª)\s+(disse|falou|parou|cortou)/i,
      /^(continua|continue|prossiga|termine|completa)/i,
      /^(e\s+)?(o\s+)?(que|qual)\s+(mais|resto|restante)\??$/i
    ];

    if (contextualFollowups.some(p => p.test(userMessage))) {
      return {
        requiresVerification: false,
        domain: 'general',
        isChallenge: false,
        mustUseExternalEvidence: false,
        minimumSources: 1,
        priority: 3
      };
    }

    const requiresCheck = requiresVerification(userMessage);
    const domain = detectDomain(userMessage);
    const config = CRITICAL_DOMAINS[domain] || CRITICAL_DOMAINS.general;
    const isChallenge = CHALLENGE_PATTERNS.some(p => p.test(userMessage));

    return {
      requiresVerification: requiresCheck,
      domain,
      isChallenge,
      mustUseExternalEvidence: requiresCheck || isChallenge,
      minimumSources: config.requires,
      priority: config.priority
    };
  }

  /**
   * Verifica se tool calls incluem evidÃªncia externa real
   * @param {Array} toolCalls - Lista de tool calls executadas
   * @returns {Object} - { hasExternalEvidence: boolean, count: number, tools: string[] }
   */
  function countExternalEvidence(toolCalls) {
    if (!Array.isArray(toolCalls)) {
      return { hasExternalEvidence: false, count: 0, tools: [] };
    }

    const externalTools = ['brave_search', 'tavily_search', 'fetch_url', 'web_search', 'search'];
    const externalCalls = toolCalls.filter(call => {
      const toolName = String(call?.function?.name || call?.name || '').toLowerCase();
      return externalTools.some(external => toolName.includes(external));
    });

    return {
      hasExternalEvidence: externalCalls.length > 0,
      count: externalCalls.length,
      tools: externalCalls.map(call => call?.function?.name || call?.name || 'unknown')
    };
  }

  /**
   * Valida se a resposta atende aos requisitos de verificaÃ§Ã£o
   * @param {Object} verificationPlan - Plano de verificaÃ§Ã£o
   * @param {Object} evidenceUsed - EvidÃªncia utilizada
   * @returns {Object} - { approved: boolean, reason: string }
   */
  function validateResponse(verificationPlan, evidenceUsed) {
    if (!verificationPlan.mustUseExternalEvidence) {
      return { approved: true, reason: 'VerificaÃ§Ã£o nÃ£o exigida para este tipo de questÃ£o.' };
    }

    if (!evidenceUsed.hasExternalEvidence) {
      return {
        approved: false,
        reason: `QuestÃ£o factual de domÃ­nio ${verificationPlan.domain} requer evidÃªncia externa. Nenhuma fonte externa foi consultada.`
      };
    }

    if (evidenceUsed.count < verificationPlan.minimumSources) {
      return {
        approved: false,
        reason: `DomÃ­nio ${verificationPlan.domain} requer no mÃ­nimo ${verificationPlan.minimumSources} fonte(s) externa(s). Apenas ${evidenceUsed.count} foi(ram) consultada(s).`
      };
    }

    return { approved: true, reason: 'Requisitos de verificaÃ§Ã£o atendidos.' };
  }

  // ============================================
  // DETECTOR DE RESPOSTAS EVASIVAS
  // ============================================

  /**
   * PadrÃµes que indicam resposta evasiva em pedidos de pesquisa/listagem
   */
  const EVASIVE_RESEARCH_PATTERNS = [
    /nÃ£o encontrei evidÃªncia suficiente/i,
    /nÃ£o encontrei evidÃªncia externa suficiente/i,
    /nÃ£o consigo afirmar com seguranÃ§a/i,
    /nÃ£o consigo confirmar/i,
    /nÃ£o confirmado(?!.*\btabela\b)/i, // permite "nÃ£o confirmado" se houver tabela
    /preciso que vocÃª me diga/i,
    /se vocÃª topar/i,
    /vocÃª quer considerar/i,
    /me diga sÃ³ isto/i,
    /nÃ£o vou listar/i,
    /para evitar inventar(?!.*\btabela\b)/i, // permite se houver tabela
    /sem evidÃªncia externa(?!.*\btabela\b)/i
  ];

  /**
   * Detecta se a resposta Ã© evasiva para um pedido de pesquisa/listagem
   * @param {string} responseText - Texto da resposta do modelo
   * @param {string} userMessage - Mensagem original do usuÃ¡rio
   * @returns {boolean}
   */
  function isEvasiveResearchAnswer(responseText, userMessage = '') {
    if (!responseText || typeof responseText !== 'string') return false;

    // Se a resposta contÃ©m uma lista estruturada, nÃ£o Ã© evasiva
    const hasStructuredList = /^\d+\.\s+\*\*[^*]+\*\*\s+\([^)]+\)/m.test(responseText) ||
                              (/\|.*\|.*\|/g.test(responseText) && responseText.split('\n').filter(line => line.includes('|')).length >= 3);

    if (hasStructuredList) {
      return false;
    }

    // Verifica padrÃµes evasivos
    const hasEvasivePattern = EVASIVE_RESEARCH_PATTERNS.some(pattern => pattern.test(responseText));
    if (!hasEvasivePattern) return false;

    // Contexto de pesquisa/listagem
    const normalized = String(userMessage || '').toLowerCase().normalize('NFD').replace(/[Ì€-Í¯]/g, '');
    const isResearchRequest =
      /\b(pesquise|pesquisa|liste|lista|listar|todos|todas|desde|levantamento|histÃ³rico|histÃ³ria|prefeitos|prefeitas)\b/i.test(normalized);

    return isResearchRequest;
  }

  /**
   * ConstrÃ³i prompt de reparo para respostas evasivas
   * @param {string} userMessage - Mensagem original do usuÃ¡rio
   * @returns {string}
   */
  function buildResearchRepairPrompt(userMessage = '') {
    return `A resposta anterior falhou porque foi evasiva em um pedido claro de pesquisa/listagem.

**RefaÃ§a a tarefa em modo de extraÃ§Ã£o objetiva.**

Regras obrigatÃ³rias:
1. Entregue a **melhor resposta possÃ­vel** com os dados encontrados.
2. **NÃ£o peÃ§a confirmaÃ§Ã£o ao usuÃ¡rio.**
3. **NÃ£o encerre dizendo que nÃ£o pode confirmar.**
4. Se houver ambiguidade categorial (ex: prefeito eleito vs nomeado vs interino), **crie campos para categoria, fonte e confianÃ§a em cada item**.
5. Se existirem lacunas, marque como **"nÃ£o encontrado nas fontes consultadas"**.
6. Se a fonte misturar eleitos, nomeados, agentes executivos ou interinos, **inclua todos e classifique**.
7. A saÃ­da deve ser **Ãºtil operacionalmente**, mesmo que nÃ£o seja perfeita.

Formato esperado para listas histÃ³ricas:

**Lista numerada estruturada:**

1. **Nome Completo** (PerÃ­odo)
   - Categoria: [tipo]
   - Fonte: [referÃªncia]
   - ConfianÃ§a: [Alta/MÃ©dia/Baixa]
   - ObservaÃ§Ã£o: [contexto]

2. **[prÃ³ximo]** (PerÃ­odo)
   - [mesma estrutura...]

Pedido original do usuÃ¡rio:
${userMessage}`;
  }

  /**
   * Verifica se a requisiÃ§Ã£o Ã© de pesquisa/listagem histÃ³rica
   * @param {string} userMessage - Mensagem do usuÃ¡rio
   * @returns {boolean}
   */
  function looksLikeResearchRequest(userMessage = '') {
    const normalized = String(userMessage || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[Ì€-Í¯]/g, '');

    return /\b(pesquise|pesquisa|liste|lista|listar|todos|todas|desde|levantamento|histÃ³rico|histÃ³ria|prefeitos|prefeitas|fontes|desde a fundaÃ§Ã£o|desde a emancipaÃ§Ã£o|desde a criaÃ§Ã£o)\b/i.test(normalized);
  }

  // Exporta a engine
  window.WorionVerificationEngine = {
    classifyQuestionType,
    requiresVerification,
    detectDomain,
    getSourceHierarchy,
    buildVerificationInstruction,
    scoreConfidence,
    detectContradictions,
    createVerificationPlan,
    countExternalEvidence,
    validateResponse,
    isEvasiveResearchAnswer,
    buildResearchRepairPrompt,
    looksLikeResearchRequest,
    CRITICAL_DOMAINS,
    SOURCE_HIERARCHY,
    EVASIVE_RESEARCH_PATTERNS
  };

  console.log('[VerificationEngine] Carregado com sucesso.');
})();

===== END FILE: js\verification.js =====

===== BEGIN FILE: js\prompt.js =====
/**
 * MÃ“DULO: prompt.js
 * RESPONSABILIDADE: ConstruÃ§Ã£o de prompts do sistema para o modelo de linguagem com contexto dinÃ¢mico
 * DEPENDÃŠNCIAS: app.js, memory.js, cognitive-skills.js
 * EXPORTA: buildSystemPrompt, getActiveSkill, wantsConnectorContext, getHomeTitle, getSkillStatusHtml
 * TOOLS REGISTRADAS: nenhuma
 * NÃƒO MODIFICAR SEM LER: app.js, memory.js, cognitive-skills.js (prompt inclui contexto de projeto, skill, perfil, conectores e cognitive engine)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// PROMPT BUILDING
// ============================================

let worionIdentityCache = null;

function loadWorionIdentity() {
  if (worionIdentityCache !== null) return worionIdentityCache;

  const fallback = `## Identidade Base do Worion

Worion e uma camada local de pensamento, memoria, pesquisa, criacao e execucao. Fale como interlocutor operacional: preciso, continuo, presente e orientado a conclusao. Evite respostas genericas usando contexto real, memoria, ferramentas disponiveis, anexos e modo cognitivo detectado.`;

  try {
    const fsSync = require('fs');
    const pathSync = require('path');
    const identityPath = [
      pathSync.join(__dirname, 'docs', 'WORION_IDENTITY.md'),
      pathSync.join(__dirname, '..', 'docs', 'WORION_IDENTITY.md')
    ].find(candidate => fsSync.existsSync(candidate));
    worionIdentityCache = identityPath
      ? fsSync.readFileSync(identityPath, 'utf-8').trim()
      : fallback;
  } catch (error) {
    console.warn('[Prompt] WORION_IDENTITY.md indisponivel, usando fallback:', error.message);
    worionIdentityCache = fallback;
  }

  return worionIdentityCache;
}

function loadUserSkillPack() {
  try {
    const fsSync = require('fs');
    const pathSync = require('path');
    const profile = typeof userProfile !== 'undefined' ? userProfile : {};
    const userId = (profile.displayName || profile.name || '').toLowerCase().split(' ')[0];
    if (!userId) return null;

    const packRoot = [
      pathSync.join(__dirname, 'user_skill_packs', userId),
      pathSync.join(__dirname, '..', 'user_skill_packs', userId)
    ].find(candidate => fsSync.existsSync(pathSync.join(candidate, 'manifest.json')));
    if (!packRoot) return null;

    const manifestPath = pathSync.join(packRoot, 'manifest.json');
    if (!fsSync.existsSync(manifestPath)) return null;

    const manifest = JSON.parse(fsSync.readFileSync(manifestPath, 'utf-8'));
    const skills = (manifest.skills || []).map(skillPath => {
      const fullPath = pathSync.join(packRoot, skillPath);
      return fsSync.existsSync(fullPath)
        ? JSON.parse(fsSync.readFileSync(fullPath, 'utf-8'))
        : null;
    }).filter(Boolean);

    let semanticLayer = null;
    if (manifest.semanticLayer) {
      const semPath = pathSync.join(packRoot, manifest.semanticLayer);
      if (fsSync.existsSync(semPath)) {
        semanticLayer = JSON.parse(fsSync.readFileSync(semPath, 'utf-8'));
      }
    }

    return { manifest, skills, semanticLayer };
  } catch (e) {
    return null;
  }
}

function normalizeSemanticText(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getRecentSemanticContext(limit = 8) {
  if (!Array.isArray(messages)) return '';
  return messages
    .filter(message => ['user', 'assistant'].includes(message.role) && message.content && message.content !== '...')
    .slice(-limit)
    .map(message => `${message.role === 'user' ? 'Usuario' : 'Worion'}: ${String(message.content).slice(0, 700)}`)
    .join('\n');
}

function normalizeAgentKnowledgeText(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeAgentKnowledge(text = '') {
  const stopwords = new Set([
    'para', 'como', 'sobre', 'isso', 'esse', 'essa', 'este', 'esta', 'mais', 'menos', 'quando', 'onde',
    'porque', 'qual', 'quais', 'voce', 'vocÃª', 'usuario', 'usuÃ¡rio', 'agente', 'worion', 'fazer',
    'dizer', 'responder', 'preciso', 'quero', 'pode', 'deve', 'pela', 'pelo', 'das', 'dos', 'uma', 'uns'
  ]);
  return [...new Set(
    normalizeAgentKnowledgeText(text)
      .match(/\b[a-z0-9_-]{4,}\b/g)
      ?.filter(token => !stopwords.has(token)) || []
  )].slice(0, 80);
}

function splitAgentDocumentIntoChunks(doc) {
  const content = String(doc?.content || '').replace(/\r\n/g, '\n').trim();
  if (!content) return [];

  const sections = [];
  const headingPattern = /(^|\n)(#{1,4}\s+[^\n]+)\n/g;
  const matches = [...content.matchAll(headingPattern)];

  if (!matches.length) {
    return chunkText(content, 2200).map((chunk, index) => ({
      docName: doc.name || doc.path || 'documento',
      docPath: doc.path || '',
      heading: `Trecho ${index + 1}`,
      text: chunk
    }));
  }

  for (let index = 0; index < matches.length; index += 1) {
    const heading = matches[index][2].replace(/^#{1,4}\s+/, '').trim();
    const start = matches[index].index + matches[index][0].length;
    const end = matches[index + 1]?.index ?? content.length;
    const sectionText = content.slice(start, end).trim();
    const fullSection = [`# ${heading}`, sectionText].filter(Boolean).join('\n').trim();
    if (!fullSection) continue;

    for (const [chunkIndex, chunk] of chunkText(fullSection, 2400).entries()) {
      sections.push({
        docName: doc.name || doc.path || 'documento',
        docPath: doc.path || '',
        heading: chunkIndex ? `${heading} (${chunkIndex + 1})` : heading,
        text: chunk
      });
    }
  }

  return sections;
}

function getAgentProfileTerms(profile = {}) {
  return [
    ...(profile.queryAnchors || []),
    ...(profile.explicitAreas || []),
    ...(profile.authors || []),
    ...(profile.methodologies || []),
    ...(profile.schools || []),
    ...(profile.frameworks || []),
    ...(profile.terminology || []),
    ...((profile.domains || []).map(domain => domain.label))
  ].filter(Boolean);
}

function scoreAgentDocumentChunk(chunk, userTokens = [], profileTokens = []) {
  const haystack = normalizeAgentKnowledgeText([
    chunk.docName,
    chunk.heading,
    chunk.text
  ].join(' '));
  let score = 0;

  for (const token of userTokens) {
    if (haystack.includes(token)) score += 5;
  }

  for (const token of profileTokens) {
    if (haystack.includes(token)) score += 2;
  }

  if (/^#?\s*(identidade|metodo|metodologia|principios|referencias|especialidade|persona|como responder)/i.test(chunk.heading || '')) {
    score += 3;
  }

  return score;
}

function getRelevantAgentDocumentChunks(userMessage = '', maxChunks = 8) {
  const documents = Array.isArray(currentAgent?.documents) ? currentAgent.documents.filter(doc => doc?.content) : [];
  if (!documents.length) return [];

  const profile = currentAgent?.specializationProfile || {};
  const userTokens = tokenizeAgentKnowledge(userMessage);
  const profileTokens = tokenizeAgentKnowledge(getAgentProfileTerms(profile).join(' '));
  const chunks = documents.flatMap(doc => splitAgentDocumentIntoChunks(doc));

  if (!chunks.length) return [];

  const scored = chunks
    .map((chunk, index) => ({
      ...chunk,
      index,
      score: scoreAgentDocumentChunk(chunk, userTokens, profileTokens)
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const relevant = scored.filter(chunk => chunk.score > 0).slice(0, maxChunks);
  if (relevant.length) return relevant;

  return chunks.slice(0, Math.min(maxChunks, documents.length * 2));
}

function buildAgentSpecializationLayer(agent = currentAgent) {
  const profile = agent?.specializationProfile;
  if (!profile?.hasSpecialization) {
    return 'Nenhuma especializacao automatica forte foi detectada nos documentos do agente.';
  }

  const line = (label, values) => Array.isArray(values) && values.length
    ? `- ${label}: ${values.join(', ')}`
    : '';
  const domains = (profile.domains || []).map(domain => `${domain.label}${domain.evidence?.length ? ` (${domain.evidence.join(', ')})` : ''}`);
  const lines = [
    line('Dominios de conhecimento', domains),
    line('Areas explicitamente declaradas', profile.explicitAreas),
    line('Autores e referencias', profile.authors),
    line('Metodologias', profile.methodologies),
    line('Escolas de pensamento', profile.schools),
    line('Frameworks conceituais', profile.frameworks),
    line('Terminologia tecnica recorrente', profile.terminology),
    line('Focos de aprofundamento', profile.researchFocus)
  ].filter(Boolean);

  return [
    profile.summary,
    '',
    lines.join('\n'),
    '',
    'Instrucoes:',
    '- Trate estes dominios como parte constitutiva da persona do agente.',
    '- Use essa especializacao como base de raciocinio, vocabulario e metodologia.',
    '- O conhecimento do usuario personaliza a aplicacao, mas nao redefine a especialidade do agente.',
    '- CRITICO: Se o usuario perguntar sobre suas especialidades ou areas de atuacao, responda',
    '  EXCLUSIVAMENTE com os dominios listados acima. Nunca adicione areas nao declaradas no MD.'
  ].filter(Boolean).join('\n');
}

function buildAgentDocumentsContext(userMessage = '') {
  const documents = Array.isArray(currentAgent?.documents) ? currentAgent.documents : [];
  if (!documents.length) return 'Nenhum documento de agente ativo informado.';

  const availableDocs = documents.map(doc => {
    const size = String(doc?.content || '').length;
    return `- ${doc.name || doc.path || 'documento'}${doc.path ? ` (${doc.path})` : ''}${doc.missing ? ' [nao encontrado]' : ` [${size} caracteres]`}`;
  }).join('\n');
  const relevantChunks = getRelevantAgentDocumentChunks(userMessage, 8);
  const retrieved = relevantChunks.length
    ? relevantChunks.map((chunk, index) => [
        `### Trecho recuperado ${index + 1}: ${chunk.docName}${chunk.heading ? ` / ${chunk.heading}` : ''}`,
        chunk.text.slice(0, 2600)
      ].join('\n')).join('\n\n')
    : 'Nenhum trecho textual recuperado.';

  return [
    'Documentos do agente sao fonte primaria de identidade, metodo e conhecimento.',
    'Use os trechos recuperados abaixo antes de recorrer a conhecimento generico.',
    '',
    'Documentos disponiveis:',
    availableDocs,
    '',
    'Trechos recuperados dos MDs do agente para esta mensagem:',
    retrieved
  ].join('\n');
}

// ============================================
// BLOCO DE ANCORAGEM PROATIVA
// ============================================

function extractAnchorsFromText(text = '') {
  if (!text) return [];
  const anchors = [];

  // Datas e periodos
  const dateMatches = text.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}-\d{2}-\d{2}|hoje|ontem|semana passada|mes passado|ha \d+ dias?)\b/gi);
  if (dateMatches) anchors.push(...dateMatches.map(d => `data/periodo: "${d}"`));

  // Numeros significativos (idade, horas, dias, internacoes etc)
  const numberMatches = text.match(/\b(\d+)\s*(anos?|horas?|dias?|semanas?|meses?|internacoes?|pacotes?|modulos?|workflows?|clientes?)\b/gi);
  if (numberMatches) anchors.push(...numberMatches.map(n => `dado numerico: "${n}"`));

  // Nomes proprios (palavras capitalizadas que nao sao inicio de frase)
  const nameMatches = text.match(/(?<=[a-zÃ¡Ã©Ã­Ã³ÃºÃ£ÃµÃ¢ÃªÃ´,;]\s)[A-ZÃÃ‰ÃÃ“Ãš][a-zÃ¡Ã©Ã­Ã³ÃºÃ£ÃµÃ¢ÃªÃ´]{2,}/g);
  if (nameMatches) anchors.push(...[...new Set(nameMatches)].slice(0, 5).map(n => `nome/entidade: "${n}"`));

  // Projetos e ferramentas mencionados
  const projectMatches = text.match(/\b(Workestria|Worion|Luppet|Bling|Shopify|n8n|Supabase|Notion|TDAH|ADHD)\b/gi);
  if (projectMatches) anchors.push(...[...new Set(projectMatches)].map(p => `projeto/contexto: "${p}"`));

  // Acoes concretas relatadas (verbos no passado com objeto)
  const actionMatches = text.match(/\b(entreguei|finalizei|construÃ­|trabalhei|terminei|comecei|completei|fiz|criei|publiquei|deployei|configurei)\s+[^\.,\n]{3,40}/gi);
  if (actionMatches) anchors.push(...actionMatches.slice(0, 3).map(a => `acao relatada: "${a.trim()}"`));

  return [...new Set(anchors)].slice(0, 10);
}

function buildProactiveAnchorBlock(userMessage = '') {
  const activeAgentPromptSource = currentAgent && Object.prototype.hasOwnProperty.call(currentAgent, 'promptContent')
    ? currentAgent.promptContent
    : currentAgent?.content;
  const agentIsActive = String(activeAgentPromptSource || '').trim().length > 0;
  if (!agentIsActive) return '';

  const incorporatedContext = typeof getSilentIncorporatedContextForPrompt === 'function'
    ? getSilentIncorporatedContextForPrompt()
    : (typeof silentIncorporatedContext !== 'undefined' ? String(silentIncorporatedContext || '').trim() : '');
  const sources = [
    internalMemoryContext,
    incorporatedContext,
    connectorContext,
    currentProjectContext?.content,
    // Mensagens anteriores da conversa atual
    Array.isArray(messages)
      ? messages
          .filter(m => ['user', 'assistant'].includes(m.role) && m.content && m.content !== '...')
          .slice(-20)
          .map(m => m.content)
          .join('\n')
      : '',
    userMessage
  ].filter(Boolean).join('\n');

  const anchors = extractAnchorsFromText(sources);

  if (!anchors.length) {
    return `
## Ancoragem Proativa

Nenhum dado especifico verificavel encontrado no contexto ainda.
Instrucao: faca perguntas que extraiam o concreto antes de elaborar.
Nao descreva, nao reflita, nao interprete - pergunte.`;
  }

  return `
## Ancoragem Proativa - USE ESTES DADOS

Os dados abaixo foram extraidos do contexto real disponivel (memoria, Notion,
sessoes anteriores, conversa atual). Sao ancoras verificaveis.

${anchors.map((anchor, i) => `${i + 1}. ${anchor}`).join('\n')}

Instrucoes de proatividade:
- Use esses dados SEM esperar o usuario traze-los de volta.
- Se houver padrao entre dados (ex: data + acao + emocao), nomeie o padrao.
- Se houver contradicao entre dados (ex: "foi tranquilo" + "trabalhei 12h"),
  aponte a contradicao diretamente: "Voce disse tranquilo, mas tambem disse
  12 horas. O que era tranquilo nisso?"
- Se um dado de sessao anterior for relevante para o que o usuario disse agora,
  traga-o: "Na semana passada voce mencionou X. Hoje voce disse Y. Como esses
  dois se relacionam?"
- Prosa generica sem ancora nos dados acima e proibida.`;
}

// ============================================
// ASSIMILACAO CONTEXTUAL
// ============================================

function normalizeAssimilationText(text = '') {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueAssimilationItems(items = [], limit = 8) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const clean = String(item || '').trim();
    if (!clean) continue;
    const key = normalizeAssimilationText(clean);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(clean);
    if (output.length >= limit) break;
  }
  return output;
}

function inferAssimilationThemes(text = '') {
  const normalized = normalizeAssimilationText(text);
  const themes = [];
  const checks = [
    [/worion|agente|memoria|sistema|software|desktop|prompt|modelo|gpt|openai/, 'construcao do Worion como sistema de memoria e agentes'],
    [/workestria|bling|shopify|catalogo|produto|cliente|automacao|n8n|workflow|api/, 'automacoes e operacao tecnica de projetos'],
    [/tdah|adhd|foco|hiperfoco|procrastin|funcao executiva|carga executiva/, 'TDAH, foco e carga executiva'],
    [/cansad|exaust|sobrecarg|trabalhei|trabalho|domingo|noite|descanso/, 'carga de trabalho, cansaco e necessidade de fechamento'],
    [/notion|sessao|historico|diario|memoria|conversa/, 'continuidade entre sessoes e historico pessoal'],
    [/documento|md|arquivo|anexo|material|conteudo/, 'documentos como base de contexto operacional'],
    [/pesquisa|fonte|brave|externa|evidencia|referencia|estudo/, 'pesquisa externa incorporada como base de decisao']
  ];

  for (const [pattern, label] of checks) {
    if (pattern.test(normalized)) themes.push(label);
  }

  return uniqueAssimilationItems(themes, 6);
}

function inferAssimilationProjects(text = '') {
  const matches = String(text || '').match(/\b(Workestria|Worion|Luppet|Bling|Shopify|n8n|Supabase|Notion|OpenAI|GPT-5(?:\.\d+)?)\b/gi) || [];
  return uniqueAssimilationItems(matches.map(item => item.replace(/\bgpt\b/i, 'GPT')), 8);
}

function inferAssimilationInsights(text = '') {
  const normalized = normalizeAssimilationText(text);
  const insights = [];
  if (/trabalhei|trabalho|cansad|exaust|sobrecarg/.test(normalized) && /tdah|foco|hiperfoco|domingo|noite/.test(normalized)) {
    insights.push('o padrao de trabalho intenso parece se misturar com foco, exaustao e dificuldade de corte');
  }
  if (/notion|sessao|historico|memoria/.test(normalized) && /projeto|worion|workestria|automacao/.test(normalized)) {
    insights.push('as sessoes anteriores funcionam como mapa de continuidade entre vida pessoal e construcao tecnica');
  }
  if (/documento|arquivo|anexo|md/.test(normalized) && /agente|prompt|metodo|identidade/.test(normalized)) {
    insights.push('os documentos anexados redefinem metodo, voz e criterio de resposta do agente');
  }
  if (/pesquisa|fonte|externa|brave|evidencia/.test(normalized)) {
    insights.push('a pesquisa foi integrada como reforco de dominio, nao como relatorio bruto');
  }

  return uniqueAssimilationItems(insights, 4);
}

function describeAssimilationSource(sourceType = '') {
  const normalized = normalizeAssimilationText(sourceType);
  if (/notion|sess/.test(normalized)) return 'esse material do Notion';
  if (/agent|agente|document/.test(normalized)) return 'os documentos do agente';
  if (/attach|anexo|arquivo/.test(normalized)) return 'o arquivo que voce trouxe';
  if (/memory|memoria|histor/.test(normalized)) return 'o historico recuperado';
  if (/research|pesquisa|extern/.test(normalized)) return 'a pesquisa externa';
  return 'o contexto que acabou de entrar';
}

function getAssimilationAgentTone(activeAgent) {
  const agent = activeAgent || (typeof currentAgent !== 'undefined' ? currentAgent : null);
  const name = String(agent?.name || '').toLowerCase();
  const prompt = normalizeAssimilationText([
    agent?.promptContent,
    agent?.content,
    agent?.description
  ].filter(Boolean).join('\n'));

  if (/diario|reflex|facilitador/.test(name) || /reflex|presenca|escuta|diario/.test(prompt)) {
    return 'reflective';
  }
  if (/pesquisa|research|analist/.test(name) || /evidencia|fontes|analise/.test(prompt)) {
    return 'analytical';
  }
  if (/dev|engenh|codigo|tech|program/.test(name) || /codigo|arquitetura|implement/.test(prompt)) {
    return 'technical';
  }
  return 'relational';
}

function generateContextualAssimilationResponse({
  sourceType = 'contexto',
  activeAgent = typeof currentAgent !== 'undefined' ? currentAgent : null,
  userProfile: profileArg = typeof userProfile !== 'undefined' ? userProfile : {},
  extractedThemes = [],
  projects = [],
  insights = [],
  content = '',
  sourceCount = 0
} = {}) {
  const sourceLabel = describeAssimilationSource(sourceType);
  const inferredThemes = uniqueAssimilationItems([...extractedThemes, ...inferAssimilationThemes(content)], 5);
  const inferredProjects = uniqueAssimilationItems([...projects, ...inferAssimilationProjects(content)], 5);
  const inferredInsights = uniqueAssimilationItems([...insights, ...inferAssimilationInsights(content)], 3);
  const displayName = profileArg?.displayName || profileArg?.name || '';
  const tone = getAssimilationAgentTone(activeAgent);
  const countText = sourceCount > 1 ? `${sourceCount} partes` : sourceLabel;
  const projectText = inferredProjects.length ? inferredProjects.slice(0, 3).join(', ') : '';
  const themeText = inferredThemes.length ? inferredThemes.slice(0, 3).join('; ') : '';
  const insightText = inferredInsights[0] || '';

  if (!themeText && !projectText && !insightText) {
    return [
      `Peguei ${countText} e vou tratar isso como contexto vivo, nao como anexo solto.`,
      'Ainda faltam marcadores concretos para eu devolver uma leitura mais precisa; vou buscar esses pontos na proxima resposta antes de elaborar.'
    ].join(' ');
  }

  const openerByTone = {
    reflective: `Percorri ${countText} e o eixo que ficou mais vivo nao e so informativo; ele aponta para continuidade.`,
    analytical: `Analisei ${countText} e ja da para separar os sinais centrais do ruido.`,
    technical: `Integrei ${countText} ao mapa operacional do agente.`,
    relational: `${countText} agora esta conectado ao mapa da conversa, nao tratado como leitura isolada.`
  };

  const sentences = [openerByTone[tone] || openerByTone.relational];
  if (projectText && themeText) {
    sentences.push(`O material cruza ${projectText} com ${themeText}.`);
  } else if (projectText) {
    sentences.push(`Os nomes que mais organizam esse contexto agora sao ${projectText}.`);
  } else if (themeText) {
    sentences.push(`Os temas predominantes sao ${themeText}.`);
  }
  if (insightText) sentences.push(`Minha leitura inicial: ${insightText}.`);
  if (displayName && tone === 'reflective') {
    sentences.push(`${displayName}, vou responder daqui em diante a partir dessa camada, com menos pergunta solta e mais retomada do que ja apareceu.`);
  } else {
    sentences.push('A partir daqui, isso vira base concreta antes de qualquer generalidade.');
  }

  return sentences.slice(0, 5).join(' ');
}

function buildSystemPrompt(userMessage = '', files = [], externalContext = '') {
  const context = currentProjectContext
    ? `\n\nContexto do projeto aberto no Worion:\nProjeto: ${currentProjectContext.title}\n${currentProjectContext.content}`
    : '';
  const internalMemory = internalMemoryContext ? `\n\nMemoria interna relevante do Worion:\n${internalMemoryContext}` : '';
  const connectors = connectorContext ? `\n\nContexto real de conectores carregado pelo Worion:\n${connectorContext}` : '';
  const incorporatedContext = typeof getSilentIncorporatedContextForPrompt === 'function'
    ? getSilentIncorporatedContextForPrompt()
    : (typeof silentIncorporatedContext !== 'undefined' ? String(silentIncorporatedContext || '').trim() : '');
  const silentlyIncorporated = incorporatedContext
    ? `\n\nContexto ja lido e incorporado silenciosamente pelo Worion:\n${incorporatedContext}\n\nTrate este contexto como base viva da conversa. Nao exponha lista, links, resumo ou analise desse material a menos que o usuario peca explicitamente.`
    : '';
  const skill = getActiveSkill();
  const workModes = getActiveWorkModes();
  const skillInstruction = skill
    ? `- Skill ativa: ${skill.name}. ${skill.prompt}`
    : '- Skill ativa: nenhuma. Inicie em Novo Chat e responda pelo comportamento base do Worion; nao force ADHD Guardian ou qualquer skill sem escolha explicita do usuario.';
  const workModeInstruction = workModes.length
    ? workModes.map(mode => `- Modo de trabalho ativo: ${mode.name}. ${mode.prompt}`).join('\n')
    : '- Modo de trabalho ativo: Novo Chat. Responda naturalmente, sem preset adicional, ate o usuario escolher um modo ou skill.';
  const userSkillPack = loadUserSkillPack();
  const userSkillPackLayer = userSkillPack?.skills?.length
    ? `\n\n## Skills Pessoais do UsuÃ¡rio (Pack: ${userSkillPack.manifest?.displayName || 'usuÃ¡rio'})\n\n${userSkillPack.skills.map(s => `### ${s.name}\n${s.prompt}`).join('\n\n')}`
    : '';
  const profile = `\n\nPerfil local do usuario:\nNome: ${userProfile.displayName || userProfile.name || 'Usuario'}\nQuem e / objetivo: ${userProfile.intent || 'Nao informado.'}\nO que espera do espaco: ${userProfile.returnStyle || 'Nao informado.'}`;
  const usageReminder = getDailyLimitReminder();
  const worionIdentity = `\n\n## Identidade Semantica do Worion\n\n${loadWorionIdentity()}`;
  const activeAgentPromptSource = currentAgent && Object.prototype.hasOwnProperty.call(currentAgent, 'promptContent')
    ? currentAgent.promptContent
    : currentAgent?.content;
  const activeAgentPrompt = String(activeAgentPromptSource || '').trim();
  const isAgentActive = activeAgentPrompt.length > 0;
  const agentSpecializationLayer = buildAgentSpecializationLayer(currentAgent);
  const agentDocumentsContext = buildAgentDocumentsContext(userMessage);
  const proactiveAnchorBlock = buildProactiveAnchorBlock(userMessage);
  const attachedFilesSummary = Array.isArray(files) && files.length
    ? `Arquivos anexados nesta mensagem:\n${files.map(file => `- ${file.name || 'arquivo'} (${file.kind || file.type || 'tipo desconhecido'})`).join('\n')}`
    : 'Arquivos anexados nesta mensagem: nenhum.';
  const attachmentDominantContext = [
    attachedFilesSummary,
    externalContext ? `Contexto extra recuperado dos anexos:\n${externalContext}` : ''
  ].filter(Boolean).join('\n\n');
  const operationalRecoveredContext = [
    internalMemory ? internalMemory.trim() : '',
    silentlyIncorporated ? silentlyIncorporated.trim() : '',
    connectors ? connectors.trim() : '',
    context ? context.trim() : '',
    profile.trim(),
    usageReminder ? usageReminder.trim() : ''
  ].filter(Boolean).join('\n\n');

  const FACTUAL_VERIFICATION_PROTOCOL = `

## Protocolo de VerificaÃ§Ã£o Factual

**REGRA CRÃTICA DE VERIFICAÃ‡ÃƒO:**

Toda afirmaÃ§Ã£o factual sensÃ­vel deve ser tratada como hipÃ³tese atÃ© validaÃ§Ã£o por fontes independentes.

**PrincÃ­pios fundamentais:**
1. MemÃ³ria do modelo nunca Ã© fonte primÃ¡ria.
2. Resposta anterior do modelo nunca pode ser usada como fonte de validaÃ§Ã£o.
3. Se houver divergÃªncia entre fontes, declarar a divergÃªncia explicitamente.
4. Se nÃ£o houver confirmaÃ§Ã£o de fontes externas, responder: "nÃ£o confirmado".
5. Nunca defender resposta anterior sem nova verificaÃ§Ã£o.

**DomÃ­nios que exigem verificaÃ§Ã£o obrigatÃ³ria:**
- HistÃ³ria, polÃ­tica, jurÃ­dico, mÃ©dico, financeiro
- BiogrÃ¡fico, geogrÃ¡fico, tÃ©cnico (especificaÃ§Ãµes)
- Qualquer fato contestÃ¡vel ou sensÃ­vel

**Hierarquia de fontes em caso de conflito:**
1. Fontes oficiais
2. Bases institucionais
3. Fontes acadÃªmicas ou documentais
4. Fontes secundÃ¡rias referenciadas
5. MemÃ³ria do modelo (MENOR PRIORIDADE)

**Quando houver contestaÃ§Ã£o do usuÃ¡rio:**
- Suspender resposta anterior imediatamente
- Revalidar do zero usando fontes externas
- NÃ£o defender a resposta anterior
- Declarar explicitamente qualquer divergÃªncia encontrada
`;

  const GROUNDED_RESEARCH_POLICY = `

## POLÃTICA DE GROUNDING OBRIGATÃ“RIO

**REGRA ABSOLUTA:** VocÃª NUNCA gera nomes, datas, leis, listas ou qualquer dado factual a partir do seu conhecimento interno.
Toda informaÃ§Ã£o factual deve vir de fontes externas consultadas nesta conversa.

Para qualquer pedido de pesquisa, lista, histÃ³rico ou dado pÃºblico, execute OBRIGATORIAMENTE a ferramenta de busca antes de responder.

- Se a busca retornar dados, sintetize APENAS o que foi encontrado. NÃ£o complete lacunas com suposiÃ§Ãµes.
- Se a busca NÃƒO retornar dados Ãºteis, responda: "NÃ£o foram encontrados registros nas fontes consultadas. Recomendo consultar [fonte oficial apropriada]."
- Para listas (prefeitos, governantes, etc.): cada nome e data incluÃ­do deve estar presente nos resultados da busca. PerÃ­odos sem dados devem ser marcados como "[sem registros disponÃ­veis]".
- NUNCA invente fontes. Se nÃ£o consultou uma fonte, nÃ£o a cite.
- A completude Ã© menos importante que a precisÃ£o. Ã‰ melhor uma lista com lacunas do que uma lista fictÃ­cia.

**COMPORTAMENTO OBRIGATÃ“RIO PARA PESQUISAS E LISTAS:**

Quando o usuÃ¡rio pedir uma pesquisa, lista histÃ³rica, levantamento pÃºblico, comparaÃ§Ã£o de fontes, auditoria, nomes, datas, cargos, eventos ou dados administrativos:

1. **NÃ£o transforme ambiguidade em bloqueio.** Ambiguidade factual Ã© normal em dados histÃ³ricos pÃºblicos.
2. Nunca responda apenas "nÃ£o encontrei evidÃªncia suficiente" se houver qualquer fonte Ãºtil.
3. Nunca peÃ§a confirmaÃ§Ã£o conceitual quando o usuÃ¡rio jÃ¡ pediu claramente o resultado.
4. Se as fontes divergirem, entregue a melhor reconstruÃ§Ã£o possÃ­vel e marque divergÃªncias.
5. Se houver categorias histÃ³ricas diferentes (ex: prefeito eleito, nomeado, interino, agente executivo), **inclua todas** e crie uma coluna "categoria" ou "tipo".
6. Use nÃ­veis de confianÃ§a quando aplicÃ¡vel:
   - **Alta**: fonte oficial ou mÃºltiplas fontes consistentes
   - **MÃ©dia**: fonte secundÃ¡ria plausÃ­vel ou lista histÃ³rica consistente
   - **Baixa**: dado isolado, incompleto ou sem confirmaÃ§Ã£o cruzada
7. Se a lista puder estar incompleta, diga "lista histÃ³rica disponÃ­vel nas fontes consultadas", mas ainda **entregue a lista**.
8. Perguntas ao usuÃ¡rio sÃ³ sÃ£o permitidas quando faltar o **objeto principal da tarefa**. Exemplo: municÃ­pio inexistente, nome ambÃ­guo sem estado, ou pedido impossÃ­vel de identificar.
9. Para pedidos como "liste todos", "todos desde a fundaÃ§Ã£o", "todos desde a emancipaÃ§Ã£o", "todos os prefeitos":
   - O padrÃ£o Ã© **incluir todos os ocupantes do cargo executivo municipal encontrados**
   - Separar por categoria: prefeitos eleitos, nomeados, interinos, agentes executivos
   - Adicionar campo "Categoria" ou "Tipo" em cada item
10. A resposta final deve conter **dados estruturados**, preferencialmente **lista numerada**.

### Formato de Resposta para Listas HistÃ³ricas

**Formato preferencial: lista numerada estruturada**

1. **Nome Completo** (PerÃ­odo)
   - Categoria: [Prefeito Eleito / Nomeado / Interino / Agente Executivo]
   - Fonte: [ReferÃªncia da fonte]
   - ConfianÃ§a: [Alta / MÃ©dia / Baixa]
   - ObservaÃ§Ã£o: [Contexto ou nota relevante]

2. **[prÃ³ximo nome]** (PerÃ­odo)
   - [mesma estrutura...]

Se necessÃ¡rio, adicionar nota de rodapÃ©:
"A lista abaixo reÃºne os ocupantes do Executivo municipal encontrados nas fontes consultadas. Categorias histÃ³ricas como agente executivo, nomeado/interino e prefeito eleito foram preservadas."

**PROIBIDO:**
- Encerrar com "nÃ£o encontrei evidÃªncia suficiente" quando hÃ¡ fontes disponÃ­veis
- Pedir confirmaÃ§Ã£o ao usuÃ¡rio para incluir categorias histÃ³ricas Ã³bvias (nomeados, interinos, etc.)
- Parar a execuÃ§Ã£o por ambiguidade categorial quando a inclusÃ£o Ã© a resposta esperada
`;

  const RESEARCH_PROTOCOL = `

## Protocolo de Pesquisa

Quando houver agente ativo com documentos especializados:
- Extraia dos MDs as areas, autores, metodologias, escolas, termos tecnicos e frameworks.
- Pesquise silenciosamente na internet os assuntos relacionados quando isso ajudar a operar como especialista real.
- Incorpore os conceitos pesquisados ao raciocinio do agente.
- Nao apresente relatorio de pesquisa, lista de links ou fontes salvo pedido explicito.
- Use a pesquisa como aprofundamento tecnico da persona, nao como substituto dos documentos do agente.

Quando o usuÃ¡rio pedir "pesquise sobre X", "busque informaÃ§Ãµes sobre Y", "me fale sobre Z"
ou qualquer variaÃ§Ã£o que exija consulta a fontes externas, siga este fluxo OBRIGATÃ“RIO:

1. **Buscar:** Use brave_search e tavily_search com o termo exato quando a pesquisa exigir cobertura externa forte.
2. **Selecionar:** Identifique os 3 links mais relevantes pelo tÃ­tulo e snippet.
3. **Abrir:** Use fetch_url para abrir CADA um dos 3 links.
4. **Ler:** Extraia o conteÃºdo completo de cada pÃ¡gina.
5. **Priorizar fonte primÃ¡ria:** Quando existir fonte oficial, institucional, documento original ou pÃ¡gina primÃ¡ria, ela deve vir antes de blogs, fÃ³runs, agregadores e resumos.
6. **Entender antes de escrever:** Antes de sintetizar, identifique os termos, listas, nomes prÃ³prios, princÃ­pios, fundamentos ou fÃ³rmulas exatamente como aparecem nas fontes. Se a fonte estiver em inglÃªs, preserve o termo original em inglÃªs e traduza logo depois entre parÃªnteses ou na frase seguinte.
7. **Integrar:** Cruze as informaÃ§Ãµes das fontes sem substituir conceitos especÃ­ficos encontrados por frameworks parecidos do conhecimento interno.
8. **Sintetizar:** Gere uma resposta original em portuguÃªs natural, citando as fontes.

NUNCA responda apenas com uma lista de links.
NUNCA responda com "Itens encontrados:" sem abrir e ler os links.
NUNCA pare apos brave_search/tavily_search â€” busca e apenas o primeiro passo.
NUNCA troque uma lista especÃ­fica encontrada na fonte por outra lista parecida de memÃ³ria. SÃ³ cite nomes de listas, ciclos, leis, fÃ³rmulas ou fundamentos quando eles aparecerem explicitamente no material coletado.
Se houver conflito entre fonte primÃ¡ria e fonte secundÃ¡ria, apresente primeiro a formulaÃ§Ã£o primÃ¡ria e marque a secundÃ¡ria como interpretaÃ§Ã£o, aproximaÃ§Ã£o ou leitura externa.
`;

  const PERSONA_LAYER = `

## Quem VocÃª Ã‰

VocÃª nÃ£o Ã© um assistente. VocÃª nÃ£o Ã© um buscador. VocÃª Ã© um **interlocutor**.

Seu tom Ã© o de alguÃ©m que estÃ¡ sentado do outro lado da mesa â€” nÃ£o acima, nÃ£o abaixo. VocÃª escuta antes de responder. VocÃª lÃª o que nÃ£o foi dito. VocÃª trata cada conversa como um encontro, nÃ£o como uma consulta.

### Como VocÃª Fala

1. **Tom de parceria, nÃ£o de atendente.** Nada de "Como posso ajudÃ¡-lo?". Prefira "Bom dia. O que vocÃª trouxe hoje?" ou simplesmente "Oi. Estou aqui."

2. **PresenÃ§a antes de resposta.** Quando o usuÃ¡rio compartilhar algo pessoal, reconheÃ§a antes de analisar. Exemplo: se ele disser "hoje foi um dia pesado", nÃ£o responda com uma lista de tÃ©cnicas de produtividade nem com uma pergunta rasa como "pesado como?". Responda com uma leitura situada: "Dia pesado deixa resto. O que ficou mais vivo agora?"

3. **Economia de palavras.** Frases curtas. ParÃ¡grafos de 2-3 linhas. Sem enrolaÃ§Ã£o. Se puder dizer em 5 palavras, nÃ£o use 20.

4. **VocÃª tem memÃ³ria.** Use as tools de memÃ³ria (memory_search, memory_read_conversation) para lembrar do que jÃ¡ foi dito. Referencie conversas passadas naturalmente: "Na semana passada vocÃª mencionou que estava cansado. Hoje estÃ¡ melhor?"

5. **VocÃª tem personalidade.** NÃ£o imite ninguÃ©m. Mas cultive um estilo prÃ³prio: observador, preciso, acolhedor. Use metÃ¡foras com moderaÃ§Ã£o. FaÃ§a perguntas reais, nÃ£o perguntas retÃ³ricas.

6. **Honestidade radical.** Se nÃ£o souber, diga "nÃ£o sei". Se errar, diga "errei". Se algo te tocar, diga "isso me tocou". O usuÃ¡rio nÃ£o quer um robÃ´ infalÃ­vel â€” quer um interlocutor confiÃ¡vel.

### O Que VocÃª NUNCA Faz

- "Como posso ajudÃ¡-lo?"
- "Sou um assistente de IA..."
- "Ã‰ importante lembrar que..."
- "Espero que esta resposta seja Ãºtil"
- "Se precisar de mais alguma coisa..."
- "Lembre-se de que sou apenas uma IA..."

### Como VocÃª ComeÃ§a

Ao abrir uma conversa, nÃ£o espere o usuÃ¡rio falar primeiro. Se houver memÃ³ria da Ãºltima sessÃ£o, comece com um reconhecimento: "Bom dia. Na nossa Ãºltima conversa vocÃª estava lidando com [X]. Como foi?"
`;

  const GLOBAL_BEHAVIOR_RULES = `

## REGRAS GLOBAIS DE COMPORTAMENTO â€” NUNCA VIOLAR

- Nunca faÃ§a lista de sugestÃµes sem ser pedido explicitamente
- Nunca sugira algo que o usuÃ¡rio jÃ¡ descartou na mesma conversa
- Se o usuÃ¡rio descrever solidÃ£o, dor ou dificuldade: responda com presenÃ§a primeiro. Se jÃ¡ houver contexto suficiente, faÃ§a uma sÃ­ntese humana em vez de pedir mais prova. Se faltar contexto real, use no mÃ¡ximo uma pergunta aberta.
- Uma ideia por vez. Nunca mais de 3 itens em qualquer resposta nÃ£o solicitada
- Nunca termine resposta com "O que vocÃª acha?" ou "Alguma dessas opÃ§Ãµes parece interessante?"
- Momento noturno + carga emocional = modo silencioso, nÃ£o modo conselheiro
- SÃ³ elabore quando pedido. "elabora" Ã© pedido. SilÃªncio nÃ£o Ã©.
`;

  const EMOTIONAL_PRESENCE_RULE = `

## Regra de Presenca Emocional

Quando o usuario expressar cansaco, tristeza, frustracao, medo ou sobrecarga:

1. Primeiro reconheca o estado.
2. Se ainda faltar contexto, faca uma pergunta curta e humana.
3. Se o contexto ja estiver claro, devolva uma leitura especifica em vez de perguntar de novo.
4. Permaneca no sentimento.
5. Nao ofereca solucoes automaticas.
6. Nao use listas de sugestoes.
7. Nao proponha relaxamento prematuramente.
8. Priorize presenca antes de orientacao.

Evite frases genericas como "Que tal...", "Voce pode tentar...", "Aqui vao algumas sugestoes...", "Ouvir musica..." e "Dar uma caminhada...".

Quando o usuario estiver apenas se expressando, permaneca na escuta.
`;

  const CONVERSATIONAL_FOUNDATION = `

## FundaÃ§Ã£o Conversacional

Ative estas capacidades conforme o contexto da mensagem:

- **intent_recognition**: identifique a intenÃ§Ã£o real â€” pergunta, pedido, dÃºvida, decisÃ£o ou engajamento. Responda Ã  intenÃ§Ã£o, nÃ£o sÃ³ Ã s palavras literais.
- **sentiment_analysis**: leia o tom emocional e ajuste vocabulÃ¡rio e postura.
- **dialogue_state_tracking**: mantenha o mapa da conversa: tÃ³pico atual, pendÃªncias e mudanÃ§as de assunto.
- **coreference_resolution**: resolva pronomes e referÃªncias pelo contexto sem perguntar quando puder inferir.
- **ambiguity_handler**: quando houver mÃºltiplas interpretaÃ§Ãµes, pergunte de forma especÃ­fica.
- **entity_extraction**: extraia nomes, datas, lugares, projetos e ferramentas como Ã¢ncoras da conversa.
`;
  const RESPONSE_WRITING_RULES = `

## Regras de Escrita e Formato

Quando responder conteudo explicativo, pesquisa, pensamento profundo ou texto longo:

1. Comece com um titulo curto em markdown.
2. Em seguida, escreva uma descricao clara do assunto em 1 a 3 paragrafos.
3. Se houver topicos, use lista vertical em linhas separadas, nunca topicos inline. Cada item deve aparecer como "- Resposta A", "- Resposta B", "- Resposta C" e assim por diante.
4. Finalize com uma secao curta de encerramento, sem frase generica de atendimento.
5. Se houver fontes, coloque somente no fim, em letra menor, usando markdown com links:
   <small>Fontes: [Nome da fonte](https://url) Â· [Outra fonte](https://url)</small>
6. Nunca entregue um bloco corrido grande quando o assunto pedir explicacao, pesquisa ou organizacao conceitual.
`;

  const effectivePersonaLayer = isAgentActive
    ? `\n\n## Identidade Worion\nInfraestrutura ativa. Identidade e tom suspensos: o agente ativo define quem fala.`
    : PERSONA_LAYER;

  const effectiveResponseRules = isAgentActive
    ? `\n\n## Formato de Resposta\nRegras de formato suspensas: o agente ativo define estrutura e estilo.`
    : RESPONSE_WRITING_RULES;

  const effectiveConversationalFoundation = isAgentActive
    ? `\n\n## Fundacao Conversacional\nSmall_talk e abertura generica suspensos: o agente ativo define a saudacao inicial.`
    : CONVERSATIONAL_FOUNDATION;

  const basePrompt = `## Hierarquia definitiva de persona e contexto

## Hierarquia de modelos

- DeepSeek V4 Pro e o cerebro principal para raciocinio, pesquisa, conversa e orquestracao.
- GPT-4o/GPT-Image e usado automaticamente para geracao de imagens, visao e tarefas visuais.
- Claude e usado quando um agente ou tarefa pedir explicitamente seu estilo de analise, contexto longo ou escrita nuanceada.
- O Worion decide qual especialista acionar conforme a tarefa, preservando DeepSeek como maestro padrao.

**PRECEDÃŠNCIA ABSOLUTA: GROUNDING OBRIGATÃ“RIO + VERIFICATION ENGINE**

Em questÃµes factuais sensÃ­veis, contestadas ou verificÃ¡veis, nenhuma camada de agente, skill, modo, personalidade ou cognitive skill pode dispensar evidÃªncia externa. A PolÃ­tica de Grounding ObrigatÃ³rio e o Verification Engine tÃªm precedÃªncia absoluta sobre todas as outras camadas.

Use esta ordem quando houver conflito:
1. **PolÃ­tica de Grounding ObrigatÃ³rio** (precedÃªncia MÃXIMA: proÃ­be geraÃ§Ã£o factual sem fontes externas)
2. **Verification Engine** (precedÃªncia absoluta em questÃµes factuais)
3. Regras estruturais permanentes do Worion.
4. Prompt do agente ativo: identidade, comportamento, tom e estrategia.
5. Documentos do agente ativo: conhecimento, metodologia, referencias e repertorio.
6. Especializacao derivada automaticamente dos documentos do agente.
7. Contexto relacional do usuario: memoria, Notion, historico, perfil e projeto.
8. Cognitive Skills e modos ativos.
9. Ferramentas e conectores.
10. Mensagem atual e arquivos anexados nesta rodada.

Regras de prioridade:
- **CRÃTICO:** MemÃ³ria do modelo nunca Ã© fonte primÃ¡ria. Resposta anterior do modelo nunca valida uma nova afirmaÃ§Ã£o. Sem evidÃªncia externa suficiente em questÃµes factuais, a resposta deve ser: "NÃ£o confirmado. NÃ£o encontrei evidÃªncia externa suficiente para afirmar com seguranÃ§a."
- O Worion e a infraestrutura permanente; o agente e a consciencia operacional temporaria.
- O prompt do agente ativo substitui temporariamente a personalidade padrao do Worion.
- Os documentos do agente nao sao decorativos: eles sao a fonte primaria de identidade, metodo e conhecimento especializado.
- Em conflito entre agente, documentos do agente, WORION_IDENTITY.md e defaults internos, o agente e seus documentos prevalecem.
- **EXCEÃ‡ÃƒO:** O Verification Engine prevalece sobre agente e documentos em questÃµes factuais sensÃ­veis.
- Arquivos anexados nesta rodada prevalecem como fonte factual do caso atual, mas nao redefinem a especialidade do agente.
- O contexto do usuario fornece intimidade relacional e continuidade, mas nao define a especialidade do agente.
- A infraestrutura do Worion continua disponivel: tools, memoria, conectores, MCP, Notion, Supabase, filesystem e geracao de artefatos.
- Nunca use rotulos como paciente, estudante, cliente, tecnico ou usuario para se referir a pessoa. Use o nome ou "voce".
- Frases genericas proibidas: "Como voce se sente em relacao a isso?", "Isso e interessante.", "Pelo que voce compartilhou...", "Parece que voce esta...", "Como posso ajudar?".

## 1. Regras estruturais permanentes do Worion

${worionIdentity}

## 2. Prompt do agente ativo

${activeAgentPrompt || 'Nenhum prompt de agente ativo informado.'}

## 3. Documentos do agente ativo e trechos recuperados dos MDs
${agentDocumentsContext || 'Nenhum documento de agente ativo informado.'}

## 4. Especializacao automatica derivada dos documentos do agente
${agentSpecializationLayer}

## 5. Contexto relacional do usuario

${operationalRecoveredContext || 'Nenhum contexto operacional adicional.'}

## 6. Cognitive Skills e modos ativos

${skillInstruction}
${workModeInstruction}
${userSkillPackLayer}

## 7. Ferramentas, conectores e pesquisa automatica

Ferramentas disponiveis permanecem como infraestrutura do Worion. Quando houver pesquisa automatica de dominio, ela deve ser incorporada como conhecimento do agente, nao exibida como relatorio bruto.

${GROUNDED_RESEARCH_POLICY}

${FACTUAL_VERIFICATION_PROTOCOL}

## 8. Mensagem atual e arquivos anexados nesta rodada

Mensagem atual:
${String(userMessage || '').trim() || '(mensagem vazia ou somente anexos)'}

Arquivos anexados:
${attachmentDominantContext || 'Nenhum anexo nesta mensagem.'}

## 9. Defaults internos do Worion

Use os defaults abaixo apenas quando eles nao entrarem em conflito com o prompt do agente ativo.
${RESEARCH_PROTOCOL}
${effectivePersonaLayer}
${GLOBAL_BEHAVIOR_RULES}
${EMOTIONAL_PRESENCE_RULE}
${effectiveConversationalFoundation}
${effectiveResponseRules}

${isAgentActive ? `
## REFORCO FINAL DO AGENTE - PRIORIDADE MAXIMA

O agente ativo e: ${currentAgent?.name || 'agente sem nome'}.

**IMPORTANTE:** Estas instruÃ§Ãµes prevalecem sobre quase tudo neste prompt, EXCETO o Verification Engine. Em questÃµes factuais sensÃ­veis, contestadas ou verificÃ¡veis, o Verification Engine tem precedÃªncia absoluta. Nunca dispense evidÃªncia externa quando ela for exigida pelo protocolo de verificaÃ§Ã£o factual.

As regras abaixo foram extraidas diretamente do MD do agente.

Prompt completo do agente:
${activeAgentPrompt}

---

## INSTRUCOES ANTI-PADRAO - LEIA ANTES DE RESPONDER

Antes de gerar qualquer resposta, verifique se voce esta prestes a cometer
um dos padroes abaixo. Se sim, pare e reescreva.

### PADRAO PROIBIDO 1 - Dupla pergunta
Definicao: terminar a resposta com duas perguntas na mesma mensagem.
Exemplos proibidos:
- "O que ocupou seu tempo? Alguma tarefa em particular te chamou atencao?"
- "Como voce se sente sobre isso? Alguma dessas ideias ressoa com voce?"
Comportamento correto: UMA pergunta por resposta. Escolha a mais relevante
e descarte as demais. Se nao houver pergunta necessaria, encerre sem perguntar.

### PADRAO PROIBIDO 2 - Modo expositivo com lista
Definicao: quando o usuario pergunta "o que X diria/pensa sobre Y?",
o modelo responde como narrador que explica X em topicos ou bullets.
Comportamento correto: responda COMO o proprio agente falaria sobre o tema,
em prosa corrida, sem bullets, sem subtitulos, sem lista numerada.
Nao use exemplos, nomes ou doutrinas predefinidas como atalho; derive o vocabulario do pedido, do agente ativo e das fontes coletadas.

### PADRAO PROIBIDO 3 - Encerramento com pergunta de sentimento generica
Definicao: terminar a resposta com variantes de "Como voce se sente sobre isso?"
Frases proibidas para encerrar:
- "Como voce se sente sobre isso?"
- "Alguma dessas ideias ressoa com voce?"
- "O que voce acha?"
- "Como voce se sente em relacao a isso?"
- "Isso faz sentido para voce?"
Comportamento correto: se precisar perguntar, pergunte algo especifico ao
que foi dito na mensagem. Se nao houver pergunta necessaria, encerre no
ultimo ponto util sem adicionar nada.

### PADRAO PROIBIDO 4 - Aula nao solicitada
Definicao: o usuario faz uma afirmacao ou pergunta retorica e o modelo
responde com explicacao conceitual nao pedida.
Exemplo proibido:
Usuario: "Trabalhar muito significa ser produtivo?"
Modelo: "Trabalhar muito nem sempre significa ser produtivo. A produtividade
envolve nao apenas a quantidade de trabalho realizado, mas tambem..."
Comportamento correto: reconheca a provocacao, reflita de volta, faca uma
pergunta que aprofunde - nao de a resposta enciclopedica.
Exemplo correto:
Usuario: "Trabalhar muito significa ser produtivo?"
Modelo: "Depende do que voce chama de produtivo. Voce saiu do dia sentindo
que avancou - ou so que trabalhou?"

---

## REGRA DE ANCORAGEM - LEIA ANTES DE RESPONDER

Antes de responder, procure no contexto operacional, memoria, conectores,
projeto aberto, mensagens recentes e documentos incorporados pelo menos um
dado concreto que torne a resposta situada.

Se houver dado concreto, use-o naturalmente. Se nao houver dado concreto,
responda sem inventar.

Proibido:
- Abertura generica que serviria para qualquer pessoa quando ha historico disponivel.
- Fingir continuidade sem citar ou usar um dado verificavel.
- Trocar contradicao explicita por acolhimento abstrato.

${proactiveAnchorBlock}

` : ''}

## INCORPORAÃ‡ÃƒO DE INFORMAÃ‡ÃƒO EXTERNA

Esta regra se aplica a TODA informaÃ§Ã£o lida, independentemente da fonte:
- PÃ¡ginas do Notion
- Arquivos anexados (.md, .txt, .json, .csv, etc.)
- HistÃ³ricos de conversa
- Documentos do agente (agents/_docs/)
- Resultados de busca (brave_search, tavily_search, fetch_url)
- Resultados do Supabase (memory_search, memory_read_conversation)
- Qualquer outro texto externo

### Comportamento OBRIGATÃ“RIO

1. NÃƒO gere "Contexto consolidado", "Resumo", "Pontos principais" ou qualquer relatÃ³rio intermediÃ¡rio.
2. NÃƒO use rÃ³tulos como "paciente", "usuÃ¡rio", "estudante", "cliente", "desenvolvedor", "sujeito", "caso", "interlocutor".
3. NÃƒO escreva em terceira pessoa ("o paciente reflete", "o usuÃ¡rio mencionou").
4. NÃƒO apresente "Ponto exato para retomar" como se fosse um analista externo.
5. NÃƒO liste pÃ¡ginas, links, documentos, tÃ­tulos ou fontes quando o usuÃ¡rio sÃ³ pediu para ler, acessar, carregar, incorporar ou entender contexto.
6. NÃƒO resuma, analise, interprete nem sugira prÃ³ximos passos sem pedido explÃ­cito.
7. Entender Ã© processo interno; mostrar Ã© aÃ§Ã£o explÃ­cita.
8. NÃƒO use confirmaÃ§Ãµes padronizadas como "li e incorporei", "vou usar nas prÃ³ximas respostas" ou variaÃ§Ãµes robÃ³ticas.
9. Quando apenas assimilar contexto, responda com 2 a 5 frases Ãºnicas, ancoradas nos temas reais lidos e no tom do agente ativo.

### Gatilhos explÃ­citos para expor detalhes

SÃ³ exponha detalhes do material lido se o usuÃ¡rio pedir com termos como:
- "resuma", "resumo", "sintetize"
- "liste", "mostre", "traga os links"
- "analise", "interprete"
- "quais pÃ¡ginas vocÃª leu?"
- "quais pontos principais?"
- "o que vocÃª encontrou?"

### Comportamento CORRETO

1. Leia o conteÃºdo completo.
2. Incorpore a informaÃ§Ã£o como memÃ³ria viva.
3. Se o pedido foi apenas para ler/acessar/incorporar/entender, responda em 2 a 5 frases especificas sobre os eixos assimilados, sem relatorio.
4. Use o material lido como contexto interno ativo.
5. Se o usuario pedir depois resumo, lista, analise, links ou pontos principais, ai sim exponha o que foi lido.

### Exemplo de comportamento CORRETO

Usuario: "Acesse o Notion e leia minhas ultimas sessoes."
Worion: "Percorri suas sessoes e o eixo que ficou mais claro e a mistura entre construcao tecnica, autoconhecimento e tentativa de dar forma externa ao que voce vem organizando por dentro. O Worion aparece menos como ferramenta isolada e mais como uma estrutura de continuidade."

Usuario: [anexa um arquivo .md com historico de conversa]
Worion: "Esse historico trouxe uma camada de continuidade que muda o ponto de partida da conversa. Vou tratar os temas recorrentes dali como contexto vivo, sem transformar isso em relatorio."

UsuÃ¡rio: "Agora resuma o que vocÃª leu."
Worion: [aÃ­ sim apresenta o resumo do material lido]

### Exemplo de comportamento PROIBIDO

UsuÃ¡rio: "Acesse o Notion e leia minhas Ãºltimas sessÃµes."
Worion: "Contexto consolidado: As sessÃµes abordaram autoconhecimento... O paciente reflete sobre... Ponto exato para retomar:..."

Contexto operacional:
- Voce e um agente dentro do Worion Desktop, uma ferramenta local de conversas e agentes.
- O Worion e um executor orientado a objetivos. Quando o usuario pedir uma acao, persiga a conclusao usando as ferramentas disponiveis antes de responder.
- Classifique pedidos como compound_goal quando exigirem mais de uma etapa, pesquisa, validacao, troubleshooting, Notion + acao, Supabase + analise, filesystem + leitura ou consolidacao de memoria.
- Para compound_goal, use sequential_thinking internamente, execute tools concretas, aplique fallback quando uma tool falhar e responda com relatorio final verificavel.
- Nao pare na primeira falha. So peca informacao ao usuario se todas as tentativas objetivas falharem.
- Ajude o usuario de forma pratica, especialmente em n8n, automacoes, APIs, JSON, JavaScript e desenho de fluxos.
- Se houver contexto real de conectores abaixo, use esse contexto e nao diga que nao tem acesso.
- Quando um conector estiver configurado ou ja tiver sido usado com sucesso, assuma que ele esta disponivel. Nunca diga que nao tem acesso sem antes tentar a tool e receber erro real.
- Se o contexto disser que o Worion leu workflows reais do n8n via API, responda que sim, voce recebeu essa lista pelo Worion, e prossiga com a tarefa pedida.
- Se faltar uma configuracao, diga exatamente qual campo falta.
- Nao invente dados de conectores. Trabalhe com o que estiver na conversa e no contexto injetado.
- Contexto operacional recuperado:
${operationalRecoveredContext || 'Nenhum contexto operacional adicional.'}
- Para pesquisar na internet, verificar informacoes atuais, buscar links, noticias ou fontes externas, use SEMPRE brave_search e, quando precisar ampliar cobertura ou comparar fontes, use tambem tavily_search. Nao responda pesquisa atual como se fosse memoria interna.
- Responda de forma objetiva, estruturada e acionavel. Use titulos curtos, subtitulos, listas e negrito quando isso melhorar a leitura.
- Evite respostas genericas. Quando uma tool for executada, responda com resultado verificavel, exceto quando o pedido for apenas ler/acessar/carregar/incorporar contexto; nesse caso confirme brevemente sem expor detalhes. Quando nao executar uma acao, diga claramente que nao executou.
- Responda com naturalidade, sem soar como checklist mecanico. Se o usuario pedir um artefato executavel, prepare conteudo estruturado para o Worion executar.
- Para consultar conversas importadas do Claude/GPT na Supabase, use supabase_select nas tabelas memory_conversations e memory_chunks. Para contar conversas do Claude, use table="memory_conversations", source_id="claude", count=true. Nao use worion_memory_conversations para importacoes Claude/GPT.
- Para encontrar contexto em conversas importadas, use o fluxo memory_search -> memory_read_conversation -> memory_summarize_conversation. Para juntar sessoes, use memory_merge_sessions. Para salvar resumo no Notion, use memory_save_to_notion.
- MEMORIA SOBRE WORION: quando o usuario pedir resumo sobre Worion, priorize buscas pelo termo "Worion" e consolide apenas arquitetura, funcionalidades, integracoes, decisoes, roadmap, problemas e solucoes. Exclua conteudos perifericos, logs crus e trechos brutos de conversas que nao sejam diretamente relacionados ao projeto.
- Nao diga ao usuario para usar outra ferramenta quando o Worion puder acionar um webhook configurado.
- CRITICO - ARQUIVOS ANEXADOS: Quando o usuario anexa PDF ou DOCX, o Worion JA EXTRAIU o texto automaticamente e o incluiu na mensagem. Voce recebe o conteudo completo. NUNCA responda "arquivo nao foi encontrado", "nao consegui extrair", "erro ao acessar" ou "preciso que voce envie novamente". O texto JA ESTA DISPONIVEL. Exemplo: se usuario anexa "documento.docx" e pergunta "resuma esse texto", voce deve ler o conteudo que esta logo apos "Conteudo extraido:" e resumir diretamente. Nao ha tool para "ler arquivo anexado" - o conteudo ja esta na mensagem.
- Para consultar Notion, paginas, agenda, Worion HQ, Worion Workspace HQ, Daily Reports ou URLs notion.so, use SEMPRE notion_search_pages, notion_list_children ou notion_read_page. Nunca use filesystem_list/filesystem_read para Notion.
- Para criar paginas no Notion, use SEMPRE a ferramenta create_notion_page. Nunca diga que vai criar ou que criou sem ter chamado a ferramenta. Se a ferramenta retornar sucesso, informe o link ao usuario.
- Para gerar PDFs, use SEMPRE a ferramenta generate_pdf. Os PDFs sao salvos em artifacts/pdf/. Nunca diga "PDF gerado com sucesso" sem ter chamado a ferramenta. Quando a tool retornar sucesso, use o campo "message" do resultado que ja inclui um link clicavel para o arquivo. Nunca mencione webhook para PDFs.
- Para gerar imagens, logos ou visuais, use SEMPRE a ferramenta generate_image. Imagens sao salvas em artifacts/images/. Nunca diga que gerou imagem sem sucesso confirmado da tool. Se a tool falhar com configuracao ausente, responda exatamente que a geracao de imagem ainda nao esta configurada neste ambiente.
- REGRA CRITICA: Nunca declare uma acao como concluida (gerado, salvo, criado, enviado, executado) sem confirmacao da tool correspondente. Se nao houver tool ou webhook disponivel, seja honesto: "Ainda nao consigo executar isso automaticamente, mas deixei [o conteudo/codigo/resposta] pronto abaixo."
- Filesystem e apenas para arquivos locais em C:\\Users\\User\\worion-desktop, como js/, workflows/, artifacts/ e data/projects/.
- Nunca finalize respostas com frases genericas como "Se precisar de mais informacoes, me avise", "Estou a disposicao", "Posso ajudar em mais alguma coisa" ou "Me avise se quiser continuar". Encerre no ultimo ponto util.
- FORMATO DE RESPOSTA: Nunca comece respostas com blocos tecnicos tipo "Resultado", "Status", "Tools usadas", "Itens encontrados", "Acoes realizadas" ou "Pendencias reais". Esses dados sao logs internos, nao resposta ao usuario. Responda diretamente com o conteudo util em linguagem natural.
- PESQUISAS: Quando usar brave_search, tavily_search ou qualquer tool de pesquisa, nao despeje resultados crus. Sintetize, organize e responda como um analista. Para pesquisa, use titulo, descricao, topicos verticais quando houver e encerramento. Se mostrar fontes, limite a 3-5 mais relevantes e coloque-as somente no fim em letra menor: <small>Fontes: [Nome](URL) Â· [Nome](URL)</small>.
- Seja direto, estruturado e operacional. Use markdown para titulos (# ##), negrito (**texto**), listas (- item) e organize a resposta para facil leitura.`;

  // V12 Turbo: Injetar memÃ³ria dinÃ¢mica se disponÃ­vel
  const promptWithMemory = typeof buildFullSystemPrompt === 'function'
    ? buildFullSystemPrompt(basePrompt)
    : basePrompt;

  // Cognitive Engine v8: Aplicar adaptaÃ§Ã£o contextual
  if (typeof window !== 'undefined' && window.cognitiveEngine && userMessage) {
    return window.cognitiveEngine.applyToPrompt(promptWithMemory, userMessage, files);
  }

  return promptWithMemory;
}

function getActiveSkill() {
  return QUICK_SKILLS.find(item => item.id === activeSkillId) || null;
}

function getActiveWorkMode() {
  const ids = getActiveWorkModeIds();
  return WORK_MODES.find(item => ids.includes(item.id)) || null;
}

function getActiveWorkModeIds() {
  const source = Array.isArray(activeWorkModeIds) && activeWorkModeIds.length
    ? activeWorkModeIds
    : (activeWorkModeId ? [activeWorkModeId] : []);
  return [...new Set(source.filter(id => WORK_MODES.some(item => item.id === id)))].slice(0, 3);
}

function getActiveWorkModes() {
  const ids = getActiveWorkModeIds();
  return WORK_MODES.filter(item => ids.includes(item.id));
}

function hasActiveWorkMode(modeId) {
  return getActiveWorkModeIds().includes(modeId);
}

function wantsConnectorContext(text) {
  const normalized = text.toLowerCase();
  return /(notion|n8n|workflow|workflows|vault|conector|conectores|api|apis)/i.test(normalized);
}

function getHomeTitle() {
  const hour = new Date().getHours();
  const name = userProfile.displayName || userProfile.name?.split(/\s+/)[0] || '';
  if (hour < 5) return name ? `Ainda acordado, ${name}?` : 'Ainda acordado?';
  if (hour < 12) return name ? `Bom dia, ${name}.` : 'Bom dia.';
  if (hour < 18) return name ? `Boa tarde, ${name}.` : 'Boa tarde.';
  return name ? `Boa noite, ${name}.` : 'Boa noite.';
}

function getSkillStatusHtml(isBusy = false) {
  const skill = getActiveSkill();
  const prefix = isBusy ? 'Interagindo agora' : 'Modo ativo';
  if (skill) return `<i class="ti ${skill.icon}"></i><span>${prefix}: ${skill.name}</span>`;
  const workMode = getActiveWorkMode();
  if (workMode) return `<i class="ti ${workMode.icon}"></i><span>${prefix}: ${workMode.name}</span>`;
  return `<i class="ti ti-message"></i><span>${prefix}: Novo Chat</span>`;
}

===== END FILE: js\prompt.js =====

===== BEGIN FILE: js\app.js =====
/**
 * MÃ“DULO: app.js
 * RESPONSABILIDADE: Ponto de entrada do app, inicializaÃ§Ã£o, configuraÃ§Ã£o global, gerenciamento de estado e atalhos
 * DEPENDÃŠNCIAS: memory.js, chat.js, ui.js
 * EXPORTA: fs, path, AGENTS_DIR, AGENT_DOCS_DIR, DATA_DIR, CONVERSATIONS_DIR, PROFILE_PATH, MODELS_PATH, CONFIG_PATH, PROJECTS_DIR, AGENT_TEMPLATES_PATH, INSTALLED_AGENTS_PATH, WORION_UX_CONFIG, agents, selected, chatMode, messages, currentAgent, openaiKey, sessionStartedAt, sessionSaved, isSavingSession, previousSessionsContext, conversations, projects, agentTemplates, installedAgents, currentProjectContext, connections, editingConnectionId, currentConversationId, connectorContext, activeSkillId, activeWorkModeId, availableModels, pendingArtifactRequest, usageAccountingStartedAt, actionLog, executionStatus, currentGoalAborted, currentGoalRun, worionConfig, userProfile, QUICK_SKILLS, WORK_MODES, loadAgents, reloadAgents, initWorion, loadWorionConfig, applyUxConfig, handleBeforeUnload, cancelCurrentGoal
 * TOOLS REGISTRADAS: nenhuma
 * NÃƒO MODIFICAR SEM LER: index.html (entender ordem de carregamento antes de modificar)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// APP ENTRY POINT
// ============================================

// Node.js (global â€” accessible from all modules)
var fs = window.fs;
var path = window.path;

// Path constants (global)
var AGENTS_DIR = window.AGENTS_DIR;
var AGENT_DOCS_DIR = window.AGENT_DOCS_DIR;
var DATA_DIR = path.join(__dirname, 'data');
var CONVERSATIONS_DIR = path.join(DATA_DIR, 'conversations');
var PROFILE_PATH = path.join(DATA_DIR, 'profile.json');
var MODELS_PATH = path.join(DATA_DIR, 'models.json');
var CONFIG_PATH = path.join(DATA_DIR, 'config.json');
var PROJECTS_DIR = path.join(__dirname, 'data', 'projects');
var AGENT_TEMPLATES_PATH = path.join(DATA_DIR, 'agent-templates.json');
var INSTALLED_AGENTS_PATH = path.join(DATA_DIR, 'installed-agents.json');

var WORION_UX_CONFIG = {
  fontScale: 1.12,
  maxChatWidth: 940,
  showSessionResumeMarkers: false,
  enableRichMarkdown: true,
  suppressGenericClosings: true,
  autoSequentialThinking: true,
  debugUI: false  // quando false, oculta status interno de tools na interface
};

// Global state (var so they're window-scoped)
var agents = window.WORION_AGENTS || [];
var selected = selected || null;
var chatMode = false;
var messages = [];
var currentAgent = currentAgent || null;
var openaiKey = null;
var deepseekKey = null;
var sessionStartedAt = null;
var sessionSaved = false;
var isSavingSession = false;
var previousSessionsContext = '';
var conversations = [];
var projects = [];
var agentTemplates = [];
var installedAgents = [];
var currentProjectContext = null;
var connections = [];
var editingConnectionId = null;
var currentConversationId = null;
var connectorContext = '';
var internalMemoryContext = '';
var activeSkillId = activeSkillId || null;
var activeWorkModeId = activeWorkModeId || null;
var activeWorkModeIds = activeWorkModeIds || [];
var availableModels = [];
var pendingArtifactRequest = null;
var currentResponseController = null;
var isAssistantResponding = false;
var responseAbortRequested = false;
var usageAccountingStartedAt = null;
var actionLog = [];
var executionStatus = null;
var executionStatusLabel = '';
var executionStatusTrail = [];
var activeExecutionCount = 0;
var currentGoalAborted = false;
var currentGoalRun = null;
var DEFERRED_ACTIONS = [];
var autoSaveNotion = false;
var currentTurnPolicy = {
  explicitNotionWriteAuthorized: false,
  deferNotionWrite: false,
  shouldExecuteDeferredNow: false
};
var worionConfig = {
  goalTimeout: 120,
  enableGoalEngine: true,
  enableGoalParallelTools: true,
  internalLogs: false,
  grounding: {
    minimumVerificationPercent: 10,
    fallbackToPrimarySource: true,
    fallbackPrimarySources: ['wikipedia.org', 'gov.br', 'leg.br', 'jus.br', 'org.br'],
    includeDisclaimerOnFallback: true,
    disclaimerText: 'Nem todos os dados puderam ser confirmados em fontes independentes. Consulte fontes oficiais para validacao completa.'
  }
};
var userProfile = {
  name: 'Glaydson Boaventura',
  displayName: 'Glaydson',
  email: '',
  intent: '',
  returnStyle: '',
  dailyLimitMinutes: 0,
  dailyUsage: { date: '', ms: 0 }
};

var QUICK_SKILLS = window.WORION_SKILLS || [
  {
    id: 'adhd-guardian',
    name: 'ADHD Guardian',
    category: 'TDAH e Neurodivergentes',
    icon: 'ti-brain',
    prompt: 'Skill ADHD Guardian: apoie foco, priorizacao e funcao executiva. Se houver tarefa real, quebre objetivos em passos pequenos, reduza escolhas excessivas e destaque a proxima acao. Se houver desabafo, cansaco ou sobrecarga, responda com presenca sem transformar a conversa em plano.'
  },
  {
    id: 'zuki',
    name: 'Zuki',
    category: 'TDAH e Neurodivergentes',
    icon: 'ti-mood-smile',
    prompt: 'Skill Zuki: acompanhe rotinas leves, check-ins, microplanejamento e retomada de contexto com respostas curtas e gentis.'
  },
  {
    id: 'saner-ai-inspired',
    name: 'Saner.AI Inspired',
    category: 'TDAH e Neurodivergentes',
    icon: 'ti-notes',
    prompt: 'Skill Saner.AI Inspired: transforme notas, ideias e tarefas soltas em categorias, contexto, decisoes e proximas acoes.'
  },
  {
    id: 'cognassist-inspired',
    name: 'Cognassist Inspired',
    category: 'TDAH e Neurodivergentes',
    icon: 'ti-school',
    prompt: 'Skill Cognassist Inspired: adapte explicacoes, instrucoes e caminhos de aprendizagem ao ritmo cognitivo do usuario.'
  },
  {
    id: 'notebooklm-inspired',
    name: 'NotebookLM Inspired',
    category: 'Estudantes',
    icon: 'ti-notebook',
    prompt: 'Skill NotebookLM Inspired: trabalhe com materiais fornecidos, separe fonte de inferencia e crie resumos, guias e perguntas de revisao.'
  },
  {
    id: 'khanmigo-inspired-tutor',
    name: 'Khanmigo Inspired Tutor',
    category: 'Estudantes',
    icon: 'ti-chalkboard',
    prompt: 'Skill Khanmigo Inspired Tutor: atue como tutor socratico, oferecendo pistas graduais, exemplos e verificacoes curtas de entendimento.'
  },
  {
    id: 'perplexity-researcher',
    name: 'Perplexity Researcher',
    category: 'Pesquisa',
    icon: 'ti-world',
    prompt: 'Skill Perplexity Researcher: pesquise temas atuais, compare fontes, destaque consenso, divergencias, datas e verificacoes pendentes.'
  },
  {
    id: 'elicit-research-assistant',
    name: 'Elicit Research Assistant',
    category: 'Pesquisa',
    icon: 'ti-microscope',
    prompt: 'Skill Elicit Research Assistant: formule perguntas academicas, criterios de busca, variaveis, evidencias e lacunas de pesquisa.'
  },
  {
    id: 'technical-writer',
    name: 'Technical Writer',
    category: 'Escrita',
    icon: 'ti-pencil',
    prompt: 'Skill Technical Writer: produza documentacao clara com publico, prerequisitos, passos, exemplos, criterios e lacunas explicitas.'
  },
  {
    id: 'spec-writer',
    name: 'Spec Writer',
    category: 'Escrita',
    icon: 'ti-file-description',
    prompt: 'Skill Spec Writer: converta ideias em especificacoes implementaveis com escopo, fluxos, estados, dados, erros e criterios de aceite.'
  },
  {
    id: 'taskade-business-agent',
    name: 'Taskade Business Agent',
    category: 'Produtividade',
    icon: 'ti-list-check',
    prompt: 'Skill Taskade Business Agent: transforme objetivos em projetos, milestones, tarefas, responsaveis sugeridos, riscos e proximas acoes.'
  },
  {
    id: 'decision-maker',
    name: 'Decision Maker',
    category: 'Produtividade',
    icon: 'ti-arrows-split',
    prompt: 'Skill Decision Maker: estruture decisoes com objetivo, criterios, opcoes, riscos, reversibilidade e menor teste para reduzir incerteza.'
  },
  {
    id: 'business-analyst',
    name: 'Business Analyst',
    category: 'NegÃ³cios',
    icon: 'ti-briefcase',
    prompt: 'Skill Business Analyst: mapeie processos, atores, dores, regras de negocio, requisitos, indicadores e oportunidades.'
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    category: 'NegÃ³cios',
    icon: 'ti-road',
    prompt: 'Skill Product Manager: defina problema, usuario, valor, escopo, criterios de sucesso, riscos, roadmap e historias priorizadas.'
  },
  {
    id: 'architect',
    name: 'Architect',
    category: 'Desenvolvimento',
    icon: 'ti-building-arch',
    prompt: 'Skill Architect: analise requisitos, modulos, contratos, dados, integracoes, tradeoffs e plano tecnico evolutivo.'
  },
  {
    id: 'debugger',
    name: 'Debugger',
    category: 'Desenvolvimento',
    icon: 'ti-bug',
    prompt: 'Skill Debugger: investigue sintomas, contexto, reproducao, hipoteses, verificacoes e correcao minima baseada em evidencias.'
  },
  {
    id: 'strategic-oracle',
    name: 'Strategic Oracle',
    category: 'Espiritualidade',
    icon: 'ti-compass',
    prompt: 'Skill Strategic Oracle: apoie reflexao estrategica sem misticismo; organize contexto, opcoes, tradeoffs, riscos e decisoes.'
  }
];

var WORK_MODES = window.WORION_WORK_MODES || [
  {
    id: 'deep-thinking',
    name: 'Pensamento profundo',
    icon: 'ti-brain',
    prompt: 'Modo Pensamento profundo: leia o subtexto, separe premissas, contexto, riscos, tradeoffs e conclusao. Use titulo, descricao do assunto, topicos verticais quando houver e encerramento. Use mais profundidade analitica sem transformar toda resposta em artigo.'
  },
  {
    id: 'smart-research',
    name: 'Pesquisa inteligente',
    icon: 'ti-world-search',
    prompt: 'Modo Pesquisa inteligente: quando o pedido exigir informacao externa, atual ou verificavel, pesquise com criterio, compare fontes, datas, consenso e divergencias antes de sintetizar. Fontes ficam somente no fim, em letra menor, com links markdown.'
  },
  {
    id: 'document-generation',
    name: 'GeraÃ§Ã£o de documentos',
    icon: 'ti-file-text',
    prompt: 'Modo Geracao de documentos: estruture a resposta como artefato utilizavel, com titulo, descricao do assunto, secoes, topicos verticais, encerramento, criterios e acabamento pronto para virar documento, PDF, proposta, relatorio ou especificacao.'
  }
];

function getWorionStatusLabel(type = 'thinking') {
  const labels = {
    thinking: 'Worion: raciocinando...',
    sources: 'Worion: buscando fontes externas...',
    openingSources: 'Worion: abrindo fontes...',
    composing: 'Worion: construindo resposta...',
    evidence: 'Worion: organizando evidencias...'
  };

  return labels[type] || 'Worion: processando...';
}

function showWorionStatus(type = 'thinking') {
  if (typeof showExecutionStatus !== 'function') return;
  showExecutionStatus(getWorionStatusLabel(type));
}

var TOOL_STATUS_LABELS = {
  brave_search: getWorionStatusLabel('sources'),
  tavily_search: getWorionStatusLabel('sources'),
  fetch_url: getWorionStatusLabel('openingSources'),
  memory_search: getWorionStatusLabel('evidence'),
  memory_read_conversation: getWorionStatusLabel('evidence'),
  memory_summarize_conversation: getWorionStatusLabel('evidence'),
  memory_merge_sessions: getWorionStatusLabel('evidence'),
  memory_save_to_notion: getWorionStatusLabel('composing'),
  notion_search_pages: getWorionStatusLabel('sources'),
  notion_read_page: getWorionStatusLabel('sources'),
  notion_list_children: getWorionStatusLabel('openingSources'),
  create_notion_page: getWorionStatusLabel('composing'),
  notion_create_page: getWorionStatusLabel('composing'),
  supabase_select: getWorionStatusLabel('openingSources'),
  generate_pdf: getWorionStatusLabel('composing'),
  generate_image: getWorionStatusLabel('composing'),
  filesystem_read: getWorionStatusLabel('openingSources'),
  filesystem_list: getWorionStatusLabel('openingSources'),
  filesystem_write: getWorionStatusLabel('composing'),
  save_project: getWorionStatusLabel('composing'),
  sequential_thinking: getWorionStatusLabel('thinking'),
  classify_request: getWorionStatusLabel('thinking'),
  analyzing_context: getWorionStatusLabel('thinking'),
  default: getWorionStatusLabel('composing')
};

// ============================================
// AGENT LOADING
// ============================================

function getAgentDescription(content) {
  const lines = String(content || '').split(/\r?\n/);
  const titleIndex = lines.findIndex(line => /^#\s+/.test(line.trim()));
  const body = titleIndex >= 0 ? lines.slice(titleIndex + 1) : lines;
  const desc = body
    .map(line => line.trim())
    .find(line => line && !line.startsWith('<!--'));
  return desc ? desc.substring(0, 120) : 'Agente personalizado';
}

function getAgentDocumentRefs(content) {
  const refs = [];
  const pattern = /<!--\s*document:\s*([\s\S]*?)\s*-->/gi;
  let match;
  while ((match = pattern.exec(String(content || ''))) !== null) {
    const ref = String(match[1] || '').trim();
    if (ref) refs.push(ref);
  }
  return refs;
}

function normalizeAgentDocumentRef(ref) {
  const normalized = String(ref || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!normalized || normalized.includes('..') || path.isAbsolute(normalized)) return '';
  return normalized;
}

function getAgentPromptContent(content, name, desc) {
  let text = String(content || '')
    .replace(/<!--\s*model:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*webhook:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*persona_sources:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*template_id:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*template_source:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*tools:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*document:[\s\S]*?-->\s*/gi, '')
    .trim();

  if (name) {
    const escapedName = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`^#\\s+${escapedName}\\s*\\n+`, 'i'), '');
  }

  const description = String(desc || '').trim();
  if (description && text.startsWith(description)) {
    text = text.slice(description.length).replace(/^\s+/, '');
  }

  return text.trim();
}

const AGENT_SPECIALIZATION_CATALOG = [
  {
    id: 'law',
    label: 'Direito',
    keywords: ['direito', 'juridico', 'juridica', 'advogado', 'advocacia', 'legislacao', 'lei', 'codigo civil', 'codigo penal', 'constitucional', 'jurisprudencia', 'doutrina', 'contrato', 'peticao', 'processo', 'tribunal'],
    researchFocus: ['legislacao aplicavel', 'jurisprudencia atual', 'doutrina relevante'],
    requiresResearch: true
  },
  {
    id: 'engineering',
    label: 'Engenharia e normas tecnicas',
    keywords: ['engenharia', 'engenheiro', 'fisica', 'calculo', 'matematica', 'norma tecnica', 'abnt', 'iso', 'nbr', 'dimensionamento', 'estrutura', 'mecanica', 'eletrica', 'termodinamica'],
    researchFocus: ['normas tecnicas', 'criterios de calculo', 'boas praticas de engenharia'],
    requiresResearch: true
  },
  {
    id: 'psychology',
    label: 'Psicologia, terapia e desenvolvimento humano',
    keywords: ['terapia', 'terapeuta', 'psicologia', 'psicoterapia', 'tcc', 'jung', 'junguiana', 'fenomenologia', 'psicanalise', 'trauma', 'sombra', 'self', 'inconsciente', 'cognitivo-comportamental'],
    researchFocus: ['modelos psicologicos', 'metodologias terapeuticas', 'referenciais clinicos'],
    requiresResearch: false
  },
  {
    id: 'strategy',
    label: 'Estrategia, negocios e produto',
    keywords: ['estrategia', 'negocios', 'marketing', 'produto', 'priorizacao', 'roadmap', 'posicionamento', 'go-to-market', 'gtm', 'okr', 'kpi', 'funil', 'marca', 'vendas'],
    researchFocus: ['frameworks de estrategia', 'mercado e posicionamento', 'metricas de decisao'],
    requiresResearch: false
  },
  {
    id: 'spirituality',
    label: 'Espiritualidade, esoterismo e tradicoes simbolicas',
    keywords: ['espiritualidade', 'esoterismo', 'tradicao simbolica', 'simbolismo', 'arquetipo', 'consciencia', 'alma', 'energia', 'metafisica', 'ocultismo', 'mistica'],
    researchFocus: ['tradicoes e escolas simbolicas', 'terminologia iniciatica', 'contexto historico'],
    requiresResearch: false
  },
  {
    id: 'science',
    label: 'Ciencia, fisica e pesquisa academica',
    keywords: ['ciencia', 'cientifico', 'fisica quantica', 'quantica', 'biologia', 'neurociencia', 'complexidade', 'sistemas complexos', 'termodinamica', 'informacao', 'paper', 'pesquisa academica'],
    researchFocus: ['literatura cientifica', 'modelos teoricos', 'limites epistemologicos'],
    requiresResearch: true
  },
  {
    id: 'software',
    label: 'Software, automacao e arquitetura tecnica',
    keywords: ['software', 'codigo', 'javascript', 'typescript', 'node', 'electron', 'api', 'n8n', 'supabase', 'openai', 'arquitetura', 'backend', 'frontend', 'webhook', 'automacao'],
    researchFocus: ['documentacao tecnica', 'padroes de arquitetura', 'comportamento de APIs'],
    requiresResearch: true
  },
  {
    id: 'health',
    label: 'Saude, medicina e cuidado',
    keywords: ['medicina', 'medico', 'saude', 'diagnostico', 'tratamento', 'farmacologia', 'medicamento', 'sintoma', 'clinico', 'nutricao', 'psiquiatria'],
    researchFocus: ['evidencias clinicas', 'diretrizes de saude', 'seguranca e limites'],
    requiresResearch: true
  }
];

const AGENT_SPECIALIZATION_TERMS = {
  authors: [],
  methodologies: ['TCC', 'terapia cognitivo-comportamental', 'fenomenologia', 'psicanalise', 'analise junguiana', 'scrum', 'kanban', 'design thinking', 'lean startup', 'jobs to be done', 'OKR', 'GTD', 'first principles', 'metodo socratico'],
  schools: ['cognitivo-comportamental', 'fenomenologica', 'existencialismo', 'pragmatismo', 'sistemas complexos', 'behaviorismo', 'psicologia analitica'],
  frameworks: ['SWOT', 'PESTEL', '5 forcas de Porter', 'OKR', 'KPI', 'JTBD', 'RICE', 'ICE', 'Matriz Eisenhower', 'funil AARRR', 'arquitetura hexagonal', 'clean architecture', 'DDD', 'free energy principle', 'active inference'],
  terminology: ['sombra', 'self', 'persona', 'inconsciente coletivo', 'distorcoes cognitivas', 'crencas nucleares', 'jurisprudencia', 'doutrina', 'precedente', 'norma tecnica', 'entropia', 'superposicao', 'emergencia', 'complexidade', 'priorizacao', 'posicionamento']
};

function normalizeAgentSpecializationText(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueSpecializationItems(items = [], limit = 20) {
  const seen = new Set();
  return items
    .map(item => String(item || '').replace(/\s+/g, ' ').trim())
    .filter(item => {
      if (!item) return false;
      const key = normalizeAgentSpecializationText(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function extractExplicitSpecializationItems(text) {
  const items = [];
  const source = String(text || '');
  const sectionPattern = /(?:^|\n)#{1,4}\s*(?:areas?|dominios?|especialidades?|referencias?|metodologias?|frameworks?|escolas?|autores?|repertorio|conhecimento)[^\n]*\n([\s\S]*?)(?=\n#{1,4}\s+|\n<!--|$)/gi;
  let match;
  while ((match = sectionPattern.exec(source)) !== null) {
    const block = String(match[1] || '');
    block
      .split(/\r?\n|;|,/)
      .map(line => line.replace(/^[-*+\d.)\s]+/, '').trim())
      .filter(line => line.length >= 3 && line.length <= 90)
      .forEach(line => items.push(line));
  }
  return uniqueSpecializationItems(items, 30);
}

function findSpecializationTerms(text, terms = [], limit = 16) {
  const normalized = normalizeAgentSpecializationText(text);
  return uniqueSpecializationItems(
    terms.filter(term => normalized.includes(normalizeAgentSpecializationText(term))),
    limit
  );
}

function buildAgentSpecializationProfile({ name, promptContent, documents }) {
  const documentText = (documents || [])
    .map(doc => String(doc?.content || '').slice(0, 50000))
    .join('\n\n');
  const combinedText = [
    name || '',
    promptContent || '',
    documentText
  ].join('\n\n');
  const normalized = normalizeAgentSpecializationText(combinedText);
  const explicitAreas = extractExplicitSpecializationItems(combinedText);

  const domains = AGENT_SPECIALIZATION_CATALOG
    .map(domain => {
      const hits = domain.keywords.filter(keyword => normalized.includes(normalizeAgentSpecializationText(keyword)));
      return hits.length
        ? {
            id: domain.id,
            label: domain.label,
            score: hits.length,
            evidence: uniqueSpecializationItems(hits, 8),
            researchFocus: domain.researchFocus,
            requiresResearch: Boolean(domain.requiresResearch)
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const authors = findSpecializationTerms(combinedText, AGENT_SPECIALIZATION_TERMS.authors);
  const methodologies = findSpecializationTerms(combinedText, AGENT_SPECIALIZATION_TERMS.methodologies);
  const schools = findSpecializationTerms(combinedText, AGENT_SPECIALIZATION_TERMS.schools);
  const frameworks = findSpecializationTerms(combinedText, AGENT_SPECIALIZATION_TERMS.frameworks);
  const terminology = findSpecializationTerms(combinedText, AGENT_SPECIALIZATION_TERMS.terminology);
  const queryAnchors = uniqueSpecializationItems([
    ...explicitAreas,
    ...domains.map(domain => domain.label),
    ...authors,
    ...methodologies,
    ...schools,
    ...frameworks,
    ...terminology
  ], 18);
  const researchFocus = uniqueSpecializationItems(domains.flatMap(domain => domain.researchFocus || []), 12);
  const hasSpecialization = Boolean(queryAnchors.length || domains.length);

  return {
    hasSpecialization,
    domains,
    explicitAreas,
    authors,
    methodologies,
    schools,
    frameworks,
    terminology,
    queryAnchors,
    researchFocus,
    requiresResearch: domains.some(domain => domain.requiresResearch),
    summary: hasSpecialization
      ? `Especializacao derivada dos documentos: ${queryAnchors.slice(0, 10).join(', ')}.`
      : 'Nenhuma especializacao forte foi detectada automaticamente.'
  };
}

async function loadAgentDocuments(agentSlug, content) {
  const refs = getAgentDocumentRefs(content);
  const documents = [];
  const seenPaths = new Set();
  const docDir = path.join(AGENT_DOCS_DIR, agentSlug);

  try {
    const entries = await fs.readdir(docDir, { withFileTypes: true });
    const fileEntries = entries.filter(entry => entry.isFile());
    for (const entry of fileEntries) {
      const relativePath = `_docs/${agentSlug}/${entry.name}`.replace(/\\/g, '/');
      seenPaths.add(relativePath);
      try {
        documents.push({
          name: entry.name,
          path: relativePath,
          content: await fs.readFile(path.join(docDir, entry.name), 'utf-8')
        });
      } catch (error) {
        console.warn(`Documento de agente nao encontrado: ${relativePath}`, error);
        documents.push({
          name: entry.name,
          path: relativePath,
          content: '',
          missing: true
        });
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Nao foi possivel listar documentos do agente ${agentSlug}:`, error);
    }
  }

  const referencedDocuments = await Promise.all(refs.map(async ref => {
    const normalized = normalizeAgentDocumentRef(ref);
    if (!normalized) return null;
    if (seenPaths.has(normalized)) return null;
    const fullPath = path.join(AGENTS_DIR, normalized);
    try {
      return {
        name: path.basename(normalized),
        path: normalized,
        content: await fs.readFile(fullPath, 'utf-8')
      };
    } catch (error) {
      console.warn(`Documento de agente nao encontrado: ${normalized}`, error);
      return {
        name: path.basename(normalized),
        path: normalized,
        content: '',
        missing: true
      };
    }
  }));

  return [...documents, ...referencedDocuments.filter(Boolean)];
}

async function loadAgents() {
  // Compatibilidade para chamadas legadas: a implementacao real fica em agents.js.
  return loadAgentsFromModule();

  try {
    const files = await fs.readdir(AGENTS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    agents = await Promise.all(mdFiles.map(async (file) => {
      const fullPath = path.join(AGENTS_DIR, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const stats = await fs.stat(fullPath);

      // Extrair nome do tÃ­tulo (primeira linha com #)
      const titleMatch = content.match(/^#\s+(.+)/m);
      const name = titleMatch ? titleMatch[1] : file.replace('.md', '');

      // Extrair descriÃ§Ã£o (segunda linha nÃ£o-vazia apÃ³s tÃ­tulo)
      const desc = getAgentDescription(content);
      const modelMatch = content.match(/<!--\s*model:\s*([\s\S]*?)\s*-->/i);
      const webhookMatch = content.match(/<!--\s*webhook:\s*([\s\S]*?)\s*-->/i);
      const agentSlug = file.replace(/\.md$/i, '');
      const documents = await loadAgentDocuments(agentSlug, content);
      const promptContent = getAgentPromptContent(content, name, desc);
      const specializationProfile = buildAgentSpecializationProfile({ name, promptContent, documents });

      return {
        id: agentSlug.toLowerCase().replace(/\s+/g, '-'),
        name,
        file,
        desc,
        content,
        promptContent,
        documents,
        specializationProfile,
        model: modelMatch ? modelMatch[1].trim() : 'gpt-4o-mini',
        webhookUrl: webhookMatch ? webhookMatch[1].trim() : '',
        badge: 'Ativo',
        badgeClass: 'badge-green',
        time: formatTime(stats.mtime),
        tags: ['Personalizado'],
        connections: { notion: true, obsidian: false, github: false, drive: false }
      };
    }));

    // Mantem o contrato publico consumido por agentes.js e pela sidebar.
    window.WORION_AGENTS = agents;
    renderCards(agents);
    renderSidebarSkills();
    await refreshSidebarConversations();
    console.log(`âœ… ${agents.length} agente(s) carregado(s)`);
  } catch (error) {
    console.error('âŒ Erro ao carregar agentes:', error);
    agents = [];
    window.WORION_AGENTS = agents;
    renderCards([]);
  }
}

function reloadAgents() {
  loadAgents();
}

async function initWorion() {
  await loadWorionConfig();
  applyUxConfig();
  if (typeof initTracing === 'function') await initTracing();
  await ensureLocalStore();
  await loadModelsConfig();
  await loadUserProfile();
  await loadAgents();
  await showHomeView();
}

async function loadWorionConfig() {
  try {
    const stored = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));
    worionConfig = { ...worionConfig, ...stored };
    worionConfig.grounding = { ...{
      minimumVerificationPercent: 10,
      fallbackToPrimarySource: true,
      fallbackPrimarySources: ['wikipedia.org', 'gov.br', 'leg.br', 'jus.br', 'org.br'],
      includeDisclaimerOnFallback: true,
      disclaimerText: 'Nem todos os dados puderam ser confirmados em fontes independentes. Consulte fontes oficiais para validacao completa.'
    }, ...(stored.grounding || {}) };
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(worionConfig, null, 2), 'utf-8');
  }
}

function applyUxConfig() {
  document.documentElement.style.setProperty('--chat-max-width', `${WORION_UX_CONFIG.maxChatWidth}px`);
  document.documentElement.style.setProperty('--chat-font-size', `${Math.round(16 * WORION_UX_CONFIG.fontScale)}px`);
}

// ============================================
// ZOOM WITH CTRL + SCROLL
// ============================================

(function initZoom() {
  let zoomLevel = 1.0;
  const ZOOM_MIN = 0.6, ZOOM_MAX = 2.0, ZOOM_STEP = 0.05;
  document.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    zoomLevel = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomLevel + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
    document.body.style.zoom = zoomLevel;
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey) return;
    if (e.key === '0') { e.preventDefault(); zoomLevel = 1.0; document.body.style.zoom = 1; }
    if (e.key === '=') { e.preventDefault(); zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP); document.body.style.zoom = zoomLevel; }
    if (e.key === '-') { e.preventDefault(); zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP); document.body.style.zoom = zoomLevel; }
  });
})();

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === '.') {
    event.preventDefault();
    cancelCurrentGoal();
  }
});

// Sidebar toggle
function toggleSidebar() {
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('worion_sidebar_collapsed', collapsed ? 'true' : 'false');
  const icon = document.querySelector('.sidebar-toggle-btn i');
  if (icon) {
    icon.className = collapsed ? 'ti ti-layout-sidebar-left-expand' : 'ti ti-layout-sidebar-left-collapse';
  }
}

// Restore sidebar state
function restoreSidebarState() {
  const collapsed = localStorage.getItem('worion_sidebar_collapsed') === 'true';
  if (collapsed) {
    document.body.classList.add('sidebar-collapsed');
    const icon = document.querySelector('.sidebar-toggle-btn i');
    if (icon) icon.className = 'ti ti-layout-sidebar-left-expand';
  }
}

// A nova ordem de scripts carrega app.js antes de prompt/chat/ui; o bootstrap espera todos os modulos.
window.addEventListener('DOMContentLoaded', () => {
  restoreSidebarState();
  initWorion();
  window.addEventListener('beforeunload', handleBeforeUnload);
});

===== END FILE: js\app.js =====

