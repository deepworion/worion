/**
 * MODULO: agents.js
 * RESPONSABILIDADE: Estado e constantes globais de agentes do Worion
 * DEPENDENCIAS: Node fs/path no renderer Electron
 * EXPORTA: WORION_AGENTS, agents, selected, currentAgent, AGENTS_DIR, AGENT_DOCS_DIR
 */

// Centraliza o estado de agentes antes do app principal para evitar mistura com skills.
var fs = require('fs').promises;
var path = require('path');
window.fs = fs;
window.path = path;

var AGENTS_DIR = path.join(__dirname, 'agents');
var AGENT_DOCS_DIR = path.join(AGENTS_DIR, '_docs');
window.AGENTS_DIR = AGENTS_DIR;
window.AGENT_DOCS_DIR = AGENT_DOCS_DIR;

var agents = window.WORION_AGENTS = [];
var selected = null;
var currentAgent = null;

function syncWorionAgentsGlobal() {
  window.WORION_AGENTS = agents;
  return agents;
}

async function loadAgentsFromModule() {
  try {
    const files = await fs.readdir(AGENTS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    agents = await Promise.all(mdFiles.map(async (file) => {
      const fullPath = path.join(AGENTS_DIR, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const stats = await fs.stat(fullPath);

      const titleMatch = content.match(/^#\s+(.+)/m);
      const name = titleMatch ? titleMatch[1] : file.replace('.md', '');
      const desc = getAgentDescription(content);
      const modelMatch = content.match(/<!--\s*model:\s*([\s\S]*?)\s*-->/i);
      const webhookMatch = content.match(/<!--\s*webhook:\s*([\s\S]*?)\s*-->/i);
      const statusMatch = content.match(/<!--\s*status:\s*(active|inactive)\s*-->/i);
      const isActive = !statusMatch || statusMatch[1].toLowerCase() !== 'inactive';
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
        badge: isActive ? 'Ativo' : 'Inativo',
        badgeClass: isActive ? 'badge-green' : 'badge-gray',
        time: formatTime(stats.mtime),
        tags: ['Personalizado'],
        connections: { notion: true, obsidian: false, github: false, drive: false }
      };
    }));

    syncWorionAgentsGlobal();
    renderCards(agents);
    renderSidebarSkills();
    await refreshSidebarConversations();
    console.log(`[Agents] ${agents.length} agente(s) carregado(s)`);
    return agents;
  } catch (error) {
    console.error('[Agents] Erro ao carregar agentes:', error);
    agents = [];
    syncWorionAgentsGlobal();
    renderCards([]);
    return agents;
  }
}

function reloadAgents() {
  loadAgentsFromModule();
}

async function startAgentChat(id) {
  const agent = agents.find(a => a.id === id);
  if (!agent) {
    console.warn('[Agents] startAgentChat: agente nao encontrado', {
      id,
      loadedAgents: agents.map(a => a.id)
    });
    return;
  }
  activeSkillId = null;
  activeWorkModeId = null;
  activeWorkModeIds = [];
  window.currentChatSource = 'agent';
  selected = agent.id;
  currentAgent = agent;
  window.agentsState = {
    ...(window.agentsState || {}),
    activeConversationAgentId: agent.id,
    selectedAgentId: agent.id
  };
  currentConversationId = null;
  messages = [];
  sessionStartedAt = null;
  await startChat({ keepMessages: true, loadHistory: false });
}

window.startAgentChat = startAgentChat;
