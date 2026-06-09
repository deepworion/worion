const fs = require('fs');
const path = require('path');
const { Client } = require('langsmith');

const root = path.resolve(__dirname, '..');
const connectors = fs.readFileSync(path.join(root, 'js', 'connectors.js'), 'utf-8');
const supabaseUrl = connectors.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const supabaseKey = connectors.match(/const SUPABASE_SERVICE_KEY = '([^']+)'/)?.[1];

async function getLangSmithKey() {
  const url = new URL(`${supabaseUrl}/rest/v1/api_keys_vault_v2`);
  url.searchParams.set('select', 'value');
  url.searchParams.set('provider', 'eq.langSmith');
  url.searchParams.set('key', 'eq.api_key');
  url.searchParams.set('store', 'eq.worion');
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 180)}`);
  const rows = await response.json();
  return rows[0]?.value || null;
}

async function main() {
  const apiKey = await getLangSmithKey();
  if (!apiKey) {
    console.log(JSON.stringify({ ok: false, error: 'LangSmith key not found' }, null, 2));
    return;
  }

  const client = new Client({ apiKey, timeout_ms: 10000 });
  const startTime = new Date(Date.now() - 20 * 60 * 1000);
  const roots = [];
  for await (const run of client.listRuns({
    projectName: 'worion-desktop',
    isRoot: true,
    startTime,
    order: 'desc',
    limit: 10
  })) {
    if (run.name === 'Worion Desktop message') roots.push(run);
  }

  const details = [];
  for (const run of roots.slice(0, 4)) {
    const children = [];
    for await (const child of client.listRuns({
      projectName: 'worion-desktop',
      traceId: run.trace_id || run.id,
      startTime,
      order: 'asc',
      limit: 30
    })) {
      if (child.id !== run.id) children.push({
        name: child.name,
        runType: child.run_type,
        error: child.error || null
      });
    }
    details.push({
      id: run.id,
      traceId: run.trace_id || run.id,
      name: run.name,
      metadata: run.extra?.metadata || {},
      error: run.error || null,
      childNames: children.map(item => item.name),
      children
    });
  }

  console.log(JSON.stringify({
    ok: roots.length > 0,
    rootCount: roots.length,
    details
  }, null, 2));
}

main().catch(error => {
  console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
