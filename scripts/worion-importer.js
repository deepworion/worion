#!/usr/bin/env node

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const CONVERSATIONS_TABLE = 'memory_conversations';
const CHUNKS_TABLE = 'memory_chunks';
const LEGACY_TABLE = 'worion_memory_conversations';
const BATCH_SIZE = 250;

function usage() {
  console.log('Uso: node worion-importer.js claude conversations.json');
}

function resolveInputPath(provider, inputArg) {
  const direct = path.resolve(process.cwd(), inputArg);
  if (fs.existsSync(direct)) return direct;

  const providerPath = path.resolve(process.cwd(), provider, inputArg);
  if (fs.existsSync(providerPath)) return providerPath;

  throw new Error(`Arquivo nao encontrado: ${inputArg}`);
}

function normalizeDate(value, fallback = new Date().toISOString()) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : fallback;
}

function cleanText(value) {
  if (typeof value === 'string') return value.trim();
  if (!value) return '';
  return JSON.stringify(value);
}

function normalizeClaudeMessage(message, conversationId, index) {
  const role = message.sender === 'human' ? 'user' : 'assistant';
  const content = cleanText(message.text || message.content);
  if (!content) return null;

  return {
    id: crypto.randomUUID(),
    conversation_id: conversationId,
    source_id: 'claude',
    chunk_index: index,
    role,
    content,
    metadata: {
      provider: 'claude',
      external_message_id: message.uuid || null,
      parent_message_id: message.parent_message_uuid || null,
      updated_at: normalizeDate(message.updated_at || message.created_at),
      attachments: message.attachments || [],
      files: message.files || []
    },
    created_at: normalizeDate(message.created_at)
  };
}

function normalizeClaudeConversation(conversation) {
  const now = new Date().toISOString();
  const conversationId = conversation.uuid;
  const createdAt = normalizeDate(conversation.created_at, now);
  const updatedAt = normalizeDate(conversation.updated_at, createdAt);
  const chunks = (conversation.chat_messages || [])
    .map((message, index) => normalizeClaudeMessage(message, conversationId, index))
    .filter(Boolean);

  const row = {
    id: conversationId,
    source_id: 'claude',
    external_id: conversation.uuid,
    title: conversation.name || 'Conversa Claude importada',
    summary: conversation.summary || '',
    metadata: {
      provider: 'claude',
      imported_at: now,
      original_created_at: createdAt,
      message_count: chunks.length,
      account: conversation.account || null
    },
    updated_at: updatedAt,
    imported_at: now
  };

  return { row, chunks };
}

async function upsertInBatches(supabase, table, rows, options = {}) {
  let imported = 0;
  const errors = [];

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const request = supabase.from(table).upsert(batch, options);
    const { error } = await request;

    if (error) {
      errors.push({ table, batchStart: index, batchSize: batch.length, message: error.message });
      continue;
    }

    imported += batch.length;
    console.log(`Importado ${table} lote ${Math.floor(index / BATCH_SIZE) + 1}: ${imported}/${rows.length}`);
  }

  return { imported, errors };
}

async function deleteClaudeRows(supabase) {
  const results = {};

  const chunksDelete = await supabase.from(CHUNKS_TABLE).delete().eq('source_id', 'claude');
  results.memory_chunks_deleted = chunksDelete.error ? `erro: ${chunksDelete.error.message}` : 'ok';

  const conversationsDelete = await supabase.from(CONVERSATIONS_TABLE).delete().eq('source_id', 'claude');
  results.memory_conversations_deleted = conversationsDelete.error ? `erro: ${conversationsDelete.error.message}` : 'ok';

  return results;
}

async function deleteLegacyClaudeRows(supabase) {
  const { error } = await supabase.from(LEGACY_TABLE).delete().like('id', 'claude-%');
  if (error) throw new Error(`Falha ao limpar ${LEGACY_TABLE}: ${error.message}`);
}

async function countRows(supabase, table, column, value) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, value);
  if (error) throw error;
  return count || 0;
}

async function countLegacyClaudeRows(supabase) {
  const { count, error } = await supabase
    .from(LEGACY_TABLE)
    .select('id', { count: 'exact', head: true })
    .like('id', 'claude-%');
  if (error) throw error;
  return count || 0;
}

async function main() {
  const [provider, inputArg] = process.argv.slice(2);
  if (!provider || !inputArg) {
    usage();
    process.exit(1);
  }
  if (provider !== 'claude') {
    throw new Error(`Provider nao suportado ainda: ${provider}`);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY precisam estar no .env');
  }

  const inputPath = resolveInputPath(provider, inputArg);
  const conversations = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  if (!Array.isArray(conversations)) throw new Error('Arquivo Claude precisa ser um array de conversas.');

  const normalized = conversations.map(normalizeClaudeConversation);
  const conversationRows = normalized.map(item => item.row);
  const chunkRows = normalized.flatMap(item => item.chunks);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  console.log(`Arquivo: ${inputPath}`);
  console.log(`Conversas encontradas: ${conversationRows.length}`);
  console.log(`Chunks/mensagens encontrados: ${chunkRows.length}`);

  const startedAt = new Date().toISOString();
  const cleanup = await deleteClaudeRows(supabase);
  const conversationsResult = await upsertInBatches(supabase, CONVERSATIONS_TABLE, conversationRows, { onConflict: 'id' });
  const chunksResult = await upsertInBatches(supabase, CHUNKS_TABLE, chunkRows, { onConflict: 'id' });

  const errors = [...conversationsResult.errors, ...chunksResult.errors];
  if (!errors.length) {
    await deleteLegacyClaudeRows(supabase);
  }

  const finalCounts = {
    memory_conversations_claude: await countRows(supabase, CONVERSATIONS_TABLE, 'source_id', 'claude'),
    memory_chunks_claude: await countRows(supabase, CHUNKS_TABLE, 'source_id', 'claude'),
    worion_memory_conversations_claude: await countLegacyClaudeRows(supabase)
  };

  const status = {
    provider,
    sourceFile: inputPath,
    startedAt,
    finishedAt: new Date().toISOString(),
    cleanup,
    totalConversations: conversationRows.length,
    totalChunks: chunkRows.length,
    importedConversations: conversationsResult.imported,
    importedChunks: chunksResult.imported,
    failedBatches: errors.length,
    errors,
    finalCounts
  };

  const statusPath = path.join(process.cwd(), 'data', 'worion-import-status.json');
  fs.mkdirSync(path.dirname(statusPath), { recursive: true });
  fs.writeFileSync(statusPath, JSON.stringify(status, null, 2), 'utf-8');

  console.log('STATUS_FINAL');
  console.log(JSON.stringify(status, null, 2));

  if (errors.length) process.exitCode = 1;
}

main().catch(error => {
  console.error('IMPORT_ERROR');
  console.error(error.message);
  process.exit(1);
});
