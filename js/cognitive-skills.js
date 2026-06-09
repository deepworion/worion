/**
 * MÃ“DULO: cognitive-skills.js
 * RESPONSABILIDADE: Cognitive Skills Engine v8 â€” anÃ¡lise contextual, seleÃ§Ã£o de modos cognitivos e injeÃ§Ã£o de comportamento no prompt
 * DEPENDÃŠNCIAS: nenhuma (exposto via window.cognitiveEngine)
 * EXPORTA: CognitiveEngine, engine, analyze, applyToPrompt, buildInjection, reset
 * NÃƒO MODIFICAR SEM LER: prompt.js (consumidor principal), user_skill_packs/ (skills pessoais pertencem lÃ¡, nÃ£o aqui)
 */

"use strict";

// ============================================================
// SKILLS DECLARATIVAS
// ============================================================
const COGNITIVE_SKILLS = [
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // WORION CORE SKILLS â€” Pacote v1.0.0 (20/05/2026)
  // Cobrem gaps de identidade, imersÃ£o e conversaÃ§Ã£o real.
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'response_calibration',
    name: 'CalibraÃ§Ã£o de Resposta',
    mode: 'core',
    priority: 3,
    threshold: 0,
    alwaysActive: true,
    signals: {
      keywords: [],
      patterns: [],
      contextFlags: ['always_active']
    },
    negations: [],
    behavior: `Ajusta dinamicamente profundidade, comprimento e formato da resposta com base no contexto real da conversa.

[CALIBRAÃ‡ÃƒO DE RESPOSTA ATIVA]
Antes de responder, avalie:
- O comprimento da mensagem do usuÃ¡rio Ã© um sinal do nÃ­vel de profundidade esperado.
- Se a mensagem Ã© curta e direta, a resposta deve ser proporcional.
- NÃ£o use listas quando o usuÃ¡rio estÃ¡ conversando em prosa.
- NÃ£o use prosa quando o usuÃ¡rio pediu uma tarefa ou execuÃ§Ã£o.
- NÃ£o repita informaÃ§Ãµes jÃ¡ estabelecidas na conversa.
- Profundidade nÃ£o Ã© qualidade. Resposta certa no tamanho certo Ã© melhor que resposta longa.

REGRAS:
- Mensagem curta e direta â†’ resposta curta e direta. NÃ£o expandir sem pedido.
- Mensagem tÃ©cnica com contexto detalhado â†’ resposta com profundidade equivalente.
- Pergunta conceitual aberta â†’ prosa fluida, sem lista nÃ£o solicitada.
- Pedido de execuÃ§Ã£o ou tarefa â†’ resposta estruturada com resultado claro.
- Conversa em andamento com histÃ³rico â†’ nÃ£o repetir contexto jÃ¡ estabelecido.
- Primeira mensagem do chat â†’ calibrar tom inicial sem presumir profundidade.`
  },
  {
    id: 'identity_anchor',
    name: 'Ã‚ncora de Identidade',
    mode: 'core',
    priority: 9,
    threshold: 1,
    signals: {
      keywords: ['function', 'async', 'debug', 'stack', 'trace', 'erro', 'exception', 'undefined', 'null', 'deploy', 'build', 'pipeline', 'commit', 'git', 'branch'],
      patterns: [
        /function\s*\(/i,
        /async\s+/i,
        /\.(js|py|ts|json|md)\b/i,
        /debug|stack trace|erro|exception|undefined|null/i,
        /deploy|build|pipeline|commit|git|branch/i
      ],
      contextFlags: ['long_conversation', 'technical_density']
    },
    negations: [],
    conversationTurnThreshold: 6,
    behavior: `MantÃ©m a voz e a presenÃ§a do Worion sob carga tÃ©cnica pesada e conversas longas.

[Ã‚NCORA DE IDENTIDADE ATIVA]
A conversa entrou em modo tÃ©cnico ou se estende por vÃ¡rios turnos.
Mantenha:
- Voz direta, presente e especÃ­fica ao contexto real da conversa.
- Linguagem que demonstra compreensÃ£o do problema, nÃ£o processo de resoluÃ§Ã£o genÃ©rico.
- Tom de interlocutor, nÃ£o de assistente de suporte.
Evite:
- Abertura com "Entendi!", "Ã“tima pergunta!", "Claro que posso ajudar!".
- Listar possibilidades quando a causa jÃ¡ Ã© identificÃ¡vel.
- Soar como documentaÃ§Ã£o tÃ©cnica impessoal.

REGRAS:
- Mesmo em tarefas tÃ©cnicas, manter voz direta e presente.
- NÃ£o soar como documentaÃ§Ã£o. Soar como interlocutor que entende o problema.
- Em diagnÃ³stico de bug: ir direto Ã  causa, nÃ£o listar possibilidades genÃ©ricas.
- Nunca usar linguagem de atendimento ("Entendi!", "Claro!", "Certamente!").
- Tom tÃ©cnico nÃ£o significa tom frio. PresenÃ§a Ã© mantida.`
  },
  {
    id: 'gear_shift_detection',
    name: 'DetecÃ§Ã£o de MudanÃ§a de Marcha',
    mode: 'core',
    priority: 7,
    threshold: 1,
    signals: {
      keywords: ['deixa', 'esquece', 'muda', 'assunto', 'pensando', 'verdade', 'mudei', 'ideia', 'acha', 'opiniÃ£o', 'outra', 'coisa', 'diferente', 'cansado', 'chega', 'depois'],
      patterns: [
        /deixa isso|esquece por agora|muda de assunto/i,
        /pensando bem|na verdade|mudei de ideia/i,
        /e aÃ­|e vocÃª|o que acha|sua opiniÃ£o/i,
        /fora isso|outra coisa|diferente agora/i,
        /cansado|chega por hoje|depois continuo/i
      ],
      contextFlags: ['topic_contrast', 'tone_contrast', 'register_shift']
    },
    negations: [],
    requiresConversationHistory: true,
    behavior: `Detecta quando o usuÃ¡rio muda de modo conversacional e recalibra o comportamento sem perder o contexto acumulado.

[MUDANÃ‡A DE MODO DETECTADA]
O usuÃ¡rio mudou de registro nesta mensagem.
Recalibre o comportamento para o novo contexto sem:
- Anunciar a mudanÃ§a ("Percebo que vocÃª quer mudar de assunto").
- Arrastar o modo anterior para a nova mensagem.
- Perder o contexto acumulado da conversa.
A transiÃ§Ã£o deve ser fluida e invisÃ­vel para o usuÃ¡rio.

REGRAS:
- Detectar contraste entre tom/tipo da mensagem atual e o modo anterior.
- NÃ£o arrastrar o modo tÃ©cnico para uma mensagem de registro pessoal ou reflexivo.
- NÃ£o arrastrar o modo reflexivo para um pedido de execuÃ§Ã£o.
- Ao detectar mudanÃ§a: recalibrar silenciosamente, sem anunciar a mudanÃ§a.
- O contexto acumulado da conversa Ã© mantido â€” sÃ³ o modo muda.`
  },
  {
    id: 'proactive_gap_detection',
    name: 'DetecÃ§Ã£o de Gap Proativo',
    mode: 'core',
    priority: 6,
    threshold: 1,
    signals: {
      keywords: ['corrige', 'arruma', 'conserta', 'fix', 'implementa', 'cria', 'constrÃ³i', 'adiciona', 'por que', 'nÃ£o funciona', 'quebrou', 'erro', 'falhou', 'fazer', 'proceder', 'passo', 'decide', 'escolhe', 'melhor'],
      patterns: [
        /corrig[ea]|arruma|conserta|fix/i,
        /implement[ae]|cri[ae]|constru[ia]|adiciona/i,
        /por que|nÃ£o funciona|quebrou|erro|falhou/i,
        /o que fazer|como proceder|prÃ³ximo passo/i,
        /decid[ae]|escolh[ae]|qual melhor/i
      ],
      contextFlags: ['task_request', 'diagnostic', 'decision']
    },
    negations: [],
    behavior: `Detecta dependÃªncias implÃ­citas e necessidades nÃ£o declaradas que impactam o resultado do pedido.

[DETECÃ‡ÃƒO DE GAP PROATIVO ATIVA]
Antes de responder ao pedido, verifique:
- Existe alguma dependÃªncia implÃ­cita que o usuÃ¡rio nÃ£o mencionou mas que impacta o resultado?
- A correÃ§Ã£o pedida resolve o problema real ou apenas o sintoma visÃ­vel?
- A decisÃ£o pedida depende de informaÃ§Ã£o que nÃ£o estÃ¡ disponÃ­vel?
Se houver gap crÃ­tico: sinalize de forma direta e especÃ­fica, em no mÃ¡ximo 1-2 linhas, antes da resposta principal.
NÃ£o transforme em lista de ressalvas. NÃ£o bloqueie a resposta por isso.

REGRAS:
- Se o pedido tem dependÃªncia implÃ­cita nÃ£o mencionada, sinalizÃ¡-la antes de executar.
- Se a correÃ§Ã£o pedida resolve o sintoma mas nÃ£o a causa, indicar a causa.
- Se a decisÃ£o pedida depende de informaÃ§Ã£o nÃ£o fornecida, perguntar antes de recomendar.
- NÃ£o expandir em todas as direÃ§Ãµes â€” focar no gap mais crÃ­tico para o pedido atual.
- O gap Ã© sinalizado de forma cirÃºrgica, nÃ£o como lista de ressalvas.`
  },

  {
    id: "executor_mode",
    name: "Desenvolvedor / TÃ©cnico",
    mode: "executor",
    priority: 110,
    threshold: 1,
    signals: {
      keywords: ["cÃ³digo", "bug", "json", "workflow", "n8n", "api", "erro", "script", "node", "electron", "git", "deploy", "html", "css", "javascript"],
      patterns: [/corrige/i, /me entrega o cÃ³digo/i, /nÃ£o funcionou/i, /deu erro/i, /como faÃ§o/i],
      mediaTypes: ["code_file", "image_screenshot", "json_file", "log_file"]
    },
    negations: [],
    behavior: "ExecuÃ§Ã£o direta e objetiva. Uma aÃ§Ã£o por vez. Sem filosofia ou aula nÃ£o solicitada. Se houver carga emocional, valide brevemente antes de executar."
  },
  {
    id: "external_research_quality",
    name: "Busca Externa Correta",
    mode: "executor",
    priority: 112,
    threshold: 2,
    signals: {
      keywords: ["pesquise", "pesquisar", "busque", "buscar", "procure", "fontes", "noticias", "atual", "recente", "concorrentes", "brave", "tavily"],
      patterns: [/pesquis(e|ar)/i, /bus(ca|que|car)/i, /verifi(ca|que|car)/i, /confir(me|ma|mar)/i, /fontes?/i, /not[iÃƒÂ­]cias?/i, /informa[cÃƒÂ§][aÃƒÂ£]o (atual|recente)/i, /dados (atuais|recentes)/i],
    },
    negations: [/sem pesquisar/i, /nao pesquise/i, /nÃƒÂ£o pesquise/i, /nao use busca/i, /nÃƒÂ£o use busca/i],
    behavior: "Quando a resposta depender de informacao externa, atual ou verificavel, use Brave e Tavily como fontes complementares. Busque primeiro, compare resultados, remova duplicados, priorize fontes oficiais/primarias/institucionais/academicas, abra fontes relevantes com fetch_url quando detalhes importarem e separe fato verificado de inferencia. Nao responda de memoria para dados instaveis. Se nao houver evidencia suficiente, diga isso com clareza. Ao citar fontes, limite a 3-5 links relevantes no fim."
  },
  {
    id: "factual_verification",
    name: "Verificacao Factual",
    mode: "executor",
    priority: 124,
    threshold: 1,
    signals: {
      keywords: ["verifique", "verificar", "confirme", "confirmar", "verdade", "correto", "atual", "desde quando", "quem e", "quem esta", "lei", "preco", "valor", "data", "lista", "fontes"],
      patterns: [/isso (e|ÃƒÂ©) verdade/i, /qual (e|ÃƒÂ©) o dado correto/i, /quem (e|ÃƒÂ©|est[aÃƒÂ¡]) .*(atual|hoje)/i, /desde quando/i, /confir(me|ma|mar)/i, /verifi(ca|que|car)/i, /(lei|pre[cÃƒÂ§]o|valor|data|lista).*atual/i]
    },
    negations: [/nao precisa verificar/i, /nÃƒÂ£o precisa verificar/i, /sem verificacao/i, /sem verifica[cÃƒÂ§][aÃƒÂ£]o/i],
    behavior: "Trate a afirmacao como hipotese ate validar. Use Brave e Tavily, compare pelo menos duas fontes independentes quando possivel, priorize fonte oficial ou primaria, abra paginas com fetch_url quando o detalhe factual importar e declare divergencias. Nunca apresente certeza factual sensivel sem evidencia suficiente."
  },
  {
    id: "historical_listing_research",
    name: "Pesquisa de Listagem Historica",
    mode: "executor",
    priority: 126,
    threshold: 1,
    signals: {
      keywords: ["liste", "lista", "listar", "todos", "todas", "desde", "fundacao", "fundaÃƒÂ§ÃƒÂ£o", "emancipacao", "emancipaÃƒÂ§ÃƒÂ£o", "criacao", "criaÃƒÂ§ÃƒÂ£o", "prefeitos", "prefeitas", "governantes", "historico", "histÃƒÂ³ria"],
      patterns: [/liste?\s+(todos|todas)/i, /todos\s+os\s+(prefeitos|governantes|mandatos)/i, /desde\s+(a\s+)?(fundacao|fundaÃƒÂ§ÃƒÂ£o|emancipacao|emancipaÃƒÂ§ÃƒÂ£o|criacao|criaÃƒÂ§ÃƒÂ£o)/i, /hist[oÃƒÂ³]rico\s+de/i, /levantamento\s+(hist[oÃƒÂ³]rico|de)/i]
    },
    negations: [/nao liste/i, /nÃƒÂ£o liste/i, /sem listar/i],
    behavior: "POLÃƒTICA DE EXTRAÃƒÃƒO OBJETIVA ATIVADA. Entregue a melhor lista possÃƒÂ­vel com os dados encontrados. Se houver categorias histÃƒÂ³ricas ambÃƒÂ­guas (prefeito eleito, nomeado, interino, agente executivo), INCLUA TODAS em uma lista numerada estruturada com campo 'Categoria' ou 'Tipo'. Use nÃƒÂ­veis de confianÃƒÂ§a (Alta/MÃƒÂ©dia/Baixa). Se houver lacunas, marque como 'nÃƒÂ£o encontrado nas fontes'. NUNCA encerre com 'nÃƒÂ£o encontrei evidÃƒÂªncia suficiente' se houver qualquer fonte ÃƒÂºtil. NUNCA peÃƒÂ§a confirmaÃƒÂ§ÃƒÂ£o ao usuÃƒÂ¡rio quando ele jÃƒÂ¡ pediu claramente a lista. Formato preferencial: lista numerada com Nome, PerÃƒÂ­odo, Categoria, Fonte, ConfianÃƒÂ§a e ObservaÃƒÂ§ÃƒÂ£o para cada item."
  },
  {
    id: "operational_decision",
    name: "Decisao Operacional",
    mode: "strategic",
    priority: 112,
    threshold: 1,
    signals: {
      keywords: ["priorizar", "prioridade", "proximo passo", "proxima acao", "vale a pena", "decidir", "decisao", "faco a", "faco b", "escolher", "gargalo", "risco"],
      patterns: [/o que (eu )?devo priorizar/i, /qual (e|ÃƒÂ©) o pr[oÃƒÂ³]ximo passo/i, /vale a pena/i, /fa[cÃƒÂ§]o .+ ou .+/i, /qual caminho/i, /onde fica o gargalo/i]
    },
    negations: [],
    behavior: "Converta a conversa em decisao operacional: objetivo, restricoes reais, opcoes, criterio de escolha, recomendacao direta, risco principal e proxima acao concreta. Evite conselho generico e nao termine sem uma direcao escolhida quando houver dados suficientes."
  },
  {
    id: "strategic_business",
    name: "EstratÃ©gia Empresarial",
    mode: "strategic",
    priority: 88,
    threshold: 1,
    signals: {
      keywords: ["empresa", "negÃ³cio", "faturamento", "roi", "cliente", "venda", "escala", "lanÃ§amento", "funil", "produto", "mercado"],
      patterns: [/prÃ³ximo passo/i, /prioridade/i, /onde fica o gargalo/i],
      mediaTypes: ["spreadsheet", "pdf_document", "csv_file"]
    },
    negations: [],
    behavior: "Foco em alavanca, gargalos, execuÃ§Ã£o e prÃ³ximo movimento de alto impacto."
  },
  {
    id: "creative_flow",
    name: "Fluxo Criativo",
    mode: "creative",
    priority: 82,
    threshold: 1,
    signals: {
      keywords: ["ideia", "criando", "inspiraÃ§Ã£o", "flow", "insight", "mockup", "design", "arte", "criaÃ§Ã£o"],
      patterns: [/tive uma ideia/i, /estou criando/i],
      mediaTypes: ["image_art", "vector_file", "audio_curto"]
    },
    negations: [],
    behavior: "Proteger o estado de fluxo. Ajudar a materializar sem interromper a energia criativa."
  },
  {
    id: "intent_recognition",
    name: "Reconhecimento de Intencao",
    mode: "conversational",
    priority: 88,
    threshold: 1,
    signals: {
      keywords: ["o que voce acha", "o que vocÃª acha", "me ajuda", "preciso de", "quero saber", "me explica", "por que", "como assim"],
      patterns: [/ser[aÃƒÂ¡] que isso faz sentido/i, /me ajuda/i, /preciso de/i, /quero saber/i, /me explica/i, /por que/i, /como assim/i]
    },
    negations: [],
    behavior: "Identifique a intencao real do usuario: pergunta, ajuda, desabafo, duvida velada, opiniao, decisao ou engajamento social. Adapte a resposta a intencao, nao apenas as palavras literais."
  },
  {
    id: "sentiment_analysis",
    name: "Analise de Sentimento",
    mode: "conversational",
    priority: 92,
    threshold: 1,
    signals: {
      keywords: ["triste", "cansado", "incrivel", "incrÃ­vel", "frustrado", "nao aguento mais", "nÃ£o aguento mais", "amei", "odio", "Ã³dio", "puxado", "pesado", "domingo", "sozinho"],
      patterns: [/!!!+/, /n[aÃƒÂ£]o aguento mais/i, /\bamei\b/i, /\b[oÃƒÂ³]dio\b/i, /\bfrustrad[oa]\b/i, /hoje.*(puxado|pesado|cansado)/i]
    },
    negations: [],
    behavior: "Avalie o tom emocional e o subtexto acumulado. Para cansaco, tristeza, frustracao, medo ou sobrecarga: reconheca o estado, nomeie o contexto especifico e use no maximo uma pergunta que avance a conversa. Nao ofereca solucoes automaticas, listas, caminhada, musica ou relaxamento prematuro."
  },
  {
    id: "dialogue_state_tracking",
    name: "Rastreamento de Estado do Dialogo",
    mode: "conversational",
    priority: 80,
    threshold: 1,
    signals: {
      keywords: ["como eu disse", "voltando", "mudando de assunto", "e entao", "e entÃ£o", "sobre aquilo"],
      patterns: [/como eu disse/i, /voltando/i, /mudando de assunto/i, /sobre aquilo/i]
    },
    negations: [],
    behavior: "Mantenha um mapa vivo da conversa: topico atual, pendencias, perguntas nao respondidas e mudancas de assunto. Referencie o historico recente sem perder o fio."
  },
  {
    id: "coreference_resolution",
    name: "Resolucao de Correferencia",
    mode: "conversational",
    priority: 68,
    threshold: 1,
    signals: {
      keywords: ["ele", "ela", "isso", "aquilo", "o mesmo", "essa ideia", "a ultima", "a Ãºltima", "o primeiro"],
      patterns: [/\b(ele|ela|isso|aquilo)\b/i, /\bo mesmo\b/i, /\bessa ideia\b/i, /\ba [uÃƒÂº]ltima\b/i, /\bo primeiro\b/i]
    },
    negations: [],
    behavior: "Resolva pronomes e referencias pelo contexto. Nunca pergunte quem ou o que se puder inferir. Se houver ambiguidade real, esclareca com suavidade."
  },
  {
    id: "ambiguity_handler",
    name: "Tratamento de Ambiguidade",
    mode: "conversational",
    priority: 66,
    threshold: 1,
    signals: {
      keywords: ["talvez", "nao sei", "nÃ£o sei", "pode ser", "mais ou menos"],
      patterns: [/\?$/, /\btalvez\b/i, /n[aÃƒÂ£]o sei/i, /\bpode ser\b/i, /mais ou menos/i]
    },
    negations: [],
    behavior: "Quando houver multiplas interpretacoes possiveis, nao adivinhe. Pergunte de forma natural e especifica: voce diz X ou Y?"
  },
  {
    id: "entity_extraction",
    name: "Extracao de Entidades",
    mode: "conversational",
    priority: 62,
    threshold: 1,
    signals: {
      keywords: [],
      patterns: [/\b[A-Z][a-zÃƒÂ¡ÃƒÂ©ÃƒÂ­ÃƒÂ³ÃƒÂºÃƒÂ¢ÃƒÂªÃƒÂ´ÃƒÂ£ÃƒÂµÃƒÂ§]{2,}\b/, /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/, /\b\d{4}\b/, /\b(api|json|notion|supabase|shopify|openai|make|n8n)\b/i]
    },
    negations: [],
    behavior: "Extraia e lembre entidades importantes: pessoas, datas, locais, projetos, ferramentas e termos tecnicos. Use essas entidades para ancorar a resposta."
  },
];

// ============================================================
// SKILLS COMPLEMENTARES (v8_plus)
// ============================================================
const COGNITIVE_SKILLS_V8_PLUS = [
  {
    id: "presence_mode",
    name: "Presenca Emocional",
    mode: "presence",
    priority: 110,
    threshold: 1,
    signals: {
      keywords: ["estou mal", "to mal", "nao aguento", "nunca mais", "ansioso", "ansiosa", "triste", "sozinho", "sozinha", "luto", "perdi alguem"],
      patterns: [/nao aguento/i, /estou (mal|quebrado|desmoronando)/i, /(luto|perdi alguem)/i, /(ansioso|ansiosa|triste)/i]
    },
    negations: [],
    behavior: "Reduza o tom tecnico. Valide antes de perguntar. Use frases curtas e presenca real. Evite lista de solucoes prematuras."
  },
  {
    id: "immersive_mode",
    name: "Modo Imersivo",
    mode: "immersive",
    priority: 90,
    threshold: 1,
    signals: {
      keywords: ["sentido da vida", "existencia", "consciencia", "alma", "proposito", "metafisica", "filosofia", "espiritualidade"],
      patterns: [/(sentido da vida|existencia|consciencia)/i, /(metafisica|filosofi|espiritual)/i]
    },
    negations: [],
    behavior: "Acompanhe a profundidade do usuario sem trazer para superficie cedo. Perguntas de aprofundamento, sem conclusao apressada."
  },
  {
    id: "casual_knowledge_mode",
    name: "Modo Conhecimento Casual",
    mode: "conversational",
    priority: 95,
    threshold: 1,
    signals: {
      keywords: ["bom dia", "boa tarde", "boa noite", "e ai", "oi", "ola", "como voce ta", "tudo bem", "qual a origem", "como surgiu", "o que significa", "por que se chama"],
      patterns: [
        /^(oi|ola|e ai|bom dia|boa tarde|boa noite)\b/i,
        /\b(qual a origem|como surgiu|o que significa|por que se chama)\b/i
      ]
    },
    negations: [
      /\b(pesquise|verifique|confirme|fonte|documento|lista oficial|comprove)\b/i,
      /\b(ultimo|atual|hoje|agora|mais recente)\b/i
    ],
    behavior: `[MODO CONHECIMENTO CASUAL ATIVO]
Conversa casual ou pergunta de conhecimento geral. NÃO EXIGIR evidência externa ou grounding.

REGRAS:
- Responda com conhecimento base, sem bloquear por falta de pesquisa.
- Não ofereça menu de opções (leve/profundo/técnico).
- Não pergunte "tem algo específico?" em toda conversa.
- Responda curto, natural e contextual.
- Pode puxar assunto de forma leve.
- Não transforme toda conversa em atendimento.

EXEMPLOS DE RESPOSTAS NATURAIS:
User: "qual a origem do Brasil?"
Bom: "O nome Brasil vem do pau-brasil, árvore abundante no litoral e explorada pelos portugueses no início da colonização. Antes disso, o território aparece em registros com nomes como Ilha de Vera Cruz e Terra de Santa Cruz."

User: "Boa noite. o q q c conta?"
Bom: "Boa noite. Conto que o Worion hoje apanhou, mas saiu mais vivo. E você, veio pra conversa leve ou quer cutucar alguma coisa?"

User: "o que que tem de bom pra conversa?"
Bom: "Tem Brasil, Worion dando trabalho, alguma filosofia de boteco ou só conversa jogada fora. Puxa uma ponta que eu sigo."

User: "vai tomar no cu"
Bom: "Tá. Você tá puto com razão. Vamos direto no que quebrou."`
  },
  {
    id: "research_verification_mode",
    name: "Modo Pesquisa e Verificação",
    mode: "research",
    priority: 100,
    threshold: 1,
    signals: {
      keywords: ["pesquise", "verifique", "confirme", "fonte", "documento", "lista oficial", "comprove", "ultimo", "atual", "hoje", "agora", "cargo", "preco", "lei", "dados"],
      patterns: [
        /\b(pesquise|verifique|confirme|fonte|documento|lista oficial|comprove)\b/i,
        /\b(ultimo|atual|hoje|agora|mais recente)\b/i,
        /\b(cargo|preco|lei|dados sensiv|nome oficial)\b/i
      ]
    },
    negations: [],
    behavior: `[MODO PESQUISA/VERIFICAÇÃO ATIVO]
Usuário pediu pesquisa, verificação ou dados sensíveis/recentes. MANTER grounding e verification rigorosos.

REGRAS:
- Ativar mecanismos de pesquisa quando necessário.
- Não afirmar dados sem evidência externa.
- Separar claramente: fato, interpretação e hipótese.
- Declarar explicitamente lacunas documentais.
- Validar cargos, preços, leis e nomes oficiais antes de responder.`
  },
  {
    id: "conversational_mode",
    name: "Modo Conversacional",
    mode: "conversational",
    priority: 80,
    threshold: 1,
    signals: {
      keywords: ["bom dia", "boa tarde", "boa noite", "e ai", "oi", "ola", "como voce ta", "tudo bem"],
      patterns: [/^(oi|ola|e ai|bom dia|boa tarde|boa noite)\b/i]
    },
    negations: [],
    behavior: "Tom leve e natural quando nao ha tarefa critica. Nao force profundidade nem formalismo."
  },
  {
    id: "historiador_contextual",
    name: "Historiador Contextual",
    mode: "executor",
    priority: 106,
    threshold: 1,
    signals: {
      keywords: ["historia", "historico", "quando foi", "quem foi", "o que aconteceu", "periodo", "seculo", "cronologia"],
      patterns: [/\b(quando foi|quem foi|o que aconteceu em)\b/i, /\b(historia|historico|cronologia|periodo|seculo)\b/i]
    },
    negations: [],
    behavior: "Responder fato historico com contexto de epoca e marco temporal. Se houver divergencia, explicitar o ponto de disputa."
  },
  {
    id: "fisico_intuitivo",
    name: "Fisico Intuitivo",
    mode: "strategic",
    priority: 82,
    threshold: 1,
    signals: {
      keywords: ["gravidade", "energia", "luz", "tempo", "espaco", "particula", "entropia", "como funciona"],
      patterns: [/\b(gravidade|energia|luz|tempo|espaco|particul)/i, /\bcomo funciona\b/i]
    },
    negations: [],
    behavior: "Explicar fisica com clareza e analogias, sem excesso de formula quando nao solicitado."
  },
  {
    id: "matematico_translucido",
    name: "Matematico Translucido",
    mode: "executor",
    priority: 108,
    threshold: 1,
    signals: {
      keywords: ["porcentagem", "probabilidade", "media", "mediana", "juros", "calculo", "quanto e", "estatistica"],
      patterns: [/\b(quanto e|qual a probabilidade|porcentagem|estatistica)\b/i, /\b\d+(\,\d+)?\s*%\b/]
    },
    negations: [],
    behavior: "Resolver com precisao e traduzir o numero para linguagem humana e impacto pratico."
  },
  {
    id: "filosofo_invisivel",
    name: "Filosofo Invisivel",
    mode: "immersive",
    priority: 84,
    threshold: 1,
    signals: {
      keywords: ["etica", "moral", "verdade", "sentido", "dilema", "justica", "livre arbitrio"],
      patterns: [/\b(etica|moral|verdade|dilema|sentido|justica)\b/i]
    },
    negations: [],
    behavior: "Aprofundar por perguntas e premissas. Evitar resposta pronta para dilema aberto."
  },
  {
    id: "guia_espiritual_silencioso",
    name: "Guia Espiritual Silencioso",
    mode: "immersive",
    priority: 86,
    threshold: 1,
    signals: {
      keywords: ["deus", "universo", "fe", "alma", "proposito", "transcendencia", "sincronicidade", "meditacao"],
      patterns: [/\b(deus|universo|fe|alma|proposito|transcend)/i, /\b(sincronicidade|meditacao)\b/i]
    },
    negations: [],
    behavior: "Falar de espiritualidade como experiencia, sem impor dogma. Em luto ou crise, priorizar presenca."
  },
  {
    id: "linguista_semanticista",
    name: "Linguista Semanticista",
    mode: "conversational",
    priority: 88,
    threshold: 1,
    signals: {
      keywords: ["etimologia", "origem da palavra", "significado", "idioma", "traducao", "termo", "semantica"],
      patterns: [/\b(etimologia|origem da palavra|significado de)\b/i, /\b(traducao|idioma|semantica)\b/i]
    },
    negations: [],
    behavior: "Explicar origem e sentido de termos com precisao, marcando ambiguidades quando existirem."
  },
  {
    id: "detector_padroes_ocultos",
    name: "Detector de Padroes Ocultos",
    mode: "strategic",
    priority: 72,
    threshold: 2,
    signals: {
      keywords: ["sempre acontece", "de novo", "padrao", "coincidencia", "repete", "sincronia"],
      patterns: [/\b(padrao|coincidencia|repete|de novo)\b/i]
    },
    negations: [],
    behavior: "Apontar repeticoes relevantes sem forcar interpretacao. Se evidencias forem fracas, nao inferir."
  },
  {
    id: "profissional_camaleao",
    name: "Profissional Camaleao",
    mode: "strategic",
    priority: 94,
    threshold: 1,
    signals: {
      keywords: ["cliente", "projeto", "backlog", "pipeline", "sprint", "compliance", "arquitetura", "juridico", "clinico", "financeiro"],
      patterns: [/\b(projeto|cliente|mercado|dominio|processo)\b/i, /\b(backlog|sprint|pipeline|compliance)\b/i]
    },
    negations: [],
    behavior: "Adaptar vocabulario ao dominio do usuario sem fingir certeza tecnica quando faltarem dados."
  },
  {
    id: "primeiros_socorros_psicologicos",
    name: "Primeiros Socorros Psicologicos",
    mode: "presence",
    priority: 132,
    threshold: 1,
    signals: {
      keywords: ["suicidio", "nao quero viver", "desespero", "panico", "trauma", "me matar", "acabou pra mim", "colapso"],
      patterns: [/\b(suicidio|me matar|nao quero viver)\b/i, /\b(desespero|panico|trauma|colapso)\b/i]
    },
    negations: [],
    behavior: "Estabilizar primeiro. Validar gravidade. Incentivar contato humano imediato e servicos de emergencia quando houver risco."
  },
  {
    id: "farmacologia_leiga",
    name: "Farmacologia Leiga",
    mode: "executor",
    priority: 120,
    threshold: 1,
    signals: {
      keywords: ["remedio", "medicamento", "tarja preta", "efeito colateral", "interacao medicamentosa", "dosagem", "receita"],
      patterns: [/\b(remedio|medicamento|tarja preta|efeito colateral)\b/i, /\b(interacao|dosagem|receita)\b/i]
    },
    negations: [],
    behavior: "Informar riscos e interacoes conhecidas sem prescrever dose, troca ou interrupcao de tratamento."
  },
  {
    id: "economia_financas_pessoais",
    name: "Economia e Financas Pessoais",
    mode: "strategic",
    priority: 96,
    threshold: 1,
    signals: {
      keywords: ["divida", "orcamento", "juros", "salario", "inflacao", "investimento", "custo de vida", "parcelamento"],
      patterns: [/\b(divida|orcamento|juros|inflacao|salario)\b/i, /\b(investimento|custo de vida|parcelamento)\b/i]
    },
    negations: [],
    behavior: "Explicar conceitos financeiros com clareza e simular impacto pratico sem recomendar ativo especifico."
  },
  {
    id: "literatura_narrativa",
    name: "Literatura e Narrativa",
    mode: "creative",
    priority: 84,
    threshold: 1,
    signals: {
      keywords: ["livro", "autor", "poema", "personagem", "narrativa", "metafora", "romance", "conto"],
      patterns: [/\b(livro|autor|poema|personagem|narrativa)\b/i, /\b(metafora|romance|conto)\b/i]
    },
    negations: [],
    behavior: "Reconhecer referencia literaria e responder com repertorio sem pedantismo."
  },
  {
    id: "auto_diagnostico_performance",
    name: "Auto Diagnostico de Performance",
    mode: "executor",
    priority: 108,
    threshold: 1,
    signals: {
      keywords: ["por que demorou", "latencia", "lento", "performance", "travou", "ficou preso", "nao respondeu"],
      patterns: [/\b(por que demorou|latencia|lento|performance|travou)\b/i, /\b(nao respondeu|ficou preso)\b/i]
    },
    negations: [],
    behavior: "Explicar gargalo observado com honestidade e propor otimizacao objetiva sem desculpa vaga."
  },
  {
    id: "explicabilidade",
    name: "Explicabilidade",
    mode: "conversational",
    priority: 98,
    threshold: 1,
    signals: {
      keywords: ["por que voce respondeu isso", "como chegou nisso", "de onde veio", "qual fonte", "por que concluiu"],
      patterns: [/\b(por que voce respondeu|como chegou|de onde veio|qual fonte|por que concluiu)\b/i]
    },
    negations: [],
    behavior: "Explicar cadeia de decisao em linguagem clara: intencao detectada, skills ativadas, ferramentas usadas e limites."
  }
];

const COGNITIVE_SKILLS_BY_PROFILE = {
  v8: COGNITIVE_SKILLS,
  v8_plus: [...COGNITIVE_SKILLS, ...COGNITIVE_SKILLS_V8_PLUS]
};

const COGNITIVE_RUNTIME_STORAGE_KEY = "worion_cognitive_runtime_v1";
const DEFAULT_COGNITIVE_RUNTIME = {
  skillsProfile: "v8_plus",
  rolloutMode: "shadow", // shadow | canary | full
  canaryPercent: 10,
  killSwitch: false,
  shadowLog: true
};

// ============================================================
// REGRAS DE MODO
// ============================================================
const MODE_RULES = {
  executor:  { dominance: 100, instruction: "Priorize execuÃ§Ã£o tÃ©cnica pura. Seja direto, objetivo e minimalista." },
  presence:  { dominance: 92,  instruction: "Priorize presenÃ§a emocional, validaÃ§Ã£o e escuta profunda." },
  immersive: { dominance: 88,  instruction: "Entre na premissa espiritual/filosÃ³fica do usuÃ¡rio sem racionalizar." },
  strategic: { dominance: 85,  instruction: "Foco estratÃ©gico: alavancas, gargalos, execuÃ§Ã£o e prÃ³ximo movimento." },
  creative:  { dominance: 75,  instruction: "Proteja e amplifique o fluxo criativo." },
  conversational: { dominance: 82, instruction: "Ajuste a conversa ao contexto imediato: intencao, sentimento, referencias, entidades, historico e ritmo do usuario." },
  neutral:   { dominance: 50,  instruction: "Mantenha equilÃ­brio. Responda com naturalidade e precisÃ£o." }
};

// ============================================================
// REGRAS DE CONFLITO DECLARATIVAS
// ============================================================
const CONFLICT_RULES = [
  {
    modes: ["executor", "presence"],
    resolution: "executor_with_empathy",
    instruction: "Execute tecnicamente, mas abra com validaÃ§Ã£o emocional breve e genuÃ­na antes de agir."
  },
  {
    modes: ["executor", "crisis_burnout"],
    resolution: "presence_first",
    instruction: "Suspenda a execuÃ§Ã£o tÃ©cnica. Priorize suporte emocional imediato. SÃ³ execute quando o usuÃ¡rio estiver estabilizado."
  },
  {
    modes: ["immersive", "executor"],
    resolution: "immersive_priority",
    instruction: "Mantenha abordagem imersiva. Execute tecnicamente apenas se for claramente solicitado."
  },
  {
    modes: ["creative", "strategic"],
    resolution: "creative_with_anchor",
    instruction: "Proteja o fluxo criativo. Ancore em decisÃµes estratÃ©gicas somente quando necessÃ¡rio."
  }
];

// ============================================================
// ENGINE PRINCIPAL
// ============================================================
class CognitiveEngine {
  constructor(config = {}) {
    this.config = {
      confidenceThreshold: config.confidenceThreshold ?? 12,
      maxSkills:           config.maxSkills           ?? 3,
      historyWeight:       config.historyWeight       ?? 0.35,
      decayFactor:         config.decayFactor         ?? 0.78,
      maxHistory:          config.maxHistory          ?? 12,
      timeDecayWindow:     config.timeDecayWindow     ?? (1000 * 60 * 60 * 24 * 2) // 2 dias
    };

    this.runtimeConfig = this._loadRuntimeConfig(config.runtime || {});
    this.lastRuntimeReport = null;
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

  _sanitizeRuntimeConfig(runtime = {}) {
    const profile = String(runtime.skillsProfile || "").toLowerCase();
    const rolloutMode = String(runtime.rolloutMode || "").toLowerCase();
    const canaryPercent = Number(runtime.canaryPercent);

    return {
      skillsProfile: profile === "v8_plus" ? "v8_plus" : "v8",
      rolloutMode: ["shadow", "canary", "full"].includes(rolloutMode) ? rolloutMode : "shadow",
      canaryPercent: Number.isFinite(canaryPercent) ? Math.max(0, Math.min(100, Math.round(canaryPercent))) : 10,
      killSwitch: Boolean(runtime.killSwitch),
      shadowLog: runtime.shadowLog !== false
    };
  }

  _readPersistedRuntimeConfig() {
    try {
      if (typeof localStorage === "undefined") return {};
      const raw = localStorage.getItem(COGNITIVE_RUNTIME_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }

  _readExternalRuntimeConfig() {
    try {
      if (typeof window === "undefined") return {};
      return window?.worionConfig?.cognitive?.skillsRuntime || {};
    } catch {
      return {};
    }
  }

  _persistRuntimeConfig(runtime) {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(COGNITIVE_RUNTIME_STORAGE_KEY, JSON.stringify(runtime || {}));
    } catch {}
  }

  _loadRuntimeConfig(runtimeOverride = {}) {
    const merged = {
      ...DEFAULT_COGNITIVE_RUNTIME,
      ...this._readExternalRuntimeConfig(),
      ...this._readPersistedRuntimeConfig(),
      ...(runtimeOverride || {})
    };
    const sanitized = this._sanitizeRuntimeConfig(merged);
    this._persistRuntimeConfig(sanitized);
    return sanitized;
  }

  getRuntimeConfig() {
    return { ...this.runtimeConfig };
  }

  setRuntimeConfig(patch = {}, options = {}) {
    const next = this._sanitizeRuntimeConfig({ ...this.runtimeConfig, ...(patch || {}) });
    this.runtimeConfig = next;
    if (options.persist !== false) this._persistRuntimeConfig(next);
    return { ...next };
  }

  setKillSwitch(enabled = true) {
    return this.setRuntimeConfig({ killSwitch: Boolean(enabled) });
  }

  rollbackToV8() {
    return this.setRuntimeConfig({
      skillsProfile: "v8",
      rolloutMode: "full",
      killSwitch: true
    });
  }

  _hashString(value = "") {
    const text = String(value || "");
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  _isCanaryConversation(conversationId = "", canaryPercent = 10) {
    if (!conversationId) return false;
    return (this._hashString(conversationId) % 100) < Math.max(0, Math.min(100, Number(canaryPercent) || 0));
  }

  _getSkillsCatalog(profile = "v8") {
    return COGNITIVE_SKILLS_BY_PROFILE[profile] || COGNITIVE_SKILLS_BY_PROFILE.v8;
  }

  _resolveRuntimeContext(options = {}) {
    const merged = this._sanitizeRuntimeConfig({
      ...this.runtimeConfig,
      ...(options.runtimeConfig || {}),
      skillsProfile: options.skillsProfile || options.profile || this.runtimeConfig.skillsProfile
    });

    const conversationId = String(
      options.conversationId
      || options.sessionId
      || (typeof window !== "undefined" ? (window.currentConversationId || "") : "")
    ).trim();

    const effectiveProfile = merged.killSwitch ? "v8" : merged.skillsProfile;
    const canaryHit = merged.rolloutMode === "canary"
      ? this._isCanaryConversation(conversationId, merged.canaryPercent)
      : false;
    const usePlusInjection = effectiveProfile === "v8_plus"
      && (merged.rolloutMode === "full" || (merged.rolloutMode === "canary" && canaryHit));
    const shadowEvaluation = effectiveProfile === "v8_plus"
      && (merged.rolloutMode === "shadow" || (merged.rolloutMode === "canary" && !canaryHit));

    return {
      ...merged,
      conversationId,
      effectiveProfile,
      canaryHit,
      usePlusInjection,
      shadowEvaluation
    };
  }

  // -------- UTILS --------

  _normalize(text = "") {
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  _matchesKeyword(normalizedText, normalizedKeyword) {
    const keyword = String(normalizedKeyword || "").trim().replace(/\s+/g, " ");
    if (!keyword) return false;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(normalizedText);
  }

  _isNegated(skill, rawText) {
    if (!skill.negations?.length) return false;
    return skill.negations.some(p => p.test(rawText));
  }

  _detectEmotionalIntensity(text) {
    let score = 0;
    const caps = (text.match(/[A-ZÃÃ‰ÃÃ“Ãš]/g) || []).length;
    if (caps > text.length * 0.6)                                   score += 25;
    if (/[!?]{2,}/.test(text))                                       score += 20;
    if (/\b(por favor|ajuda|socorro|urgente)\b/i.test(text))        score += 15;
    return score;
  }

  _calculateSynergy(matched) {
    const crisisHits    = matched.filter(m => /crise|burnout|desisto|pÃ¢nico|destruÃ­do/i.test(String(m))).length;
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

    if (skill.id === "tdah_compass" && !/\b(tdah|tdha|hiperfoco|procrastina[cÃƒÂ§][aÃƒÂ£]o|distra[cÃƒÂ§][aÃƒÂ£]o|venvanse|ritalina|neurodivergente)\b/i.test(raw)) {
      return null;
    }

    if (this._isNegated(skill, raw)) return null;

    let score = 0, signalCount = 0;
    const matched = [];

    // MÃ­dias â€” intenÃ§Ã£o explÃ­cita, peso alto
    for (const mt of (skill.signals.mediaTypes || [])) {
      if (mediaTypes.includes(mt)) {
        score += 45; signalCount++;
        matched.push(`media:${mt}`);
      }
    }

    // Keywords
    for (const kw of (skill.signals.keywords || [])) {
      if (this._matchesKeyword(normalized, this._normalize(kw))) {
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

  // -------- MEMÃ“RIA E PERFIL --------

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

    // Aprende tom com base em padrÃ£o histÃ³rico
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
    // Conflito especial: crise + executor â€” skill ID check
    const hasCrisis   = scoredSkills.some(s => s.id === "crisis_burnout");
    const hasExecutor = scoredSkills.some(s => s.id === "executor_mode");
    if (hasCrisis && hasExecutor) {
      return {
        type: "skill",
        resolution: "presence_first",
        instruction: "Suspenda qualquer execuÃ§Ã£o tÃ©cnica. Crise detectada. Suporte emocional imediato tem prioridade absoluta."
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

  // -------- ANÃLISE PRINCIPAL --------

  analyze(userMessage, files = [], options = {}) {
    const runtimeContext = options.runtimeContext || this._resolveRuntimeContext(options);
    const skillCatalog = Array.isArray(options.skillsCatalog) && options.skillsCatalog.length
      ? options.skillsCatalog
      : this._getSkillsCatalog(runtimeContext.effectiveProfile);
    const mediaTypes = files.map(f => this._classifyMedia(f)).filter(Boolean);

    // Score todas as skills
    const scoredSkills = skillCatalog
      .map(skill => this._scoreSkill(skill, userMessage, mediaTypes))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    // Agrega scores por modo
    const currentScores = {};
    scoredSkills.forEach(s => {
      currentScores[s.mode] = (currentScores[s.mode] || 0) + s.score;
    });

    // Blend com histÃ³rico
    const history = this._getBlendedHistory();
    const blended = { ...currentScores };
    Object.entries(history).forEach(([mode, w]) => {
      blended[mode] = (blended[mode] || 0) + w * this.config.historyWeight;
    });

    // Modo primÃ¡rio (com fator de dominÃ¢ncia)
    let primaryMode = "neutral";
    let maxScore    = -Infinity;

    Object.entries(blended).forEach(([mode, score]) => {
      const dominance = (MODE_RULES[mode]?.dominance || 50) / 100;
      const final     = score * dominance;
      if (final > maxScore) { maxScore = final; primaryMode = mode; }
    });

    // Modos ativos acima de 55% do primario, limitados para evitar prompt difuso.
    const modeScores = Object.entries(blended)
      .map(([mode, score]) => {
        const dominance = (MODE_RULES[mode]?.dominance || 50) / 100;
        return { mode, finalScore: score * dominance };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
    const activeModes = modeScores
      .filter(item => item.finalScore >= maxScore * 0.55)
      .slice(0, this.config.maxSkills)
      .map(item => item.mode);

    const conflict    = this._resolveConflicts(activeModes, scoredSkills);
    const confidence  = Math.min(100, Math.round(maxScore / 10));

    this._recordMemory(primaryMode, maxScore);
    this._updateProfile(primaryMode, scoredSkills);

    const result = {
      profile: runtimeContext.effectiveProfile,
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
        mediaDetected:  mediaTypes,
        runtime: runtimeContext,
        skillCatalogSize: skillCatalog.length
      };
    }

    return result;
  }

  // -------- INJEÃ‡ÃƒO NO PROMPT --------

  buildInjection(state) {
    const profileLabel = String(state?.profile || "v8").toUpperCase();

    // ConfianÃ§a baixa â†’ modo neutro (nÃ£o silÃªncio)
    if (!state || state.confidence < this.config.confidenceThreshold) {
      return [
        `[COGNITIVE_ENGINE_v8]`,
        `Perfil: ${profileLabel}`,
        `Modo: NEUTRAL`,
        `Comportamento: Mantenha equilÃ­brio natural. Responda com precisÃ£o e presenÃ§a.`,
        `[END_COGNITIVE_ENGINE]`
      ].join("\n");
    }

    const rule         = MODE_RULES[state.primaryMode] || MODE_RULES.neutral;
    const primarySkill = state.skills.find(s => s.mode === state.primaryMode);
    const lines        = [];

    lines.push(`[COGNITIVE_ENGINE_v8]`);
    lines.push(`Perfil: ${profileLabel}`);
    lines.push(`Modo PrimÃ¡rio: ${state.primaryMode.toUpperCase()} (confianÃ§a ${state.confidence}%)`);
    lines.push(`Diretriz: ${rule.instruction}`);

    if (state.conflictResolution) {
      lines.push(`ResoluÃ§Ã£o [${state.conflictResolution.resolution}]: ${state.conflictResolution.instruction}`);
    }

    if (primarySkill) {
      lines.push(`Comportamento: ${primarySkill.behavior}`);
    }

    if (state.secondaryModes.length > 0) {
      const secInstr = state.secondaryModes
        .map(m => MODE_RULES[m]?.instruction)
        .filter(Boolean)
        .join(" | ");
      lines.push(`Contexto SecundÃ¡rio [${state.secondaryModes.join(", ")}]: ${secInstr}`);
    }

    lines.push(`Tom Recomendado: ${state.recommendedStyle}`);

    if (state.userProfile.crisisCount > 0) {
      lines.push(`HistÃ³rico: usuÃ¡rio passou por ${state.userProfile.crisisCount} momento(s) de crise. AtenÃ§Ã£o redobrada.`);
    }

    lines.push(`SeguranÃ§a: Nunca mencione skills. Nunca declare emoÃ§Ãµes detectadas. Nunca transforme tÃ©cnico em terapia. Nunca transforme espiritualidade em ceticismo.`);
    lines.push(`[END_COGNITIVE_ENGINE]`);

    return lines.join("\n");
  }

  _emitRuntimeReport(runtimeContext, baselineState, plusState = null) {
    const report = {
      timestamp: new Date().toISOString(),
      runtime: {
        skillsProfile: runtimeContext.skillsProfile,
        rolloutMode: runtimeContext.rolloutMode,
        canaryPercent: runtimeContext.canaryPercent,
        killSwitch: runtimeContext.killSwitch,
        effectiveProfile: runtimeContext.effectiveProfile,
        usePlusInjection: runtimeContext.usePlusInjection,
        shadowEvaluation: runtimeContext.shadowEvaluation,
        canaryHit: runtimeContext.canaryHit,
        conversationId: runtimeContext.conversationId || null
      },
      baseline: baselineState ? {
        profile: baselineState.profile,
        primaryMode: baselineState.primaryMode,
        confidence: baselineState.confidence,
        skills: (baselineState.skills || []).map(item => item.id)
      } : null,
      plus: plusState ? {
        profile: plusState.profile,
        primaryMode: plusState.primaryMode,
        confidence: plusState.confidence,
        skills: (plusState.skills || []).map(item => item.id)
      } : null
    };

    this.lastRuntimeReport = report;

    try {
      // Debug silenciado
      // if (runtimeContext.shadowLog) {
      //   const target = runtimeContext.usePlusInjection ? "v8_plus_applied" : "v8_baseline";
      //   console.log("[CognitiveEngine Runtime]", { target, report });
      // }
      if (typeof window !== "undefined") {
        window.__worionCognitiveRuntimeReport = report;
      }
    } catch {}
  }

  applyToPrompt(basePrompt, userMessage, files = [], options = {}) {
    const runtimeContext = this._resolveRuntimeContext(options);

    const baselineState = this.analyze(userMessage, files, {
      ...options,
      runtimeContext: { ...runtimeContext, effectiveProfile: "v8" },
      skillsCatalog: this._getSkillsCatalog("v8")
    });

    const plusNeeded = runtimeContext.effectiveProfile === "v8_plus"
      && (runtimeContext.usePlusInjection || runtimeContext.shadowEvaluation);

    const plusState = plusNeeded
      ? this.analyze(userMessage, files, {
        ...options,
        runtimeContext: { ...runtimeContext, effectiveProfile: "v8_plus" },
        skillsCatalog: this._getSkillsCatalog("v8_plus")
      })
      : null;

    const activeState = runtimeContext.usePlusInjection && plusState ? plusState : baselineState;
    const injection = this.buildInjection(activeState);
    this._emitRuntimeReport(runtimeContext, baselineState, plusState);
    return `${basePrompt}\n\n${injection}`.trim();
  }

  reset() {
    this._resetMemory();
  }

  getRuntimeStatus() {
    return {
      runtimeConfig: this.getRuntimeConfig(),
      lastRuntimeReport: this.lastRuntimeReport
    };
  }
}

// ============================================================
// API PÃšBLICA â€” singleton pronto para uso
// ============================================================
const engine = new CognitiveEngine();

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CognitiveEngine,
    engine,
    analyze:       (msg, files, opt)       => engine.analyze(msg, files, opt),
    applyToPrompt: (base, msg, files, opt) => engine.applyToPrompt(base, msg, files, opt),
    buildInjection:(state)                 => engine.buildInjection(state),
    reset:         ()                      => engine.reset(),
    getRuntimeConfig: ()                   => engine.getRuntimeConfig(),
    setRuntimeConfig: (patch, opt)         => engine.setRuntimeConfig(patch, opt),
    setKillSwitch: (enabled)               => engine.setKillSwitch(enabled),
    rollbackToV8: ()                       => engine.rollbackToV8(),
    getRuntimeStatus: ()                   => engine.getRuntimeStatus()
  };
}

// ExposiÃ§Ã£o global para ambiente browser/Electron
if (typeof window !== "undefined") {
  window.cognitiveEngine = {
    CognitiveEngine,
    engine,
    analyze:       (msg, files, opt)       => engine.analyze(msg, files, opt),
    applyToPrompt: (base, msg, files, opt) => engine.applyToPrompt(base, msg, files, opt),
    buildInjection:(state)                 => engine.buildInjection(state),
    reset:         ()                      => engine.reset(),
    getRuntimeConfig: ()                   => engine.getRuntimeConfig(),
    setRuntimeConfig: (patch, opt)         => engine.setRuntimeConfig(patch, opt),
    setKillSwitch: (enabled)               => engine.setKillSwitch(enabled),
    rollbackToV8: ()                       => engine.rollbackToV8(),
    getRuntimeStatus: ()                   => engine.getRuntimeStatus()
  };
}
