/**
 * @module ui/views/context-memory-storage
 * @description Persistência do Context Memory (localStorage)
 * @dependencies context-memory-constants
 * @exports loadContextMemorySelection, saveContextMemorySelection, loadContextMemoryAuditTrail, saveContextMemoryAuditTrail, loadContextMemoryCache, saveContextMemoryCache, recordContextMemorySelectionEvent, getContextMemoryUserId
 */

import {
  CONTEXT_MEMORY_SELECTION_KEY,
  CONTEXT_MEMORY_AUDIT_KEY,
  CONTEXT_MEMORY_CACHE_KEY,
  CONTEXT_MEMORY_EXTRACTION_MODE,
  contextMemoryState
} from './context-memory-constants.js';

export function loadContextMemorySelection() {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(CONTEXT_MEMORY_SELECTION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveContextMemorySelection() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CONTEXT_MEMORY_SELECTION_KEY, JSON.stringify([...contextMemoryState.selectedIds]));
}

export function loadContextMemoryAuditTrail() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONTEXT_MEMORY_AUDIT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveContextMemoryAuditTrail() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CONTEXT_MEMORY_AUDIT_KEY, JSON.stringify((contextMemoryState.auditTrail || []).slice(-200)));
}

export function loadContextMemoryCache() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONTEXT_MEMORY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveContextMemoryCache(snapshot = {}) {
  if (typeof localStorage === 'undefined') return;
  const cache = {
    version: 1,
    savedAt: new Date().toISOString(),
    cards: Array.isArray(snapshot.cards) ? snapshot.cards.map(card => ({
      id: card.id,
      slug: card.slug,
      type: card.type,
      title: card.title,
      source: card.source,
      summary: card.summary,
      content: card.content,
      updated: card.updated,
      sources: Array.isArray(card.sources) ? card.sources.map(source => ({
        id: source.id,
        title: source.title,
        source: source.source,
        summary: source.summary,
        content: source.content,
        updated: source.updated,
        excerptHash: source.excerptHash || null
      })) : [],
      keywords: Array.isArray(card.keywords) ? card.keywords : [],
      raw: card.raw ? {
        topicId: card.raw.topicId || null,
        sourceCount: card.raw.sourceCount || null,
        fallback: Boolean(card.raw.fallback)
      } : {}
    })) : [],
    sources: Array.isArray(snapshot.sources) ? snapshot.sources.map(source => ({
      id: source.id,
      type: source.type,
      title: source.title,
      source: source.source,
      summary: source.summary,
      content: source.content,
      updated: source.updated,
      conversationId: source.conversationId || null,
      messageIndex: source.messageIndex ?? null,
      chunkIndex: source.chunkIndex ?? null,
      excerptHash: source.excerptHash || null,
      origin: source.origin || ''
    })) : [],
    selectedIds: Array.isArray(snapshot.selectedIds) ? snapshot.selectedIds : [...contextMemoryState.selectedIds],
    extractionMode: snapshot.extractionMode || contextMemoryState.extractionMode || CONTEXT_MEMORY_EXTRACTION_MODE,
    supabaseSynced: Boolean(snapshot.supabaseSynced),
    lastLoadedAt: snapshot.lastLoadedAt || new Date().toISOString()
  };

  try {
    localStorage.setItem(CONTEXT_MEMORY_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[ContextMemory] cache local indisponivel:', error.message);
  }
}

export function recordContextMemorySelectionEvent(cardId, active, source = 'manual') {
  const makeId = window.makeId || ((prefix) => `${prefix}-${Date.now()}`);
  const card = contextMemoryState.cards.find(item => item.id === cardId);
  const entry = {
    id: makeId('ctx-audit'),
    cardId,
    cardTitle: card?.title || '',
    active: Boolean(active),
    source,
    mode: contextMemoryState.extractionMode || CONTEXT_MEMORY_EXTRACTION_MODE,
    timestamp: new Date().toISOString()
  };
  contextMemoryState.auditTrail = [...(contextMemoryState.auditTrail || []), entry].slice(-200);
  saveContextMemoryAuditTrail();
}

export function getContextMemoryUserId() {
  return 'local';
}
