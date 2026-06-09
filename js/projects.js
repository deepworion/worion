/**
 * MÓDULO: projects.js
 * RESPONSABILIDADE: Gerenciamento de projetos locais e biblioteca de templates de agentes pré-configurados
 * DEPENDÊNCIAS: app.js, utils.js, memory.js
 * EXPORTA: ensureProjectsDir, ensureAgentLibraryFiles, loadAgentTemplates, saveInstalledAgents, getInstalledTemplateRecord, getTemplateStatus, saveLocalProject, loadLocalProjects, deleteLocalProject, renderProjectList, renderAgentTemplateLibrary, showProjectsView, openTemplateModal, closeTemplateModal, buildAgentMarkdownFromTemplate, installAgentTemplate, createProject, deleteProject, openProjectChat
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: app.js, memory.js, utils.js (usa TOOL_REGISTRY e estados globais)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// PROJECTS
// ============================================

const WORION_PROJECTS_STORAGE_KEY = 'worion_projects';
const WORION_PROJECT_FILES_STORAGE_KEY = 'worion_project_files';
const WORION_CORE_PROJECT = {
  id: 'worion-core-evolution',
  name: 'Worion Core Evolution',
  type: 'system_project',
  status: 'active',
  description: 'Espaço central de evolução viva do próprio Worion. Este projeto funciona como núcleo operacional, arquitetural e cognitivo do sistema, reunindo decisões, testes, hipóteses, refatorações, bugs, melhorias, runtime, memória, agentes, skills e experimentos relacionados à evolução do Worion.',
  areas: [
    'Runtime', 'DeepWorion', 'Skills', 'Agentes', 'Memória', 'UI/UX', 'Conectores', 'MCPs', 'APIs',
    'Supabase', 'VPS', 'Logs', 'Refatorações', 'Bugs', 'Testes', 'Roadmap', 'Hipóteses',
    'Sessões importantes', 'Benchmarks', 'Arquitetura futura'
  ],
  files: [
    'README.md', 'WORION_STATUS.md', 'ROADMAP.md', 'DEEPWORION.md', 'SKILLS_REGISTRY.md',
    'AGENTS.md', 'MEMORY_SYSTEM.md', 'CONNECTORS.md', 'MCP_SYSTEM.md', 'EXECUTION_RUNTIME.md',
    'UI_UX.md', 'BUGS_AND_FAILURES.md', 'EXPERIMENTS.md', 'VPS_DEPLOY.md',
    'DATABASE_SCHEMA.md', 'CHANGELOG.md'
  ],
  changelog: []
};

function getWorionProjectFileTemplate(fileName) {
  const templates = {
    'README.md': '# Worion Core Evolution\n\nEspaço central de evolução viva do próprio Worion.\n\n## Função\n- Organizar runtime, memória, agentes, skills, conectores e arquitetura futura.\n- Registrar decisões, testes, hipóteses, bugs e refatorações.\n- Manter continuidade entre sessões importantes.\n\n## Uso\nEste documento funciona como porta de entrada do projeto.',
    'WORION_STATUS.md': '# Status do Worion\n\n## Estado atual\n- Projeto ativo.\n- Núcleo de evolução criado dentro da página Projetos.\n- Persistência local via localStorage.\n\n## Próximo foco\nRegistrar mudanças reais conforme as sessões evoluem.',
    'ROADMAP.md': '# Roadmap\n\n## Próximas evoluções\n- Fortalecer leitura de sessões históricas.\n- Melhorar interpretação semântica das mudanças.\n- Evoluir runtime e ferramentas do DeepWorion.\n- Consolidar arquitetura de memória.\n- Mapear regressões e riscos técnicos.',
    'DEEPWORION.md': '# DeepWorion\n\n## Runtime\nDeepWorion é o CLI/runtime operacional do Worion.\n\n## Comandos úteis\n- `deepworion \"pergunta\"`\n- `deepworion \"analise as sessões\" --read sessions`\n- `deepworion --chat`\n\n## Responsabilidade\nLer contexto local, interpretar evolução técnica e apoiar execução operacional.',
    'SKILLS_REGISTRY.md': '# Skills Registry\n\n## Skills\nRegistro das skills ativas, propostas e futuras.\n\n## Critérios\n- Nome\n- Objetivo\n- Quando usar\n- Prompt base\n- Status',
    'AGENTS.md': '# Agentes\n\n## Registro de agentes\nDocumento para organizar agentes do Worion, responsabilidades e especializações.\n\n## Campos sugeridos\n- Nome\n- Papel\n- Ferramentas\n- Modelo preferido\n- Observações',
    'MEMORY_SYSTEM.md': '# Memory System\n\n## Arquitetura de memória\nA memória do Worion deve preservar continuidade sem poluir o prompt.\n\n## Camadas\n- Memória local\n- Sessões históricas\n- Contexto incorporado\n- Resumos operacionais\n- Possíveis integrações externas',
    'CONNECTORS.md': '# Connectors\n\n## Conectores\nRegistro de integrações do Worion com serviços externos.\n\n## Áreas\n- Supabase\n- Notion\n- GitHub\n- APIs\n- MCPs',
    'MCP_SYSTEM.md': '# MCP System\n\n## Objetivo\nMapear MCPs disponíveis, pendentes e planejados.\n\n## Registro\n- Nome\n- Status\n- Comandos\n- Riscos\n- Dependências',
    'EXECUTION_RUNTIME.md': '# Execution Runtime\n\n## Runtime de execução\nDocumento para acompanhar execução, comandos, automações e comportamento operacional.\n\n## Pontos de atenção\n- Segurança\n- Logs\n- Fallbacks\n- Permissões\n- Validação',
    'UI_UX.md': '# UI/UX\n\n## Direção visual\nBlack piano, foco operacional, baixa poluição visual e boa legibilidade.\n\n## Áreas\n- Composer\n- Projetos\n- Modal de documentos\n- Chat\n- Responsividade',
    'BUGS_AND_FAILURES.md': '# Bugs and Failures\n\n## Registro de falhas\nUse este documento para catalogar bugs, regressões, sintomas e correções.\n\n## Template\n- Data\n- Sintoma\n- Causa provável\n- Correção\n- Status',
    'EXPERIMENTS.md': '# Experiments\n\n## Experimentos\nRegistro de hipóteses, testes e aprendizados.\n\n## Template\n- Hipótese\n- Teste\n- Resultado\n- Próxima decisão',
    'VPS_DEPLOY.md': '# VPS Deploy\n\n## Deploy e infraestrutura\nDocumento para registrar VPS, serviços, portas, processos e riscos de operação.',
    'DATABASE_SCHEMA.md': '# Database Schema\n\n## Esquemas\nRegistro de tabelas, campos e decisões de dados.\n\n## Áreas\n- Supabase\n- LocalStorage\n- Arquivos locais\n- Memória',
    'CHANGELOG.md': '# Changelog\n\nHistórico automático e manual da evolução do Worion.\n'
  };
  return templates[fileName] || `# ${fileName}\n\nDocumento vivo do Worion Core Evolution.\n\n## Notas\n- Edite este arquivo conforme a evolução do sistema.\n`;
}

function loadProjectFilesStore() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WORION_PROJECT_FILES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveProjectFilesStore(store) {
  if (typeof localStorage === 'undefined') return {};
  localStorage.setItem(WORION_PROJECT_FILES_STORAGE_KEY, JSON.stringify(store && typeof store === 'object' ? store : {}));
  return store;
}

function ensureProjectFiles(project) {
  const store = loadProjectFilesStore();
  const projectId = project?.id;
  if (!projectId) return {};
  const current = store[projectId] && typeof store[projectId] === 'object' ? store[projectId] : {};
  (project.files || []).forEach(fileName => {
    if (!Object.prototype.hasOwnProperty.call(current, fileName)) {
      current[fileName] = getWorionProjectFileTemplate(fileName);
    }
  });
  store[projectId] = current;
  saveProjectFilesStore(store);
  return current;
}

function getProjectFileContent(projectId, fileName) {
  const store = loadProjectFilesStore();
  return String(store?.[projectId]?.[fileName] || getWorionProjectFileTemplate(fileName));
}

function saveProjectFileContent(projectId, fileName, content) {
  const store = loadProjectFilesStore();
  const projectFiles = store[projectId] && typeof store[projectId] === 'object' ? store[projectId] : {};
  projectFiles[fileName] = String(content || '');
  store[projectId] = projectFiles;
  saveProjectFilesStore(store);
  return projectFiles[fileName];
}

function appendProjectFileContent(projectId, fileName, content) {
  const current = getProjectFileContent(projectId, fileName);
  return saveProjectFileContent(projectId, fileName, `${current.trimEnd()}\n\n${String(content || '').trim()}\n`);
}

function safeNowIso() {
  return new Date().toISOString();
}

function loadProjects() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WORION_PROJECTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProjects(projectsList) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(WORION_PROJECTS_STORAGE_KEY, JSON.stringify(Array.isArray(projectsList) ? projectsList : []));
  }
  projects = loadProjects();
  return projects;
}

function projectExists(id, name) {
  return loadProjects().some(project => project.id === id || (name && String(project.name || '').toLowerCase() === String(name).toLowerCase()));
}

function normalizeProject(project) {
  const now = safeNowIso();
  return {
    id: project.id,
    name: project.name || project.title || 'Sem título',
    title: project.title || project.name || 'Sem título',
    type: project.type || 'project',
    status: project.status || 'active',
    description: project.description || '',
    context: project.context || '',
    conversations: Array.isArray(project.conversations) ? project.conversations : [],
    areas: Array.isArray(project.areas) ? project.areas : [],
    files: Array.isArray(project.files) ? project.files : [],
    tags: Array.isArray(project.tags) ? project.tags : [],
    metadata: project.metadata || {},
    changelog: Array.isArray(project.changelog) ? project.changelog : [],
    createdAt: project.createdAt || now,
    updatedAt: project.updatedAt || now
  };
}

async function createWorionCoreProject() {
  const list = loadProjects();
  const existing = list.find(project => project.id === WORION_CORE_PROJECT.id || project.name === WORION_CORE_PROJECT.name);
  if (existing) return existing;
  const now = safeNowIso();
  const project = normalizeProject({
    ...WORION_CORE_PROJECT,
    createdAt: now,
    updatedAt: now
  });
  saveProjects([project, ...list]);
  ensureProjectFiles(project);
  return project;
}

function generateChangelogAnalysisId(entry) {
  // Gera um ID único baseado no conteúdo da análise
  const content = [
    String(entry.summary || ''),
    Array.isArray(entry.affectedAreas) ? entry.affectedAreas.sort().join(',') : '',
    Array.isArray(entry.filesRead) ? entry.filesRead.sort().join(',') : ''
  ].filter(Boolean).join('|');

  // Hash simples usando somatório de códigos de caracteres
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converte para 32bit integer
  }
  return `analysis_${Math.abs(hash).toString(36)}`;
}

function updateWorionCoreProjectLog(entry) {
  const list = loadProjects();
  const project = list.find(item => item.id === WORION_CORE_PROJECT.id || item.name === WORION_CORE_PROJECT.name);
  if (!project) return null;

  const timestamp = safeNowIso();
  const nextEntry = typeof entry === 'string' ? { timestamp, summary: entry } : { timestamp, ...entry };

  // Gerar analysisId único
  nextEntry.analysisId = generateChangelogAnalysisId(nextEntry);

  // Inicializar changelog se necessário
  project.changelog = Array.isArray(project.changelog) ? project.changelog : [];

  // Verificar se já existe entrada com o mesmo analysisId
  const existingIndex = project.changelog.findIndex(item => item.analysisId === nextEntry.analysisId);

  if (existingIndex >= 0) {
    // Atualizar entrada existente em vez de criar duplicata
    project.changelog[existingIndex] = {
      ...project.changelog[existingIndex],
      ...nextEntry,
      updatedAt: timestamp,
      updateCount: (project.changelog[existingIndex].updateCount || 0) + 1
    };
  } else {
    // Adicionar nova entrada
    project.changelog.push(nextEntry);
  }

  project.updatedAt = timestamp;
  saveProjects([project, ...list.filter(item => item.id !== project.id)]);
  return project;
}

function dedupeProjectChangelog(project) {
  if (!project || !Array.isArray(project.changelog)) return project;

  // Adicionar analysisId a entradas antigas que não têm
  project.changelog = project.changelog.map(entry => {
    if (!entry.analysisId) {
      entry.analysisId = generateChangelogAnalysisId(entry);
    }
    return entry;
  });

  // Agrupar por analysisId e manter apenas a mais recente
  const seen = new Map();
  const deduplicated = [];

  // Processar em ordem reversa (mais recente primeiro)
  for (let i = project.changelog.length - 1; i >= 0; i--) {
    const entry = project.changelog[i];
    const id = entry.analysisId;

    if (!seen.has(id)) {
      seen.set(id, true);
      deduplicated.unshift(entry); // Adicionar no início para manter ordem cronológica
    }
  }

  const removed = project.changelog.length - deduplicated.length;
  project.changelog = deduplicated;

  if (removed > 0) {
    console.log(`[Projects] Removidas ${removed} entradas duplicadas do changelog de ${project.name}`);
  }

  return project;
}

async function readSessionFiles() {
  const sessionDir = path.join(__dirname, 'docs', 'sessions');
  const files = await fs.readdir(sessionDir).catch(() => []);
  return Promise.all(files.filter(file => /\.(md|txt|json)$/i.test(file)).map(async file => ({
    file,
    content: await fs.readFile(path.join(sessionDir, file), 'utf-8').catch(() => '')
  })));
}

function analyzeSessionEvolution(files) {
  const text = files.map(item => item.content || '').join('\n').toLowerCase();
  const affectedAreas = [];
  const areaPairs = [
    ['runtime', 'Runtime'], ['deepworion', 'DeepWorion'], ['skill', 'Skills'], ['agente', 'Agentes'],
    ['memória', 'Memória'], ['memoria', 'Memória'], ['ui', 'UI/UX'], ['ux', 'UI/UX'], ['conector', 'Conectores'],
    ['mcp', 'MCPs'], ['api', 'APIs'], ['supabase', 'Supabase'], ['vps', 'VPS'], ['log', 'Logs'],
    ['refator', 'Refatorações'], ['bug', 'Bugs'], ['teste', 'Testes'], ['roadmap', 'Roadmap'], ['arquitet', 'Arquitetura futura']
  ];
  for (const [needle, area] of areaPairs) {
    if (text.includes(needle) && !affectedAreas.includes(area)) affectedAreas.push(area);
  }
  const summaryParts = [];
  if (text.includes('bug')) summaryParts.push('Bugs e correções foram identificados.');
  if (text.includes('refator')) summaryParts.push('Houve refatoração e reorganização estrutural.');
  if (text.includes('prompt')) summaryParts.push('Prompts foram alterados.');
  if (text.includes('tool')) summaryParts.push('Tools e integrações mudaram.');
  if (text.includes('arquitet')) summaryParts.push('A arquitetura evoluiu.');
  if (text.includes('memoria') || text.includes('memória')) summaryParts.push('Memória e contexto tiveram evolução.');
  if (!summaryParts.length) summaryParts.push('As sessões mostram progresso incremental do sistema.');
  return {
    timestamp: safeNowIso(),
    summary: summaryParts.join(' '),
    affectedAreas: affectedAreas.length ? affectedAreas : ['Sessões importantes'],
    newModules: text.includes('módulo') || text.includes('modulo') ? ['Módulos citados nas sessões'] : [],
    bugFixes: text.includes('bug') ? ['Correções e estabilizações mencionadas'] : [],
    regressions: text.includes('regress') ? ['Possíveis regressões citadas'] : [],
    architecturalChanges: text.includes('arquitet') ? ['Mudanças arquiteturais detectadas'] : [],
    filesRead: files.map(item => item.file)
  };
}

function generateEvolutionSummary(evolution) {
  return {
    ...evolution,
    progressOfTheDay: [evolution.newModules.length && 'novos módulos', evolution.bugFixes.length && 'correções', evolution.architecturalChanges.length && 'evolução arquitetural']
      .filter(Boolean)
      .join(', ') || 'progresso incremental',
    mainChanges: evolution.summary
  };
}

async function updateChangelogFile(content, analysisId) {
  const filePath = path.join(__dirname, 'CHANGELOG.md');
  const current = await fs.readFile(filePath, 'utf-8').catch(() => '# CHANGELOG.md\n');

  // Verificar se já existe entrada com este analysisId
  const analysisIdMarker = `<!-- analysisId: ${analysisId} -->`;
  if (current.includes(analysisIdMarker)) {
    console.log('[Projects] CHANGELOG.md já contém esta análise. Pulando atualização.');
    return;
  }

  const entry = `## ${new Date().toISOString()}\n${analysisIdMarker}\n${content}`;
  await fs.writeFile(filePath, `${current.trimEnd()}\n\n${entry}\n`, 'utf-8');
  appendProjectFileContent(WORION_CORE_PROJECT.id, 'CHANGELOG.md', entry);
}

async function readDailySessionsEvolution() {
  const files = await readSessionFiles();
  const evolution = generateEvolutionSummary(analyzeSessionEvolution(files));

  // Gerar analysisId antes de atualizar
  const analysisId = generateChangelogAnalysisId(evolution);

  const project = updateWorionCoreProjectLog(evolution);

  // Só atualizar CHANGELOG.md se for nova entrada (não duplicata)
  if (project) {
    const lastEntry = project.changelog[project.changelog.length - 1];
    const isNewEntry = !lastEntry.updateCount || lastEntry.updateCount === 0;

    if (isNewEntry) {
      await updateChangelogFile(`${evolution.summary}\n- Áreas: ${evolution.affectedAreas.join(', ')}\n- Arquivos lidos: ${evolution.filesRead.join(', ')}`, analysisId);
    } else {
      console.log('[Projects] Análise duplicada detectada. CHANGELOG.md não foi modificado.');
    }
  }

  return evolution;
}

async function ensureProjectsDir() {
  try { await fs.mkdir(PROJECTS_DIR, { recursive: true }); } catch {}
}

async function ensureAgentLibraryFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(AGENTS_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(INSTALLED_AGENTS_PATH, 'utf-8');
    installedAgents = JSON.parse(raw);
    if (!Array.isArray(installedAgents)) installedAgents = [];
  } catch {
    installedAgents = [];
    await fs.writeFile(INSTALLED_AGENTS_PATH, JSON.stringify(installedAgents, null, 2), 'utf-8');
  }
}

async function loadAgentTemplates() {
  await ensureAgentLibraryFiles();
  const raw = await fs.readFile(AGENT_TEMPLATES_PATH, 'utf-8');
  agentTemplates = JSON.parse(raw);
  if (!Array.isArray(agentTemplates)) throw new Error('agent-templates.json invalido');
  return agentTemplates;
}

async function saveInstalledAgents() {
  await fs.writeFile(INSTALLED_AGENTS_PATH, JSON.stringify(installedAgents, null, 2), 'utf-8');
}

function getInstalledTemplateRecord(templateId) {
  return installedAgents.find(item => item.templateId === templateId);
}

function getTemplateStatus(template) {
  const record = getInstalledTemplateRecord(template.id);
  if (!record) return template.status === 'Disponivel' ? 'Dispon\u00edvel' : template.status || 'Dispon\u00edvel';
  return record.customized ? 'Personalizado' : 'Instalado';
}

async function saveLocalProject(data) {
  const now = safeNowIso();
  const project = normalizeProject({
    ...data,
    id: data.id || makeProjectId(),
    createdAt: data.createdAt || now,
    updatedAt: now
  });
  const list = loadProjects();
  const next = [project, ...list.filter(item => item.id !== project.id && String(item.name || '').toLowerCase() !== String(project.name || '').toLowerCase())];
  saveProjects(next);
  return project;
}

async function saveProject(project) {
  return await saveLocalProject(project);
}

async function listProjects() {
  return await loadLocalProjects();
}

async function loadLocalProjects() {
  return loadProjects();
}

async function applyChangelogDedupe() {
  const list = loadProjects();
  const worionCore = list.find(item => item.id === WORION_CORE_PROJECT.id);
  if (worionCore) {
    const before = worionCore.changelog?.length || 0;
    dedupeProjectChangelog(worionCore);
    const after = worionCore.changelog?.length || 0;
    if (before !== after) {
      saveProjects([worionCore, ...list.filter(item => item.id !== worionCore.id)]);
      console.log(`[Projects] Deduplicação aplicada: ${before} → ${after} entradas`);
    }
  }
}

async function deleteLocalProject(id) {
  const list = loadProjects().filter(project => project.id !== id);
  saveProjects(list);
}

async function deleteChangelogEntry(projectId, index) {
  const list = loadProjects();
  const project = list.find(item => item.id === projectId);
  if (!project || !Array.isArray(project.changelog)) return;

  project.changelog.splice(index, 1);
  saveProjects([project, ...list.filter(item => item.id !== project.id)]);

  // Reabrir projeto para refletir mudança
  await openProject(projectId);
}

function renderProjectList() {
  const area = document.getElementById('projects-area');
  if (!area) return;
  const list = projects.length ? projects : loadProjects();
  const hasCore = projectExists(WORION_CORE_PROJECT.id, WORION_CORE_PROJECT.name);
  area.innerHTML = `
    <div class="projects-section">
      <button class="btn-new" onclick="createWorionCoreProjectAction()">${hasCore ? 'Abrir Worion Core Evolution' : 'Criar Worion Core Evolution'}</button>
    </div>
    ${list.length === 0 ? '<div class="empty-panel"><i class="ti ti-folder"></i><p>Nenhum projeto ainda.<br>Crie o primeiro projeto.</p></div>' : list.map(project => `
      <div class="session-row" onclick="openProject('${project.id}')" style="position:relative">
        <div>
          <div class="session-title">${escapeHtml(project.name || project.title)}</div>
          ${project.description ? `<div class="session-meta">${escapeHtml(project.description.slice(0, 80))}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span class="session-meta">${escapeHtml(formatTime(new Date(project.updatedAt)))}</span>
          <button class="btn-small" onclick="event.stopPropagation();deleteProject('${project.id}')" title="Excluir"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `).join('')}
  `;
}

function renderAgentTemplateLibrary() {
  const area = document.getElementById('agent-library-area');
  if (!area) return;
  if (!agentTemplates.length) {
    area.innerHTML = '<div class="empty-panel"><i class="ti ti-template"></i><p>Nenhum template de agente encontrado.</p></div>';
    return;
  }

  const categories = [...new Set(agentTemplates.map(template => template.category))];
  area.innerHTML = categories.map(category => {
    const templates = agentTemplates.filter(template => template.category === category);
    return `
      <section class="agent-library-category">
        <div class="section-header">
          <h3>${escapeHtml(category)}</h3>
          <span>${templates.length} modelos</span>
        </div>
        <div class="template-card-grid">
          ${templates.map(template => {
            const status = getTemplateStatus(template);
            const badgeClass = status === 'Personalizado' ? 'badge-blue' : status === 'Instalado' ? 'badge-green' : 'badge-gray';
            return `
              <article class="template-card">
                <div class="card-header">
                  <span class="card-title">${escapeHtml(template.name)}</span>
                  <span class="card-badge ${badgeClass}">${escapeHtml(status)}</span>
                </div>
                <div class="template-source">${escapeHtml(template.source_reference || '')}</div>
                <p class="card-desc">${escapeHtml(template.description || '')}</p>
                <div class="template-use">${escapeHtml(template.use_case || '')}</div>
                <div class="card-tags">
                  ${(template.recommended_for || []).slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
                <button class="btn-template" onclick="openTemplateModal('${template.id}')">
                  <i class="ti ti-sparkles"></i> Usar modelo
                </button>
              </article>`;
          }).join('')}
        </div>
      </section>`;
  }).join('');
}

async function showProjectsView() {
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  if (!(await leaveChatIfNeeded())) return;
  setActiveView('projects');
  selected = null;
  currentAgent = null;
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  chatMode = false;
  messages = [];
  currentProjectContext = null;
  document.querySelector('.shell').classList.remove('chat-fullscreen');
  document.getElementById('detail-panel').style.display = 'none';

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="main-header page-header">
      <h1 class="main-title page-title">Projetos</h1>
      <div class="page-actions">
        <button class="btn-new" onclick="createProject()"><i class="ti ti-plus" aria-hidden="true"></i> Novo projeto</button>
        <button class="btn-chat" onclick="createWorionCoreProjectAction()"><i class="ti ti-cpu"></i> Criar Worion Core Evolution</button>
      </div>
    </div>
    <div class="content-area projects-page">
      <section class="projects-section">
        <div class="section-header"><h3>Meus Projetos</h3><span id="project-count"></span></div>
        <div id="projects-area">
          <div class="loading">Carregando projetos...</div>
        </div>
      </section>
    </div>`;

  try {
    projects = await loadLocalProjects();
    const count = document.getElementById('project-count');
    if (count) count.textContent = `${projects.length} projetos`;
    renderProjectList();
    if (typeof renderSidebarProjects === 'function') renderSidebarProjects();
  } catch (error) {
    console.error('Erro ao carregar projetos:', error);
    document.querySelector('.projects-page').innerHTML =
      `<div class="empty-panel"><i class="ti ti-alert-circle"></i><p>Erro ao carregar projetos.<br>${escapeHtml(error.message)}</p></div>`;
  }
}

function openTemplateModal(templateId) {
  const template = agentTemplates.find(item => item.id === templateId);
  if (!template) return;
  const existing = getInstalledTemplateRecord(templateId);
  const selectedTools = new Set(existing?.tools || template.default_tools || []);
  const allTools = Object.keys(TOOL_REGISTRY || {});
  const defaultObjective = existing?.objective || template.use_case || '';
  const defaultTone = existing?.tone || 'Objetivo, estruturado e acionavel';
  const defaultName = existing?.name || template.name;
  const defaultModel = existing?.model || template.default_model || 'gpt-5.4-mini';

  closeTemplateModal();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'agent-template-modal';
  modal.innerHTML = `
    <div class="modal-card template-modal">
      <div class="modal-header">
        <div>
          <div class="modal-eyebrow">${escapeHtml(template.category)}</div>
          <h2>Personalizar pre-agente</h2>
        </div>
        <button class="panel-close" onclick="closeTemplateModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <div class="template-summary">
          <strong>${escapeHtml(template.name)}</strong>
          <span>${escapeHtml(template.description || '')}</span>
        </div>
        <div class="form-field">
          <div class="field-label">NOME FINAL</div>
          <input id="template-agent-name" value="${escapeHtml(defaultName)}">
        </div>
        <div class="form-field">
          <div class="field-label">OBJETIVO</div>
          <textarea id="template-agent-objective" rows="3">${escapeHtml(defaultObjective)}</textarea>
        </div>
        <div class="form-field">
          <div class="field-label">TOM</div>
          <input id="template-agent-tone" value="${escapeHtml(defaultTone)}">
        </div>
        <div class="form-field">
          <div class="field-label">MODELO</div>
          <select id="template-agent-model" class="template-select">
            ${getModelOptions(defaultModel)}
          </select>
        </div>
        <div class="form-field">
          <div class="field-label">FERRAMENTAS</div>
          <div class="template-tools">
            ${allTools.map(tool => `
              <label class="tool-check">
                <input type="checkbox" value="${escapeHtml(tool)}"${selectedTools.has(tool) ? ' checked' : ''}>
                <span>${escapeHtml(tool)}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-field">
          <div class="field-label">PROMPT BASE EDITAVEL</div>
          <textarea id="template-agent-prompt" rows="10">${escapeHtml(existing?.basePrompt || template.base_prompt || '')}</textarea>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-edit" onclick="closeTemplateModal()">Cancelar</button>
        <button class="btn-chat" onclick="installAgentTemplate('${template.id}')"><i class="ti ti-device-floppy"></i> Salvar como agente</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function closeTemplateModal() {
  document.getElementById('agent-template-modal')?.remove();
}

function buildAgentMarkdownFromTemplate(template, data) {
  const toolsText = data.tools.length ? data.tools.join(', ') : 'nenhuma ferramenta selecionada';
  const starters = (template.starter_questions || []).map(item => `- ${item}`).join('\n');
  const recommended = (template.recommended_for || []).join(', ');
  return `# ${data.name}

${template.description || 'Agente criado a partir da Biblioteca de Pre-Agentes do Worion.'}

<!-- model: ${data.model} -->
<!-- webhook:  -->
<!-- template_id: ${template.id} -->
<!-- template_source: ${template.source_reference || 'Template Worion'} -->
<!-- tools: ${toolsText} -->

Objetivo operacional:
${data.objective}

Tom de resposta:
${data.tone}

Ferramentas preferenciais:
${toolsText}

Perguntas iniciais sugeridas:
${starters || '- Qual resultado voce quer obter agora?'}

Recomendado para:
${recommended || 'uso geral'}

Prompt base:
${data.prompt}
`;
}

async function installAgentTemplate(templateId) {
  const template = agentTemplates.find(item => item.id === templateId);
  if (!template) return;

  const name = document.getElementById('template-agent-name')?.value.trim();
  const objective = document.getElementById('template-agent-objective')?.value.trim();
  const tone = document.getElementById('template-agent-tone')?.value.trim();
  const model = document.getElementById('template-agent-model')?.value.trim() || template.default_model || 'gpt-5.4-mini';
  const prompt = document.getElementById('template-agent-prompt')?.value.trim();
  const tools = Array.from(document.querySelectorAll('#agent-template-modal .tool-check input:checked')).map(input => input.value);

  if (!name || !objective || !prompt) {
    alert('Nome, objetivo e prompt base sao obrigatorios.');
    return;
  }

  const baseName = slugifyFileName(name);
  const file = `${baseName}.md`;
  const fullPath = path.join(AGENTS_DIR, file);
  const data = { name, objective, tone: tone || 'Objetivo e acionavel', model, tools, prompt };
  const content = buildAgentMarkdownFromTemplate(template, data);
  const customized = name !== template.name
    || objective !== template.use_case
    || data.tone !== 'Objetivo, estruturado e acionavel'
    || model !== template.default_model
    || prompt !== template.base_prompt
    || JSON.stringify(tools) !== JSON.stringify(template.default_tools || []);

  try {
    await fs.mkdir(AGENTS_DIR, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    const now = new Date().toISOString();
    const record = {
      templateId: template.id,
      name,
      file,
      objective,
      tone: data.tone,
      basePrompt: prompt,
      model,
      tools,
      customized,
      installedAt: getInstalledTemplateRecord(template.id)?.installedAt || now,
      updatedAt: now
    };
    installedAgents = installedAgents.filter(item => item.templateId !== template.id);
    installedAgents.push(record);
    await saveInstalledAgents();
    await loadAgents();
    closeTemplateModal();
    renderAgentTemplateLibrary();
    const saved = agents.find(agent => agent.file === file);
    if (saved) {
      selected = saved.id;
      currentAgent = saved;
      renderSidebarSkills();
    }
    logAction('install_agent_template', 'success', `${template.id} -> ${file}`);
  } catch (error) {
    console.error('Erro ao instalar pre-agente:', error);
    alert(`Erro ao instalar pre-agente: ${error.message}`);
    logAction('install_agent_template', 'error', error.message);
  }
}

async function createProject() {
  const title = prompt('Nome do projeto');
  if (!title || !title.trim()) return;
  const description = prompt('Descrição (opcional)') || '';
  try {
    await saveLocalProject({ title: title.trim(), description: description.trim() });
    await showProjectsView();
    logAction('create_project', 'success', title.trim());
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    alert(`Erro ao criar projeto: ${error.message}`);
    logAction('create_project', 'error', error.message);
  }
}

async function deleteProject(id) {
  if (!confirm('Excluir este projeto?')) return;
  await deleteLocalProject(id);
  logAction('delete_project', 'success', id);
  await showProjectsView();
}

async function createProject() {
  closeProjectModal();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'project-modal';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h2>Novo projeto</h2>
        <button class="panel-close" onclick="closeProjectModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-field">
          <div class="field-label">NOME</div>
          <input id="project-name" placeholder="Estudo, TCC, Empresa, Viagem...">
        </div>
        <div class="form-field">
          <div class="field-label">DESCRICAO</div>
          <textarea id="project-description" rows="4" placeholder="Contexto rapido do projeto"></textarea>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-edit" onclick="closeProjectModal()">Cancelar</button>
        <button class="btn-chat" onclick="submitProjectModal()"><i class="ti ti-device-floppy"></i> Criar projeto</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('project-name')?.focus(), 20);
}

function closeProjectModal() {
  document.getElementById('project-modal')?.remove();
}

async function submitProjectModal() {
  const title = document.getElementById('project-name')?.value.trim();
  if (!title) {
    alert('Nome do projeto e obrigatorio.');
    return;
  }
  const description = document.getElementById('project-description')?.value.trim() || '';
  try {
    await saveProject({ name: title, title, description });
    closeProjectModal();
    await showProjectsView();
    logAction('create_project', 'success', title);
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    alert(`Erro ao criar projeto: ${error.message}`);
    logAction('create_project', 'error', error.message);
  }
}

async function openProject(projectId) {
  projects = await loadLocalProjects();
  const project = projects.find(item => item.id === projectId);
  if (!project) return;
  currentProjectContext = null;
  setActiveView('projects');
  document.getElementById('detail-panel').style.display = 'none';

  const linked = (project.conversations || []).slice(-12).reverse();
  ensureProjectFiles(project);
  document.getElementById('main').innerHTML = `
    <div class="main-header page-header">
      <h1 class="main-title page-title">${escapeHtml(project.name || project.title)}</h1>
      <div class="page-actions">
        <button class="btn-new" onclick="openProjectChat('${project.id}')"><i class="ti ti-message"></i> Nova conversa</button>
        ${project.id === WORION_CORE_PROJECT.id ? '<button class="btn-chat" onclick="updateWorionCoreProjectLogAction()"><i class="ti ti-refresh"></i> Atualizar Projeto</button>' : ''}
        <button class="btn-small" onclick="showProjectsView()"><i class="ti ti-arrow-left"></i> Voltar</button>
      </div>
    </div>
    <div class="content-area projects-page">
      <section class="projects-section">
        <div class="section-header"><h3>Contexto</h3><span>${escapeHtml(formatTime(new Date(project.updatedAt)))}</span></div>
        <div class="session-row worion-project-context" style="cursor:default">
          <div>
            <div class="session-title worion-project-context-text">${escapeHtml(project.description || 'Sem descricao')}</div>
            <div class="session-meta">${(project.tags || []).map(tag => `#${escapeHtml(tag)}`).join(' ') || 'Sem tags'}</div>
          </div>
        </div>
      </section>
      <section class="projects-section">
        <div class="section-header"><h3>Áreas</h3><span>${(project.areas || []).length}</span></div>
        <div class="card-tags">${(project.areas || []).map(area => `<span class="tag">${escapeHtml(area)}</span>`).join('')}</div>
      </section>
      <section class="projects-section">
        <div class="section-header"><h3>Arquivos base</h3><span>${(project.files || []).length}</span></div>
        <div class="worion-project-file-grid">${(project.files || []).map(file => `
          <button class="worion-project-file-card" onclick="openProjectFileEditor('${project.id}', '${escapeHtml(file)}')" type="button">
            <i class="ti ti-file-text" aria-hidden="true"></i>
            <span>${escapeHtml(file)}</span>
          </button>
        `).join('')}</div>
      </section>
      <section class="projects-section">
        <div class="section-header"><h3>Changelog</h3><span>${(project.changelog || []).length}</span></div>
        <div class="worion-project-changelog-list">
        ${(project.changelog || []).length ? (project.changelog || []).slice().reverse().map((item, index) => `
          <div class="worion-project-changelog-card">
            <div>
              <div class="worion-project-changelog-summary">${escapeHtml(item.summary || item.mainChanges || 'Sem resumo')}</div>
              <div class="session-meta">${escapeHtml(item.timestamp || '')}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn-small" onclick="openProjectChangelogModal('${project.id}', ${(project.changelog || []).length - 1 - index})">Ver detalhes</button>
              <button class="btn-small" onclick="event.stopPropagation();deleteChangelogEntry('${project.id}', ${(project.changelog || []).length - 1 - index})" title="Excluir entrada"><i class="ti ti-x"></i></button>
            </div>
          </div>
        `).join('') : '<div class="empty-panel"><i class="ti ti-notebook"></i><p>Sem entradas no changelog.</p></div>'}
        </div>
      </section>
      <section class="projects-section">
        <div class="section-header"><h3>Conversas do projeto</h3><span>${linked.length}</span></div>
        <div>
          ${linked.length ? linked.map(item => `
            <div class="session-row" onclick="openConversation('${item.id}')">
              <div>
                <div class="session-title">${escapeHtml(item.title || 'Conversa sem titulo')}</div>
                <div class="session-meta">${escapeHtml(item.updatedAt ? formatDateTime(item.updatedAt) : '')}</div>
              </div>
            </div>
          `).join('') : '<div class="empty-panel"><i class="ti ti-message"></i><p>Nenhuma conversa vinculada ainda.</p></div>'}
        </div>
      </section>
      <section class="projects-section">
        <div class="section-header"><h3>Arquivos</h3><span>${(project.files || []).length}</span></div>
        <div class="empty-panel"><i class="ti ti-paperclip"></i><p>Anexos usados em conversas do projeto aparecerao aqui.</p></div>
      </section>
    </div>`;
}

async function attachConversationToProject(conversationId, projectId, snapshot = null) {
  if (!conversationId || !projectId) return;
  const loaded = await loadLocalProjects();
  const project = loaded.find(item => item.id === projectId);
  if (!project) return;
  const existing = Array.isArray(project.conversations) ? project.conversations : [];
  const existingFiles = Array.isArray(project.files) ? project.files : [];
  const sourceMessages = Array.isArray(snapshot?.messages) ? snapshot.messages : getCleanMessages();
  const messageFiles = getCleanMessages(sourceMessages)
    .flatMap(message => Array.isArray(message.attachments) ? message.attachments : [])
    .map(file => ({
      id: file.id || file.name,
      name: file.name,
      type: file.type || '',
      size: file.size || 0,
      conversationId,
      addedAt: new Date().toISOString()
    }))
    .filter(file => file.name);
  project.conversations = [
    ...existing.filter(item => item.id !== conversationId),
    { id: conversationId, title: snapshot?.title || getConversationTitle(sourceMessages), updatedAt: new Date().toISOString() }
  ];
  project.files = [
    ...existingFiles.filter(file => !messageFiles.some(next => next.id === file.id && next.conversationId === file.conversationId)),
    ...messageFiles
  ];
  await saveProject(project);
}

async function openProjectChat(projectId) {
  projects = await loadLocalProjects();
  const project = projects.find(item => item.id === projectId);
  if (!project) return;

  const projectFiles = ensureProjectFiles(project);
  const filesContext = Object.entries(projectFiles)
    .map(([fileName, content]) => `## ${fileName}\n${String(content || '').slice(0, 12000)}`)
    .join('\n\n---\n\n');

  currentProjectContext = {
    id: projectId,
    title: project.name || project.title,
    content: [project.description, project.context].filter(Boolean).join('\n\n') || 'Projeto sem conteúdo.'
  };

  currentProjectContext.content = [
    project.description,
    project.context,
    filesContext ? `Arquivos vivos em worion_project_files:\n\n${filesContext}` : ''
  ].filter(Boolean).join('\n\n') || currentProjectContext.content;

  selected = null;
  currentAgent = null;
  window.currentChatSource = 'home';
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  await startChat();
}

async function createWorionCoreProjectAction() {
  const project = await createWorionCoreProject();
  projects = await loadLocalProjects();
  await openProject(project.id);
}

async function updateWorionCoreProjectLogAction() {
  const evolution = await readDailySessionsEvolution();

  // Aplicar deduplicação após atualização
  const list = loadProjects();
  const project = list.find(item => item.id === WORION_CORE_PROJECT.id);
  if (project) {
    dedupeProjectChangelog(project);
    saveProjects([project, ...list.filter(item => item.id !== project.id)]);
  }

  projects = await loadLocalProjects();
  await openProject(WORION_CORE_PROJECT.id);

  // Verificar se houve mudança real
  if (project && project.changelog.length > 0) {
    const lastEntry = project.changelog[project.changelog.length - 1];
    if (lastEntry.updateCount && lastEntry.updateCount > 0) {
      console.log('[Projects] Nenhuma alteração nova detectada. Entrada existente atualizada.');
    }
  }
}

function formatChangelogEntry(entry) {
  if (!entry) return 'Sem detalhes.';
  const parts = [
    entry.summary || entry.mainChanges || '',
    entry.progressOfTheDay ? `Progresso do dia: ${entry.progressOfTheDay}` : '',
    Array.isArray(entry.affectedAreas) && entry.affectedAreas.length ? `Áreas afetadas: ${entry.affectedAreas.join(', ')}` : '',
    Array.isArray(entry.newModules) && entry.newModules.length ? `Novos módulos: ${entry.newModules.join(', ')}` : '',
    Array.isArray(entry.bugFixes) && entry.bugFixes.length ? `Correções: ${entry.bugFixes.join(', ')}` : '',
    Array.isArray(entry.regressions) && entry.regressions.length ? `Regressões/Riscos: ${entry.regressions.join(', ')}` : '',
    Array.isArray(entry.architecturalChanges) && entry.architecturalChanges.length ? `Arquitetura: ${entry.architecturalChanges.join(', ')}` : '',
    Array.isArray(entry.filesRead) && entry.filesRead.length ? `Arquivos lidos: ${entry.filesRead.join(', ')}` : ''
  ].filter(Boolean);
  return parts.length ? parts.join('\n\n') : JSON.stringify(entry, null, 2);
}

async function openProjectChangelogModal(projectId, entryIndex) {
  const list = await loadLocalProjects();
  const project = list.find(item => item.id === projectId);
  const entry = project?.changelog?.[entryIndex];
  if (!entry) return;
  closeProjectChangelogModal();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop worion-changelog-modal-backdrop';
  modal.id = 'worion-changelog-modal';
  modal.innerHTML = `
    <div class="modal-card worion-changelog-modal">
      <div class="modal-header">
        <h2>Detalhes do Changelog</h2>
        <button class="panel-close" onclick="closeProjectChangelogModal()"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body worion-changelog-modal-body">
        <div class="session-meta">${escapeHtml(entry.timestamp || '')}</div>
        <pre class="worion-changelog-modal-content">${escapeHtml(formatChangelogEntry(entry))}</pre>
      </div>
      <div class="modal-actions">
        <button class="btn-edit" onclick="closeProjectChangelogModal()">Fechar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function closeProjectChangelogModal() {
  document.getElementById('worion-changelog-modal')?.remove();
}

async function openProjectFileEditor(projectId, fileName) {
  const project = (await loadLocalProjects()).find(item => item.id === projectId);
  if (!project || !(project.files || []).includes(fileName)) return;
  ensureProjectFiles(project);
  closeProjectFileEditor();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop worion-file-editor-backdrop';
  modal.id = 'worion-file-editor-modal';
  modal.innerHTML = `
    <div class="modal-card worion-file-editor-modal">
      <div class="modal-header">
        <div>
          <h2>${escapeHtml(fileName)}</h2>
          <p class="worion-file-editor-subtitle">${escapeHtml(project.name || project.title || 'Projeto')}</p>
        </div>
        <button class="panel-close" onclick="closeProjectFileEditor()"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body worion-file-editor-body">
        <textarea id="worion-file-editor-textarea" class="worion-file-editor-textarea" spellcheck="true">${escapeHtml(getProjectFileContent(projectId, fileName))}</textarea>
      </div>
      <div class="modal-actions">
        <span class="worion-file-editor-status" id="worion-file-editor-status">Documento vivo local</span>
        <button class="btn-edit" onclick="closeProjectFileEditor()">Fechar</button>
        <button class="btn-chat" onclick="saveProjectFileEditor('${projectId}', '${escapeHtml(fileName)}')"><i class="ti ti-device-floppy"></i> Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('worion-file-editor-textarea')?.focus(), 20);
}

function saveProjectFileEditor(projectId, fileName) {
  const textarea = document.getElementById('worion-file-editor-textarea');
  if (!textarea) return;
  saveProjectFileContent(projectId, fileName, textarea.value);
  const status = document.getElementById('worion-file-editor-status');
  if (status) status.textContent = `Salvo em ${new Date().toLocaleTimeString()}`;
}

function closeProjectFileEditor() {
  document.getElementById('worion-file-editor-modal')?.remove();
}
