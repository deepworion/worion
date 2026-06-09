require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const { spawnSync } = require('child_process');

function readEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function requireEnv(...names) {
  const value = readEnv(...names);
  if (!value) throw new Error(`Configure ${names.join(' ou ')} no .env local.`);
  return value;
}

async function getVaultValueById(id) {
  const supabaseUrl = requireEnv('WORION_VAULT_SUPABASE_URL', 'SUPABASE_URL');
  const serviceKey = requireEnv('WORION_VAULT_SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_KEY');
  const response = await fetch(`${supabaseUrl}/rest/v1/api_keys_vault_v2?id=eq.${encodeURIComponent(id)}&select=value&limit=1`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });

  if (!response.ok) throw new Error(`Supabase Vault error: ${response.status}`);
  const rows = await response.json();
  const value = String(rows[0]?.value || '').trim();
  if (!value) throw new Error(`Brave API key nao encontrada na Vault Supabase id ${id}.`);
  return value;
}

async function main() {
  const braveApiKey = await getVaultValueById(21);
  const result = spawnSync('docker', ['compose', '-f', 'docker-compose.yml', 'up', '-d', 'brave-search-mcp'], {
    cwd: require('path').join(__dirname, '..'),
    env: {
      ...process.env,
      BRAVE_API_KEY: braveApiKey
    },
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(`docker compose falhou com status ${result.status}`);
  }

  console.log('brave-search-mcp iniciado em http://localhost:8080/sse');
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
