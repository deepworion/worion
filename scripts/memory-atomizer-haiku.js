#!/usr/bin/env node

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const MEMORY_TYPES = new Set([
  'identity',
  'preference',
  'communication_style',
  'project_state',
  'technical_decision',
  'business_decision',
  'personal_pattern',
  'spiritual_pattern',
  'health_tdah',
  'workflow',
  'bug',
  'fix',
  'todo',
  'risk',
  'quote',
  'event',
  'relationship',
  'tool_usage'
]);

const DEFAULT_BATCH_SIZE = 15;
const MAX_INPUT_CHARS = 32000;
const MAX_ATOMS_PER_BATCH = 20;
const ANTHROPIC_MODEL = process.env.ATOMIZER_ANTHROPIC_MODEL || 'claude-haiku-4-5';
const ANTHROPIC_MAX_TOKENS = Number(process.env.ATOMIZER_MAX_TOKENS || 8192);

const ATOMIZER_PROMPT = `Voce e um compilador de memoria semantica.

Sua tarefa e transformar chunks brutos de conversa em memorias atomicas recuperaveis.

REGRAS:
1. Extraia apenas informacoes uteis para recuperacao futura
2. Nao copie o chunk inteiro
3. Nao invente fatos
4. Cada memoria deve ser independente
5. Cada memoria deve ter origem rastreavel nos chunk_ids
6. Se um trecho for emocional, espiritual, tecnico ou operacional, classifique corretamente
7. Se houver duplicidade, gere apenas uma memoria consolidada
8. Se o chunk nao contiver memoria util, ignore
9. Retorne no maximo ${MAX_ATOMS_PER_BATCH} memorias por batch

TIPOS PERMITIDOS:
identity, preference, communication_style, project_state, technical_decision,
business_decision, personal_pattern, spiritual_pattern, health_tdah, workflow,
bug, fix, todo, risk, quote, event, relationship, tool_usage

Retorne SOMENTE JSON valido no formato:
{
  "memories": [
    {
      "type": "technical_decision",
      "title": "Worion usa roteamento privado antes de busca publica",
      "content": "Sistema deve resolver escopo da pergunta antes de acionar Brave/Tavily. Perguntas pessoais, anexos, Notion e memoria privada nao devem cair em busca publica.",
      "retrieval_text": "roteamento privado escopo Brave Tavily decisao arquitetural privacidade",
      "keywords": ["roteamento", "privacidade", "Brave", "Tavily", "escopo"],
      "entities": ["Brave", "Tavily", "Notion"],
      "source_chunk_ids": ["chunk-id-1", "chunk-id-2"],
      "importance": 4,
      "confidence": 0.95
    }
  ]
}`;

function parseArgs(argv) {
  const args = {
    batchSize: DEFAULT_BATCH_SIZE,
    dryRun: false,
    limitCards: 0,
    cardId: '',
    resetCard: false,
    reportFile: ''
  };

  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i];
    const next = argv[i + 1];
    if (item === '--dry-run') args.dryRun = true;
    else if (item === '--reset-card') args.resetCard = true;
    else if (item === '--batch-size' && next) {
      args.batchSize = Math.max(1, Math.min(Number(next), 25));
      i += 1;
    } else if (item === '--limit-cards' && next) {
      args.limitCards = Math.max(0, Number(next));
      i += 1;
    } else if (item === '--card-id' && next) {
      args.cardId = next;
      i += 1;
    } else if (item === '--report-file' && next) {
      args.reportFile = next;
      i += 1;
    }
  }

  return args;
}

function requireEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  throw new Error(`Missing env: ${names.join(' or ')}`);
}

function createMemorySupabaseClient() {
  const url = requireEnv('WORION_MEMORY_SUPABASE_URL', 'SUPABASE_URL');
  const key = requireEnv('WORION_MEMORY_SUPABASE_SERVICE_KEY', 'WORION_MEMORY_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY');
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'worion-memory-atomizer-haiku' } }
  });
}

async function getAnthropicKey() {
  const direct = String(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();
  if (direct) return direct;

  const vaultUrl = String(process.env.WORION_VAULT_SUPABASE_URL || '').trim();
  const vaultKey = String(process.env.WORION_VAULT_SUPABASE_SERVICE_KEY || '').trim();
  if (!vaultUrl || !vaultKey) throw new Error('Anthropic key not found in env and vault env is unavailable.');

  const response = await fetch(`${vaultUrl}/rest/v1/api_keys_vault_v2?provider=eq.claude.ai&select=value&limit=1`, {
    headers: {
      apikey: vaultKey,
      Authorization: `Bearer ${vaultKey}`
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Vault query failed: ${response.status} ${text.slice(0, 160)}`);
  const rows = JSON.parse(text || '[]');
  const key = String(rows[0]?.value || '').trim();
  if (!key) throw new Error('Anthropic key not found in vault.');
  return key;
}

async function fetchActiveCards(supabase, options) {
  let query = supabase
    .from('memory_cards_v2')
    .select('id,title,summary,domain,status,updated_at')
    .eq('status', 'card_active')
    .order('updated_at', { ascending: false });

  if (options.cardId) query = query.eq('id', options.cardId);
  if (options.limitCards) query = query.limit(options.limitCards);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function fetchChunksFromSources(supabase, cardId) {
  const { data: sources, error } = await supabase
    .from('memory_card_sources_v2')
    .select('chunk_id,source_ref,metadata')
    .eq('card_id', cardId)
    .not('chunk_id', 'is', null)
    .limit(5000);

  if (error) return [];

  const ids = [...new Set((sources || []).map(row => row.chunk_id).filter(Boolean))];
  if (!ids.length) return [];

  const chunks = [];
  for (let i = 0; i < ids.length; i += 250) {
    const batch = ids.slice(i, i + 250);
    const { data, error: chunkError } = await supabase
      .from('memory_chunks')
      .select('id,conversation_id,source_id,chunk_index,role,content,metadata,created_at')
      .in('id', batch)
      .order('chunk_index', { ascending: true });
    if (chunkError) throw chunkError;
    chunks.push(...(data || []));
  }
  return chunks;
}

async function fetchChunksFromMetadata(supabase, cardId) {
  const attempts = [
    () => supabase
      .from('memory_chunks')
      .select('id,conversation_id,source_id,chunk_index,role,content,metadata,created_at')
      .filter('metadata->>context_id', 'eq', cardId)
      .order('chunk_index', { ascending: true })
      .limit(5000),
    () => supabase
      .from('memory_chunks')
      .select('id,conversation_id,source_id,chunk_index,role,content,metadata,created_at')
      .filter('metadata->>card_id', 'eq', cardId)
      .order('chunk_index', { ascending: true })
      .limit(5000),
    () => supabase
      .from('memory_chunks')
      .select('id,conversation_id,source_id,chunk_index,role,content,metadata,created_at')
      .contains('metadata', { context_id: cardId })
      .order('chunk_index', { ascending: true })
      .limit(5000)
  ];

  for (const attempt of attempts) {
    const { data, error } = await attempt();
    if (!error && Array.isArray(data) && data.length) return data;
  }
  return [];
}

async function fetchCardChunks(supabase, cardId) {
  const bySources = await fetchChunksFromSources(supabase, cardId);
  if (bySources.length) return bySources;
  return await fetchChunksFromMetadata(supabase, cardId);
}

function groupByConversation(chunks) {
  const groups = new Map();
  for (const chunk of chunks) {
    const key = chunk.conversation_id || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(chunk);
  }
  return [...groups.entries()].map(([conversationId, rows]) => ({
    conversationId,
    chunks: rows.sort((a, b) => Number(a.chunk_index || 0) - Number(b.chunk_index || 0))
  }));
}

function makeChunkBatches(chunks, batchSize) {
  const batches = [];
  let current = [];
  let chars = 0;

  for (const chunk of chunks) {
    const content = String(chunk.content || '').slice(0, 3000);
    const size = content.length + 300;
    if (current.length && (current.length >= batchSize || chars + size > MAX_INPUT_CHARS)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push({ ...chunk, content });
    chars += size;
  }

  if (current.length) batches.push(current);
  return batches;
}

function formatChunksForPrompt(card, conversationId, chunks) {
  return JSON.stringify({
    card: {
      id: card.id,
      title: card.title,
      domain: card.domain,
      summary: card.summary
    },
    conversation_id: conversationId,
    chunks: chunks.map(chunk => ({
      id: chunk.id,
      conversation_id: chunk.conversation_id,
      source_id: chunk.source_id,
      chunk_index: chunk.chunk_index,
      role: chunk.role,
      content: chunk.content
    }))
  }, null, 2);
}

async function callHaiku(anthropicKey, card, conversationId, chunks) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      temperature: 0.1,
      system: ATOMIZER_PROMPT,
      messages: [
        {
          role: 'user',
          content: `CHUNKS:\n${formatChunksForPrompt(card, conversationId, chunks)}`
        }
      ]
    })
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text || '{}');
  const raw = (data.content || [])
    .map(item => item?.text || '')
    .join('\n')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return JSON.parse(raw || '{"memories":[]}');
}

function cleanArray(value, max = 12) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => String(item || '').trim()).filter(Boolean))].slice(0, max);
}

function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function validateAtom(memory, card, conversationId, allowedChunkIds) {
  const type = String(memory.type || '').trim();
  const title = String(memory.title || '').replace(/\s+/g, ' ').trim();
  const content = String(memory.content || '').replace(/\s+/g, ' ').trim();
  const retrievalText = String(memory.retrieval_text || '').replace(/\s+/g, ' ').trim();
  const sourceChunkIds = cleanArray(memory.source_chunk_ids, 20)
    .filter(id => allowedChunkIds.has(id));

  if (!MEMORY_TYPES.has(type)) return null;
  if (!title || !content || !retrievalText || !sourceChunkIds.length) return null;

  return {
    tenant_id: 'local',
    user_id: 'local-user',
    workspace_id: 'local-workspace',
    card_id: card.id,
    conversation_id: conversationId === 'unknown' ? null : conversationId,
    type,
    title: title.slice(0, 180),
    content: content.slice(0, 1200),
    retrieval_text: retrievalText.slice(0, 1000),
    keywords: cleanArray(memory.keywords, 16),
    entities: cleanArray(memory.entities, 16),
    source_chunk_ids: sourceChunkIds,
    importance: Math.max(1, Math.min(5, Number(memory.importance || 3))),
    confidence: Math.max(0, Math.min(1, Number(memory.confidence || 0.8))),
    status: 'active'
  };
}

async function loadExistingAtomKeys(supabase, cardId) {
  const keys = new Set();
  const { data, error } = await supabase
    .from('memory_atoms_v1')
    .select('type,title,status')
    .eq('card_id', cardId)
    .eq('status', 'active')
    .limit(5000);
  if (error) return keys;
  for (const row of data || []) keys.add(`${row.type}:${normalizeTitle(row.title)}`);
  return keys;
}

async function insertAtoms(supabase, atoms, dryRun) {
  if (!atoms.length || dryRun) return { inserted: 0, skipped: dryRun ? atoms.length : 0 };
  const { error } = await supabase
    .from('memory_atoms_v1')
    .insert(atoms);
  if (error) throw error;
  return { inserted: atoms.length, skipped: 0 };
}

function emptyReport() {
  return {
    generated_at: new Date().toISOString(),
    dry_run: false,
    model: ANTHROPIC_MODEL,
    total_chunks_processed: 0,
    total_conversations_processed: 0,
    total_cards_processed: 0,
    total_atoms_created: 0,
    atoms_by_card: {},
    atoms_by_type: {},
    duplicates_removed: 0,
    atoms_without_source: 0,
    atoms_low_confidence: 0,
    failed_batches: []
  };
}

function defaultReportFile() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.resolve(process.cwd(), 'artifacts', 'memory-atoms', `memory-atoms-report-${stamp}.json`);
}

function writeFullReport(report, reportFile) {
  const target = path.resolve(process.cwd(), reportFile || defaultReportFile());
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(report, null, 2), 'utf-8');
  return target;
}

function recordAtoms(report, card, atoms) {
  report.total_atoms_created += atoms.length;
  report.atoms_by_card[card.title || card.id] = (report.atoms_by_card[card.title || card.id] || 0) + atoms.length;
  for (const atom of atoms) {
    report.atoms_by_type[atom.type] = (report.atoms_by_type[atom.type] || 0) + 1;
    if (!Array.isArray(atom.source_chunk_ids) || !atom.source_chunk_ids.length) report.atoms_without_source += 1;
    if (Number(atom.confidence) < 0.7) report.atoms_low_confidence += 1;
  }
}

async function resetCardAtoms(supabase, cardId, dryRun) {
  if (dryRun) return;
  const { error } = await supabase
    .from('memory_atoms_v1')
    .update({ status: 'archived' })
    .eq('card_id', cardId)
    .eq('status', 'active');
  if (error) throw error;
}

async function main() {
  const options = parseArgs(process.argv);
  const supabase = createMemorySupabaseClient();
  const anthropicKey = await getAnthropicKey();
  const cards = await fetchActiveCards(supabase, options);
  const report = emptyReport();
  report.dry_run = options.dryRun;
  const reportPath = path.resolve(process.cwd(), options.reportFile || defaultReportFile());

  console.log(`[atomizer] active cards: ${cards.length}`);
  console.log(`[atomizer] model: ${ANTHROPIC_MODEL}`);
  if (options.dryRun) console.log('[atomizer] dry-run enabled; no atoms will be inserted');

  for (const card of cards) {
    if (options.resetCard) await resetCardAtoms(supabase, card.id, options.dryRun);

    const chunks = await fetchCardChunks(supabase, card.id);
    report.total_cards_processed += 1;
    report.total_chunks_processed += chunks.length;
    report.total_conversations_processed += new Set(chunks.map(chunk => chunk.conversation_id || 'unknown')).size;

    console.log(`[atomizer] card "${card.title}" chunks=${chunks.length}`);
    if (!chunks.length) continue;

    const existingKeys = await loadExistingAtomKeys(supabase, card.id);
    const batchKeys = new Set();
    const allowedChunkIds = new Set(chunks.map(chunk => String(chunk.id)));
    const groups = groupByConversation(chunks);

    for (const group of groups) {
      const batches = makeChunkBatches(group.chunks, options.batchSize);
      for (let index = 0; index < batches.length; index += 1) {
        try {
          const parsed = await callHaiku(anthropicKey, card, group.conversationId, batches[index]);
          const memories = Array.isArray(parsed.memories) ? parsed.memories.slice(0, MAX_ATOMS_PER_BATCH) : [];
          const atoms = [];

          for (const memory of memories) {
            const atom = validateAtom(memory, card, group.conversationId, allowedChunkIds);
            if (!atom) {
              if (!Array.isArray(memory?.source_chunk_ids) || !memory.source_chunk_ids.length) report.atoms_without_source += 1;
              continue;
            }

            const key = `${atom.type}:${normalizeTitle(atom.title)}`;
            if (existingKeys.has(key) || batchKeys.has(key)) {
              report.duplicates_removed += 1;
              continue;
            }
            batchKeys.add(key);
            atoms.push(atom);
          }

          await insertAtoms(supabase, atoms, options.dryRun);
          recordAtoms(report, card, atoms);
          report.updated_at = new Date().toISOString();
          report.report_file = reportPath;
          writeFullReport(report, reportPath);
          console.log(`[atomizer] ${card.title} ${group.conversationId} batch ${index + 1}/${batches.length}: atoms=${atoms.length}`);
        } catch (error) {
          report.failed_batches.push({
            card_id: card.id,
            card_title: card.title,
            conversation_id: group.conversationId,
            batch_index: index,
            error: error.message
          });
          report.updated_at = new Date().toISOString();
          report.report_file = reportPath;
          writeFullReport(report, reportPath);
          console.warn(`[atomizer] failed batch card=${card.title} conversation=${group.conversationId}: ${error.message}`);
        }
      }
    }
  }

  writeFullReport(report, reportPath);
  console.log(JSON.stringify({
    ...report,
    report_file: reportPath,
    note: 'Relatorio completo salvo em arquivo para evitar corte por console, UI ou limite de tokens.'
  }, null, 2));
}

main().catch(error => {
  console.error(`[atomizer] fatal: ${error.message}`);
  process.exitCode = 1;
});
