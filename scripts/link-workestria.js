#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function linkWorkestriaChunks() {
  const { createClient } = require('@supabase/supabase-js');

  const SUPABASE_URL = process.env.WORION_MEMORY_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.WORION_MEMORY_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Buscar o card Workestria existente
  const { data: card } = await supabase
    .from('memory_cards_v2')
    .select('id')
    .eq('slug', 'workestria')
    .single();

  if (!card) {
    console.log('Card Workestria não encontrado');
    return;
  }

  console.log(`Card Workestria ID: ${card.id}`);

  // Buscar conversas não vinculadas
  const { data: chunks } = await supabase
    .from('memory_chunks')
    .select('id, conversation_id, metadata')
    .is('metadata->context_id', null);

  console.log(`${chunks.length} chunks sem card encontrados`);

  let updated = 0;
  for (const chunk of chunks) {
    const updatedMetadata = { ...(chunk.metadata || {}), context_id: card.id };
    await supabase
      .from('memory_chunks')
      .update({ metadata: updatedMetadata })
      .eq('id', chunk.id);
    updated++;
  }

  console.log(`✅ ${updated} chunks vinculados ao card Workestria`);
}

linkWorkestriaChunks()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('ERRO:', err);
    process.exit(1);
  });
