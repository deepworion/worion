/**
 * Runtime local de Memory Cards.
 * Fase 1: governanca local sem Supabase, migration ou backend.
 */
(function initMemoryCardsRuntime() {
  const STORAGE_KEY = 'worion.memoryCardsRuntime.v1';
  const LEGACY_CONCEPT_ZERO_ID = 'concept-zero-spirituality';

  const CONCEPT_ZERO_CARD = {
    id: 'conceito-0-espiritualidade-sonhos-hermetismo',
    internalName: 'Conceito 0',
    title: 'Espiritualidade / Sonhos / Hermetismo',
    content: 'Contexto para leitura simbólica e operacional de espiritualidade, sonhos, Hermetismo, Bashar, Gnose, observador, ego, frequência, pineal e mediunidade. Use este card para conversas que exigem profundidade, organização interna e evitar respostas genéricas.',
    tags: [
      'espiritualidade',
      'espiritual',
      'sonho',
      'sonhos',
      'hermetismo',
      'bashar',
      'gnose',
      'gnosticismo',
      'pineal',
      'mediunidade',
      'símbolo',
      'simbólico',
      'consciência',
      'observador',
      'ego',
      'frequência'
    ],
    excerpts: [
      {
        id: 'concept-zero-operational-spirituality',
        text: 'Espiritualidade aqui é tratada como experiência operacional, não como crença genérica.'
      },
      {
        id: 'concept-zero-ego-observer',
        text: 'Ego é ponto de convergência da consciência; o problema é a disfunção quando opera sem observador.'
      },
      {
        id: 'concept-zero-frequency-routine',
        text: 'frequência, rotina regulatória e TDAH entram como camada prática de estabilidade e leitura de estado.'
      },
      {
        id: 'concept-zero-dreams-symbolic',
        text: 'Sonhos devem ser tratados como material simbólico e operacional, não como interpretação rasa.'
      },
      {
        id: 'concept-zero-hermetic-language',
        text: 'Hermetismo/Bashar/Gnose entram como linguagem de leitura, não como explicação genérica.'
      }
    ],
    rules: [
      'Use como referência quando o tema envolver espiritualidade, sonho, Hermetismo, Bashar, Gnose, ego, observador ou frequência.',
      'Evite espiritualidade genérica, psicologização rasa e validação barata.',
      'Responder como espelho factual, profundo e direto.'
    ]
  };

  const DEFAULT_CONCEPT_ZERO_INSTRUCTIONS = [
    'Use este Memory Card quando a conversa envolver espiritualidade, sonhos, Hermetismo, Bashar, Gnose, pineal, mediunidade, símbolos, consciência, observador, ego ou frequência.',
    '',
    'Este card organiza uma leitura simbólica e operacional desses temas, evitando respostas genéricas, psicologização rasa ou explicações materialistas automáticas.',
    '',
    'Tópicos internos:',
    '',
    '* Sonhos',
    '* Hermetismo',
    '* Bashar',
    '* Gnose',
    '* Pineal / Mediunidade',
    '* Observador / Ego / frequência',
    '',
    'Regras de resposta:',
    '',
    '* Tratar sonhos como material simbólico e operacional.',
    '* Tratar ego como ponto de convergência da consciência; o problema é a disfunção quando opera sem observador.',
    '* Tratar frequência, rotina regulatória e TDAH como camada prática de estabilidade e leitura de estado.',
    '* Usar Hermetismo, Bashar e Gnose como linguagens de leitura e organização simbólica.',
    '* Responder com profundidade e precisão, sem validação barata.',
    '* Evitar espiritualidade genérica.'
  ].join('\n');

  const TAXONOMY = [
    {
      id: 'espiritualidade',
      title: 'Espiritualidade',
      description: 'Contexto operacional para espiritualidade, sonhos, hermetismo, Bashar, Gnose, observador, ego, frequência, pineal, mediunidade e leitura simbólica.',
      subcontexts: [
        { id: 'sonhos', title: 'Sonhos', description: 'Sonhos como material simbólico e operacional para leitura de estado.', cards: [CONCEPT_ZERO_CARD.id], snippets: ['concept-zero-dreams-symbolic'] },
        { id: 'hermetismo', title: 'Hermetismo', description: 'Hermetismo como linguagem de leitura e organização simbólica.', cards: [CONCEPT_ZERO_CARD.id], snippets: ['concept-zero-hermetic-language'] },
        { id: 'bashar', title: 'Bashar', description: 'Bashar como vocabulário de frequência, estado e permissão interna.', cards: [CONCEPT_ZERO_CARD.id], snippets: ['concept-zero-hermetic-language'] },
        { id: 'gnose', title: 'Gnose', description: 'Gnose como experiência direta e leitura interna, sem dogma genérico.', cards: [CONCEPT_ZERO_CARD.id], snippets: ['concept-zero-hermetic-language'] },
        { id: 'pineal-mediunidade', title: 'Pineal / Mediunidade', description: 'Pineal e mediunidade como linguagem subjetiva que precisa de rigor e distinção.', cards: [CONCEPT_ZERO_CARD.id], snippets: ['concept-zero-operational-spirituality'] },
        { id: 'observador-ego-frequencia', title: 'Observador / Ego / frequência', description: 'Observador, ego e frequência como eixo de governança interna.', cards: [CONCEPT_ZERO_CARD.id], snippets: ['concept-zero-ego-observer', 'concept-zero-frequency-routine'] }
      ]
    },
    { id: 'worion', title: 'Worion', subcontexts: [] },
    { id: 'workestria', title: 'Workestria', subcontexts: [] },
    { id: 'puppila-ecommerce', title: 'Puppila / E-commerce', subcontexts: [] },
    { id: 'saude-rotina-energia', title: 'Saúde / Rotina / Energia', subcontexts: [] },
    { id: 'notion-conectores', title: 'Notion / Conectores', subcontexts: [] },
    { id: 'pesquisa-factual', title: 'Pesquisa factual', subcontexts: [] },
    { id: 'codigo-n8n-automacao', title: 'Código / n8n / Automação', subcontexts: [] },
    { id: 'perfil-continuidade-estilo', title: 'Perfil / Continuidade / Estilo', subcontexts: [] }
  ];

  const CARDS = {
    [CONCEPT_ZERO_CARD.id]: CONCEPT_ZERO_CARD,
    worion: {
      id: 'worion',
      title: 'Worion',
      content: 'Contexto operacional do Worion Desktop, arquitetura, memória, chat, agentes, UX e continuidade.',
      tags: ['worion'],
      excerpts: [],
      rules: ['Usar como contexto local do projeto Worion.']
    },
    workestria: {
      id: 'workestria',
      title: 'Workestria',
      content: 'Contexto para Workestria, produto SaaS, automações, Make.com, Shopify e operação.',
      tags: ['workestria'],
      excerpts: [],
      rules: ['Usar como contexto local de Workestria.']
    },
    'puppila-ecommerce': {
      id: 'puppila-ecommerce',
      title: 'Puppila / E-commerce',
      content: 'Contexto para Puppila, e-commerce, produto, loja, catálogo, Shopify e operação comercial.',
      tags: ['puppila', 'ecommerce'],
      excerpts: [],
      rules: ['Usar como contexto local de Puppila e e-commerce.']
    },
    'saude-rotina-energia': {
      id: 'saude-rotina-energia',
      title: 'Saúde / Rotina / Energia',
      content: 'Contexto para saúde, rotina, energia, estabilidade, hábitos e autorregulação.',
      tags: ['saude', 'rotina', 'energia'],
      excerpts: [],
      rules: ['Usar como contexto local de saúde e rotina.']
    },
    'notion-conectores': {
      id: 'notion-conectores',
      title: 'Notion / Conectores',
      content: 'Contexto para Notion, conectores, integrações e uso de fontes externas.',
      tags: ['notion', 'conectores'],
      excerpts: [],
      rules: ['Usar como contexto local de Notion e conectores.']
    },
    'pesquisa-factual': {
      id: 'pesquisa-factual',
      title: 'Pesquisa factual',
      content: 'Contexto para pesquisa factual, verificação, evidence packs, fontes e precisão.',
      tags: ['pesquisa', 'factual'],
      excerpts: [],
      rules: ['Priorizar verificação factual e fontes quando necessário.']
    },
    'codigo-n8n-automacao': {
      id: 'codigo-n8n-automacao',
      title: 'Código / n8n / Automação',
      content: 'Contexto para código, n8n, automação, integrações técnicas e pipelines.',
      tags: ['codigo', 'n8n', 'automacao'],
      excerpts: [],
      rules: ['Usar como contexto técnico de automação.']
    },
    'perfil-continuidade-estilo': {
      id: 'perfil-continuidade-estilo',
      title: 'Perfil / Continuidade / Estilo',
      content: 'Contexto para perfil operacional do usuário, continuidade, estilo de resposta e preferências.',
      tags: ['perfil', 'continuidade', 'estilo'],
      excerpts: [],
      rules: ['Preservar estilo direto, continuidade e preferências do usuário.']
    }
  };

  function defaultState() {
    return {
      expandedContexts: ['espiritualidade'],
      activeContextId: '',
      activeSubcontextId: '',
      activeCardId: '',
      selectedContexts: [],
      selectedSubcontexts: [],
      selectedCards: [],
      selectedExcerpts: [],
      localSources: [],
      cardInstructions: {},
      activeMemoryCardId: ''
    };
  }

  function loadState() {
    try {
      const loaded = { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
      if (loaded.cardInstructions?.[LEGACY_CONCEPT_ZERO_ID] && !loaded.cardInstructions?.[CONCEPT_ZERO_CARD.id]) {
        loaded.cardInstructions[CONCEPT_ZERO_CARD.id] = loaded.cardInstructions[LEGACY_CONCEPT_ZERO_ID];
      }
      loaded.localSources = (loaded.localSources || []).map(source => source.cardId === LEGACY_CONCEPT_ZERO_ID
        ? { ...source, cardId: CONCEPT_ZERO_CARD.id }
        : source);
      if (loaded.activeMemoryCardId === LEGACY_CONCEPT_ZERO_ID) loaded.activeMemoryCardId = CONCEPT_ZERO_CARD.id;
      if (loaded.activeCardId === LEGACY_CONCEPT_ZERO_ID) loaded.activeCardId = CONCEPT_ZERO_CARD.id;
      loaded.selectedCards = (loaded.selectedCards || []).map(id => id === LEGACY_CONCEPT_ZERO_ID ? CONCEPT_ZERO_CARD.id : id);
      return loaded;
    } catch {
      return defaultState();
    }
  }

  function saveState(nextState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    return nextState;
  }

  let state = loadState();

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeRuleList(value) {
    if (Array.isArray(value)) return value.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
      } catch {
        return value.split(/\r?\n|[,;]/).map(item => item.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean);
      }
    }
    return [];
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

  function semanticInstructionsToText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && !Array.isArray(value)) {
      return String(
        value.consumeMarkdown ||
        value.consumptionMarkdown ||
        value.instructions ||
        value.text ||
        ''
      ).trim();
    }
    return '';
  }

  function firstRuleTextCandidate(card) {
    const raw = card?.raw || {};
    const metadata = parseJsonObject(raw.metadata);
    const candidates = [
      ['card.semanticInstructions', semanticInstructionsToText(card?.semanticInstructions)],
      ['card.instructions', card?.instructions],
      ['raw.metadata.semanticInstructions.consumeMarkdown', semanticInstructionsToText(metadata.semanticInstructions)],
      ['raw.semantic_instructions', semanticInstructionsToText(raw.semantic_instructions)],
      ['raw.instructions', raw.instructions],
      ['card.content', card?.content],
      ['card.summary', card?.summary || raw.summary],
      ['card.description', card?.description || card?.desc || raw.description]
    ];

    for (const [fieldUsed, value] of candidates) {
      const text = String(value || '').trim();
      if (text) return { text, fieldUsed };
    }
    return { text: '', fieldUsed: 'empty' };
  }

  function getMemoryCardRulesInfo(cardOrId) {
    const card = typeof cardOrId === 'string' ? getCard(cardOrId) : cardOrId;
    const result = firstRuleTextCandidate(card);
    return {
      card,
      text: result.text,
      fieldUsed: result.fieldUsed
    };
  }

  function getMemoryCardRulesText(cardOrId) {
    return getMemoryCardRulesInfo(cardOrId).text;
  }

  function getMemoryCardKnowledgeText(card) {
    const raw = card?.raw || {};
    return String(
      card?.content ||
      card?.context ||
      raw.card_scope ||
      raw.summary ||
      card?.summary ||
      raw.description ||
      card?.description ||
      card?.desc ||
      ''
    ).trim();
  }

  function uniqueValues(values = []) {
    return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
  }

  function postgrestIn(values = []) {
    const clean = uniqueValues(values).slice(0, 200);
    return clean.length ? `in.(${clean.join(',')})` : '';
  }

  async function fetchMemoryCardRows(table, params = {}) {
    if (typeof window === 'undefined' || typeof window.worionApiContextCardsFetchRows !== 'function') return [];
    try {
      return await window.worionApiContextCardsFetchRows(table, params);
    } catch (error) {
      console.warn('[MEMORY CARD KNOWLEDGE] linked rows unavailable:', { table, error: error.message });
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

  function formatLinkedConversationKnowledge(conversations = [], chunks = []) {
    const conversationById = new Map((conversations || []).map(row => [String(row.id), row]));
    const groups = new Map();
    for (const chunk of chunks || []) {
      const conversationId = String(chunk.conversation_id || 'sem-conversa');
      if (!groups.has(conversationId)) groups.set(conversationId, []);
      groups.get(conversationId).push(chunk);
    }

    const blocks = [...groups.entries()].slice(0, 12).map(([conversationId, rows], index) => {
      const conversation = conversationById.get(conversationId) || {};
      const sortedRows = rows.sort((a, b) => Number(a.chunk_index || 0) - Number(b.chunk_index || 0));
      const transcript = sortedRows
        .slice(0, 80)
        .map(chunk => `[${chunk.chunk_index ?? ''}] ${chunk.role || 'memoria'}: ${String(chunk.content || '').trim()}`)
        .filter(Boolean)
        .join('\n')
        .slice(0, 9000);
      return [
        `## Conversa vinculada ${index + 1}: ${conversation.title || conversation.summary || conversationId}`,
        conversation.summary ? `Resumo: ${conversation.summary}` : '',
        transcript
      ].filter(Boolean).join('\n');
    });

    const conversationOnly = (conversations || [])
      .filter(row => !groups.has(String(row.id)))
      .slice(0, 12 - blocks.length)
      .map((row, index) => [
        `## Conversa vinculada ${blocks.length + index + 1}: ${row.title || row.id}`,
        row.summary ? `Resumo: ${row.summary}` : ''
      ].filter(Boolean).join('\n'));

    return [...blocks, ...conversationOnly].filter(Boolean).join('\n\n---\n\n').slice(0, 50000);
  }

  async function fetchLinkedMemoryCardKnowledge(cardId) {
    if (typeof window !== 'undefined' && window.ChatDelivery?.deliverMemoryCard) {
      const delivered = await window.ChatDelivery.deliverMemoryCard(cardId);
      return {
        text: delivered?.text || '',
        conversationCount: delivered?.conversationCount || 0,
        chunkCount: delivered?.chunkCount || 0
      };
    }

    const canonicalCardId = String(cardId || '').trim();
    if (!canonicalCardId) return { text: '', conversationCount: 0, chunkCount: 0 };

    const [sources, bindings] = await Promise.all([
      fetchMemoryCardRows('memory_card_sources_v2', {
        select: '*',
        card_id: `eq.${canonicalCardId}`,
        limit: '1000'
      }),
      fetchMemoryCardRows('conversation_memory_bindings', {
        select: '*',
        card_id: `eq.${canonicalCardId}`,
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
      chunks = await fetchMemoryCardRows('memory_chunks', {
        select: 'id,conversation_id,source_id,chunk_index,role,content,metadata,created_at',
        id: postgrestIn(chunkIds),
        order: 'chunk_index.asc',
        limit: '5000'
      });
      conversationIds = uniqueValues([...conversationIds, ...chunks.map(chunk => chunk.conversation_id)]);
    }

    if (conversationIds.length) {
      const conversationChunks = await fetchMemoryCardRows('memory_chunks', {
        select: 'id,conversation_id,source_id,chunk_index,role,content,metadata,created_at',
        conversation_id: postgrestIn(conversationIds),
        order: 'chunk_index.asc',
        limit: '5000'
      });
      const byChunkId = new Map([...chunks, ...conversationChunks].map(chunk => [String(chunk.id || `${chunk.conversation_id}:${chunk.chunk_index}`), chunk]));
      chunks = [...byChunkId.values()];
    }

    const conversations = conversationIds.length
      ? await fetchMemoryCardRows('memory_conversations', {
        select: 'id,source_id,external_id,title,summary,metadata,updated_at,imported_at',
        id: postgrestIn(conversationIds),
        limit: '500'
      })
      : [];

    return {
      text: formatLinkedConversationKnowledge(conversations, chunks),
      conversationCount: uniqueValues([...conversationIds, ...chunks.map(chunk => chunk.conversation_id)]).length,
      chunkCount: chunks.length
    };
  }

  function getMemoryV2CardsCatalog() {
    return typeof window !== 'undefined' && Array.isArray(window.memoryCardsV2) ? window.memoryCardsV2 : [];
  }

  function getMemoryV2ContextsCatalog() {
    return typeof window !== 'undefined' && Array.isArray(window.memoryContextsV2) ? window.memoryContextsV2 : [];
  }

  function hasMemoryV2Catalog() {
    return getMemoryV2CardsCatalog().length > 0 || getMemoryV2ContextsCatalog().length > 0;
  }

  function getV2ContextId(card) {
    return String(card?.contextId || card?.context_id || card?.raw?.context_id || card?.raw?.contextId || '').trim();
  }

  function getV2Status(row) {
    return String(row?.status || row?.raw?.status || '').trim().toLowerCase();
  }

  function memoryCardV2Matches(card, cardRef) {
    const normalizedRef = normalize(cardRef);
    if (!normalizedRef) return false;
    const raw = card?.raw || {};
    return [
      card?.id,
      raw.id,
      card?.slug,
      raw.slug,
      card?.key,
      raw.key,
      card?.title,
      raw.title,
      card?.name,
      raw.name
    ].some(value => normalize(value) === normalizedRef);
  }

  function resolveValidMemoryCardV2(cardId) {
    const card = getMemoryV2CardsCatalog().find(item => memoryCardV2Matches(item, cardId)) || null;
    if (!card) return null;

    const contextId = getV2ContextId(card);
    if (!contextId) {
      console.warn('[MEMORY RUNTIME] blocked orphan card:', { cardId });
      return null;
    }

    const cardStatus = getV2Status(card);
    if (cardStatus === 'archived' || cardStatus === 'draft') {
      console.warn('[MEMORY RUNTIME] blocked invalid card status:', { cardId, status: cardStatus });
      return null;
    }

    const context = getMemoryV2ContextsCatalog().find(item => String(item.id || item.raw?.id || '') === contextId) || null;
    const contextStatus = getV2Status(context);
    if (!context || contextStatus !== 'active') {
      console.warn('[MEMORY RUNTIME] blocked card with inactive/missing context:', { cardId, contextId, contextStatus });
      return null;
    }

    return { card, context, contextId };
  }

  function getLocalCard(cardId) {
    if (cardId === LEGACY_CONCEPT_ZERO_ID) return CONCEPT_ZERO_CARD;
    return CARDS[cardId] || null;
  }

  function toRuntimeMemoryCard(resolved) {
    if (!resolved?.card) return null;
    const card = resolved.card;
    const raw = card.raw || {};
    const context = resolved.context || null;
    const metadata = parseJsonObject(raw.metadata);
    const content = card.context || card.desc || raw.card_scope || raw.summary || raw.description || raw.title || card.title || '';
    return {
      ...getLocalCard(card.id || raw.id),
      id: card.id || raw.id,
      slug: card.slug || raw.slug || card.id || raw.id,
      title: card.title || raw.title || 'Memory Card',
      internalName: raw.slug || card.slug || '',
      content,
      summary: card.summary || raw.summary || '',
      description: card.description || card.desc || raw.description || '',
      instructions: card.instructions || raw.instructions || '',
      semanticInstructions: card.semanticInstructions || metadata.semanticInstructions || raw.semantic_instructions || null,
      contextId: resolved.contextId,
      sourceContext: context,
      rules: [
        ...normalizeRuleList(card.inclusionRules || raw.inclusion_rules),
        ...normalizeRuleList(card.exclusionRules || raw.exclusion_rules).map(rule => `Excluir: ${rule}`)
      ],
      raw,
      kind: 'card_v2'
    };
  }

  function toggleListValue(list, value) {
    const current = Array.isArray(list) ? list : [];
    return current.includes(value) ? current.filter(item => item !== value) : [...current, value];
  }

  function getState() {
    return { ...state };
  }

  function getContexts() {
    return TAXONOMY.map(context => ({ ...context, subcontexts: [...context.subcontexts] }));
  }

  function getCard(cardId) {
    const resolved = resolveValidMemoryCardV2(cardId);
    if (resolved) return toRuntimeMemoryCard(resolved);
    return getLocalCard(cardId);
  }

  function getContext(contextId) {
    return TAXONOMY.find(context => context.id === contextId) || null;
  }

  function getSubcontext(contextId, subcontextId) {
    return getContext(contextId)?.subcontexts.find(subcontext => subcontext.id === subcontextId) || null;
  }

  function getSourcesForCard(cardId) {
    return state.localSources.filter(source => source.cardId === cardId);
  }

  function getSourcesForContext(contextId) {
    return state.localSources.filter(source => source.contextId === contextId);
  }

  function getSourcesForSubcontext(contextId, subcontextId) {
    return state.localSources.filter(source => source.contextId === contextId && source.subcontextId === subcontextId);
  }

  function getSnippetIdsForSubcontext(subcontext) {
    const scopedSnippetIds = new Set(subcontext?.snippets || []);
    return uniqueCardsFromSubcontexts(subcontext ? [subcontext] : [])
      .flatMap(card => card.excerpts || [])
      .filter(snippet => !scopedSnippetIds.size || scopedSnippetIds.has(snippet.id))
      .map(snippet => snippet.id);
  }

  function getSnippetIdsForContext(context) {
    return [...new Set((context?.subcontexts || []).flatMap(subcontext => getSnippetIdsForSubcontext(subcontext)))];
  }

  function updateState(patch) {
    state = saveState({ ...state, ...patch });
    return getState();
  }

  function toggleExpandedContext(contextId) {
    return updateState({ expandedContexts: toggleListValue(state.expandedContexts, contextId) });
  }

  function toggleContextSelection(contextId) {
    const context = getContext(contextId);
    if (!context) return getState();
    const isSelected = state.selectedContexts.includes(contextId);
    const subcontextKeys = context.subcontexts.map(subcontext => subcontextKey(contextId, subcontext.id));
    const cardIds = [...new Set(context.subcontexts.flatMap(subcontext => subcontext.cards || []))];
    const snippetIds = getSnippetIdsForContext(context);

    if (isSelected) {
      return updateState({
        selectedContexts: state.selectedContexts.filter(id => id !== contextId),
        selectedSubcontexts: state.selectedSubcontexts.filter(id => !subcontextKeys.includes(id)),
        selectedCards: state.selectedCards.filter(id => !cardIds.includes(id)),
        selectedExcerpts: state.selectedExcerpts.filter(id => !snippetIds.includes(id))
      });
    }

    return updateState({
      expandedContexts: [...new Set([...state.expandedContexts, contextId])],
      selectedContexts: [...new Set([...state.selectedContexts, contextId])],
      selectedSubcontexts: [...new Set([...state.selectedSubcontexts, ...subcontextKeys])],
      selectedCards: [...new Set([...state.selectedCards, ...cardIds])],
      selectedExcerpts: [...new Set([...state.selectedExcerpts, ...snippetIds])],
      activeContextId: contextId
    });
  }

  function subcontextKey(contextId, subcontextId) {
    return `${contextId}:${subcontextId}`;
  }

  function toggleSubcontextSelection(contextId, subcontextId) {
    const context = getContext(contextId);
    const subcontext = getSubcontext(contextId, subcontextId);
    if (!context || !subcontext) return getState();
    const key = subcontextKey(contextId, subcontextId);
    const isSelected = state.selectedSubcontexts.includes(key);
    const cardIds = [...new Set(subcontext.cards || [])];
    const snippetIds = getSnippetIdsForSubcontext(subcontext);
    const nextSubcontexts = isSelected
      ? state.selectedSubcontexts.filter(id => id !== key)
      : [...new Set([...state.selectedSubcontexts, key])];
    const allContextKeys = context.subcontexts.map(item => subcontextKey(contextId, item.id));
    const allChildrenSelected = allContextKeys.every(item => nextSubcontexts.includes(item));

    return updateState({
      expandedContexts: [...new Set([...state.expandedContexts, contextId])],
      selectedContexts: allChildrenSelected
        ? [...new Set([...state.selectedContexts, contextId])]
        : state.selectedContexts.filter(id => id !== contextId),
      selectedSubcontexts: nextSubcontexts,
      selectedCards: isSelected
        ? state.selectedCards.filter(id => !cardIds.includes(id))
        : [...new Set([...state.selectedCards, ...cardIds])],
      selectedExcerpts: isSelected
        ? state.selectedExcerpts.filter(id => !snippetIds.includes(id))
        : [...new Set([...state.selectedExcerpts, ...snippetIds])],
      activeContextId: contextId,
      activeSubcontextId: subcontextId,
      activeCardId: cardIds[0] || state.activeCardId
    });
  }

  function toggleCardSelection(cardId) {
    return updateState({ selectedCards: toggleListValue(state.selectedCards, cardId) });
  }

  function toggleExcerptSelection(excerptId) {
    return updateState({ selectedExcerpts: toggleListValue(state.selectedExcerpts, excerptId) });
  }

  const toggleSnippetSelection = toggleExcerptSelection;

  function activate({ contextId = '', subcontextId = '', cardId = '' } = {}) {
    return updateState({ activeContextId: contextId, activeSubcontextId: subcontextId, activeCardId: cardId });
  }

  function addLocalSource({ contextId, subcontextId, cardId, name, content, type, size = 0 }) {
    const source = {
      id: `source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      contextId,
      subcontextId,
      cardId,
      name,
      type,
      size,
      lineCount: String(content || '').split(/\r?\n/).length,
      content: String(content || ''),
      createdAt: new Date().toISOString()
    };
    updateState({ localSources: [...state.localSources, source] });
    return source;
  }

  function getMemoryCardsList() {
    const supabaseCards = getMemoryV2CardsCatalog()
      .map(card => resolveValidMemoryCardV2(card.id || card.raw?.id || card.slug || card.raw?.slug))
      .filter(Boolean)
      .map(resolved => {
        const card = toRuntimeMemoryCard(resolved);
        return {
          ...card,
          description: card.content,
          updatedAt: card.raw?.updated_at || card.raw?.created_at || null,
          filesCount: state.localSources.filter(source => source.cardId === card.id).length
        };
      });
    const seen = new Set(supabaseCards.flatMap(card => [
      normalize(card.id),
      normalize(card.slug || card.raw?.slug),
      normalize(card.internalName)
    ].filter(Boolean)));
    if (hasMemoryV2Catalog()) return supabaseCards;

    const localCards = Object.values(CARDS)
      .filter(card => !seen.has(normalize(card.id)) && !seen.has(normalize(card.internalName)))
      .map(card => ({
      ...card,
      description: card.content,
      updatedAt: state.cardInstructions?.[card.id]?.updatedAt
        || state.localSources.filter(source => source.cardId === card.id).slice(-1)[0]?.createdAt
        || null,
      filesCount: state.localSources.filter(source => source.cardId === card.id).length
    }));
    return [...supabaseCards, ...localCards];
  }

  function openMemoryCardProject(cardId) {
    const card = getCard(cardId);
    if (!card) return null;
    const canonicalCardId = card.id || cardId;
    updateState({ activeMemoryCardId: canonicalCardId, activeCardId: canonicalCardId });
    return card;
  }

  function getDefaultInstructions(cardId) {
    const card = getCard(cardId);
    if (!card) return '';
    const rulesText = getMemoryCardRulesText(card);
    if (rulesText) return rulesText;
    if (cardId === CONCEPT_ZERO_CARD.id) return DEFAULT_CONCEPT_ZERO_INSTRUCTIONS;
    return [
      `Use este Memory Card quando a conversa envolver ${card.title}.`,
      '',
      card.content || '',
      '',
      'Regras de uso:',
      ...(card.rules || []).map(rule => `* ${rule}`)
    ].filter(Boolean).join('\n');
  }

  function getMemoryCardInstructions(cardId) {
    return getDefaultInstructions(cardId);
  }

  function updateMemoryCardRulesInCatalog(cardId, text, semanticInstructions = null) {
    if (typeof window === 'undefined' || !Array.isArray(window.memoryCardsV2)) return;
    const nextSemanticInstructions = semanticInstructions || { consumeMarkdown: String(text || '') };
    window.memoryCardsV2 = window.memoryCardsV2.map(card => {
      if (!memoryCardV2Matches(card, cardId)) return card;
      const raw = card.raw || {};
      const metadata = parseJsonObject(raw.metadata);
      const nextMetadata = {
        ...metadata,
        semanticInstructions: nextSemanticInstructions,
        updatedAt: new Date().toISOString()
      };
      return {
        ...card,
        semanticInstructions: nextSemanticInstructions,
        instructions: String(text || ''),
        raw: {
          ...raw,
          metadata: nextMetadata
        }
      };
    });
  }

  async function saveMemoryCardInstructions(cardId, text) {
    const resolved = resolveValidMemoryCardV2(cardId);
    const canonicalCardId = resolved?.card?.id || resolved?.card?.raw?.id || cardId;
    const cleanText = String(text || '');

    const persistLocally = (semanticInstructions = { consumeMarkdown: cleanText }) => {
      updateMemoryCardRulesInCatalog(canonicalCardId, cleanText, semanticInstructions);
      if (typeof window !== 'undefined' && window.ChatDelivery?.saveLocalMemoryCard) {
        window.ChatDelivery.saveLocalMemoryCard(canonicalCardId, cleanText, { source: 'rules-save' });
      }
      return updateState({
        cardInstructions: {
          ...(state.cardInstructions || {}),
          [canonicalCardId]: {
            text: cleanText,
            updatedAt: new Date().toISOString()
          }
        }
      });
    };

    const localState = persistLocally();

    if (resolved && typeof window !== 'undefined' && typeof window.worionApiMemoryCardSemanticInstructions === 'function') {
      try {
        const result = await window.worionApiMemoryCardSemanticInstructions(canonicalCardId, {
          consumeMarkdown: cleanText
        });
        persistLocally(result?.semanticInstructions || { consumeMarkdown: cleanText });
        console.log('[MEMORY CARD RULES] saved:', { cardId: canonicalCardId, textLength: cleanText.length });
        return result;
      } catch (error) {
        console.warn('[MEMORY CARD RULES] remote save failed, local cache kept:', {
          cardId: canonicalCardId,
          error: error.message
        });
      }
      console.log('[MEMORY CARD RULES] saved:', { cardId: canonicalCardId, textLength: cleanText.length });
      return localState;
    }

    console.log('[MEMORY CARD RULES] saved:', { cardId: canonicalCardId, textLength: cleanText.length });
    return localState;
  }

  async function updateMemoryCardKnowledge(cardId) {
    const card = getCard(cardId);
    if (!card) return null;
    const rules = getMemoryCardRulesText(card);
    const knowledge = getMemoryCardKnowledgeText(card);
    const linkedKnowledge = await fetchLinkedMemoryCardKnowledge(card.id || cardId);
    const consolidated = [
      knowledge,
      linkedKnowledge.text ? 'Conversas vinculadas ao card:' : '',
      linkedKnowledge.text,
      rules ? 'Regras opcionais:' : '',
      rules
    ].filter(Boolean).join('\n\n').trim();
    const result = await saveMemoryCardInstructions(card.id || cardId, consolidated);
    console.log('[MEMORY CARD KNOWLEDGE] card updated:', {
      cardId: card.id || cardId,
      knowledgeLength: knowledge.length,
      rulesLength: rules.length,
      linkedConversations: linkedKnowledge.conversationCount,
      linkedChunks: linkedKnowledge.chunkCount
    });
    return result;
  }

  async function attachMemoryCardFile(cardId, file) {
    const content = await file.text();
    return addLocalSource({
      contextId: '',
      subcontextId: '',
      cardId,
      name: file.name,
      type: file.type || 'text/plain',
      size: file.size || 0,
      content
    });
  }

  function getMemoryCardFiles(cardId) {
    return getSourcesForCard(cardId);
  }

  function removeMemoryCardFile(cardId, sourceId) {
    updateState({
      localSources: state.localSources.filter(source => !(source.cardId === cardId && source.id === sourceId))
    });
    return getSourcesForCard(cardId);
  }

  function buildMemoryCardChatContext(cardId) {
    const resolved = resolveValidMemoryCardV2(cardId);
    if (hasMemoryV2Catalog() && !resolved) {
      console.warn('[MEMORY RUNTIME] blocked non-v2/invalid card in buildContext:', { cardId });
      return '';
    }

    const card = resolved ? toRuntimeMemoryCard(resolved) : getLocalCard(cardId);
    if (!card) return '';

    const canonicalCardId = card.id || cardId;
    const instructions = getMemoryCardInstructions(canonicalCardId);
    const files = getMemoryCardFiles(canonicalCardId);
    const knowledge = files.length
      ? files.map(file => `* ${file.name}\n${String(file.content || '').slice(0, 12000)}`).join('\n\n')
      : card.content
        ? `* ${String(card.content).slice(0, 12000)}`
        : '* Este Memory Card não possui arquivos ou memórias vinculadas ainda.';
    const output = [
      '[MEMORY CARD ATIVO]',
      `Titulo: ${card.title}`,
      resolved?.context ? `Contexto: ${resolved.context.title || resolved.context.raw?.title || resolved.contextId}` : '',
      card.internalName ? `Metadado interno: ${card.internalName}` : '',
      `Descricao: ${card.content || ''}`,
      '',
      'IMPORTANTE: Este Memory Card está ativo. Só use o conhecimento DESTE card.',
      'Não busque memória global (Worion/Workestria/Supabase/Notion) se o card não mencionar.',
      '',
      'Conhecimento do card:',
      knowledge,
      '',
      'Regras opcionais:',
      instructions || '* nenhuma regra opcional definida',
      '',
      'Regras de uso:',
      (card.rules || []).length ? card.rules.map(rule => `* ${rule}`).join('\n') : '* usar apenas como contexto local deste Memory Card'
    ].filter(Boolean).join('\n');
    console.log('[MEMORY CARD CONTEXT] runtime source:', {
      cardId: canonicalCardId,
      title: card?.title,
      contentLength: String(card?.content || '').length,
      rulesLength: String(instructions || '').length,
      hasSemanticInstructions: Boolean(card?.semanticInstructions || card?.raw?.metadata?.semanticInstructions),
      contextTitle: resolved?.context?.title || resolved?.context?.raw?.title || '',
      outputLength: output.length
    });
    return output;
  }
  function activateMemoryCardForChat(cardId) {
    const resolved = resolveValidMemoryCardV2(cardId);
    if (hasMemoryV2Catalog() && !resolved) {
      console.warn('[MEMORY RUNTIME] blocked non-v2/invalid card in activate:', { cardId });
      return null;
    }

    const card = resolved ? toRuntimeMemoryCard(resolved) : getLocalCard(cardId);
    if (!card) return null;

    const canonicalCardId = card.id || cardId;
    updateState({ activeMemoryCardId: canonicalCardId, activeCardId: canonicalCardId });
    if (typeof window !== 'undefined') {
      window.currentMemoryCardProjectId = canonicalCardId;
      window.currentMemoryChatTitle = card.title;
    }
    return buildMemoryCardChatContext(canonicalCardId);
  }

  function getCardLocations(cardId) {
    const locations = [];
    TAXONOMY.forEach(context => {
      context.subcontexts.forEach(subcontext => {
        if (subcontext.cards.includes(cardId)) {
          locations.push({ context, subcontext });
        }
      });
    });
    return locations;
  }

  function uniqueCardsFromSubcontexts(subcontexts = []) {
    const seen = new Set();
    return subcontexts
      .flatMap(subcontext => subcontext.cards || [])
      .filter(cardId => {
        if (seen.has(cardId)) return false;
        seen.add(cardId);
        return true;
      })
      .map(cardId => getCard(cardId))
      .filter(Boolean);
  }

  function getContextOverview(contextId) {
    const context = getContext(contextId);
    if (!context) return null;
    const cards = uniqueCardsFromSubcontexts(context.subcontexts);
    return {
      context,
      subcontexts: context.subcontexts,
      cards,
      snippets: cards.flatMap(card => card.excerpts || []),
      sources: getSourcesForContext(context.id)
    };
  }

  function getSubcontextDetail(contextId, subcontextId) {
    const context = getContext(contextId);
    const subcontext = getSubcontext(contextId, subcontextId);
    if (!context || !subcontext) return null;
    const cards = uniqueCardsFromSubcontexts([subcontext]);
    const scopedSnippetIds = new Set(subcontext.snippets || []);
    return {
      context,
      subcontext,
      cards,
      snippets: cards
        .flatMap(card => card.excerpts || [])
        .filter(snippet => !scopedSnippetIds.size || scopedSnippetIds.has(snippet.id)),
      sources: getSourcesForSubcontext(context.id, subcontext.id)
    };
  }

  function buildSearchHaystack({ context, subcontext, card, sources = [] }) {
    return normalize([
      context?.title,
      subcontext?.title,
      card?.title,
      card?.content,
      ...(card?.tags || []),
      ...(card?.excerpts || []).map(excerpt => excerpt.text),
      ...sources.map(source => `${source.name} ${source.content}`)
    ].filter(Boolean).join(' '));
  }

  function search(query) {
    const normalized = normalize(query);
    if (!normalized) return [];

    const results = [];
    const cardResults = new Map();
    TAXONOMY.forEach(context => {
      if (normalize(context.title).includes(normalized)) {
        results.push({ type: 'context', contextId: context.id, title: context.title, meta: 'Contexto' });
      }

      context.subcontexts.forEach(subcontext => {
        const subcontextText = normalize(`${context.title} ${subcontext.title}`);
        if (subcontextText.includes(normalized)) {
          results.push({ type: 'subcontext', contextId: context.id, subcontextId: subcontext.id, title: subcontext.title, meta: context.title });
        }

        subcontext.cards.forEach(cardId => {
          const card = getCard(cardId);
          const sources = getSourcesForCard(cardId);
          if (card && buildSearchHaystack({ context, subcontext, card, sources }).includes(normalized)) {
            const existing = cardResults.get(cardId) || {
              type: 'card',
              contextId: context.id,
              subcontextId: subcontext.id,
              cardId,
              title: card.title,
              meta: `${context.title} / ${subcontext.title}`,
              breadcrumbs: []
            };
            existing.breadcrumbs.push(`${context.title} / ${subcontext.title}`);
            cardResults.set(cardId, existing);
          }
        });
      });
    });

    const merged = [...results, ...cardResults.values()];
    return merged.filter((result, index, arr) => {
      const key = `${result.type}:${result.contextId}:${result.subcontextId || ''}:${result.cardId || ''}`;
      return arr.findIndex(item => `${item.type}:${item.contextId}:${item.subcontextId || ''}:${item.cardId || ''}` === key) === index;
    });
  }

  function buildMemoryBlock({ contextId, subcontextId, cardId } = {}) {
    const card = getCard(cardId || state.activeCardId);
    const location = card
      ? getCardLocations(card.id).find(item => (!contextId || item.context.id === contextId) && (!subcontextId || item.subcontext.id === subcontextId)) || getCardLocations(card.id)[0]
      : null;
    const context = getContext(contextId || state.activeContextId) || location?.context || null;
    const subcontext = context ? getSubcontext(context.id, subcontextId || state.activeSubcontextId) || location?.subcontext || null : null;
    if (!context && !card) return '';

    const excerpts = card?.excerpts?.filter(excerpt => state.selectedExcerpts.includes(excerpt.id)) || [];
    const sources = card ? getSourcesForCard(card.id) : [];
    return [
      '[MEMORY CARD ATIVO]',
      `Contexto: ${context?.title || '(nao definido)'}`,
      `Subcontexto: ${subcontext?.title || '(nao definido)'}`,
      `Card: ${card?.title || '(nenhum card selecionado)'}`,
      `Resumo: ${card?.content || context?.title || ''}`,
      'Trechos selecionados:',
      excerpts.length ? excerpts.map(excerpt => `- ${excerpt.text}`).join('\n') : '- nenhum trecho marcado',
      sources.length ? 'Fontes locais:' : '',
      sources.length ? sources.map(source => `- ${source.name}: ${source.content.slice(0, 1200)}`).join('\n') : '',
      'Regras de uso:',
      card?.rules?.length ? card.rules.map(rule => `- ${rule}`).join('\n') : '- usar apenas como contexto operacional local'
    ].filter(Boolean).join('\n');
  }

  function buildActiveMemorySandbox() {
    const selectedContextIds = new Set(state.selectedContexts || []);
    const selectedSubcontextKeys = new Set(state.selectedSubcontexts || []);
    const selectedCardIds = new Set(state.selectedCards || []);
    const selectedSnippetIds = new Set(state.selectedExcerpts || []);

    const selectedContexts = TAXONOMY.filter(context =>
      selectedContextIds.has(context.id) ||
      context.subcontexts.some(subcontext => selectedSubcontextKeys.has(subcontextKey(context.id, subcontext.id)))
    );
    const selectedSubcontexts = selectedContexts.flatMap(context =>
      context.subcontexts
        .filter(subcontext => selectedSubcontextKeys.has(subcontextKey(context.id, subcontext.id)))
        .map(subcontext => ({ ...subcontext, contextId: context.id, contextTitle: context.title }))
    );
    const selectedCards = [...new Map(
      [...selectedCardIds].map(cardId => getCard(cardId)).filter(Boolean).map(card => [card.id, card])
    ).values()];
    const selectedSnippets = selectedCards
      .flatMap(card => card.excerpts || [])
      .filter(snippet => selectedSnippetIds.has(snippet.id))
      .filter((snippet, index, arr) => arr.findIndex(item => item.id === snippet.id) === index);
    const selectedSources = state.localSources.filter(source =>
      selectedContextIds.has(source.contextId) ||
      selectedSubcontextKeys.has(subcontextKey(source.contextId, source.subcontextId)) ||
      selectedCardIds.has(source.cardId)
    );
    const summary = selectedCards.map(card => card.content).filter(Boolean).join('\n\n');
    const rules = [...new Set(selectedCards.flatMap(card => card.rules || []))];
    const contextTitle = selectedContexts.map(context => context.title).join(', ');
    const injectionText = selectedContexts.length || selectedSubcontexts.length || selectedCards.length || selectedSnippets.length
      ? [
        '[MEMORY CONTEXT ATIVO]',
        `Contexto: ${contextTitle || '(nenhum)'}`,
        `Subcontextos selecionados: ${selectedSubcontexts.map(item => item.title).join(', ') || '(nenhum)'}`,
        `Cards incluídos: ${selectedCards.map(item => item.title).join(', ') || '(nenhum)'}`,
        '',
        'Resumo:',
        summary || selectedContexts.map(context => context.description).filter(Boolean).join('\n\n'),
        '',
        'Trechos selecionados:',
        selectedSnippets.length ? selectedSnippets.map(snippet => `- ${snippet.text}`).join('\n') : '- nenhum trecho marcado',
        '',
        'Regras de uso:',
        rules.length ? rules.map(rule => `- ${rule}`).join('\n') : '- usar apenas como contexto operacional local'
      ].filter(Boolean).join('\n')
      : '';

    return {
      selectedContexts,
      selectedSubcontexts,
      selectedCards,
      selectedSnippets,
      selectedSources,
      summary,
      injectionText
    };
  }

  function buildActiveMemoryPayload() {
    return buildActiveMemorySandbox().injectionText;
  }

  function formatContextList() {
    return [
      'Memory Cards locais',
      '',
      ...TAXONOMY.map(context => `- ${context.title}${context.subcontexts.length ? ` (${context.subcontexts.length} subcontextos)` : ''}`),
      '',
      'Use: /memory espiritualidade'
    ].join('\n');
  }

  function handleMemoryCommand(raw) {
    const text = String(raw || '').trim();
    const query = normalize(text.replace(/^\/memory/i, ''));
    if (!query) return { handled: true, reply: formatContextList() };

    const context = TAXONOMY.find(item => normalize(item.title).includes(query) || item.id.includes(query));
    if (context) {
      updateState({
        expandedContexts: [...new Set([...state.expandedContexts, context.id])],
        selectedContexts: [...new Set([...state.selectedContexts, context.id])],
        activeContextId: context.id
      });
      const cards = context.subcontexts.flatMap(subcontext => subcontext.cards.map(cardId => getCard(cardId)).filter(Boolean));
      return {
        handled: true,
        reply: [
          `Contexto selecionado: ${context.title}`,
          '',
          context.subcontexts.length ? 'Subcontextos:' : 'Sem subcontextos locais ainda.',
          ...context.subcontexts.map(subcontext => `- ${subcontext.title}`),
          '',
          cards.length ? 'Cards disponiveis:' : '',
          ...cards.map(card => `- ${card.title}`)
        ].filter(Boolean).join('\n')
      };
    }

    const results = search(query);
    return {
      handled: true,
      reply: results.length
        ? ['Resultados locais:', '', ...results.slice(0, 8).map(result => `- ${result.title} (${result.meta})`)].join('\n')
        : `Nenhum contexto local encontrado para: ${text.replace(/^\/memory/i, '').trim()}`
    };
  }

  window.WorionMemoryCardsRuntime = {
    getState,
    getContexts,
    getCard,
    getContext,
    getSubcontext,
    getSourcesForCard,
    getSourcesForContext,
    getSourcesForSubcontext,
    getMemoryCardsList,
    openMemoryCardProject,
    getMemoryCardInstructions,
    saveMemoryCardInstructions,
    getMemoryCardRulesText,
    getMemoryCardRulesInfo,
    updateMemoryCardKnowledge,
    attachMemoryCardFile,
    getMemoryCardFiles,
    removeMemoryCardFile,
    buildMemoryCardChatContext,
    activateMemoryCardForChat,
    getContextOverview,
    getSubcontextDetail,
    toggleExpandedContext,
    toggleContextSelection,
    toggleSubcontextSelection,
    toggleCardSelection,
    toggleExcerptSelection,
    toggleSnippetSelection,
    __updateState: updateState,
    activate,
    addLocalSource,
    search,
    buildMemoryBlock,
    buildActiveMemorySandbox,
    buildActiveMemoryPayload,
    handleMemoryCommand
  };
})();
