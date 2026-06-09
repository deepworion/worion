/**
 * MÓDULO: utils.js
 * RESPONSABILIDADE: Funções utilitárias de formatação, conversão e normalização de dados
 * DEPENDÊNCIAS: nenhuma
 * EXPORTA: formatTime, formatDateTime, formatDuration, escapeHtml, slugifyFileName, makeId, makeProjectId, formatSessionDateTime, chunkText, maskSecret, getConversationPath, applyTypoCorrections, normalizeSearchText, TYPO_MAP
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: nenhum (módulo base independente)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// UTILS
// ============================================

function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days === 2) return 'Anteontem';
  if (days < 7) return `${days} dias atrás`;
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugifyFileName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'agente';
}

function makeId(prefix = 'chat') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeProjectId() {
  return 'proj_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatSessionDateTime(date) {
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function chunkText(text, size = 1800) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 10) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function getConversationPath(id) {
  return path.join(CONVERSATIONS_DIR, `${id}.json`);
}

// ============================================
// TYPO CORRECTIONS
// ============================================

const TYPO_MAP = {
  'vc': 'você', 'pq': 'porque', 'tb': 'também', 'tbm': 'também',
  'q ': 'que ', 'mt ': 'muito ', 'mto': 'muito', 'tá': 'está',
  'to ': 'estou ', 'to.': 'estou.', 'ta ': 'está ', 'nao': 'não',
  'nã': 'não', 'entao': 'então', 'voce': 'você', 'obg': 'obrigado',
  'blz': 'beleza', 'tudo bem?': 'tudo bem?', 'tmb': 'também',
  'tdha': 'TDAH'
};

function applyTypoCorrections(text) {
  let result = text;
  for (const [wrong, right] of Object.entries(TYPO_MAP)) {
    const re = new RegExp(`\\b${wrong}\\b`, 'gi');
    result = result.replace(re, (match) => {
      if (match[0] === match[0].toUpperCase()) return right.charAt(0).toUpperCase() + right.slice(1);
      return right;
    });
  }
  return result;
}

function getTypoContextDictionary() {
  return [
    'agente', 'agentes', 'skill', 'skills', 'prompt', 'contexto', 'memoria', 'memória',
    'conversa', 'conversas', 'conteudo', 'conteúdo', 'documento', 'documentos', 'arquivo',
    'arquivos', 'pesquisa', 'pesquisar', 'roteamento', 'resposta', 'responder', 'worion',
    'supabase', 'notion', 'brave', 'tavily', 'google', 'modelo', 'router', 'execucao',
    'execução', 'objetivo', 'implementado', 'formatação', 'formatação', 'usuario', 'usuário',
    'preferencias', 'preferências', 'continuidade', 'comportamento', 'aprendizagem',
    'profunda', 'reflexivo', 'diario', 'diário', 'semantica', 'semântica', 'corretor',
    'upload', 'uploads', 'anexo', 'anexos', 'cards', 'fontes', 'vinculadas', 'carregar'
  ];
}

function getEditDistance(a = '', b = '') {
  const left = String(a || '');
  const right = String(b || '');
  if (Math.abs(left.length - right.length) > 2) return 99;
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i++) dp[i][0] = i;
  for (let j = 0; j <= right.length; j++) dp[0][j] = j;
  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[left.length][right.length];
}

function findSemanticTypoSuggestion(word = '', context = '') {
  const normalized = normalizeSearchText(word);
  if (normalized.length < 5) return '';
  const contextText = normalizeSearchText(context);
  const candidates = getTypoContextDictionary()
    .filter(candidate => Math.abs(normalizeSearchText(candidate).length - normalized.length) <= 2)
    .map(candidate => {
      const candidateNorm = normalizeSearchText(candidate);
      const distance = getEditDistance(normalized, candidateNorm);
      const contextBoost = contextText.includes(candidateNorm) ? -0.35 : 0;
      return { candidate, score: distance + contextBoost };
    })
    .filter(item => item.score <= (normalized.length <= 6 ? 1 : 2))
    .sort((a, b) => a.score - b.score);
  return candidates[0]?.candidate || '';
}

function applyTypoCorrections(text) {
  const sourceText = String(text || '');
  const exactWordMap = new Map([
    ['vc', 'você'],
    ['pq', 'porque'],
    ['tb', 'também'],
    ['tbm', 'também'],
    ['mto', 'muito'],
    ['tá', 'está'],
    ['ta', 'está'],
    ['to', 'estou'],
    ['nao', 'não'],
    ['nã', 'não'],
    ['entao', 'então'],
    ['voce', 'você'],
    ['obg', 'obrigado'],
    ['blz', 'beleza'],
    ['tmb', 'também'],
    ['tdha', 'TDAH'],
    ['tdah', 'TDAH'],
    ['usabdo', 'usando'],
    ['conersas', 'conversas'],
    ['conersa', 'conversa'],
    ['onjetivo', 'objetivo'],
    ['cardas', 'cards'],
    ['conteudo', 'conteúdo'],
    ['implemntado', 'implementado'],
    ['implementaçao', 'implementação'],
    ['semantica', 'semântica'],
    ['preferencias', 'preferências'],
    ['execucao', 'execução'],
    ['documentacao', 'documentação'],
    ['adocao', 'adoção']
  ]);

  const preserveCase = (source, replacement) => {
    if (!source) return replacement;
    if (source === source.toUpperCase()) return replacement.toUpperCase();
    if (source[0] === source[0].toUpperCase()) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    return replacement;
  };

  return sourceText.replace(/\p{L}[\p{L}\p{M}]*/gu, (word) => {
    const normalized = word.toLowerCase();
    const replacement = exactWordMap.get(normalized) || findSemanticTypoSuggestion(word, sourceText);
    return replacement ? preserveCase(word, replacement) : word;
  });
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanGenericAssistantEnding(text) {
  if (!text) return text;
  const endings = [
    /\n?\n?Se precisar de mais informa\u00e7\u00f5es[^.]*\./gi,
    /\n?\n?Se precisar de mais detalhes[^.]*\./gi,
    /\n?\n?Posso ajudar com mais alguma coisa\??$/gi,
    /\n?\n?Caso queira, posso[^.]*\./gi,
    /\n?\n?Se quiser, posso[^.]*\./gi,
    /\n?\n?Me avise se precisar[^.]*\./gi,
    /\n?\n?Estou \u00e0 disposi\u00e7\u00e3o[^.]*\./gi,
    /\n?\n?Se tiver mais d\u00favidas[^.]*\./gi
  ];
  return endings.reduce((acc, regex) => acc.replace(regex, '').trim(), text);
}
