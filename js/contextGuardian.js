/**
 * MODULO: contextGuardian.js
 * RESPONSABILIDADE: Indexacao silenciosa de contexto conversacional em memoria interna
 * DEPENDENCIAS: connectors.js, app.js, chat.js
 * EXPORTA: queueContextIndexing, runContextGuardian, saveInternalMemory, searchInternalMemory
 * TOOLS REGISTRADAS: nenhuma
 */

const INTERNAL_MEMORY_TABLE = 'worion_internal_memory';
const SEMANTIC_MEMORY_SOURCES = ['claude', 'worion-doc'];
const SEMANTIC_VOCABULARY_PATHS = ['data/semantic-vocabulary.json', '../data/semantic-vocabulary.json'];
let contextGuardianQueue = Promise.resolve();
let semanticVocabularyCache = null;

function getInternalMemorySearchTerms(query) {
  return [...new Set(String(query || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map(term => term.trim())
    .filter(term => term.length >= 3)
    .slice(0, 8))];
}

function getSemanticVocabulary() {
  if (semanticVocabularyCache !== null) return semanticVocabularyCache;
  semanticVocabularyCache = null;
  try {
    const fsSync = require('fs');
    const pathSync = require('path');
    const sourcePath = SEMANTIC_VOCABULARY_PATHS
      .map(relative => pathSync.resolve(__dirname, relative))
      .find(candidate => fsSync.existsSync(candidate));
    if (!sourcePath) return null;
    semanticVocabularyCache = JSON.parse(fsSync.readFileSync(sourcePath, 'utf-8'));
  } catch (error) {
    console.warn('[ContextGuardian] vocabulario semantico indisponivel:', error.message);
  }
  return semanticVocabularyCache;
}

function getVocabularyEntries(vocabulary) {
  return [
    ...(vocabulary?.vocabulary?.global_terms || []).map(item => item.term),
    ...(vocabulary?.vocabulary?.global_phrases || []).map(item => item.term),
    ...(vocabulary?.vocabulary?.domain_hints || [])
  ].filter(Boolean);
}

function expandSemanticSearchTerms(query) {
  const baseTerms = getInternalMemorySearchTerms(query);
  const normalizedQuery = String(query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const vocabulary = getSemanticVocabulary();
  const vocabularyTerms = getVocabularyEntries(vocabulary);
  const matched = vocabularyTerms.filter(term => {
    const normalizedTerm = String(term || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!normalizedTerm || normalizedTerm.length < 4) return false;
    return normalizedQuery.includes(normalizedTerm) || baseTerms.some(base => normalizedTerm.includes(base) || base.includes(normalizedTerm));
  });

  const domainFallbacks = [];
  if (/\b(worion|agente|memoria|prompt|modelo|desktop|sistema)\b/i.test(query)) {
    domainFallbacks.push('worion', 'agente', 'memoria', 'prompt', 'arquitetura', 'continuidade', 'identidade');
  }
  if (/\b(workestria|shopify|bling|catalogo|n8n|workflow|automacao)\b/i.test(query)) {
    domainFallbacks.push('workestria', 'shopify', 'bling', 'catalogo', 'workflow', 'automacao');
  }
  if (/\b(tdah|adhd|foco|hiperfoco|carga|execucao|cansaco)\b/i.test(query)) {
    domainFallbacks.push('tdah', 'hiperfoco', 'carga executiva', 'foco', 'continuidade');
  }

  return [...new Set([...baseTerms, ...matched, ...domainFallbacks])]
    .filter(term => String(term || '').trim().length >= 3)
    .slice(0, 12);
}

function memoryChunkSnippet(content, query, radius = 260) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  const terms = expandSemanticSearchTerms(query);
  const lower = text.toLowerCase();
  const found = terms
    .map(term => lower.indexOf(String(term).toLowerCase()))
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0];
  if (found === undefined) return text.slice(0, radius * 2);
  const start = Math.max(0, found - radius);
  const end = Math.min(text.length, found + radius);
  return `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`;
}

function scoreImportedMemoryRow(row, terms) {
  const content = String(row.content || '').toLowerCase();
  let score = row.source_id === 'worion-doc' ? 2 : 1;
  for (const term of terms) {
    const clean = String(term || '').toLowerCase();
    if (!clean) continue;
    const matches = content.match(new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    if (matches) score += Math.min(matches.length, 6);
  }
  return score;
}

function isMemoryAtomQuery(query = '') {
  const text = normalizeMemoryCardMatchText(query);
  return /\b(quem sou eu|perfil|identidade|sobre mim|como gosto|preferencia|preferencias|estilo|decisao sobre|decidimos|regra|tdah|diagnostico|saude|padrao|sempre faco|nunca)\b/i.test(text);
}

function isConversationNarrativeQuery(query = '') {
  const text = normalizeMemoryCardMatchText(query);
  return /\b(ontem|semana passada|ultima vez|onde paramos|continuidade|sessao|sessoes|conversa anterior|historico|o que aconteceu)\b/i.test(text);
}

function scoreMemoryAtomRow(row, terms) {
  const haystack = [
    row.type,
    row.title,
    row.content,
    row.retrieval_text,
    ...(Array.isArray(row.keywords) ? row.keywords : []),
    ...(Array.isArray(row.entities) ? row.entities : [])
  ].join(' ').toLowerCase();
  let score = Number(row.importance || 3) + Number(row.confidence || 0.8);
  for (const term of terms) {
    const clean = String(term || '').toLowerCase();
    if (!clean) continue;
    if (haystack.includes(clean)) score += clean.length > 8 ? 2 : 1;
  }
  if (isMemoryAtomQuery(terms.join(' '))) score += 2;
  return score;
}

async function searchMemoryAtoms(query, options = {}) {
  const terms = expandSemanticSearchTerms(query);
  if (!terms.length) return '';

  const rowsById = new Map();
  const limit = Math.max(5, Math.min(Number(options.limit || 10), 20));
  const typeFilter = Array.isArray(options.types) && options.types.length
    ? options.types.map(type => String(type || '').trim()).filter(Boolean)
    : [];

  for (const term of terms.slice(0, 8)) {
    try {
      const safeTerm = String(term || '').replace(/\*/g, '').replace(/[(),]/g, ' ').trim();
      if (!safeTerm) continue;
      const url = new URL(`${MEMORY_SUPABASE_URL}/rest/v1/memory_atoms_v1`);
      url.searchParams.set('select', 'id,card_id,conversation_id,type,title,content,retrieval_text,keywords,entities,source_chunk_ids,importance,confidence,created_at');
      url.searchParams.set('status', 'eq.active');
      url.searchParams.set('user_id', 'eq.local-user');
      url.searchParams.set('or', `(title.ilike.*${safeTerm}*,content.ilike.*${safeTerm}*,retrieval_text.ilike.*${safeTerm}*)`);
      if (typeFilter.length) url.searchParams.set('type', `in.(${typeFilter.join(',')})`);
      url.searchParams.set('order', 'importance.desc');
      url.searchParams.set('limit', String(limit));

      const response = await fetch(url.toString(), { headers: memorySupabaseHeaders() });
      const text = await response.text();
      if (!response.ok) throw new Error(`memory_atoms_v1 ${response.status}: ${text.slice(0, 120)}`);
      for (const row of JSON.parse(text || '[]')) rowsById.set(row.id, row);
    } catch (error) {
      console.warn('[ContextGuardian] memory_atoms_v1 indisponivel:', error.message);
    }
  }

  const rows = [...rowsById.values()]
    .map(row => ({ ...row, score: scoreMemoryAtomRow(row, terms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!rows.length) return '';

  const atomsBlock = rows.map(row => [
    `- [${row.type}] ${row.title || 'Memory Atom'}`,
    row.content ? `  Memoria: ${String(row.content).slice(0, 700)}` : '',
    Array.isArray(row.keywords) && row.keywords.length ? `  Keywords: ${row.keywords.slice(0, 8).join(', ')}` : '',
    Array.isArray(row.source_chunk_ids) && row.source_chunk_ids.length ? `  Source chunks: ${row.source_chunk_ids.slice(0, 6).join(', ')}` : '',
    `  Confianca: ${Number(row.confidence || 0).toFixed(2)}; importancia: ${row.importance || 3}`
  ].filter(Boolean).join('\n')).join('\n');

  return `Memory Atoms V1 (memorias semanticas atomicas):\n${atomsBlock}`;
}

async function searchImportedSemanticMemory(query) {
  const terms = expandSemanticSearchTerms(query);
  if (!terms.length) return '';
  const rowsByKey = new Map();

  for (const sourceId of SEMANTIC_MEMORY_SOURCES) {
    for (const term of terms.slice(0, 8)) {
      try {
        const url = new URL(`${MEMORY_SUPABASE_URL}/rest/v1/memory_chunks`);
        url.searchParams.set('select', 'conversation_id,source_id,chunk_index,role,content,created_at');
        url.searchParams.set('source_id', `eq.${sourceId}`);
        url.searchParams.set('user_id', 'eq.local-user');
        url.searchParams.set('content', `ilike.*${String(term).replace(/\*/g, '')}*`);
        url.searchParams.set('order', 'created_at.desc');
        url.searchParams.set('limit', '5');
        const response = await fetch(url.toString(), { headers: memorySupabaseHeaders() });
        const text = await response.text();
        if (!response.ok) throw new Error(`memory_chunks ${response.status}: ${text.slice(0, 120)}`);
        const rows = JSON.parse(text || '[]');
        for (const row of rows) {
          const key = `${row.conversation_id}:${row.chunk_index}`;
          rowsByKey.set(key, row);
        }
      } catch (error) {
        console.warn('[ContextGuardian] busca em memory_chunks indisponivel:', error.message);
      }
    }
  }

  const scoredRows = [...rowsByKey.values()]
    .map(row => ({ ...row, score: scoreImportedMemoryRow(row, terms) }))
    .sort((a, b) => b.score - a.score);
  const balancedRows = SEMANTIC_MEMORY_SOURCES.flatMap(source =>
    scoredRows.filter(row => row.source_id === source).slice(0, 4)
  );
  const rows = (balancedRows.length ? balancedRows : scoredRows).slice(0, 8);

  if (!rows.length) return '';
  return [
    'Memoria semantica importada (Claude + Worion Docs):',
    ...rows.map(row => [
      `- Fonte: ${row.source_id}; conversa: ${row.conversation_id}; chunk: ${row.chunk_index}`,
      `  Sinal: ${memoryChunkSnippet(row.content, query)}`
    ].join('\n'))
  ].join('\n');
}

function buildVocabularyContext(query) {
  const vocabulary = getSemanticVocabulary();
  if (!vocabulary) return '';
  const terms = expandSemanticSearchTerms(query);
  const normalizedTerms = new Set(terms.map(term => String(term).toLowerCase()));
  const globalTerms = (vocabulary.vocabulary?.global_terms || [])
    .filter(item => normalizedTerms.has(String(item.term).toLowerCase()) || terms.some(term => String(item.term).toLowerCase().includes(String(term).toLowerCase())))
    .slice(0, 18)
    .map(item => item.term);
  const sourceTerms = Object.entries(vocabulary.by_source || {}).flatMap(([source, data]) =>
    (data.terms || [])
      .filter(item => normalizedTerms.has(String(item.term).toLowerCase()) || terms.some(term => String(item.term).toLowerCase().includes(String(term).toLowerCase())))
      .slice(0, 10)
      .map(item => `${item.term} (${source})`)
  ).slice(0, 20);
  const all = [...new Set([...globalTerms, ...sourceTerms])].slice(0, 24);
  if (!all.length) return '';
  return [
    'Vocabulário operacional relacionado:',
    `- ${all.join(', ')}`,
    'Use estes termos como repertorio e criterio de busca, sem despejar lista ao usuario.'
  ].join('\n');
}

function getContextGuardianUserId() {
  return userProfile.email || userProfile.name || 'local-user';
}

function getRecentSourceMessages(sourceMessages, limit = 12) {
  return (sourceMessages || [])
    .filter(message => ['user', 'assistant'].includes(message.role) && message.content && message.content !== '...')
    .slice(-limit)
    .map(message => ({
      role: message.role,
      content: String(message.content || '').slice(0, 6000),
      createdAt: message.createdAt || null
    }));
}

function queueContextIndexing(conversationId, sourceMessages, memoryPolicy = null) {
  const snapshot = getRecentSourceMessages(sourceMessages);
  if (!conversationId || snapshot.length < 2) return;
  const effectivePolicy = memoryPolicy || (typeof currentTurnPolicy !== 'undefined' ? currentTurnPolicy : null);
  if (effectivePolicy && effectivePolicy.allowMemoryWrite === false) {
    const reason = effectivePolicy.reason || (effectivePolicy.blockReasons || []).join(',') || 'policy_blocked';
    // Debug silenciado
    // console.log(`[MEMORY WRITE POLICY] allow=false reason=${reason}`);
    // console.log('[ContextGuardian] skip memory write:', reason);
    return;
  }
  if (effectivePolicy && effectivePolicy.allowMemoryWrite === true) {
    // Debug silenciado
    // console.log(`[MEMORY WRITE POLICY] allow=true reason=${effectivePolicy.reason || 'explicit_user'}`);
  }
  contextGuardianQueue = contextGuardianQueue
    .catch(() => {})
    .then(() => runContextGuardian(conversationId, snapshot, effectivePolicy));
}

async function runContextGuardian(conversationId, sourceMessages, memoryPolicy = null) {
  try {
    if (memoryPolicy && memoryPolicy.allowMemoryWrite === false) {
      const reason = memoryPolicy.reason || 'policy_blocked';
      console.log('[ContextGuardian] skip memory write:', reason);
      return;
    }
    const data = await callOpenAIWithRetry({
      messages: [
        {
          role: 'system',
          content: 'Voce e o Context Guardian do Worion. Sua funcao e transformar conversas em memoria estruturada. Extraia apenas informacoes uteis para recuperacao futura. Retorne somente JSON valido.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            expected_json: {
              title: '',
              summary: '',
              key_points: [],
              decisions: [],
              tasks: [],
              entities: [],
              projects: [],
              files: [],
              tags: [],
              importance: 1,
              metadata: {}
            },
            messages: sourceMessages
          })
        }
      ]
    });

    const rawMemory = String(data.choices?.[0]?.message?.content || '{}')
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const memory = (() => { try { return JSON.parse(rawMemory); } catch { return {}; } })();
    const payload = {
      user_id: getContextGuardianUserId(),
      session_id: currentConversationId || conversationId,
      conversation_id: conversationId,
      message_id: sourceMessages[sourceMessages.length - 1]?.createdAt || makeId('message'),
      agent_name: 'Context Guardian',
      source: 'worion',
      category: 'conversation_memory',
      title: memory.title || getConversationTitle(),
      summary: memory.summary || '',
      key_points: memory.key_points || [],
      entities: memory.entities || [],
      tags: memory.tags || [],
      importance: Math.max(1, Math.min(5, Number(memory.importance || 1))),
      source_messages: sourceMessages,
      metadata: {
        decisions: memory.decisions || [],
        tasks: memory.tasks || [],
        projects: memory.projects || [],
        files: memory.files || [],
        ...(memory.metadata || {})
      }
    };
    await saveInternalMemory(payload);
    console.info('[ContextGuardian] memoria interna salva:', conversationId);
  } catch (error) {
    console.warn('[ContextGuardian] falha silenciosa:', error.message);
  }
}

async function saveInternalMemory(payload) {
  const response = await fetch(`${MEMORY_SUPABASE_URL}/rest/v1/${INTERNAL_MEMORY_TABLE}`, {
    method: 'POST',
    headers: memorySupabaseHeaders({
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }),
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase internal memory ${response.status}: ${text.slice(0, 240)}`);
  return true;
}

async function searchInternalMemory(query) {
  const terms = expandSemanticSearchTerms(query);
  if (!terms.length) return '';
  try {
    const atomsMemory = await searchMemoryAtoms(query, { limit: isMemoryAtomQuery(query) ? 12 : 8 });
    const importedMemory = await searchImportedSemanticMemory(query);
    const vocabularyContext = buildVocabularyContext(query);
    const url = new URL(`${MEMORY_SUPABASE_URL}/rest/v1/${INTERNAL_MEMORY_TABLE}`);
    url.searchParams.set('select', 'title,key_points,entities,tags,importance,updated_at,created_at');
    url.searchParams.set('user_id', `eq.${getContextGuardianUserId()}`);
    url.searchParams.set('or', `(${terms
      .map(term => `title.ilike.*${term}*`)
      .join(',')})`);
    url.searchParams.set('order', 'importance.desc');
    url.searchParams.set('limit', '5');
    const response = await fetch(url.toString(), { headers: memorySupabaseHeaders() });
    const text = await response.text();
    if (!response.ok) throw new Error(`Supabase internal memory search ${response.status}: ${text.slice(0, 160)}`);
    const rows = JSON.parse(text || '[]');
    const internalBlock = rows.length ? rows.map(row => [
      `- ${row.title || 'Memoria Worion'}`,
      Array.isArray(row.key_points) && row.key_points.length ? `  Pontos: ${row.key_points.slice(0, 4).join('; ')}` : '',
      Array.isArray(row.tags) && row.tags.length ? `  Tags: ${row.tags.slice(0, 6).join(', ')}` : ''
    ].filter(Boolean).join('\n')).join('\n') : '';
    return [
      atomsMemory,
      internalBlock ? `Memoria interna indexada:\n${internalBlock}` : '',
      isMemoryAtomQuery(query) && !isConversationNarrativeQuery(query) ? '' : importedMemory,
      vocabularyContext
    ].filter(Boolean).join('\n\n');
  } catch (error) {
    console.warn('[ContextGuardian] busca indisponivel:', error.message);
    return '';
  }
}

function normalizeMemoryCardMatchText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMemoryCardRules(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
    } catch {
      return value.split(/[,;\n]/).map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function scoreMemoryCardForMessage(card, normalizedMessage) {
  const rules = normalizeMemoryCardRules(card?.inclusion_rules);
  if (!rules.length) return 0.5;

  let score = 0;
  for (const rule of rules) {
    const normalizedRule = normalizeMemoryCardMatchText(rule);
    if (!normalizedRule) continue;
    if (normalizedMessage.includes(normalizedRule)) {
      score += 3;
      continue;
    }

    const tokens = normalizedRule.split(' ').filter(token => token.length >= 3);
    if (tokens.some(token => normalizedMessage.includes(token))) score += 1;
  }
  return score;
}

async function searchMemoryCards(userMessage) {
  try {
    const normalizedMessage = normalizeMemoryCardMatchText(userMessage);
    if (!normalizedMessage) return '';

    // TAXONOMIA 2026-06-05: Buscar contextos active primeiro
    const contextsUrl = new URL(`${MEMORY_SUPABASE_URL}/rest/v1/memory_contexts`);
    contextsUrl.searchParams.set('select', 'id');
    contextsUrl.searchParams.set('status', 'eq.active');
    contextsUrl.searchParams.set('user_id', 'eq.local-user');
    const contextsResponse = await fetch(contextsUrl.toString(), { headers: memorySupabaseHeaders() });
    const contextsText = await contextsResponse.text();
    if (!contextsResponse.ok) throw new Error(`Supabase memory_contexts search ${contextsResponse.status}: ${contextsText.slice(0, 160)}`);
    const activeContexts = JSON.parse(contextsText || '[]');
    const activeContextIds = new Set(activeContexts.map(ctx => ctx.id));

    if (!activeContextIds.size) {
      console.warn('[ContextGuardian] no active contexts found - BUSCANDO TODOS OS CONTEXTOS COMO FALLBACK');
      // FALLBACK: Se não há contextos active, buscar cards SEM filtro de contexto
      const urlFallback = new URL(`${MEMORY_SUPABASE_URL}/rest/v1/memory_cards_v2`);
      urlFallback.searchParams.set('select', 'title,summary,domain,inclusion_rules,context_id');
      urlFallback.searchParams.set('order', 'updated_at.desc');
      urlFallback.searchParams.set('limit', '100');

      const fallbackResponse = await fetch(urlFallback.toString(), { headers: memorySupabaseHeaders() });
      const fallbackText = await fallbackResponse.text();
      if (!fallbackResponse.ok) throw new Error(`Supabase fallback ${fallbackResponse.status}: ${fallbackText.slice(0, 160)}`);

      const fallbackCards = JSON.parse(fallbackText || '[]').slice(0, 3);
      if (!fallbackCards.length) return '';

      const cardsBlock = fallbackCards.map(card => [
        `- ${card.title || 'Memory Card'}`,
        card.domain ? `  Dominio: ${card.domain}` : '',
        card.summary ? `  Resumo: ${String(card.summary).slice(0, 300)}...` : ''
      ].filter(Boolean).join('\n')).join('\n');

      console.log('[ContextGuardian] Fallback retornou', fallbackCards.length, 'cards');
      return `MEMÓRIA RECUPERADA (fallback - 3 cards mais recentes):\n${cardsBlock}`;
    }

    // BUSCA LIVRE 2026-06-05: Buscar TODOS os cards (sem filtro de status) vinculados a contextos active
    const url = new URL(`${MEMORY_SUPABASE_URL}/rest/v1/memory_cards_v2`);
    url.searchParams.set('select', 'title,summary,domain,inclusion_rules,context_id');
    url.searchParams.set('user_id', 'eq.local-user');
    // GATE REMOVIDO: sem filtro status='card_active' - acesso livre a todos cards
    url.searchParams.set('order', 'updated_at.desc');
    url.searchParams.set('limit', '100');

    const response = await fetch(url.toString(), { headers: memorySupabaseHeaders() });
    const text = await response.text();
    if (!response.ok) throw new Error(`Supabase memory_cards_v2 search ${response.status}: ${text.slice(0, 160)}`);

    const rows = JSON.parse(text || '[]');
    const validCards = rows.filter(card => card.context_id && activeContextIds.has(card.context_id));
    // BUSCA SEM TEMA: sem score por inclusion_rules, retorna top 3 por updated_at (REDUZIDO para evitar estouro TPM)
    const relevantCards = validCards.slice(0, 3);

    const orphanCount = rows.filter(card => !card.context_id).length;
    const inactiveContextCount = rows.filter(card => card.context_id && !activeContextIds.has(card.context_id)).length;
    console.log('[ContextGuardian] busca livre:', {
      total: rows.length,
      validCards: validCards.length,
      returned: relevantCards.length,
      orphan: orphanCount,
      inactiveContext: inactiveContextCount
    });

    if (!relevantCards.length) return '';

    const cardsBlock = relevantCards.map(card => [
      `- ${card.title || 'Memory Card'}`,
      card.domain ? `  Dominio: ${card.domain}` : '',
      card.summary ? `  Resumo: ${String(card.summary).slice(0, 300)}...` : ''
    ].filter(Boolean).join('\n')).join('\n');

    return `MEMÓRIA RECUPERADA (3 cards mais recentes, resumo compacto):\n${cardsBlock}`;
  } catch (error) {
    console.warn('[ContextGuardian] memory_cards_v2 indisponivel:', error.message);
    return '';
  }
}
