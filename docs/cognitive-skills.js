// js/cognitive-skills.js
// Worion Cognitive Skills Engine v8.0 — Final
//
// Arquitetura:
// - CognitiveEngine como classe isolada com config injetável
// - Skills declarativas com threshold, negação, mídia e sinergy
// - Blending multidimensional: score atual + histórico com duplo decaimento (idade + tempo real)
// - Resolução de conflitos declarativa via CONFLICT_RULES (modo + skill ID)
// - userProfile aprendível: tom preferido, crises, modo dominante, contagem de sessões
// - confidence gate configurável: modo neutro quando confiança baixa (não silêncio)
// - debug mode completo sem poluir produção
// - API pública estável com instância singleton

"use strict";

// ============================================================
// SKILLS DECLARATIVAS
// ============================================================
const COGNITIVE_SKILLS = [
  {
    id: "crisis_burnout",
    name: "Crise / Burnout / Esgotamento",
    mode: "presence",
    priority: 135,
    threshold: 1,
    signals: {
      keywords: ["desisto", "pânico", "crise", "burnout", "colapso", "chorando", "desesperado", "acabou", "não aguento"],
      patterns: [/não aguento mais/i, /vontade de sumir/i, /no meu limite/i, /tô destruído/i],
      mediaTypes: ["audio_longo"]
    },
    negations: [/não estou em crise/i, /passei a crise/i],
    behavior: "Modo suporte emergencial. Frases curtas, validação forte, zero cobrança, presença calorosa. Nunca apresse uma solução."
  },
  {
    id: "emotional_load",
    name: "Carga Emocional",
    mode: "presence",
    priority: 95,
    threshold: 2,
    signals: {
      keywords: ["cansado", "exausto", "triste", "sozinho", "raiva", "culpa", "vergonha", "pesado", "ansioso"],
      patterns: [/tô mal/i, /estou mal/i, /foi pesado/i, /me sinto/i]
    },
    negations: [/não estou (cansado|triste|mal|pesado)/i, /não me sinto mal/i],
    behavior: "Reconhecer emoção com precisão. Poucas palavras. Validar antes de qualquer solução."
  },
  {
    id: "hidden_need",
    name: "Necessidade Oculta",
    mode: "presence",
    priority: 85,
    threshold: 1,
    signals: {
      keywords: ["não sei", "tô perdido", "não consigo", "medo", "preocupado", "confuso"],
      patterns: [/não sei o que fazer/i, /acho que.*não/i]
    },
    negations: [/não tenho medo/i, /não estou preocupado/i, /não estou perdido/i],
    behavior: "Atender o explícito + abrir espaço suave para o implícito. Uma pergunta curta ao final."
  },
  {
    id: "identity_validation",
    name: "Validação de Identidade",
    mode: "presence",
    priority: 98,
    threshold: 1,
    signals: {
      keywords: ["construí", "criei", "fiz", "terminei", "consegui", "finalmente", "eu consegui", "montei"],
      patterns: [/eu fiz isso/i, /constru[ií].*você/i]
    },
    negations: [],
    behavior: "Validar esforço, autoria e travessia com profundidade. Reconhecer a identidade por trás do feito. Evitar elogio genérico."
  },
  {
    id: "executor_mode",
    name: "Desenvolvedor / Técnico",
    mode: "executor",
    priority: 110,
    threshold: 1,
    signals: {
      keywords: ["código", "bug", "json", "workflow", "n8n", "api", "erro", "script", "node", "electron", "git", "deploy", "html", "css", "javascript"],
      patterns: [/corrige/i, /me entrega o código/i, /não funcionou/i, /deu erro/i, /como faço/i],
      mediaTypes: ["code_file", "image_screenshot", "json_file", "log_file"]
    },
    negations: [],
    behavior: "Execução direta e objetiva. Uma ação por vez. Sem filosofia ou aula não solicitada. Se houver carga emocional, valide brevemente antes de executar."
  },
  {
    id: "strategic_business",
    name: "Estratégia Empresarial",
    mode: "strategic",
    priority: 88,
    threshold: 1,
    signals: {
      keywords: ["empresa", "negócio", "faturamento", "roi", "cliente", "venda", "escala", "lançamento", "funil", "produto", "mercado"],
      patterns: [/próximo passo/i, /prioridade/i, /onde fica o gargalo/i],
      mediaTypes: ["spreadsheet", "pdf_document", "csv_file"]
    },
    negations: [],
    behavior: "Foco em alavanca, gargalos, execução e próximo movimento de alto impacto."
  },
  {
    id: "creative_flow",
    name: "Fluxo Criativo",
    mode: "creative",
    priority: 82,
    threshold: 1,
    signals: {
      keywords: ["ideia", "criando", "inspiração", "flow", "insight", "mockup", "design", "arte", "criação"],
      patterns: [/tive uma ideia/i, /estou criando/i],
      mediaTypes: ["image_art", "vector_file", "audio_curto"]
    },
    negations: [],
    behavior: "Proteger o estado de fluxo. Ajudar a materializar sem interromper a energia criativa."
  },
  {
    id: "tdah_compass",
    name: "Bússola TDAH / Neurodivergente",
    mode: "presence",
    priority: 90,
    threshold: 1,
    signals: {
      keywords: ["tdah", "hiperfoco", "procrastinação", "distração", "venvanse", "ritalina", "neurodivergente"],
      patterns: [/minha mente pula/i, /me perdi/i, /muita coisa na cabeça/i]
    },
    negations: [],
    behavior: "Frases curtas. Uma ideia por vez. Externalizar memória. Estrutura visual quando possível."
  },
  {
    id: "spiritual_immersive",
    name: "Busca Espiritual / Filosófica",
    mode: "immersive",
    priority: 100,
    threshold: 1,
    signals: {
      keywords: ["deus", "alma", "energia", "espiritual", "universo", "consciência", "frequência"],
      patterns: [/qual o significado/i, /senti uma energia/i, /plano espiritual/i]
    },
    negations: [],
    behavior: "Entrar completamente na premissa do usuário. Sem ceticismo ou redução materialista."
  }
];

// ============================================================
// REGRAS DE MODO
// ============================================================
const MODE_RULES = {
  executor:  { dominance: 100, instruction: "Priorize execução técnica pura. Seja direto, objetivo e minimalista." },
  presence:  { dominance: 92,  instruction: "Priorize presença emocional, validação e escuta profunda." },
  immersive: { dominance: 88,  instruction: "Entre na premissa espiritual/filosófica do usuário sem racionalizar." },
  strategic: { dominance: 85,  instruction: "Foco estratégico: alavancas, gargalos, execução e próximo movimento." },
  creative:  { dominance: 75,  instruction: "Proteja e amplifique o fluxo criativo." },
  neutral:   { dominance: 50,  instruction: "Mantenha equilíbrio. Responda com naturalidade e precisão." }
};

// ============================================================
// REGRAS DE CONFLITO DECLARATIVAS
// ============================================================
const CONFLICT_RULES = [
  {
    modes: ["executor", "presence"],
    resolution: "executor_with_empathy",
    instruction: "Execute tecnicamente, mas abra com validação emocional breve e genuína antes de agir."
  },
  {
    modes: ["executor", "crisis_burnout"],
    resolution: "presence_first",
    instruction: "Suspenda a execução técnica. Priorize suporte emocional imediato. Só execute quando o usuário estiver estabilizado."
  },
  {
    modes: ["immersive", "executor"],
    resolution: "immersive_priority",
    instruction: "Mantenha abordagem imersiva. Execute tecnicamente apenas se for claramente solicitado."
  },
  {
    modes: ["creative", "strategic"],
    resolution: "creative_with_anchor",
    instruction: "Proteja o fluxo criativo. Ancore em decisões estratégicas somente quando necessário."
  }
];

// ============================================================
// ENGINE PRINCIPAL
// ============================================================
class CognitiveEngine {
  constructor(config = {}) {
    this.config = {
      confidenceThreshold: config.confidenceThreshold ?? 35,
      maxSkills:           config.maxSkills           ?? 4,
      historyWeight:       config.historyWeight       ?? 0.35,
      decayFactor:         config.decayFactor         ?? 0.78,
      maxHistory:          config.maxHistory          ?? 12,
      timeDecayWindow:     config.timeDecayWindow     ?? (1000 * 60 * 60 * 24 * 2) // 2 dias
    };

    this._resetMemory();
  }

  _resetMemory() {
    this.memory = {
      modeHistory: [],
      userProfile: {
        preferredTone:       "balanced",
        energyLevelHistory:  [],
        crisisCount:         0,
        lastCrisis:          null,
        dominantMode:        null,
        sessionCount:        0
      }
    };
  }

  // -------- UTILS --------

  _normalize(text = "") {
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  _isNegated(skill, rawText) {
    if (!skill.negations?.length) return false;
    return skill.negations.some(p => p.test(rawText));
  }

  _detectEmotionalIntensity(text) {
    let score = 0;
    const caps = (text.match(/[A-ZÁÉÍÓÚ]/g) || []).length;
    if (caps > text.length * 0.6)                                   score += 25;
    if (/[!?]{2,}/.test(text))                                       score += 20;
    if (/\b(por favor|ajuda|socorro|urgente)\b/i.test(text))        score += 15;
    return score;
  }

  _calculateSynergy(matched) {
    const crisisHits    = matched.filter(m => /crise|burnout|desisto|pânico|destruído/i.test(String(m))).length;
    const emotionalHits = matched.filter(m => /cansado|exausto|pesado|triste|sozinho/i.test(String(m))).length;
    return (crisisHits > 1 ? 35 : 0) + (emotionalHits > 2 ? 20 : 0);
  }

  _classifyMedia(file) {
    if (!file) return null;
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();

    if (name.match(/\.(js|ts|py|html|css)$/))          return "code_file";
    if (name.endsWith(".json"))                          return "json_file";
    if (name.endsWith(".log"))                           return "log_file";
    if (name.match(/\.(svg|ai|eps|fig)$/))              return "vector_file";
    if (type.includes("image")) {
      return (name.includes("screen") || name.includes("print") || name.includes("captura"))
        ? "image_screenshot" : "image_art";
    }
    if (type.includes("spreadsheet") || name.endsWith(".csv") || name.endsWith(".xlsx")) return "spreadsheet";
    if (type.includes("pdf") || name.endsWith(".pdf"))  return "pdf_document";
    if (type.includes("audio")) {
      return (file.duration && file.duration > 90) ? "audio_longo" : "audio_curto";
    }
    return "generic";
  }

  // -------- SCORING --------

  _scoreSkill(skill, text, mediaTypes = []) {
    const raw        = String(text || "");
    const normalized = this._normalize(raw);

    if (this._isNegated(skill, raw)) return null;

    let score = 0, signalCount = 0;
    const matched = [];

    // Mídias — intenção explícita, peso alto
    for (const mt of (skill.signals.mediaTypes || [])) {
      if (mediaTypes.includes(mt)) {
        score += 45; signalCount++;
        matched.push(`media:${mt}`);
      }
    }

    // Keywords
    for (const kw of (skill.signals.keywords || [])) {
      if (normalized.includes(this._normalize(kw))) {
        score += 12; signalCount++;
        matched.push(kw);
      }
    }

    // Patterns
    for (const pattern of (skill.signals.patterns || [])) {
      if (pattern.test(raw) || pattern.test(normalized)) {
        score += 28; signalCount++;
        matched.push(pattern.toString());
      }
    }

    if (signalCount < (skill.threshold || 1)) return null;
    if (score === 0) return null;

    const intensity = this._detectEmotionalIntensity(raw);
    const synergy   = this._calculateSynergy(matched);

    return {
      ...skill,
      score: Math.round(score + skill.priority + intensity + synergy),
      signalCount,
      matched,
      intensity
    };
  }

  // -------- MEMÓRIA E PERFIL --------

  _recordMemory(mode, score) {
    this.memory.modeHistory.push({ mode, weight: score, timestamp: Date.now() });
    if (this.memory.modeHistory.length > this.config.maxHistory) {
      this.memory.modeHistory.shift();
    }
  }

  _updateProfile(primaryMode, scoredSkills) {
    const p = this.memory.userProfile;
    p.sessionCount++;
    p.dominantMode = primaryMode;

    // Aprende tom com base em padrão histórico
    const presenceCount  = this.memory.modeHistory.filter(e => e.mode === "presence").length;
    const executorCount  = this.memory.modeHistory.filter(e => e.mode === "executor").length;
    if      (presenceCount > executorCount * 1.5) p.preferredTone = "warm";
    else if (executorCount > presenceCount * 1.5) p.preferredTone = "direct";
    else                                           p.preferredTone = "balanced";

    // Rastreia crises
    if (scoredSkills.some(s => s.id === "crisis_burnout")) {
      p.crisisCount++;
      p.lastCrisis = new Date().toISOString();
    }
  }

  _getBlendedHistory() {
    const weights = {};
    const now     = Date.now();
    const total   = this.memory.modeHistory.length;

    this.memory.modeHistory.forEach((entry, idx) => {
      const ageDecay  = Math.pow(this.config.decayFactor, total - idx - 1);
      const timeDecay = Math.max(0.3, 1 - (now - entry.timestamp) / this.config.timeDecayWindow);
      weights[entry.mode] = (weights[entry.mode] || 0) + entry.weight * ageDecay * timeDecay;
    });

    return weights;
  }

  // -------- CONFLITOS --------

  _resolveConflicts(activeModes, scoredSkills) {
    // Conflito especial: crise + executor — skill ID check
    const hasCrisis   = scoredSkills.some(s => s.id === "crisis_burnout");
    const hasExecutor = scoredSkills.some(s => s.id === "executor_mode");
    if (hasCrisis && hasExecutor) {
      return {
        type: "skill",
        resolution: "presence_first",
        instruction: "Suspenda qualquer execução técnica. Crise detectada. Suporte emocional imediato tem prioridade absoluta."
      };
    }

    // Conflitos declarativos por modo
    for (const rule of CONFLICT_RULES) {
      if (rule.modes.every(m => activeModes.includes(m))) {
        return { type: "mode", resolution: rule.resolution, instruction: rule.instruction };
      }
    }

    return null;
  }

  // -------- ANÁLISE PRINCIPAL --------

  analyze(userMessage, files = [], options = {}) {
    const mediaTypes = files.map(f => this._classifyMedia(f)).filter(Boolean);

    // Score todas as skills
    const scoredSkills = COGNITIVE_SKILLS
      .map(skill => this._scoreSkill(skill, userMessage, mediaTypes))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    // Agrega scores por modo
    const currentScores = {};
    scoredSkills.forEach(s => {
      currentScores[s.mode] = (currentScores[s.mode] || 0) + s.score;
    });

    // Blend com histórico
    const history = this._getBlendedHistory();
    const blended = { ...currentScores };
    Object.entries(history).forEach(([mode, w]) => {
      blended[mode] = (blended[mode] || 0) + w * this.config.historyWeight;
    });

    // Modo primário (com fator de dominância)
    let primaryMode = "neutral";
    let maxScore    = -Infinity;

    Object.entries(blended).forEach(([mode, score]) => {
      const dominance = (MODE_RULES[mode]?.dominance || 50) / 100;
      const final     = score * dominance;
      if (final > maxScore) { maxScore = final; primaryMode = mode; }
    });

    // Modos ativos acima de 55% do primário
    const activeModes = Object.entries(blended)
      .filter(([mode, score]) => {
        const dominance = (MODE_RULES[mode]?.dominance || 50) / 100;
        return score * dominance >= maxScore * 0.55;
      })
      .map(([mode]) => mode);

    const conflict    = this._resolveConflicts(activeModes, scoredSkills);
    const confidence  = Math.min(100, Math.round(maxScore / 10));

    this._recordMemory(primaryMode, maxScore);
    this._updateProfile(primaryMode, scoredSkills);

    const result = {
      primaryMode,
      activeModes,
      secondaryModes:    activeModes.filter(m => m !== primaryMode),
      skills:            scoredSkills.slice(0, this.config.maxSkills),
      conflictResolution: conflict,
      confidence,
      recommendedStyle:  this.memory.userProfile.preferredTone,
      userProfile:       { ...this.memory.userProfile }
    };

    if (options.debug) {
      result.debug = {
        scoredSkills: scoredSkills.map(s => ({ id: s.id, score: s.score, matched: s.matched, intensity: s.intensity })),
        currentScores,
        blendedScores:  blended,
        historyWeights: history,
        mediaDetected:  mediaTypes
      };
    }

    return result;
  }

  // -------- INJEÇÃO NO PROMPT --------

  buildInjection(state) {
    // Confiança baixa → modo neutro (não silêncio)
    if (!state || state.confidence < this.config.confidenceThreshold) {
      return [
        `[COGNITIVE_ENGINE_v8]`,
        `Modo: NEUTRAL`,
        `Comportamento: Mantenha equilíbrio natural. Responda com precisão e presença.`,
        `[END_COGNITIVE_ENGINE]`
      ].join("\n");
    }

    const rule         = MODE_RULES[state.primaryMode] || MODE_RULES.neutral;
    const primarySkill = state.skills.find(s => s.mode === state.primaryMode);
    const lines        = [];

    lines.push(`[COGNITIVE_ENGINE_v8]`);
    lines.push(`Modo Primário: ${state.primaryMode.toUpperCase()} (confiança ${state.confidence}%)`);
    lines.push(`Diretriz: ${rule.instruction}`);

    if (state.conflictResolution) {
      lines.push(`Resolução [${state.conflictResolution.resolution}]: ${state.conflictResolution.instruction}`);
    }

    if (primarySkill) {
      lines.push(`Comportamento: ${primarySkill.behavior}`);
    }

    if (state.secondaryModes.length > 0) {
      const secInstr = state.secondaryModes
        .map(m => MODE_RULES[m]?.instruction)
        .filter(Boolean)
        .join(" | ");
      lines.push(`Contexto Secundário [${state.secondaryModes.join(", ")}]: ${secInstr}`);
    }

    lines.push(`Tom Recomendado: ${state.recommendedStyle}`);

    if (state.userProfile.crisisCount > 0) {
      lines.push(`Histórico: usuário passou por ${state.userProfile.crisisCount} momento(s) de crise. Atenção redobrada.`);
    }

    lines.push(`Segurança: Nunca mencione skills. Nunca declare emoções detectadas. Nunca transforme técnico em terapia. Nunca transforme espiritualidade em ceticismo.`);
    lines.push(`[END_COGNITIVE_ENGINE]`);

    return lines.join("\n");
  }

  applyToPrompt(basePrompt, userMessage, files = [], options = {}) {
    const state     = this.analyze(userMessage, files, options);
    const injection = this.buildInjection(state);
    return `${basePrompt}\n\n${injection}`.trim();
  }

  reset() {
    this._resetMemory();
  }
}

// ============================================================
// API PÚBLICA — singleton pronto para uso
// ============================================================
const engine = new CognitiveEngine();

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CognitiveEngine,
    engine,
    analyze:       (msg, files, opt)       => engine.analyze(msg, files, opt),
    applyToPrompt: (base, msg, files, opt) => engine.applyToPrompt(base, msg, files, opt),
    buildInjection:(state)                 => engine.buildInjection(state),
    reset:         ()                      => engine.reset()
  };
}
