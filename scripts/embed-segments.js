#!/usr/bin/env node

/**
 * Script para gerar embeddings de segmentos
 *
 * Busca segmentos sem embedding no Supabase e gera usando OpenAI text-embedding-3-small
 * Processa em batches de 50 segmentos por vez
 *
 * Uso: node scripts/embed-segments.js
 *
 * Variáveis de ambiente:
 * - SUPABASE_URL: URL do projeto Supabase
 * - SUPABASE_SERVICE_KEY: Service key do Supabase (com privilégios de escrita)
 * - OPENAI_API_KEY: Chave de API do OpenAI
 */

const { createClient } = require("@supabase/supabase-js");
const { OpenAI } = require("openai");
const { getModelKey } = require("../js/vault-helper.js");

// Validar variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.WORION_MEMORY_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ SUPABASE_URL ou WORION_MEMORY_SUPABASE_URL não definida");
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_KEY não definida");
  process.exit(1);
}

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// OpenAI será inicializado após pegar a key da Vault
let openai;

// Configuração
const BATCH_SIZE = 50;
const MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSION = 1536;

/**
 * Registra mensagens com timestamp
 */
function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
  }[type] || "•";

  console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * Busca segmentos sem embedding
 */
async function fetchSegmentsWithoutEmbedding(limit = BATCH_SIZE) {
  try {
    const { data, error } = await supabase
      .from("memory_conversation_segments")
      .select("id, content")
      .is("embedding", null)
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar segmentos: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    log(`Erro ao buscar segmentos: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Gera embeddings usando OpenAI
 */
async function generateEmbeddings(texts) {
  try {
    const response = await openai.embeddings.create({
      model: MODEL,
      input: texts,
      encoding_format: "float",
    });

    return response.data.map((item) => ({
      index: item.index,
      embedding: item.embedding,
    }));
  } catch (error) {
    log(
      `Erro ao gerar embeddings com OpenAI: ${error.message}`,
      "error"
    );
    throw error;
  }
}

/**
 * Atualiza segmentos com embeddings no Supabase
 */
async function updateSegmentsWithEmbeddings(updates) {
  try {
    const { error } = await supabase.from("memory_conversation_segments").upsert(updates, {
      onConflict: "id",
    });

    if (error) {
      throw new Error(`Erro ao atualizar segmentos: ${error.message}`);
    }

    return updates.length;
  } catch (error) {
    log(`Erro ao atualizar segmentos: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Processa um batch de segmentos
 */
async function processBatch(segments, batchNumber) {
  const batchId = `Batch #${batchNumber}`;
  log(`${batchId}: Processando ${segments.length} segmentos...`);

  // Extrair textos
  const texts = segments.map((seg) => seg.content);

  // Gerar embeddings
  log(`${batchId}: Gerando embeddings com OpenAI...`);
  const embeddings = await generateEmbeddings(texts);

  // Preparar updates
  const updates = segments.map((segment, idx) => ({
    id: segment.id,
    content: segment.content,
    embedding: embeddings[idx].embedding,
  }));

  // Atualizar no Supabase
  log(`${batchId}: Atualizando ${updates.length} segmentos no Supabase...`);
  const updated = await updateSegmentsWithEmbeddings(updates);

  log(
    `${batchId}: ✓ ${updated} segmentos atualizados com sucesso`,
    "success"
  );

  return updated;
}

/**
 * Inicializa OpenAI client com chave da Vault
 */
async function initializeOpenAI() {
  console.log("🔑 Buscando OpenAI API key da Supabase Vault...");
  const apiKey = await getModelKey('openai');

  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY não encontrada na Vault nem em process.env");
    process.exit(1);
  }

  openai = new OpenAI({ apiKey });
  console.log("✅ OpenAI client inicializado com chave da Vault\n");
}

/**
 * Função principal
 */
async function main() {
  try {
    // Inicializar OpenAI
    await initializeOpenAI();

    log("Iniciando processamento de embeddings...");
    log(`Modelo: ${MODEL} (${EMBEDDING_DIMENSION} dimensões)`);
    log(`Tamanho do batch: ${BATCH_SIZE} segmentos`);
    console.log("");

    let totalProcessed = 0;
    let batchNumber = 1;

    // Processar batches até não haver mais segmentos
    while (true) {
      const segments = await fetchSegmentsWithoutEmbedding(BATCH_SIZE);

      if (segments.length === 0) {
        log("Nenhum segmento pendente encontrado");
        break;
      }

      const processed = await processBatch(segments, batchNumber);
      totalProcessed += processed;
      batchNumber++;

      // Aguardar brevemente entre batches para evitar rate limiting
      if (segments.length === BATCH_SIZE) {
        log("Aguardando 2 segundos antes do próximo batch...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log("");
    log(
      `Processamento concluído! Total: ${totalProcessed} segmentos com embeddings gerados`,
      "success"
    );
  } catch (error) {
    log(`Erro fatal: ${error.message}`, "error");
    process.exit(1);
  }
}

// Executar
main();
