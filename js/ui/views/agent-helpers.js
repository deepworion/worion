/**
 * MÓDULO: agent-helpers.js
 * RESPONSABILIDADE: Helpers para manipulação e normalização de agentes/personas
 * DEPENDÊNCIAS: path (Node.js via window.require), slugifyFileName (utils.js global via window)
 * EXPORTA: getAgentTitleFromPersona, getAgentDescFromPersona, sanitizeAgentDocumentName, getAgentDocumentRef, buildAgentMarkdownContent, buildAgentMarkdownFromPersona, getAgentPromptForEdit, isAgentPersonaFile, getAgentPersonaFiles
 * NÃO MODIFICAR SEM LER: ui.js (chama este módulo para helpers de agentes)
 */

// Obter referência ao módulo path do Node.js
const path = window.require ? window.require('path') : {
  basename: (p, ext) => {
    const name = String(p).split(/[/\\]/).pop();
    if (ext && name.endsWith(ext)) {
      return name.slice(0, -ext.length);
    }
    return name;
  },
  extname: (p) => {
    const name = String(p).split(/[/\\]/).pop();
    const dotIndex = name.lastIndexOf('.');
    return dotIndex > 0 ? name.slice(dotIndex) : '';
  }
};

/**
 * Verifica se um arquivo é válido para persona de agente
 * @param {File} file - Arquivo a verificar
 * @returns {boolean} - True se é válido
 */
export function isAgentPersonaFile(file) {
  const allowedExtensions = ['.md', '.txt', '.json', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
  return Boolean(file?.name && allowedExtensions.includes(path.extname(file.name).toLowerCase()));
}

/**
 * Filtra lista de arquivos para retornar apenas personas válidas
 * @param {FileList} fileList - Lista de arquivos
 * @returns {Array} - Array de arquivos válidos
 */
export function getAgentPersonaFiles(fileList) {
  return Array.from(fileList || []).filter(isAgentPersonaFile);
}

/**
 * Extrai título de agente a partir de conteúdo de persona
 * @param {string} fileName - Nome do arquivo
 * @param {string} text - Conteúdo do arquivo
 * @returns {string} - Título extraído
 */
export function getAgentTitleFromPersona(fileName, text) {
  const titleMatch = String(text || '').match(/^#\s+(.+)/m);
  if (titleMatch) return titleMatch[1].trim();
  return path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, ' ').trim() || 'Agente personalizado';
}

/**
 * Extrai descrição de agente a partir de conteúdo de persona
 * @param {string} text - Conteúdo do arquivo
 * @returns {string} - Descrição extraída (até 120 caracteres)
 */
export function getAgentDescFromPersona(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('<!--'));
  return (lines[0] || 'Agente personalizado por documento').slice(0, 120);
}

/**
 * Sanitiza nome de arquivo de documento de agente
 * @param {string} fileName - Nome do arquivo original
 * @returns {string} - Nome sanitizado
 */
export function sanitizeAgentDocumentName(fileName) {
  const AGENT_PERSONA_EXTENSIONS = ['.md', '.txt', '.json', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const ext = AGENT_PERSONA_EXTENSIONS.includes(path.extname(fileName || '').toLowerCase())
    ? path.extname(fileName).toLowerCase()
    : '.md';
  const base = typeof window.slugifyFileName === 'function'
    ? window.slugifyFileName(path.basename(fileName || 'documento', path.extname(fileName || '')))
    : path.basename(fileName || 'documento', path.extname(fileName || '')).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `${base || 'documento'}${ext}`;
}

/**
 * Gera referência de documento de agente
 * @param {string} agentSlug - Slug do agente
 * @param {string} fileName - Nome do arquivo
 * @returns {string} - Referência do documento
 */
export function getAgentDocumentRef(agentSlug, fileName) {
  return `_docs/${agentSlug}/${fileName}`.replace(/\\/g, '/');
}

/**
 * Constrói conteúdo Markdown de agente
 * @param {Object} options - Opções do agente
 * @param {string} options.name - Nome do agente
 * @param {string} options.desc - Descrição
 * @param {string} options.model - Modelo
 * @param {string} options.webhookUrl - URL do webhook
 * @param {string} options.prompt - Prompt
 * @param {Array} options.documentRefs - Referências de documentos
 * @param {Array} options.sourceFiles - Arquivos de origem
 * @returns {string} - Conteúdo Markdown
 */
export function buildAgentMarkdownContent({ name, desc, model, webhookUrl, prompt, documentRefs = [], sourceFiles = [] }) {
  const sources = sourceFiles?.length ? sourceFiles.join(', ') : 'arquivo anexado';
  const documentMetadata = documentRefs
    .map(doc => `<!-- document: ${doc.path} -->`)
    .join('\n');
  const personaMetadata = sourceFiles?.length ? `<!-- persona_sources: ${sources} -->\n` : '';

  return `# ${name}

${desc || `Persona importada de: ${sources}`}

<!-- model: ${model || 'gpt-5.4-mini'} -->
<!-- webhook: ${webhookUrl || ''} -->
${personaMetadata}${documentMetadata ? `${documentMetadata}\n` : ''}
${prompt ? `${prompt.trim()}\n` : ''}`;
}

/**
 * Constrói Markdown de agente a partir de persona
 * @param {Object} options - Opções da persona
 * @returns {string} - Conteúdo Markdown
 */
export function buildAgentMarkdownFromPersona({ name, desc, model, webhookUrl, sourceFiles, documentRefs = [] }) {
  return buildAgentMarkdownContent({
    name,
    desc,
    model,
    webhookUrl,
    prompt: '',
    sourceFiles,
    documentRefs
  });
}

/**
 * Extrai prompt de agente para edição (remove metadados)
 * @param {Object} agent - Objeto do agente
 * @returns {string} - Prompt limpo para edição
 */
export function getAgentPromptForEdit(agent) {
  if (!agent) return '';
  const source = Object.prototype.hasOwnProperty.call(agent, 'promptContent')
    ? agent.promptContent
    : agent.content;
  let text = String(source || '')
    .replace(/<!--\s*model:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*webhook:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*status:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*persona_sources:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*template_id:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*template_source:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*tools:[\s\S]*?-->\s*/gi, '')
    .replace(/<!--\s*document:[\s\S]*?-->\s*/gi, '')
    .trim();

  const titlePattern = new RegExp(`^#\\s+${agent.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+`, 'i');
  text = text.replace(titlePattern, '');

  const desc = String(agent.desc || '').trim();
  if (desc && text.startsWith(desc)) {
    text = text.slice(desc.length).replace(/^\s+/, '');
  }

  return text.trim();
}
