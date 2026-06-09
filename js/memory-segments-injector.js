/**
 * MÓDULO: memory-segments-injector.js
 * RESPONSABILIDADE: Wrapper browser-side para buscar e injetar segmentos de memória pessoal
 * DEPENDÊNCIAS: uberworion-classifier.js (Node.js backend via ipcRenderer/API)
 * EXPORTA: searchMemorySegments, generateEmbedding, formatMemorySegmentsContext
 * ETAPA: 4 - Injetar segmentos de memória nas respostas
 */

/**
 * Wrapper para chamar generateEmbedding no backend (via API/IPC)
 * @param {string} text - Texto a ser vetorizado
 * @returns {Promise<number[] | null>} Embedding ou null se falhar
 */
async function generateEmbedding(text) {
  try {
    // Tentar via Electron IPC se disponível
    if (typeof window !== 'undefined' && window.ipcRenderer && typeof window.ipcRenderer.invoke === 'function') {
      const embedding = await window.ipcRenderer.invoke('generate-embedding', String(text || ''));
      if (Array.isArray(embedding) && embedding.length === 1536) {
        return embedding;
      }
    }

    // Fallback: API HTTP local
    const response = await fetch('http://localhost:3766/api/embedding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text || '').slice(0, 32000) })
    });

    if (!response.ok) {
      console.warn('[MEMORY SEGMENTS] HTTP embedding failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data.embedding) && data.embedding.length === 1536) {
      return data.embedding;
    }

    return null;
  } catch (error) {
    console.warn('[MEMORY SEGMENTS] generateEmbedding error:', error.message);
    return null;
  }
}

/**
 * Busca segmentos de memória similares usando embeddings
 * @param {string} query - Query pessoal
 * @param {number} topK - Número de segmentos a retornar (padrão: 5)
 * @returns {Promise<Array>} Array de segmentos encontrados
 */
async function searchMemorySegments(query, topK = 5) {
  try {
    // Gerar embedding da pergunta
    const embedding = await generateEmbedding(String(query || ''));
    if (!embedding || !Array.isArray(embedding)) {
      console.warn('[MEMORY SEGMENTS] erro ao gerar embedding');
      return [];
    }

    console.log('[MEMORY SEGMENTS] busca iniciada para:', String(query).slice(0, 100));

    // Buscar segmentos similares no Supabase (se disponível)
    const hasSupabase = typeof window !== 'undefined' && window.supabaseClient && typeof window.supabaseClient.rpc === 'function';

    if (!hasSupabase) {
      console.warn('[MEMORY SEGMENTS] Supabase não disponível no navegador, tentando API');
      // Fallback para API HTTP
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch('http://localhost:3766/api/memory-segments-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_embedding: embedding,
          match_threshold: 0.4,
          match_count: topK
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('[MEMORY SEGMENTS] API search failed:', response.statusText);
        return [];
      }

      const data = await response.json();
      const segments = data.segments || data;
      if (!Array.isArray(segments) || segments.length === 0) {
        console.log('[MEMORY SEGMENTS] nenhum segmento encontrado');
        return [];
      }

      console.log('[MEMORY SEGMENTS] encontrados:', segments.length, 'segmentos');
      return segments.map(row => ({
        id: row.id,
        title: row.segment_title || 'Segmento de memória',
        summary: row.segment_summary || row.content || '',
        similarity: row.similarity || 0,
        conversationId: row.conversation_id,
        timestamp: row.created_at
      }));
    }

    // Usar RPC do Supabase diretamente no navegador
    const { data, error } = await window.supabaseClient.rpc('search_similar_conversation_segments', {
      query_embedding: embedding,
      match_threshold: 0.4,
      match_count: topK
    });

    if (error) {
      console.warn('[MEMORY SEGMENTS] erro na RPC:', error.message);
      return [];
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.log('[MEMORY SEGMENTS] nenhum segmento encontrado');
      return [];
    }

    console.log('[MEMORY SEGMENTS] encontrados:', data.length, 'segmentos');

    return data.map(row => ({
      id: row.id,
      title: row.segment_title || 'Segmento de memória',
      summary: row.segment_summary || row.content || '',
      similarity: row.similarity || 0,
      conversationId: row.conversation_id,
      timestamp: row.created_at
    }));

  } catch (error) {
    console.error('[MEMORY SEGMENTS] erro durante busca:', error.message);
    return [];
  }
}

/**
 * Formata array de segmentos como contexto para o prompt
 * @param {Array} segments - Array de segmentos
 * @returns {string} Bloco de contexto formatado
 */
function formatMemorySegmentsContext(segments = []) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return '';
  }

  const lines = [
    '[MEMORY SEGMENTS - Contexto Pessoal Relevante]',
    ''
  ];

  segments.forEach((segment, index) => {
    lines.push(`${index + 1}. ${segment.title}`);
    lines.push(`   Relevância: ${(segment.similarity * 100).toFixed(0)}%`);
    if (segment.summary) {
      lines.push(`   Contexto: ${String(segment.summary).slice(0, 300)}${String(segment.summary).length > 300 ? '...' : ''}`);
    }
    lines.push('');
  });

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

async function getMemorySearchAnswer(query, topK = 5) {
  try {
    console.log('[MEMORY SEARCH ANSWER] iniciando resposta para:', String(query).slice(0, 80));

    // Buscar segmentos de memória
    const segments = await searchMemorySegments(query, topK);
    if (!Array.isArray(segments) || segments.length === 0) {
      console.log('[MEMORY SEARCH ANSWER] nenhum segmento encontrado');
      return null;
    }

    // Chamar endpoint de resposta no backend
    const response = await fetch('http://localhost:3766/api/memory-search-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: String(query || '').slice(0, 500),
        segments: segments,
        model: 'gpt-5.4-nano'
      })
    });

    if (!response.ok) {
      console.warn('[MEMORY SEARCH ANSWER] API failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    if (!data.ok || !data.answer) {
      console.warn('[MEMORY SEARCH ANSWER] inválida resposta:', data.error);
      return null;
    }

    console.log('[MEMORY SEARCH ANSWER] resposta gerada:', {
      answerLen: data.answer.length,
      segmentsUsed: data.segmentsUsed,
      model: data.model
    });

    return data.answer;
  } catch (error) {
    console.error('[MEMORY SEARCH ANSWER] erro:', error.message);
    return null;
  }
}

// Expor globalmente
if (typeof window !== 'undefined') {
  window.generateEmbedding = generateEmbedding;
  window.searchMemorySegments = searchMemorySegments;
  window.formatMemorySegmentsContext = formatMemorySegmentsContext;
  window.getMemorySearchAnswer = getMemorySearchAnswer;
}
