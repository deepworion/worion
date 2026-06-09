/**
 * @module ui/memory-cards/memory-cards-normalizers
 * @description Normalizadores de dados para Memory Cards V2
 * @dependencies utils
 * @exports normalizeMemoryLegacyRows, hydrateMemoryContextsAndCards
 */

import { formatMemoryDate } from '../utils/ui-formatters.js';

export function normalizeMemoryLegacyRows(items) {
  return (Array.isArray(items) ? items : []).map(row => ({
    id: row.id || row.slug || row.card_id,
    title: row.title || row.name || 'Card legado V1',
    cat: row.domain || row.category || 'legado V1',
    date: formatMemoryDate(row.updated_at || row.created_at),
    status: 'legacy',
    score: 0,
    starred: false,
    desc: row.summary || row.description || row.content || '',
    context: row.content || row.summary || row.description || '',
    raw: row,
    kind: 'legacy'
  }));
}

export function hydrateMemoryContextsAndCards(contexts = [], cards = [], files = [], links = []) {
  const fileById = new Map((Array.isArray(files) ? files : []).map(file => [String(file.raw?.id || file.id), file]));
  const textByContextId = new Map();
  const sourceTitlesByContextId = new Map();

  (Array.isArray(links) ? links : []).forEach(link => {
    const contextId = String(link.context_id || '');
    const file = fileById.get(String(link.file_id || ''));
    const text = String(file?.context || file?.desc || '').trim();
    if (!contextId || !text) return;
    const current = textByContextId.get(contextId) || '';
    if (!current.includes(text.slice(0, 120))) {
      textByContextId.set(contextId, [current, text].filter(Boolean).join('\n\n---\n\n'));
    }
    const titles = sourceTitlesByContextId.get(contextId) || [];
    if (file?.title && !titles.includes(file.title)) titles.push(file.title);
    sourceTitlesByContextId.set(contextId, titles);
  });

  const hydratedContexts = contexts.map(context => {
    const linkedText = textByContextId.get(String(context.raw?.id || context.id)) || '';
    const sourceTitles = sourceTitlesByContextId.get(String(context.raw?.id || context.id)) || [];
    const contextText = linkedText || context.context || context.desc || '';
    return {
      ...context,
      desc: context.desc || contextText.replace(/\s+/g, ' ').slice(0, 220),
      context: contextText,
      sourceTitles
    };
  });

  const contextById = new Map(hydratedContexts.map(context => [String(context.raw?.id || context.id), context]));
  const hydratedCards = cards.map(card => {
    const contextId = card.contextId || card.context_id || card.raw?.context_id || '';
    const parent = contextById.get(String(contextId || ''));
    const cardText = card.context && card.context !== card.title ? card.context : '';
    const contextText = cardText || parent?.context || card.desc || '';
    return {
      ...card,
      contextId,
      context_id: contextId,
      sourceContext: parent || null,
      contextTitle: parent?.title || '',
      desc: card.desc || contextText.replace(/\s+/g, ' ').slice(0, 220),
      context: contextText,
      sourceTitles: parent?.sourceTitles || []
    };
  });

  return { contexts: hydratedContexts, cards: hydratedCards };
}
