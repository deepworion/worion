#!/usr/bin/env node

/**
 * Process one incremental batch of memory_chunks into memory_conversation_segments.
 *
 * Hard limits:
 * - Processes at most 100 pending chunks per run.
 * - Keeps existing test segments.
 * - Skips chunks already present in segment metadata.original_chunk_id.
 * - Skips chunks whose conversation_id + chunk_index already exists as a segment.
 */

'use strict';

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { getModelKey } = require('../js/vault-helper.js');
const {
  generateEmbedding,
  findSimilarContexts,
  EMBEDDING_MODEL,
} = require('../js/uberworion-classifier.js');

const SUPABASE_URL = process.env.WORION_MEMORY_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.WORION_MEMORY_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const BATCH_SIZE = 500;
const PAGE_SIZE = 1000;
const TOP_K = 5;
const MIN_SIMILARITY = 0.2;
const EMBEDDING_COST_PER_1M_TOKENS_USD = 0.02;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[fatal] Supabase memory env missing: WORION_MEMORY_SUPABASE_URL and WORION_MEMORY_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const stats = {
  totalChunks: 0,
  alreadyProcessed: 0,
  pending: 0,
  attempted: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  totalTokens: 0,
  totalContexts: 0,
  startedAt: Date.now(),
  failures: [],
};

function log(message) {
  console.log(`[batch] ${message}`);
}

function tokenCount(text) {
  return Math.ceil(String(text || '').length / 4);
}

function keywordList(text, limit = 12) {
  const stop = new Set([
    'para', 'como', 'com', 'uma', 'que', 'por', 'dos', 'das', 'the', 'and',
    'you', 'from', 'this', 'that', 'de', 'do', 'da', 'em', 'um', 'ao', 'no',
    'na', 'os', 'as', 'se', 'or', 'is', 'to', 'of', 'in',
  ]);

  const counts = new Map();
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9_]{4,}/g)
    ?.forEach((word) => {
      if (!stop.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
    });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count || 0;
}

function segmentKey(conversationId, index) {
  return `${conversationId || ''}::${Number.isFinite(Number(index)) ? Number(index) : 0}`;
}

async function fetchProcessedSegmentKeys() {
  const chunkIds = new Set();
  const segmentKeys = new Set();

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('memory_conversation_segments')
      .select('conversation_id, segment_index, metadata')
      .range(from, to);

    if (error) throw new Error(`fetch processed segments: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      const id = row.metadata && row.metadata.original_chunk_id;
      if (id !== undefined && id !== null) chunkIds.add(String(id));
      if (row.conversation_id !== undefined && row.conversation_id !== null) {
        segmentKeys.add(segmentKey(row.conversation_id, row.segment_index));
      }
    }

    if (data.length < PAGE_SIZE) break;
  }

  return { chunkIds, segmentKeys };
}

async function fetchPendingChunks(processed) {
  const pending = [];

  for (let from = 0; pending.length < BATCH_SIZE; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('memory_chunks')
      .select('id, conversation_id, source_id, chunk_index, role, content, created_at')
      .order('created_at', { ascending: true })
      .order('chunk_index', { ascending: true })
      .range(from, to);

    if (error) throw new Error(`fetch memory_chunks: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const chunk of data) {
      if (processed.chunkIds.has(String(chunk.id))) continue;
      if (processed.segmentKeys.has(segmentKey(chunk.conversation_id, chunk.chunk_index))) {
        stats.skipped++;
        continue;
      }
      pending.push(chunk);
      if (pending.length >= BATCH_SIZE) break;
    }

    if (data.length < PAGE_SIZE) break;
  }

  return pending;
}

async function processChunk(chunk, batchIndex) {
  const prefix = `${batchIndex + 1}/${BATCH_SIZE}`;
  const startedAt = Date.now();
  const tokens = tokenCount(chunk.content);

  try {
    log(`${prefix} chunk_id=${chunk.id} stage=embedding tokens~${tokens}`);
    const embedding = await generateEmbedding(chunk.content);
    if (!embedding) throw new Error('embedding returned null');

    log(`${prefix} chunk_id=${chunk.id} stage=context_search`);
    const contexts = await findSimilarContexts(embedding, {
      topK: TOP_K,
      minSimilarity: MIN_SIMILARITY,
    });
    const contextIds = contexts.map((context) => context.id);

    log(`${prefix} chunk_id=${chunk.id} stage=insert contexts=${contextIds.length}`);
    const { data: segment, error } = await supabase
      .from('memory_conversation_segments')
      .insert({
        conversation_id: chunk.conversation_id,
        source_id: chunk.source_id,
        user_id: chunk.user_id || null,
        conversation_date: chunk.created_at,
        segment_index: Number.isFinite(Number(chunk.chunk_index)) ? Number(chunk.chunk_index) : 0,
        segment_title: String(chunk.content || '').slice(0, 100),
        segment_summary: String(chunk.content || '').slice(0, 500),
        content: chunk.content,
        keywords: keywordList(chunk.content),
        context_ids: contextIds,
        embedding,
        token_count: tokens,
        metadata: {
          original_chunk_id: chunk.id,
          original_chunk_index: chunk.chunk_index ?? null,
          original_role: chunk.role || null,
          processed_by: 'scripts/process-chunks-batch.js',
          processed_at: new Date().toISOString(),
          embedding_model: EMBEDDING_MODEL,
          match_threshold: MIN_SIMILARITY,
          contexts,
        },
      })
      .select('id')
      .single();

    if (error) throw new Error(`insert failed: ${error.message}`);

    const durationMs = Date.now() - startedAt;
    stats.success++;
    stats.totalTokens += tokens;
    stats.totalContexts += contextIds.length;
    log(`${prefix} ok chunk_id=${chunk.id} segment_id=${segment.id} contexts=${contextIds.length} ms=${durationMs}`);
  } catch (error) {
    stats.failed++;
    stats.failures.push({ chunk_id: chunk.id, error: error.message });
    console.error(`[batch] ${prefix} error chunk_id=${chunk.id} stage=process message=${error.message}`);
  }
}

async function main() {
  log('starting first incremental batch only');

  const openaiKey = await getModelKey('openai');
  if (!openaiKey) throw new Error('OpenAI key not found via js/vault-helper.js');
  process.env.OPENAI_API_KEY = openaiKey;
  log('OpenAI key loaded via js/vault-helper.js');

  stats.totalChunks = await countRows('memory_chunks');
  const processed = await fetchProcessedSegmentKeys();
  stats.alreadyProcessed = processed.chunkIds.size;
  stats.pending = Math.max(stats.totalChunks - stats.alreadyProcessed, 0);

  log(`Total de chunks: ${stats.totalChunks}`);
  log(`Ja processados: ${stats.alreadyProcessed}`);
  log(`Pendentes: ${stats.pending}`);

  const chunks = await fetchPendingChunks(processed);
  stats.attempted = chunks.length;

  if (chunks.length === 0) {
    log('Nenhum chunk pendente encontrado.');
    return;
  }

  log(`Lote atual: 1 chunk_count=${chunks.length} limite=${BATCH_SIZE}`);

  for (let i = 0; i < chunks.length; i++) {
    await processChunk(chunks[i], i);
  }

  const elapsedSeconds = (Date.now() - stats.startedAt) / 1000;
  const avgSeconds = stats.attempted ? elapsedSeconds / stats.attempted : 0;
  const avgContexts = stats.success ? stats.totalContexts / stats.success : 0;
  const cost = (stats.totalTokens / 1_000_000) * EMBEDDING_COST_PER_1M_TOKENS_USD;

  log('=== resumo do primeiro lote ===');
  log(`Lote atual: 1`);
  log(`Sucessos: ${stats.success}`);
  log(`Falhas: ${stats.failed}`);
  log(`Pulados: ${stats.skipped}`);
  log(`Custo aproximado embeddings: US$ ${cost.toFixed(6)} (${stats.totalTokens} tokens aprox.)`);
  log(`Tempo medio por chunk: ${avgSeconds.toFixed(2)}s`);
  log(`Contextos medios por segmento: ${avgContexts.toFixed(2)}`);

  if (stats.failures.length > 0) {
    log('Falhas detalhadas:');
    for (const failure of stats.failures) {
      console.error(`[batch] chunk_id=${failure.chunk_id} error=${failure.error}`);
    }
  }

  log('Pausado apos o primeiro lote. Aguarde confirmacao antes do proximo lote.');
}

main().catch((error) => {
  console.error(`[fatal] ${error.message}`);
  process.exit(1);
});
