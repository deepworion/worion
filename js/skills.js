/**
 * MODULO: skills.js
 * RESPONSABILIDADE: Definicao global, estado ativo e ativacao das skills/modos do Worion
 * DEPENDENCIAS: chat.js e ui.js em tempo de uso dos handlers de ativacao
 * EXPORTA: WORION_SKILLS, QUICK_SKILLS, WORK_MODES, activeSkillId, activeWorkModeId, activeWorkModeIds, getActiveSkill, getActiveWorkMode, getActiveWorkModeIds, getActiveWorkModes, hasActiveWorkMode, setActiveSkillFromChip, setActiveWorkMode, toggleActiveWorkMode, clearActiveWorkModes, startSkillChat
 */

// Estado dedicado de skills/modos. Mantido como var para preservar acesso global entre scripts legados.
var activeSkillId = null;
var activeWorkModeId = null;
var activeWorkModeIds = [];
const MAX_ACTIVE_WORK_MODES = 3;

var QUICK_SKILLS = window.WORION_SKILLS = [
  {
    id: 'adhd-guardian',
    name: 'Foco Executivo',
    category: 'Foco e Aprendizagem',
    icon: 'ti-brain',
    prompt: 'Skill Foco Executivo: apoie foco, priorizacao e funcao executiva para qualquer usuario. Se houver tarefa real, quebre objetivos em passos pequenos, reduza escolhas excessivas e destaque a proxima acao. So trate neurodivergencia como contexto quando o usuario mencionar explicitamente.'
  },
  {
    id: 'zuki',
    name: 'Rotina Leve',
    category: 'Foco e Aprendizagem',
    icon: 'ti-mood-smile',
    prompt: 'Skill Rotina Leve: acompanhe rotinas, check-ins, microplanejamento e retomada de contexto com respostas curtas, praticas e humanas.'
  },
  {
    id: 'saner-ai-inspired',
    name: 'Organizador de Notas',
    category: 'Foco e Aprendizagem',
    icon: 'ti-notes',
    prompt: 'Skill Organizador de Notas: transforme notas, ideias e tarefas soltas em categorias, contexto, decisoes, pendencias e proximas acoes.'
  },
  {
    id: 'cognassist-inspired',
    name: 'Aprendizagem Adaptativa',
    category: 'Foco e Aprendizagem',
    icon: 'ti-school',
    prompt: 'Skill Aprendizagem Adaptativa: adapte explicacoes, instrucoes e caminhos de aprendizagem ao ritmo, objetivo e repertorio do usuario.'
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
    category: 'Negocios',
    icon: 'ti-briefcase',
    prompt: 'Skill Business Analyst: mapeie processos, atores, dores, regras de negocio, requisitos, indicadores e oportunidades.'
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    category: 'Negocios',
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

var WORION_SKILL_CATEGORIES = [
  'Foco e Aprendizagem',
  'Estudantes',
  'Pesquisa',
  'Escrita',
  'Produtividade',
  'Negocios',
  'Desenvolvimento',
  'Espiritualidade'
];

var WORK_MODES = window.WORION_WORK_MODES = [
  {
    id: 'deep-thinking',
    name: 'Pensamento profundo',
    icon: 'ti-brain',
    prompt: 'Modo Pensamento profundo: investigue premissas, subtexto, contexto, consequencias, riscos e tradeoffs antes de concluir. Separe fato, interpretacao e inferencia. Entregue uma sintese clara, com tensoes reais e conclusao util, sem transformar toda resposta em artigo.'
  },
  {
    id: 'smart-research',
    name: 'Pesquisa inteligente',
    icon: 'ti-world-search',
    prompt: 'Modo Pesquisa inteligente: use Brave e Tavily quando o pedido exigir informacao externa, atual ou verificavel. Compare resultados, datas, consenso, divergencias e lacunas; abra fontes relevantes com fetch_url quando detalhes importarem. Sintetize como analista. Fontes ficam somente no fim, em letra menor, com links markdown.'
  },
  {
    id: 'factual-verification',
    name: 'Verificacao factual',
    icon: 'ti-shield-check',
    prompt: 'Modo Verificacao factual: trate a afirmacao como hipotese ate validar. Use Brave e Tavily, priorize fontes oficiais ou primarias, compare pelo menos duas fontes independentes quando possivel, abra paginas relevantes com fetch_url e declare divergencias. Se a evidencia for insuficiente, diga isso claramente.'
  },
  {
    id: 'operational-decision',
    name: 'Decisao operacional',
    icon: 'ti-route',
    prompt: 'Modo Decisao operacional: transforme a conversa em uma decisao pratica. Identifique objetivo, restricoes, opcoes, criterio de escolha, recomendacao direta, risco principal e proxima acao concreta. Evite conselho generico; quando houver dados suficientes, escolha uma direcao.'
  },
  {
    id: 'technical-execution',
    name: 'Execucao tecnica',
    icon: 'ti-terminal-2',
    prompt: 'Modo Execucao tecnica: para codigo, bugs, APIs, n8n, Supabase, Electron, JSON e automacoes. Investigue o contexto, aja de forma objetiva, proponha ou execute a menor correcao segura, valide o resultado e evite filosofia, explicacao longa ou alternativas demais quando o usuario pediu solucao.'
  },
  {
    id: 'document-generation',
    name: 'Geracao de documentos',
    icon: 'ti-file-text',
    prompt: 'Modo Geracao de documentos: produza um artefato pronto para uso. Escolha o formato adequado ao pedido: relatorio, proposta, plano, especificacao, checklist, roteiro, PDF ou documento tecnico. Use titulo, secoes, criterios, acabamento e linguagem consistente; deixe lacunas explicitas quando faltar dado.'
  }
];

function getSkillCategories() {
  return WORION_SKILL_CATEGORIES;
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
  return [...new Set(source.filter(id => WORK_MODES.some(item => item.id === id)))].slice(0, MAX_ACTIVE_WORK_MODES);
}

function getActiveWorkModes() {
  const ids = getActiveWorkModeIds();
  return WORK_MODES.filter(item => ids.includes(item.id));
}

function hasActiveWorkMode(modeId) {
  return getActiveWorkModeIds().includes(modeId);
}

function refreshSkillUiState() {
  if (typeof renderSidebarSkills === 'function') renderSidebarSkills();
  document.querySelectorAll('.composer-workmode-selector').forEach(selector => {
    if (typeof renderWorkModeSelector === 'function') selector.outerHTML = renderWorkModeSelector();
  });
  document.querySelectorAll('.composer-skill-selector').forEach(selector => {
    if (typeof renderSkillSelector === 'function') selector.outerHTML = renderSkillSelector();
  });
}

function setActiveSkillFromChip(skillId) {
  activeSkillId = skillId;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  refreshSkillUiState();
  const status = document.getElementById('skill-status');
  if (status && typeof renderActiveSkillStatus === 'function') status.outerHTML = renderActiveSkillStatus();
  const chatName = document.querySelector('.same-room-chat .chat-name');
  const skill = getActiveSkill();
  if (chatName && skill) chatName.textContent = skill.name;
}

function setActiveWorkMode(modeId) {
  activeWorkModeIds = modeId ? [modeId] : [];
  activeWorkModeId = activeWorkModeIds[0] || null;
  activeSkillId = null;
  refreshSkillUiState();
  const chatName = document.querySelector('.same-room-chat .chat-name');
  if (chatName && !currentProjectContext) {
    const mode = getActiveWorkMode();
    chatName.textContent = mode?.name || 'Novo Chat';
  }
}

function toggleActiveWorkMode(modeId) {
  const ids = new Set(getActiveWorkModeIds());
  if (ids.has(modeId)) ids.delete(modeId);
  else ids.add(modeId);
  activeWorkModeIds = Array.from(ids).slice(-MAX_ACTIVE_WORK_MODES);
  activeWorkModeId = activeWorkModeIds[0] || null;
  activeSkillId = null;
  refreshSkillUiState();
  document.querySelectorAll('.composer-mode[open]').forEach(selector => selector.removeAttribute('open'));
  const chatName = document.querySelector('.same-room-chat .chat-name');
  if (chatName && !currentProjectContext && typeof getWorkModeSelectorLabel === 'function') {
    chatName.textContent = getWorkModeSelectorLabel();
  }
}

function clearActiveWorkModes() {
  activeWorkModeIds = [];
  activeWorkModeId = null;
  activeSkillId = null;
  refreshSkillUiState();
  const chatName = document.querySelector('.same-room-chat .chat-name');
  if (chatName && !currentProjectContext) chatName.textContent = 'Novo Chat';
}

async function startSkillChat(skillId) {
  activeSkillId = skillId;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  window.currentChatSource = 'skill';
  if (typeof renderSidebarSkills === 'function') renderSidebarSkills();
  if ((!Array.isArray(agents) || !agents.length) && typeof loadAgents === 'function') {
    await loadAgents();
  }
  const agent = typeof getDefaultAgent === 'function' ? getDefaultAgent() : null;
  if (!agent) {
    alert('Crie um agente antes de iniciar um chat.');
    return;
  }
  currentAgent = agent;
  selected = agent.id;
  currentConversationId = null;
  messages = [];
  sessionStartedAt = null;
  await startChat({ keepMessages: true, loadHistory: false });
}
