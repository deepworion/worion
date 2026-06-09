/**
 * @module ui/sidebar/sidebar-skills
 * @description Renderização de skills na sidebar
 * @dependencies utils
 * @exports renderSidebarSkills, setupSidebarSkillsViewLink
 */

export function renderSidebarSkills() {
  const escapeHtml = window.escapeHtml || (s => s);
  const loadCustomSkillsSync = window.loadCustomSkillsSync || (() => []);
  const QUICK_SKILLS = window.QUICK_SKILLS || [];
  const activeSkillId = window.activeSkillId;
  const getSkillCategories = window.getSkillCategories || (() => []);

  const sidebar = document.getElementById('sidebar-skills');
  if (!sidebar) return;
  loadCustomSkillsSync();
  const group = document.getElementById('sidebar-skills-group');
  if (group) group.open = Boolean(activeSkillId);
  setupSidebarSkillsViewLink();

  const baseCategories = typeof getSkillCategories === 'function'
    ? getSkillCategories()
    : ['Foco e Aprendizagem', 'Estudantes', 'Pesquisa', 'Escrita', 'Produtividade', 'Negocios', 'Desenvolvimento', 'Espiritualidade'];
  const categories = Array.from(new Set([
    ...baseCategories,
    ...QUICK_SKILLS.map(skill => skill.category || 'Personalizadas')
  ]));
  sidebar.innerHTML = categories.map(category => {
    const skills = QUICK_SKILLS.filter(skill => skill.category === category);
    if (!skills.length) return '';
    const isOpen = skills.some(skill => skill.id === activeSkillId);
    return `
      <details class="skill-category"${isOpen ? ' open' : ''}>
        <summary><i class="ti ti-chevron-right" aria-hidden="true"></i>${escapeHtml(category)}</summary>
        <div class="skill-category-models">
          ${skills.map(skill => `
            <div class="sidebar-btn skill-btn${activeSkillId === skill.id ? ' active' : ''}" onclick="startSkillChat('${skill.id}')">
              <i class="ti ${skill.icon}" aria-hidden="true"></i> ${escapeHtml(skill.name)}
            </div>
          `).join('')}
        </div>
      </details>`;
  }).join('');
}

export function setupSidebarSkillsViewLink() {
  const showSkillsView = window.showSkillsView || (async () => {});
  const group = document.getElementById('sidebar-skills-group');
  const summary = group?.querySelector('.sidebar-summary');
  if (!summary) return;

  summary.dataset.view = 'skills';
  if (summary.dataset.skillsViewBound === 'true') return;

  summary.dataset.skillsViewBound = 'true';
  summary.addEventListener('click', () => {
    setTimeout(() => {
      showSkillsView().catch(error => console.error('Erro ao abrir Skills:', error));
    }, 0);
  });
}
