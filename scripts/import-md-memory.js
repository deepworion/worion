#!/usr/bin/env node

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const CONVERSATIONS_TABLE = 'memory_conversations';
const CHUNKS_TABLE = 'memory_chunks';
const CHUNK_SIZE = 3500;
const CHUNK_OVERLAP = 350;
const BATCH_SIZE = 250;
const BUILT_IN_SOURCES = new Set(['claude', 'chatgpt', 'gemini', 'code', 'worion']);

function uuidFromString(value) {
  const hex = crypto.createHash('sha256').update(String(value)).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${hex.slice(18, 20)}`,
    hex.slice(20, 32)
  ].join('-');
}

function usage() {
  console.log('Uso: node scripts/import-md-memory.js caminho/arquivo.md [titulo] [source_id]');
  console.log('Exemplo: node scripts/import-md-memory.js docs/sessions/worionmemoria.txt "Memoria Worion" worion-md');
  console.log('Rollback: node scripts/import-md-memory.js --delete caminho/arquivo.md [source_id]');
}

function resolveInputPath(inputArg) {
  const target = path.resolve(process.cwd(), inputArg || '');
  if (!fs.existsSync(target)) throw new Error(`Arquivo nao encontrado: ${inputArg}`);
  const stat = fs.statSync(target);
  if (!stat.isFile()) throw new Error(`O caminho nao e um arquivo: ${inputArg}`);
  return target;
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ \u00a0]+$/gm, '')
    .trim();
}

function makeChunks(text) {
  const chunks = [];
  let index = 0;

  while (index < text.length) {
    let end = Math.min(index + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      const lineBreak = text.lastIndexOf('\n', end);
      const boundary = paragraphBreak > index + CHUNK_SIZE * 0.6 ? paragraphBreak : lineBreak;
      if (boundary > index + CHUNK_SIZE * 0.6) end = boundary;
    }

    const content = text.slice(index, end).trim();
    if (content) chunks.push(content);
    if (end >= text.length) break;
    index = Math.max(end - CHUNK_OVERLAP, index + 1);
  }

  return chunks;
}

async function upsertInBatches(supabase, table, rows, options = {}) {
  let imported = 0;
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, options);
    if (error) throw new Error(`Falha ao importar ${table}: ${error.message}`);
    imported += batch.length;
    console.log(`Importado ${table} lote ${Math.floor(index / BATCH_SIZE) + 1}: ${imported}/${rows.length}`);
  }
  return imported;
}

async function ensureMemorySource(supabase, sourceId) {
  const { data, error } = await supabase
    .from('memory_sources')
    .select('id')
    .eq('id', sourceId)
    .limit(1);
  if (error) throw new Error(`Falha ao consultar memory_sources: ${error.message}`);
  if (data && data.length) return;

  const { error: insertError } = await supabase.from('memory_sources').insert({
    id: sourceId,
    name: 'Worion Docs',
    description: 'Documentos locais importados para memoria do Worion',
    import_method: 'manual',
    is_active: true
  });
  if (insertError) throw new Error(`Falha ao criar memory_sources.${sourceId}: ${insertError.message}`);
}

async function main() {
  const args = process.argv.slice(2);
  const deleteMode = args[0] === '--delete';
  const [inputArg, titleArg, sourceArg] = deleteMode ? [args[1], '', args[2]] : args;
  if (!inputArg) {
    usage();
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY precisam estar no .env');
  }

  const inputPath = resolveInputPath(inputArg);
  const relativePath = path.relative(process.cwd(), inputPath).replace(/\\/g, '/');
  const sourceId = String(sourceArg || 'worion-md').trim();
  const conversationId = uuidFromString(`${sourceId}:${relativePath}`);
  const now = new Date().toISOString();

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  console.log(`Arquivo: ${inputPath}`);
  console.log(`Conversation ID: ${conversationId}`);

  if (deleteMode) {
    const chunksDelete = await supabase.from(CHUNKS_TABLE).delete().eq('conversation_id', conversationId);
    if (chunksDelete.error) throw new Error(`Falha ao remover chunks: ${chunksDelete.error.message}`);
    const conversationDelete = await supabase.from(CONVERSATIONS_TABLE).delete().eq('id', conversationId);
    if (conversationDelete.error) throw new Error(`Falha ao remover conversa: ${conversationDelete.error.message}`);
    let sourceDeleted = false;
    if (!BUILT_IN_SOURCES.has(sourceId)) {
      const remaining = await supabase
        .from(CONVERSATIONS_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('source_id', sourceId);
      if (remaining.error) throw new Error(`Falha ao conferir fonte: ${remaining.error.message}`);
      if (!remaining.count) {
        const sourceDelete = await supabase.from('memory_sources').delete().eq('id', sourceId);
        if (sourceDelete.error) throw new Error(`Falha ao remover fonte: ${sourceDelete.error.message}`);
        sourceDeleted = true;
      }
    }
    console.log('ROLLBACK_FINAL');
    console.log(JSON.stringify({
      success: true,
      deleted_conversation_id: conversationId,
      source_id: sourceId,
      source_file: relativePath,
      source_deleted: sourceDeleted
    }, null, 2));
    return;
  }

  const rawText = fs.readFileSync(inputPath, 'utf-8');
  const text = normalizeText(rawText);
  if (!text) throw new Error('Arquivo vazio.');

  const title = titleArg || path.basename(inputPath);
  const chunks = makeChunks(text);

  const conversationRow = {
    id: conversationId,
    source_id: sourceId,
    external_id: relativePath,
    title,
    summary: `Documento local importado para memoria do Worion: ${relativePath}`,
    metadata: {
      provider: 'local-md',
      path: relativePath,
      imported_at: now,
      chars: text.length,
      chunk_size: CHUNK_SIZE,
      chunk_overlap: CHUNK_OVERLAP,
      chunk_count: chunks.length
    },
    updated_at: now,
    imported_at: now
  };

  const chunkRows = chunks.map((content, index) => ({
    id: uuidFromString(`${conversationId}:${index}`),
    conversation_id: conversationId,
    source_id: sourceId,
    chunk_index: index,
    role: 'document',
    content,
    metadata: {
      provider: 'local-md',
      path: relativePath
    },
    created_at: now
  }));

  console.log(`Caracteres: ${text.length}`);
  console.log(`Chunks: ${chunkRows.length}`);

  await ensureMemorySource(supabase, sourceId);
  await supabase.from(CHUNKS_TABLE).delete().eq('conversation_id', conversationId);
  await upsertInBatches(supabase, CONVERSATIONS_TABLE, [conversationRow], { onConflict: 'id' });
  await upsertInBatches(supabase, CHUNKS_TABLE, chunkRows, { onConflict: 'id' });

  console.log('STATUS_FINAL');
  console.log(JSON.stringify({
    success: true,
    source_id: sourceId,
    conversation_id: conversationId,
    source_file: relativePath,
    title,
    chunks: chunkRows.length
  }, null, 2));
}

main().catch(error => {
  console.error('IMPORT_ERROR');
  console.error(error.message);
  process.exit(1);
});
