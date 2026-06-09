/**
 * @module ui/memory-cards/memory-cards-view
 * @description Renderização da view Memory Cards V2
 * @dependencies utils
 * @exports renderMemoryCardsView, renderMemoryCardsGrid, filterMemoryCards, memoryV2HeaderLabel, showMemoryLoading, renderMemoryTabs
 */

export function filterMemoryCards() {
  const memoryCardsActiveTab = window.memoryCardsActiveTab || 'contexts';
  const memoryCardsQuery = window.memoryCardsQuery || '';
  const memoryCardsActiveFilter = window.memoryCardsActiveFilter || 'all';
  const memoryCardsV2 = window.memoryCardsV2 || [];
  const memoryFilesV2 = window.memoryFilesV2 || [];
  const memoryLegacyRows = window.memoryLegacyRows || [];
  const memoryContextsV2 = window.memoryContextsV2 || [];

  const query = memoryCardsQuery.trim().toLowerCase();
  window.memoryCards = memoryCardsActiveTab === 'cards'
    ? memoryCardsV2
    : memoryCardsActiveTab === 'files'
      ? [...memoryFilesV2, ...memoryLegacyRows]
      : memoryContextsV2;
  window.memoryCardsFiltered = window.memoryCards.filter(card => {
    const matchesQuery = !query || [card.title, card.desc, card.context, card.cat].join(' ').toLowerCase().includes(query);
    const matchesFilter = memoryCardsActiveFilter === 'all' || String(card.status || '').toLowerCase() === memoryCardsActiveFilter;
    return matchesQuery && matchesFilter;
  });
}

export function memoryV2HeaderLabel() {
  const memoryContextsV2 = window.memoryContextsV2 || [];
  const memoryCardsV2 = window.memoryCardsV2 || [];
  const memoryFilesV2 = window.memoryFilesV2 || [];
  const contextCount = memoryContextsV2.length;
  const cardCount = memoryCardsV2.length;
  const fileCount = memoryFilesV2.length;
  return `${contextCount} contextos · ${cardCount} cards V2 · ${fileCount} arquivos · Supabase`;
}

export function showMemoryLoading(message = 'Carregando Memory Cards...') {
  const escapeHtml = window.escapeHtml || (s => s);
  const main = document.getElementById('main');
  if (!main) return;
  main.innerHTML = `
    <div class="memory-loading-view">
      <div class="loading-spinner"></div>
      <strong>${escapeHtml(message)}</strong>
      <span>Consultando Supabase e preparando a interface.</span>
    </div>`;
}

export function renderMemoryTabs() {
  const escapeHtml = window.escapeHtml || (s => s);
  const memoryCardsActiveTab = window.memoryCardsActiveTab || 'contexts';
  const memoryContextsV2 = window.memoryContextsV2 || [];
  const memoryCardsV2 = window.memoryCardsV2 || [];
  const memoryFilesV2 = window.memoryFilesV2 || [];
  const memoryLegacyRows = window.memoryLegacyRows || [];
  const showDebug = new URLSearchParams(window.location.search).has('debug');

  const tabs = [
    ['contexts', 'Contextos', memoryContextsV2.length],
    ['cards', 'Cards V2', memoryCardsV2.length],
    ['files', 'Fontes/Legado', memoryFilesV2.length + memoryLegacyRows.length]
  ];
  if (showDebug) {
    tabs.push(['audit', 'Debug', null]);
  }
  return tabs.map(([key, label, count]) => `
    <button class="memory-tab ${memoryCardsActiveTab === key ? 'active' : ''}" onclick="setMemoryCardsTab('${key}')">
      ${escapeHtml(label)}${count === null ? '' : ` <span>${count}</span>`}
    </button>`).join('');
}

export function renderMemoryCardsView() {
  const setActiveView = window.setActiveView || (() => {});
  const memoryCardsViewReady = window.memoryCardsViewReady;
  const memoryCardsChatCardId = window.memoryCardsChatCardId;
  const renderMemoryCardsGrid = window.renderMemoryCardsGrid || (() => {});
  const renderMemoryChatPanel = window.renderMemoryChatPanel || (() => {});

  const main = document.getElementById('main');
  const panel = document.getElementById('detail-panel');
  if (!main) return;
  setActiveView('connections');

  if (!memoryCardsViewReady) {
    main.innerHTML = `
      <div class="main-header page-header memory-page-header">
        <div>
          <h1 class="main-title page-title">Memory Cards</h1>
        </div>
      </div>
      <div class="memory-tabs" id="memory-tabs">${renderMemoryTabs()}</div>
      <div class="memory-layout">
        <section class="memory-grid-wrap">
          <div id="memory-cards-grid" class="memory-cards-grid"></div>
          <div id="memory-empty-state" class="memory-empty-state hidden">
            <i class="ti ti-cards"></i>
            <h3>Nenhum item nesta aba.</h3>
            <p>Importe uma conversa ou sincronize os contextos do Supabase.</p>
          </div>
          <div class="memory-footer">
            <div class="memory-search-footer">
              <i class="ti ti-search"></i>
              <input id="memory-search-input" type="text" placeholder="Pesquisar..." oninput="updateMemoryCardsQuery(this.value)">
            </div>
            <span id="memory-count-label">0 cards encontrados</span>
            <a href="?debug=true" class="memory-debug-link" title="Ver status técnico">Debug</a>
          </div>
        </section>
        <aside id="memory-chat-panel" class="memory-chat-panel hidden"></aside>
      </div>`;
    window.memoryCardsViewReady = true;
  }

  if (!memoryCardsChatCardId && panel) panel.style.display = 'none';
  const headerLabel = document.getElementById('memory-v2-header-label');
  if (headerLabel) headerLabel.textContent = memoryV2HeaderLabel();
  const tabs = document.getElementById('memory-tabs');
  if (tabs) tabs.innerHTML = renderMemoryTabs();
  document.querySelector('.memory-layout')?.classList.toggle('chat-open', Boolean(memoryCardsChatCardId));
  renderMemoryCardsGrid();
  renderMemoryChatPanel();
}

export function renderMemoryCardsGrid() {
  const renderMemoryAuditTab = window.renderMemoryAuditTab || (() => {});
  const renderMemoryCardsList = window.renderMemoryCardsList || (() => '');
  const memoryCardsActiveTab = window.memoryCardsActiveTab || 'contexts';
  const memoryCardsFiltered = window.memoryCardsFiltered || [];

  if (memoryCardsActiveTab === 'audit') {
    renderMemoryAuditTab();
    return;
  }

  filterMemoryCards();
  const grid = document.getElementById('memory-cards-grid');
  const empty = document.getElementById('memory-empty-state');
  const count = document.getElementById('memory-count-label');
  if (!grid) return;

  if (count) {
    const label = memoryCardsActiveTab === 'cards' ? 'cards V2'
      : memoryCardsActiveTab === 'files' ? 'fontes'
      : 'contextos';
    count.textContent = `${memoryCardsFiltered.length} ${label} encontrados`;
  }

  if (!memoryCardsFiltered.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  grid.innerHTML = renderMemoryCardsList();
}
