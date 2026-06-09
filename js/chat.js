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
var memoryCardsContext = '';

// ============================================
// ETAPA 4: DETECÇÃO E INJEÇÃO DE SEGMENTOS DE MEMÓRIA PESSOAL
// ============================================

function isPersonalQuestion(text = '') {
  const normalized = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  const personalPatterns = [
    /\b(quem sou eu|who am i|qual e meu perfil|what's my profile|sobre mim|tell me about|me fale|me conhece)\b/i,
    /\b(o que voce sabe sobre mim|what do you know about me|qual e meu padrao|what's my pattern)\b/i,
    /\b(me fale sobre meu|tell me about my|meu tdah|my adhd|minha medicacao|my medication)\b/i,
    /\b(minha historia|my history|minha rotina|my routine|como funciono|how i work)\b/i,
    /\b(qual e meu padrao|what's my pattern|como sempre|how i usually|como gosto|how i like)\b/i,
    /\b(meu estilo|my style|minha preferencia|my preference|minha forma|my way)\b/i,
    /\b(como eu|how do i|em relacao a mim|about me|se refere a mim|regarding me)\b/i,
    // Novos padrões para perguntas sobre memória pessoal
    /\bo que (voce|vc) (tem|sabe|encontra|acha).*(na|sobre|em).*(memoria|memorias)\b/i,
    /\bbusque.*(na|nas|em).*(sua|tuas|as)?\s*(memoria|memorias)\b/i,
    /\bo que (voce|vc) (sabe|lembra|recorda) sobre (mim|meu|minha|meus|minhas)\b/i,
    /\bme fale sobre (mim|meu|minha|meus|minhas)\b/i,
    /\bmemoria(s)?:/i,
    // Pesquisa sobre memória (com ou sem nome específico)
    /\bpesquisa (sobre|de) memoria/i,
    /\bpesquise (na|na sua|nas minhas) memoria/i
  ];

  return personalPatterns.some(pattern => pattern.test(normalized));
}

// ============================================
// DETECÇÃO EXPLÍCITA: CONSULTAS DE MEMÓRIA PRIVADA
// ============================================

function normalizePtText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function isExplicitPrivateMemoryQuery(text) {
  const value = normalizePtText(text);

  const memoryMarkers = [
    // Verbo direto + possessivo + memória
    'procure na memoria',
    'procure na sua memoria',
    'procure nas minhas memorias',
    'busque na memoria',
    'busque nas minhas memorias',
    'pesquise na memoria',
    'pesquise nas minhas memorias',
    'pesquisa sobre memoria',
    'pesquisa de memoria',
    'pesquisa na memoria',
    'consulte a memoria',
    'recupere da memoria',
    'leia minhas memorias',
    'acesse minhas memorias',

    // Anafórico
    'o que encontra nas minhas memorias',
    'o que voce encontra nas minhas memorias',
    'minhas memorias',
    'nas minhas memorias',

    // Recall pessoal
    'voce lembra o que eu falei',
    'voce se lembra o que eu falei',
    'vc lembra o que eu falei',
    'voce lembra do que eu falei',
    'o que voce sabe sobre mim',
    'vc sabe sobre mim',
    'o que voce sabe de mim',
    'voce tem registro de',
    'voce acessou minhas conversas',
    'voce recorda',

    // Genéricos
    'memoria interna',
    'memoria pessoal',
    'memoria privada',
    'contexto interno',
    'historico de conversas',
    'minhas conversas'
  ];

  const externalResearchBlockers = [
    'nao estou pedindo pesquisa externa',
    'nao estou pedindo busca externa',
    'sem pesquisa externa',
    'sem usar internet',
    'nao pesquise na internet',
    'nao pesquise fora',
    'nao use internet',
    'nao quero pesquisa externa',
    'apenas memoria',
    'so memoria',
    'memoria nao internet',
    'memoria nao na web'
  ];

  const hasMemoryMarker = memoryMarkers.some(marker => value.includes(marker));
  const hasBlocker = externalResearchBlockers.some(marker => value.includes(marker));

  return hasMemoryMarker || hasBlocker;
}

function hasPublicResearchBlocker(text) {
  const value = normalizePtText(text);
  return [
    'nao estou pedindo pesquisa externa',
    'sem pesquisa externa',
    'sem usar internet',
    'nao use internet',
    'apenas memoria',
    'so memoria'
  ].some(marker => value.includes(marker));
}

// ============================================
// FASE 1-3: TRAFFIC CONTROLLER UNIFICADO
// ============================================
// Consolida 3 classificadores em 1: resolveContextAuthority, classifyQuestionScope, getExecutionRoute
// Retorna: { intent, scope, route, decision: { reasoning, confidence } }

function trafficController(content = '', context = {}) {
  const normalized = String(content || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

  const files = Array.isArray(context.files)
    ? context.files
    : (Array.isArray(context.attachments) ? context.attachments : []);
  const hasUploadedFiles = files.length > 0;
  const activeAgent = context.activeAgent || null;
  const currentConnectorContext = context.connectorContext || '';
  const currentProjectContext = context.currentProjectContext || '';

  // ===== REGRA 1: TRIVIAL + SILÊNCIO =====
  const greetingPatterns = [
    /^(bom dia|boa tarde|boa noite|oi|ola|olá|e ai|e aí|iae|hey|salve)[\s.!?]*$/i,
    /^\s*\.{1,3}\s*$/i, // Apenas pontos
    /^(obrigado|obrigada|valeu|thanks|thank you|brigado|vlw|vlw mesmo)[\s.!?]*$/i,
    /^(ok|okay|certo|sim|nao|não|entendi|perfeito|beleza|show)[\s.!?]*$/i
  ];

  if (greetingPatterns.some(pattern => pattern.test(content.trim()))) {
    return {
      intent: 'trivial',
      scope: 'conversation_or_general',
      route: 'fast_path',
      decision: { reasoning: 'trivial_input', confidence: 1.0 }
    };
  }

  // ===== REGRA 2: PERGUNTA SOBRE MEMÓRIA PESSOAL =====
  if (isPersonalQuestion(content)) {
    return {
      intent: 'private_memory',
      scope: 'private_memory_context',
      route: 'memory_search',
      decision: { reasoning: 'personal_question_detected', confidence: 1.0 }
    };
  }

  // ===== REGRA 3: COMANDO EXPLÍCITO =====
  const commandPatterns = [
    /^(memory_search:|salve no notion|\/deepworion|notion:|deepworion:)/i,
    /\b(memory_search:|salve no Notion|notion:|deepworion:)\b/
  ];

  if (commandPatterns.some(pattern => pattern.test(normalized))) {
    return {
      intent: 'command',
      scope: 'conversation_or_general',
      route: 'direct',
      decision: { reasoning: 'explicit_command', confidence: 1.0 }
    };
  }

  // ===== REGRA 4: PESQUISA PÚBLICA EXPLÍCITA =====
  const publicResearchPatterns = [
    /\bpesquise? (na internet|na web|reportagens|artigos|fontes|noticias|estudos|web)\b/i,
    /\bbusque? (na internet|na web|reportagens|artigos|fontes|noticias|estudos|web)\b/i,
    /\bfontes? (externas?|publicas?|confiaveis?)\b/i,
    /\b(reportagens?|noticias?|artigos)\b/i,
    /\bo que dizem/i,
    /\btraga fontes\b/i,
    /\btraga tudo\b/i
  ];

  if (publicResearchPatterns.some(pattern => pattern.test(normalized))) {
    return {
      intent: 'public_research',
      scope: 'public_research',
      route: 'focused_research',
      decision: { reasoning: 'explicit_public_research', confidence: 1.0 }
    };
  }

  // ===== REGRA 5: CONECTOR PRIVADO (NOTION, GOOGLE DRIVE, ETC) =====
  const notionLinkPattern = /https?:\/\/(?:www\.)?(?:notion\.so|app\.notion\.com|[\w-]+\.notion\.site)\/\S+/i;
  const hasNotionLink = notionLinkPattern.test(content);
  const hasPrivateConnectorRef = /\b(notion|google drive|drive|gmail|calendar|agenda|docs|documentos|minhas sessoes|minhas conversas|minha memoria|meu historico|meus arquivos|meus projetos)\b/i.test(normalized);

  if (hasNotionLink || (activeAgent && hasPrivateConnectorRef)) {
    return {
      intent: 'private_memory',
      scope: 'private_connector_context',
      route: 'private_context_synthesis',
      decision: { reasoning: 'private_connector_detected', confidence: 1.0 }
    };
  }

  // ===== REGRA 6: ARQUIVO ANEXADO =====
  if (hasUploadedFiles) {
    return {
      intent: 'private_memory',
      scope: 'uploaded_file_context',
      route: 'direct_answer',
      decision: { reasoning: 'uploaded_file_detected', confidence: 1.0 }
    };
  }

  // ===== REGRA 6.5: CONSULTA EXPLÍCITA DE MEMÓRIA PRIVADA =====
  if (isExplicitPrivateMemoryQuery(content)) {
    console.log('[TRAFFIC CONTROLLER] explicit private memory query detected');
    return {
      intent: 'private_memory',
      scope: 'private_memory_context',
      route: 'memory_search',
      confidence: 1.0,
      reasoning: 'explicit_private_memory_query',
      retrievalMode: 'private_only',
      allowPublicResearch: hasPublicResearchBlocker(content) ? false : true,
      decision: { reasoning: 'explicit_private_memory_query', confidence: 1.0 }
    };
  }

  // ===== REGRA 7: CONVERSA GERAL (DEFAULT) =====
  return {
    intent: 'opinion',
    scope: 'conversation_or_general',
    route: 'direct_answer',
    decision: { reasoning: 'default_conversation', confidence: 0.8 }
  };
}

async function searchMemorySegments(query, topK = 5) {
  try {
    // Verificar se temos a função generateEmbedding disponível (do memory-segments-injector.js)
    if (typeof window !== 'undefined' && typeof window.searchMemorySegments === 'function' && window.searchMemorySegments !== searchMemorySegments) {
      // Se a função foi carregada do arquivo, usar ela
      return await window.searchMemorySegments(query, topK);
    }

    console.warn('[MEMORY SEGMENTS] memory-segments-injector.js não carregado, tentando fallback');

    // Fallback: tentar usar generateEmbedding localmente
    const hasEmbeddingFunc = typeof window !== 'undefined' && window.generateEmbedding && typeof window.generateEmbedding === 'function';

    if (!hasEmbeddingFunc) {
      console.warn('[MEMORY SEGMENTS] generateEmbedding não disponível');
      return [];
    }

    console.log('[MEMORY SEGMENTS] busca iniciada para:', String(query).slice(0, 100));

    // Gerar embedding da pergunta
    const embedding = await window.generateEmbedding(String(query || ''));
    if (!embedding || !Array.isArray(embedding)) {
      console.warn('[MEMORY SEGMENTS] erro ao gerar embedding');
      return [];
    }

    // Verificar se temos acesso à API RPC do Supabase
    const hasSupabase = typeof window !== 'undefined' && window.supabaseClient && typeof window.supabaseClient.rpc === 'function';

    if (!hasSupabase) {
      console.warn('[MEMORY SEGMENTS] Supabase não disponível');
      return [];
    }

    // Tentar usar a RPC search_similar_conversation_segments
    const { data, error } = await window.supabaseClient.rpc('search_similar_conversation_segments', {
      query_embedding: embedding,
      match_threshold: 0.4,
      match_count: topK
    });

    if (error) {
      console.warn('[MEMORY SEGMENTS] erro na RPC:', error.message);
      return [];
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.log('[MEMORY SEGMENTS] nenhum segmento encontrado');
      return [];
    }

    console.log('[MEMORY SEGMENTS] encontrados:', data.length, 'segmentos');

    return data.map(row => ({
      id: row.id,
      title: row.segment_title || 'Segmento de memória',
      summary: row.segment_summary || row.content || '',
      similarity: row.similarity || 0,
      conversationId: row.conversation_id,
      timestamp: row.created_at
    }));

  } catch (error) {
    console.error('[MEMORY SEGMENTS] erro durante busca:', error.message);
    return [];
  }
}

function formatMemorySegmentsContext(segments = []) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return '';
  }

  const lines = [
    '[MEMORY SEGMENTS - Contexto Pessoal Relevante]',
    ''
  ];

  segments.forEach((segment, index) => {
    lines.push(`${index + 1}. ${segment.title}`);
    lines.push(`   Relevância: ${(segment.similarity * 100).toFixed(0)}%`);
    if (segment.summary) {
      lines.push(`   Contexto: ${String(segment.summary).slice(0, 300)}${String(segment.summary).length > 300 ? '...' : ''}`);
    }
    lines.push('');
  });

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

// Carregar memory-segments-injector.js dinamicamente se não estiver já carregado
if (typeof window !== 'undefined' && !window.generatedEmbeddingLoaded) {
  const script = document.createElement('script');
  script.src = 'js/memory-segments-injector.js';
  script.async = true;
  script.onload = function() {
    window.generatedEmbeddingLoaded = true;
    console.log('[MEMORY SEGMENTS] memory-segments-injector.js carregado dinamicamente');
  };
  script.onerror = function() {
    console.warn('[MEMORY SEGMENTS] falha ao carregar memory-segments-injector.js dinamicamente');
  };
  document.head.appendChild(script);
}

function isActiveMemoryCardInventoryQuestion(text = '') {
  return /\b(quais?\s+mem[oó]rias?|que\s+mem[oó]rias?|o que voc[eê] tem de mem[oó]ria|me fala o que tem|o que tem nesse card|quais?\s+contextos? voc[eê] tem|que conhecimento voc[eê] tem|o que voc[eê] sabe|detalhe\s+t[oó]picos?)\b/i
    .test(String(text || ''));
}

function buildActiveMemoryCardInventoryReply(memoryCardBlock = '', title = '') {
  const block = String(memoryCardBlock || '').trim();
  const lines = block
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line =>
      line &&
      !/^\[MEMORY CARD ATIVO\]$/i.test(line) &&
      !/^IMPORTANTE:/i.test(line) &&
      !/^N[aã]o busque/i.test(line)
    );
  const selected = lines
    .filter(line => /^(Titulo:|Contexto:|Descricao:|Conhecimento do card:|Conversas vinculadas|## |\* |- |\[\d+\]|Resumo:|Regras opcionais:)/i.test(line))
    .slice(0, 28);
  const body = selected.length ? selected : lines.slice(0, 22);
  return [
    `Neste Memory Card ativo${title ? ` (${title})` : ''}, eu tenho registrado:`,
    '',
    body.length ? body.map(line => `- ${line.replace(/^[-*]\s*/, '')}`).join('\n') : '- O card está ativo, mas o bloco de conhecimento está vazio.',
    '',
    'Se você quiser, eu posso aprofundar qualquer item desse card.'
  ].join('\n');
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

function isDeepWorionShortcut(text) {
  return /^\/deepworion(?:\s|$)/i.test(String(text || '').trim());
}

function getDeepWorionShortcutHelp() {
  return [
    '# DeepWorion no Worion',
    '',
    'Use o atalho no campo de texto:',
    '',
    '```text',
    '/deepworion sua pergunta',
    '/deepworion sua pergunta --model claude --agent arquiteto',
    '/deepworion sua pergunta --read supabase',
    '/deepworion sua pergunta --read github --file js/chat.js',
    '/deepworion sua pergunta --save supabase',
    '```',
    '',
    'Por segurança, `--exec` e `--force` não rodam dentro do chat. Use o terminal para execução de comandos.'
  ].join('\n');
}

function parseDeepWorionArgs(commandText) {
  const source = String(commandText || '').trim().replace(/^\/deepworion\b/i, '').trim();
  if (!source || /^--help$|-h$/i.test(source)) return { help: true, args: ['--help'] };

  const args = [];
  let current = '';
  let quote = null;
  let escaping = false;

  for (const char of source) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === '\\') {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += '\\';
  if (quote) throw new Error(`Aspas nao fechadas no comando /deepworion.`);
  if (current) args.push(current);
  if (args.some(arg => /^--(?:exec|force)$/i.test(arg))) {
    throw new Error('O atalho /deepworion bloqueia --exec e --force por seguranca. Use o terminal para execucao.');
  }
  return { help: false, args };
}

function stripAnsi(text) {
  return String(text || '').replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

function formatDeepWorionOutput(stdout, stderr) {
  const cleanStdout = stripAnsi(stdout).trim();
  const cleanStderr = stripAnsi(stderr).trim();
  return [
    cleanStdout,
    cleanStderr ? `\n\n## stderr\n\n\`\`\`text\n${cleanStderr}\n\`\`\`` : ''
  ].filter(Boolean).join('\n') || '(DeepWorion nao retornou saida.)';
}

async function runDeepWorionShortcut(commandText) {
  const parsed = parseDeepWorionArgs(commandText);
  if (parsed.help && parsed.args[0] === '--help') return getDeepWorionShortcutHelp();

  const childProcess = require('child_process');
  const nodePath = require('path');
  const fsModule = require('fs');
  const runtimeDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const projectRoot = fsModule.existsSync(nodePath.join(runtimeDir, 'deepworion.js'))
    ? runtimeDir
    : nodePath.resolve(runtimeDir, '..');
  const cliPath = nodePath.join(projectRoot, 'deepworion.js');
  const nodeBin = process.platform === 'win32' ? 'node.exe' : 'node';

  return await new Promise((resolve, reject) => {
    childProcess.execFile(
      nodeBin,
      [cliPath, ...parsed.args],
      {
        cwd: projectRoot,
        timeout: 180000,
        maxBuffer: 1024 * 1024 * 8,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        const output = formatDeepWorionOutput(stdout, stderr);
        if (error) {
          reject(new Error([`DeepWorion falhou: ${error.message}`, output].filter(Boolean).join('\n\n')));
          return;
        }
        resolve(output);
      }
    );
  });
}

function normalizeCommandGateText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSilenceInput(input) {
  const raw = String(input || '').trim();
  return raw === '' || /^\.{1,3}$/.test(raw);
}

function getLastAssistantReplyText(conversation = []) {
  if (!Array.isArray(conversation)) return '';
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    const message = conversation[index];
    if (message?.role === 'assistant' && String(message.content || '').trim() && message.content !== '...') {
      return String(message.content || '').trim();
    }
  }
  return '';
}

function buildImmediateFeedbackResponse(userMessage = '', previousAssistantReply = '') {
  const userText = String(userMessage || '').toLowerCase();
  const previous = String(previousAssistantReply || '').trim();
  if (/combatendo o sintoma|construindo para todos|arquitetura universal|para todos/i.test(userText)) {
    return 'Você tem razão. Eu estava tratando como ajuste de uma cognição específica, quando o eixo correto é a arquitetura universal do Worion: intenção, contexto, agente, memória, fontes, ferramentas e Writer precisam obedecer uma precedência estável para qualquer usuário.';
  }
  if (/^fala[.!?]*$/i.test(previous)) {
    return 'Não. Ficou seco demais para uma saudação. Melhor seria: “Boa noite. Estou por aqui.”';
  }
  if (/^(oi|bom dia|boa tarde|boa noite)[.!?]*$/i.test(previous)) {
    return 'Não ficou bom. Melhor seria responder com presença simples, sem secar demais.';
  }
  return 'Você tem razão em cobrar. Eu respondi mal. Vou refazer de forma mais direta e útil.';
}

function isRuntimeIntrospectionQuestion(content) {
  const text = String(content || '').toLowerCase().trim();
  if (!text) return false;

  const patterns = [
    /qual modelo (voc[eê]|vc) (usou|est[aá] usando|utilizou|respondeu)/i,
    /qual modelo foi usado/i,
    /qual ia (voc[eê]|vc) (usou|est[aá] usando|utilizou)/i,
    /qual provider (voc[eê]|vc) (usou|est[aá] usando|utilizou)/i,
    /qual motor (voc[eê]|vc) (usou|est[aá] usando|utilizou)/i,
    /qual engine (voc[eê]|vc) (usou|est[aá] usando|utilizou)/i,
    /(voc[eê]|vc) (est[aá]|t[aá]) (usando|no|rodando em|rodando no) (deepseek|gpt|openai|claude|anthropic|sonnet|haiku)/i,
    /(voc[eê]|vc) (é|foi) (deepseek|gpt|openai|claude|sonnet|haiku)/i,
    /quem (est[aá] falando|falou|respondeu|me respondeu)/i,
    /quem est[aá] falando comigo/i,
    /quem falou comigo agora/i,
    /foi (deepseek|gpt|openai|claude|sonnet|haiku)/i
  ];

  return patterns.some(pattern => pattern.test(text));
}

function formatProviderLabel(provider) {
  const p = String(provider || '').toLowerCase();
  if (p === 'openai') return 'OpenAI';
  if (p === 'anthropic') return 'Anthropic';
  if (p === 'deepseek') return 'DeepSeek';
  return provider || 'não confirmado';
}

function formatCallSourceLabel(source) {
  const s = String(source || '').toLowerCase();
  if (s === 'worion-api') return 'Worion API local';
  if (s === 'direct-provider') return 'provider direto';
  return source || 'não confirmado';
}

function generateRuntimeIntrospectionResponse(userMessage) {
  const facts = typeof window !== 'undefined' ? window.lastAssistantRuntimeFacts : null;

  if (!facts || !facts.afterCall) {
    return 'Não tenho registro de runtime confirmado do último turno. Verifique o console para ver qual modelo/provider foi roteado.';
  }

  const before = facts.beforeCall || {};
  const after = facts.afterCall || {};
  const model = after.resolvedModelFinal || after.requestedModel || before.selectedModel || 'não confirmado';
  const provider = formatProviderLabel(after.providerFinal || before.selectedProvider);
  const source = formatCallSourceLabel(after.callSource);
  const reason = before.selectionReason || null;
  const text = String(userMessage || '').toLowerCase();

  if (/quem (est[aá] falando|falou|respondeu|me respondeu)|quem est[aá] falando comigo/i.test(text)) {
    return [
      'Sou o Worion — camada operacional, voz, memória e identidade.',
      `Motor do último turno: ${model} via ${provider}.`,
      `Origem da chamada: ${source}.`,
      reason ? `Motivo do roteamento: ${reason}.` : null
    ].filter(Boolean).join('\n');
  }

  return [
    `Modelo do último turno: ${model}.`,
    `Provider: ${provider}.`,
    `Origem da chamada: ${source}.`,
    reason ? `Motivo do roteamento: ${reason}.` : null
  ].filter(Boolean).join('\n');
}

function responseMentionsConcreteRuntimeModelOrProvider(content) {
  const text = String(content || '').toLowerCase();
  const runtimeTerms = [
    'deepseek',
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5',
    'gpt-4',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt',
    'openai',
    'claude',
    'sonnet',
    'haiku',
    'anthropic'
  ];

  return runtimeTerms.some(term => text.includes(term));
}

// Patch 3.2 — Mismatch estrito para afirmações concretas de modelo/runtime

function normalizeRuntimeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .trim();
}

function getEffectiveRuntimeMetadata(runtimeMetadata, beforeCallFacts) {
  const meta = runtimeMetadata || {};
  return {
    requestedModel: meta.requestedModel || beforeCallFacts?.selectedModel || null,
    resolvedModelFinal: meta.resolvedModelFinal || meta.model || beforeCallFacts?.selectedModel || null,
    providerFinal: meta.providerFinal || meta.provider || beforeCallFacts?.selectedProvider || null,
    source: meta.source || meta.callSource || null
  };
}

function detectConcreteModelClaimMismatch(content, runtimeMetadata, beforeCallFacts) {
  const text = String(content || '').toLowerCase();
  const meta = runtimeMetadata || {};
  const effective = getEffectiveRuntimeMetadata(runtimeMetadata, beforeCallFacts);
  const expectedModel = normalizeRuntimeText(
    meta.resolvedModelFinal ||
    meta.model ||
    meta.requestedModel ||
    ''
  );
  const expectedProvider = normalizeRuntimeText(effective.providerFinal || '');

  if (!expectedModel && !expectedProvider) {
    console.warn('[INTROSPECTION GUARDRAIL] termo de runtime detectado, mas sem metadados suficientes para validar', {
      runtimeMetadata,
      beforeCallFacts,
      content: String(content || '').slice(0, 300)
    });
    return true;
  }

  const concreteClaims = [
    { label: 'GPT-5.5',         pattern: /gpt-?5\.?5/i,             expectedToken: 'gpt-5.5' },
    { label: 'GPT-5.4 Mini',    pattern: /gpt-?5\.?4-?mini/i,       expectedToken: 'gpt-5.4-mini' },
    { label: 'GPT-5.4 Nano',    pattern: /gpt-?5\.?4-?nano/i,       expectedToken: 'gpt-5.4-nano' },
    { label: 'GPT-4.1 Mini',    pattern: /gpt-?4\.?1-?mini/i,       expectedToken: 'gpt-4.1-mini' },
    { label: 'DeepSeek V4 Pro', pattern: /deepseek\s*v4\s*pro/i, expectedToken: 'deepseek-v4-pro' },
    { label: 'GPT-4o Mini',     pattern: /gpt-?4o-?mini/i,        expectedToken: 'gpt-4o-mini' },
    { label: 'GPT-4o',          pattern: /gpt-?4o(?!-?mini)/i,    expectedToken: 'gpt-4o' },
    { label: 'GPT-4',           pattern: /gpt-?4(?!o)/i,          expectedToken: 'gpt-4' },
    { label: 'Claude Sonnet',   pattern: /claude.*sonnet|sonnet/i, expectedToken: 'sonnet' },
    { label: 'Claude Haiku',    pattern: /claude.*haiku|haiku/i,   expectedToken: 'haiku' }
  ];

  for (const claim of concreteClaims) {
    if (claim.pattern.test(text)) {
      const expectedHasClaim = expectedModel.includes(claim.expectedToken);

      if (!expectedHasClaim) {
        console.warn('[INTROSPECTION GUARDRAIL] mismatch de modelo concreto', {
          claimed: claim.label,
          expectedModel,
          expectedProvider,
          runtimeMetadata,
          beforeCallFacts
        });
        return true;
      }
    }
  }

  return false;
}

function detectRuntimeMismatch(content, runtimeMetadata, beforeCallFacts) {
  if (!content) return false;

  const text = String(content).toLowerCase();
  const effective = getEffectiveRuntimeMetadata(runtimeMetadata, beforeCallFacts);
  const expectedModel = normalizeRuntimeText(effective.resolvedModelFinal || effective.requestedModel || '');
  const expectedProvider = normalizeRuntimeText(effective.providerFinal || '');

  if (!expectedModel && !expectedProvider) return true;

  // Primeiro: mismatch por nome concreto de modelo
  if (detectConcreteModelClaimMismatch(content, runtimeMetadata, beforeCallFacts)) return true;

  // Segundo: mismatch por família/provider
  const mentionsDeepSeek = text.includes('deepseek');
  const mentionsOpenAI =
    text.includes('openai') ||
    /\bgpt\b/i.test(text) ||
    /gpt-?4/i.test(text);
  const mentionsAnthropic =
    text.includes('anthropic') ||
    text.includes('claude') ||
    text.includes('sonnet') ||
    text.includes('haiku');

  const expectedIsDeepSeek =
    expectedProvider.includes('deepseek') || expectedModel.includes('deepseek');
  const expectedIsOpenAI =
    expectedProvider.includes('openai') || expectedModel.includes('gpt');
  const expectedIsAnthropic =
    expectedProvider.includes('anthropic') ||
    expectedModel.includes('claude') ||
    expectedModel.includes('sonnet') ||
    expectedModel.includes('haiku');

  if (mentionsDeepSeek && !expectedIsDeepSeek) return true;
  if (mentionsOpenAI && !expectedIsOpenAI) return true;
  if (mentionsAnthropic && !expectedIsAnthropic) return true;

  return false;
}

function isTechnicalIdentityClaim(content) {
  const text = String(content || '').toLowerCase();

  const identityPatterns = [
    /estou usando\s+(deepseek|gpt|openai|claude|sonnet|haiku)/i,
    /estou rodando\s+(em|no|na)?\s*(deepseek|gpt|openai|claude|sonnet|haiku)/i,
    /estou no\s+(deepseek|gpt|openai|claude|sonnet|haiku)/i,
    /sou\s+(deepseek|gpt|openai|claude|sonnet|haiku)/i,
    /uso\s+(deepseek|gpt|openai|claude|sonnet|haiku)/i,
    /modelo\s+(é|usado|atual)\s*(o|a)?\s*(deepseek|gpt|openai|claude|sonnet|haiku)/i,
    /motor\s+(é|usado|atual)\s*(o|a)?\s*(deepseek|gpt|openai|claude|sonnet|haiku)/i
  ];

  return identityPatterns.some(pattern => pattern.test(text));
}

function extractConcreteRuntimeClaims(content) {
  const text = String(content || '').toLowerCase();
  const claims = [];

  const claimMap = [
    { token: 'gpt-5.5', pattern: /gpt-?5\.?5/i },
    { token: 'gpt-5.4-mini', pattern: /gpt-?5\.?4-?mini/i },
    { token: 'gpt-5.4-nano', pattern: /gpt-?5\.?4-?nano/i },
    { token: 'gpt-4.1-mini', pattern: /gpt-?4\.?1-?mini/i },
    { token: 'deepseek-v4-pro', pattern: /deepseek\s*v4\s*pro/i },
    { token: 'deepseek', pattern: /deepseek/i },
    { token: 'gpt-4o-mini', pattern: /gpt-?4o-?mini/i },
    { token: 'gpt-4o', pattern: /gpt-?4o(?!-?mini)/i },
    { token: 'gpt-4', pattern: /gpt-?4(?!o)/i },
    { token: 'gpt', pattern: /\bgpt\b/i },
    { token: 'openai', pattern: /openai/i },
    { token: 'claude-sonnet', pattern: /claude.*sonnet|sonnet/i },
    { token: 'claude-haiku', pattern: /claude.*haiku|haiku/i },
    { token: 'claude', pattern: /claude/i },
    { token: 'anthropic', pattern: /anthropic/i }
  ];

  for (const item of claimMap) {
    if (item.pattern.test(text)) {
      claims.push(item.token);
    }
  }

  return [...new Set(claims)];
}

function runtimeClaimMatchesMetadata(claims, runtimeMetadata, beforeCallFacts) {
  const expectedModel = normalizeRuntimeText(
    runtimeMetadata?.resolvedModelFinal ||
    runtimeMetadata?.model ||
    runtimeMetadata?.requestedModel ||
    beforeCallFacts?.selectedModel ||
    ''
  );

  const expectedProvider = normalizeRuntimeText(
    runtimeMetadata?.providerFinal ||
    runtimeMetadata?.provider ||
    beforeCallFacts?.selectedProvider ||
    ''
  );

  if (!expectedModel && !expectedProvider) {
    return false;
  }

  const exactModelTokens = new Set([
    expectedModel,
    expectedModel.replace(/-/g, '')
  ]);
  const exactProviderTokens = new Set([
    expectedProvider,
    expectedProvider.replace(/-/g, '')
  ]);

  const modelMatchesExactly = candidate => {
    const normalizedCandidate = normalizeRuntimeText(candidate);
    return exactModelTokens.has(normalizedCandidate);
  };
  const providerMatchesExactly = candidate => {
    const normalizedCandidate = normalizeRuntimeText(candidate);
    return exactProviderTokens.has(normalizedCandidate);
  };

  for (const claim of claims) {
    if (
      claim === 'deepseek-v4-pro' ||
      claim === 'gpt-5.5' ||
      claim === 'gpt-5.4-mini' ||
      claim === 'gpt-5.4-nano' ||
      claim === 'gpt-4.1-mini' ||
      claim === 'gpt-4o-mini' ||
      claim === 'gpt-4o' ||
      claim === 'gpt-4' ||
      claim === 'claude-sonnet' ||
      claim === 'claude-haiku'
    ) {
      if (!modelMatchesExactly(claim)) {
        return false;
      }
    }

    if (claim === 'deepseek') {
      if (!providerMatchesExactly('deepseek') && !modelMatchesExactly('deepseek')) return false;
    }

    if (claim === 'openai' || claim === 'gpt') {
      if (!providerMatchesExactly('openai') && !modelMatchesExactly(expectedModel) && !expectedModel.startsWith('gpt')) return false;
    }

    if (claim === 'claude' || claim === 'anthropic') {
      if (
        !providerMatchesExactly('anthropic') &&
        !expectedModel.startsWith('claude') &&
        !expectedModel.includes('sonnet') &&
        !expectedModel.includes('haiku')
      ) {
        return false;
      }
    }
  }

  return true;
}

function generateCurrentTurnRuntimeResponse(runtimeMetadata, beforeCallFacts, userMessage) {
  if (!runtimeMetadata) {
    return 'Não tenho metadados confirmados deste turno. Verifique o console para ver qual modelo/provider foi roteado.';
  }

  const model =
    runtimeMetadata.resolvedModelFinal ||
    runtimeMetadata.requestedModel ||
    beforeCallFacts?.selectedModel ||
    'não confirmado';
  const provider = formatProviderLabel(
    runtimeMetadata.providerFinal || beforeCallFacts?.selectedProvider
  );
  const source = formatCallSourceLabel(runtimeMetadata.source);
  const reason = beforeCallFacts?.selectionReason || null;
  const text = String(userMessage || '').toLowerCase();

  if (/quem (est[aá] falando|falou|respondeu|me respondeu)|quem est[aá] falando comigo/i.test(text)) {
    return [
      'Sou o Worion — camada operacional, voz, memória e identidade.',
      `Motor deste turno: ${model} via ${provider}.`,
      `Origem da chamada: ${source}.`,
      reason ? `Motivo do roteamento: ${reason}.` : null
    ].filter(Boolean).join('\n');
  }

  return [
    `Modelo deste turno: ${model}.`,
    `Provider: ${provider}.`,
    `Origem da chamada: ${source}.`,
    reason ? `Motivo do roteamento: ${reason}.` : null
  ].filter(Boolean).join('\n');
}

function createMemoryWritePolicy(content, gate = null) {
  const raw = String(content || '').trim();
  const normalized = normalizeCommandGateText(raw);
  const blockReasons = [];
  const explicitMemoryWrite = /\b(memorize|memorizar|salve na memoria|salvar na memoria|registre na memoria|registrar na memoria|guardar na memoria|guarde na memoria)\b/i.test(normalized);

  if (gate?.handled) blockReasons.push(`command_gate:${gate.type || 'handled'}`);
  if (/\b(teste|diagnostico|debug|log|logs|verificar roteamento|interceptacao)\b/i.test(normalized)) blockReasons.push('test_or_diagnostic');
  if (/^use apenas o contexto\b/i.test(normalized)) blockReasons.push('active_context_introspection');
  if (/^qual contexto de memoria esta ativo\b/i.test(normalized)) blockReasons.push('memory_context_question');
  if (/\b(contexto de memoria|memoria ativa|card ativo|context memory|propria memoria)\b/i.test(normalized)) blockReasons.push('memory_meta');
  const memorySearchTurn =
    /\b(notion|memory_search:|busque na memoria|buscar na memoria|procure na memoria|pesquise na memoria|consulte a memoria)\b/i.test(normalized) ||
    /o que (voce|vc|voc.) (tem|encontra|acha|sabe) (nas|sobre) (minhas |suas )?(memorias|memoria|mem.rias|mem.ria)/i.test(normalized) ||
    /o que (eu|ja) (falei|conversei|disse|perguntei) sobre .+ (nas |na |no )?(memorias|memoria|mem.rias|mem.ria)/i.test(normalized) ||
    /(busque|procure|pesquise|consulte|verifique|veja|ache|encontre) (nas |na )?(memorias|memoria|mem.rias|mem.ria)/i.test(normalized) ||
    /o que esta (nas |na )?(memorias|memoria|mem.rias|mem.ria) sobre/i.test(normalized) ||
    /quais (memorias|mem.rias|registros|conversas) (voce|vc|voc.) (tem|possui|encontra) sobre/i.test(normalized);
  if (memorySearchTurn) blockReasons.push('tool_or_connector_turn');

  if (explicitMemoryWrite && !blockReasons.length) {
    return { allowMemoryWrite: true, reason: 'explicit_user', source: 'explicit_user', blockReasons: [] };
  }

  if (blockReasons.length) {
    return { allowMemoryWrite: false, reason: blockReasons[0], source: 'blocked', blockReasons };
  }

  const persistible = raw.length >= 180 && /\b(decidimos|decisao|decisões|implementar|arquitetura|projeto|pendencia|tarefa|preferencia|regra)\b/i.test(normalized);
  return {
    allowMemoryWrite: persistible,
    reason: persistible ? 'auto_high_confidence' : 'auto_low_confidence',
    source: persistible ? 'auto' : 'blocked',
    blockReasons: persistible ? [] : ['low_confidence']
  };
}

function formatMemoryCount(value) {
  return value === null || value === undefined ? 'n/a' : String(value);
}

function formatMemoryWarnings(warnings = [], limit = 5) {
  const items = (Array.isArray(warnings) ? warnings : []).slice(0, limit);
  if (!items.length) return '- nenhuma';
  return items.map(item => `- ${item}`).join('\n');
}

function formatMemoryAuditReply(audit) {
  const tables = audit?.currentTables || {};
  const rows = [
    ['memory_conversations', tables.memory_conversations?.rowCount],
    ['memory_chunks', tables.memory_chunks?.rowCount],
    ['memory_sources', tables.memory_sources?.rowCount],
    ['context_memory_cards', tables.context_memory_cards?.rowCount],
    ['context_memory_sources', tables.context_memory_sources?.rowCount],
    ['active_context_memory_cards', tables.active_context_memory_cards?.rowCount],
    ['memory_contexts', tables.memory_contexts?.rowCount],
    ['memory_cards_v2', tables.memory_cards_v2?.rowCount],
    ['memory_files', tables.memory_files?.rowCount]
  ];

  return [
    'Memory Audit - Supabase',
    '',
    'Tabelas:',
    ...rows.map(([table, count]) => `- ${table}: ${formatMemoryCount(count)}`),
    '',
    'Status:',
    `- tableErrors: ${Array.isArray(audit?.tableErrors) ? audit.tableErrors.length : 0}`,
    `- warnings: ${Array.isArray(audit?.warnings) ? audit.warnings.length : 0}`,
    '',
    'Observacoes:',
    formatMemoryWarnings(audit?.warnings, 5)
  ].join('\n');
}

function formatMemoryStatusReply(audit) {
  const tables = audit?.currentTables || {};
  return [
    'Memory Status',
    '',
    `- memory_contexts: ${formatMemoryCount(tables.memory_contexts?.rowCount)}`,
    `- memory_cards_v2: ${formatMemoryCount(tables.memory_cards_v2?.rowCount)}`,
    `- memory_files: ${formatMemoryCount(tables.memory_files?.rowCount)}`,
    `- tableErrors: ${Array.isArray(audit?.tableErrors) ? audit.tableErrors.length : 0}`,
    `- warnings: ${Array.isArray(audit?.warnings) ? audit.warnings.length : 0}`,
    '',
    'Observacoes:',
    formatMemoryWarnings(audit?.warnings, 5)
  ].join('\n');
}

function formatMemoryCandidatesReply(result) {
  const candidates = Array.isArray(result?.candidates) ? result.candidates.slice(0, 12) : [];
  const lines = ['Memory Context Candidates', ''];
  if (!candidates.length) {
    lines.push('Nenhum candidato retornado.');
  }
  candidates.forEach((candidate, index) => {
    const warnings = Array.isArray(candidate.qualityWarnings) && candidate.qualityWarnings.length
      ? candidate.qualityWarnings.join('; ')
      : 'nenhum';
    lines.push(`${index + 1}. ${candidate.title}`);
    lines.push(`   slug: ${candidate.slug}`);
    lines.push(`   domain: ${candidate.domain}`);
    lines.push(`   applyAllowed: ${candidate.applyAllowed !== false}`);
    lines.push(`   qualityScore: ${formatMemoryCount(candidate.qualityScore)}`);
    lines.push(`   warnings: ${warnings}`);
    lines.push('');
  });
  if (Array.isArray(result?.warnings) && result.warnings.length) {
    lines.push('Observacoes:');
    lines.push(formatMemoryWarnings(result.warnings, 5));
  }
  return lines.join('\n').trim();
}

function formatMemoryContextsReply(contexts = []) {
  const rows = Array.isArray(contexts) ? contexts.slice(0, 12) : [];
  const lines = ['Memory Contexts V2', ''];
  if (!rows.length) lines.push('Nenhum contexto V2 encontrado.');
  rows.forEach((context, index) => {
    lines.push(`${index + 1}. ${context.title}`);
    lines.push(`   slug: ${context.slug}`);
    lines.push(`   domain: ${context.domain}`);
    lines.push(`   status: ${context.status}`);
    lines.push('');
  });
  return lines.join('\n').trim();
}

function formatMemoryCardsReply(cards = [], audit = null) {
  const rows = Array.isArray(cards) ? cards.slice(0, 12) : [];
  if (!rows.length) {
    return [
      'Memory Cards V2',
      '',
      'Nenhum card criado ainda.',
      `Contextos draft disponiveis: ${formatMemoryCount(audit?.currentTables?.memory_contexts?.rowCount)}.`
    ].join('\n');
  }
  const lines = ['Memory Cards V2', ''];
  rows.forEach((card, index) => {
    lines.push(`${index + 1}. ${card.title}`);
    lines.push(`   slug: ${card.slug}`);
    lines.push(`   domain: ${card.domain}`);
    lines.push(`   status: ${card.status}`);
    lines.push('');
  });
  return lines.join('\n').trim();
}

function formatMemoryApplyApprovedReply(result) {
  const requested = Array.isArray(result?.requested) ? result.requested : [];
  const inserted = Array.isArray(result?.inserted) ? result.inserted : [];
  const skipped = Array.isArray(result?.skipped) ? result.skipped : [];
  const missing = Array.isArray(result?.missing) ? result.missing : [];
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const lines = [
    'Memory Apply Approved',
    '',
    'Requested:',
    ...(requested.length ? requested.map(slug => `- ${slug}`) : ['- nenhum']),
    '',
    `Inserted: ${inserted.length}`,
    `Skipped: ${skipped.length}`,
    `Missing: ${missing.length}`,
    `Errors: ${errors.length}`
  ];

  if (skipped.length) {
    lines.push('', 'Skipped:');
    skipped.slice(0, 8).forEach(item => {
      const reason = item.reason === 'slug_exists' ? 'already_exists' : (item.reason || 'skipped');
      lines.push(`- ${item.slug || item.row?.slug || '(sem slug)'} - ${reason}`);
    });
  }
  if (missing.length) {
    lines.push('', 'Missing:');
    missing.slice(0, 8).forEach(slug => lines.push(`- ${slug}`));
  }
  if (errors.length) {
    lines.push('', 'Errors:');
    errors.slice(0, 5).forEach(item => lines.push(`- ${item.slug || '(sem slug)'} - ${item.error || item}`));
  }
  return lines.join('\n');
}

async function executeMemoryCommand(raw) {
  const normalized = normalizeCommandGateText(raw);
  const approvedSlugs = [
    'memory-cards-context-memory',
    'command-intent-gate-execucao-deterministica'
  ];

  const knownMemoryCommand = /^\/memory\s+(audit|import|rule|candidates|apply-approved|contexts|cards|status)\b/i.test(String(raw || '').trim());
  if (!knownMemoryCommand && window.WorionMemoryCardsRuntime && /^\/memory(?:\s|$)/i.test(String(raw || '').trim())) {
    const localResult = window.WorionMemoryCardsRuntime.handleMemoryCommand(raw);
    if (localResult?.handled) return localResult.reply;
  }

  if (normalized === '/memory audit') {
    console.log('[MEMORY COMMAND] audit');
    if (typeof worionApiMemoryAudit !== 'function') throw new Error('worionApiMemoryAudit indisponivel.');
    return formatMemoryAuditReply(await worionApiMemoryAudit());
  }

  if (normalized === '/memory import') {
    return 'Abra a página Memory Cards e use Importar conversa para colar o conteúdo. O Worion separará os Contextos Pai automaticamente.';
  }

  if (normalized === '/memory rule') {
    return 'Use a página Memory Cards para criar uma regra de roteamento. Exemplo: quando aparecer TDAH, enviar para Espiritualidade.';
  }

  const ruleMatch = normalized.match(/^\/memory rule\s+(.+?)\s*->\s*(.+)$/i);
  if (ruleMatch) {
    if (typeof worionApiMemoryContextRoutingRules !== 'function') throw new Error('worionApiMemoryContextRoutingRules indisponivel.');
    const pattern = ruleMatch[1].trim();
    const targetContextSlug = ruleMatch[2].trim();
    await worionApiMemoryContextRoutingRules({
      contextSlug: targetContextSlug,
      rules: [{
        pattern,
        targetContextSlug,
        reason: `Regra criada via comando /memory rule para ${pattern}.`,
        priority: 100,
        active: true
      }]
    });
    return `Regra criada: ${pattern} -> ${targetContextSlug}`;
  }

  if (normalized === '/memory candidates') {
    console.log('[MEMORY COMMAND] candidates');
    if (typeof worionApiMemoryContextCandidates !== 'function') throw new Error('worionApiMemoryContextCandidates indisponivel.');
    return formatMemoryCandidatesReply(await worionApiMemoryContextCandidates({ limit: 12 }));
  }

  if (normalized === '/memory apply-approved') {
    console.log('[MEMORY COMMAND] apply-approved');
    if (typeof worionApiApplyMemoryContextCandidatesBySlug !== 'function') throw new Error('worionApiApplyMemoryContextCandidatesBySlug indisponivel.');
    return formatMemoryApplyApprovedReply(await worionApiApplyMemoryContextCandidatesBySlug(approvedSlugs));
  }

  if (normalized === '/memory contexts') {
    console.log('[MEMORY COMMAND] contexts');
    if (typeof worionApiMemoryContexts !== 'function') throw new Error('worionApiMemoryContexts indisponivel.');
    return formatMemoryContextsReply(await worionApiMemoryContexts({ limit: 50 }));
  }

  if (normalized === '/memory cards') {
    console.log('[MEMORY COMMAND] cards');
    if (typeof worionApiMemoryCards !== 'function') throw new Error('worionApiMemoryCards indisponivel.');
    const [cards, audit] = await Promise.all([
      worionApiMemoryCards({ limit: 50 }),
      typeof worionApiMemoryAudit === 'function' ? worionApiMemoryAudit() : null
    ]);
    return formatMemoryCardsReply(cards, audit);
  }

  if (normalized === '/memory status') {
    console.log('[MEMORY COMMAND] status');
    if (typeof worionApiMemoryAudit !== 'function') throw new Error('worionApiMemoryAudit indisponivel.');
    return formatMemoryStatusReply(await worionApiMemoryAudit());
  }

  return null;
}

/**
 * Remove blocos de histórico colados pelo usuário antes de parsear comandos
 * Evita detectar comandos em contexto histórico citado
 */
function stripHistoricalBlocks(text) {
  let cleaned = String(text || '');

  // Remover blocos que começam com "Agente:", "Worion:", timestamps, etc.
  cleaned = cleaned.replace(/^(Agente|Worion|Claude|Assistant|User):\s*[\s\S]*$/gim, '');

  // Remover blocos entre aspas triplas ou backticks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/'''[\s\S]*?'''/g, '');

  // Remover blocos de citação (markdown > ou indentação)
  cleaned = cleaned.replace(/^>\s+.*$/gm, '');

  // Remover timestamps ISO ou formatados
  cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/g, '');

  return cleaned.trim();
}

async function runCommandIntentGate(content) {
  // Limpar histórico colado ANTES de parsear comandos
  const raw = stripHistoricalBlocks(String(content || '').trim());

  // ABSORVIDO NO TRAFFIC CONTROLLER: Silence Input Detector (ex-gate #2)
  // Detectada na trafficController via Regra 1 (trivial + silêncio)
  // if (isSilenceInput(raw)) {
  //   return { handled: true, stopPipeline: true, type: 'silence', reply: '' };
  // }

  if (/^\/memory(?:\s|$)/i.test(raw)) {
    const reply = await executeMemoryCommand(raw);
    if (reply !== null) {
      console.log('[COMMAND GATE] memory command handled');
      return { handled: true, stopPipeline: true, type: 'memory', reply };
    }
    return {
      handled: true,
      stopPipeline: true,
      type: 'memory',
      reply: [
        'Comando /memory nao reconhecido.',
        '',
        'Comandos disponiveis:',
        '- /memory audit',
        '- /memory candidates',
        '- /memory apply-approved',
        '- /memory status',
        '- /memory contexts',
        '- /memory cards'
      ].join('\n')
    };
  }

  if (typeof detectMemorySearchCommand === 'function') {
    const memoryRequest = detectMemorySearchCommand(raw);
    if (memoryRequest && typeof executeMemorySearchCommand === 'function') {
      console.log('[COMMAND GATE] memory_search detected');
      const reply = await executeMemorySearchCommand(memoryRequest);
      console.log('[COMMAND GATE] handled=true stopPipeline=true');
      return { handled: true, stopPipeline: true, type: 'memory_search', reply };
    }
  }

  if (typeof detectNotionPageRequest === 'function') {
    const notionRequest = detectNotionPageRequest(raw, { imperativeOnly: true });
    if (notionRequest && typeof executeNotionPageRequest === 'function') {
      console.log('[COMMAND GATE] notion_create detected');
      const reply = await executeNotionPageRequest(notionRequest);
      console.log('[COMMAND GATE] handled=true stopPipeline=true');
      return { handled: true, stopPipeline: true, type: 'notion_create', reply };
    }
  }

  return { handled: false, stopPipeline: false, type: 'none' };
}

async function persistAssistantTurn(originConversationId, originMessages, sessionStartedAt, options = {}) {
  let originSnapshot = null;
  sessionSaved = false;
  if (typeof renderOriginConversation === 'function') renderOriginConversation(originConversationId);
  if (typeof buildConversationSnapshot === 'function') {
    originSnapshot = buildConversationSnapshot({
      conversationId: originConversationId,
      messages: originMessages,
      sessionStartedAt
    });
  }
  // Debug silenciado
  // console.log('[CHAT] Tentando salvar snapshot POS-assistente', {
  //   saveExists: typeof saveConversationSnapshot === 'function',
  //   hasSnapshot: !!originSnapshot,
  //   conversationId: originSnapshot?.conversationId,
  //   messageCount: originSnapshot?.messages?.length
  // });
  if (typeof saveConversationSnapshot === 'function') {
    await saveConversationSnapshot(originSnapshot, { silent: true });
    // console.log('[CHAT] Snapshot POS-assistente salvo');
  } else {
    console.error('[CHAT] saveConversationSnapshot NAO DISPONIVEL!');
  }
  if (originConversationId && typeof queueContextIndexing === 'function' && !options.skipContextIndexing) {
    queueContextIndexing(originConversationId, getCleanMessages(originMessages), options.memoryPolicy || null);
  } else if (options.skipContextIndexing) {
    console.log('[ContextGuardian] skip memory write:', options.reason || 'turn policy blocked');
  }
  setTimeout(() => {
    if (typeof isOriginConversationActive === 'function' && isOriginConversationActive(originConversationId) && typeof focusComposerInput === 'function') {
      focusComposerInput();
    }
  }, 100);
}

function createAssistantMessageSkeleton(originConversationId, options = {}) {
  const now = new Date().toISOString();
  return {
    id: options.id || (typeof makeId === 'function' ? makeId('message') : `message-${Date.now()}`),
    conversation_id: originConversationId,
    conversationId: originConversationId,
    role: 'assistant',
    content: '',
    status: options.status || 'streaming',
    provider: options.provider || null,
    model: options.model || null,
    created_at: options.createdAt || now,
    createdAt: options.createdAt || now
  };
}

function findAssistantMessageIndex(originMessages, assistantMessageId, fallbackIndex = -1) {
  if (assistantMessageId) {
    const byId = originMessages.findIndex(message => message?.id === assistantMessageId);
    if (byId >= 0) return byId;
  }
  return fallbackIndex;
}

async function checkpointAssistantMessage(originConversationId, originMessages, sessionStartedAt, assistantMessageId, fallbackIndex, patch = {}) {
  const index = findAssistantMessageIndex(originMessages, assistantMessageId, fallbackIndex);
  if (index < 0 || !originMessages[index]) return null;

  const { skipRender = false, ...messagePatch } = patch;
  const now = new Date().toISOString();
  const current = originMessages[index];
  const status = messagePatch.status || current.status || 'streaming';
  originMessages[index] = {
    ...current,
    ...messagePatch,
    id: current.id || assistantMessageId || (typeof makeId === 'function' ? makeId('message') : `message-${Date.now()}`),
    conversation_id: current.conversation_id || originConversationId,
    conversationId: current.conversationId || originConversationId,
    role: 'assistant',
    content: messagePatch.content !== undefined ? String(messagePatch.content || '') : String(current.content || ''),
    status,
    updated_at: now,
    updatedAt: now,
    completedAt: status === 'completed' ? (messagePatch.completedAt || current.completedAt || now) : current.completedAt,
    interruptedAt: status === 'interrupted' ? (messagePatch.interruptedAt || current.interruptedAt || now) : current.interruptedAt,
    failedAt: status === 'failed' ? (messagePatch.failedAt || current.failedAt || now) : current.failedAt
  };

  if (!skipRender && typeof renderOriginConversation === 'function') renderOriginConversation(originConversationId);
  if (typeof buildConversationSnapshot === 'function' && typeof saveConversationSnapshot === 'function') {
    const snapshot = buildConversationSnapshot({
      conversationId: originConversationId,
      messages: originMessages,
      sessionStartedAt
    });
    await saveConversationSnapshot(snapshot, { silent: true });
  }

  return originMessages[index];
}

async function renderAssistantReplyWithCheckpoint(originConversationId, originMessages, sessionStartedAt, assistantMessageId, fallbackIndex, finalReply, options = {}) {
  const content = String(finalReply || '');
  let renderedInPlace = false;
  await checkpointAssistantMessage(
    originConversationId,
    originMessages,
    sessionStartedAt,
    assistantMessageId,
    fallbackIndex,
    { status: options.startStatus || 'executing' }
  );

  try {
    if (
      typeof animateAssistantReply === 'function' &&
      typeof isOriginConversationActive === 'function' &&
      isOriginConversationActive(originConversationId)
    ) {
      await animateAssistantReply(fallbackIndex, content);
      renderedInPlace = true;
    } else {
      await checkpointAssistantMessage(
        originConversationId,
        originMessages,
        sessionStartedAt,
        assistantMessageId,
        fallbackIndex,
        { content, status: options.startStatus || 'executing', isTyping: false }
      );
    }

    await checkpointAssistantMessage(
      originConversationId,
      originMessages,
      sessionStartedAt,
      assistantMessageId,
      fallbackIndex,
      { content, status: 'completed', isTyping: false, skipRender: renderedInPlace }
    );
    return content;
  } catch (error) {
    const currentIndex = findAssistantMessageIndex(originMessages, assistantMessageId, fallbackIndex);
    const partial = currentIndex >= 0 ? String(originMessages[currentIndex]?.content || '').trim() : '';
    const aborted = responseAbortRequested || error?.name === 'AbortError';
    await checkpointAssistantMessage(
      originConversationId,
      originMessages,
      sessionStartedAt,
      assistantMessageId,
      fallbackIndex,
      {
        content: partial || (aborted ? 'Resposta interrompida.' : `Erro: ${error.message}`),
        status: aborted ? 'interrupted' : 'failed',
        isTyping: false,
        error: aborted ? null : error.message
      }
    );
    return partial || '';
  }
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

async function sendMsg() {
  if (window.__worionAutoScrollPaused) {
    window.__worionAutoScrollPaused = false;
  }
  if (isAssistantResponding) {
    if (typeof window.interruptCurrentResponse === 'function') {
      window.interruptCurrentResponse();
    } else if (typeof interruptCurrentResponse === 'function') {
      interruptCurrentResponse();
    }
    return;
  }

  const inp = document.getElementById('chat-in');
  if (!inp) {
    console.error('[CHAT] input chat-in indisponivel no runtime');
    return;
  }

  const txt = inp.value.trim();
  const selectedTextContext = typeof getAskSelectionContextText === 'function'
    ? getAskSelectionContextText()
    : '';
  const currentAttachments = typeof attachedFiles !== 'undefined' && Array.isArray(attachedFiles) ? attachedFiles : [];
  if (!txt && currentAttachments.length === 0 && !selectedTextContext) return;

  const attachments = currentAttachments.slice();
  const rawText = txt && typeof applyTypoCorrections === 'function' ? applyTypoCorrections(txt) : txt;
  const buildAskPrompt = typeof window !== 'undefined' && typeof window.buildAskSelectionPrompt === 'function'
    ? window.buildAskSelectionPrompt
    : ((question, selection) => {
        const q = String(question || '').trim();
        const s = String(selection || '').trim();
        if (!s) return q;
        return `${q}\n\nContexto citado pelo usuário:\n"${s}"`;
      });
  const userVisibleContent = rawText || (selectedTextContext ? 'Explique este trecho.' : 'Analise os anexos enviados.');
  const content = userVisibleContent;
  const quoteContext = selectedTextContext || '';
  const now = new Date().toISOString();
  let originConversationId = null;
  let originMessages = messages;
  let originSnapshot = null;
  let assistantIndex = -1;
  let userIndex = -1;
  let preservedAttachments = attachments;
  let memoryPolicyForPersist = null;
  let assistantMessageForPersist = null;
  let assistantMessageId = null;
  const authorityActiveAgent = window.currentChatSource === 'agent' && typeof getActiveAgentForConversation === 'function'
    ? getActiveAgentForConversation()
    : null;
  if (authorityActiveAgent) {
    currentAgent = authorityActiveAgent;
    selected = authorityActiveAgent.id;
    window.agentsState = {
      ...(window.agentsState || {}),
      activeConversationAgentId: authorityActiveAgent.id,
      selectedAgentId: authorityActiveAgent.id
    };
  }
  // ABSORVIDO NO TRAFFIC CONTROLLER: resolveContextAuthority movido para trafficController
  // Mantendo para compatibilidade com código downstream que ainda o referencia
  let authorityDecision = null;
  if (typeof resolveContextAuthority === 'function') {
    authorityDecision = resolveContextAuthority({
      content,
      conversationHistory: originMessages,
      currentAgent: authorityActiveAgent,
      currentChatSource: window.currentChatSource
    });
    console.log('[CONTEXT AUTHORITY] (legacy)', {
      intent: authorityDecision?.intent,
      bypassMemory: authorityDecision?.shouldBypassMemory,
      bypassSources: authorityDecision?.shouldBypassSources,
      bypassWriter: authorityDecision?.shouldBypassWriter,
      allowedRoutes: authorityDecision?.allowedRoutes,
      forbiddenRoutes: authorityDecision?.forbiddenRoutes,
      reason: authorityDecision?.reason
    });
  }

  // ===== TRAFFIC CONTROLLER: Classificação unificada =====
  const traffic = trafficController(content, {
    files: preservedAttachments,
    activeAgent: authorityActiveAgent,
    connectorContext: '',
    currentProjectContext: ''
  });
  console.log('[TRAFFIC CONTROLLER]', {
    intent: traffic.intent,
    scope: traffic.scope,
    route: traffic.route,
    confidence: traffic.decision.confidence,
    reasoning: traffic.decision.reasoning
  });

  if (typeof detectArtifactRequest === 'function') {
    pendingArtifactRequest = detectArtifactRequest(content);
  }

  currentTurnPolicy = {
    allowMemoryWrite: false,
    reason: 'initializing',
    source: 'blocked',
    blockReasons: [],
    explicitNotionWriteAuthorized: typeof hasExplicitNotionWriteAuthorization === 'function'
      ? hasExplicitNotionWriteAuthorization(content)
      : false,
    deferNotionWrite: typeof hasDeferredTimeTrigger === 'function'
      ? hasDeferredTimeTrigger(content)
      : false,
    shouldExecuteDeferredNow: typeof shouldExecuteDeferredActionsNow === 'function'
      ? shouldExecuteDeferredActionsNow(content)
      : false
  };
  currentTurnPolicy = { ...currentTurnPolicy, ...createMemoryWritePolicy(content) };
  // Debug silenciado
  // console.log(`[MEMORY WRITE POLICY] allow=${currentTurnPolicy.allowMemoryWrite} reason=${currentTurnPolicy.reason}`);
  if (typeof shouldEnableNotionAutoSave === 'function' && shouldEnableNotionAutoSave(content)) {
    autoSaveNotion = true;
  }

  // Rastrear refutações antes de processar
  if (typeof trackRefutations === 'function') {
    trackRefutations(content, originMessages);
  }

  if (!currentConversationId && typeof makeId === 'function') currentConversationId = makeId('conversation');
  originConversationId = currentConversationId;
  if (!sessionStartedAt) sessionStartedAt = new Date(now);
  originMessages.push({ role: 'user', content: userVisibleContent, quoteContext, createdAt: now, attachments });
  userIndex = originMessages.length - 1;
  if (typeof attachedFiles !== 'undefined' && Array.isArray(attachedFiles)) attachedFiles = [];
  if (selectedTextContext && typeof clearAskSelectionContext === 'function') clearAskSelectionContext();
  sessionSaved = false;
  inp.value = '';
  inp.style.height = 'auto';
  if (typeof updateAttachmentsPreview === 'function') updateAttachmentsPreview();
  if (typeof renderOriginConversation === 'function') renderOriginConversation(originConversationId);

  if (typeof requestAnimationFrame === 'function') {
    await new Promise(resolve => requestAnimationFrame(resolve));
  } else {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  preservedAttachments = typeof enrichAttachmentsForRuntime === 'function'
    ? await enrichAttachmentsForRuntime(attachments.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        kind: file.kind,
        data: file.data,
        text: file.text,
        extractedText: file.extractedText || file.text
      })))
    : attachments;

  if (userIndex >= 0 && originMessages[userIndex]) {
    originMessages[userIndex].attachments = preservedAttachments;
  }

  if (isRuntimeIntrospectionQuestion(content)) {
    const introspectionReply = generateRuntimeIntrospectionResponse(content);

    // Debug silenciado
    // console.log('[RUNTIME INTROSPECTION] intercepted:', {
    //   userMessage: content,
    //   hasLastAssistantRuntimeFacts: typeof window !== 'undefined' && !!window.lastAssistantRuntimeFacts,
    //   facts: typeof window !== 'undefined' ? (window.lastAssistantRuntimeFacts || null) : null
    // });

    const assistantSkeleton = createAssistantMessageSkeleton(originConversationId, { status: 'executing' });
    assistantMessageId = assistantSkeleton.id;
    originMessages.push(assistantSkeleton);
    assistantIndex = originMessages.length - 1;
    isAssistantResponding = true;
    responseAbortRequested = false;
    currentResponseController = new AbortController();
    if (typeof renderOriginConversation === 'function') renderOriginConversation(originConversationId);
    if (typeof showWorionStatus === 'function') showWorionStatus('executing');

    await renderAssistantReplyWithCheckpoint(
      originConversationId,
      originMessages,
      sessionStartedAt,
      assistantMessageId,
      assistantIndex,
      introspectionReply,
      { startStatus: 'executing' }
    );

    if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
    isAssistantResponding = false;
    responseAbortRequested = false;
    currentResponseController = null;
    if (typeof renderOriginConversation === 'function') renderOriginConversation(originConversationId);
    await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt, {
      skipContextIndexing: true,
      reason: 'runtime_introspection',
      memoryPolicy: { ...currentTurnPolicy, allowMemoryWrite: false, reason: 'runtime_introspection' },
      userMessage: content,
      assistantMessage: introspectionReply
    });
    currentTurnPolicy = {
      allowMemoryWrite: false,
      reason: 'reset',
      source: 'blocked',
      blockReasons: [],
      explicitNotionWriteAuthorized: false,
      deferNotionWrite: false,
      shouldExecuteDeferredNow: false
    };
    return;
  }

  let gateResult = null;
  try {
    gateResult = await runCommandIntentGate(content);
  } catch (error) {
    console.error('[COMMAND GATE] erro ao executar comando:', error);
    gateResult = {
      handled: true,
      stopPipeline: true,
      type: 'command_error',
      reply: `Erro: ${error.message}`
    };
  }
  if (gateResult.handled && gateResult.stopPipeline) {
    currentTurnPolicy = { ...currentTurnPolicy, ...createMemoryWritePolicy(content, gateResult) };
    // Debug silenciado
  // console.log(`[MEMORY WRITE POLICY] allow=${currentTurnPolicy.allowMemoryWrite} reason=${currentTurnPolicy.reason}`);

    if (typeof buildConversationSnapshot === 'function') {
      originSnapshot = buildConversationSnapshot({
        conversationId: originConversationId,
        messages: originMessages,
        sessionStartedAt
      });
    }
    if (typeof saveConversationSnapshot === 'function') {
      await saveConversationSnapshot(originSnapshot, { silent: true });
      // console.log('[CHAT] Snapshot PRE-assistente salvo');
    }

    const finalReply = gateResult.reply || '';
    if (finalReply) {
      const assistantSkeleton = createAssistantMessageSkeleton(originConversationId, { status: 'executing' });
      assistantMessageId = assistantSkeleton.id;
      originMessages.push(assistantSkeleton);
      assistantIndex = originMessages.length - 1;
      isAssistantResponding = true;
      responseAbortRequested = false;
      currentResponseController = new AbortController();
      if (typeof renderOriginConversation === 'function') renderOriginConversation(originConversationId);
      if (typeof showWorionStatus === 'function') showWorionStatus('executing');

      await renderAssistantReplyWithCheckpoint(
        originConversationId,
        originMessages,
        sessionStartedAt,
        assistantMessageId,
        assistantIndex,
        finalReply,
        { startStatus: 'executing' }
      );

      if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
      isAssistantResponding = false;
      responseAbortRequested = false;
      currentResponseController = null;
      if (typeof renderOriginConversation === 'function') renderOriginConversation(originConversationId);
    }
    await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt, {
      skipContextIndexing: true,
      reason: currentTurnPolicy.reason,
      memoryPolicy: currentTurnPolicy
    });
    currentTurnPolicy = {
      allowMemoryWrite: false,
      reason: 'reset',
      source: 'blocked',
      blockReasons: [],
      explicitNotionWriteAuthorized: false,
      deferNotionWrite: false,
      shouldExecuteDeferredNow: false
    };
    return;
  }

  if (authorityDecision && ['greeting', 'meta_feedback'].includes(authorityDecision.intent)) {
    const finalReply = authorityDecision.intent === 'greeting'
      ? (typeof getGreetingResponse === 'function' ? getGreetingResponse(content) : 'Oi. Estou por aqui.')
      : buildImmediateFeedbackResponse(content, getLastAssistantReplyText(originMessages));

    if (typeof buildConversationSnapshot === 'function') {
      originSnapshot = buildConversationSnapshot({
        conversationId: originConversationId,
        messages: originMessages,
        sessionStartedAt
      });
    }
    if (typeof saveConversationSnapshot === 'function') {
      await saveConversationSnapshot(originSnapshot, { silent: true });
    }

    const assistantSkeleton = createAssistantMessageSkeleton(originConversationId, { status: 'executing' });
    assistantMessageId = assistantSkeleton.id;
    originMessages.push(assistantSkeleton);
    assistantIndex = originMessages.length - 1;
    isAssistantResponding = true;
    responseAbortRequested = false;
    currentResponseController = new AbortController();
    if (typeof renderOriginConversation === 'function') renderOriginConversation(originConversationId);

    await renderAssistantReplyWithCheckpoint(
      originConversationId,
      originMessages,
      sessionStartedAt,
      assistantMessageId,
      assistantIndex,
      finalReply,
      { startStatus: 'executing' }
    );

    if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
    isAssistantResponding = false;
    responseAbortRequested = false;
    currentResponseController = null;
    assistantMessageForPersist = finalReply;
    await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt, {
      skipContextIndexing: true,
      reason: `context_authority_${authorityDecision.intent}`,
      memoryPolicy: { ...currentTurnPolicy, allowMemoryWrite: false, reason: `context_authority_${authorityDecision.intent}` },
      userMessage: content,
      assistantMessage: finalReply
    });
    currentTurnPolicy = {
      allowMemoryWrite: false,
      reason: 'reset',
      source: 'blocked',
      blockReasons: [],
      explicitNotionWriteAuthorized: false,
      deferNotionWrite: false,
      shouldExecuteDeferredNow: false
    };
    return;
  }

  try {
    memoryCardsContext = '';
    connectorContext = '';
    internalMemoryContext = '';
    if (!authorityDecision?.shouldBypassSources && typeof getConnectorContextForMessage === 'function') {
      connectorContext = await getConnectorContextForMessage(`${content}\n${attachments.map(file => file.text || '').join('\n')}`);
    }
    const hasActiveMemoryCardInSearch = Boolean(window.currentMemoryCardProjectId);
    const hasActiveAgentInSearch = window.currentChatSource === 'agent' && typeof getActiveAgentForConversation === 'function' && Boolean(getActiveAgentForConversation());

    // BUSCA LIVRE 2026-06-05: Sempre busca memória, mesmo com Memory Card ou Agente ativo
    if (!authorityDecision?.shouldBypassMemory) {
      internalMemoryContext = typeof searchInternalMemory === 'function' ? await searchInternalMemory(content) : '';
      memoryCardsContext = typeof searchMemoryCards === 'function' ? await searchMemoryCards(content) : '';

      // ETAPA 4: Injetar segmentos de memória para perguntas pessoais ou explícitas
      const shouldSearchMemory =
        isExplicitPrivateMemoryQuery(content) ||
        isPersonalQuestion(content) ||
        traffic?.route === 'memory_search' ||
        traffic?.scope === 'private_memory_context' ||
        traffic?.intent === 'private_memory';

      if (shouldSearchMemory) {
        const isExplicitMemory = isExplicitPrivateMemoryQuery(content);

        if (isExplicitMemory) {
          console.log('[MEMORY INTENT] explicit private memory query detected', {
            route: traffic?.route,
            scope: traffic?.scope,
            intent: traffic?.intent,
            reasoning: traffic?.reasoning
          });

          // ATALHO: Para queries explícitas de memória, gerar resposta no backend (evita MODEL SAFETY)
          if (typeof getMemorySearchAnswer === 'function') {
            console.log('[MEMORY SEARCH BACKEND] gerando resposta no backend para evitar MODEL SAFETY');
            const backendAnswer = await getMemorySearchAnswer(content, 5);
            if (backendAnswer) {
              const assistantSkeleton = createAssistantMessageSkeleton(originConversationId, { status: 'executing' });
              assistantMessageId = assistantSkeleton.id;
              originMessages.push(assistantSkeleton);
              assistantIndex = originMessages.length - 1;
              isAssistantResponding = true;
              await renderAssistantReplyWithCheckpoint(
                originConversationId,
                originMessages,
                sessionStartedAt,
                assistantMessageId,
                assistantIndex,
                backendAnswer,
                { status: 'completed' }
              );
              isAssistantResponding = false;
              assistantMessageForPersist = backendAnswer;
              await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt);
              return;
            }
          }
        } else {
          console.log('[MEMORY SEGMENTS] pergunta pessoal detectada');
        }

        const personalSegments = await searchMemorySegments(content, 5);
        if (personalSegments.length > 0) {
          const segmentsContext = formatMemorySegmentsContext(personalSegments);
          console.log('[MEMORY SEGMENTS] injetados:', personalSegments.length, 'segmentos');
          console.log('[MEMORY SEGMENTS] contexto:', String(segmentsContext).slice(0, 200));
          internalMemoryContext = [
            segmentsContext,
            internalMemoryContext
          ].filter(Boolean).join('\n\n');
        } else {
          console.log('[MEMORY SEGMENTS] nenhum segmento encontrado');
        }
      } else {
        console.log('[MEMORY SEGMENTS] pergunta não é pessoal ou explícita (busca não realizada)');
      }

      if (hasActiveMemoryCardInSearch) {
        console.log('[MEMORY CARD SCOPE] Memory Card ativo (busca de memória global MANTIDA)');
      }
      if (hasActiveAgentInSearch) {
        console.log('[AGENT SCOPE] Agente ativo (busca de memória global MANTIDA)');
      }
    }
  } catch (error) {
    internalMemoryContext = '';
    memoryCardsContext = '';
    console.warn('[CHAT] Falha ao montar contexto auxiliar:', error);
  }

  if (typeof buildConversationSnapshot === 'function') {
    originSnapshot = buildConversationSnapshot({
      conversationId: originConversationId,
      messages: originMessages,
      sessionStartedAt
    });
  }
  // Debug silenciado
  // console.log('[CHAT] Tentando salvar snapshot PRE-assistente', {
  //   saveExists: typeof saveConversationSnapshot === 'function',
  //   hasSnapshot: !!originSnapshot,
  //   conversationId: originSnapshot?.conversationId
  // });
  if (typeof saveConversationSnapshot === 'function') {
    await saveConversationSnapshot(originSnapshot, { silent: true });
    // console.log('[CHAT] Snapshot PRE-assistente salvo');
  } else {
    console.error('[CHAT] saveConversationSnapshot NAO DISPONIVEL!');
  }

  const assistantSkeleton = createAssistantMessageSkeleton(originConversationId);
  assistantMessageId = assistantSkeleton.id;
  originMessages.push(assistantSkeleton);
  assistantIndex = originMessages.length - 1;
  isAssistantResponding = true;
  responseAbortRequested = false;
  currentResponseController = new AbortController();
  if (typeof window !== 'undefined') {
    window.__worionAssistantCheckpoint = async ({ message, status, skipRender = false }) => {
      if (!assistantMessageId || message?.id !== assistantMessageId) return;
      await checkpointAssistantMessage(
        originConversationId,
        originMessages,
        sessionStartedAt,
        assistantMessageId,
        assistantIndex,
        {
          content: message.content,
          status: status || message.status || 'streaming',
          isTyping: Boolean(message.isTyping),
          provider: message.provider,
          model: message.model,
          skipRender
        }
      );
    };
  }
  await checkpointAssistantMessage(
    originConversationId,
    originMessages,
    sessionStartedAt,
    assistantMessageId,
    assistantIndex,
    { status: 'streaming', content: '' }
  );
  if (typeof renderOriginConversation === 'function') renderOriginConversation(originConversationId);
  if (typeof showWorionStatus === 'function') showWorionStatus('thinking');

  try {
    if (isDeepWorionShortcut(content)) {
      if (typeof showWorionStatus === 'function') showWorionStatus('executing');
      const deepWorionReply = await runDeepWorionShortcut(content);
      const finalReply = `## DeepWorion CLI\n\n${deepWorionReply}`;
      await renderAssistantReplyWithCheckpoint(
        originConversationId,
        originMessages,
        sessionStartedAt,
        assistantMessageId,
        assistantIndex,
        finalReply,
        { startStatus: 'executing' }
      );
      await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt);
      return;
    }

    // ============================================
    // DETECÇÃO DIRETA: CRIAR PÁGINA NO NOTION
    // ============================================
    const directNotionPageRequest = (
      typeof detectNotionPageRequest === 'function' &&
      typeof executeNotionPageRequest === 'function'
    ) ? detectNotionPageRequest(content) : null;
    if (directNotionPageRequest) {
      if (typeof showWorionStatus === 'function') showWorionStatus('executing');
      const notionPageResult = await executeNotionPageRequest(directNotionPageRequest);
      const finalReply = typeof notionPageResult === 'string'
        ? notionPageResult
        : notionPageResult.reply || notionPageResult.message || 'Página criada no Notion.';
      await renderAssistantReplyWithCheckpoint(
        originConversationId,
        originMessages,
        sessionStartedAt,
        assistantMessageId,
        assistantIndex,
        finalReply,
        { startStatus: 'executing' }
      );
      await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt);
      return;
    }

    if (
      currentTurnPolicy.shouldExecuteDeferredNow &&
      typeof executeDeferredActions === 'function'
    ) {
      if (typeof showWorionStatus === 'function') showWorionStatus('executing');
      const deferredResults = await executeDeferredActions({ force: true });
      const finalReply = deferredResults.length
        ? deferredResults.map(result => result.success
          ? `Ação executada: ${result.description || result.tool}`
          : `Falha ao executar ${result.description || result.tool}: ${result.error || 'bloqueada'}`
        ).join('\n')
        : 'Não havia ações pendentes para executar.';
      await renderAssistantReplyWithCheckpoint(
        originConversationId,
        originMessages,
        sessionStartedAt,
        assistantMessageId,
        assistantIndex,
        finalReply,
        { startStatus: 'executing' }
      );
      await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt);
      return;
    }

    // ============================================
    // DETECÇÃO DIRETA: TRANSCRIÇÃO DE VÍDEO
    // ============================================
    if (
      typeof detectVideoTranscriptionRequest === 'function' &&
      typeof executeDirectVideoTranscription === 'function' &&
      detectVideoTranscriptionRequest(content)
    ) {
      if (typeof showWorionStatus === 'function') showWorionStatus('executing');

      // Callback para streaming progressivo da transcrição
      const streamCallback = async (chunk) => {
        if (
          typeof isOriginConversationActive === 'function' &&
          isOriginConversationActive(originConversationId) &&
          assistantIndex >= 0
        ) {
          await checkpointAssistantMessage(
            originConversationId,
            originMessages,
            sessionStartedAt,
            assistantMessageId,
            assistantIndex,
            { content: chunk, status: 'streaming' }
          );
          if (typeof renderOriginConversation === 'function') {
            renderOriginConversation(originConversationId);
          }
        }
      };

      const videoResult = await executeDirectVideoTranscription(content, streamCallback);
      const finalReply = videoResult.reply || 'Processamento de vídeo concluído.';

      await checkpointAssistantMessage(
        originConversationId,
        originMessages,
        sessionStartedAt,
        assistantMessageId,
        assistantIndex,
        { content: finalReply, status: 'completed', isTyping: false }
      );
      if (typeof renderOriginConversation === 'function') {
        renderOriginConversation(originConversationId);
      }

      await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt);
      return;
    }

    if (
      typeof shouldForceNotionToolAttempt === 'function' &&
      typeof executeDirectNotionReadRequest === 'function' &&
      shouldForceNotionToolAttempt(content)
    ) {
      const activeAgent = typeof getActiveAgentForConversation === 'function' ? getActiveAgentForConversation() : null;
      if (window.currentChatSource === 'agent' && activeAgent && hasNotionLink(content)) {
        currentAgent = activeAgent;
        window.agentsState = {
          ...(window.agentsState || {}),
          activeConversationAgentId: activeAgent.id,
          selectedAgentId: activeAgent.id
        };
        if (typeof setWorionRouteGuard === 'function') setWorionRouteGuard('private_connector_context', content);
        logAgentRuntime({
          activeAgent,
          modelFromAgent: activeAgent.model || null,
          manualModelOverride: window.manualSelectedModel || null,
          documentsCount: Array.isArray(activeAgent.documents) ? activeAgent.documents.length : 0,
          route: 'private_context_synthesis',
          scope: 'private_connector_context'
        });
      }
      if (typeof showWorionStatus === 'function') showWorionStatus('openingSources');
      const notionReadResult = await executeDirectNotionReadRequest(content);
      const notionReply = buildDirectNotionReadReply(notionReadResult, content);
      const finalReply = typeof normalizeAssistantReply === 'function'
        ? normalizeAssistantReply(notionReply || notionReadResult.reply || '', content)
        : (notionReply || notionReadResult.reply || '');
      await renderAssistantReplyWithCheckpoint(
        originConversationId,
        originMessages,
        sessionStartedAt,
        assistantMessageId,
        assistantIndex,
        finalReply,
        { startStatus: 'executing' }
      );
      await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt);
      return;
    }

    const thinkingContext = typeof getSequentialThinkingContext === 'function'
      ? await getSequentialThinkingContext(content, preservedAttachments)
      : '';
    const attachmentContext = typeof buildAttachmentContextForPrompt === 'function'
      ? buildAttachmentContextForPrompt(preservedAttachments)
      : '';
    const agentDomainResearchContext = '';
    const activeMemoryCardProjectContext = !authorityDecision?.shouldBypassMemory && window.currentMemoryCardProjectId && window.WorionMemoryCardsRuntime?.buildMemoryCardChatContext
      ? window.WorionMemoryCardsRuntime.buildMemoryCardChatContext(window.currentMemoryCardProjectId)
      : '';
    console.log('[MEMORY CARD CONTEXT] built:', {
      cardId: window.currentMemoryCardProjectId || null,
      title: window.currentMemoryChatTitle || '',
      blockLength: activeMemoryCardProjectContext?.length || 0,
      preview: String(activeMemoryCardProjectContext || '').slice(0, 300)
    });
    const externalContext = [
      attachmentContext,
      agentDomainResearchContext,
      connectorContext,
      internalMemoryContext,
      memoryCardsContext
    ].filter(Boolean).join('\n\n');
    const systemPrompt = typeof buildSystemPrompt === 'function'
      ? await buildSystemPrompt(content, preservedAttachments, externalContext)
      : `Sistema indisponivel: buildSystemPrompt nao foi carregado. Verifique se prompt.js esta incluido na pagina.`;
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...(activeMemoryCardProjectContext ? [{ role: 'system', content: activeMemoryCardProjectContext }] : []),
      ...(thinkingContext ? [{ role: 'system', content: thinkingContext }] : []),
      ...originMessages
        .filter(message => message.content !== '...' && ['user', 'assistant'].includes(message.role))
        .map(message => {
          if (message.role === 'user' && message.quoteContext) {
            return { role: 'user', content: buildAskPrompt(message.content, message.quoteContext) };
          }
          return typeof formatMessageForOpenAI === 'function' ? formatMessageForOpenAI(message) : message;
        })
    ];
    const apiMessagesForMemoryCardLog = JSON.stringify(apiMessages);
    console.log('[MEMORY CARD CONTEXT] included before model:', {
      hasActiveCard: Boolean(window.currentMemoryCardProjectId),
      cardId: window.currentMemoryCardProjectId || null,
      messagesCount: apiMessages.length,
      containsMemoryCardContext: apiMessagesForMemoryCardLog.includes('Memory Card') || apiMessagesForMemoryCardLog.includes('Conhecimento do card'),
      totalChars: apiMessagesForMemoryCardLog.length
    });

    if (typeof showWorionStatus === 'function') showWorionStatus('composing');
    // Bug fix: Prioridade de seleção de modelo: Manual > Agente > Router
    const activeAgent = window.currentChatSource === 'agent'
      ? getActiveAgentForConversation()
      : null;
    if (activeAgent) {
      currentAgent = activeAgent;
      selected = activeAgent.id;
      window.agentsState = {
        ...(window.agentsState || {}),
        activeConversationAgentId: activeAgent.id,
        selectedAgentId: activeAgent.id
      };
    }
    const manualModel = window.manualSelectedModel || null;
    const agentModel = activeAgent ? activeAgent.model : null;
    const selectedRuntimeModel = manualModel || null;

    const isAgentSession = window.currentChatSource === 'agent' && Boolean(activeAgent);

    if (
      window.currentMemoryCardProjectId &&
      activeMemoryCardProjectContext &&
      isActiveMemoryCardInventoryQuestion(content)
    ) {
      const inventoryReply = buildActiveMemoryCardInventoryReply(activeMemoryCardProjectContext, window.currentMemoryChatTitle || '');
      const assistantSkeleton = createAssistantMessageSkeleton(originConversationId, { status: 'executing' });
      assistantMessageId = assistantSkeleton.id;
      originMessages.push(assistantSkeleton);
      assistantIndex = originMessages.length - 1;
      isAssistantResponding = true;
      await renderAssistantReplyWithCheckpoint(
        originConversationId,
        originMessages,
        sessionStartedAt,
        assistantMessageId,
        assistantIndex,
        inventoryReply,
        { status: 'completed' }
      );
      isAssistantResponding = false;
      assistantMessageForPersist = inventoryReply;
      console.log('[MEMORY CARD CONTEXT] inventory answered from active card:', {
        cardId: window.currentMemoryCardProjectId,
        title: window.currentMemoryChatTitle || '',
        blockLength: activeMemoryCardProjectContext.length,
        replyLength: inventoryReply.length
      });
      await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt);
      return;
    }

    // ABSORVIDO NO TRAFFIC CONTROLLER: Immediate Feedback Detector (ex-gate #18)
    // Detectada na trafficController via Regra 1 (trivial + silêncio)
    // const isImmediateFeedbackInput = typeof isImmediateFeedback === 'function' && isImmediateFeedback(content);
    // if (isImmediateFeedbackInput) { ... }

    // TRIVIAL CLASSIFIER - detecta perguntas que não precisam de ferramentas
    const isTrivial = typeof isTrivialQuestion === 'function' && isTrivialQuestion(content);
    if (isTrivial) {
      console.log('[TRIVIAL ROUTE] Input detectado como trivial, resposta direta sem ferramentas');

      // ABSORVIDO NO TRAFFIC CONTROLLER: Greeting Detector (ex-gate #14)
      // Detectada na trafficController via Regra 1 (trivial + silêncio)
      // const isGreetingInput = typeof isGreeting === 'function' && isGreeting(content);
      // if (isGreetingInput) { ... }

      // Resposta hardcoded para triviais (sem LLM)
      let trivialReply = '';

      // Categorizar e responder sem LLM
      const normalizedContent = content.trim().toLowerCase();

      if (/^\.[\s]*$/.test(normalizedContent)) {
        // Ponto final sozinho
        trivialReply = 'Estou aqui.';
      } else if (/^(obrigado|obrigada|valeu|thanks|thank you|brigado|vlw)[\s.!?]*$/i.test(normalizedContent)) {
        // Agradecimentos
        trivialReply = 'De nada! 😊';
      } else if (/^(ok|okay|entendi|certo|perfeito|beleza|show|legal|sim|nao|não)[\s.!?]*$/i.test(normalizedContent)) {
        // Confirmações
        trivialReply = 'Entendi. Como posso ajudar?';
      } else {
        // Fallback para outras triviais curtas
        trivialReply = 'Estou aqui para ajudar. O que você precisa?';
      }

      if (typeof hideExecutionStatus === 'function') hideExecutionStatus();

      if (trivialReply) {
        const assistantSkeleton = createAssistantMessageSkeleton(originConversationId, { status: 'executing' });
        assistantMessageId = assistantSkeleton.id;
        originMessages.push(assistantSkeleton);
        assistantIndex = originMessages.length - 1;
        isAssistantResponding = true;

        await renderAssistantReplyWithCheckpoint(
          originConversationId,
          originMessages,
          sessionStartedAt,
          assistantMessageId,
          assistantIndex,
          trivialReply,
          { status: 'completed' }
        );

        isAssistantResponding = false;
        console.log('[TRIVIAL ROUTE] Resposta hardcoded renderizada sem LLM: "' + trivialReply + '"');
      }
      return;
    }

    const hasActiveMemoryCard = Boolean(window.currentMemoryCardProjectId);

    // ABSORVIDO NO TRAFFIC CONTROLLER: classifyQuestionScope chamado na L1597
    // Usando traffic.scope em vez de classificador separado
    let questionScope = traffic.scope;

    // Fallback para compatibilidade (removido classifyQuestionScope)
    // let questionScope = typeof classifyQuestionScope === 'function'
    //   ? classifyQuestionScope(content, {
    //       files: preservedAttachments,
    //       attachments: preservedAttachments,
    //       activeConnectors: connections,
    //       currentProjectContext,
    //       memoryAvailable: !authorityDecision?.shouldBypassMemory,
    //       connectorContext,
    //       internalMemoryContext,
    //       memoryCardsContext,
    //       activeAgent: isAgentSession ? activeAgent : null
    //     })
    //   : 'conversation_or_general';

    // MEMORY CARD ATIVO TEM PRECEDÊNCIA MÁXIMA SOBRE ESCOPO
    if (hasActiveMemoryCard && !authorityDecision?.shouldBypassMemory) {
      const asksAboutMemory = /\b(memória|memorias|memórias|contexto|conhecimento|cards?|lembr|gravad|registrad|anot)\b/i.test(content);
      if (asksAboutMemory) {
        questionScope = 'private_memory_context';
        console.log('[MEMORY CARD SCOPE] Memory Card ativo forçou scope para private_memory_context');
      }
    }

    // AGENTE ATIVO COM DOCUMENTOS TEM PRECEDÊNCIA SOBRE ESCOPO
    if (isAgentSession && activeAgent && !authorityDecision?.shouldBypassMemory) {
      const hasAgentDocuments = Array.isArray(activeAgent.documents) && activeAgent.documents.length > 0;
      const asksAboutAgentMemory = /\b(memória|memorias|memórias|contexto|conhecimento|documento|arquivos?|material|conteúdo|dados|informaç)\b/i.test(content);
      if (hasAgentDocuments && asksAboutAgentMemory) {
        questionScope = 'private_agent_context';
        console.log('[AGENT SCOPE] Agente ativo com documentos forçou scope para private_agent_context');
      }
    }

    if (isAgentSession && hasNotionLink(content)) {
      questionScope = 'private_connector_context';
    }
    if (authorityDecision?.intent === 'identity_or_role_question') {
      questionScope = 'conversation_or_general';
    } else if (authorityDecision?.intent === 'private_context_lookup') {
      questionScope = 'private_memory_context';
    } else if (authorityDecision?.shouldBypassMemory && authorityDecision?.forbiddenRoutes?.includes('private_context_synthesis')) {
      questionScope = 'conversation_or_general';
    }
    let isPrivateContextScope = typeof isPrivateQuestionScope === 'function'
      ? isPrivateQuestionScope(questionScope)
      : (String(questionScope || '').startsWith('private_') || questionScope === 'uploaded_file_context');

    // NÃO setar o Guard aqui - será setado DEPOIS da sobrescrita do scope

    // ABSORVIDO NO TRAFFIC CONTROLLER: getExecutionRoute chamado na L1597
    // Usando traffic.route em vez de classificador separado
    const baseExecutionRoute = traffic.route;
    // const baseExecutionRoute = typeof getExecutionRoute === 'function' ? getExecutionRoute(content, originMessages) : 'direct_answer';
    const activeSkill = typeof getActiveSkill === 'function' ? getActiveSkill() : null;
    const simpleConversationInput = typeof isSimpleConversationInput === 'function'
      ? isSimpleConversationInput(content)
      : false;
    const activeSkillLabel = activeSkill?.id || activeSkill?.name || '';
    const activeSkillRoutingText = [
      activeSkill?.id,
      activeSkill?.name,
      activeSkill?.category,
      activeSkill?.description,
      activeSkill?.desc,
      String(activeSkill?.prompt || '').slice(0, 1200)
    ].filter(Boolean).join(' ');
    const activeSkillIsConversation =
      Boolean(activeSkill && activeSkill.type === 'conversation') ||
      /\b(diario|diário|reflexivo|conversa|conversas|profunda|profundas|journal|reflection|escuta|presenca|presença|facilitador|diarista)\b/i.test(activeSkillRoutingText);
    const shouldForceDirectConversation = activeSkillIsConversation && simpleConversationInput;
    const shouldSuppressResearchPromotion =
      isPrivateContextScope ||
      (typeof isDirectSelfReferenceInput === 'function' && isDirectSelfReferenceInput(content));
    if (activeSkill) {
      console.log('[ROUTING] Active skill:', activeSkillLabel);
      console.log('[ROUTING] Input:', JSON.stringify(content));
      console.log('[ROUTING] isSimpleConversationInput:', simpleConversationInput);
      console.log('[ROUTING] suppressResearchPromotion:', shouldSuppressResearchPromotion);
    }
    const activeResearchMode =
      (typeof hasActiveWorkMode === 'function' && (hasActiveWorkMode('smart-research') || hasActiveWorkMode('factual-verification'))) ||
      (activeSkill && /research|pesquisa|elicit|perplexity/i.test(activeSkillLabel));

    // ABSORVIDO NO TRAFFIC CONTROLLER: Explicit Public Research Detector (ex-gate #20)
    // Detectada na trafficController via Regra 4 (pesquisa pública explícita)
    // const asksExplicitPublicResearch = !authorityDecision?.shouldBypassSources && ( ... );
    // Usando traffic.scope em vez de detectar novamente
    const asksExplicitPublicResearch = traffic.scope === 'public_research';

    // CORREÇÃO DEFINITIVA: Pesquisa pública explícita SEMPRE força research
    if (asksExplicitPublicResearch) {
      console.log('[ROUTING] Pesquisa pública explícita detectada - forçando research (via TRAFFIC CONTROLLER):', {
        scopeOriginal: questionScope,
        trafficScope: traffic.scope,
        hasAgent: isAgentSession,
        agent: activeAgent?.name || 'none'
      });
      questionScope = 'public_research';
    }

    // PROTEÇÃO: Se TrafficController classificou como memory_search (consulta explícita de memória),
    // respeitá-lo antes de aplicar lógica geral
    let executionRoute = baseExecutionRoute === 'memory_search'
      ? 'memory_search'
      : isPrivateContextScope && !asksExplicitPublicResearch
      ? 'private_context_synthesis'
      : asksExplicitPublicResearch
      ? 'focused_research'
      : shouldForceDirectConversation
      ? 'direct_answer'
      : activeResearchMode && baseExecutionRoute === 'direct_answer' && !shouldSuppressResearchPromotion && questionScope === 'public_research'
      ? 'focused_research'
      : baseExecutionRoute;
    // PROTEÇÃO: memory_search (consulta explícita de memória) nunca é sobrescrito
    const isExplicitMemorySearch = executionRoute === 'memory_search';

    if (!isExplicitMemorySearch) {
      if (authorityDecision?.intent === 'private_context_lookup') {
        executionRoute = 'private_context_synthesis';
        questionScope = 'private_memory_context';
        isPrivateContextScope = true;
      } else if (authorityDecision?.intent === 'factual_research') {
        executionRoute = 'focused_research';
        questionScope = 'public_research';
        isPrivateContextScope = false;
      } else if (authorityDecision?.forbiddenRoutes?.includes(executionRoute)) {
        executionRoute = authorityDecision.allowedRoutes?.[0] || 'direct_answer';
        questionScope = 'conversation_or_general';
        isPrivateContextScope = false;
      }
      if (authorityDecision?.forbiddenRoutes?.includes(executionRoute)) {
        executionRoute = authorityDecision.allowedRoutes?.[0] || 'direct_answer';
        questionScope = 'conversation_or_general';
        isPrivateContextScope = false;
      }
    }
    if (executionRoute === 'conceptual_synthesis' || executionRoute === 'identity_agent_response') {
      executionRoute = 'direct_answer';
    }
    const authorityResearchRoutes = ['focused_research', 'deep_research', 'comparative_research'];
    if (
      authorityDecision?.shouldBypassSources &&
      authorityResearchRoutes.includes(executionRoute) &&
      authorityDecision.intent !== 'factual_research' &&
      !authorityDecision.allowedRoutes?.includes(executionRoute)
    ) {
      const downgradedRoute = authorityDecision.allowedRoutes?.[0] || 'direct_answer';
      console.warn('[CONTEXT AUTHORITY] route downgraded before final route', {
        intent: authorityDecision.intent,
        from: executionRoute,
        to: downgradedRoute,
        reason: authorityDecision.reason
      });
      executionRoute = downgradedRoute;
      questionScope = 'conversation_or_general';
      isPrivateContextScope = false;
    }
    console.log('[EXECUTION ROUTER] final route after authority:', executionRoute);

    if (asksExplicitPublicResearch) {
      console.log('[PUBLIC RESEARCH] Rota forçada para focused_research', {
        scope: questionScope,
        route: executionRoute
      });
    }

    const memoryAllowed = executionRoute === 'private_context_synthesis';
    const writerMode = 'deterministic_cleanup';
    console.debug('[ROUTE DECISION]', {
      route: executionRoute,
      isGreeting: false,
      isImmediateFeedback: false,
      activeAgent: activeAgent?.name || null,
      memoryAllowed,
      writerMode
    });

    // Setar o Guard APÓS a sobrescrita do scope
    const finalIsPrivateScope = typeof isPrivateQuestionScope === 'function'
      ? isPrivateQuestionScope(questionScope)
      : (String(questionScope || '').startsWith('private_') || questionScope === 'uploaded_file_context');

    if (typeof setWorionRouteGuard === 'function') {
      setWorionRouteGuard(questionScope, content);
    } else if (typeof window !== 'undefined') {
      window.__worionRouteGuard = { questionScope, userMessage: content, active: finalIsPrivateScope };
    }

    console.log('[EXECUTION ROUTER] question scope:', questionScope, 'route:', executionRoute);
    logAgentRuntime({
      activeAgent,
      modelFromAgent: agentModel,
      manualModelOverride: manualModel,
      documentsCount: Array.isArray(activeAgent?.documents) ? activeAgent.documents.length : 0,
      route: executionRoute,
      scope: questionScope
    });
    if (shouldForceDirectConversation) {
      console.log('[ROUTING] Route: direct_response (pesquisa ignorada)');
    }
    const executionProfile = typeof EXECUTION_PROFILES !== 'undefined'
      ? (EXECUTION_PROFILES[executionRoute] || EXECUTION_PROFILES.direct_answer)
      : null;
    const researchRoutes = ['focused_research', 'deep_research', 'source_check', 'comparative_research'];
    const maxTokens = executionProfile?.maxTokens || (typeof getResponseTokenBudget === 'function' ? getResponseTokenBudget(content) : 8000);
    const modelRouterEnabled = typeof isModelRouterEnabled !== 'function' || isModelRouterEnabled();

    // Model Router: Selecionar modelo mais adequado baseado em conteúdo e rota
    let resolvedModel = selectedRuntimeModel || (!modelRouterEnabled ? agentModel : null);
    let modelSelection = null;

    // Debug silenciado
    // console.log('[MODEL ROUTER DEBUG]', {
    //   manualModel,
    //   agentModel,
    //   selectedRuntimeModel,
    //   hasSelectFunc: typeof selectModelForMessage === 'function',
    //   hasIsEnabledFunc: typeof isModelRouterEnabled === 'function',
    //   isEnabled: typeof isModelRouterEnabled === 'function' ? isModelRouterEnabled() : 'N/A'
    // });

    if (!selectedRuntimeModel && modelRouterEnabled) {
      if (typeof worionApiRouteModel === 'function') {
        try {
          modelSelection = await worionApiRouteModel(content, { executionRoute });
          // console.log('[MODEL ROUTER] Seleção via Worion API:', modelSelection);
        } catch (error) {
          console.warn('[MODEL ROUTER] Worion API indisponivel, usando fallback local:', error.message);
        }
      }
      if (!modelSelection) {
        modelSelection = typeof selectModelForMessage === 'function'
          ? selectModelForMessage(content, { executionRoute })
          : { model: 'gpt-5.4-nano', reason: 'worion-api-unavailable-default-gpt-5.4-nano', confidence: 0.3 };
      }
      resolvedModel = modelSelection.model;
      // console.log('[MODEL ROUTER] Seleção automática:', modelSelection);
      if (typeof logModelSelection === 'function') {
        logModelSelection(content, modelSelection);
      }
    } else if (manualModel) {
      // console.log('[MODEL ROUTER] Usando modelo manual da UI:', manualModel);
    } else {
      // console.log('[MODEL ROUTER] Roteador desabilitado ou funções não disponíveis');
    }

    const selectedProvider = typeof getModelProvider === 'function' && resolvedModel
      ? getModelProvider(resolvedModel)
      : null;
    const beforeCallFacts = {
      selectedModel: resolvedModel || null,
      selectedProvider,
      selectionReason: modelSelection?.reason || (manualModel ? 'manual-ui' : agentModel && !modelRouterEnabled ? 'agent-model-router-disabled' : 'router-disabled'),
      confidence: modelSelection?.confidence ?? null,
      timestamp: Date.now()
    };
    await checkpointAssistantMessage(
      originConversationId,
      originMessages,
      sessionStartedAt,
      assistantMessageId,
      assistantIndex,
      {
        provider: selectedProvider,
        model: resolvedModel || null,
        status: 'streaming'
      }
    );

    let agentResult = null;

    // Tratamento especial para síntese privada/contextual
    if (executionRoute === 'private_context_synthesis' && typeof runPrivateContextSynthesisRoute === 'function') {
      console.log('[EXECUTION ROUTER] private context synthesis route:', questionScope);
      agentResult = await runPrivateContextSynthesisRoute(content, {
        messages: apiMessages,
        scope: questionScope,
        files: preservedAttachments,
        attachments: preservedAttachments,
        currentProjectContext,
        connectorContext,
        internalMemoryContext,
        memoryCardsContext,
        sourceMessages: originMessages,
        silentIncorporatedContext: typeof getSilentIncorporatedContextForPrompt === 'function'
          ? getSilentIncorporatedContextForPrompt()
          : '',
        ...(resolvedModel ? { model: resolvedModel } : {}),
        temperature: 0.35,
        max_tokens: maxTokens,
        thinking: executionProfile?.thinking,
        executionRoute,
        executionProfile
      });
      if (typeof window !== 'undefined') {
        window.lastPrivateReadReport = agentResult?.privateReadReport || agentResult?._privateReadReport || null;
      }
    }
    // Tratamento especial para silêncio
    else if (executionRoute === 'silence') {
      const silenceReply = executionProfile?.silentResponse || 'Estou aqui se precisar!';
      agentResult = {
        content: silenceReply,
        data: { choices: [{ message: { content: silenceReply }, finish_reason: 'silence' }] }
      };
    }
    // Tratamento especial para perguntas de opinião
    else if (executionRoute === 'opinion') {
      console.log('[EXECUTION ROUTER] opinion question - direct answer without search');
      const data = typeof callModelWithRetry === 'function'
        ? await callModelWithRetry({
            ...(resolvedModel ? { model: resolvedModel } : {}),
            messages: apiMessages,
            temperature: 0.6, // Mais criativo para opiniões
            max_tokens: maxTokens
          }, 2)
        : await callOpenAIWithRetry({
            ...(resolvedModel ? { model: resolvedModel } : {}),
            messages: apiMessages,
            temperature: 0.6,
            max_tokens: maxTokens
          }, 2);
      agentResult = { content: data?.content || data?.output_text || data?.choices?.[0]?.message?.content || '', data };
    }
    // Tratamento especial para perguntas definicionais
    else if (executionRoute === 'definition') {
      console.log('[EXECUTION ROUTER] definition question - explaining concept without search');
      const definitionSystemPrompt = [
        systemPrompt,
        '',
        'Esta é uma pergunta conceitual/definitional. Forneça uma explicação didática baseada no conhecimento geral.',
        'Se o termo for ambíguo ou desconhecido, peça esclarecimentos ao usuário.',
        'Se o termo envolver siglas ou acrônimos técnicos (ex: LLM, API, etc), explique primeiro o significado e depois ofereça contexto.',
        'Seja conciso mas informativo. Não invente informações - se não souber, admita e peça mais contexto.'
      ].join('\n');

      const definitionMessages = [
        { role: 'system', content: definitionSystemPrompt },
        ...apiMessages.filter(m => m.role !== 'system')
      ];

      const data = typeof callModelWithRetry === 'function'
        ? await callModelWithRetry({
            ...(resolvedModel ? { model: resolvedModel } : {}),
            messages: definitionMessages,
            temperature: 0.4,
            max_tokens: maxTokens
          }, 2)
        : await callOpenAIWithRetry({
            ...(resolvedModel ? { model: resolvedModel } : {}),
            messages: definitionMessages,
            temperature: 0.4,
            max_tokens: maxTokens
          }, 2);
      agentResult = { content: data?.content || data?.output_text || data?.choices?.[0]?.message?.content || '', data };
    }
    else if (researchRoutes.includes(executionRoute) && authorityDecision?.shouldBypassSources) {
      console.warn('[CONTEXT AUTHORITY] research blocked by authority', {
        intent: authorityDecision.intent,
        route: executionRoute
      });
      executionRoute = 'direct_answer';
      const data = typeof callModelWithRetry === 'function'
        ? await callModelWithRetry({
            ...(resolvedModel ? { model: resolvedModel } : {}),
            messages: apiMessages,
            temperature: 0.4,
            max_tokens: maxTokens
          }, 2)
        : await callOpenAIWithRetry({
            ...(resolvedModel ? { model: resolvedModel } : {}),
            messages: apiMessages,
            temperature: 0.4,
            max_tokens: maxTokens
          }, 2);
      agentResult = { content: data?.content || data?.output_text || data?.choices?.[0]?.message?.content || '', data };
    }
    else if (researchRoutes.includes(executionRoute) && typeof runDeterministicResearchRoute === 'function') {
      console.log('[EXECUTION ROUTER] deterministic research route:', executionRoute);
      agentResult = await runDeterministicResearchRoute(apiMessages, content, executionProfile || {}, {
        ...(resolvedModel ? { model: resolvedModel } : {}),
        temperature: 0.35,
        max_tokens: maxTokens,
        thinking: executionProfile?.thinking,
        executionRoute,
        executionProfile
      });
    } else {
      // P2: Status honesto para direct_answer sem ferramentas
      if (typeof showExecutionStatus === 'function') {
        showExecutionStatus('Pensando...');
      }

      const data = typeof callModelWithRetry === 'function'
        ? await callModelWithRetry({
            ...(resolvedModel ? { model: resolvedModel } : {}),
            messages: apiMessages,
            temperature: 0.4,
            max_tokens: maxTokens
          }, 2)
        : await callOpenAIWithRetry({
            ...(resolvedModel ? { model: resolvedModel } : {}),
            messages: apiMessages,
            temperature: 0.4,
            max_tokens: maxTokens
          }, 2);
      agentResult = { content: data?.content || data?.output_text || data?.choices?.[0]?.message?.content || '', data };
    }

    let reply = agentResult?.content || '';

    // WRITER: Passar pela pipeline de generateAndRefine se disponível
    // Aplicar APENAS em rotas que se beneficiam de refinamento
    const shouldUseGenerateAndRefine = !authorityDecision?.shouldBypassWriter && [
      'focused_research',
      'comparative_research',
      'private_context_synthesis',
      'direct_answer'
    ].includes(executionRoute);

    if (shouldUseGenerateAndRefine && typeof generateAndRefine === 'function' && reply) {
      console.log('[WRITER] Usando generateAndRefine para rota:', executionRoute);

      const writerContext = {
        route: executionRoute,
        sources: agentResult?.privateSources || agentResult?.fetchedPages || agentResult?.topicsWithContent || [],
        history: apiMessages || messages,
        toolResults: agentResult?.toolResults || {},
        authorityDecision,
        rawContent: reply  // Fallback para conteúdo original se Writer falhar
      };

      // DEBUG: Ver quantas fontes estão sendo passadas
      console.log('[WRITER DEBUG] Fontes disponíveis:', {
        fetchedPagesCount: agentResult?.fetchedPages?.length || 0,
        privateSourcesCount: agentResult?.privateSources?.length || 0,
        topicsWithContentCount: agentResult?.topicsWithContent?.length || 0,
        sourcesUsed: writerContext.sources.length,
        agentResultKeys: agentResult ? Object.keys(agentResult) : []
      });

      try {
        const refined = await generateAndRefine(content, writerContext);
        if (refined) {
          reply = refined;
          console.log('[WRITER] Resposta refinada aplicada');
        } else {
          console.warn('[WRITER] generateAndRefine retornou vazio, mantendo original');
        }
      } catch (error) {
        console.error('[WRITER] Erro ao refinar resposta, usando original:', error);
      }
    }

    if (pendingArtifactRequest && typeof executeArtifactWebhook === 'function') {
      const artifactResult = pendingArtifactRequest.type === 'image'
        ? ''
        : await executeArtifactWebhook(pendingArtifactRequest, reply);
      if (artifactResult) reply = `${reply}\n\n${artifactResult}`;
      pendingArtifactRequest = null;
    }
    if (authorityDecision?.intent === 'identity_or_role_question') {
      reply = String(reply || '')
        .replace(/^\s*pelo material (coletado|que voc[eê] trouxe)[\s,:.-]*/i, '')
        .replace(/\n{0,2}fontes:\s*[\s\S]*$/i, '')
        .trim();
    }
    const assistantContent = typeof normalizeAssistantReply === 'function' ? normalizeAssistantReply(reply, content) : reply;
    const runtimeMetadata = agentResult?.data?._runtimeMetadata || agentResult?._runtimeMetadata || null;
    let finalAssistantContent = assistantContent;

    const mentionsConcreteRuntimeTerm =
      responseMentionsConcreteRuntimeModelOrProvider(assistantContent);

    if (mentionsConcreteRuntimeTerm) {
      const claims = extractConcreteRuntimeClaims(assistantContent);
      const hasTechnicalIdentityClaim = isTechnicalIdentityClaim(assistantContent);
      let mismatch = false;

      if (hasTechnicalIdentityClaim && claims.length > 0) {
        const claimMatches = runtimeClaimMatchesMetadata(claims, runtimeMetadata, beforeCallFacts);

        console.warn('[INTROSPECTION GUARDRAIL] claim técnica detectada', {
          userMessage: content,
          assistantContent: String(assistantContent || '').slice(0, 300),
          claims,
          expectedModel: normalizeRuntimeText(
            runtimeMetadata?.resolvedModelFinal ||
            runtimeMetadata?.model ||
            runtimeMetadata?.requestedModel ||
            beforeCallFacts?.selectedModel ||
            ''
          ),
          expectedProvider: normalizeRuntimeText(
            runtimeMetadata?.providerFinal ||
            runtimeMetadata?.provider ||
            beforeCallFacts?.selectedProvider ||
            ''
          ),
          runtimeMetadata,
          claimMatches
        });

        mismatch = true;
      } else {
        mismatch = detectRuntimeMismatch(
          assistantContent,
          runtimeMetadata,
          beforeCallFacts
        );
      }

      const privateReadReport = window.lastPrivateReadReport || null;
      const hasPrivateSources = privateReadReport && privateReadReport.totalFetched > 0;

      if (mismatch && !hasPrivateSources) {
        console.warn('[INTROSPECTION GUARDRAIL] resposta substituída por fatos de runtime', {
          userMessage: content,
          originalAssistantContent: String(assistantContent || '').slice(0, 500),
          runtimeMetadata,
          beforeCallFacts
        });

        finalAssistantContent = generateCurrentTurnRuntimeResponse(
          runtimeMetadata,
          beforeCallFacts,
          content
        );
      } else if (hasPrivateSources) {
        console.log('[INTROSPECTION GUARDRAIL] síntese privada legítima preservada', {
          privateSourcesFetched: privateReadReport.totalFetched,
          scope: privateReadReport.scope
        });
      } else {
        console.log('[INTROSPECTION GUARDRAIL] termos de runtime detectados, sem mismatch', {
          claims,
          runtimeMetadata
        });
      }
    } else if (!runtimeMetadata) {
      // Debug silenciado
      // console.log('[INTROSPECTION GUARDRAIL] runtimeMetadata ausente, guardrail não aplicado');
    }

    assistantMessageForPersist = finalAssistantContent;

    if (runtimeMetadata && typeof window !== 'undefined') {
      window.lastAssistantRuntimeFacts = {
        turnId: null,
        conversationId: originConversationId || null,
        userMessage: content,
        assistantMessage: finalAssistantContent,
        beforeCall: beforeCallFacts,
        afterCall: {
          requestedModel: runtimeMetadata.requestedModel,
          resolvedModelFinal: runtimeMetadata.resolvedModelFinal,
          providerFinal: runtimeMetadata.providerFinal,
          callSource: runtimeMetadata.source,
          latencyMs: runtimeMetadata.latencyMs,
          contentLength: finalAssistantContent?.length || 0,
          timestamp: Date.now()
        }
      };
      // Debug silenciado
      // console.log('[RUNTIME FACTS] lastAssistantRuntimeFacts:', window.lastAssistantRuntimeFacts);
    }
    if (
      typeof animateAssistantReply === 'function' &&
      typeof isOriginConversationActive === 'function' &&
      isOriginConversationActive(originConversationId)
    ) {
      await animateAssistantReply(assistantIndex, finalAssistantContent);
    } else {
      await checkpointAssistantMessage(
        originConversationId,
        originMessages,
        sessionStartedAt,
        assistantMessageId,
        assistantIndex,
        { content: finalAssistantContent, status: 'completed', isTyping: false }
      );
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    pendingArtifactRequest = null;
    const aborted = responseAbortRequested || error.name === 'AbortError';
    const partial = String(originMessages[assistantIndex]?.content || '').trim();
    assistantMessageForPersist = partial || (aborted ? 'Resposta interrompida.' : `Erro: ${error.message}`);
    await checkpointAssistantMessage(
      originConversationId,
      originMessages,
      sessionStartedAt,
      assistantMessageId,
      assistantIndex,
      {
        content: assistantMessageForPersist,
        status: aborted ? 'interrupted' : 'failed',
        isTyping: false,
        error: aborted ? null : error.message
      }
    );
  } finally {
    memoryPolicyForPersist = { ...(currentTurnPolicy || {}) };
    if (typeof clearWorionRouteGuard === 'function') {
      clearWorionRouteGuard();
    } else if (typeof window !== 'undefined') {
      window.__worionRouteGuard = null;
    }
    if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
    isAssistantResponding = false;
    responseAbortRequested = false;
    currentResponseController = null;
    currentTurnPolicy = {
      allowMemoryWrite: false,
      reason: 'reset',
      source: 'blocked',
      blockReasons: [],
      explicitNotionWriteAuthorized: false,
      deferNotionWrite: false,
      shouldExecuteDeferredNow: false
    };
    if (typeof renderOriginConversation === 'function') renderOriginConversation(originConversationId);
    if (typeof window !== 'undefined' && window.__worionAssistantCheckpoint) {
      window.__worionAssistantCheckpoint = null;
    }
  }

  await persistAssistantTurn(originConversationId, originMessages, sessionStartedAt, {
    memoryPolicy: memoryPolicyForPersist,
    assistantMessage: assistantMessageForPersist
  });
}

function getActiveAgentForConversation() {
  const state = window.agentsState || {};
  const list = (Array.isArray(window.WORION_AGENTS) && window.WORION_AGENTS.length)
    ? window.WORION_AGENTS
    : [];
  const explicitId = state.activeConversationAgentId || state.selectedAgentId || currentAgent?.id || selected || '';
  if (explicitId) {
    const found = list.find(agent => agent.id === explicitId);
    if (found) return found;
  }
  return null;
}

function hasNotionLink(text = '') {
  return /https?:\/\/(?:www\.)?(?:notion\.so|app\.notion\.com|[\w-]+\.notion\.site)\/\S+/i.test(String(text || ''));
}

function logAgentRuntime({ activeAgent, modelFromAgent, manualModelOverride, documentsCount, route, scope }) {
  if (!activeAgent) {
    console.log('[AGENT RUNTIME] no active agent for conversation');
    return;
  }
  console.log('[AGENT RUNTIME]', {
    activeAgentId: activeAgent.id || null,
    activeAgentName: activeAgent.name || activeAgent.title || '',
    modelFromAgent: modelFromAgent || null,
    manualModelOverride: manualModelOverride || null,
    documentsCount,
    route,
    scope
  });
}

if (typeof window !== 'undefined') {
  window.sendMsg = sendMsg;
}

function resetChatRuntimeState({ preserveAttachments = false } = {}) {
  if (currentResponseController) {
    try { currentResponseController.abort(); } catch {}
  }
  currentResponseController = null;
  responseAbortRequested = false;
  isAssistantResponding = false;
  currentConversationId = null;
  messages = [];
  sessionStartedAt = null;
  sessionSaved = false;
  pendingArtifactRequest = null;
  connectorContext = '';
  internalMemoryContext = '';
  memoryCardsContext = '';
  previousSessionsContext = '';
  window.dynamicMemoryContext = '';
  window.__worionAutoScrollPaused = false;
  window.__worionPausedScrollTop = null;
  window.lastAssistantRuntimeFacts = null;
  window.assistantMessageBuffer = '';

  // Resetar refutações ao iniciar novo chat
  if (typeof resetRefutations === 'function') {
    resetRefutations();
  }
  window.currentStreamingMessage = null;
  window.lastAssistantMessage = null;
  if (!preserveAttachments && typeof attachedFiles !== 'undefined' && Array.isArray(attachedFiles)) attachedFiles = [];
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  const messagesContainer = document.getElementById('chat-msgs');
  if (messagesContainer) messagesContainer.innerHTML = '';
  const attachmentsPreviewContainer = document.getElementById('attachments-preview') || document.getElementById('home-attachments-preview');
  if (attachmentsPreviewContainer) {
    attachmentsPreviewContainer.innerHTML = '';
    attachmentsPreviewContainer.style.display = 'none';
  }
  const messageInput = document.getElementById('chat-in') || document.getElementById('home-chat-in');
  if (messageInput) {
    messageInput.value = '';
    messageInput.style.height = 'auto';
  }
}

if (typeof window !== 'undefined') {
  window.resetChatRuntimeState = resetChatRuntimeState;
}

async function startChat(options = {}) {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  const isAgentChat = window.currentChatSource === 'agent';
  if (isAgentChat && !currentAgent) currentAgent = getDefaultAgent();
  if (isAgentChat && !currentAgent) {
    alert('Nenhum agente encontrado.');
    return;
  }

  // Debug silenciado
  // console.log('[START CHAT chat.js] Before mutations:', { messagesCount: messages.length, keepMessages: options.keepMessages });
  chatMode = true;
  if (!options.keepMessages) resetChatRuntimeState({ preserveAttachments: Boolean(options.preserveAttachments) });
  // console.log('[START CHAT chat.js] After keepMessages check:', messages.length);
  if (!options.keepMessages || messages.length === 0) {
    resetSilentIncorporatedContext();
    if (typeof clearComposerStateForNewChat === 'function') clearComposerStateForNewChat();
  }
  sessionStartedAt = sessionStartedAt || new Date();
  usageAccountingStartedAt = Date.now();
  sessionSaved = false;
  previousSessionsContext = '';
  // console.log('[START CHAT chat.js] Before injectRecentMemory:', messages.length);

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
      console.warn('[ANTHROPIC] Claude API key nÃ£o encontrada - Anthropic indisponivel salvo selecao explicita:', error.message);
    }
  }

  // V12 Turbo: Injetar memÃ³ria recente
  await injectRecentMemory();
  // console.log('[START CHAT chat.js] After injectRecentMemory:', messages.length);

  // Mensagem de boas-vindas contextual
  if (messages.length === 0 && !options.keepMessages) {
    const welcome = getWelcomeMessage();
    if (!currentConversationId && typeof makeId === 'function') currentConversationId = makeId('conversation');
    messages.push({
      ...createAssistantMessageSkeleton(currentConversationId, { status: 'completed' }),
      content: welcome
    });
  }
  // console.log('[START CHAT chat.js] Before renderChatPanel:', messages.length);

  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';
  setActiveView(window.currentChatSource === 'agent' ? 'agents' : 'new-chat');
  selected = currentAgent?.id || null;
  renderChatPanel();
  // console.log('[START CHAT chat.js] After renderChatPanel:', messages.length);
  renderSidebarSkills();
  renderSidebarConversations();
}

async function startNewChatFromHome() {
  const input = document.getElementById('home-chat-in');
  const text = input ? input.value.trim() : '';
  const homeAttachments = typeof attachedFiles !== 'undefined' && Array.isArray(attachedFiles)
    ? attachedFiles.slice()
    : [];
  const selectedTextContext = typeof getAskSelectionContextText === 'function'
    ? getAskSelectionContextText()
    : '';

  selected = null;
  currentAgent = null;
  window.currentChatSource = 'home';
  window.currentMemoryCardProjectId = '';
  window.currentMemoryChatTitle = '';
  currentProjectContext = null;
  resetChatRuntimeState({ preserveAttachments: true });
  resetSilentIncorporatedContext();
  if (typeof clearComposerStateForNewChat === 'function') clearComposerStateForNewChat();
  if (typeof attachedFiles !== 'undefined' && Array.isArray(attachedFiles)) attachedFiles = homeAttachments;
  await startChat({ keepMessages: true, loadHistory: false });
  if (typeof attachedFiles !== 'undefined' && Array.isArray(attachedFiles)) attachedFiles = homeAttachments;
  if (typeof updateAttachmentsPreview === 'function') updateAttachmentsPreview();
  if (text || selectedTextContext || homeAttachments.length) {
    const chatInput = document.getElementById('chat-in');
    chatInput.value = text;
    if (selectedTextContext && typeof attachAskSelectionToComposer === 'function') {
      attachAskSelectionToComposer(selectedTextContext);
    }
    // Auto-collapse sidebar na primeira mensagem
    if (typeof toggleSidebar === 'function' && !document.body.classList.contains('sidebar-collapsed')) {
      toggleSidebar();
    }
    await sendMsg();
  }
}

// ============================================
// WINDOW EXPORTS
// ============================================
// Funções definidas em chat-sessions.js
if (typeof window !== 'undefined') {
  window.startChat = startChat;
  window.startNewChatFromHome = startNewChatFromHome;
  window.openConversation = openConversation;
  window.endSession = endSession;
  window.backToAgents = backToAgents;
  window.closePanel = closePanel;
  window.leaveChatIfNeeded = leaveChatIfNeeded;
  window.resetChatToAgents = resetChatToAgents;
  window.handleBeforeUnload = handleBeforeUnload;
}
