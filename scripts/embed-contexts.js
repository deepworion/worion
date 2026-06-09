#!/usr/bin/env node

/**
 * Script para gerar embeddings dos contextos (memory_contexts)
 *
 * Adiciona coluna embedding e gera embeddings para classificação semântica
 * dos segmentos pelo UberWorion.
 *
 * Uso: node scripts/embed-contexts.js
 *
 * Variáveis de ambiente:
 * - SUPABASE_URL: URL do projeto Supabase
 * - SUPABASE_SERVICE_KEY: Service key do Supabase (com privilégios de escrita)
 * - OPENAI_API_KEY: Chave de API do OpenAI
 */

const { createClient } = require("@supabase/supabase-js");
const { OpenAI } = require("openai");

// Validar variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL) {
  console.error("❌ SUPABASE_URL não definida");
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_KEY não definida");
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY não definida");
  process.exit(1);
}

// Inicializar clientes
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Configuração
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
 * Adiciona coluna embedding à tabela memory_contexts
 */
async function addEmbeddingColumn() {
  try {
    log("Verificando se coluna embedding já existe...");

    const { data: columns } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'memory_contexts'
          AND column_name = 'embedding'
        `
      });

    if (columns && columns.length > 0) {
      log("Coluna embedding já existe, pulando criação.", "info");
      return;
    }

    log("Adicionando coluna embedding à tabela memory_contexts...");

    // Usar execute_sql via MCP ou SQL direto
    const alterQuery = `
      ALTER TABLE public.memory_contexts
      ADD COLUMN IF NOT EXISTS embedding vector(${EMBEDDING_DIMENSION});
    `;

    // Como não temos RPC direto, vamos assumir que a coluna será adicionada via migration
    log("⚠️  Execute manualmente no SQL Editor do Supabase:", "warning");
    console.log(alterQuery);
    console.log("");

  } catch (error) {
    log(`Erro ao adicionar coluna: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Busca contextos sem embedding
 */
async function fetchContextsWithoutEmbedding() {
  try {
    const { data, error } = await supabase
      .from("memory_contexts")
      .select("id, title, description, domain, inclusion_rules")
      .is("embedding", null);

    if (error) {
      throw new Error(`Erro ao buscar contextos: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    log(`Erro ao buscar contextos: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Constrói texto representativo do contexto para embedding
 */
function buildContextText(context) {
  const parts = [
    `Título: ${context.title}`,
  ];

  if (context.description) {
    parts.push(`Descrição: ${context.description}`);
  }

  if (context.domain) {
    parts.push(`Domínio: ${context.domain}`);
  }

  // Extrair keywords de inclusion_rules se existirem
  if (Array.isArray(context.inclusion_rules) && context.inclusion_rules.length > 0) {
    const keywords = context.inclusion_rules
      .map(rule => {
        if (typeof rule === 'string') return rule;
        if (rule.keywords) return rule.keywords;
        if (rule.pattern) return rule.pattern;
        return '';
      })
      .filter(Boolean)
      .join(', ');

    if (keywords) {
      parts.push(`Palavras-chave: ${keywords}`);
    }
  }

  return parts.join('\n');
}

/**
 * Gera embedding para um contexto
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: MODEL,
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    log(`Erro ao gerar embedding: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Atualiza contexto com embedding
 */
async function updateContextWithEmbedding(contextId, embedding) {
  try {
    const { error } = await supabase
      .from("memory_contexts")
      .update({ embedding })
      .eq("id", contextId);

    if (error) {
      throw new Error(`Erro ao atualizar contexto: ${error.message}`);
    }
  } catch (error) {
    log(`Erro ao atualizar contexto ${contextId}: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    log("🚀 Iniciando geração de embeddings para contextos...");
    log(`Modelo: ${MODEL} (${EMBEDDING_DIMENSION} dimensões)`);
    console.log("");

    // Passo 1: Garantir que a coluna existe
    await addEmbeddingColumn();

    // Passo 2: Buscar contextos sem embedding
    log("Buscando contextos sem embedding...");
    const contexts = await fetchContextsWithoutEmbedding();

    if (contexts.length === 0) {
      log("✅ Todos os contextos já têm embeddings!", "success");
      return;
    }

    log(`Encontrados ${contexts.length} contextos para processar.`);
    console.log("");

    // Passo 3: Processar cada contexto
    let processed = 0;
    for (const context of contexts) {
      log(`[${processed + 1}/${contexts.length}] Processando: ${context.title}`);

      // Construir texto representativo
      const text = buildContextText(context);
      log(`  Texto: ${text.slice(0, 100)}...`);

      // Gerar embedding
      log(`  Gerando embedding...`);
      const embedding = await generateEmbedding(text);

      // Atualizar no Supabase
      log(`  Salvando embedding no Supabase...`);
      await updateContextWithEmbedding(context.id, embedding);

      processed++;
      log(`  ✓ Concluído!`, "success");

      // Rate limiting: aguardar 1s entre requisições
      if (processed < contexts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("");
    log(`🎉 Processamento concluído! ${processed} contextos com embeddings gerados.`, "success");

    // Passo 4: Criar índice HNSW para busca vetorial
    log("");
    log("⚠️  IMPORTANTE: Crie o índice HNSW no SQL Editor do Supabase:", "warning");
    console.log(`
CREATE INDEX IF NOT EXISTS idx_memory_contexts_embedding_hnsw
  ON public.memory_contexts
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);
    `);

  } catch (error) {
    log(`❌ Erro fatal: ${error.message}`, "error");
    console.error(error);
    process.exit(1);
  }
}

// Executar
main();
