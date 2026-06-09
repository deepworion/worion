/**
 * @module ui/utils/ui-helpers
 * @description Funções auxiliares para operações de UI
 * @dependencies ui-formatters
 * @exports hashString, hashContextMemoryText, dedupeByStableKey, normalizeContextMemoryText, makeContextMemoryChunks
 */

// ============================================
// CONSTANTES
// ============================================

const CONTEXT_MEMORY_CHUNK_SIZE = 3500;
const CONTEXT_MEMORY_CHUNK_OVERLAP = 350;

// ============================================
// FUNÇÕES DE HASH
// ============================================

/**
 * Gera hash simples de uma string
 * @param {string} value - String para hash
 * @returns {number} Hash numérico
 */
export function hashString(value) {
  let hash = 0;
  const str = String(value || '');
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Gera hash FNV-1a de texto de contexto
 * @param {string} text - Texto para hash
 * @returns {string} Hash em base36
 */
export function hashContextMemoryText(text) {
  let hash = 2166136261;
  const normalized = String(text || '');
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

// ============================================
// NORMALIZAÇÃO DE TEXTO
// ============================================

/**
 * Normaliza texto de contexto de memória
 * @param {string} text - Texto para normalizar
 * @returns {string} Texto normalizado
 */
export function normalizeContextMemoryText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[  ]+$/gm, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Limpa texto de conversa removendo metadados
 * @param {string} text - Texto para limpar
 * @returns {string} Texto limpo
 */
export function cleanContextMemoryConversationText(text) {
  let value = normalizeContextMemoryText(text);
  if (!value) return '';

  value = value
    .replace(/\r/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\bConversa:\s*([^[]+?)\s+Origem:\s*([^[]+?)(?=\s+\[(?:user|assistant|system)\s+\d+\])/gi, '')
    .replace(/(^|\n)\s*Conversa:\s*[^\n]*(?=\n|$)/gi, '\n')
    .replace(/(^|\n)\s*Origem:\s*[^\n]*(?=\n|$)/gi, '\n')
    .replace(/\[(?:user|assistant|system)\s+\d+\]\s*/gi, '\n\n')
    .replace(/\[(?:user|assistant|system)\]\s*/gi, '\n\n')
    .replace(/(^|\n)\s*Fontes vinculadas:\s*[\s\S]*?(?=\n\s*Sinais associados:|\n\s*Trechos recentes:|$)/gi, '\n')
    .replace(/(^|\n)\s*Sinais associados:\s*[\s\S]*?(?=\n\s*Trechos recentes:|$)/gi, '\n')
    .replace(/(^|\n)\s*Trechos recentes:\s*/gi, '\n')
    .replace(/^\s*[•-]\s+[^.\n]{0,180}\([^)]*\)\s*$/gm, '')
    .replace(/^\s*[•-]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return value;
}

// ============================================
// CHUNKING DE TEXTO
// ============================================

/**
 * Divide texto em chunks para processamento
 * @param {string} text - Texto para dividir
 * @returns {Array<string>} Array de chunks
 */
export function makeContextMemoryChunks(text) {
  const source = normalizeContextMemoryText(text);
  if (!source) return [];

  const chunks = [];
  let index = 0;

  while (index < source.length) {
    let end = Math.min(index + CONTEXT_MEMORY_CHUNK_SIZE, source.length);
    if (end < source.length) {
      const paragraphBreak = source.lastIndexOf('\n\n', end);
      const lineBreak = source.lastIndexOf('\n', end);
      const boundary = paragraphBreak > index + CONTEXT_MEMORY_CHUNK_SIZE * 0.6 ? paragraphBreak : lineBreak;
      if (boundary > index + CONTEXT_MEMORY_CHUNK_SIZE * 0.6) end = boundary;
    }

    const content = source.slice(index, end).trim();
    if (content) chunks.push(content);
    if (end >= source.length) break;
    index = Math.max(end - CONTEXT_MEMORY_CHUNK_OVERLAP, index + 1);
  }

  return chunks;
}

// ============================================
// DEDUPLICAÇÃO
// ============================================

/**
 * Remove duplicatas de array usando função de chave
 * @param {Array} items - Items para deduplicas
 * @param {Function} getKey - Função que retorna chave única
 * @returns {Array} Array sem duplicatas
 */
export function dedupeByStableKey(items, getKey) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = getKey(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values());
}

/**
 * Remove duplicatas de sources de contexto
 * @param {Array} sources - Sources para deduplicas
 * @returns {Array} Array sem duplicatas
 */
export function dedupeContextMemorySources(sources = []) {
  const seen = new Set();
  return sources.filter(source => {
    const key = String(source.excerptHash || source.id || source.title || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Remove duplicatas de memory cards
 * @param {Array} items - Cards para deduplicas
 * @returns {Array} Array sem duplicatas
 */
export function dedupeMemoryCards(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter(card => {
    const key = String(card.id || `${card.title}:${card.context || card.desc || ''}`).slice(0, 260);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
