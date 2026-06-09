/**
 * MODULO: tracing.js
 * RESPONSABILIDADE: Tracing resiliente de mensagens no LangSmith
 * DEPENDENCIAS: connectors.js (SUPABASE_URL, supabaseHeaders)
 * EXPORTA: initTracing, startTrace, logStep, endTrace, traceError, setCurrentTraceRun, getCurrentTraceRun, updateTraceMetadata, markTraceFlag
 */

// ============================================
// LANGSMITH TRACING
// ============================================

const LANGSMITH_DEFAULT_PROJECT = 'worion-desktop';
const LANGSMITH_TRUNCATE_LIMIT = 2000;

let langSmithTracing = {
  enabled: false,
  initialized: false,
  client: null,
  RunTree: null,
  projectName: LANGSMITH_DEFAULT_PROJECT,
  currentRun: null,
  loggedDisabled: false
};

function summarizeTraceError(error) {
  return String(error?.message || error || 'erro desconhecido')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .replace(/(api[_-]?key|token|secret|password)=([^&\s]+)/gi, '$1=[redacted]')
    .slice(0, 180);
}

function logLangSmithTraceError(error) {
  try {
    console.warn(`[LangSmith] trace error: ${summarizeTraceError(error)}`);
  } catch {}
}

function truncateTraceString(value) {
  const text = String(value || '');
  return text.length > LANGSMITH_TRUNCATE_LIMIT
    ? `${text.slice(0, LANGSMITH_TRUNCATE_LIMIT)}...[truncated]`
    : text;
}

function redactTraceString(value) {
  return truncateTraceString(value)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .replace(/(sk-[A-Za-z0-9_-]{12,})/g, '[redacted-openai-key]')
    .replace(/(ntn_[A-Za-z0-9_-]{12,})/g, '[redacted-notion-token]');
}

function sanitizeTracePayload(value, depth = 0, keyName = '') {
  if (depth > 5) return '[max-depth]';
  if (value == null) return value;
  if (/^(authorization|api[_-]?key|token|secret|password|value)$/i.test(String(keyName || ''))) {
    return '[redacted]';
  }
  if (typeof value === 'string') return redactTraceString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return summarizeTraceError(value);
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(item => sanitizeTracePayload(item, depth + 1));
  }
  if (typeof value === 'object') {
    const output = {};
    for (const [key, item] of Object.entries(value).slice(0, 40)) {
      output[key] = sanitizeTracePayload(item, depth + 1, key);
    }
    return output;
  }
  return truncateTraceString(value);
}

function normalizeTraceMetadata(metadata = {}) {
  return sanitizeTracePayload({
    agentId: metadata.agentId ?? null,
    agentName: metadata.agentName ?? null,
    activeSkillId: metadata.activeSkillId ?? null,
    activeWorkModeId: metadata.activeWorkModeId ?? null,
    model: metadata.model ?? null,
    documentsCount: Number(metadata.documentsCount || 0),
    memoryContextSize: Number(metadata.memoryContextSize || 0),
    promptSize: Number(metadata.promptSize || 0),
    hasNotionCall: Boolean(metadata.hasNotionCall),
    hasExternalSearch: Boolean(metadata.hasExternalSearch),
    ...metadata
  });
}

async function fetchLangSmithApiKeyFromVault() {
  try {
    if (typeof supabase !== 'undefined' && supabase?.from) {
      const { data } = await supabase
        .from('api_keys_vault_v2')
        .select('value')
        .eq('provider', 'langSmith')
        .eq('key', 'api_key')
        .eq('store', 'worion')
        .single();
      return data?.value ?? null;
    }

    if (typeof SUPABASE_URL === 'undefined' || typeof supabaseHeaders !== 'function') return null;
    const url = new URL(`${SUPABASE_URL}/rest/v1/api_keys_vault_v2`);
    url.searchParams.set('select', 'value');
    url.searchParams.set('provider', 'eq.langSmith');
    url.searchParams.set('key', 'eq.api_key');
    url.searchParams.set('store', 'eq.worion');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), { headers: supabaseHeaders() });
    if (!response.ok) return null;
    const rows = await response.json();
    return rows?.[0]?.value ?? null;
  } catch (error) {
    logLangSmithTraceError(error);
    return null;
  }
}

async function initTracing() {
  try {
    if (langSmithTracing.initialized) return langSmithTracing.enabled;
    langSmithTracing.initialized = true;

    const apiKey = await fetchLangSmithApiKeyFromVault();
    if (!apiKey) {
      console.log('[LangSmith] tracing disabled');
      langSmithTracing.loggedDisabled = true;
      return false;
    }

    const { Client, RunTree } = require('langsmith');
    langSmithTracing.projectName =
      (typeof process !== 'undefined' && process.env?.LANGSMITH_PROJECT) ||
      LANGSMITH_DEFAULT_PROJECT;

    if (typeof process !== 'undefined' && process.env) {
      process.env.LANGSMITH_PROJECT = langSmithTracing.projectName;
      process.env.LANGCHAIN_TRACING_V2 = process.env.LANGCHAIN_TRACING_V2 || 'true';
      process.env.LANGSMITH_API_KEY = apiKey;
    }

    langSmithTracing.client = new Client({
      apiKey,
      timeout_ms: 5000,
      autoBatchTracing: true
    });
    langSmithTracing.RunTree = RunTree;
    langSmithTracing.enabled = true;
    console.log('[LangSmith] tracing enabled');
    return true;
  } catch (error) {
    langSmithTracing.enabled = false;
    logLangSmithTraceError(error);
    console.log('[LangSmith] tracing disabled');
    return false;
  }
}

function startTrace(name, metadata = {}) {
  try {
    if (!langSmithTracing.enabled || !langSmithTracing.RunTree || !langSmithTracing.client) return null;
    const normalizedMetadata = normalizeTraceMetadata(metadata);
    const run = new langSmithTracing.RunTree({
      name,
      run_type: 'chain',
      inputs: sanitizeTracePayload({ message: metadata.userMessage || name }),
      project_name: langSmithTracing.projectName,
      client: langSmithTracing.client,
      metadata: normalizedMetadata,
      serialized: { name: 'Worion Desktop message trace' }
    });
    run.__worionTraceMetadata = normalizedMetadata;
    run.__worionTraceEnded = false;
    setCurrentTraceRun(run);
    run.postRun().catch(logLangSmithTraceError);
    return run;
  } catch (error) {
    logLangSmithTraceError(error);
    return null;
  }
}

function getTraceRunType(stepName) {
  if (stepName === 'openaiResponse') return 'llm';
  if (/tool|notion|search/i.test(stepName)) return 'tool';
  return 'chain';
}

async function logStep(run, stepName, input, output) {
  try {
    if (!langSmithTracing.enabled || !run?.createChild) return null;
    const child = run.createChild({
      name: stepName,
      run_type: getTraceRunType(stepName),
      inputs: sanitizeTracePayload(input || {}),
      metadata: normalizeTraceMetadata(run.__worionTraceMetadata || {}),
      serialized: { name: stepName }
    });
    await child.postRun();
    await child.end(sanitizeTracePayload(output || {}));
    await child.patchRun();
    return child;
  } catch (error) {
    logLangSmithTraceError(error);
    return null;
  }
}

async function endTrace(run, output) {
  try {
    if (!langSmithTracing.enabled || !run || run.__worionTraceEnded) return;
    run.__worionTraceEnded = true;
    run.metadata = normalizeTraceMetadata(run.__worionTraceMetadata || {});
    await run.end(sanitizeTracePayload(output || {}));
    await run.patchRun();
  } catch (error) {
    logLangSmithTraceError(error);
  } finally {
    if (langSmithTracing.currentRun === run) langSmithTracing.currentRun = null;
  }
}

async function traceError(run, stepName, error) {
  try {
    if (!langSmithTracing.enabled || !run?.createChild) return;
    const child = run.createChild({
      name: stepName,
      run_type: getTraceRunType(stepName),
      inputs: {},
      error: summarizeTraceError(error),
      metadata: normalizeTraceMetadata(run.__worionTraceMetadata || {}),
      serialized: { name: stepName }
    });
    await child.postRun();
    await child.end({}, summarizeTraceError(error));
    await child.patchRun();
  } catch (traceFailure) {
    logLangSmithTraceError(traceFailure);
  }
}

function setCurrentTraceRun(run) {
  langSmithTracing.currentRun = run || null;
}

function getCurrentTraceRun() {
  return langSmithTracing.currentRun || null;
}

function updateTraceMetadata(run, metadata = {}) {
  try {
    if (!run) return;
    run.__worionTraceMetadata = normalizeTraceMetadata({
      ...(run.__worionTraceMetadata || {}),
      ...metadata
    });
    run.metadata = run.__worionTraceMetadata;
  } catch (error) {
    logLangSmithTraceError(error);
  }
}

function markTraceFlag(run, flagName, value = true) {
  if (!run || !flagName) return;
  updateTraceMetadata(run, { [flagName]: value });
}
