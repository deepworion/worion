/**
 * MÓDULO: logger.js
 * RESPONSABILIDADE: Sistema de logs de ações e logs internos com persistência em JSONL
 * DEPENDÊNCIAS: app.js
 * EXPORTA: logAction, logInternalAction
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: app.js (usa actionLog, worionConfig, DATA_DIR, path, fs)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================
// LOGGER
// ============================================

function logAction(action, status, result = '', durationMs = 0) {
  const entry = { ts: new Date().toISOString(), action, status, result: String(result).slice(0, 300), durationMs };
  actionLog.push(entry);
  console.log(`[Worion Tool] ${status.toUpperCase()} ${action} (${durationMs}ms)`, result ? `-> ${String(result).slice(0, 120)}` : '');
}

async function logInternalAction(action, status, payload = {}, durationMs = 0) {
  const entry = {
    ts: new Date().toISOString(),
    action,
    status,
    payload,
    durationMs,
    internal: true
  };
  actionLog.push({ ...entry, result: JSON.stringify(payload).slice(0, 300) });
  if (!worionConfig.internalLogs) return entry;
  try {
    const dir = path.join(DATA_DIR, 'logs', 'internal');
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}.jsonl`);
    await fs.appendFile(file, `${JSON.stringify(entry)}\n`, 'utf-8');
  } catch (error) {
    console.warn('Falha ao gravar log interno:', error.message);
  }
  return entry;
}
