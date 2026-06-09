/**
 * @module ui/utils/ui-formatters
 * @description Funções de formatação de dados para UI
 * @dependencies Nenhuma
 * @exports formatMemoryDate, normalizeSummaryText, capitalize
 */

// ============================================
// FORMATAÇÃO DE DATAS
// ============================================

/**
 * Formata data para exibição em português
 * @param {string|Date} value - Data para formatar
 * @returns {string} Data formatada ou string vazia
 */
export function formatMemoryDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('pt-BR');
}

// ============================================
// FORMATAÇÃO DE TEXTO
// ============================================

/**
 * Normaliza texto de resumo para exibição
 * @param {string} text - Texto para normalizar
 * @returns {string} Texto normalizado e truncado
 */
export function normalizeSummaryText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

/**
 * Capitaliza primeira letra de uma string
 * @param {string} text - Texto para capitalizar
 * @returns {string} Texto capitalizado
 */
export function capitalize(text) {
  const value = String(text || '');
  return value.charAt(0).toUpperCase() + value.slice(1);
}
