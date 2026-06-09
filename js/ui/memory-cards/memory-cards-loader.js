/**
 * @module ui/memory-cards/memory-cards-loader
 * @description Carregamento de Memory Cards V2 do Supabase
 * @dependencies memory-cards-normalizers
 * @exports loadMemoryCards, loadMemoryContextCatalog
 */

import { normalizeMemoryLegacyRows, hydrateMemoryContextsAndCards } from './memory-cards-normalizers.js';

export async function loadMemoryCards() {
  const dedupeMemoryCards = window.dedupeMemoryCards || (items => items);
  const normalizeMemoryCardV2 = window.normalizeMemoryCardV2 || (items => items);
  const normalizeMemoryContextV2 = window.normalizeMemoryContextV2 || (items => items);
  const normalizeMemoryFilesV2 = window.normalizeMemoryFilesV2 || (items => items);

  if (!window.memoryContextsSeededThisSession && typeof window.worionApiMemorySeedContexts === 'function') {
    try {
      await window.worionApiMemorySeedContexts();
      window.memoryContextsSeededThisSession = true;
    } catch (err) {
      console.warn('[MEMORY CARDS UX] failed to seed canonical contexts', err);
    }
  }

  let loadedContexts = [];
  let loadedCards = [];
  let loadedFiles = [];
  let loadedContextFiles = [];
  let loadedLegacy = [];

  try {
    if (typeof window.worionApiMemoryCards === 'function') {
      loadedCards = normalizeMemoryCardV2(await window.worionApiMemoryCards({ limit: 200, order: 'updated_at.desc' }));
    }
  } catch (err) {
    console.warn('[MEMORY CARDS UX] failed to load real cards', err);
  }

  if (typeof window.worionApiMemoryContexts === 'function') {
    try {
      loadedContexts = normalizeMemoryContextV2(await window.worionApiMemoryContexts({ limit: 200, order: 'updated_at.desc' }));
    } catch (err) {
      console.warn('[MEMORY CARDS UX] failed to load contexts', err);
    }
  }

  if (typeof window.worionApiMemoryFiles === 'function') {
    try {
      loadedFiles = normalizeMemoryFilesV2(await window.worionApiMemoryFiles({ limit: 200, order: 'updated_at.desc' }));
    } catch (err) {
      console.warn('[MEMORY CARDS UX] failed to load memory files', err);
    }
  }

  if (typeof window.worionApiMemoryContextFiles === 'function') {
    try {
      loadedContextFiles = await window.worionApiMemoryContextFiles({ limit: 400 });
    } catch (err) {
      console.warn('[MEMORY CARDS UX] failed to load context-file links', err);
    }
  }

  if (typeof window.worionApiMemoryLegacy === 'function') {
    try {
      loadedLegacy = await window.worionApiMemoryLegacy({ limit: 100 });
    } catch (err) {
      console.warn('[MEMORY CARDS UX] failed to load legacy cards', err);
    }
  }

  let memoryAuditState = null;
  try {
    if (typeof window.worionApiMemoryAudit === 'function') {
      memoryAuditState = await window.worionApiMemoryAudit();
    }
  } catch (err) {
    console.warn('[MEMORY CARDS UX] failed to load audit', err);
  }

  window.memoryFilesV2 = dedupeMemoryCards(loadedFiles);
  const hydrated = hydrateMemoryContextsAndCards(
    dedupeMemoryCards(loadedContexts),
    dedupeMemoryCards(loadedCards),
    window.memoryFilesV2,
    loadedContextFiles
  );

  // TAXONOMIA 2026-06-05: Filtrar contextos (somente active) e cards (somente com context_id em contexto active)
  const allContexts = hydrated.contexts;
  const allCards = hydrated.cards;
  const activeContexts = allContexts.filter(ctx => ctx.status === 'active');
  const activeContextIds = new Set(activeContexts.map(ctx => ctx.id));
  const activeCards = allCards.filter(card => card.contextId && activeContextIds.has(card.contextId));

  const archivedDraftCount = allContexts.length - activeContexts.length;
  const orphanCardsCount = allCards.filter(card => !card.contextId).length;
  const invalidContextCardsCount = allCards.filter(card => card.contextId && !activeContextIds.has(card.contextId)).length;

  window.memoryContextsV2 = activeContexts;
  window.memoryCardsV2 = activeCards;
  window.memoryLegacyRows = normalizeMemoryLegacyRows(loadedLegacy);
  window.memoryCards = window.memoryCardsActiveTab === 'cards'
    ? window.memoryCardsV2
    : window.memoryCardsActiveTab === 'files'
      ? [...window.memoryFilesV2, ...window.memoryLegacyRows]
      : window.memoryContextsV2;
  window.memoryCardsFiltered = [...window.memoryCards];

  console.log('[MEMORY RUNTIME] active contexts loaded:', activeContexts.length);
  console.log('[MEMORY RUNTIME] active cards loaded:', activeCards.length);
  console.log('[MEMORY RUNTIME] archived/draft contexts ignored:', archivedDraftCount);
  console.log('[MEMORY RUNTIME] orphan cards ignored:', orphanCardsCount);
  console.log('[MEMORY RUNTIME] cards with invalid context_id ignored:', invalidContextCardsCount);

  if (typeof window.renderMemoryCardsView === 'function') {
    window.renderMemoryCardsView();
  }
}

export async function loadMemoryContextCatalog() {
  try {
    if (typeof window.worionApiMemoryContexts === 'function') {
      const rows = await window.worionApiMemoryContexts({ limit: 200, order: 'updated_at.desc' });
      window.memoryContextCatalog = Array.isArray(rows) ? rows : [];
    }
  } catch (error) {
    console.warn('[MEMORY CARDS UX] failed to load context catalog', error);
  }
}
