/**
 * uberworion-classifier.js
 * ---------------------------------------------------------------------------
 * UberWorion Classifier — Classificação semântica multi-gaveta de segmentos.
 *
 * Responsável por analisar segmentos de texto e determinar quais contextos
 * (gavetas) são mais relevantes usando similaridade de cosseno entre embeddings.
 *
 * Arquitetura:
 *   1. Recebe texto de um segmento
 *   2. Gera embedding do texto via OpenAI text-embedding-3-small (1536 dims)
 *   3. Busca contextos similares no Supabase usando pgvector (<=> cosine similarity)
 *   4. Retorna array de context_ids ranqueados por relevância
 *
 * Integração:
 *   - Usa mesmo padrão offline-first do universal-writer.js
 *   - Pode ser chamado durante ingestão ou post-processamento
 *   - Graceful degradation se OpenAI/Supabase indisponíveis
 *
 * @module uberworion-classifier
 */

'use strict';

// ---------------------------------------------------------------------------
// Configuração / Constantes
// ---------------------------------------------------------------------------

/** Modelo de embedding usado (deve ser o mesmo dos contextos) */
const EMBEDDING_MODEL = 'text-embedding-3-small';

/** Dimensões do embedding */
const EMBEDDING_DIMENSIONS = 1536;

/** Número padrão de contextos a retornar */
const DEFAULT_TOP_K = 3;

/** Threshold mínimo de similaridade (0-1, sendo 1 = idêntico) */
const MIN_SIMILARITY_THRESHOLD = 0.3;

/** Tabela do Supabase com os contextos e seus embeddings */
const CONTEXTS_TABLE = 'memory_contexts';

// ---------------------------------------------------------------------------
// Logging helper
// ---------------------------------------------------------------------------

/**
 * Logger leve com prefixo padronizado.
 * @param {string} level - 'info' | 'warn' | 'error' | 'debug'
 * @param {string} message - Mensagem principal.
 * @param {...*} args - Argumentos adicionais.
 * @returns {void}
 */
function log(level, message, ...args) {
  const prefix = '[uberworion-classifier]';
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
      ? console.warn
      : console.log;
  fn(`${prefix} ${message}`, ...args);
}

// ---------------------------------------------------------------------------
// Clientes externos (lazy initialization)
// ---------------------------------------------------------------------------

/**
 * Cliente OpenAI memoizado.
 * @type {import('openai').OpenAI | null | undefined}
 */
let _openaiClient;

/**
 * Cliente Supabase memoizado.
 * @type {import('@supabase/supabase-js').SupabaseClient | null | undefined}
 */
let _supabaseClient;

/**
 * Obtém (de forma preguiçosa e tolerante a falhas) o client OpenAI.
 * Busca a chave da Supabase Vault se não estiver em process.env
 *
 * @returns {Promise<import('openai').OpenAI | null>}
 */
async function getOpenAIClient() {
  if (_openaiClient !== undefined) return _openaiClient;

  try {
    let apiKey = process.env.OPENAI_API_KEY;

    // Se não tiver no .env, buscar da Vault
    if (!apiKey) {
      try {
        // eslint-disable-next-line global-require
        const { getModelKey } = require('./vault-helper.js');
        apiKey = await getModelKey('openai');
      } catch (vaultErr) {
        log('warn', 'Falha ao buscar chave da Vault:', vaultErr.message);
      }
    }

    if (!apiKey) {
      log('warn', 'OPENAI_API_KEY não configurada (nem em .env nem na Vault). Classificação indisponível.');
      _openaiClient = null;
      return _openaiClient;
    }

    // eslint-disable-next-line global-require
    const { OpenAI } = require('openai');
    _openaiClient = new OpenAI({ apiKey });
    log('info', 'Cliente OpenAI inicializado.');
  } catch (err) {
    log('warn', 'Falha ao inicializar OpenAI:', err.message);
    _openaiClient = null;
  }

  return _openaiClient;
}

/**
 * Obtém (de forma preguiçosa e tolerante a falhas) o client Supabase.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
function getSupabaseClient() {
  if (_supabaseClient !== undefined) return _supabaseClient;

  try {
    const url = process.env.WORION_MEMORY_SUPABASE_URL || process.env.SUPABASE_URL;
    const key =
      process.env.WORION_MEMORY_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      log('warn', 'Supabase não configurado. Classificação offline.');
      _supabaseClient = null;
      return _supabaseClient;
    }

    // eslint-disable-next-line global-require
    const { createClient } = require('@supabase/supabase-js');
    _supabaseClient = createClient(url, key, {
      auth: { persistSession: false },
    });
    log('info', 'Cliente Supabase inicializado.');
  } catch (err) {
    log('warn', 'Falha ao inicializar Supabase:', err.message);
    _supabaseClient = null;
  }

  return _supabaseClient;
}

// ---------------------------------------------------------------------------
// Geração de embedding
// ---------------------------------------------------------------------------

/**
 * Gera embedding de um texto usando OpenAI text-embedding-3-small.
 *
 * @param {string} text - Texto a ser vetorizado (máx ~8000 tokens).
 * @returns {Promise<number[] | null>} Vetor de 1536 dimensões ou null se falhar.
 */
async function generateEmbedding(text) {
  const client = await getOpenAIClient();
  if (!client) {
    log('warn', 'OpenAI indisponível, não foi possível gerar embedding.');
    return null;
  }

  try {
    // Limitar texto para evitar erro de token limit
    const truncated = String(text || '').slice(0, 32000); // ~8k tokens

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
      encoding_format: 'float',
    });

    if (!response.data || response.data.length === 0) {
      log('error', 'Resposta vazia da OpenAI embeddings API.');
      return null;
    }

    const embedding = response.data[0].embedding;

    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      log('error', `Embedding inválido: esperado array[${EMBEDDING_DIMENSIONS}], recebido ${typeof embedding}`);
      return null;
    }

    return embedding;
  } catch (err) {
    log('error', 'Erro ao gerar embedding:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Busca de contextos similares
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ContextMatch
 * @property {string} id - UUID do contexto.
 * @property {string} title - Título do contexto.
 * @property {string} domain - Domínio do contexto.
 * @property {number} similarity - Score de similaridade (0-1, sendo 1 = idêntico).
 */

/**
 * Busca contextos similares usando cosine similarity no pgvector.
 *
 * Usa o operador `<=>` (cosine distance) do pgvector. Quanto menor a distância,
 * maior a similaridade. Converte para score: similarity = 1 - distance.
 *
 * @param {number[]} embedding - Embedding de 1536 dimensões.
 * @param {Object} [options] - Opções de busca.
 * @param {number} [options.topK=3] - Número máximo de contextos a retornar.
 * @param {number} [options.minSimilarity=0.3] - Threshold mínimo de similaridade.
 * @returns {Promise<ContextMatch[]>} Lista de contextos ranqueados por similaridade.
 */
async function findSimilarContexts(embedding, options = {}) {
  const client = getSupabaseClient();
  if (!client) {
    log('warn', 'Supabase indisponível, retornando lista vazia de contextos.');
    return [];
  }

  const topK = Math.max(1, Math.min(Number(options.topK) || DEFAULT_TOP_K, 10));
  const minSimilarity = Number(options.minSimilarity) || MIN_SIMILARITY_THRESHOLD;

  try {
    // Query usando cosine distance (<=>)
    // A função RPC já converte distance para similarity: 1 - (embedding <=> query)
    // Portanto, enviamos o threshold de similaridade diretamente
    const { data, error } = await client.rpc('search_similar_contexts', {
      query_embedding: embedding,
      match_threshold: minSimilarity, // threshold de similaridade (0-1)
      match_count: topK,
    });

    if (error) {
      // Se a função RPC não existir, fallback para query direta
      if (error.code === '42883' || error.message.includes('does not exist')) {
        log('warn', 'Função search_similar_contexts não encontrada, usando query direta.');
        return await findSimilarContextsDirect(embedding, { topK, minSimilarity });
      }
      throw error;
    }

    if (!data || data.length === 0) {
      log('info', 'Nenhum contexto similar encontrado (threshold muito alto?)');
      return [];
    }

    // Mapear resultado
    const matches = data.map((row) => ({
      id: row.id,
      title: row.title || 'Sem título',
      domain: row.domain || 'unknown',
      similarity: row.similarity || 0,
    }));

    log('debug', `Encontrados ${matches.length} contextos similares (topK=${topK}).`);
    return matches;
  } catch (err) {
    log('error', 'Erro ao buscar contextos similares:', err.message);
    // Tentar fallback
    return await findSimilarContextsDirect(embedding, { topK, minSimilarity });
  }
}

/**
 * Fallback: busca direta sem função RPC (para compatibilidade).
 *
 * @param {number[]} embedding - Embedding de 1536 dimensões.
 * @param {Object} options - Opções de busca.
 * @param {number} options.topK - Número de contextos.
 * @param {number} options.minSimilarity - Threshold mínimo.
 * @returns {Promise<ContextMatch[]>}
 */
async function findSimilarContextsDirect(embedding, options) {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    // Query direta com ORDER BY embedding <=> query_embedding
    const embeddingStr = `[${embedding.join(',')}]`;

    const { data, error } = await client
      .from(CONTEXTS_TABLE)
      .select('id, title, domain, embedding')
      .not('embedding', 'is', null)
      .limit(options.topK * 2); // Buscar mais para filtrar depois

    if (error) throw error;

    if (!data || data.length === 0) {
      log('info', 'Nenhum contexto com embedding encontrado.');
      return [];
    }

    // Calcular cosine similarity manualmente
    const matches = data
      .map((row) => {
        const similarity = cosineSimilarity(embedding, row.embedding);
        return {
          id: row.id,
          title: row.title || 'Sem título',
          domain: row.domain || 'unknown',
          similarity,
        };
      })
      .filter((m) => m.similarity >= options.minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.topK);

    log('debug', `Busca direta retornou ${matches.length} contextos.`);
    return matches;
  } catch (err) {
    log('error', 'Erro na busca direta de contextos:', err.message);
    return [];
  }
}

/**
 * Calcula similaridade de cosseno entre dois vetores.
 *
 * @param {number[]} a - Primeiro vetor.
 * @param {number[]} b - Segundo vetor.
 * @returns {number} Similaridade (0-1).
 */
function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ClassificationResult
 * @property {boolean} success - Se a classificação foi bem-sucedida.
 * @property {ContextMatch[]} contexts - Lista de contextos ranqueados.
 * @property {string[]} contextIds - Array de IDs dos contextos (para compatibilidade).
 * @property {string} [reason] - Motivo de falha (se success = false).
 * @property {number} durationMs - Duração da operação.
 */

/**
 * Classifica um segmento de texto em múltiplos contextos usando similaridade
 * de cosseno entre embeddings.
 *
 * Pipeline:
 *   1. Gera embedding do texto usando OpenAI
 *   2. Busca contextos similares no Supabase (pgvector cosine similarity)
 *   3. Retorna top-K contextos mais relevantes
 *
 * @param {string} text - Texto do segmento a classificar.
 * @param {Object} [options] - Opções de classificação.
 * @param {number} [options.topK=3] - Número de contextos a retornar.
 * @param {number} [options.minSimilarity=0.3] - Threshold mínimo de similaridade.
 * @returns {Promise<ClassificationResult>} Resultado da classificação.
 *
 * @example
 *   const result = await classifySegment('Discussão sobre TDAH e rotina matinal');
 *   if (result.success) {
 *     console.log('Contextos:', result.contexts);
 *     console.log('IDs:', result.contextIds);
 *   }
 */
async function classifySegment(text, options = {}) {
  const startedAt = Date.now();

  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      success: false,
      contexts: [],
      contextIds: [],
      reason: 'Texto vazio ou inválido',
      durationMs: Date.now() - startedAt,
    };
  }

  log('info', `Classificando segmento (${text.length} chars)...`);

  // Passo 1: Gerar embedding
  const embedding = await generateEmbedding(text);
  if (!embedding) {
    return {
      success: false,
      contexts: [],
      contextIds: [],
      reason: 'Falha ao gerar embedding (OpenAI indisponível)',
      durationMs: Date.now() - startedAt,
    };
  }

  log('debug', 'Embedding gerado com sucesso.');

  // Passo 2: Buscar contextos similares
  const contexts = await findSimilarContexts(embedding, options);

  if (contexts.length === 0) {
    log('warn', 'Nenhum contexto similar encontrado.');
    return {
      success: true, // Sucesso técnico, mas sem matches
      contexts: [],
      contextIds: [],
      reason: 'Nenhum contexto acima do threshold de similaridade',
      durationMs: Date.now() - startedAt,
    };
  }

  // Extrair apenas IDs para compatibilidade com universal-writer
  const contextIds = contexts.map((c) => c.id);

  const durationMs = Date.now() - startedAt;
  log('info', `Classificação concluída: ${contexts.length} contextos (${durationMs}ms).`);

  return {
    success: true,
    contexts,
    contextIds,
    durationMs,
  };
}

/**
 * Classifica múltiplos segmentos em batch (mais eficiente que múltiplas chamadas).
 *
 * @param {string[]} texts - Array de textos a classificar.
 * @param {Object} [options] - Opções de classificação.
 * @returns {Promise<ClassificationResult[]>} Array de resultados.
 *
 * @example
 *   const results = await classifyBatch(['texto 1', 'texto 2']);
 */
async function classifyBatch(texts, options = {}) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  log('info', `Classificando batch de ${texts.length} segmentos...`);

  // TODO: Implementar batching real na OpenAI API (aceita array de inputs)
  // Por enquanto, processa sequencialmente
  const results = [];
  for (const text of texts) {
    const result = await classifySegment(text, options);
    results.push(result);

    // Rate limiting simples
    if (results.length < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  log('info', `Batch concluído: ${results.filter((r) => r.success).length}/${texts.length} sucessos.`);
  return results;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // API pública
  classifySegment,
  classifyBatch,

  // Utilitários expostos para testes
  generateEmbedding,
  findSimilarContexts,
  cosineSimilarity,

  // Constantes
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  DEFAULT_TOP_K,
  MIN_SIMILARITY_THRESHOLD,
};
