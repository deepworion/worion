/**
 * MÓDULO: ambient-context.js
 * RESPONSABILIDADE: Contexto ambiental (hora, data, clima) para injeção no system prompt
 * DEPENDÊNCIAS: Nenhuma (standalone)
 * EXPORTA: getAmbientContext
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: prompt.js (consome o contexto ambiental)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// FORMATAÇÃO DE DATA E HORA
// ============================================

/**
 * Retorna hora atual no formato HH:MM
 * @returns {string}
 */
function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Retorna dia da semana em português
 * @returns {string}
 */
function getCurrentDayOfWeek() {
  const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  return days[new Date().getDay()];
}

/**
 * Retorna data no formato DD/MM/YYYY
 * @returns {string}
 */
function getCurrentDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

// ============================================
// CLIMA VIA WTTR.IN
// ============================================

/**
 * Busca clima via wttr.in (gratuito, sem API key)
 * @param {string} cidade - Nome da cidade
 * @returns {Promise<string|null>} Descrição do clima ou null se falhar
 */
async function fetchWeather(cidade) {
  if (!cidade || typeof cidade !== 'string') {
    return null;
  }

  const cityEncoded = encodeURIComponent(cidade.trim());
  const url = `https://wttr.in/${cityEncoded}?format=j1`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Worion/1.0' }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[AMBIENT CONTEXT] wttr.in retornou status:', response.status);
      return null;
    }

    const data = await response.json();

    const currentCondition = data?.current_condition?.[0];
    if (!currentCondition) {
      console.warn('[AMBIENT CONTEXT] wttr.in sem current_condition');
      return null;
    }

    const temp = currentCondition.temp_C;
    const weatherDesc = currentCondition.weatherDesc?.[0]?.value || 'céu limpo';

    if (!temp) {
      return null;
    }

    return `${temp}°C, ${weatherDesc.toLowerCase()}`;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('[AMBIENT CONTEXT] wttr.in timeout após 2s');
    } else {
      console.warn('[AMBIENT CONTEXT] erro ao buscar clima:', error.message);
    }
    return null;
  }
}

// ============================================
// CONTEXTO AMBIENTAL COMPLETO
// ============================================

/**
 * Retorna contexto ambiental completo
 * @param {string} cidade - Nome da cidade (opcional)
 * @returns {Promise<Object>} { hora, diaSemana, data, clima }
 */
async function getAmbientContext(cidade = '') {
  const hora = getCurrentTime();
  const diaSemana = getCurrentDayOfWeek();
  const data = getCurrentDate();

  let clima = null;
  if (cidade) {
    try {
      clima = await fetchWeather(cidade);
    } catch (error) {
      console.warn('[AMBIENT CONTEXT] falha ao buscar clima, continuando sem clima');
    }
  }

  return {
    hora,
    diaSemana,
    data,
    clima
  };
}

// ============================================
// EXPORTAÇÃO
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getAmbientContext };
}

if (typeof window !== 'undefined') {
  window.getAmbientContext = getAmbientContext;
}
