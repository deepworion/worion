/**
 * @module ui/sidebar/sidebar-projects
 * @description Renderização de projetos na sidebar
 * @dependencies utils
 * @exports renderSidebarProjects
 */

export function renderSidebarProjects() {
  const escapeHtml = window.escapeHtml || (s => s);
  const projects = window.projects || [];
  const currentProjectContext = window.currentProjectContext;
  const sidebar = document.getElementById('sidebar-projects');
  if (!sidebar) return;
  const visibleProjects = (projects || []).slice(0, 10);
  if (!visibleProjects.length) {
    sidebar.innerHTML = '<div class="sidebar-project-empty">Sem projetos ainda</div>';
    return;
  }
  sidebar.innerHTML = visibleProjects.map(project => `
    <div class="sidebar-project${currentProjectContext?.id === project.id ? ' active' : ''}" onclick="openProjectChat('${project.id}')">
      <i class="ti ti-folder" aria-hidden="true"></i>
      <span>${escapeHtml(project.name || project.title || 'Projeto')}</span>
    </div>
  `).join('');
}
