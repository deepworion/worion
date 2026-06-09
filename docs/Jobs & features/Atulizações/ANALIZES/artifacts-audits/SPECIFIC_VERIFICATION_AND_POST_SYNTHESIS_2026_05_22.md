# Specific Repository Extract - 2026-05-22

## 1. Conteudo completo de js\verification.js
```js
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

```

## 2. Chamadas ao modelo apos sintese principal em js\chat.js

### js\chat.js:3597 - EVASIVE_REPAIR / runOpenAIWithTools
```js
 3587:         try {
 3588:           const repairRoute = WORION_EXECUTION_ROUTER_TEST ? getExecutionRoute(content) : null;
 3589:           const repairProfile = repairRoute ? (EXECUTION_PROFILES[repairRoute] || EXECUTION_PROFILES.direct_answer) : null;
 3590:           const repairTools = WORION_EXECUTION_ROUTER_TEST
 3591:             ? selectToolsByProfile(WORION_TOOLS, repairProfile || {})
 3592:             : WORION_TOOLS;
 3593: 
 3594:           console.log('[EVASIVE_REPAIR] route:', repairRoute || 'legacy');
 3595:           console.log('[EVASIVE_REPAIR] selectedTools:', repairTools.map(tool => tool.function?.name));
 3596: 
 3597:           const repairResult = await runOpenAIWithTools(repairMessages, repairTools, {
 3598:             model: currentAgent.model || 'gpt-4o-mini',
 3599:             temperature: 0.2, // temperatura mais baixa para execuÃ§Ã£o objetiva
 3600:             max_tokens: repairProfile?.maxTokens || getResponseTokenBudget(content),
 3601:             maxToolRounds: repairProfile?.maxToolRounds,
 3602:             thinking: repairProfile?.thinking,
 3603:             executionRoute: repairRoute,
 3604:             executionProfile: repairProfile
 3605:           });
 3606: 
 3607:           // Registrar evidÃªncias do reparo
```

## 3. Referencias a funcoes exportadas de js\verification.js em js\chat.js

### Imports
Nenhum import encontrado. O arquivo usa window.WorionVerificationEngine como global.

### Chamadas / referencias
```text
js\chat.js:3264:       : (typeof window !== 'undefined' && window.WorionVerificationEngine)
js\chat.js:3265:         ? window.WorionVerificationEngine.createVerificationPlan(content)
js\chat.js:3391:     if (typeof window !== 'undefined' && window.WorionVerificationEngine && window.WorionVerificationEngine.requiresVerification(content)) {
js\chat.js:3392:       const domain = window.WorionVerificationEngine.detectDomain(content);
js\chat.js:3395:         : window.WorionVerificationEngine.buildVerificationInstruction(content);
js\chat.js:3495:     if (verificationPlan.mustUseExternalEvidence && typeof window !== 'undefined' && window.WorionVerificationEngine) {
js\chat.js:3497:       const evidenceUsed = window.WorionVerificationEngine.countExternalEvidence(allToolCalls);
js\chat.js:3498:       const validation = window.WorionVerificationEngine.validateResponse(verificationPlan, evidenceUsed);
js\chat.js:3570:     if (typeof window !== 'undefined' && window.WorionVerificationEngine) {
js\chat.js:3571:       const isResearchRequest = window.WorionVerificationEngine.looksLikeResearchRequest(content);
js\chat.js:3572:       const isEvasive = window.WorionVerificationEngine.isEvasiveResearchAnswer(reply, content);
js\chat.js:3578:         const repairPrompt = window.WorionVerificationEngine.buildResearchRepairPrompt(content);
js\chat.js:3613:           const stillEvasive = window.WorionVerificationEngine.isEvasiveResearchAnswer(repairedReply, content);
js\chat.js:3900:   if (verificationPlan?.mustUseExternalEvidence && typeof window !== 'undefined' && window.WorionVerificationEngine) {
js\chat.js:4080:   if (verificationPlan?.mustUseExternalEvidence && typeof window !== 'undefined' && window.WorionVerificationEngine) {
js\chat.js:4082:     const evidenceUsed = window.WorionVerificationEngine.countExternalEvidence(allToolCalls);
js\chat.js:4083:     const validation = window.WorionVerificationEngine.validateResponse(verificationPlan, evidenceUsed);
```

