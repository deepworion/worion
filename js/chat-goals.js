/**
 * MÃ“DULO: chat-goals.js
 * RESPONSABILIDADE: Goal Execution Engine, objetivos compostos, estado do goal e relatÃ³rios
 * DEPENDÃŠNCIAS: js/chat-routing.js, js/chat-models.js, js/chat-normalization.js, js/prompt.js, js/tools.js, js/app.js, js/chat.js
 * EXPORTA: classifyUserRequest, classifyRequestHeuristic, getToolDefinition, getGoalTools, isToolExecutionRequest, isConceptualSynthesisRequest, shouldUseGoalEngineForRequest, buildAttachmentContextForPrompt, buildSmartResearchQueries, formatResearchResults, withTimeout, generateSmartResearchReply, executeCompoundGoal, executeGoalToolCall, collectGoalFindings, goalExecutionState, cancelCurrentGoal, interruptCurrentResponse, buildGoalExecutionPrompt, buildGoalReport, isComplexRequest, getSequentialThinkingContext
 * TOOLS REGISTRADAS: nenhuma
 * NÃƒO MODIFICAR SEM LER: js/chat-routing.js, js/tools.js, js/prompt.js, js/app.js, js/chat.js
 * PROBLEMAS CONHECIDOS: execuÃ§Ã£o composta ainda depende de estado global e telemetria parcial
 */

async function classifyUserRequest(content, attachments = []) {
  return {
    route: getExecutionRoute(content),
    attachmentsCount: attachments.length
  };
}

function classifyRequestHeuristic(text, attachments = []) {
  return {
    text,
    attachmentsCount: attachments.length
  };
}

function getToolDefinition(name) {
  return typeof toolsRegistry !== 'undefined' && typeof toolsRegistry?.get === 'function'
    ? toolsRegistry.get(name)
    : null;
}

function getGoalTools() {
  return typeof worionGoalTools !== 'undefined' && Array.isArray(worionGoalTools) ? worionGoalTools : [];
}

function isToolExecutionRequest(text, attachments = []) {
  return /tool|ferramenta/i.test(String(text || '')) || attachments.length > 0;
}

function isConceptualSynthesisRequest(text) {
  return /sintet|compar|analis/i.test(String(text || ''));
}

function shouldUseGoalEngineForRequest(content, attachments = [], classification = {}) {
  return Boolean(
    isToolExecutionRequest(content, attachments) ||
    ['compound_goal', 'tool_execution'].includes(classification?.route)
  );
}

function buildAttachmentContextForPrompt(attachments = []) {
  return attachments.map(file => `Anexo: ${file.name}`).join('\n');
}

function buildSmartResearchQueries(content) {
  return getDeterministicResearchQueries(content);
}

function formatResearchResults(results = []) {
  return results.map(item => item.title || item.url || item.snippet || '').filter(Boolean).join('\n');
}

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ]);
}

async function generateSmartResearchReply(content, attachments = [], verificationPlan = null, sourceMessages = messages) {
  const attachmentContext = typeof buildAttachmentContextForPrompt === 'function'
    ? buildAttachmentContextForPrompt(attachments)
    : '';
  const systemPrompt = typeof buildSystemPrompt === 'function'
    ? buildSystemPrompt(content, attachments, attachmentContext)
    : 'Voce e o Worion. Pesquise, leia fontes e sintetize sem bloquear por lacunas.';
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...(sourceMessages || [])
      .filter(message => message.content !== '...' && ['user', 'assistant'].includes(message.role))
      .slice(-8)
      .map(message => typeof formatMessageForOpenAI === 'function' ? formatMessageForOpenAI(message) : message)
  ];
  const profile = typeof EXECUTION_PROFILES !== 'undefined'
    ? (EXECUTION_PROFILES.deep_research || EXECUTION_PROFILES.focused_research)
    : { maxTokens: 12000, maxFetches: 5, thinking: 'enabled', secondaryTools: ['tavily_search'] };
  const result = typeof runDeterministicResearchRoute === 'function'
    ? await runDeterministicResearchRoute(apiMessages, content, profile, {
        temperature: 0.35,
        max_tokens: profile.maxTokens || 12000,
        thinking: profile.thinking,
        executionRoute: 'deep_research'
      })
    : null;
  return result?.content || 'Nao consegui executar a pesquisa neste fluxo.';
}

async function executeCompoundGoal(content, attachments = [], classification = {}, verificationPlan = null) {
  currentGoalAborted = false;
  const startedAt = Date.now();
  const timeoutMs = Math.max(10, Number(worionConfig.goalTimeout || 120)) * 1000;
  const goalId = makeId('goal');
  currentGoalRun = {
    id: goalId,
    objective: content,
    status: 'running',
    startedAt: new Date().toISOString(),
    tools: [],
    errors: [],
    findings: [],
    actions: [],
    verificationPlan: verificationPlan || null
  };

  await logInternalAction('goal_started', 'success', { goalId, objective: content, classification, verificationRequired: verificationPlan?.mustUseExternalEvidence });
  const thinkingContext = await getSequentialThinkingContext(content, attachments);
  const agentDomainResearchContext = await buildAgentDomainResearchContext(content, attachments);
  const toolHistory = [];
  let finalText = '';
  let status = 'concluido';

  let attachmentContext = '';
  if (attachments.length > 0) {
    const textAttachments = attachments.filter(f => (f.kind === 'text' || f.kind === 'unsupported') && (f.extractedText || f.text));
    if (textAttachments.length > 0) {
      attachmentContext = `\n\nðŸ“Ž ARQUIVOS ANEXADOS (${textAttachments.length}):\n` +
        textAttachments.map(f => {
          const excerpt = (f.extractedText || f.text || '').slice(0, 200);
          return `- ${f.name} (${(f.size/1024).toFixed(1)}KB)\n  InÃ­cio: ${excerpt}...`;
        }).join('\n') +
        '\n\nO conteÃºdo completo estÃ¡ na mensagem do usuÃ¡rio. Use-o para responder. NUNCA diga "arquivo nÃ£o foi encontrado" - o conteÃºdo estÃ¡ disponÃ­vel acima.';
    }
  }

  const goalSystemPrompt = buildSystemPrompt(content, attachments, [attachmentContext, agentDomainResearchContext].filter(Boolean).join('\n\n'));
  await tracePromptStep(typeof getCurrentTraceRun === 'function' ? getCurrentTraceRun() : null, goalSystemPrompt, {
    route: 'compound_goal',
    attachmentsCount: attachments.length
  });

  const goalMessages = [
    { role: 'system', content: buildGoalExecutionPrompt() },
    { role: 'system', content: goalSystemPrompt },
    ...(thinkingContext ? [{ role: 'system', content: thinkingContext }] : []),
    formatMessageForOpenAI({ role: 'user', content, attachments })
  ];

  const route = typeof getExecutionRoute === 'function' ? getExecutionRoute(content) : null;
  const executionProfile = route ? EXECUTION_PROFILES[route] : null;
  const maxTokens = executionProfile?.maxTokens || getResponseTokenBudget(content);

  for (let step = 1; step <= 8; step++) {
    if (currentGoalAborted) {
      status = 'cancelado';
      break;
    }
    if (Date.now() - startedAt > timeoutMs) {
      status = 'parcial';
      currentGoalRun.errors.push(`Timeout apos ${Math.round(timeoutMs / 1000)}s`);
      break;
    }

    goalExecutionState(step, 8, 'analyzing_context');
    const data = await callOpenAIWithRetry({
      messages: goalMessages,
      temperature: 0.2,
      max_tokens: maxTokens,
      tools: getGoalTools(),
      tool_choice: 'auto'
    });

    const message = data.choices?.[0]?.message;
    let calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
    const textToolCall = calls.length ? null : parseTextToolCall(message?.content, getGoalTools());
    if (textToolCall) calls = [textToolCall];
    if (!calls.length) {
      finalText = message?.content || '';
      break;
    }

    goalMessages.push(textToolCall
      ? { role: 'assistant', content: null, tool_calls: calls }
      : message);
    goalExecutionState(step, 8, 'analyzing_context');
    const execResults = worionConfig.enableGoalParallelTools && calls.length > 1
      ? await Promise.all(calls.map(call => executeGoalToolCall(call, step)))
      : [];
    if (!worionConfig.enableGoalParallelTools || calls.length <= 1) {
      for (const call of calls) execResults.push(await executeGoalToolCall(call, step));
    }

    for (const item of execResults) {
      toolHistory.push(item);
      goalMessages.push({ role: 'tool', tool_call_id: item.tool_call_id, name: item.name, content: JSON.stringify(item.result) });
    }
  }

  if (!finalText && status === 'concluido') {
    status = 'parcial';
    finalText = 'NÃ£o consegui concluir a execuÃ§Ã£o das ferramentas dentro do limite seguro.';
    currentGoalRun.errors.push(finalText);
  }
  if (currentGoalRun.errors.length && status === 'concluido') status = 'parcial';
  currentGoalRun.status = status;
  currentGoalRun.finishedAt = new Date().toISOString();
  goalExecutionState(null, null, '');
  await logInternalAction('goal_finished', status, { goalId, tools: currentGoalRun.tools, errors: currentGoalRun.errors });

  let reportToReturn = buildGoalReport({
    status,
    objective: content,
    tools: currentGoalRun.tools,
    findings: currentGoalRun.findings,
    actions: currentGoalRun.actions,
    errors: currentGoalRun.errors,
    finalText
  });

  currentGoalRun = null;
  currentGoalAborted = false;
  return reportToReturn;
}

async function executeGoalToolCall(call, step) {
  const name = normalizeToolName(call.function.name);
  const args = call.function.arguments;
  const result = await executeToolCall(name, args);
  const ok = !result.error;
  const parsedArgs = (() => { try { return typeof args === 'string' ? JSON.parse(args) : args; } catch { return {}; } })();
  currentGoalRun.tools.push(name);
  if (ok) {
    currentGoalRun.actions.push(`${name} executado`);
    collectGoalFindings(name, result);
  } else {
    currentGoalRun.errors.push(`${name}: ${result.error}`);
  }
  await logInternalAction('goal_tool_call', ok ? 'success' : 'error', { name, args: parsedArgs, result });
  return { tool_call_id: call.id, name, result };
}

function collectGoalFindings(name, result) {
  if (result?.pages?.length) {
    currentGoalRun.findings.push(...result.pages.slice(0, 5).map(page => `${page.title || page.id}`));
  }
  if (result?.results?.length) {
    currentGoalRun.findings.push(...result.results.slice(0, 5).map(item => item.title || item.url || item.snippet || item.conversation_id || 'resultado'));
  }
  if (result?.rows?.length) {
    currentGoalRun.findings.push(`${result.rows.length} linha(s) em ${result.table || name}`);
  }
  if (typeof result?.count === 'number') {
    currentGoalRun.findings.push(`${result.count} registro(s) em ${result.table || name}`);
  }
  if (result?.url) currentGoalRun.findings.push(result.url);
}

function goalExecutionState(step, total, detail) {
  if (!currentGoalRun) return;
  currentGoalRun.step = step;
  currentGoalRun.totalSteps = total;
  currentGoalRun.detail = detail;
  executionStatus = step ? (detail || 'analyzing_context') : null;
  executionStatusLabel = getFriendlyExecutionLabel?.(executionStatus) || '';
  if (step && typeof showExecutionStatus === 'function') showExecutionStatus(executionStatusLabel);
  if (!step && typeof hideExecutionStatus === 'function') hideExecutionStatus();
}

function cancelCurrentGoal() {
  if (!currentGoalRun) return;
  currentGoalAborted = true;
  currentGoalRun.status = 'cancelado';
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  logInternalAction('goal_cancel_requested', 'cancelled', { goalId: currentGoalRun.id });
  renderChatPanel();
}

function interruptCurrentResponse() {
  responseAbortRequested = true;
  currentGoalAborted = true;
  if (currentResponseController) {
    try { currentResponseController.abort(); } catch {}
  }
  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
  renderChatPanel();
}

function buildGoalExecutionPrompt() {
  return `O Worion e um executor orientado a objetivos.
Classifique este pedido como objetivo composto ja tratado internamente.
Execute antes de responder. Use tools concretas. Nao pare na primeira falha: tente fallback e alternativas.
Se tools independentes forem necessarias, chame-as na mesma rodada.
Nao exponha sequential_thinking. Nao use frases genericas de encerramento.
CRITICO: Nunca declare acao como concluida (gerado, salvo, criado) sem confirmacao da tool. Se pedir PDF, use generate_pdf. Se pedir Notion, use create_notion_page. Sem tool disponivel, seja honesto.
Quando terminar, responda com resultado verificavel e mencione pendencias reais.`;
}

function buildGoalReport({ status, objective, tools, findings, actions, errors, finalText }) {
  if (!worionConfig.internalLogs) {
    return normalizeAssistantReply(finalText || 'ExecuÃ§Ã£o concluÃ­da.');
  }

  const uniqueTools = [...new Set(tools)].filter(Boolean);
  const uniqueFindings = [...new Set(findings)].filter(Boolean).slice(0, 12);
  const uniqueActions = [...new Set(actions)].filter(Boolean).slice(0, 12);
  const pending = errors.length ? errors : ['nenhuma'];
  return normalizeAssistantReply(`**Resultado**
Status: ${status}
Objetivo: ${objective}
Tools usadas: ${uniqueTools.length ? uniqueTools.join(', ') : 'nenhuma'}

Itens encontrados:
${uniqueFindings.length ? uniqueFindings.map(item => `- ${item}`).join('\n') : '- nenhum'}

Acoes realizadas:
${uniqueActions.length ? uniqueActions.map(item => `- ${item}`).join('\n') : '- nenhuma'}

Pendencias reais:
${pending.map(item => `- ${item}`).join('\n')}

${finalText ? `Detalhes:\n${finalText}` : ''}`);
}

function isComplexRequest(text, attachments = []) {
  if (!WORION_UX_CONFIG.autoSequentialThinking) return false;
  return attachments.length > 0 || String(text || '').length > 120;
}

async function getSequentialThinkingContext(content, attachments = []) {
  return isComplexRequest(content, attachments) ? 'sequential_thinking_enabled' : '';
}

