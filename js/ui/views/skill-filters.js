/**
 * MÓDULO: skill-filters.js
 * RESPONSABILIDADE: Lógica de filtros de skills
 * DEPENDÊNCIAS: nenhuma
 * EXPORTA: filterSkills, normalizeSkillFilterTerm
 * NÃO MODIFICAR SEM LER: ui.js (chama este módulo para filtrar skills)
 */

/**
 * Normaliza o termo de busca para filtro de skills
 * @param {string} value - Termo de busca
 * @returns {string} - Termo normalizado (lowercase, trimmed)
 */
export function normalizeSkillFilterTerm(value = '') {
  return String(value || '').trim().toLowerCase();
}

/**
 * Filtra skills baseado em termo de busca
 * Busca por: nome, categoria e descrição
 * @param {Array} skills - Lista de skills
 * @param {string} searchTerm - Termo de busca
 * @param {Function} getDescription - Função para obter descrição da skill
 * @returns {Array} - Skills filtradas
 */
export function filterSkills(skills = [], searchTerm = '', getDescription = null) {
  const term = normalizeSkillFilterTerm(searchTerm);

  if (!term) {
    return skills;
  }

  return skills.filter(skill => {
    const description = typeof getDescription === 'function'
      ? getDescription(skill)
      : (skill.description || skill.desc || '');

    return String(skill.name || '').toLowerCase().includes(term) ||
      String(skill.category || '').toLowerCase().includes(term) ||
      String(description).toLowerCase().includes(term);
  });
}
