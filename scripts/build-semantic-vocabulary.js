#!/usr/bin/env node

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SOURCES = ['claude', 'worion-doc'];
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'semantic-vocabulary.json');
const BATCH_SIZE = 1000;
const MAX_CHUNKS_PER_SOURCE = 6000;
const MAX_CONTENT_CHARS = 1800;

const STOPWORDS = new Set([
  'ainda', 'algo', 'algum', 'alguma', 'algumas', 'alguns', 'antes', 'apenas', 'apos', 'aqui',
  'assim', 'ate', 'cada', 'caso', 'coisa', 'coisas', 'como', 'com', 'contra', 'daquele',
  'daquela', 'dessa', 'desse', 'deste', 'desta', 'depois', 'desde', 'deve', 'devem', 'disso',
  'dizer', 'dois', 'duas', 'eles', 'elas', 'entao', 'entre', 'essa', 'esse', 'esta', 'este',
  'fazer', 'feita', 'feito', 'ficar', 'fora', 'isso', 'isto', 'mais', 'mesmo', 'minha',
  'muito', 'muita', 'muitos', 'muitas', 'nada', 'nao', 'nela', 'nele', 'nessa', 'nesse',
  'neste', 'nesta', 'onde', 'outra', 'outro', 'outras', 'outros', 'para', 'pela', 'pelo',
  'pelas', 'pelos', 'pode', 'podem', 'pois', 'porque', 'quando', 'quase', 'quem', 'sobre',
  'tambem', 'tanto', 'toda', 'todo', 'todas', 'todos', 'tudo', 'usar', 'voce', 'vocÃª'
]);

const DOMAIN_HINTS = [
  'worion', 'deepworion', 'memoria', 'semantica', 'agente', 'agentes', 'contexto', 'notion',
  'supabase', 'workflow', 'workflows', 'n8n', 'openai', 'claude', 'chatgpt', 'modelo',
  'prompt', 'router', 'pesquisa', 'grounding', 'evidencia', 'conector', 'conectores',
  'arquitetura', 'pipeline', 'automacao', 'workestria', 'shopify', 'bling', 'tdah',
  'hiperfoco', 'carga', 'execucao', 'continuidade', 'identidade', 'retomada'
];

function normalizeText(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s._-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  return normalizeText(text)
    .split(/\s+/)
    .map(token => token.replace(/^[-_.]+|[-_.]+$/g, ''))
    .filter(token => token.length >= 4 && token.length <= 36)
    .filter(token => !STOPWORDS.has(token))
    .filter(token => !/^\d+$/.test(token));
}

function addCount(map, key, weight = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + weight);
}

function topEntries(map, limit, minCount = 2) {
  return [...map.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

async function fetchChunks(supabase, sourceId) {
  const chunks = [];
  for (let offset = 0; offset < MAX_CHUNKS_PER_SOURCE; offset += BATCH_SIZE) {
    const { data, error } = await supabase
      .from('memory_chunks')
      .select('source_id,role,content,created_at')
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);
    if (error) throw new Error(`Falha ao ler ${sourceId}: ${error.message}`);
    if (!data || !data.length) break;
    chunks.push(...data);
    if (data.length < BATCH_SIZE) break;
  }
  return chunks;
}

function buildVocabulary(chunksBySource) {
  const globalTerms = new Map();
  const globalPhrases = new Map();
  const sourceStats = {};

  for (const [sourceId, chunks] of Object.entries(chunksBySource)) {
    const terms = new Map();
    const phrases = new Map();

    for (const chunk of chunks) {
      const content = String(chunk.content || '').slice(0, MAX_CONTENT_CHARS);
      const tokens = tokenize(content);
      const uniqueTokens = [...new Set(tokens)];

      for (const token of uniqueTokens) {
        const hintBoost = DOMAIN_HINTS.includes(token) ? 4 : 1;
        addCount(terms, token, hintBoost);
        addCount(globalTerms, token, hintBoost);
      }

      for (let index = 0; index < tokens.length - 1; index += 1) {
        const phrase = `${tokens[index]} ${tokens[index + 1]}`;
        if (STOPWORDS.has(tokens[index]) || STOPWORDS.has(tokens[index + 1])) continue;
        addCount(phrases, phrase);
        addCount(globalPhrases, phrase);
      }
    }

    sourceStats[sourceId] = {
      chunks: chunks.length,
      terms: topEntries(terms, 120, 2),
      phrases: topEntries(phrases, 80, 2)
    };
  }

  return {
    generated_at: new Date().toISOString(),
    sources: SOURCES,
    strategy: {
      description: 'Lexico local extraido de memory_chunks para ampliar recuperacao semantica textual do Worion.',
      max_chunks_per_source: MAX_CHUNKS_PER_SOURCE,
      max_content_chars_per_chunk: MAX_CONTENT_CHARS
    },
    vocabulary: {
      domain_hints: DOMAIN_HINTS,
      global_terms: topEntries(globalTerms, 180, 3),
      global_phrases: topEntries(globalPhrases, 120, 3)
    },
    by_source: sourceStats
  };
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY precisam estar no .env');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  const chunksBySource = {};
  for (const source of SOURCES) {
    chunksBySource[source] = await fetchChunks(supabase, source);
    console.log(`${source}: ${chunksBySource[source].length} chunks`);
  }

  const vocabulary = buildVocabulary(chunksBySource);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(vocabulary, null, 2), 'utf-8');
  console.log(`Vocabulário salvo em ${OUTPUT_PATH}`);
  console.log(JSON.stringify({
    generated_at: vocabulary.generated_at,
    sources: vocabulary.sources,
    global_terms: vocabulary.vocabulary.global_terms.length,
    global_phrases: vocabulary.vocabulary.global_phrases.length
  }, null, 2));
}

main().catch(error => {
  console.error('VOCABULARY_ERROR');
  console.error(error.message);
  process.exit(1);
});
