#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function runClassification() {
  const { createClient } = require('@supabase/supabase-js');

  console.log('[Memory] Iniciando classificação via Haiku...');

  const SUPABASE_URL = process.env.WORION_MEMORY_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.WORION_MEMORY_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL/KEY não configurados');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Buscar Anthropic key do vault
  const VAULT_URL = process.env.WORION_VAULT_SUPABASE_URL;
  const VAULT_KEY = process.env.WORION_VAULT_SUPABASE_SERVICE_KEY;

  const vaultResp = await fetch(`${VAULT_URL}/rest/v1/api_keys_vault_v2?provider=eq.claude.ai&select=value&limit=1`, {
    headers: {
      'apikey': VAULT_KEY,
      'Authorization': `Bearer ${VAULT_KEY}`
    }
  });

  const vaultData = await vaultResp.json();
  const ANTHROPIC_KEY = vaultData[0]?.value;

  if (!ANTHROPIC_KEY) {
    throw new Error('Anthropic key não encontrada no vault');
  }

  console.log('[Memory] ✅ Keys carregadas');

  const { data: openers, error: e1 } = await supabase
    .from('memory_chunks')
    .select('conversation_id, source_id, content, chunk_index, role')
    .order('chunk_index', { ascending: true });

  if (e1) throw e1;

  const convMap = {};
  for (const chunk of openers) {
    if (!convMap[chunk.conversation_id]) convMap[chunk.conversation_id] = [];
    if (convMap[chunk.conversation_id].length < 2)
      convMap[chunk.conversation_id].push(chunk);
  }

  const convIds = Object.keys(convMap);
  console.log(`[Memory] ${convIds.length} conversas para classificar`);

  const CATEGORIAS = ['worion','workestria','luppet','pessoal','espiritual','tcc','tecnico','outro'];
  const classified = {};

  const BATCH = 10;

  for (let i = 0; i < convIds.length; i += BATCH) {
    const batch = convIds.slice(i, i + BATCH);
    await Promise.all(batch.map(async (convId) => {
      const chunks = convMap[convId];
      const preview = chunks.map(c => `[${c.role}]: ${c.content.slice(0, 300)}`).join('\n');
      const source = chunks[0]?.source_id || 'claude';

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 20,
          system: `Classifique a conversa em UMA das categorias: ${CATEGORIAS.join(', ')}. Responda APENAS com o nome da categoria, sem mais nada.`,
          messages: [{ role: 'user', content: `source: ${source}\n\n${preview}` }]
        })
      });

      const data = await resp.json();
      const cat = (data.content?.[0]?.text || 'outro').trim().toLowerCase();
      const finalCat = CATEGORIAS.includes(cat) ? cat : 'outro';
      if (!classified[finalCat]) classified[finalCat] = [];
      classified[finalCat].push(convId);
    }));
    console.log(`[Memory] Batch ${Math.floor(i/BATCH)+1}/${Math.ceil(convIds.length/BATCH)} concluído`);
  }

  const cardDefs = {
    worion:     { title: 'Worion — Desenvolvimento & Arquitetura', domain: 'technical',            icon: '🧠' },
    workestria: { title: 'Workestria — SaaS & Workflows',          domain: 'product',              icon: '⚙️' },
    luppet:     { title: 'Luppet — Pipeline de Imagens',           domain: 'product',              icon: '🐾' },
    pessoal:    { title: 'Rotina & Reflexões Pessoais',            domain: 'health_routine',       icon: '📔' },
    espiritual: { title: 'Espiritualidade & Filosofia',            domain: 'spiritual_reflective', icon: '🌀' },
    tcc:        { title: 'TCC & Escrita Acadêmica',                domain: 'profile',              icon: '📚' },
    tecnico:    { title: 'Técnico Geral — Infra & Código',         domain: 'technical',            icon: '🔧' },
    outro:      { title: 'Conversas Diversas',                     domain: 'operational',          icon: '💬' },
  };

  const createdCards = [];

  for (const [cat, convList] of Object.entries(classified)) {
    if (!convList.length) continue;
    const def = cardDefs[cat] || cardDefs.outro;

    const { data: card, error: e2 } = await supabase
      .from('memory_cards_v2')
      .insert({
        title: def.title,
        slug: cat,
        domain: def.domain,
        status: 'card_active',
        confidence_score: 70,
        summary: `${convList.length} conversas classificadas automaticamente via Haiku.`,
        metadata: { icon: def.icon, source_conversations: convList.length, classified_at: new Date().toISOString(), auto_classified: true }
      })
      .select()
      .single();

    if (e2) {
      console.error(`[Memory] Erro card ${cat}:`, e2);
      continue;
    }

    // Vincular chunks ao card (batch update via conversationlist)
    for (const convId of convList) {
      const { data: chunks } = await supabase
        .from('memory_chunks')
        .select('id, metadata')
        .eq('conversation_id', convId);

      if (chunks) {
        for (const chunk of chunks) {
          const updatedMetadata = { ...(chunk.metadata || {}), context_id: card.id };
          await supabase
            .from('memory_chunks')
            .update({ metadata: updatedMetadata })
            .eq('id', chunk.id);
        }
      }
    }

    createdCards.push({ id: card.id, title: def.title, conversations: convList.length, category: cat });
    console.log(`[Memory] ✅ ${def.title} — ${convList.length} conversas`);
  }

  console.log('\n========== RESULTADO ==========');
  console.log(JSON.stringify({
    ok: true,
    cards_created: createdCards.length,
    total_conversations: convIds.length,
    breakdown: Object.fromEntries(Object.entries(classified).map(([k,v]) => [k, v.length])),
    cards: createdCards
  }, null, 2));

  return createdCards;
}

runClassification()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[Memory] ERRO:', err);
    process.exit(1);
  });
