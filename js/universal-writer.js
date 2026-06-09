/**
 * universal-writer.js
 * ---------------------------------------------------------------------------
 * Writer Universal de ingestão de documentos para o Worion Desktop.
 *
 * Responsável por transformar arquivos (MD, TXT, JSON, PDF, MP3/MP4) e objetos
 * de conversa em "segmentos" semânticos (chunks) prontos para indexação na
 * camada de memória.
 *
 * Arquitetura (offline-first):
 *   - Fonte da verdade: JSON local em `data/segments/${conversationId}.json`.
 *   - Supabase (`memory_conversation_segments`): réplica best-effort. Se o
 *     dispositivo estiver offline ou o client não estiver configurado, a
 *     ingestão NÃO falha — apenas registra o estado e segue (graceful
 *     degradation). A reconciliação posterior segue o padrão LWW da memory.js.
 *
 * Dependências (todas já instaladas no projeto):
 *   - @supabase/supabase-js
 *   - pdf-parse
 *   - fs / path (built-in)
 *
 * @module universal-writer
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuração / Constantes
// ---------------------------------------------------------------------------

/** Diretório (relativo à raiz do projeto) onde os segmentos locais são salvos. */
const SEGMENTS_DIR = path.join(__dirname, '..', 'data', 'segments');

/** Tabela do Supabase que replica os segmentos. */
const SUPABASE_TABLE = 'memory_conversation_segments';

/** Tamanho alvo de cada chunk, em tokens aproximados. */
const CHUNK_TARGET_TOKENS = 500;

/** Overlap (sobreposição) entre chunks consecutivos, em tokens aproximados. */
const CHUNK_OVERLAP_TOKENS = 50;

/**
 * Fator de conversão palavra -> token aproximado.
 * Heurística comum: ~1.3 tokens por palavra para texto em PT/EN.
 */
const TOKENS_PER_WORD = 1.3;

/** Extensões suportadas mapeadas para um "formato" lógico. */
const FORMAT_BY_EXT = {
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.txt': 'text',
  '.json': 'json',
  '.pdf': 'pdf',
  '.mp3': 'audio',
  '.wav': 'audio',
  '.m4a': 'audio',
  '.mp4': 'video',
  '.mov': 'video',
  '.webm': 'video',
};

// ---------------------------------------------------------------------------
// Logging helper
// ---------------------------------------------------------------------------

/**
 * Logger leve com prefixo padronizado. Mantém o estilo de debug via console.
 * @param {string} level - 'info' | 'warn' | 'error' | 'debug'
 * @param {string} message - Mensagem principal.
 * @param {...*} args - Argumentos adicionais.
 * @returns {void}
 */
function log(level, message, ...args) {
  const prefix = '[universal-writer]';
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
      ? console.warn
      : console.log;
  fn(`${prefix} ${message}`, ...args);
}

// ---------------------------------------------------------------------------
// Supabase (lazy / best-effort)
// ---------------------------------------------------------------------------

/**
 * Cliente Supabase memoizado. `null` significa "indisponível" (offline ou
 * sem credenciais) e dispara graceful degradation.
 * @type {import('@supabase/supabase-js').SupabaseClient | null | undefined}
 */
let _supabaseClient;

/**
 * Obtém (de forma preguiçosa e tolerante a falhas) o client Supabase.
 *
 * Não lança exceções: qualquer problema (lib ausente, env ausente, falha de
 * import) resulta em `null`, permitindo que a ingestão continue offline.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 *   Client configurado ou `null` se indisponível.
 */
function getSupabaseClient() {
  if (_supabaseClient !== undefined) return _supabaseClient;

  try {
    const url = process.env.SUPABASE_URL || process.env.WORION_SUPABASE_URL;
    const key =
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.WORION_SUPABASE_KEY;

    if (!url || !key) {
      log('warn', 'Supabase não configurado (sem URL/KEY). Modo offline.');
      _supabaseClient = null;
      return _supabaseClient;
    }

    // require dentro do try: se a lib não existir, caímos no catch.
    // eslint-disable-next-line global-require
    const { createClient } = require('@supabase/supabase-js');
    _supabaseClient = createClient(url, key, {
      auth: { persistSession: false },
    });
    log('info', 'Cliente Supabase inicializado.');
  } catch (err) {
    log('warn', 'Falha ao inicializar Supabase, seguindo offline:', err.message);
    _supabaseClient = null;
  }

  return _supabaseClient;
}

// ---------------------------------------------------------------------------
// Utilitários de texto / tokens
// ---------------------------------------------------------------------------

/**
 * Conta tokens aproximados de um trecho de texto.
 * Heurística: número de palavras * TOKENS_PER_WORD, arredondado para cima.
 *
 * @param {string} content - Texto a ser medido.
 * @returns {number} Quantidade aproximada de tokens (>= 0).
 */
function approximateTokenCount(content) {
  if (!content || typeof content !== 'string') return 0;
  const words = content.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  return Math.ceil(words.length * TOKENS_PER_WORD);
}

/**
 * Extrai um título a partir de um bloco de texto.
 *   1. Se houver um heading markdown (#, ##, ...), usa o primeiro encontrado.
 *   2. Caso contrário, usa as primeiras 5 palavras do conteúdo.
 *
 * @param {string} content - Conteúdo do chunk.
 * @returns {string} Título derivado (nunca vazio; fallback 'Sem título').
 */
function extractTitle(content) {
  if (!content || typeof content !== 'string') return 'Sem título';

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.*\S)\s*$/);
    if (headingMatch) {
      return headingMatch[2].trim();
    }
  }

  const words = content.trim().split(/\s+/).filter(Boolean).slice(0, 5);
  const title = words.join(' ').trim();
  return title || 'Sem título';
}

/**
 * Divide um texto longo em janelas de ~CHUNK_TARGET_TOKENS tokens, com
 * overlap de CHUNK_OVERLAP_TOKENS tokens entre janelas consecutivas.
 *
 * O corte é feito por palavras (proxy de tokens). Não quebra em headings —
 * essa responsabilidade é da `chunkText`, que pré-segmenta por seções.
 *
 * @param {string} text - Texto a ser dividido.
 * @returns {string[]} Lista de pedaços de texto (pode ter 1 item).
 */
function splitByTokenWindow(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // Converte alvos de tokens para palavras (dividindo pela heurística).
  const targetWords = Math.max(
    1,
    Math.round(CHUNK_TARGET_TOKENS / TOKENS_PER_WORD)
  );
  const overlapWords = Math.max(
    0,
    Math.round(CHUNK_OVERLAP_TOKENS / TOKENS_PER_WORD)
  );

  // Se cabe em uma única janela, retorna inteiro.
  if (words.length <= targetWords) {
    return [words.join(' ')];
  }

  const chunks = [];
  const step = Math.max(1, targetWords - overlapWords);
  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + targetWords);
    if (slice.length === 0) break;
    chunks.push(slice.join(' '));
    // Última janela atingiu o fim do texto.
    if (start + targetWords >= words.length) break;
  }
  return chunks;
}

/**
 * Pré-segmenta texto por headings markdown de nível 2 (`## ...`) e então
 * aplica a janela de tokens em cada seção. Headings de nível superior ou
 * inferior são preservados dentro das seções.
 *
 * Estratégia:
 *   1. Quebra o documento sempre que encontra uma linha iniciada por `## `.
 *   2. Cada seção (incluindo seu heading) é dividida em janelas de ~500 tokens
 *      com overlap de 50 tokens.
 *
 * @param {string} text - Texto bruto (pode conter markdown).
 * @returns {string[]} Lista de chunks de texto, na ordem do documento.
 */
function chunkText(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split(/\r?\n/);
  /** @type {string[]} */
  const sections = [];
  /** @type {string[]} */
  let current = [];

  for (const line of lines) {
    // Divisor: heading nível 2 (## ...). Inicia nova seção.
    if (/^\s{0,3}##\s+/.test(line) && current.length > 0) {
      sections.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join('\n'));

  // Caso não haja headings, `sections` terá um único item = documento inteiro.
  const chunks = [];
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    const windows = splitByTokenWindow(trimmed);
    for (const w of windows) {
      if (w.trim()) chunks.push(w);
    }
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Extração de texto por formato
// ---------------------------------------------------------------------------

/**
 * Detecta o formato lógico de um arquivo a partir de sua extensão.
 *
 * @param {string} filePath - Caminho do arquivo.
 * @returns {string} Um de: 'markdown' | 'text' | 'json' | 'pdf' | 'audio' |
 *   'video' | 'unknown'.
 */
function detectFormat(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  return FORMAT_BY_EXT[ext] || 'unknown';
}

/**
 * Extrai texto plano de um arquivo de acordo com seu formato.
 *
 * - markdown / text: leitura direta utf-8.
 * - json: leitura + stringify "amigável" (indentado) para preservar conteúdo.
 * - pdf: usa `pdf-parse`.
 * - audio / video: placeholder de transcrição (Whisper).
 *
 * @param {string} filePath - Caminho absoluto/relativo do arquivo.
 * @param {string} format - Formato detectado (ver {@link detectFormat}).
 * @returns {Promise<string>} Texto extraído (pode ser vazio).
 * @throws {Error} Se o formato não for suportado ou a leitura falhar.
 */
async function extractText(filePath, format) {
  switch (format) {
    case 'markdown':
    case 'text': {
      return fs.readFileSync(filePath, 'utf-8');
    }

    case 'json': {
      const raw = fs.readFileSync(filePath, 'utf-8');
      try {
        const parsed = JSON.parse(raw);
        // Serializa de forma legível para chunking textual.
        return JSON.stringify(parsed, null, 2);
      } catch (err) {
        log('warn', `JSON inválido em ${filePath}, usando texto bruto:`, err.message);
        return raw;
      }
    }

    case 'pdf': {
      // eslint-disable-next-line global-require
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data && data.text ? data.text : '';
    }

    case 'audio':
    case 'video': {
      // TODO: integrar whisper — transcrever o áudio/vídeo para texto aqui.
      // Por enquanto, retornamos um placeholder explícito para não quebrar a
      // pipeline e permitir reprocessamento futuro.
      log('warn', `Transcrição não implementada para ${format}: ${filePath}`);
      return `[TODO: transcrição Whisper pendente para ${path.basename(filePath)}]`;
    }

    default:
      throw new Error(`Formato não suportado: ${format} (${filePath})`);
  }
}

// ---------------------------------------------------------------------------
// Construção de segmentos
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Segment
 * @property {string} id - Identificador único do segmento.
 * @property {string} conversationId - Conversa/documento de origem.
 * @property {string|null} userId - Dono do segmento.
 * @property {string|null} sourceId - Fonte (arquivo, conector, etc.).
 * @property {number} index - Ordem do segmento dentro da origem (0-based).
 * @property {string} title - Título derivado do chunk.
 * @property {string} content - Texto do chunk.
 * @property {string|null} summary - Resumo (preenchido por LLM no futuro).
 * @property {string[]} keywords - Palavras-chave (preenchidas por LLM no futuro).
 * @property {number} tokenCount - Contagem aproximada de tokens.
 * @property {string} format - Formato lógico de origem.
 * @property {number} updatedAt - Epoch ms (usado para LWW).
 */

/**
 * Gera um id estável-ish para o segmento. Combina conversationId + índice +
 * timestamp para evitar colisões em reprocessamentos concorrentes.
 *
 * @param {string} conversationId - Id da conversa/documento.
 * @param {number} index - Índice do segmento.
 * @returns {string} Identificador do segmento.
 */
function buildSegmentId(conversationId, index) {
  return `${conversationId}::seg-${index}`;
}

/**
 * Constrói um objeto de segmento a partir de um chunk de texto.
 *
 * @param {Object} params - Parâmetros.
 * @param {string} params.content - Texto do chunk.
 * @param {number} params.index - Índice do chunk.
 * @param {string} params.conversationId - Conversa/documento de origem.
 * @param {string|null} params.userId - Dono.
 * @param {string|null} params.sourceId - Fonte.
 * @param {string} params.format - Formato lógico.
 * @returns {Segment} Segmento normalizado.
 */
function buildSegment({ content, index, conversationId, userId, sourceId, format }) {
  const cleaned = String(content || '').trim();
  return {
    id: buildSegmentId(conversationId, index),
    conversationId,
    userId: userId || null,
    sourceId: sourceId || null,
    index,
    title: extractTitle(cleaned),
    content: cleaned,
    // TODO: chamar LLM — gerar resumo conciso do chunk.
    summary: null,
    // TODO: chamar LLM — extrair keywords/entidades relevantes do chunk.
    keywords: [],
    tokenCount: approximateTokenCount(cleaned),
    format,
    updatedAt: Date.now(),
  };
}

/**
 * Converte um texto bruto + metadados em uma lista de segmentos.
 *
 * @param {string} text - Texto extraído.
 * @param {Object} meta - Metadados.
 * @param {string} meta.conversationId - Conversa/documento de origem.
 * @param {string|null} [meta.userId] - Dono.
 * @param {string|null} [meta.sourceId] - Fonte.
 * @param {string} [meta.format='text'] - Formato lógico.
 * @returns {Segment[]} Lista de segmentos.
 */
function buildSegmentsFromText(text, meta) {
  const { conversationId, userId = null, sourceId = null, format = 'text' } = meta;
  const chunks = chunkText(text);
  log('debug', `Gerados ${chunks.length} chunk(s) para ${conversationId}.`);
  return chunks.map((content, index) =>
    buildSegment({ content, index, conversationId, userId, sourceId, format })
  );
}

// ---------------------------------------------------------------------------
// Persistência local (fonte da verdade)
// ---------------------------------------------------------------------------

/**
 * Garante a existência do diretório de segmentos.
 * @returns {void}
 */
function ensureSegmentsDir() {
  try {
    fs.mkdirSync(SEGMENTS_DIR, { recursive: true });
  } catch (err) {
    log('error', 'Falha ao criar diretório de segmentos:', err.message);
    throw err;
  }
}

/**
 * Persiste os segmentos no JSON local — a fonte da verdade.
 *
 * O arquivo é escrito de forma atômica (write em tmp + rename) para evitar
 * corrupção caso o processo seja interrompido no meio da escrita.
 *
 * @param {string} conversationId - Identificador da conversa/documento.
 * @param {Segment[]} segments - Segmentos a salvar.
 * @returns {string} Caminho do arquivo salvo.
 * @throws {Error} Se a escrita falhar.
 */
function saveSegmentsLocal(conversationId, segments) {
  ensureSegmentsDir();
  const finalPath = path.join(SEGMENTS_DIR, `${conversationId}.json`);
  const tmpPath = `${finalPath}.tmp`;

  const payload = {
    conversationId,
    updatedAt: Date.now(),
    count: segments.length,
    segments,
  };

  try {
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tmpPath, finalPath);
    log('info', `Segmentos salvos localmente: ${finalPath} (${segments.length}).`);
    return finalPath;
  } catch (err) {
    log('error', `Falha ao salvar segmentos locais para ${conversationId}:`, err.message);
    // Limpa tmp órfão, se existir.
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_) {
      /* ignore */
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Persistência remota (réplica best-effort)
// ---------------------------------------------------------------------------

/**
 * Mapeia um Segment interno para a linha esperada pela tabela do Supabase.
 *
 * @param {Segment} seg - Segmento interno.
 * @returns {Object} Linha pronta para INSERT/upsert.
 */
function toSupabaseRow(seg) {
  return {
    id: seg.id,
    conversation_id: seg.conversationId,
    user_id: seg.userId,
    source_id: seg.sourceId,
    segment_index: seg.index,
    segment_title: seg.title,
    content: seg.content,
    segment_summary: seg.summary,
    keywords: seg.keywords,
    token_count: seg.tokenCount,
    metadata: { format: seg.format },
    updated_at: new Date(seg.updatedAt).toISOString(),
  };
}

/**
 * Replica segmentos no Supabase (best-effort). Nunca lança — qualquer falha é
 * registrada e devolvida no objeto de resultado para graceful degradation.
 *
 * Usa upsert em `id` para manter idempotência no padrão LWW: reprocessar a
 * mesma conversa sobrescreve as linhas correspondentes.
 *
 * @param {Segment[]} segments - Segmentos a replicar.
 * @returns {Promise<{ ok: boolean, synced: number, reason?: string }>}
 *   Resultado da replicação.
 */
async function replicateToSupabase(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return { ok: true, synced: 0 };
  }

  const client = getSupabaseClient();
  if (!client) {
    log('warn', 'Supabase indisponível — segmentos mantidos apenas localmente.');
    return { ok: false, synced: 0, reason: 'supabase_unavailable' };
  }

  try {
    const rows = segments.map(toSupabaseRow);
    const { error } = await client
      .from(SUPABASE_TABLE)
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      log('warn', 'Erro ao replicar para Supabase:', error.message);
      return { ok: false, synced: 0, reason: error.message };
    }

    log('info', `Replicados ${rows.length} segmento(s) para Supabase.`);
    return { ok: true, synced: rows.length };
  } catch (err) {
    // Falhas de rede (offline) caem aqui — degradação graciosa.
    log('warn', 'Exceção ao replicar para Supabase (seguindo offline):', err.message);
    return { ok: false, synced: 0, reason: err.message };
  }
}

// ---------------------------------------------------------------------------
// Pipeline comum de persistência + stats
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} IngestStats
 * @property {string} conversationId - Conversa/documento ingerido.
 * @property {number} segmentCount - Número de segmentos gerados.
 * @property {number} totalTokens - Soma aproximada de tokens.
 * @property {string} format - Formato de origem.
 * @property {string} localPath - Caminho do JSON local salvo.
 * @property {boolean} supabaseSynced - Se replicou no Supabase.
 * @property {string} [supabaseReason] - Motivo de não-replicação (se houver).
 * @property {number} durationMs - Duração total da ingestão.
 */

/**
 * Finaliza a ingestão: salva local (obrigatório) e replica no Supabase
 * (best-effort). Centraliza a lógica compartilhada por `ingestFile` e
 * `ingestConversation`.
 *
 * @param {Segment[]} segments - Segmentos gerados.
 * @param {Object} ctx - Contexto.
 * @param {string} ctx.conversationId - Conversa/documento.
 * @param {string} ctx.format - Formato de origem.
 * @param {number} ctx.startedAt - Epoch ms de início (para duração).
 * @returns {Promise<{ segments: Segment[], stats: IngestStats }>}
 *   Resultado padronizado da ingestão.
 */
async function persistAndSummarize(segments, ctx) {
  const { conversationId, format, startedAt } = ctx;

  // 1) Local = fonte da verdade (lança se falhar).
  const localPath = saveSegmentsLocal(conversationId, segments);

  // 2) Supabase = réplica best-effort (não lança).
  const replication = await replicateToSupabase(segments);

  const totalTokens = segments.reduce((sum, s) => sum + (s.tokenCount || 0), 0);

  /** @type {IngestStats} */
  const stats = {
    conversationId,
    segmentCount: segments.length,
    totalTokens,
    format,
    localPath,
    supabaseSynced: replication.ok && replication.synced > 0,
    durationMs: Date.now() - startedAt,
  };
  if (!replication.ok) stats.supabaseReason = replication.reason;

  log(
    'info',
    `Ingestão concluída: ${conversationId} → ${segments.length} segmento(s), ` +
      `${totalTokens} tokens, supabase=${stats.supabaseSynced}, ${stats.durationMs}ms.`
  );

  return { segments, stats };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Ingere um arquivo: detecta formato, extrai texto, chunkeia e persiste.
 *
 * @param {string} filePath - Caminho do arquivo a ingerir.
 * @param {Object} [options] - Opções de ingestão.
 * @param {string} [options.userId] - Dono dos segmentos.
 * @param {string} [options.sourceId] - Identificador da fonte. Default: nome
 *   do arquivo.
 * @param {string} [options.conversationId] - Id da conversa/documento alvo.
 *   Default: nome do arquivo sem extensão.
 * @returns {Promise<{ segments: Segment[], stats: IngestStats }>}
 *   Segmentos gerados e estatísticas.
 * @throws {Error} Se o arquivo não existir, formato não suportado ou a escrita
 *   local falhar.
 *
 * @example
 *   const { segments, stats } = await ingestFile('./docs/notas.md', {
 *     userId: 'u1',
 *   });
 */
async function ingestFile(filePath, options = {}) {
  const startedAt = Date.now();

  if (!filePath || typeof filePath !== 'string') {
    throw new Error('ingestFile: filePath é obrigatório (string).');
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`ingestFile: arquivo não encontrado: ${filePath}`);
  }

  const baseName = path.basename(filePath);
  const conversationId =
    options.conversationId || path.basename(filePath, path.extname(filePath));
  const sourceId = options.sourceId || baseName;
  const userId = options.userId || null;

  const format = detectFormat(filePath);
  log('info', `Ingerindo arquivo: ${baseName} (formato=${format}).`);

  if (format === 'unknown') {
    throw new Error(`ingestFile: extensão não suportada para ${baseName}.`);
  }

  const text = await extractText(filePath, format);
  if (!text || !text.trim()) {
    log('warn', `Nenhum texto extraído de ${baseName}; gerando 0 segmentos.`);
  }

  const segments = buildSegmentsFromText(text, {
    conversationId,
    userId,
    sourceId,
    format,
  });

  return persistAndSummarize(segments, { conversationId, format, startedAt });
}

/**
 * Ingere um objeto de conversa do Worion: concatena as mensagens em um texto
 * e aplica o mesmo pipeline de chunking/persistência.
 *
 * Cada mensagem é prefixada com seu papel (role) para preservar contexto e é
 * formatada como um heading markdown leve, ajudando o chunker por seção.
 *
 * @param {Object} conversationObj - Objeto de conversa.
 * @param {string} conversationObj.id - Id da conversa.
 * @param {Array<{ role?: string, content?: string, text?: string }>} conversationObj.messages
 *   Mensagens da conversa.
 * @param {Object} [options] - Opções de ingestão.
 * @param {string} [options.userId] - Dono dos segmentos.
 * @param {string} [options.sourceId] - Fonte. Default: 'conversation'.
 * @param {string} [options.conversationId] - Sobrescreve `conversationObj.id`.
 * @returns {Promise<{ segments: Segment[], stats: IngestStats }>}
 *   Segmentos gerados e estatísticas.
 * @throws {Error} Se o objeto de conversa for inválido ou a escrita local
 *   falhar.
 *
 * @example
 *   await ingestConversation(
 *     { id: 'conv-1', messages: [{ role: 'user', content: 'Olá' }] },
 *     { userId: 'u1' }
 *   );
 */
async function ingestConversation(conversationObj, options = {}) {
  const startedAt = Date.now();

  if (!conversationObj || typeof conversationObj !== 'object') {
    throw new Error('ingestConversation: conversationObj é obrigatório (objeto).');
  }

  const conversationId = options.conversationId || conversationObj.id;
  if (!conversationId) {
    throw new Error('ingestConversation: conversationObj.id (ou options.conversationId) é obrigatório.');
  }

  const messages = Array.isArray(conversationObj.messages)
    ? conversationObj.messages
    : [];
  const userId = options.userId || null;
  const sourceId = options.sourceId || 'conversation';
  const format = 'conversation';

  log('info', `Ingerindo conversa: ${conversationId} (${messages.length} msg).`);

  // Concatena mensagens em um documento. Headings (##) por mensagem ajudam o
  // chunker a respeitar fronteiras semânticas.
  const text = messages
    .map((m, i) => {
      const role = (m && m.role) || 'message';
      const body = (m && (m.content || m.text)) || '';
      const content = typeof body === 'string' ? body : JSON.stringify(body);
      return `## ${role} #${i + 1}\n\n${content}`;
    })
    .join('\n\n');

  if (!text.trim()) {
    log('warn', `Conversa ${conversationId} sem conteúdo textual.`);
  }

  const segments = buildSegmentsFromText(text, {
    conversationId,
    userId,
    sourceId,
    format,
  });

  return persistAndSummarize(segments, { conversationId, format, startedAt });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // API pública
  ingestFile,
  ingestConversation,

  // Utilitários expostos para testes / reuso
  detectFormat,
  extractText,
  chunkText,
  extractTitle,
  approximateTokenCount,
  buildSegmentsFromText,
  saveSegmentsLocal,
  replicateToSupabase,
};
