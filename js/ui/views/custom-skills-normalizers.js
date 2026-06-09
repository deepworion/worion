/**
 * MÓDULO: custom-skills-normalizers.js
 * RESPONSABILIDADE: Normalização e helpers de skills customizadas
 * DEPENDÊNCIAS: makeId (utils.js global), QUICK_SKILLS (global)
 * EXPORTA: normalizeCustomSkill, getSkillCardDescription, getSkillsForManagement, mergeCustomSkillsIntoRuntime, getSkillDocumentRef, getCustomSkillIdFromName
 * NÃO MODIFICAR SEM LER: ui.js (chama este módulo para normalização de skills)
 */

/**
 * Normaliza objeto de skill customizada
 * @param {Object} skill - Skill a normalizar
 * @returns {Object} - Skill normalizada
 */
export function normalizeCustomSkill(skill = {}) {
  return {
    id: String(skill.id || (typeof makeId === 'function' ? makeId('skill') : `skill-${Date.now()}`)).trim(),
    name: String(skill.name || 'Skill personalizada').trim(),
    category: String(skill.category || 'Personalizadas').trim(),
    description: String(skill.description || skill.desc || '').trim(),
    prompt: String(skill.prompt || '').trim(),
    icon: String(skill.icon || 'ti-sparkles').trim(),
    documents: Array.isArray(skill.documents) ? skill.documents : [],
    customManaged: true,
    updatedAt: skill.updatedAt || new Date().toISOString()
  };
}

/**
 * Mescla skills customizadas no runtime
 * @param {Array} customSkills - Skills customizadas
 * @returns {Array} - Array de todas as skills
 */
export function mergeCustomSkillsIntoRuntime(customSkills = []) {
  const QUICK_SKILLS = window.QUICK_SKILLS || [];
  const baseSkills = (Array.isArray(QUICK_SKILLS) ? QUICK_SKILLS : [])
    .filter(skill => !skill.customManaged);
  const byId = new Map(baseSkills.map(skill => [skill.id, skill]));
  customSkills.map(normalizeCustomSkill).forEach(skill => byId.set(skill.id, skill));
  const merged = Array.from(byId.values());
  window.QUICK_SKILLS = merged;
  if (typeof window !== 'undefined' && window.QUICK_SKILLS) {
    window.WORION_SKILLS = merged;
  }
  return merged;
}

/**
 * Obtém skills para gerenciamento (ordenadas por categoria)
 * @returns {Array} - Skills ordenadas
 */
export function getSkillsForManagement() {
  const QUICK_SKILLS = window.QUICK_SKILLS || [];
  const source = Array.isArray(window.WORION_SKILLS) ? window.WORION_SKILLS : QUICK_SKILLS;
  const categories = typeof window.getSkillCategories === 'function'
    ? window.getSkillCategories()
    : [];
  const categoryRank = new Map(categories.map((category, index) => [category, index]));

  return [...source].sort((a, b) => {
    const rankA = categoryRank.has(a.category) ? categoryRank.get(a.category) : Number.MAX_SAFE_INTEGER;
    const rankB = categoryRank.has(b.category) ? categoryRank.get(b.category) : Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
  });
}

/**
 * Obtém descrição de skill para card (limpa e trunca)
 * @param {Object} skill - Skill
 * @returns {string} - Descrição formatada
 */
export function getSkillCardDescription(skill) {
  const raw = skill?.description || skill?.desc || skill?.prompt || '';
  const clean = String(raw)
    .replace(/^Skill\s+[^:]+:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return 'Skill personalizada do Worion.';
  if (clean.length <= 180) return clean;
  return `${clean.slice(0, 177).trim()}...`;
}

/**
 * Gera referência de documento de skill
 * @param {string} skillSlug - Slug da skill
 * @param {string} fileName - Nome do arquivo
 * @returns {string} - Referência do documento
 */
export function getSkillDocumentRef(skillSlug, fileName) {
  return `skill-documents/${skillSlug}/${fileName}`.replace(/\\/g, '/');
}

/**
 * Gera ID único para skill customizada baseado em nome
 * @param {string} name - Nome da skill
 * @param {string} existingId - ID existente (se houver)
 * @returns {string} - ID gerado ou existente
 */
export function getCustomSkillIdFromName(name, existingId = '') {
  if (existingId) return existingId;

  const slugifyFileName = typeof window.slugifyFileName === 'function'
    ? window.slugifyFileName
    : (str) => String(str || '').toLowerCase().replace(/[^a-z0-9-]/g, '-');

  const makeId = typeof window.makeId === 'function'
    ? window.makeId
    : (prefix) => `${prefix}-${Date.now()}`;

  const QUICK_SKILLS = window.QUICK_SKILLS || [];
  const base = slugifyFileName(name || 'skill-personalizada') || makeId('skill');
  const existingIds = new Set((Array.isArray(QUICK_SKILLS) ? QUICK_SKILLS : []).map(skill => skill.id));
  let candidate = base;
  let index = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}
