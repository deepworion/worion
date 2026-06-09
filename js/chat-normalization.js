/**
 * MÓDULO: chat-normalization.js
 * RESPONSABILIDADE: normalização de resposta, limpeza de encerramentos genéricos, reparo semântico simples, fallback semântico e limpeza de resposta de agente
 * DEPENDÊNCIAS: js/chat-models.js, js/prompt.js, js/app.js, js/chat.js
 * EXPORTA: normalizeAssistantReply, repairGenericSemanticReply, buildSemanticFallbackReply, cleanAgentResponse
 * TOOLS REGISTRADAS: nenhuma
 * NÃO MODIFICAR SEM LER: js/chat-models.js, js/prompt.js, js/app.js, js/chat.js
 * PROBLEMAS CONHECIDOS: mantém heurísticas simples apenas para refinamento textual
 */

function normalizeAssistantReply(reply, userMessage = '') {
  let text = String(reply || '').trim();
  if (!text) return '';

  text = repairGenericSemanticReply(text, userMessage);
  text = cleanAgentResponse(text);
  text = suppressResearchPromiseOnlyReply(text, userMessage);

  // Remove vazamento de formato interno do DeepSeek
  text = text.replace(/<｜｜DSML｜｜[\s\S]*$/m, '').trim();
  text = text.replace(/<\|[^>]*\|>/g, '').trim();

  return text;
}

function suppressResearchPromiseOnlyReply(reply, userMessage = '') {
  const text = String(reply || '').trim();
  if (!text) return text;

  const asksExternalInfo = /\b(quem|qual|quais|quando|onde|por que|porque|como|de onde|origem|etimologia|significado|historia|historico|curiosidades?|lista|relacao|pesquise|busque|procure|fonte|fontes|referencia|referencias)\b/i.test(String(userMessage || ''));
  const isPromiseOnly =
    /^(vou|vamos|irei|deixa eu)\b[\s\S]{0,240}\b(buscar|pesquisar|procurar|ir atras|ir atrás|garimpar|trazer)\b/i.test(text)
    || /^pesquisando[\s\S]{0,120}$/i.test(text);

  if (asksExternalInfo && isPromiseOnly && text.length < 320) {
    return 'Eu nao devo prometer uma busca sem entregar resultado. Preciso de mais contexto para pesquisar corretamente: a que exatamente voce esta se referindo?';
  }

  return text;
}

function repairGenericSemanticReply(reply, userMessage = '') {
  let text = String(reply || '').trim();
  if (!text) return text;

  if (/\b(não sei|nao sei|não posso confirmar|nao posso confirmar)\b/i.test(text) && userMessage) {
    return text;
  }

  return text;
}

function buildSemanticFallbackReply(userMessage = '', state = {}) {
  const subject = String(userMessage || '').trim();
  const prefix = state?.prefix || 'Nao consegui concluir a resposta.';
  return `${prefix}${subject ? ` Pedido: ${subject}.` : ''}`.trim();
}

function cleanAgentResponse(rawResponse) {
  let text = String(rawResponse || '').trim();
  if (!text) return '';

  return text
    .replace(/^\s*(?:#{1,6}\s*)?(?:[-*]\s*)?(?:\*\*)?\s*Detalhes\s*:?\s*(?:\*\*)?\s*/i, '')
    .trim();
}

window.normalizeAssistantReply = normalizeAssistantReply;
window.repairGenericSemanticReply = repairGenericSemanticReply;
window.suppressResearchPromiseOnlyReply = suppressResearchPromiseOnlyReply;
window.buildSemanticFallbackReply = buildSemanticFallbackReply;
window.cleanAgentResponse = cleanAgentResponse;
