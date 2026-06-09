#!/usr/bin/env node

/**
 * Laboratorio paralelo de avaliacao BGE-M3 + reranker local.
 * Nao escreve no Supabase e nao altera o runtime principal do Worion.
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const ENV_LOCAL = path.join(PROJECT_ROOT, ".env.local");
const ENV_FALLBACK = path.join(PROJECT_ROOT, ".env");
const CACHE_DIR = path.join(PROJECT_ROOT, ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "bge-m3-segments.json");

const OLLAMA_EMBED_URL = process.env.OLLAMA_EMBED_URL || "http://localhost:11434/api/embed";
const OLLAMA_MODEL = process.env.OLLAMA_EMBED_MODEL || "bge-m3";
const RERANK_URL = process.env.RERANK_URL || "http://localhost:8010/rerank";
const SEGMENT_LIMIT = Number(process.env.BGE_EVAL_SEGMENT_LIMIT || 7000);
const PAGE_SIZE = Number(process.env.BGE_EVAL_PAGE_SIZE || 1000);
const EMBED_BATCH_SIZE = Number(process.env.BGE_EVAL_EMBED_BATCH_SIZE || 16);
const TOP_N = 30;
const FINAL_TOP_K = 5;

const QUERIES = [
  "o que eu falei sobre TDAH e Venvanse?",
  "procure na memória sobre DeepOlio",
  "o que fizemos hoje no Worion?",
  "qual era o problema dos chunks?",
  "o que eu falei sobre Puppila e Goodds?",
  "sonhos com gatos branco e preto",
  "Bashar, hermetismo e ego",
  "rota memory_search direct_answer",
  "erro file:///C:/api/embedding",
  "projeto Oly mini-óleo",
];

function loadEnv() {
  if (fs.existsSync(ENV_LOCAL)) {
    dotenv.config({ path: ENV_LOCAL });
    console.log(`Env carregado: ${ENV_LOCAL}`);
    return;
  }

  dotenv.config({ path: ENV_LOCAL });
  if (fs.existsSync(ENV_FALLBACK)) {
    dotenv.config({ path: ENV_FALLBACK });
    console.warn(`Aviso: .env.local nao encontrado; usando fallback local ${ENV_FALLBACK}`);
    return;
  }

  console.warn("Aviso: .env.local nao encontrado e .env fallback indisponivel");
}

function requiredEnv(nameCandidates) {
  for (const name of nameCandidates) {
    if (process.env[name]) return process.env[name];
  }
  throw new Error(`Variavel obrigatoria ausente: ${nameCandidates.join(" ou ")}`);
}

function truncate(text, length = 420) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  return normalized.length > length ? `${normalized.slice(0, length - 3)}...` : normalized;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error(`Dimensoes invalidas para cosine similarity: ${a?.length} vs ${b?.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function fetchJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Resposta nao JSON de ${url}: ${truncate(text, 500)}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} em ${url}: ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

async function embedTexts(texts) {
  const payload = { model: OLLAMA_MODEL, input: texts.length === 1 ? texts[0] : texts };
  const data = await fetchJson(OLLAMA_EMBED_URL, payload);

  if (Array.isArray(data.embeddings)) return data.embeddings;
  if (Array.isArray(data.embedding)) return [data.embedding];

  throw new Error(`Resposta inesperada do Ollama: ${JSON.stringify(data).slice(0, 500)}`);
}

async function fetchSegments(supabase) {
  const allSegments = [];

  for (let from = 0; from < SEGMENT_LIMIT; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE - 1, SEGMENT_LIMIT - 1);
    const { data, error } = await supabase
      .from("memory_conversation_segments")
      .select("id, content")
      .not("content", "is", null)
      .range(from, to);

    if (error) throw new Error(`Erro Supabase ao buscar segmentos: ${error.message}`);
    if (!data || data.length === 0) break;

    allSegments.push(...data.filter((segment) => segment.content && String(segment.content).trim()));
    if (data.length < PAGE_SIZE) break;
  }

  return allSegments.slice(0, SEGMENT_LIMIT);
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return new Map();

  const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  const items = Array.isArray(raw.segments) ? raw.segments : Array.isArray(raw) ? raw : [];
  return new Map(items.map((item) => [String(item.id), item]));
}

function saveCache(cache) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const segments = Array.from(cache.values());
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify(
      {
        model: OLLAMA_MODEL,
        dimension: segments[0]?.embedding?.length || null,
        updated_at: new Date().toISOString(),
        segments,
      },
      null,
      2
    )
  );
}

async function ensureSegmentEmbeddings(segments) {
  const cache = loadCache();
  const enriched = [];
  const missing = [];

  for (const segment of segments) {
    const cached = cache.get(String(segment.id));
    if (cached?.embedding?.length && cached.content === segment.content) {
      enriched.push(cached);
    } else {
      missing.push(segment);
    }
  }

  console.log(`Segmentos: ${segments.length}. Cache hit: ${enriched.length}. A gerar: ${missing.length}.`);

  for (let i = 0; i < missing.length; i += EMBED_BATCH_SIZE) {
    const batch = missing.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedTexts(batch.map((segment) => segment.content));

    if (embeddings.length !== batch.length) {
      throw new Error(`Ollama retornou ${embeddings.length} embeddings para batch de ${batch.length}`);
    }

    for (let j = 0; j < batch.length; j += 1) {
      const item = {
        id: batch[j].id,
        content: batch[j].content,
        embedding: embeddings[j],
      };
      cache.set(String(item.id), item);
      enriched.push(item);
    }

    saveCache(cache);
    console.log(`Embeddings BGE-M3 gerados: ${Math.min(i + batch.length, missing.length)}/${missing.length}`);
  }

  if (missing.length === 0) saveCache(cache);

  return Array.from(cache.values()).filter((item) => item.embedding?.length && item.content);
}

async function rerank(query, candidates) {
  const response = await fetchJson(RERANK_URL, {
    query,
    documents: candidates.map((candidate) => candidate.content),
    top_k: FINAL_TOP_K,
    normalize: true,
  });

  return response.results.map((result) => ({
    ...result,
    id: candidates[result.index]?.id,
    cosine_score: candidates[result.index]?.cosine_score,
  }));
}

async function evaluateQuery(query, segments) {
  const [queryEmbedding] = await embedTexts([query]);
  const candidates = segments
    .map((segment) => ({
      ...segment,
      cosine_score: cosineSimilarity(queryEmbedding, segment.embedding),
    }))
    .sort((a, b) => b.cosine_score - a.cosine_score)
    .slice(0, TOP_N);

  const ranked = await rerank(query, candidates);

  console.log(`\n=== ${query} ===`);
  ranked.forEach((item, index) => {
    console.log(
      `${index + 1}. rerank=${item.score.toFixed(6)} cosine=${Number(item.cosine_score).toFixed(6)} id=${item.id}`
    );
    console.log(`   ${truncate(item.document)}`);
  });

  return ranked;
}

async function main() {
  loadEnv();

  const supabaseUrl = requiredEnv(["WORION_MEMORY_SUPABASE_URL", "SUPABASE_URL"]);
  const supabaseKey = requiredEnv([
    "WORION_MEMORY_SUPABASE_SERVICE_KEY",
    "SUPABASE_SERVICE_KEY",
    "WORION_MEMORY_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Buscando memory_conversation_segments no Supabase...");
  const rawSegments = await fetchSegments(supabase);
  if (rawSegments.length === 0) throw new Error("Nenhum segmento encontrado em memory_conversation_segments");

  const segments = await ensureSegmentEmbeddings(rawSegments);
  const dimension = segments[0]?.embedding?.length;
  console.log(`Embeddings prontos: ${segments.length}. Dimensao local ${OLLAMA_MODEL}: ${dimension}`);

  if (dimension !== 1024) {
    console.warn(`Aviso: dimensao esperada para BGE-M3 era 1024, recebido ${dimension}`);
  }

  const summaries = [];
  for (const query of QUERIES) {
    summaries.push({ query, results: await evaluateQuery(query, segments) });
  }

  console.log("\nResumo: avaliacao local BGE-M3 + reranker concluida sem alterar Supabase/runtime.");
  return summaries;
}

main().catch((error) => {
  console.error(`Erro fatal: ${error.message}`);
  process.exit(1);
});
