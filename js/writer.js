/**
 * MÓDULO: writer.js
 * RESPONSABILIDADE: Formatação centralizada de respostas do Worion
 * DEPENDÊNCIAS: Nenhuma (standalone)
 * EXPORTA: formatWorionResponse
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: Todas as rotas em chat.js devem passar pelo Writer
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// FRASES PROIBIDAS (WORION_IDENTITY.md)
// ============================================

const FORBIDDEN_PHRASES = [
  // Encerramentos genéricos
  /se houver algo mais que (voc[eê]|tu) queira? discutir/i,
  /se precisar de mais alguma coisa/i,
  /qualquer coisa (é só|e) me avisar/i,
  /estou à disposição/i,
  /me avise se quiser saber mais/i,
  /espero que isso ajude/i,
  /espero ter ajudado/i,
  /se (voc[eê]|tu) quiser,? posso ajudar com/i,

  // Tom de atendimento corporativo
  /agradeço pelo toque/i,
  /obrigado pela sua paciência/i,
  /fico feliz em ajudar/i,
  /como posso ajud[aá]-?lo hoje/i,
  /[óo]tima pergunta/i,

  // Desculpas excessivas
  /desculpe pela confusão/i,
  /me desculpe pelo inconveniente/i,
  /sinto muito que (voc[eê]|tu) esteja? passando por isso/i,

  // Disclaimers de IA
  /como uma inteligência artificial/i,
  /lembre-se de que sou apenas uma ia/i,
  /é importante lembrar que/i,
  /recomendo que (voc[eê]|tu) procure um profissional/i
];

const ENABLE_LLM_WRITER_REFINEMENT = false;
const WRITER_LLM_BYPASS_ROUTES = new Set([
  'greeting',
  'meta_feedback'
]);

// ============================================
// DETECÇÃO DE FRASES PROIBIDAS
// ============================================

/**
 * Detecta se o conteúdo contém frases proibidas
 * @param {string} content - Conteúdo a verificar
 * @returns {Object} { hasViolation: boolean, violations: string[] }
 */
function detectForbiddenPhrases(content) {
  const text = String(content || '').toLowerCase();
  const violations = [];

  for (const pattern of FORBIDDEN_PHRASES) {
    if (pattern.test(text)) {
      violations.push(pattern.source);
    }
  }

  return {
    hasViolation: violations.length > 0,
    violations
  };
}

// ============================================
// CORREÇÃO DE FRASES PROIBIDAS
// ============================================

/**
 * Remove ou reescreve frases proibidas
 * @param {string} content - Conteúdo a corrigir
 * @returns {string} Conteúdo corrigido
 */
function removeForbiddenPhrases(content) {
  let cleaned = String(content || '');

  // Remover frases de encerramento genéricas (geralmente no final)
  cleaned = cleaned.replace(/\n\n(se houver algo mais|se precisar de|qualquer coisa|estou à disposição|me avise se|espero que|espero ter)[^\n]{0,200}$/gi, '');

  // Remover agradecimentos corporativos
  cleaned = cleaned.replace(/\b(agradeço pelo toque|obrigado pela sua paciência|fico feliz em ajudar)[.!]?\s*/gi, '');

  // Remover "ótima pergunta"
  cleaned = cleaned.replace(/\b[óo]tima pergunta[.!]?\s*/gi, '');

  // Remover desculpas excessivas no início
  cleaned = cleaned.replace(/^(desculpe pela|me desculpe pelo|sinto muito que)[^\n]{0,100}[.!]\s*/i, '');

  // Remover disclaimers de IA
  cleaned = cleaned.replace(/\b(como uma inteligência artificial|lembre-se de que sou apenas uma ia|é importante lembrar que)[^\n]{0,200}[.!]\s*/gi, '');

  return cleaned.trim();
}

// ============================================
// VERIFICAÇÃO DE CITAÇÕES
// ============================================

/**
 * Verifica se há citações quando fontes foram usadas
 * @param {string} content - Conteúdo da resposta
 * @param {Array} sources - Array de fontes usadas
 * @returns {boolean} true se citações estão presentes ou não são necessárias
 */
function hasCitations(content, sources = []) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return true; // Não precisa de citações se não há fontes
  }

  const text = String(content || '');

  // Verificar se há URLs ou links markdown
  const hasUrls = /https?:\/\/[^\s)]+/.test(text);
  const hasMarkdownLinks = /\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/.test(text);

  return hasUrls || hasMarkdownLinks;
}

// ============================================
// TRUNCAMENTO DE FONTES
// ============================================

/**
 * Trunca fontes para no máximo 5 itens, priorizando por relevância
 * @param {Array} sources - Array de fontes com score de relevância
 * @param {number} maxSources - Máximo de fontes (padrão: 5)
 * @returns {Array} Fontes truncadas
 */
function truncateSources(sources = [], maxSources = 5) {
  if (!Array.isArray(sources) || sources.length <= maxSources) {
    return sources;
  }

  const originalCount = sources.length;

  // Ordenar por relevância se disponível, senão manter ordem original
  const sorted = [...sources].sort((a, b) => {
    const scoreA = a.relevance || a.priority || a.quality?.score || 0;
    const scoreB = b.relevance || b.priority || b.quality?.score || 0;
    return scoreB - scoreA;
  });

  const truncated = sorted.slice(0, maxSources);

  console.log(`[WRITER] sources truncated: ${originalCount}→${truncated.length}`);

  return truncated;
}

// ============================================
// RASTREIO DE REFUTAÇÕES
// ============================================

// Array global de pontos refutados (resetado a cada novo chat)
window.worionRefutedPoints = window.worionRefutedPoints || [];

/**
 * Detecta refutações explícitas do usuário na mensagem
 * @param {string} userMessage - Mensagem do usuário
 * @param {Array} conversationHistory - Histórico da conversa
 * @returns {Array} Novos pontos refutados detectados
 */
function detectRefutations(userMessage = '', conversationHistory = []) {
  const text = String(userMessage || '').toLowerCase();
  const refutations = [];

  // Padrões de refutação
  const refutationPatterns = [
    /não é (isso|obsessão|verdade|assim|correto)/i,
    /você (errou|está errado|se enganou)/i,
    /já (refutei|disse que não|corrigi)/i,
    /workestria (está|esta) parada/i,
    /na verdade,?\s*[^\n]{10,100}/i,
    /o correto é[:\s]+[^\n]{10,100}/i,
    /eu disse que [^\n]{10,100}/i
  ];

  for (const pattern of refutationPatterns) {
    const match = text.match(pattern);
    if (match) {
      refutations.push({
        pattern: pattern.source,
        matched: match[0],
        timestamp: Date.now()
      });
    }
  }

  return refutations;
}

/**
 * Adiciona refutações ao registro global
 * @param {string} userMessage - Mensagem do usuário
 * @param {Array} conversationHistory - Histórico da conversa
 */
function trackRefutations(userMessage, conversationHistory = []) {
  const newRefutations = detectRefutations(userMessage, conversationHistory);

  if (newRefutations.length > 0) {
    window.worionRefutedPoints = window.worionRefutedPoints || [];
    window.worionRefutedPoints.push(...newRefutations);
    console.log('[WRITER] Refutações detectadas:', newRefutations.length);
  }
}

/**
 * Reseta o registro de refutações (chamado ao iniciar novo chat)
 */
function resetRefutations() {
  window.worionRefutedPoints = [];
  console.log('[WRITER] Refutações resetadas');
}

function summarizeToolEvidence(toolResults = {}) {
  const report = toolResults.privateReadReport || toolResults._privateReadReport || null;
  if (!report || typeof report !== 'object') {
    return 'Sem relatório privado estruturado.';
  }

  const parts = [
    `rota=${report.route || 'indefinida'}`,
    `escopo=${report.scope || 'indefinido'}`,
    Number.isFinite(report.totalFetched) ? `fontes_lidas=${report.totalFetched}` : '',
    Number.isFinite(report.totalFound) ? `fontes_encontradas=${report.totalFound}` : ''
  ].filter(Boolean);

  return parts.join('; ') || 'Relatório privado disponível, sem contagens.';
}

function hasWriterInstructionLeak(text = '') {
  const value = String(text || '');
  return [
    /Regras CR[IÍ]TICAS/i,
    /Memory cards s[aã]o contexto hist[oó]rico/i,
    /N[aã]o repita nada que o usu[aá]rio j[aá] refutou/i,
    /Tom Worion:/i,
    /privateReadReport/i,
    /sourcesRequested/i,
    /toolResults/i,
    /M[aá]ximo \d+ tokens/i,
    /Retorne APENAS o texto final/i
  ].some(pattern => pattern.test(value));
}

function cleanWriterInstructionLeak(text = '') {
  let cleaned = String(text || '').trim();

  cleaned = cleaned.replace(/(?:^|\n)\s*Regras CR[IÍ]TICAS:[\s\S]*$/i, '').trim();
  cleaned = cleaned.replace(/(?:^|\n)\s*Memory cards s[aã]o contexto hist[oó]rico[\s\S]*$/i, '').trim();
  cleaned = cleaned.replace(/(?:^|\n)\s*Se o rascunho afirmar[\s\S]*$/i, '').trim();
  cleaned = cleaned.replace(/\{["']?privateReadReport["']?:[\s\S]*?\}\s*/gi, '').trim();

  return cleaned;
}

function preserveMarkdown(text = '') {
  return String(text || '').replace(/\r\n/g, '\n');
}

function cleanupSpacing(text = '') {
  return String(text || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function deterministicWriterCleanup(text = '', context = {}) {
  let cleaned = preserveMarkdown(text);
  cleaned = cleanWriterInstructionLeak(cleaned);
  cleaned = removeForbiddenPhrases(cleaned);
  cleaned = cleanupSpacing(cleaned);

  if (WRITER_LLM_BYPASS_ROUTES.has(context.route)) {
    return cleaned;
  }

  return cleaned;
}

// ============================================
// GERAÇÃO E REFINAMENTO (RASCUNHO + WRITER)
// ============================================

/**
 * Chama o modelo leve do Writer/Reducer
 * @param {Array} messages - Mensagens do chat
 * @param {Object} options - Opções da chamada
 * @returns {Promise<string>} Resposta do modelo
 */
async function callHaiku(messages, options = {}) {
  console.log('[WRITER MODEL] Iniciando chamada');
  try {
    const payload = {
      model: options.model || 'gpt-5.4-nano',
      messages,
      max_tokens: options.max_tokens || 400,
      temperature: options.temperature || 0.3
    };

    console.log('[WRITER MODEL] Payload preparado:', { model: payload.model, messagesCount: messages.length, max_tokens: payload.max_tokens });

    if (typeof callModelWithRetry === 'function') {
      console.log('[WRITER MODEL] Chamando callModelWithRetry');
      const data = await callModelWithRetry(payload, 2);
      let result = '';

      if (data?.choices?.[0]?.message?.content) {
        result = data.choices[0].message.content;
      } else if (typeof data?.content === 'string') {
        result = data.content;
      } else if (data?.output_text) {
        result = data.output_text;
      }

      console.log('[WRITER MODEL] Resultado final:', { length: result.length, preview: result.slice(0, 100) });
      return result;
    }

    // Fallback antigo: usar callAnthropicWithRetry se o runtime ainda não carregou chat-models.
    if (typeof callAnthropicWithRetry === 'function') {
      console.log('[WRITER MODEL] callModelWithRetry indisponível; usando callAnthropicWithRetry legado');
      const data = await callAnthropicWithRetry({ ...payload, model: 'claude-haiku-4-5' }, 2);

      // Extrair texto de múltiplos formatos possíveis
      let result = '';

      // Formato OpenAI: data.choices[0].message.content
      if (data?.choices?.[0]?.message?.content) {
        result = data.choices[0].message.content;
        console.log('[WRITER MODEL] Extraído de choices[0].message.content');
      }
      // Formato Anthropic nativo: data.content[0].text
      else if (data?.content?.[0]?.text) {
        result = data.content[0].text;
        console.log('[WRITER MODEL] Extraído de content[0].text');
      }
      // Formato alternativo: data.content direto
      else if (typeof data?.content === 'string') {
        result = data.content;
        console.log('[WRITER MODEL] Extraído de content (string)');
      }
      // Fallback: output_text
      else if (data?.output_text) {
        result = data.output_text;
        console.log('[WRITER MODEL] Extraído de output_text');
      }

      console.log('[WRITER MODEL] Resultado final:', { length: result.length, preview: result.slice(0, 100) });
      return result;
    }

    // Fallback: usar API local se helpers globais não estiverem disponíveis
    if (typeof fetch === 'function') {
      console.log('[WRITER MODEL] Usando fetch para API local');
      const response = await fetch('http://localhost:3766/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: payload.model, messages: payload.messages, options: payload })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data?.content?.[0]?.text || data?.content || '';
    }

    throw new Error('Nenhum método de chamada disponível para Writer');

  } catch (error) {
    // DIAGNÓSTICO: Expor erro completo antes do fallback
    console.error('[WRITER MODEL] ERRO CAPTURADO:');
    console.error('[WRITER MODEL] error.message:', error.message);
    console.error('[WRITER MODEL] error.status:', error.status);
    console.error('[WRITER MODEL] error.response:', error.response);
    console.error('[WRITER MODEL] error completo:', error);
    console.error('[WRITER MODEL] stack trace:', error.stack);

    // Se for erro da API, tentar extrair mais detalhes
    if (error.response) {
      console.error('[WRITER MODEL] error.response.data:', error.response.data);
      console.error('[WRITER MODEL] error.response.status:', error.response.status);
      console.error('[WRITER MODEL] error.response.headers:', error.response.headers);
    }

    return '';
  }
}

/**
 * Gera rascunho interno e refina com Writer
 * @param {string} query - Pergunta do usuário
 * @param {Object} context - Contexto da resposta
 * @param {Array} context.sources - Fontes coletadas (já truncadas)
 * @param {Array} context.history - Histórico da conversa
 * @param {Object} context.toolResults - Resultados de ferramentas executadas
 * @param {string} context.route - Rota de execução
 * @param {string} context.rawContent - Conteúdo original sem refinamento (usado como fallback)
 * @returns {Promise<string>} Resposta refinada
 */
async function generateAndRefine(query, context = {}) {
  const route = context.route || 'unknown';
  const rawContent = context.rawContent || '';

  if (!ENABLE_LLM_WRITER_REFINEMENT) {
    const cleaned = deterministicWriterCleanup(rawContent || query, context);
    console.log('[WRITER] deterministic cleanup applied', { route, changed: cleaned !== rawContent });
    return cleaned;
  }

  if (WRITER_LLM_BYPASS_ROUTES.has(route)) {
    return deterministicWriterCleanup(rawContent || query, context);
  }

  console.log('[WRITER] gerando rascunho para rota:', route);

  // PASSO 1 — RASCUNHO INTERNO
  const sourcesText = Array.isArray(context.sources) && context.sources.length > 0
    ? context.sources.map((s, i) => {
        const sourceBody = s.snippet ||
          s.description ||
          s.content ||
          s.text ||
          s.fetched?.text ||
          s.fetched?.content ||
          '';
        return `[${i + 1}] ${s.title || s.label || s.url || 'fonte'}: ${String(sourceBody).slice(0, 1200)}`;
      }).join('\n')
    : 'Nenhuma fonte coletada';

  const historyText = Array.isArray(context.history) && context.history.length > 0
    ? context.history.slice(-4).map(m => `${m.role}: ${String(m.content || '').slice(0, 200)}`).join('\n')
    : 'Sem histórico anterior';

  const draftPrompt = [
    { role: 'user', content: `Dado este contexto:

${sourcesText}

E este histórico:
${historyText}

Gere um rascunho direto para: ${query}

Máximo 300 tokens. Seja direto, sem formatação excessiva.` }
  ];

  const draft = await callHaiku(draftPrompt, { max_tokens: 300, temperature: 0.3 });

  if (!draft) {
    console.warn('[WRITER] Falha ao gerar rascunho');
    if (rawContent) {
      console.log('[WRITER] fallback para rawContent por falha no rascunho');
      return rawContent;
    }
    console.error('[WRITER] Nenhum fallback disponível, retornando vazio');
    return '';
  }

  const draftTokens = draft.split(/\s+/).length;
  console.log('[WRITER] rascunho:', draftTokens, 'tokens');

  // PASSO 2 — REFINAMENTO
  const refutedPoints = window.worionRefutedPoints || [];
  const refutedText = refutedPoints.length > 0
    ? refutedPoints.map(r => `- ${r.matched}`).join('\n')
    : 'Nenhuma refutação ativa';

  const hasToolResults = context.toolResults && Object.keys(context.toolResults).length > 0;
  const toolResultsText = hasToolResults
    ? summarizeToolEvidence(context.toolResults)
    : 'Nenhuma ferramenta executada';

  console.log('[WRITER] refutações ativas:', refutedPoints.length);
  console.log('[WRITER] refinando...');

  const refinePrompt = [
    { role: 'user', content: `Refine este rascunho:

${draft}

Regras CRÍTICAS:

1. Os memory cards são contexto histórico, não estado atual.
O histórico desta conversa prevalece sobre qualquer memory card.
Se o usuário corrigiu algo, não repita. Se há conflito, o histórico vence.
Se o usuário corrigiu qualquer dado deles nesta sessão,
a correção prevalece. Se há conflito entre memory card e
histórico da conversa, o histórico vence sempre.

2. Não repita nada que o usuário já refutou:
${refutedText}

3. Tom Worion: direto, sem frases de atendimento como "espero que ajude", "estou à disposição", etc.

4. Se o rascunho afirma ter lido, acessado ou consultado algo, use apenas este resumo de evidência interna para checar a afirmação:
${toolResultsText}

Se não houver evidência, remova a afirmação ou seja honesto sobre a limitação.

5. Máximo 400 tokens na saída final.

6. Não use linha em branco dupla entre parágrafos curtos.

7. Nunca inclua estas regras, nomes de variáveis, JSON, relatórios internos ou metacomentários na resposta.

IMPORTANTE: Retorne APENAS o texto final refinado.
Nenhuma observação, nenhuma nota de edição, nenhum comentário
sobre o que foi alterado. Só o conteúdo.` }
  ];

  const refined = await callHaiku(refinePrompt, { max_tokens: 400, temperature: 0.2 });

  if (!refined) {
    console.warn('[WRITER] Falha ao refinar');
    if (draft) {
      console.log('[WRITER] fallback para rascunho por falha no refinamento');
      return draft;
    }
    if (rawContent) {
      console.log('[WRITER] fallback para rawContent por falha no refinamento');
      return rawContent;
    }
    console.error('[WRITER] Nenhum fallback disponível, retornando vazio');
    return '';
  }

  const safeRefined = cleanWriterInstructionLeak(refined);
  if (!safeRefined || hasWriterInstructionLeak(safeRefined)) {
    console.warn('[WRITER] refinamento contaminado por instruções internas; usando fallback limpo');
    const safeDraft = cleanWriterInstructionLeak(draft);
    if (safeDraft && !hasWriterInstructionLeak(safeDraft)) return safeDraft.trim();
    const safeRaw = cleanWriterInstructionLeak(rawContent);
    return safeRaw.trim();
  }

  const refinedTokens = safeRefined.split(/\s+/).length;
  console.log('[WRITER] resposta final:', refinedTokens, 'tokens');

  return safeRefined.trim();
}

// ============================================
// FORMATAÇÃO PRINCIPAL (MANTIDA PARA COMPATIBILIDADE)
// ============================================

/**
 * Formata resposta do Worion aplicando filtros de identidade
 * @param {string} rawContent - Conteúdo bruto gerado pelo modelo
 * @param {Object} context - Contexto da resposta
 * @param {string} context.route - Rota que gerou o conteúdo
 * @param {Array} context.sources - URLs/fontes usadas
 * @param {string} context.agentId - ID do agente ativo
 * @param {string} context.query - Pergunta original do usuário
 * @returns {Promise<string>} Conteúdo formatado
 */
async function formatWorionResponse(rawContent, context = {}) {
  try {
    let formatted = String(rawContent || '');

    // 1. Detectar violações
    const detection = detectForbiddenPhrases(formatted);

    // 2. Se houver violações, remover/reescrever
    if (detection.hasViolation) {
      console.log('[WRITER] Frases proibidas detectadas:', detection.violations.length);
      formatted = removeForbiddenPhrases(formatted);
    }

    // 3. Verificar citações (apenas log, não bloqueia)
    const sources = context.sources || [];
    if (sources.length > 0 && !hasCitations(formatted, sources)) {
      console.log('[WRITER] Aviso: Fontes fornecidas mas nenhuma citação detectada');
    }

    console.log('[WRITER] Formatação concluída');
    return formatted;

  } catch (error) {
    console.error('[WRITER] Erro ao formatar resposta:', error);
    // Fallback: retornar conteúdo original sem modificação
    return String(rawContent || '');
  }
}

// ============================================
// EXPORTAÇÃO
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatWorionResponse,
    generateAndRefine,
    truncateSources,
    trackRefutations,
    resetRefutations,
    detectRefutations,
    removeForbiddenPhrases,
    preserveMarkdown,
    cleanupSpacing
  };
}

if (typeof window !== 'undefined') {
  window.formatWorionResponse = formatWorionResponse;
  window.generateAndRefine = generateAndRefine;
  window.truncateSources = truncateSources;
  window.trackRefutations = trackRefutations;
  window.resetRefutations = resetRefutations;
  window.detectRefutations = detectRefutations;
  window.removeForbiddenPhrases = removeForbiddenPhrases;
  window.preserveMarkdown = preserveMarkdown;
  window.cleanupSpacing = cleanupSpacing;
}
