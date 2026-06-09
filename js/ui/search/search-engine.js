/**
 * @module ui/search/search-engine
 * @description Motor de busca do Worion
 * @dependencies search-overlay, utils
 * @exports searchWorionContent, openSearchResult
 */

import { closeSearchOverlay } from './search-overlay.js';

export async function searchWorionContent(query) {
  const escapeHtml = window.escapeHtml || (s => s);
  const loadLocalConversations = window.loadLocalConversations || (async () => []);
  const loadLocalProjects = window.loadLocalProjects || (async () => []);
  const memorySearch = window.memorySearch || (async () => ({ results: [] }));
  const getWorionStatusLabel = window.getWorionStatusLabel;

  const area = document.getElementById('global-search-results');
  if (!area) return;
  const term = String(query || '').trim().toLowerCase();
  if (term.length < 2) {
    area.innerHTML = '<div class="search-empty">Digite pelo menos 2 caracteres.</div>';
    return;
  }

  area.innerHTML = `<div class="loading">${typeof getWorionStatusLabel === 'function' ? getWorionStatusLabel('sources') : 'Worion: buscando fontes externas...'}</div>`;
  const results = [];

  try {
    const localConversations = await loadLocalConversations();
    localConversations
      .filter(item => `${item.title} ${item.agentName}`.toLowerCase().includes(term))
      .slice(0, 12)
      .forEach(item => results.push({
        type: 'conversation',
        id: item.id,
        title: item.title,
        meta: `Conversa · ${item.agentName} · ${item.updated}`,
        icon: 'ti-message'
      }));
  } catch (error) {
    console.warn('[Search] conversas indisponiveis:', error.message);
  }

  try {
    const localProjects = await loadLocalProjects();
    localProjects
      .filter(item => `${item.title || item.name || ''} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase().includes(term))
      .slice(0, 12)
      .forEach(item => results.push({
        type: 'project',
        id: item.id,
        title: item.title || item.name || 'Projeto sem titulo',
        meta: `Projeto · ${item.description || 'sem descricao'}`,
        icon: 'ti-folder'
      }));
  } catch (error) {
    console.warn('[Search] projetos indisponiveis:', error.message);
  }

  try {
    const memory = await memorySearch(term, '', 8);
    (memory.results || []).forEach(item => results.push({
      type: 'memory',
      id: item.conversation_id,
      title: item.snippet || item.conversation_id,
      meta: `Memoria · ${item.source_id || 'worion'}`,
      icon: 'ti-database'
    }));
  } catch (error) {
    console.warn('[Search] memoria indisponivel:', error.message);
  }

  if (!results.length) {
    area.innerHTML = '<div class="search-empty">Nenhum resultado encontrado.</div>';
    return;
  }

  area.innerHTML = results.slice(0, 30).map(item => `
    <button class="search-result" onclick="openSearchResult('${item.type}','${escapeHtml(item.id)}')">
      <i class="ti ${item.icon}" aria-hidden="true"></i>
      <span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.meta)}</small>
      </span>
    </button>
  `).join('');
}

export async function openSearchResult(type, id) {
  const loadLocalProjects = window.loadLocalProjects || (async () => []);
  const openProjectChat = window.openProjectChat || (async () => {});
  const openConversation = window.openConversation || (async () => {});

  closeSearchOverlay();
  if (type === 'project') {
    window.projects = await loadLocalProjects();
    await openProjectChat(id);
    return;
  }
  await openConversation(id);
}
