/**
 * MÓDULO: app.js
 * RESPONSABILIDADE: Ponto de entrada do app, inicialização, configuração global, gerenciamento de estado e atalhos
 * DEPENDÊNCIAS: memory.js, chat.js, ui.js
 * EXPORTA: fs, path, AGENTS_DIR, AGENT_DOCS_DIR, DATA_DIR, CONVERSATIONS_DIR, PROFILE_PATH, MODELS_PATH, CONFIG_PATH, PROJECTS_DIR, AGENT_TEMPLATES_PATH, INSTALLED_AGENTS_PATH, WORION_UX_CONFIG, agents, selected, chatMode, messages, currentAgent, openaiKey, sessionStartedAt, sessionSaved, isSavingSession, previousSessionsContext, conversations, projects, agentTemplates, installedAgents, currentProjectContext, connections, editingConnectionId, currentConversationId, connectorContext, activeSkillId, activeWorkModeId, availableModels, pendingArtifactRequest, usageAccountingStartedAt, actionLog, executionStatus, currentGoalAborted, currentGoalRun, worionConfig, userProfile, QUICK_SKILLS, WORK_MODES, loadAgents, reloadAgents, initWorion, loadWorionConfig, applyUxConfig, handleBeforeUnload, cancelCurrentGoal
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: index.html (entender ordem de carregamento antes de modificar)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// APP ENTRY POINT
// ============================================

// Node.js (global — accessible from all modules)
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
  mcp: {
    brave_search: {
      service: 'brave-search-mcp',
      transport: 'sse',
      url: 'http://localhost:8080/sse',
      port: 8080
    }
  },
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
    category: 'Foco e Aprendizagem',
    icon: 'ti-brain',
    prompt: 'Skill ADHD Guardian: apoie foco, priorizacao e funcao executiva. Se houver tarefa real, quebre objetivos em passos pequenos, reduza escolhas excessivas e destaque a proxima acao. Se houver desabafo, cansaco ou sobrecarga, responda com presenca sem transformar a conversa em plano.'
  },
  {
    id: 'zuki',
    name: 'Zuki',
    category: 'Foco e Aprendizagem',
    icon: 'ti-mood-smile',
    prompt: 'Skill Zuki: acompanhe rotinas leves, check-ins, microplanejamento e retomada de contexto com respostas curtas e gentis.'
  },
  {
    id: 'saner-ai-inspired',
    name: 'Saner.AI Inspired',
    category: 'Foco e Aprendizagem',
    icon: 'ti-notes',
    prompt: 'Skill Saner.AI Inspired: transforme notas, ideias e tarefas soltas em categorias, contexto, decisoes e proximas acoes.'
  },
  {
    id: 'cognassist-inspired',
    name: 'Cognassist Inspired',
    category: 'Foco e Aprendizagem',
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
    category: 'Negócios',
    icon: 'ti-briefcase',
    prompt: 'Skill Business Analyst: mapeie processos, atores, dores, regras de negocio, requisitos, indicadores e oportunidades.'
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    category: 'Negócios',
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
    name: 'Geração de documentos',
    icon: 'ti-file-text',
    prompt: 'Modo Geracao de documentos: estruture a resposta como artefato utilizavel, com titulo, descricao do assunto, secoes, topicos verticais, encerramento, criterios e acabamento pronto para virar documento, PDF, proposta, relatorio ou especificacao.'
  }
];

function getWorionStatusLabel(type = 'thinking') {
  const labels = {
    thinking: 'Worion está raciocinando...',
    sources: 'Worion está buscando fontes externas...',
    openingSources: 'Worion está abrindo fontes...',
    composing: 'Worion está construindo a resposta...',
    executing: 'Worion está executando...',
    evidence: 'Worion está organizando evidências...'
  };

  return labels[type] || 'Worion está analisando sua mensagem...';
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
    .replace(/<!--\s*status:[\s\S]*?-->\s*/gi, '')
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

      // Extrair nome do título (primeira linha com #)
      const titleMatch = content.match(/^#\s+(.+)/m);
      const name = titleMatch ? titleMatch[1] : file.replace('.md', '');

      // Extrair descrição (segunda linha não-vazia após título)
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
        model: modelMatch ? modelMatch[1].trim() : 'gpt-5.4-mini',
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
    console.log(`✅ ${agents.length} agente(s) carregado(s)`);
  } catch (error) {
    console.error('❌ Erro ao carregar agentes:', error);
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
  if (typeof worionApiHealth === 'function') {
    worionApiHealth()
      .then(info => console.log('[Worion API] health ok:', info))
      .catch(error => console.warn('[Worion API] health indisponivel:', error.message));
  }
  await Promise.all([
    typeof initTracing === 'function' ? initTracing() : Promise.resolve(),
    ensureLocalStore(),
    loadModelsConfig(),
    loadUserProfile(),
    loadAgents()
  ]);

  // Aplicar deduplicação de changelog ao iniciar
  if (typeof applyChangelogDedupe === 'function') {
    await applyChangelogDedupe();
  }

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
  const scale = Number(WORION_UX_CONFIG.fontScale || 1);
  document.documentElement.style.setProperty('--chat-content-width', `${WORION_UX_CONFIG.maxChatWidth}px`);
  document.documentElement.style.setProperty('--chat-composer-width', `${Math.max(760, WORION_UX_CONFIG.maxChatWidth)}px`);
  document.documentElement.style.setProperty('--chat-max-width', `${WORION_UX_CONFIG.maxChatWidth}px`);
  const baseFontSize = 12.75;
  document.documentElement.style.setProperty('--chat-font-size', `${baseFontSize * scale}px`);
  document.documentElement.style.setProperty('--chat-heading-scale', String(scale));
  document.documentElement.style.setProperty('--worion-ui-scale', String(scale));
  document.documentElement.style.setProperty('--memory-card-zoom', '1');
  document.body.style.zoom = '';
}

// ============================================
// ZOOM WITH CTRL + SCROLL
// ============================================

(function initZoom() {
  const ZOOM_MIN = 0.85, ZOOM_MAX = 1.65, ZOOM_STEP = 0.06;
  const setFontZoom = (nextScale) => {
    WORION_UX_CONFIG.fontScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextScale));
    applyUxConfig();
  };
  document.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setFontZoom((Number(WORION_UX_CONFIG.fontScale) || 1) + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey) return;
    if (e.key === '0') { e.preventDefault(); setFontZoom(1.12); }
    if (e.key === '=' || e.key === '+') { e.preventDefault(); setFontZoom((Number(WORION_UX_CONFIG.fontScale) || 1) + ZOOM_STEP); }
    if (e.key === '-') { e.preventDefault(); setFontZoom((Number(WORION_UX_CONFIG.fontScale) || 1) - ZOOM_STEP); }
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
