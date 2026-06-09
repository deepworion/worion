/**
 * MÓDULO: v12-turbo.js
 * RESPONSABILIDADE: V12 Turbo - Task Planning, Pipeline Execution e Memória Automática
 * DEPENDÊNCIAS: tools.js, chat.js, app.js
 * EXPORTA: generateTaskPlan, extractToolCallsFromPlan, parseParams, injectRecentMemory, buildFullSystemPrompt, getWelcomeMessage, executeGoalPipeline
 * TOOLS REGISTRADAS: nenhuma (usa TOOL_REGISTRY)
 * NÃO MODIFICAR SEM LER: tools.js, chat.js (integração com Goal Execution Engine)
 * PROBLEMAS CONHECIDOS: nenhum
 */

// ============================================================================
// TASK PLANNER
// ============================================================================

function generateTaskPlan(userMessage) {
  const planResult = executeToolCall('sequential_thinking', {
    thought:
      `Planeje as etapas necessárias para executar este pedido: ${userMessage}.
       Retorne cada etapa no formato:
       tool(param1=value1, param2=value2)`,
    nextThoughtNeeded: true,
    thoughtNumber: 1,
    totalThoughts: 3
  });

  const steps = extractToolCallsFromPlan(planResult.result || '');

  const taskPlan = {
    goal: userMessage,
    steps,
    createdAt: new Date().toISOString(),
    status: 'planned'
  };

  logInternalAction('task_plan_generated', 'success', taskPlan);
  return taskPlan;
}

function extractToolCallsFromPlan(planText) {
  const steps = [];
  const toolPattern = /(\w+)\s*\((.*?)\)/g;
  let match;

  while ((match = toolPattern.exec(planText)) !== null) {
    steps.push({
      tool: match[1],
      params: parseParams(match[2] || '')
    });
  }

  return steps;
}

function parseParams(paramString) {
  const params = {};
  if (!paramString) return params;

  // Parse key=value pairs
  const pairs = paramString.split(',').map(p => p.trim());
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (key && valueParts.length > 0) {
      params[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }

  return params;
}

// ============================================================================
// MEMÓRIA AUTOMÁTICA
// ============================================================================

async function injectRecentMemory() {
  try {
    const recent = await executeToolCall('supabase_select', {
      table: 'memory_conversations',
      orderBy: 'created_at',
      ascending: false,
      limit: 3
    });

    if (
      recent.status === 'success' &&
      recent.items &&
      recent.items.length > 0
    ) {
      const memories = await Promise.all(
        recent.items.map(async (conv) => {
          const chunks = await executeToolCall('supabase_select', {
            table: 'memory_chunks',
            conversation_id: conv.id,
            limit: 3
          });

          const preview =
            chunks.items?.map((c) => c.content).join(' ') || '';

          return {
            title: conv.title || 'Sem título',
            preview: preview.slice(0, 200)
          };
        })
      );

      window.dynamicMemoryContext =
        '\n\n## MEMÓRIA RECENTE\n' +
        memories
          .map((m) => `- ${m.title}: ${m.preview}`)
          .join('\n') +
        '\n';
    }
  } catch (error) {
    console.warn('[V12] Falha ao carregar memória automática:', error);
  }
}

function buildFullSystemPrompt(basePrompt) {
  return basePrompt + (window.dynamicMemoryContext || '');
}

function getWelcomeMessage() {
  if (window.dynamicMemoryContext) {
    return 'Oi. Lembro da nossa última conversa. Como estão as coisas desde então?';
  }

  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia.';
  if (hour < 18) return 'Boa tarde.';
  return 'Boa noite.';
}

// ============================================================================
// PIPELINE EXECUTOR
// ============================================================================

async function executeGoalPipeline(taskPlan) {
  const results = [];
  const totalSteps = taskPlan.steps.length;

  for (let i = 0; i < totalSteps; i++) {
    if (window.currentGoalAborted || currentGoalAborted) {
      if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
      return generateGoalReport(taskPlan.goal, results, 'cancelado');
    }

    const step = taskPlan.steps[i];

    // Usa a estrela pulsante existente
    if (typeof showExecutionStatus === 'function') {
      showExecutionStatus('Executando workflow...');
    }

    const result = await executeToolCallWithFallback(
      step.tool,
      step.params
    );

    results.push({
      step: i + 1,
      tool: step.tool,
      status: result.status,
      result
    });

    if (result.status === 'blocked') {
      if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
      return generateGoalReport(
        taskPlan.goal,
        results,
        'bloqueado'
      );
    }
  }

  if (typeof hideExecutionStatus === 'function') hideExecutionStatus();

  return generateGoalReport(
    taskPlan.goal,
    results,
    'concluído'
  );
}

function generateGoalReport(goal, results, status) {
  // Consolida os resultados em um relatório final
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status !== 'success');

  let report = `**Objetivo:** ${goal}\n\n`;
  report += `**Status:** ${status}\n\n`;

  if (successful.length > 0) {
    report += `**Etapas concluídas:** ${successful.length}/${results.length}\n\n`;
  }

  if (failed.length > 0) {
    report += `**Etapas com problema:** ${failed.map(f => f.tool).join(', ')}\n\n`;
  }

  // Extrai o resultado mais relevante
  const mainResult = successful[successful.length - 1]?.result;
  if (mainResult && mainResult.result) {
    report += `**Resultado:**\n${mainResult.result}`;
  }

  return report;
}

// Removida função showIndicator - usa showExecutionStatus/hideExecutionStatus global
