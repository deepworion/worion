/**
 * MODULO: chat-routing.js
 * RESPONSABILIDADE: rotas de execucao, perfis, orcamento de tokens e filtragem de tools por perfil.
 * REGRA CENTRAL: o roteador reconhece intencao; ele nao conhece assuntos concretos.
 *
 * FUNCOES DE DETECCAO:
 * - isDefinitionQuestion(): Detecta perguntas definicionais ("O que é X?", "O que significa Y?")
 * - isOpinionQuestion(): Detecta perguntas de opinião (não requer pesquisa externa)
 * - isSilence(): Detecta mensagens vazias ou apenas pontuação
 * - askForClarification(): Gera mensagem pedindo esclarecimento sobre termos desconhecidos
 *
 * PERFIS DE EXECUCAO:
 * - definition: Perguntas definicionais - responde sem busca, apenas conhecimento geral
 * - opinion: Perguntas de opinião - responde sem busca
 * - silence: Mensagens vazias - resposta curta de presença
 * - focused_research, comparative_research, deep_research: Pesquisas com verificação de relevância
 */

function normalizeRouteText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyQuestionScope(text = '', context = {}) {
  const normalized = normalizeRouteText(text);
  const files = Array.isArray(context.files)
    ? context.files
    : (Array.isArray(context.attachments) ? context.attachments : []);

  const hasUploadedFiles = files.length > 0;
  const activeAgent = context.activeAgent || null;
  const hasActiveAgent = Boolean(activeAgent);
  const hasNotionLink = /https?:\/\/(?:www\.)?(?:notion\.so|app\.notion\.com|[\w-]+\.notion\.site)\/\S+/i.test(String(text || ''));
  const hasUploadedAgentDocs = Array.isArray(activeAgent?.documents) && activeAgent.documents.length > 0;
  const mentionsUploadedFile =
    /\b(arquivo|arquivos|anexo|anexos|anexado|anexada|pdf|docx|planilha|csv|imagem enviada|arquivo enviado|upload|uploads)\b/.test(normalized);

  const hasPrivateConnectorRef =
    /\b(notion|google drive|drive|gmail|calendar|agenda|docs|documentos|pagina privada|minhas sessoes|minhas conversas|minha memoria|meu historico|meus arquivos|meus projetos)\b/.test(normalized);

  const asksExplicitPrivateRead =
    /\b(com base no que voce sabe sobre mim|leia meus registros|o que minhas memorias dizem|analise meu historico|analise meus padroes|minhas memorias|minha memoria|meus registros|meu historico)\b/.test(normalized);

  // Perguntas sobre identidade/papel DO AGENTE devem ser respondidas pela persona, não pelos memory cards
  const asksAgentIdentity =
    /\bqual.*seu papel\b/.test(normalized) ||
    /\bqual.*sua funcao\b/.test(normalized) ||
    /\bo que voce faz\b/.test(normalized) ||
    /\bqual.*sua especialidade\b/.test(normalized) ||
    /\bqual.*seu proposito\b/.test(normalized);

  const isSelfReferential =
    /\bquem sou eu\b/.test(normalized) ||
    /\bo que eu sou\b/.test(normalized) ||
    /\bquem eu sou\b/.test(normalized) ||
    /\bo que voce sabe sobre mim\b/.test(normalized) ||
    /\bme descreva\b/.test(normalized) ||
    /\bme defina\b/.test(normalized) ||
    /\bqual meu perfil\b/.test(normalized) ||
    /\bminha historia\b/.test(normalized) ||
    /\bmeus padroes\b/.test(normalized) ||
    /\bmeu estado de ser\b/.test(normalized) ||
    /\bsobre mim\b/.test(normalized) ||
    /\bcom base em mim\b/.test(normalized) ||
    /\bvoce tem acesso\b/.test(normalized) ||
    /\bvoce consegue\b/.test(normalized) ||
    /\bvoce sabe\b/.test(normalized) ||
    /\bcomo voce funciona\b/.test(normalized) ||
    /\bsua memoria\b/.test(normalized) ||
    /\bseu sistema\b/.test(normalized) ||
    /\bvoce e um\b/.test(normalized) ||
    /\bquem e voce\b/.test(normalized) ||
    /\bquem voce e\b/.test(normalized);

  const isPrivateProjectRef =
    /\bmeu projeto\b/.test(normalized) ||
    /\bminha empresa\b/.test(normalized) ||
    /\bminha loja\b/.test(normalized) ||
    /\bmeu sistema\b/.test(normalized) ||
    /\bnosso projeto\b/.test(normalized);

  const asksPublicResearch =
    /\bpesquise na internet\b/.test(normalized) ||
    /\bbusque na web\b/.test(normalized) ||
    /\bpesquise na web\b/.test(normalized) ||
    /\bfontes externas\b/.test(normalized) ||
    /\bfontes publicas\b/.test(normalized) ||
    /\bfontes confiaveis\b/.test(normalized) ||
    /\bpesquise fontes\b/.test(normalized) ||
    /\bbusque fontes\b/.test(normalized) ||
    /\bnoticias\b/.test(normalized) ||
    /\bpreco atual\b/.test(normalized) ||
    /\bprecos atuais\b/.test(normalized) ||
    /\bquanto custa\b/.test(normalized) ||
    /\blei atual\b/.test(normalized) ||
    /\bleis atuais\b/.test(normalized) ||
    /\bcargo atual\b/.test(normalized) ||
    /\bdados oficiais publicos\b/.test(normalized) ||
    /\b(verifique|confirme|comprove)\b/.test(normalized);

  // Se há agente ativo E pergunta sobre identidade/papel → resposta direta do agente (conversation_or_general)
  if (hasActiveAgent && asksAgentIdentity) return 'conversation_or_general';

  if (hasActiveAgent && hasNotionLink) return 'private_connector_context';
  if (hasActiveAgent && hasUploadedAgentDocs && asksExplicitPrivateRead) return 'private_agent_context';
  if (hasUploadedFiles || mentionsUploadedFile) return 'uploaded_file_context';
  if (hasPrivateConnectorRef) return 'private_connector_context';
  if (isSelfReferential) return 'private_memory_context';
  if (isPrivateProjectRef || context.currentProjectContext) return 'private_project_context';
  if (asksPublicResearch) return 'public_research';

  return 'conversation_or_general';
}

function isPrivateQuestionScope(scope = '') {
  return String(scope || '').startsWith('private_') || scope === 'uploaded_file_context';
}

function isImmediateFeedback(input) {
  const text = normalizeRouteText(input);

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
    /voce entendeu errado/
  ].some((pattern) => pattern.test(text));
}

function hasExternalKnowledgeIntent(plain = '') {
  return /\b(quem|qual|quais|quando|onde|por que|porque|como|de onde|existe|tem|houve|havia|foi|sao|eram)\b/i.test(plain)
    || /\b(origem|significado|historia|historico|curiosidades?|lista|relacao|nomes|dados|informacoes|fatos|fontes?|referencias?|registro|documento|evidencia)\b/i.test(plain)
    || /\b(me conte|me conta|conte|conta|fale sobre|me fale sobre|explique sobre|descreva|relate|traga|liste|pesquise|busque|procure)\b/i.test(plain);
}

function isLooseFollowUpText(plain = '') {
  return /^(e|e ai|e agora|sim|isso|me conta|conta|conte|pode contar|cade|cade a resposta|cade a lista|qual e|quais sao|mostra|mostre|manda|traz|continue|continua|resultado|resposta)[\s.!?]*$/i.test(plain)
    || /\b(cade|faltou|lista|resultado|resposta|continua|continue|me conta|pode contar)\b/i.test(plain);
}

function getLastResearchableUserMessage(contextMessages = []) {
  if (!Array.isArray(contextMessages)) return '';
  return contextMessages
    .filter(message => message?.role === 'user')
    .map(message => String(message.content || '').trim())
    .filter(Boolean)
    .reverse()
    .find(message => hasExternalKnowledgeIntent(normalizeRouteText(message))) || '';
}

function isFactualResearchFollowUp(plain = '', contextMessages = []) {
  return isLooseFollowUpText(plain) && Boolean(getLastResearchableUserMessage(contextMessages));
}

/**
 * Divide uma pergunta com multiplos temas em sub-consultas independentes.
 * Separa por " e ", " and ", vírgulas e conectores comparativos.
 * @param {string} text - Texto a dividir
 * @returns {string[]} - Array de segmentos/tópicos extraídos
 */
function splitTopics(text) {
  if (!text) return [];
  // separa por " e " (português), " and " (inglês), vírgulas e conectores comparativos
  const parts = String(text).split(/\s*(?:,| e | and | versus | vs\.?)\s*/i).map(p => p.trim());
  // filtra itens vazios e muito curtos
  return parts.filter(p => p.length > 2);
}

/**
 * Detecta se a mensagem é uma pergunta de opinião que não requer pesquisa externa.
 * @param {string} text - Texto a analisar
 * @returns {boolean} - true se for pergunta de opinião
 */
function isOpinionQuestion(text) {
  const normalized = String(text || '').toLowerCase();
  return /(o que (voc[eê]|vc) (pensa|acha)|qual (é )?(a|sua|tua) (opini[aã]o|vis[aã]o)|me diga o que (ach|pens))/i.test(normalized)
    || /\b(sua|tua|sua própria|tua própria) (opini[aã]o|vis[aã]o|perspectiva|ponto de vista)\b/i.test(normalized);
}

/**
 * Detecta se a mensagem é uma pergunta definitional ou de explicação conceitual.
 * Exemplos: "O que é X?", "O que significa Y?", "Explique Z"
 * @param {string} text - Texto a analisar
 * @returns {boolean} - true se for pergunta definitional
 */
function isDefinitionQuestion(text) {
  const normalized = String(text || '').toLowerCase();
  return /^(o que é|o que significa|o que sao|qual (é|e) o significado de|explique o que é|me explica o que é)\b/i.test(normalized)
    || /\b(defin(a|e|ição) de|significa|significado)\b/i.test(normalized);
}

/**
 * Gera uma mensagem de esclarecimento para termos desconhecidos.
 * @param {string} term - Termo que não retornou resultados
 * @returns {string} - Mensagem pedindo esclarecimento
 */
function askForClarification(term) {
  return `Não encontrei fontes confiáveis sobre "${term}". Poderia fornecer mais contexto ou verificar a grafia?`;
}

/**
 * Detecta se a mensagem é silêncio (vazia ou apenas pontuação).
 * @param {string} text - Texto a analisar
 * @returns {boolean} - true se for silêncio
 */
function isSilence(text) {
  return !text || /^\s*\.*\s*$/.test(text);
}

/**
 * Detecta se é uma saudação simples
 * @param {string} text - Texto a analisar
 * @returns {boolean} - true se for saudação
 */
function isGreeting(text) {
  const normalized = String(text || '').trim().toLowerCase();
  return /^(oi|ola|olá|e ai|e aí|hey|iae|salve|bom dia|boa tarde|boa noite)[\s.!?]*$/i.test(normalized);
}

/**
 * Detecta perguntas triviais que não requerem ferramentas externas.
 * Retorna true para saudações, confirmações, agradecimentos e inputs muito curtos.
 * @param {string} text - Texto a analisar
 * @returns {boolean} - true se for trivial
 */
function isTrivialQuestion(text) {
  const normalized = String(text || '').trim().toLowerCase();

  // Inputs muito curtos (< 15 caracteres) sem URL ou termo técnico
  if (normalized.length < 15 && !/https?:\/\/|\.com|\.br|\w+\.\w+/.test(normalized)) {
    // Exceto se tiver palavra de pesquisa
    if (!/\b(pesquis|busqu|procur|encontr|quem|qual|quando|onde|como|porque)\b/.test(normalized)) {
      return true;
    }
  }

  // Saudações
  if (isGreeting(text)) {
    return true;
  }

  // Agradecimentos
  if (/^(obrigado|obrigada|valeu|thanks|thank you|brigado|vlw)[\s.!?]*$/i.test(normalized)) {
    return true;
  }

  // Confirmações
  if (/^(ok|okay|entendi|certo|perfeito|beleza|show|legal|sim|nao|não)[\s.!?]*$/i.test(normalized)) {
    return true;
  }

  // Perguntas de 1-3 palavras sem substantivo de pesquisa
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= 3) {
    const hasResearchIntent = words.some(w =>
      /^(pesquis|busqu|procur|encontr|quem|qual|quais|quando|onde|como|porque|por que|origem|historia|dados|fontes)/.test(w)
    );
    if (!hasResearchIntent) return true;
  }

  return false;
}

function isCasualConversation(text) {
  return /^(oi|ola|ol[aá]|e ai|e aí|bom dia|boa tarde|boa noite|obrigado|obrigada|valeu|ok|beleza|certo|entendi|teste|tudo bem|como vai|como voce esta|como você está)[\s.!?]*$/i.test(String(text || '').trim());
}

function isSimpleConversationInput(content) {
  const text = String(content || '').trim().toLowerCase();

  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|e aí|iae|salve)[\s.]*$/i.test(text)) return true;

  if (/^(tudo bem|como vai|como est[aá]|o que conta|me conta|fala a[ií]|diz a[ií])[\s.]*$/i.test(text)) return true;

  if (text.length < 50 && !/[?!]/.test(text) && !/pesquis|busqu|procure|ache|encontre|fontes|dados|estat[ií]stica/.test(text)) {
    return true;
  }

  return false;
}

function isDirectSelfReferenceInput(content = '') {
  const plain = normalizeRouteText(content);
  if (!plain) return false;

  const mentionsWorionOrAssistant =
    /\b(voce|vc|worion|ia|assistente|modelo|agente)\b/i.test(plain);

  // Detecta perguntas diretas sobre o assistente (ampliado)
  const asksAboutAssistant =
    /\b(sobre voce|sobre vc|voce e|vc e|voce esta|voce funciona|sua historia|seu funcionamento|como voce|o que voce)\b/i.test(plain);

  const mentionsRuntimeBehavior =
    /\b(respondeu|responder|resposta|pesquisa|pesquisar|busca|buscar|brave|tavily|fonte|fontes|modo|skill|prompt|md|personalidade|tom|voz)\b/i.test(plain);

  // Retorna true se menciona assistente E (pergunta direta OU comportamento runtime)
  return mentionsWorionOrAssistant && (asksAboutAssistant || mentionsRuntimeBehavior);
}

function getExecutionRoute(content = '', contextMessages = []) {
  const text = String(content || '').trim();
  const plain = normalizeRouteText(text);

  // Detectar silêncio (mensagem vazia ou apenas pontuação)
  if (isSilence(text)) return 'silence';
  if (isCasualConversation(text)) return 'direct_answer';

  // Detectar pergunta de opinião (não requer pesquisa)
  if (isOpinionQuestion(text)) return 'opinion';

  // Detectar pergunta definitional simples (não requer pesquisa, apenas explicação)
  if (isDefinitionQuestion(text)) return 'definition';

  if (!plain) return 'direct_answer';
  if (isDirectSelfReferenceInput(text)) return 'direct_answer';

  const questionScope = classifyQuestionScope(text);
  if (isPrivateQuestionScope(questionScope)) return 'direct_answer';
  if (questionScope === 'public_research') return 'focused_research';

  const asksForProof =
    /\b(comprove|prova|registro|fonte direta|onde tem registro|documento|evidencia)\b/i.test(plain);

  const asksForSources =
    /\b(fonte|fontes|referencia|referencias|pesquise|pesquisar|busque|buscar|procure|tudo que encontrar|tudo que voce encontrar)\b/i.test(plain);

  const asksDeep =
    /\b(riqueza de detalhes|analise densa|pesquisa profunda|dossie|relatorio completo|profundo|profunda|completo|completa)\b/i.test(plain);

  const asksComparative =
    /\b(compare|comparar|comparacao|versus|vs\.?|junte|conecte)\b/i.test(plain)
    || /\bentre\b[\s\S]{2,120}\be\b/i.test(plain);

  if (/\b(log|logs|erro|debug|depurar|deepseek|tavily|brave|grounding|gate|validator|evidence|tool loop|agent loop)\b/i.test(plain)) {
    return 'internal_diagnostic';
  }

  if (/\b(codigo|json|bug|corrija|implemente|javascript|node|electron|n8n|github|commit|branch)\b/i.test(plain)) {
    return 'code';
  }

  if (asksComparative) return 'comparative_research';
  if (asksForProof) return 'source_check';
  if (asksForSources && asksDeep) return 'deep_research';
  if (asksForSources) return 'focused_research';
  if (asksDeep) return 'deep_research';
  if (hasExternalKnowledgeIntent(plain)) return 'focused_research';

  const words = plain.split(/\s+/).filter(Boolean);
  const startsWithCommandOrQuestion =
    /^(quem|o que|onde|quando|como|por que|porque|qual|quantos|quantas|existe|tem|havia|houve|foi|eram|sao|sera|explique|me diga|me fala|conte|descreva)\b/i.test(plain);

  if (/^(oi|ola|olá|bom dia|boa tarde|boa noite|obrigado|obrigada|valeu|ok|beleza|certo|entendi|teste)[\s.!?]*$/i.test(text)) {
    return 'direct_answer';
  }

  if (words.length > 0 && words.length < 6 && !startsWithCommandOrQuestion) {
    return 'direct_answer';
  }

  if (isFactualResearchFollowUp(plain, contextMessages)) {
    return 'focused_research';
  }

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

  silence: {
    thinking: 'disabled',
    maxToolRounds: 0,
    tools: [],
    maxTokens: 100,
    maxSearches: 0,
    maxFetches: 0,
    synthesisRequired: false,
    silentResponse: 'Estou aqui se precisar!'
  },

  opinion: {
    thinking: 'disabled',
    maxToolRounds: 0,
    tools: [],
    maxTokens: 4000,
    maxSearches: 0,
    maxFetches: 0,
    synthesisRequired: true
  },

  definition: {
    thinking: 'disabled',
    maxToolRounds: 0,
    tools: [],
    maxTokens: 4000,
    maxSearches: 0,
    maxFetches: 0,
    synthesisRequired: true,
    askForClarificationIfUnknown: true
  },

  focused_research: {
    thinking: 'enabled',
    maxToolRounds: 2,
    tools: ['brave_search', 'fetch_url'],
    secondaryTools: ['tavily_search'],
    secondaryPolicy: 'use_tavily_only_if_brave_and_fetch_cannot_produce_an_answer',
    maxTokens: 8000,
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
    maxTokens: 8000,
    maxSearches: 0,
    maxFetches: 2,
    synthesisRequired: true
  },

  private_context_synthesis: {
    thinking: 'enabled',
    maxToolRounds: 0,
    tools: [],
    maxTokens: 10000,
    maxSearches: 0,
    maxFetches: 0,
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

function getResponseTokenBudget(content = '') {
  const route = getExecutionRoute(content);
  return EXECUTION_PROFILES[route]?.maxTokens || 8000;
}
