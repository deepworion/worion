// Script de Teste das Integrações
// Execute: node test-integrations.js

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Configure ${name} no .env local.`);
  return value;
}

async function getVaultRows(provider) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/api_keys_vault_v2?provider=eq.${encodeURIComponent(provider)}&select=provider,key,store,value`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  if (!response.ok) throw new Error(`Supabase vault error: ${response.status}`);
  return await response.json();
}

function findVaultValue(rows, keys) {
  const normalizedKeys = keys.map(key => key.toLowerCase());
  const row = rows.find(item => normalizedKeys.includes(String(item.key || '').trim().toLowerCase()));
  return row?.value || null;
}

console.log('🧪 Testando integrações do Worion Desktop...\n');

// ============================================
// 1. TESTAR PASTA AGENTS
// ============================================

console.log('1️⃣  Testando pasta agents/');
const agentsDir = path.join(__dirname, 'agents');

try {
  if (!fs.existsSync(agentsDir)) {
    throw new Error('Pasta agents/ não encontrada');
  }

  const files = fs.readdirSync(agentsDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  if (mdFiles.length === 0) {
    console.log('   ⚠️  Nenhum agente encontrado');
  } else {
    console.log(`   ✅ ${mdFiles.length} agente(s) encontrado(s):`);
    mdFiles.forEach(f => console.log(`      - ${f}`));
  }
} catch (error) {
  console.log(`   ❌ Erro: ${error.message}`);
}

// ============================================
// 2. TESTAR SUPABASE
// ============================================

console.log('\n2️⃣  Testando conexão com Supabase...');

const SUPABASE_URL = requireEnv('WORION_VAULT_SUPABASE_URL');
const SUPABASE_SERVICE_KEY = requireEnv('WORION_VAULT_SUPABASE_SERVICE_KEY');

fetch(`${SUPABASE_URL}/rest/v1/api_keys_vault_v2?provider=eq.openai&store=eq.workestria&select=value`, {
  headers: {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
  }
})
.then(response => {
  if (!response.ok) {
    throw new Error(`Status ${response.status}`);
  }
  return response.json();
})
.then(data => {
  if (data.length === 0) {
    console.log('   ⚠️  OpenAI key não encontrada na tabela');
  } else {
    const key = data[0].value;
    console.log(`   ✅ OpenAI key encontrada: ${key.substring(0, 8)}...`);
  }
})
.catch(error => {
  console.log(`   ❌ Erro: ${error.message}`);
});

// ============================================
// 3. TESTAR NOTION
// ============================================

console.log('\n3️⃣  Testando conexão com Notion...');

getVaultRows('notion')
.then(rows => {
  const notionToken = findVaultValue(rows, ['api_key', 'token', 'notion_token', 'value']);
  if (!notionToken) throw new Error('Notion token nao encontrado na Vault Supabase (provider=notion).');
  return fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      filter: { property: 'object', value: 'database' },
      page_size: 5
    })
  });
})
.then(response => {
  if (!response.ok) {
    throw new Error(`Status ${response.status}`);
  }
  return response.json();
})
.then(data => {
  console.log(`   ✅ Notion conectado! ${data.results.length} database(s) acessível(is):`);
  data.results.forEach(db => {
    const title = db.title[0]?.plain_text || 'Sem título';
    console.log(`      - ${title}: ${db.id}`);
  });

  console.log('\n   💡 Dica: Use um desses IDs no index.html (linha ~350)');
})
.catch(error => {
  console.log(`   ❌ Erro: ${error.message}`);
});

// ============================================
// RESUMO
// ============================================

setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 Resumo dos Testes');
  console.log('='.repeat(50));
  console.log('\nPróximos passos:');
  console.log('1. Configure NOTION_DATABASE_ID no index.html');
  console.log('2. Execute: npm start');
  console.log('3. Teste o chat com o agente "Diário Reflexivo"');
  console.log('\n🚀 Tudo pronto para começar!\n');
}, 2000);
