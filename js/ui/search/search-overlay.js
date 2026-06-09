/**
 * @module ui/search/search-overlay
 * @description Overlay de busca global
 * @dependencies Nenhuma
 * @exports openSearchOverlay, closeSearchOverlay
 */

export function openSearchOverlay() {
  closeSearchOverlay();
  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.id = 'search-overlay';
  overlay.innerHTML = `
    <div class="search-card" onclick="event.stopPropagation()">
      <div class="search-card-header">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input id="global-search-input" placeholder="Pesquisar conversas, projetos e memorias..." oninput="searchWorionContent(this.value)" autofocus>
        <button class="panel-close" onclick="closeSearchOverlay()"><i class="ti ti-x"></i></button>
      </div>
      <div id="global-search-results" class="search-results">
        <div class="search-empty">Digite para pesquisar no Worion.</div>
      </div>
    </div>`;
  overlay.addEventListener('click', closeSearchOverlay);
  document.body.appendChild(overlay);
  if (window.setActiveView) window.setActiveView('search');
  setTimeout(() => document.getElementById('global-search-input')?.focus(), 20);
}

export function closeSearchOverlay() {
  document.getElementById('search-overlay')?.remove();
}
