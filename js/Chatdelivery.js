/**
 * ChatDelivery: entrega contexto de Memory Card da vault local para o chat.
 * Nao classifica chunks, nao cria cards e nao altera schema; apenas le vinculos existentes.
 */
(function initChatDelivery() {
  const fs = typeof require === 'function' ? require('fs') : null;
  const path = typeof require === 'function' ? require('path') : null;

  function cleanId(value) {
    return String(value || '').trim();
  }

  function uniqueValues(values = []) {
    return [...new Set(values.map(cleanId).filter(Boolean))];
  }

  function postgrestIn(values = []) {
    const ids = uniqueValues(values).slice(0, 250);
    return ids.length ? `in.(${ids.join(',')})` : '';
  }

  function parseJsonObject(value) {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  }

  function getCacheDir() {
    if (!fs || !path) return '';
    const override = window.__CHAT_DELIVERY_CACHE_DIR || window.WORION_DATA_DIR || (typeof process !== 'undefined' ? process.env.WORION_DATA_DIR : '');
    if (override) return path.join(String(override), 'memory-card-delivery');
    const appData = typeof process !== 'undefined' ? process.env.APPDATA : '';
    if (appData) return path.join(appData, 'Worion', 'memory-card-delivery');
    const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.';
    return path.join(cwd, 'data', 'memory-card-delivery');
  }

  function safeCacheFileName(cardId) {
    return `${cleanId(cardId).replace(/[^a-z0-9_-]/gi, '_')}.json`;
  }

  function getCachePath(cardId) {
    const cacheDir = getCacheDir();
    return cacheDir && path ? path.join(cacheDir, safeCacheFileName(cardId)) : '';
  }

  function readLocalMemoryCard(cardId) {
    if (!fs || !path) return null;
    const cachePath = getCachePath(cardId);
    if (!cachePath || !fs.existsSync(cachePath)) return null;
    try {
      const payload = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      const text = String(payload?.text || '').trim();
      if (!text) return null;
      console.log('[CHAT DELIVERY] local memory loaded:', {
        cardId: cleanId(cardId),
        textLength: text.length,
        source: payload.source || 'local-cache'
      });
      return {
        ...payload,
        text,
        source: payload.source || 'local-cache'
      };
    } catch (error) {
      console.warn('[CHAT DELIVERY] local memory read failed:', { cardId: cleanId(cardId), error: error.message });
      return null;
    }
  }

  function writeLocalMemoryCard(cardId, text, metadata = {}) {
    if (!fs || !path) return null;
    const cleanCardId = cleanId(cardId);
    const cleanText = String(text || '').trim();
    if (!cleanCardId || !cleanText) return null;
    const cacheDir = getCacheDir();
    const cachePath = getCachePath(cleanCardId);
    if (!cacheDir || !cachePath) return null;
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
      const payload = {
        cardId: cleanCardId,
        text: cleanText,
        source: metadata.source || 'local-cache',
        title: metadata.title || '',
        conversationCount: Number(metadata.conversationCount || 0),
        chunkCount: Number(metadata.chunkCount || 0),
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2), 'utf-8');
      console.log('[CHAT DELIVERY] local memory saved:', {
        cardId: cleanCardId,
        textLength: cleanText.length,
        source: payload.source
      });
      return payload;
    } catch (error) {
      console.warn('[CHAT DELIVERY] local memory write failed:', { cardId: cleanCardId, error: error.message });
      return null;
    }
  }

  async function fetchVaultRows(table, params = {}) {
    if (typeof window.worionApiContextCardsFetchRows !== 'function') return [];
    try {
      return await window.worionApiContextCardsFetchRows(table, params);
    } catch (error) {
      console.warn('[CHAT DELIVERY] vault read failed:', { table, error: error.message });
      return [];
    }
  }

  function sourceConversationId(source = {}) {
    const metadata = parseJsonObject(source.metadata);
    return source.conversation_id ||
      metadata.conversation_id ||
      metadata.conversationId ||
      (/^[0-9a-f-]{20,}$/i.test(String(source.source_ref || '')) ? source.source_ref : '');
  }

  function buildConversationBlock(conversations = [], chunks = []) {
    const conversationById = new Map((conversations || []).map(row => [String(row.id), row]));
    const groups = new Map();
    for (const chunk of chunks || []) {
      const conversationId = String(chunk.conversation_id || 'sem-conversa');
      if (!groups.has(conversationId)) groups.set(conversationId, []);
      groups.get(conversationId).push(chunk);
    }

    const chunkBlocks = [...groups.entries()].slice(0, 12).map(([conversationId, rows], index) => {
      const conversation = conversationById.get(conversationId) || {};
      const transcript = rows
        .sort((a, b) => Number(a.chunk_index || 0) - Number(b.chunk_index || 0))
        .slice(0, 90)
        .map(chunk => `[${chunk.chunk_index ?? ''}] ${chunk.role || 'memoria'}: ${String(chunk.content || '').trim()}`)
        .filter(Boolean)
        .join('\n')
        .slice(0, 10000);
      return [
        `## Conversa vinculada ${index + 1}: ${conversation.title || conversation.summary || conversationId}`,
        conversation.summary ? `Resumo: ${conversation.summary}` : '',
        transcript
      ].filter(Boolean).join('\n');
    });

    const conversationOnly = (conversations || [])
      .filter(row => !groups.has(String(row.id)))
      .slice(0, Math.max(0, 12 - chunkBlocks.length))
      .map((row, index) => [
        `## Conversa vinculada ${chunkBlocks.length + index + 1}: ${row.title || row.id}`,
        row.summary ? `Resumo: ${row.summary}` : ''
      ].filter(Boolean).join('\n'));

    return [...chunkBlocks, ...conversationOnly].filter(Boolean).join('\n\n---\n\n').slice(0, 60000);
  }

  function updateCardInMemory(cardId, deliveredText) {
    if (!Array.isArray(window.memoryCardsV2)) return;
    window.memoryCardsV2 = window.memoryCardsV2.map(card => {
      const raw = card.raw || {};
      const ids = [card.id, raw.id, card.slug, raw.slug].map(cleanId);
      if (!ids.includes(cleanId(cardId))) return card;
      const metadata = parseJsonObject(raw.metadata);
      const semanticInstructions = {
        ...(metadata.semanticInstructions || {}),
        consumeMarkdown: deliveredText
      };
      return {
        ...card,
        semanticInstructions,
        instructions: deliveredText,
        raw: {
          ...raw,
          metadata: {
            ...metadata,
            semanticInstructions,
            updatedAt: new Date().toISOString()
          }
        }
      };
    });
  }

  function memoryCardMatches(card, cardId) {
    const raw = card?.raw || {};
    return [card?.id, raw.id, card?.slug, raw.slug, card?.key]
      .map(cleanId)
      .includes(cleanId(cardId));
  }

  function findCardInMemory(cardId) {
    if (!Array.isArray(window.memoryCardsV2)) return null;
    return window.memoryCardsV2.find(card => memoryCardMatches(card, cardId)) || null;
  }

  function getSemanticInstructionsText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      return value.consumeMarkdown || value.consume_markdown || value.text || value.markdown || '';
    }
    return '';
  }

  function getCardFallbackText(cardId) {
    const card = findCardInMemory(cardId);
    if (!card) return '';
    const raw = card.raw || {};
    const metadata = parseJsonObject(raw.metadata);
    const candidates = [
      getSemanticInstructionsText(card.semanticInstructions),
      card.instructions,
      getSemanticInstructionsText(metadata.semanticInstructions),
      raw.semantic_instructions,
      raw.instructions,
      raw.card_scope,
      card.content,
      raw.content,
      card.summary,
      raw.summary,
      card.description,
      raw.description
    ];
    return candidates.map(value => String(value || '').trim()).find(Boolean) || '';
  }

  function buildDeliveryResult(cardId, text, metadata = {}) {
    const cleanCardId = cleanId(cardId);
    const cleanText = String(text || '').trim();
    if (cleanText) updateCardInMemory(cleanCardId, cleanText);
    const result = {
      ok: Boolean(cleanText),
      cardId: cleanCardId,
      text: cleanText,
      source: metadata.source || '',
      conversationCount: Number(metadata.conversationCount || 0),
      chunkCount: Number(metadata.chunkCount || 0)
    };
    console.log('[CHAT DELIVERY] delivered memory card:', {
      cardId: result.cardId,
      ok: result.ok,
      source: result.source,
      conversationCount: result.conversationCount,
      chunkCount: result.chunkCount,
      textLength: result.text.length
    });
    return result;
  }

  async function deliverMemoryCard(cardId) {
    const cleanCardId = cleanId(cardId);
    if (!cleanCardId) return { ok: false, text: '', cardId: cleanCardId };

    const cached = readLocalMemoryCard(cleanCardId);
    if (cached?.text) {
      return buildDeliveryResult(cleanCardId, cached.text, {
        source: cached.source || 'local-cache',
        conversationCount: cached.conversationCount,
        chunkCount: cached.chunkCount
      });
    }

    const [sources, bindings] = await Promise.all([
      fetchVaultRows('memory_card_sources_v2', {
        select: '*',
        card_id: `eq.${cleanCardId}`,
        limit: '1000'
      }),
      fetchVaultRows('conversation_memory_bindings', {
        select: '*',
        card_id: `eq.${cleanCardId}`,
        limit: '1000'
      })
    ]);

    const chunkIds = uniqueValues((sources || []).map(source => source.chunk_id));
    let conversationIds = uniqueValues([
      ...(bindings || []).map(binding => binding.conversation_id),
      ...(sources || []).map(sourceConversationId)
    ]);

    let chunks = [];
    if (chunkIds.length) {
      chunks = await fetchVaultRows('memory_chunks', {
        select: 'id,conversation_id,source_id,chunk_index,role,content,metadata,created_at',
        id: postgrestIn(chunkIds),
        order: 'chunk_index.asc',
        limit: '5000'
      });
      conversationIds = uniqueValues([...conversationIds, ...chunks.map(chunk => chunk.conversation_id)]);
    }

    if (conversationIds.length) {
      const conversationChunks = await fetchVaultRows('memory_chunks', {
        select: 'id,conversation_id,source_id,chunk_index,role,content,metadata,created_at',
        conversation_id: postgrestIn(conversationIds),
        order: 'chunk_index.asc',
        limit: '5000'
      });
      const byChunkId = new Map([...chunks, ...conversationChunks].map(chunk => [
        String(chunk.id || `${chunk.conversation_id}:${chunk.chunk_index}`),
        chunk
      ]));
      chunks = [...byChunkId.values()];
    }

    const conversations = conversationIds.length
      ? await fetchVaultRows('memory_conversations', {
        select: 'id,source_id,external_id,title,summary,metadata,updated_at,imported_at',
        id: postgrestIn(conversationIds),
        limit: '500'
      })
      : [];

    const text = buildConversationBlock(conversations, chunks);
    if (text) {
      writeLocalMemoryCard(cleanCardId, text, {
        source: 'vault',
        conversationCount: uniqueValues([...conversationIds, ...chunks.map(chunk => chunk.conversation_id)]).length,
        chunkCount: chunks.length,
        title: findCardInMemory(cleanCardId)?.title || ''
      });
    }

    if (text) {
      return buildDeliveryResult(cleanCardId, text, {
        source: 'vault',
        conversationCount: uniqueValues([...conversationIds, ...chunks.map(chunk => chunk.conversation_id)]).length,
        chunkCount: chunks.length
      });
    }

    const fallbackText = getCardFallbackText(cleanCardId);
    if (fallbackText) {
      writeLocalMemoryCard(cleanCardId, fallbackText, {
        source: 'card-fallback',
        title: findCardInMemory(cleanCardId)?.title || ''
      });
      return buildDeliveryResult(cleanCardId, fallbackText, { source: 'card-fallback' });
    }

    return buildDeliveryResult(cleanCardId, '', { source: 'empty' });
  }

  window.ChatDelivery = {
    deliverMemoryCard,
    readLocalMemoryCard,
    saveLocalMemoryCard: writeLocalMemoryCard
  };
})();
