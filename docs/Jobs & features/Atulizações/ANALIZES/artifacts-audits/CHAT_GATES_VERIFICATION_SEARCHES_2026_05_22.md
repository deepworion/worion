# Buscas em js\chat.js - gates/verificacao

## BUSCA 1 — Termos relacionados a gates e verificacao
```text
20-const DEEPSEEK_DEFAULT_MAX_TOKENS = 8000;
21-const DEEPSEEK_LONG_FORM_MAX_TOKENS = 24000;
22-const LEGACY_OPENAI_DEFAULTS = new Set(['gpt-4o-mini', 'gpt-4o']);
23:const SAFE_EXTERNAL_EVIDENCE_BLOCK = 'Não encontrei evidência externa suficiente para responder com segurança. Para evitar inventar dados, não vou listar nomes, datas ou fatos específicos sem fonte verificável.';
24:const FACTUAL_BLOCKERS_TEST_MODE = true;
25-const WORION_EXECUTION_ROUTER_TEST = true;
26-const WORION_TAVILY_SECONDARY_LOCK = false;
27:const FACTUAL_BLOCKERS_TEST_DIRECTIVE = `## TEST MODE - Bloqueios factuais desativados
28-
29-Nesta execução de teste, Grounding Gate, Verification Engine, Narrative Claim Validator, Evidence Gate e fallback extrativo são apenas observabilidade.
30-Não substitua a resposta por "não confirmado", "não encontrei evidência suficiente" ou mensagem genérica de bloqueio apenas por ausência de fonte, Evidence Pack vazio ou validação factual insuficiente.
--
202-  return allowedCalls;
203-}
204-
205:function registerEvidenceSource(evidenceSources, source = {}) {
206:  if (!Array.isArray(evidenceSources)) return;
207:  evidenceSources.push({
208-    title: source.title || '',
209-    url: source.url || '',
210-    content: source.text || source.content || source.snippet || source.description || ''
211-  });
212-}
213-
214:function hasUsableEvidence(evidenceSources) {
215:  return Array.isArray(evidenceSources)
216:    && evidenceSources.some(source =>
217-      source
218-      && source.url
219-      && typeof source.content === 'string'
--
221-    );
222-}
223-
224:function answerMentionsSourcesWithoutEvidence(answer, evidenceSources) {
225-  const mentionsSource =
226-    /fonte|fontes|segundo|wikip[eé]dia|ibge|tre|lei estadual|arquivo|registro/i.test(answer || '');
227-
228-  if (!mentionsSource) return false;
229-
230:  if (!hasUsableEvidence(evidenceSources)) return true;
231-
232:  const evidenceText = evidenceSources
233-    .map(source => `${source.title || ''} ${source.url || ''} ${source.content || ''}`)
234-    .join('\n')
235-    .toLowerCase();
--
269-    /\b(debug|debugar|depurar|diagnosticar|investigar\s+o\s+sistema|verificar\s+o\s+sistema)\b/i,
270-    // Perguntas sobre componentes internos por nome
271-    /\b(grounding\s+gate|evidence\s+pack|verification\s+engine|narrative\s+(claim\s+)?validator|tool\s+loop|agent\s+loop)\b/i,
272:    /\b(brave\s+search|tavily|fetch.url|externalEvidenceRecords|evidenceSources|verificationPlan)\b/i,
273-    // Perguntas sobre fontes externas no contexto de diagnóstico
274-    /por\s*que\s+(voce|você)\s+(nao|não)\s+est[aá]\s+(consultando|usando|chamando)\s+(fonte|fontes|busca|pesquisa)\s+externa/i,
275-    /por\s*que\s+(as\s+)?fontes?\s+externas?\s+(nao|não)\s+(foram|estao|estão|aparec)/i,
--
345-  const isFactual = factualPatterns.some(pattern => pattern.test(normalized));
346-
347-  if (isFactual) {
348:    if (!(FACTUAL_BLOCKERS_TEST_MODE && WORION_EXECUTION_ROUTER_TEST)) {
349-      console.log('[GROUNDING GATE] Pedido factual detectado - grounding obrigatório ativado');
350-    }
351-  }
--
362-  console.log('[GROUNDING GATE] Buscando fontes externas OBRIGATÓRIAS via Brave/Tavily...');
363-
364-  try {
365:    const evidencePack = await collectEvidencePack(userMessage, { mustUseExternalEvidence: true }, {
366-      mode: 'grounding',
367-      count: 8,
368-      maxSources: 8,
--
458-      sourceHierarchy: '[FONTE PRIMÁRIA]'
459-    };
460-
461:    const evidenceSources = [source];
462:    const context = typeof formatVerificationExternalEvidence === 'function'
463:      ? formatVerificationExternalEvidence(evidenceSources, { mustUseExternalEvidence: true }, { mode: 'grounding', query: userMessage })
464-      : `[FONTE PRIMÁRIA] Wikipedia — ${topic}\n\n${content.slice(0, maxChars)}`;
465-
466-    return {
467-      query: userMessage,
468-      text: context,
469-      context,
470:      sources: evidenceSources,
471:      evidenceSources,
472-      evidenceRecords: [{ function: { name: 'fetch_url' } }],
473-      fetchedPages: [{ url, content: content.slice(0, maxChars), title: topic, ok: true }],
474-      count: 1,
--
484-/**
485- * Valida se a resposta está ancorada nas fontes fornecidas (BARREIRA FINAL)
486- */
487:function validateGroundedResponse(responseText, groundingData) {
488-  if (!responseText || typeof responseText !== 'string') {
489-    return { valid: true };
490-  }
491-
492-  // BARREIRA 1: Se não havia fontes, resposta NÃO PODE conter dados factuais
493:  if (!groundingData || !groundingData.sources?.length) {
494-    const factualPatterns = [
495-      /\b\d{4}\b/,  // Anos
496-      /\b[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+\s+(?:[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+\s*){1,3}\b/,  // Nomes próprios
--
536-  }
537-
538-  // Concatena todo o conteúdo das fontes
539:  const sourcesContent = groundingData.sources
540-    .map(s => `${s.title || ''} ${s.snippet || ''} ${s.description || ''} ${s.content || ''}`)
541-    .join(' ')
542-    .toLowerCase()
--
555-  const primarySourceDomains = Array.isArray(groundingConfig.fallbackPrimarySources)
556-    ? groundingConfig.fallbackPrimarySources
557-    : ['wikipedia.org', 'gov.br', 'leg.br', 'jus.br', 'org.br'];
558:  const primarySources = (groundingData.sources || []).filter(source => {
559-    const url = String(source?.url || '').toLowerCase();
560-    return primarySourceDomains.some(domain => url.includes(String(domain).toLowerCase()));
561-  });
--
663-    return { valid: true, skipped: true, reason: 'Validação narrativa não aplicável.' };
664-  }
665-
666:  const sources = evidencePack?.evidenceSources || evidencePack?.sources || [];
667-  if (!Array.isArray(sources) || !sources.length) {
668-    return { valid: true, skipped: true, reason: 'Sem Evidence Pack; gates existentes tratam ausência de fonte.' };
669-  }
--
713-}
714-
715-function buildOfficialEvidenceExtractiveAnswer(userMessage = '', evidencePack = {}) {
716:  const sources = (evidencePack?.evidenceSources || evidencePack?.sources || [])
717-    .filter(source => isOfficialEvidenceUrl(source.url) && String(source.content || '').trim());
718-  if (!sources.length) return '';
719-
--
751-  ].join('\n');
752-}
753-
754:function applyEvidenceGate(finalAnswer, verificationPlan, evidenceSources) {
755:  const needsEvidence = verificationPlan?.mustUseExternalEvidence === true;
756:  const hasEvidence = hasUsableEvidence(evidenceSources);
757:  const hasFakeSourceRisk = answerMentionsSourcesWithoutEvidence(finalAnswer, evidenceSources);
758-
759:  if (FACTUAL_BLOCKERS_TEST_MODE) {
760-    if (needsEvidence && (!hasEvidence || hasFakeSourceRisk)) {
761-      console.warn('[EVIDENCE GATE] TEST MODE: bloqueio factual desativado; resposta preservada.', {
762-        needsEvidence,
--
768-  }
769-
770-  if (needsEvidence && (!hasEvidence || hasFakeSourceRisk)) {
771:    return SAFE_EXTERNAL_EVIDENCE_BLOCK;
772-  }
773-
774-  return finalAnswer;
775-}
776-
777:function enforceEvidencePlanForSensitiveQuery(verificationPlan = {}, userMessage = '') {
778-  const normalized = String(userMessage || '')
779-    .toLowerCase()
780-    .normalize('NFD')
--
784-  const municipalHistory = /\b(historia|historico|fundacao|criacao|criado|criada|emancipacao|desmembrad[ao]|municipio|cidade)\b/i.test(normalized);
785-
786-  if (!(mentionsPublicOffice && asksForListOrTimeline) && !municipalHistory) {
787:    return verificationPlan;
788-  }
789-
790-  return {
791:    ...verificationPlan,
792-    requiresVerification: true,
793-    mustUseExternalEvidence: true,
794:    domain: mentionsPublicOffice ? 'politics' : (verificationPlan.domain || 'history'),
795:    minimumSources: Math.max(Number(verificationPlan.minimumSources || 0), 2),
796-    priority: 1,
797-    forcedBy: 'sensitive_public_authority_or_municipal_history'
798-  };
799-}
800-
801:function registerToolEvidenceSources(evidenceSources, toolCall, result) {
802-  const toolName = String(toolCall?.function?.name || toolCall?.name || '').toLowerCase();
803-  if (!/(brave_search|tavily_search|fetch_url|web_search|search)/i.test(toolName) || !result || result.error) return;
804-
805-  const directUrl = result.url || result.sourceUrl || '';
806-  const directContent = result.text || result.content || result.markdown || result.body || result.snippet || '';
807-  if (directUrl || directContent) {
808:    registerEvidenceSource(evidenceSources, {
809-      title: result.title || result.name || toolName,
810-      url: directUrl,
811-      content: directContent
--
813-  }
814-
815-  for (const item of getExternalEvidenceItems(result)) {
816:    registerEvidenceSource(evidenceSources, {
817-      title: item.title || '',
818-      url: item.url || '',
819-      content: item.text || item.content || item.snippet || item.description || ''
--
941-  return 'brave_search';
942-}
943-
944:function buildEvidenceRecords(evidenceSources = [], fetchedPages = []) {
945-  const records = [];
946-  const providerNames = new Set(
947:    evidenceSources
948-      .map(source => getEvidenceProviderName(source))
949-      .filter(provider => provider && provider !== 'search')
950-  );
--
1028-    text: '',
1029-    context: '',
1030-    sources: [],
1031:    evidenceSources: [],
1032-    evidenceRecords: [],
1033-    fetchedPages: [],
1034-    count: 0,
--
1038-  };
1039-}
1040-
1041:function formatVerificationExternalEvidence(results = [], verificationPlan = {}, options = {}) {
1042-  const sources = Array.isArray(results) ? results : [];
1043-  if (!sources.length) return '';
1044-  const mode = options.mode === 'grounding' ? 'GROUNDING GATE' : 'EVIDENCE PACK';
--
1073-  return `\n\n${instruction}\n\n${sourceText}`;
1074-}
1075-
1076:async function collectEvidencePack(content, verificationPlan = {}, options = {}) {
1077-  if (!content || typeof executeToolCall !== 'function') {
1078-    return createEmptyEvidencePack(content, 'executeToolCall indisponível');
1079-  }
1080:  if (!verificationPlan?.mustUseExternalEvidence && !options.force && options.mode !== 'grounding') {
1081-    return createEmptyEvidencePack(content);
1082-  }
1083-
--
1159-  const failedFetchUrls = new Set(fetchResults.filter(page => !page.ok).map(page => page.url));
1160-  const fetchedPages = fetchResults.filter(page => page.ok);
1161-  const fetchedByUrl = new Map(fetchedPages.map(page => [page.url, page]));
1162:  const evidenceSourcesFromFetchedPages = searchItems.map((item, index) => {
1163-    if (item.url && failedFetchUrls.has(item.url)) return null;
1164-    const fetched = item.url ? fetchedByUrl.get(item.url) : null;
1165-    if (!fetched) return null;
--
1176-      rank: index + 1
1177-    };
1178-  }).filter(source => source && hasRealContent(source.content));
1179:  const evidenceSources = evidenceSourcesFromFetchedPages.map(source => ({
1180-    ...source,
1181-    sourceHierarchy: getEvidenceSourceHierarchyMarker(source)
1182-  }));
1183-
1184:  const providerNames = [...new Set(evidenceSources.map(source => getEvidenceProviderName(source)).filter(Boolean))];
1185-  const provider = providerNames.length ? providerNames.join('+') : 'search';
1186:  const context = formatVerificationExternalEvidence(evidenceSources, verificationPlan, {
1187-    mode: options.mode,
1188-    query: content
1189-  });
1190:  const evidenceRecords = buildEvidenceRecords(evidenceSources, fetchedPages);
1191-
1192:  console.log('[EVIDENCE PACK] Fontes:', evidenceSources.length, 'fetch_url:', fetchedPages.length, 'providers:', provider);
1193-
1194-  return {
1195-    query: content,
1196-    text: context,
1197-    context,
1198:    sources: evidenceSources,
1199:    evidenceSources,
1200-    evidenceRecords,
1201-    fetchedPages,
1202:    count: evidenceSources.length,
1203-    provider,
1204-    searchResult,
1205-    errors: searchResult?.errors || []
1206-  };
1207-}
1208-
1209:async function collectVerificationExternalEvidence(content, verificationPlan = {}) {
1210:  return collectEvidencePack(content, verificationPlan, {
1211-    mode: 'verification',
1212-    count: 5,
1213-    maxSources: 5,
--
3251-    // ROTA INTERNA: perguntas sobre o próprio Worion nunca ativam grounding externo
3252-    const isInternalDiagnostic = isInternalDiagnosticRequest(content);
3253-    const executionRoute = getExecutionRoute(content);
3254:    const routerGroundingObserveOnly = FACTUAL_BLOCKERS_TEST_MODE && WORION_EXECUTION_ROUTER_TEST;
3255-
3256-    // GROUNDING OBRIGATÓRIO: Detecta pedidos factuais e busca fontes ANTES da geração
3257-    const isFactualRequest = !isInternalDiagnostic && looksLikeFactualRequest(content);
3258:    let groundingData = null;
3259-    let groundingContext = '';
3260-
3261-    // VERIFICATION ENGINE: Criar plano de verificação ANTES de qualquer roteamento
3262:    let verificationPlan = isInternalDiagnostic
3263-      ? { requiresVerification: false, domain: 'internal_diagnostic', isChallenge: false, mustUseExternalEvidence: false, minimumSources: 0, priority: 0 }
3264-      : (typeof window !== 'undefined' && window.WorionVerificationEngine)
3265-        ? window.WorionVerificationEngine.createVerificationPlan(content)
3266-        : { requiresVerification: false, mustUseExternalEvidence: false };
3267:    if (!isInternalDiagnostic) verificationPlan = enforceEvidencePlanForSensitiveQuery(verificationPlan, content);
3268:    let evidenceSources = [];
3269:    let externalEvidenceContext = '';
3270:    let externalEvidenceRecords = [];
3271-    let evidencePack = createEmptyEvidencePack(content);
3272-
3273:    if (!routerGroundingObserveOnly && (isFactualRequest || verificationPlan.mustUseExternalEvidence)) {
3274-      if (typeof showWorionStatus === 'function') showWorionStatus('sources');
3275-
3276-      // WIKIPEDIA GATE: para domínios históricos/geográficos, tenta fetch direto antes do Brave/Tavily
3277:      const isWikipediaGateDomain = WIKIPEDIA_GATE_DOMAINS.includes(verificationPlan?.domain);
3278-      if (isFactualRequest && isWikipediaGateDomain) {
3279-        if (typeof showWorionStatus === 'function') showWorionStatus('openingSources');
3280-        const wikiPack = await fetchWikipediaDirectGrounding(content);
3281-        if (wikiPack && wikiPack.count > 0) {
3282-          evidencePack = wikiPack;
3283:          console.log(`[WIKIPEDIA GATE] Usando Wikipedia como fonte primária (${wikiPack.evidenceSources[0]?.title})`);
3284-          // Wikipedia é FONTE PRIMÁRIA de alta confiança — 1 fonte é suficiente
3285:          if (verificationPlan.minimumSources > 1) {
3286:            verificationPlan = { ...verificationPlan, minimumSources: 1 };
3287-            console.log('[WIKIPEDIA GATE] minimumSources reduzido para 1 (fonte primária Wikipedia)');
3288-          }
3289-        }
--
3291-
3292-      // Fallback: Brave/Tavily se Wikipedia Gate não retornou ou domínio não elegível
3293-      if (!evidencePack.count) {
3294:        evidencePack = await collectEvidencePack(content, {
3295:          ...verificationPlan,
3296-          mustUseExternalEvidence: true
3297-        }, {
3298-          mode: isFactualRequest ? 'grounding' : 'verification',
--
3305-
3306-      if (evidencePack.count) {
3307-        if (isFactualRequest) {
3308:          groundingData = {
3309-            text: evidencePack.text,
3310-            sources: evidencePack.sources,
3311-            count: evidencePack.count,
3312-            provider: evidencePack.provider
3313-          };
3314-          groundingContext = evidencePack.context;
3315:          console.log(`[GROUNDING GATE] Contexto injetado: ${groundingData.count} fontes via ${groundingData.provider.toUpperCase()}`);
3316-        } else {
3317:          externalEvidenceContext = evidencePack.context;
3318-          console.log('[VERIFICATION] Evidence Pack injetado:', evidencePack.count, 'fontes');
3319-        }
3320-
3321:        for (const source of evidencePack.evidenceSources) {
3322:          registerEvidenceSource(evidenceSources, source);
3323-        }
3324:        externalEvidenceRecords.push(...evidencePack.evidenceRecords);
3325-      } else if (isFactualRequest) {
3326:        groundingContext = `\n\n${FACTUAL_BLOCKERS_TEST_DIRECTIVE}
3327-
3328-Busca factual executada, mas o Evidence Pack retornou vazio. Continue a resposta sem substituir por mensagem de bloqueio; registre lacunas como nao confirmadas quando necessario.`;
3329-        console.log('[GROUNDING GATE] TEST MODE: Evidence Pack vazio; resposta livre preservada.');
--
3339-        await logStep(turnTraceRun, 'buildEvidencePack', {
3340-          query: content,
3341-          mode: isFactualRequest ? 'grounding' : 'verification',
3342:          verificationPlan
3343-        }, {
3344-          sourcesCount: evidencePack.count,
3345-          fetchedPagesCount: evidencePack.fetchedPages.length,
3346-          provider: evidencePack.provider,
3347:          urls: evidencePack.evidenceSources.map(source => source.url).filter(Boolean).slice(0, 8),
3348-          errors: evidencePack.errors
3349-        });
3350-      }
--
3362-    }
3363-    if (typeof hasActiveWorkMode === 'function' ? hasActiveWorkMode('smart-research') : activeWorkModeId === 'smart-research') {
3364-      if (typeof showWorionStatus === 'function') showWorionStatus('sources');
3365:      let finalReport = await generateSmartResearchReply(content, attachments, verificationPlan, originMessages);
3366:      finalReport = applyEvidenceGate(finalReport, verificationPlan, evidenceSources);
3367-      const finalReply = normalizeAssistantReply(finalReport, content);
3368-      await setAssistantReply(finalReply);
3369-      await saveOriginAndReturn();
--
3374-      ['focused_research', 'deep_research', 'source_check', 'comparative_research'].includes(executionRoute);
3375-    if (!shouldBypassGoalEngine && shouldUseGoalEngineForRequest(content, attachments, classification)) {
3376-      if (typeof showWorionStatus === 'function') showWorionStatus('thinking');
3377:      let finalReport = await executeCompoundGoal(content, attachments, classification, verificationPlan);
3378:      finalReport = applyEvidenceGate(finalReport, verificationPlan, evidenceSources);
3379-      const finalReply = normalizeAssistantReply(finalReport, content);
3380-      await setAssistantReply(finalReply);
3381-      await saveOriginAndReturn();
--
3390-    let verificationMetadata = null;
3391-    if (typeof window !== 'undefined' && window.WorionVerificationEngine && window.WorionVerificationEngine.requiresVerification(content)) {
3392-      const domain = window.WorionVerificationEngine.detectDomain(content);
3393:      verificationInstruction = FACTUAL_BLOCKERS_TEST_MODE
3394:        ? FACTUAL_BLOCKERS_TEST_DIRECTIVE
3395-        : window.WorionVerificationEngine.buildVerificationInstruction(content);
3396-      verificationMetadata = {
3397-        verification_required: true,
3398-        verification_domain: domain,
3399:        verification_policy: FACTUAL_BLOCKERS_TEST_MODE ? 'test_mode_observe_only' : 'multi_source_consensus'
3400-      };
3401:      console.log('[VERIFICATION] Verificação factual ativada para domínio:', domain, FACTUAL_BLOCKERS_TEST_MODE ? '(TEST MODE: sem bloqueio)' : '');
3402-    }
3403-
3404-    // Incluir contexto de attachments explicitamente no system prompt quando houver
--
3413-    }
3414-
3415-    const systemPrompt = [
3416:      buildSystemPrompt(content, preservedAttachments, [groundingContext, attachmentContext, agentDomainResearchContext, externalEvidenceContext, verificationInstruction].filter(Boolean).join('\n\n')),
3417:      FACTUAL_BLOCKERS_TEST_MODE ? FACTUAL_BLOCKERS_TEST_DIRECTIVE : ''
3418-    ].filter(Boolean).join('\n\n');
3419-    await tracePromptStep(turnTraceRun, systemPrompt, {
3420-      route: 'chat_completion',
--
3454-          model: currentAgent.model || 'gpt-4o-mini',
3455-          temperature: 0.35,
3456-          max_tokens: maxTokens,
3457:          verificationDomain: verificationPlan?.domain || 'general',
3458-          thinking: executionProfile.thinking,
3459-          executionRoute: route,
3460-          executionProfile
--
3464-          model: currentAgent.model || 'gpt-4o-mini',
3465-          temperature: 0.4,
3466-          max_tokens: maxTokens,
3467:          verificationDomain: verificationPlan?.domain || 'general',
3468-          maxToolRounds: executionProfile.maxToolRounds,
3469-          thinking: executionProfile.thinking,
3470-          executionRoute: route,
--
3478-        model: currentAgent.model || 'gpt-4o-mini',
3479-        temperature: 0.4,
3480-        max_tokens: getResponseTokenBudget(content),
3481:        verificationDomain: verificationPlan?.domain || 'general'
3482-      });
3483-    }
3484-
3485-    let reply = agentResult.content;
3486:    const allToolCalls = [...externalEvidenceRecords, ...agentResult.toolCalls];
3487:    console.log('[VERIFICATION] externalEvidenceRecords:', externalEvidenceRecords.length, 'registros');
3488-    console.log('[VERIFICATION] agentResult.toolCalls:', agentResult.toolCalls.length, 'tool calls do modelo');
3489-    console.log('[VERIFICATION] allToolCalls total:', allToolCalls.length, 'para validação');
3490-    for (const item of agentResult.toolResults) {
3491:      registerToolEvidenceSources(evidenceSources, item.toolCall, item.result);
3492-    }
3493-
3494-    // TEST MODE: Verification Engine fica apenas em observabilidade; nao altera reply.
3495:    if (verificationPlan.mustUseExternalEvidence && typeof window !== 'undefined' && window.WorionVerificationEngine) {
3496-      if (typeof showWorionStatus === 'function') showWorionStatus('evidence');
3497-      const evidenceUsed = window.WorionVerificationEngine.countExternalEvidence(allToolCalls);
3498:      const validation = window.WorionVerificationEngine.validateResponse(verificationPlan, evidenceUsed);
3499-
3500-      // Registrar no LangSmith
3501-      if (typeof markTraceFlag === 'function') {
3502-        markTraceFlag(turnTraceRun, 'verification_required', true);
3503:        markTraceFlag(turnTraceRun, 'verification_domain', verificationPlan.domain);
3504-        markTraceFlag(turnTraceRun, 'external_evidence_used', evidenceUsed.hasExternalEvidence);
3505-        markTraceFlag(turnTraceRun, 'external_tool_calls_count', evidenceUsed.count);
3506-      }
--
3526-      pendingArtifactRequest = null;
3527-    }
3528-    if (typeof showWorionStatus === 'function') showWorionStatus('evidence');
3529:    const gatedReply = applyEvidenceGate(reply, verificationPlan, evidenceSources);
3530-    reply = gatedReply;
3531-    if (typeof showWorionStatus === 'function') showWorionStatus('composing');
3532-    reply = normalizeAssistantReply(reply, content);
--
3540-
3541-    if (isFactualRequest && !hasArtifact) {
3542-      if (typeof showWorionStatus === 'function') showWorionStatus('evidence');
3543:      const validation = validateGroundedResponse(reply, groundingData);
3544-
3545-      if (!validation.valid) {
3546-        console.warn('[GROUNDING GATE] TEST MODE: barreira final desativada; resposta preservada.', validation.reason);
--
3554-        // Marcar no trace
3555-        if (typeof markTraceFlag === 'function') {
3556-          markTraceFlag(turnTraceRun, 'grounding_validation_passed', true);
3557:          markTraceFlag(turnTraceRun, 'grounding_sources_used', groundingData?.count || 0);
3558-        }
3559-        if (validation.mode === 'fallback_primary_source') {
3560-          console.warn('[GROUNDING GATE] TEST MODE: fallback por fonte primaria registrado sem alterar reply.');
--
3606-
3607-          // Registrar evidências do reparo
3608-          for (const item of repairResult.toolResults) {
3609:            registerToolEvidenceSources(evidenceSources, item.toolCall, item.result);
3610-          }
3611-
3612-          const repairedReply = repairResult.content;
--
3639-      }
3640-    }
3641-
3642:    const finalEvidencePack = {
3643-      ...evidencePack,
3644:      sources: evidenceSources,
3645:      evidenceSources,
3646:      count: Array.isArray(evidenceSources) ? evidenceSources.length : evidencePack.count
3647-    };
3648-
3649:    const narrativeValidation = validateNarrativeClaims(reply, finalEvidencePack, {
3650:      enabled: !isInternalDiagnostic && (isFactualRequest || verificationPlan.mustUseExternalEvidence),
3651-      hasArtifact,
3652:      isContextualFollowup: isInternalDiagnostic || (!isFactualRequest && !verificationPlan.mustUseExternalEvidence)
3653-    });
3654-    if (typeof markTraceFlag === 'function') {
3655-      markTraceFlag(turnTraceRun, 'narrative_claim_validation_checked', !narrativeValidation.skipped);
--
3882-  ]);
3883-}
3884-
3885:async function generateSmartResearchReply(content, attachments = [], verificationPlan = null, sourceMessages = messages) {
3886-  const queries = buildSmartResearchQueries(content).slice(0, 3);
3887-  const researchResults = [];
3888-  for (const query of queries) {
--
3897-  }
3898-
3899-  // VERIFICATION ENGINE: Smart Research sempre usa evidência externa, então está OK
3900:  if (verificationPlan?.mustUseExternalEvidence && typeof window !== 'undefined' && window.WorionVerificationEngine) {
3901-    const successfulSearches = researchResults.filter(r => !r.error).length;
3902-    console.log('[VERIFICATION] Smart Research executou', successfulSearches, 'pesquisa(s) externa(s)');
3903-  }
--
3948-  return data.choices?.[0]?.message?.content || '';
3949-}
3950-
3951:async function executeCompoundGoal(content, attachments = [], classification = {}, verificationPlan = null) {
3952-  currentGoalAborted = false;
3953-  const startedAt = Date.now();
3954-  const timeoutMs = Math.max(10, Number(worionConfig.goalTimeout || 120)) * 1000;
--
3962-    errors: [],
3963-    findings: [],
3964-    actions: [],
3965:    verificationPlan: verificationPlan || null
3966-  };
3967-
3968:  await logInternalAction('goal_started', 'success', { goalId, objective: content, classification, verificationRequired: verificationPlan?.mustUseExternalEvidence });
3969-  const thinkingContext = await getSequentialThinkingContext(content, attachments);
3970-  const agentDomainResearchContext = await buildAgentDomainResearchContext(content, attachments);
3971-  const toolHistory = [];
--
4077-    finalText
4078-  });
4079-
4080:  if (verificationPlan?.mustUseExternalEvidence && typeof window !== 'undefined' && window.WorionVerificationEngine) {
4081-    const allToolCalls = toolHistory.map(item => ({ function: { name: item.name } }));
4082-    const evidenceUsed = window.WorionVerificationEngine.countExternalEvidence(allToolCalls);
4083:    const validation = window.WorionVerificationEngine.validateResponse(verificationPlan, evidenceUsed);
4084-
4085-    console.log('[VERIFICATION] Compound Goal - Validação:', validation);
4086-    console.log('[VERIFICATION] Compound Goal - Evidência usada:', evidenceUsed);
```

## BUSCA 2 — Declaracao de verificationPlan

### Ocorrencias let/const/var
```text
3262:    let verificationPlan = isInternalDiagnostic
```

### Contexto completo da funcao sendMsg (js/chat.js:3028-3727)
```js
 3028: async function sendMsg() {
 3029:   if (isAssistantResponding) {
 3030:     interruptCurrentResponse();
 3031:     return;
 3032:   }
 3033: 
 3034:   const inp = document.getElementById('chat-in');
 3035:   const txt = inp.value.trim();
 3036:   if (!txt && attachedFiles.length === 0) return;
 3037:   let turnTraceRun = null;
 3038: 
 3039:   const attachments = attachedFiles.slice();
 3040:   const rawText = txt ? applyTypoCorrections(txt) : '';
 3041:   const content = rawText || `Anexo enviado: ${attachments.map(file => file.name).join(', ')}`;
 3042:   pendingArtifactRequest = detectArtifactRequest(content);
 3043:   const now = new Date().toISOString();
 3044:   if (!currentConversationId) currentConversationId = makeId('conversation');
 3045:   const originConversationId = currentConversationId;
 3046:   const originSessionId = sessionStartedAt?.toISOString?.() || now;
 3047:   const originMessages = messages;
 3048:   const originSnapshot = buildConversationSnapshot({
 3049:     conversationId: originConversationId,
 3050:     messages: originMessages,
 3051:     sessionStartedAt: sessionStartedAt || new Date(now)
 3052:   });
 3053:   console.log('[CHAT] originConversationId:', originConversationId);
 3054:   console.log('[CHAT] originSessionId:', originSessionId);
 3055: 
 3056:   // Preservar attachments com todo o contexto extraÃ­do
 3057:   const preservedAttachments = await enrichAttachmentsForRuntime(attachments.map(file => ({
 3058:     id: file.id,
 3059:     name: file.name,
 3060:     type: file.type,
 3061:     size: file.size,
 3062:     kind: file.kind,
 3063:     data: file.data,
 3064:     text: file.text,
 3065:     extractedText: file.extractedText || file.text
 3066:   })));
 3067: 
 3068:   if (typeof shouldEnableNotionAutoSave === 'function' && shouldEnableNotionAutoSave(content)) {
 3069:     autoSaveNotion = true;
 3070:   }
 3071:   currentTurnPolicy = {
 3072:     explicitNotionWriteAuthorized: typeof hasExplicitNotionWriteAuthorization === 'function' ? hasExplicitNotionWriteAuthorization(content) : false,
 3073:     deferNotionWrite: typeof hasDeferredTimeTrigger === 'function' ? (hasDeferredTimeTrigger(content) && /\bnotion\b/i.test(content)) : false,
 3074:     shouldExecuteDeferredNow: typeof shouldExecuteDeferredActionsNow === 'function' ? shouldExecuteDeferredActionsNow(content) : false
 3075:   };
 3076:   if (typeof startTrace === 'function') {
 3077:     turnTraceRun = startTrace('Worion Desktop message', buildTurnTraceMetadata(content));
 3078:   }
 3079:   const confirmedHistoryAttachments = preservedAttachments.filter(file => file.historyContext?.confirmed);
 3080: 
 3081:   console.log('[CHAT] Mensagem com', preservedAttachments.length, 'anexos:', preservedAttachments.map(f => `${f.name} (${f.kind}, texto: ${f.extractedText?.length || 0})`));
 3082: 
 3083:   originMessages.push({ role: 'user', content, createdAt: now, attachments: preservedAttachments });
 3084:   attachedFiles = [];
 3085:   sessionSaved = false;
 3086:   inp.value = '';
 3087:   inp.style.height = 'auto';
 3088:   updateAttachmentsPreview();
 3089:   connectorContext = await getConnectorContextForMessage(`${content}\n${attachments.map(file => file.text || '').join('\n')}`);
 3090:   internalMemoryContext = typeof searchInternalMemory === 'function' ? await searchInternalMemory(content) : '';
 3091:   if (confirmedHistoryAttachments.length) {
 3092:     const historyNotes = confirmedHistoryAttachments.map(file => {
 3093:       const ids = (file.historyContext.conversationIds || []).join(', ') || 'sem id';
 3094:       const summary = file.historyContext.summary || 'Conversa relacionada encontrada na memoria.';
 3095:       return `Historico anexado confirmado para ${file.name}. Conversas relacionadas: ${ids}. Resumo: ${summary}`;
 3096:     }).join('\n');
 3097:     internalMemoryContext = [internalMemoryContext, historyNotes].filter(Boolean).join('\n\n');
 3098:   }
 3099:   await traceMemoryStep(turnTraceRun, content, internalMemoryContext);
 3100:   await traceAgentDocumentsStep(turnTraceRun, content);
 3101:   renderOriginConversation(originConversationId);
 3102:   await saveConversationSnapshot(originSnapshot, { silent: true });
 3103: 
 3104:   originMessages.push({ role: 'assistant', content: '...' });
 3105:   const assistantIndex = originMessages.length - 1;
 3106:   isAssistantResponding = true;
 3107:   responseAbortRequested = false;
 3108:   currentResponseController = new AbortController();
 3109:   renderOriginConversation(originConversationId);
 3110:   if (typeof showWorionStatus === 'function') showWorionStatus('thinking');
 3111: 
 3112:   const setAssistantReply = async (reply, { animate = true } = {}) => {
 3113:     const finalContent = String(reply || '');
 3114:     originMessages[assistantIndex] = { role: 'assistant', content: finalContent, createdAt: new Date().toISOString() };
 3115:     if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
 3116:     if (!isOriginConversationActive(originConversationId)) {
 3117:       console.log('[CHAT] Resposta concluÃ­da para conversa em segundo plano:', originConversationId);
 3118:     }
 3119:     renderOriginConversation(originConversationId);
 3120:   };
 3121: 
 3122:   const saveOriginAndReturn = async () => {
 3123:     sessionSaved = false;
 3124:     await saveConversationSnapshot(originSnapshot, { silent: true });
 3125:     if (isOriginConversationActive(originConversationId) && typeof focusComposerInput === 'function') focusComposerInput();
 3126:   };
 3127: 
 3128:   try {
 3129:     if (currentTurnPolicy.shouldExecuteDeferredNow && Array.isArray(DEFERRED_ACTIONS) && DEFERRED_ACTIONS.length) {
 3130:       await traceIntentStep(turnTraceRun, { message: content }, { category: 'deferred_actions', count: DEFERRED_ACTIONS.length });
 3131:       const deferredResults = await executeDeferredActions({ force: true });
 3132:       const executed = deferredResults.filter(item => item.success).length;
 3133:       const blocked = deferredResults.filter(item => item.blocked).length;
 3134:       const failed = deferredResults.filter(item => !item.success && !item.blocked).length;
 3135:       originMessages[assistantIndex] = {
 3136:         role: 'assistant',
 3137:         content: `Executei ${executed} acao(oes) diferida(s).${blocked ? ` ${blocked} continuaram bloqueadas.` : ''}${failed ? ` ${failed} falharam.` : ''}`,
 3138:         createdAt: new Date().toISOString()
 3139:       };
 3140:       await saveOriginAndReturn();
 3141:       return;
 3142:     }
 3143: 
 3144:     if (shouldIntegrateAttachmentsToAgent(content, preservedAttachments)) {
 3145:       await traceIntentStep(turnTraceRun, { message: content }, { category: 'integrate_agent_documents', attachmentsCount: preservedAttachments.length });
 3146:       const textDocuments = preservedAttachments
 3147:         .filter(file => file.kind === 'text' && (file.extractedText || file.text))
 3148:         .map(file => ({ name: file.name, content: file.extractedText || file.text }));
 3149:       if (!textDocuments.length) {
 3150:         originMessages[assistantIndex] = { role: 'assistant', content: 'Nao encontrei nenhum anexo textual para integrar ao agente ativo.', createdAt: new Date().toISOString() };
 3151:       } else {
 3152:         await integrateDocumentsIntoCurrentAgent(textDocuments);
 3153:         const assimilatedContent = textDocuments.map(doc => `# ${doc.name}\n${doc.content}`).join('\n\n---\n\n');
 3154:         const reply = typeof generateContextualAssimilationResponse === 'function'
 3155:           ? generateContextualAssimilationResponse({
 3156:               sourceType: 'agent_documents',
 3157:               activeAgent: currentAgent,
 3158:               userProfile,
 3159:               content: assimilatedContent,
 3160:               projects: typeof inferAssimilationProjects === 'function' ? inferAssimilationProjects(assimilatedContent) : [],
 3161:               extractedThemes: typeof inferAssimilationThemes === 'function' ? inferAssimilationThemes(assimilatedContent) : [],
 3162:               insights: typeof inferAssimilationInsights === 'function' ? inferAssimilationInsights(assimilatedContent) : [],
 3163:               sourceCount: textDocuments.length
 3164:             })
 3165:           : `${textDocuments.length} documento(s) entraram no agente e agora orientam identidade, metodo e resposta.`;
 3166:         originMessages[assistantIndex] = { role: 'assistant', content: reply, createdAt: new Date().toISOString() };
 3167:       }
 3168:       await saveOriginAndReturn();
 3169:       return;
 3170:     }
 3171: 
 3172:     const notionCreateRequest = typeof detectNotionPageRequest === 'function' ? detectNotionPageRequest(content) : null;
 3173:     if (notionCreateRequest) {
 3174:       await traceIntentStep(turnTraceRun, { message: content }, { category: 'notion_create_page', title: notionCreateRequest.title });
 3175:       if (currentTurnPolicy.deferNotionWrite) {
 3176:         deferAction('create_notion_page', notionCreateRequest, 'Escrita no Notion adiada pelo usuario', { authorized: currentTurnPolicy.explicitNotionWriteAuthorized });
 3177:         originMessages[assistantIndex] = { role: 'assistant', content: 'Deixei a escrita no Notion agendada para o fim da conversa.', createdAt: new Date().toISOString() };
 3178:         await saveOriginAndReturn();
 3179:         return;
 3180:       }
 3181:       if (typeof showWorionStatus === 'function') showWorionStatus('composing');
 3182:       const notionT0 = Date.now();
 3183:       let reply;
 3184:       try {
 3185:         reply = await executeNotionPageRequest(notionCreateRequest);
 3186:         if (typeof markTraceFlag === 'function') markTraceFlag(turnTraceRun, 'hasNotionCall', true);
 3187:         if (typeof logStep === 'function') {
 3188:           await logStep(turnTraceRun, 'notionToolCall', {
 3189:             toolName: 'create_notion_page',
 3190:             args: notionCreateRequest
 3191:           }, {
 3192:             durationMs: Date.now() - notionT0,
 3193:             result: reply
 3194:           });
 3195:         }
 3196:       } catch (error) {
 3197:         if (typeof traceError === 'function') await traceError(turnTraceRun, 'notionToolCall', error);
 3198:         throw error;
 3199:       }
 3200:       originMessages[assistantIndex] = { role: 'assistant', content: reply, createdAt: new Date().toISOString() };
 3201:       await saveOriginAndReturn();
 3202:       return;
 3203:     }
 3204: 
 3205:     if (typeof shouldForceNotionToolAttempt === 'function' && shouldForceNotionToolAttempt(content)) {
 3206:       await traceIntentStep(turnTraceRun, { message: content }, { category: 'notion_read' });
 3207:       if (typeof showWorionStatus === 'function') showWorionStatus('sources');
 3208:       let notionReadResult;
 3209:       const notionT0 = Date.now();
 3210:       try {
 3211:         notionReadResult = await executeDirectNotionReadRequest(content);
 3212:         if (typeof markTraceFlag === 'function') markTraceFlag(turnTraceRun, 'hasNotionCall', true);
 3213:         if (typeof logStep === 'function') {
 3214:           await logStep(turnTraceRun, 'notionToolCall', {
 3215:             toolName: 'direct_notion_read',
 3216:             args: { message: content }
 3217:           }, {
 3218:             durationMs: Date.now() - notionT0,
 3219:             result: {
 3220:               success: Boolean(notionReadResult?.success),
 3221:               pages: notionReadResult?.pages || [],
 3222:               pageId: notionReadResult?.pageId || null
 3223:             }
 3224:           });
 3225:         }
 3226:       } catch (error) {
 3227:         if (typeof traceError === 'function') await traceError(turnTraceRun, 'notionToolCall', error);
 3228:         const finalReply = `Falhou ao acessar o Notion: ${error.message}`;
 3229:         await setAssistantReply(finalReply);
 3230:         await saveOriginAndReturn();
 3231:         return;
 3232:       }
 3233:       const reply = buildAssimilationReplyFromNotionRead(notionReadResult, content);
 3234:       const finalReply = normalizeAssistantReply(reply, content);
 3235:       await setAssistantReply(finalReply);
 3236:       await saveOriginAndReturn();
 3237:       return;
 3238:     }
 3239: 
 3240:     if (shouldAssimilateAttachmentsOnly(content, preservedAttachments)) {
 3241:       await traceIntentStep(turnTraceRun, { message: content }, { category: 'assimilate_attachments', attachmentsCount: preservedAttachments.length });
 3242:       const reply = buildAttachmentAssimilationReply(preservedAttachments);
 3243:       const finalReply = normalizeAssistantReply(reply, content);
 3244:       await setAssistantReply(finalReply);
 3245:       await saveOriginAndReturn();
 3246:       return;
 3247:     }
 3248: 
 3249:     if (typeof showWorionStatus === 'function') showWorionStatus('sources');
 3250: 
 3251:     // ROTA INTERNA: perguntas sobre o prÃ³prio Worion nunca ativam grounding externo
 3252:     const isInternalDiagnostic = isInternalDiagnosticRequest(content);
 3253:     const executionRoute = getExecutionRoute(content);
 3254:     const routerGroundingObserveOnly = FACTUAL_BLOCKERS_TEST_MODE && WORION_EXECUTION_ROUTER_TEST;
 3255: 
 3256:     // GROUNDING OBRIGATÃ“RIO: Detecta pedidos factuais e busca fontes ANTES da geraÃ§Ã£o
 3257:     const isFactualRequest = !isInternalDiagnostic && looksLikeFactualRequest(content);
 3258:     let groundingData = null;
 3259:     let groundingContext = '';
 3260: 
 3261:     // VERIFICATION ENGINE: Criar plano de verificaÃ§Ã£o ANTES de qualquer roteamento
 3262:     let verificationPlan = isInternalDiagnostic
 3263:       ? { requiresVerification: false, domain: 'internal_diagnostic', isChallenge: false, mustUseExternalEvidence: false, minimumSources: 0, priority: 0 }
 3264:       : (typeof window !== 'undefined' && window.WorionVerificationEngine)
 3265:         ? window.WorionVerificationEngine.createVerificationPlan(content)
 3266:         : { requiresVerification: false, mustUseExternalEvidence: false };
 3267:     if (!isInternalDiagnostic) verificationPlan = enforceEvidencePlanForSensitiveQuery(verificationPlan, content);
 3268:     let evidenceSources = [];
 3269:     let externalEvidenceContext = '';
 3270:     let externalEvidenceRecords = [];
 3271:     let evidencePack = createEmptyEvidencePack(content);
 3272: 
 3273:     if (!routerGroundingObserveOnly && (isFactualRequest || verificationPlan.mustUseExternalEvidence)) {
 3274:       if (typeof showWorionStatus === 'function') showWorionStatus('sources');
 3275: 
 3276:       // WIKIPEDIA GATE: para domÃ­nios histÃ³ricos/geogrÃ¡ficos, tenta fetch direto antes do Brave/Tavily
 3277:       const isWikipediaGateDomain = WIKIPEDIA_GATE_DOMAINS.includes(verificationPlan?.domain);
 3278:       if (isFactualRequest && isWikipediaGateDomain) {
 3279:         if (typeof showWorionStatus === 'function') showWorionStatus('openingSources');
 3280:         const wikiPack = await fetchWikipediaDirectGrounding(content);
 3281:         if (wikiPack && wikiPack.count > 0) {
 3282:           evidencePack = wikiPack;
 3283:           console.log(`[WIKIPEDIA GATE] Usando Wikipedia como fonte primÃ¡ria (${wikiPack.evidenceSources[0]?.title})`);
 3284:           // Wikipedia Ã© FONTE PRIMÃRIA de alta confianÃ§a â€” 1 fonte Ã© suficiente
 3285:           if (verificationPlan.minimumSources > 1) {
 3286:             verificationPlan = { ...verificationPlan, minimumSources: 1 };
 3287:             console.log('[WIKIPEDIA GATE] minimumSources reduzido para 1 (fonte primÃ¡ria Wikipedia)');
 3288:           }
 3289:         }
 3290:       }
 3291: 
 3292:       // Fallback: Brave/Tavily se Wikipedia Gate nÃ£o retornou ou domÃ­nio nÃ£o elegÃ­vel
 3293:       if (!evidencePack.count) {
 3294:         evidencePack = await collectEvidencePack(content, {
 3295:           ...verificationPlan,
 3296:           mustUseExternalEvidence: true
 3297:         }, {
 3298:           mode: isFactualRequest ? 'grounding' : 'verification',
 3299:           count: isFactualRequest ? 8 : 5,
 3300:           maxSources: isFactualRequest ? 8 : 5,
 3301:           fetchLimit: 3,
 3302:           timeoutMs: isFactualRequest ? 12000 : 9000
 3303:         });
 3304:       }
 3305: 
 3306:       if (evidencePack.count) {
 3307:         if (isFactualRequest) {
 3308:           groundingData = {
 3309:             text: evidencePack.text,
 3310:             sources: evidencePack.sources,
 3311:             count: evidencePack.count,
 3312:             provider: evidencePack.provider
 3313:           };
 3314:           groundingContext = evidencePack.context;
 3315:           console.log(`[GROUNDING GATE] Contexto injetado: ${groundingData.count} fontes via ${groundingData.provider.toUpperCase()}`);
 3316:         } else {
 3317:           externalEvidenceContext = evidencePack.context;
 3318:           console.log('[VERIFICATION] Evidence Pack injetado:', evidencePack.count, 'fontes');
 3319:         }
 3320: 
 3321:         for (const source of evidencePack.evidenceSources) {
 3322:           registerEvidenceSource(evidenceSources, source);
 3323:         }
 3324:         externalEvidenceRecords.push(...evidencePack.evidenceRecords);
 3325:       } else if (isFactualRequest) {
 3326:         groundingContext = `\n\n${FACTUAL_BLOCKERS_TEST_DIRECTIVE}
 3327: 
 3328: Busca factual executada, mas o Evidence Pack retornou vazio. Continue a resposta sem substituir por mensagem de bloqueio; registre lacunas como nao confirmadas quando necessario.`;
 3329:         console.log('[GROUNDING GATE] TEST MODE: Evidence Pack vazio; resposta livre preservada.');
 3330:       }
 3331: 
 3332:       if (typeof markTraceFlag === 'function') {
 3333:         markTraceFlag(turnTraceRun, 'evidence_pack_built', true);
 3334:         markTraceFlag(turnTraceRun, 'evidence_pack_sources_count', evidencePack.count);
 3335:         markTraceFlag(turnTraceRun, 'evidence_pack_fetched_pages_count', evidencePack.fetchedPages.length);
 3336:         markTraceFlag(turnTraceRun, 'evidence_pack_provider', evidencePack.provider);
 3337:       }
 3338:       if (typeof logStep === 'function') {
 3339:         await logStep(turnTraceRun, 'buildEvidencePack', {
 3340:           query: content,
 3341:           mode: isFactualRequest ? 'grounding' : 'verification',
 3342:           verificationPlan
 3343:         }, {
 3344:           sourcesCount: evidencePack.count,
 3345:           fetchedPagesCount: evidencePack.fetchedPages.length,
 3346:           provider: evidencePack.provider,
 3347:           urls: evidencePack.evidenceSources.map(source => source.url).filter(Boolean).slice(0, 8),
 3348:           errors: evidencePack.errors
 3349:         });
 3350:       }
 3351:     }
 3352: 
 3353:     const classification = await classifyUserRequest(content, attachments);
 3354:     await traceIntentStep(turnTraceRun, { message: content, attachmentsCount: attachments.length }, classification);
 3355:     await logInternalAction('request_classified', 'success', classification);
 3356:     if (classification.category === 'simple_query' && /^m[aÃ£]os agradecendo emoji[!.? ]*$/i.test(content.trim())) {
 3357:       if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
 3358:       originMessages[assistantIndex] = { role: 'assistant', content: 'ðŸ™', createdAt: new Date().toISOString() };
 3359:       renderOriginConversation(originConversationId);
 3360:       await saveConversationSnapshot(originSnapshot, { silent: true });
 3361:       return;
 3362:     }
 3363:     if (typeof hasActiveWorkMode === 'function' ? hasActiveWorkMode('smart-research') : activeWorkModeId === 'smart-research') {
 3364:       if (typeof showWorionStatus === 'function') showWorionStatus('sources');
 3365:       let finalReport = await generateSmartResearchReply(content, attachments, verificationPlan, originMessages);
 3366:       finalReport = applyEvidenceGate(finalReport, verificationPlan, evidenceSources);
 3367:       const finalReply = normalizeAssistantReply(finalReport, content);
 3368:       await setAssistantReply(finalReply);
 3369:       await saveOriginAndReturn();
 3370:       return;
 3371:     }
 3372:     const shouldBypassGoalEngine =
 3373:       WORION_EXECUTION_ROUTER_TEST &&
 3374:       ['focused_research', 'deep_research', 'source_check', 'comparative_research'].includes(executionRoute);
 3375:     if (!shouldBypassGoalEngine && shouldUseGoalEngineForRequest(content, attachments, classification)) {
 3376:       if (typeof showWorionStatus === 'function') showWorionStatus('thinking');
 3377:       let finalReport = await executeCompoundGoal(content, attachments, classification, verificationPlan);
 3378:       finalReport = applyEvidenceGate(finalReport, verificationPlan, evidenceSources);
 3379:       const finalReply = normalizeAssistantReply(finalReport, content);
 3380:       await setAssistantReply(finalReply);
 3381:       await saveOriginAndReturn();
 3382:       return;
 3383:     }
 3384: 
 3385:     const thinkingContext = await getSequentialThinkingContext(content, attachments);
 3386:     const agentDomainResearchContext = await buildAgentDomainResearchContext(content, preservedAttachments);
 3387: 
 3388:     // VerificaÃ§Ã£o factual
 3389:     let verificationInstruction = '';
 3390:     let verificationMetadata = null;
 3391:     if (typeof window !== 'undefined' && window.WorionVerificationEngine && window.WorionVerificationEngine.requiresVerification(content)) {
 3392:       const domain = window.WorionVerificationEngine.detectDomain(content);
 3393:       verificationInstruction = FACTUAL_BLOCKERS_TEST_MODE
 3394:         ? FACTUAL_BLOCKERS_TEST_DIRECTIVE
 3395:         : window.WorionVerificationEngine.buildVerificationInstruction(content);
 3396:       verificationMetadata = {
 3397:         verification_required: true,
 3398:         verification_domain: domain,
 3399:         verification_policy: FACTUAL_BLOCKERS_TEST_MODE ? 'test_mode_observe_only' : 'multi_source_consensus'
 3400:       };
 3401:       console.log('[VERIFICATION] VerificaÃ§Ã£o factual ativada para domÃ­nio:', domain, FACTUAL_BLOCKERS_TEST_MODE ? '(TEST MODE: sem bloqueio)' : '');
 3402:     }
 3403: 
 3404:     // Incluir contexto de attachments explicitamente no system prompt quando houver
 3405:     let attachmentContext = '';
 3406:     if (preservedAttachments.length > 0) {
 3407:       const textAttachments = preservedAttachments.filter(f => (f.kind === 'text' || f.kind === 'unsupported') && (f.extractedText || f.text));
 3408:       if (textAttachments.length > 0) {
 3409:         attachmentContext = `\n\nðŸ“Ž ARQUIVOS ANEXADOS NESTA MENSAGEM (${textAttachments.length}):\n` +
 3410:           textAttachments.map(f => `- ${f.name} (${(f.size/1024).toFixed(1)}KB) - texto extraÃ­do disponÃ­vel`).join('\n') +
 3411:           '\n\nO conteÃºdo completo dos arquivos estÃ¡ incluÃ­do na mensagem do usuÃ¡rio. Use esse conteÃºdo para responder.';
 3412:       }
 3413:     }
 3414: 
 3415:     const systemPrompt = [
 3416:       buildSystemPrompt(content, preservedAttachments, [groundingContext, attachmentContext, agentDomainResearchContext, externalEvidenceContext, verificationInstruction].filter(Boolean).join('\n\n')),
 3417:       FACTUAL_BLOCKERS_TEST_MODE ? FACTUAL_BLOCKERS_TEST_DIRECTIVE : ''
 3418:     ].filter(Boolean).join('\n\n');
 3419:     await tracePromptStep(turnTraceRun, systemPrompt, {
 3420:       route: 'chat_completion',
 3421:       attachmentsCount: preservedAttachments.length,
 3422:       ...(verificationMetadata || {})
 3423:     });
 3424:     const apiMessages = [
 3425:       { role: 'system', content: systemPrompt },
 3426:       ...(thinkingContext ? [{ role: 'system', content: thinkingContext }] : []),
 3427:       ...originMessages.filter(m => m.content !== '...' && ['user', 'assistant'].includes(m.role)).map(formatMessageForOpenAI)
 3428:     ];
 3429: 
 3430:     console.log('[CHAT] Enviando', apiMessages.length, 'mensagens ao modelo. Ãšltima mensagem formatada:', JSON.stringify(apiMessages[apiMessages.length - 1]).slice(0, 500));
 3431:     console.log('[DEBUG] WORION_TOOLS inventario total:', WORION_TOOLS.length);
 3432:     if (typeof showWorionStatus === 'function') showWorionStatus('composing');
 3433:     let agentResult;
 3434: 
 3435:     if (WORION_EXECUTION_ROUTER_TEST) {
 3436:       const route = executionRoute;
 3437:       const executionProfile = EXECUTION_PROFILES[route] || EXECUTION_PROFILES.direct_answer;
 3438:       const selectedTools = selectToolsByProfile(WORION_TOOLS, executionProfile);
 3439:       const maxTokens = executionProfile.maxTokens || getResponseTokenBudget(content);
 3440: 
 3441:       console.log('[EXECUTION ROUTER TEST] enabled:', true);
 3442:       console.log('[EXECUTION ROUTER TEST] route:', route);
 3443:       console.log('[EXECUTION ROUTER TEST] selectedTools:', selectedTools.map(t => t.function?.name));
 3444:       console.log('[EXECUTION ROUTER TEST] secondaryTools:', executionProfile.secondaryTools || []);
 3445:       console.log('[EXECUTION ROUTER TEST] tavilySecondaryLock:', WORION_TAVILY_SECONDARY_LOCK);
 3446:       console.log('[EXECUTION ROUTER TEST] secondaryPolicy:', executionProfile.secondaryPolicy || 'none');
 3447:       console.log('[EXECUTION ROUTER TEST] maxToolRounds:', executionProfile.maxToolRounds);
 3448:       console.log('[EXECUTION ROUTER TEST] thinking:', executionProfile.thinking);
 3449:       console.log('[EXECUTION ROUTER TEST] maxTokens:', executionProfile.maxTokens);
 3450:       console.log('[TOKEN BUDGET] route:', route, 'max_tokens:', maxTokens, 'source:', 'execution_router_or_goal_engine');
 3451: 
 3452:       if (['focused_research', 'deep_research', 'source_check', 'comparative_research'].includes(route)) {
 3453:         agentResult = await runDeterministicResearchRoute(apiMessages, content, executionProfile, {
 3454:           model: currentAgent.model || 'gpt-4o-mini',
 3455:           temperature: 0.35,
 3456:           max_tokens: maxTokens,
 3457:           verificationDomain: verificationPlan?.domain || 'general',
 3458:           thinking: executionProfile.thinking,
 3459:           executionRoute: route,
 3460:           executionProfile
 3461:         });
 3462:       } else {
 3463:         agentResult = await runOpenAIWithTools(apiMessages, selectedTools, {
 3464:           model: currentAgent.model || 'gpt-4o-mini',
 3465:           temperature: 0.4,
 3466:           max_tokens: maxTokens,
 3467:           verificationDomain: verificationPlan?.domain || 'general',
 3468:           maxToolRounds: executionProfile.maxToolRounds,
 3469:           thinking: executionProfile.thinking,
 3470:           executionRoute: route,
 3471:           executionProfile
 3472:         });
 3473:       }
 3474:     } else {
 3475:       console.log('[EXECUTION ROUTER TEST] disabled. Usando fluxo anterior.');
 3476: 
 3477:       agentResult = await runOpenAIWithTools(apiMessages, WORION_TOOLS, {
 3478:         model: currentAgent.model || 'gpt-4o-mini',
 3479:         temperature: 0.4,
 3480:         max_tokens: getResponseTokenBudget(content),
 3481:         verificationDomain: verificationPlan?.domain || 'general'
 3482:       });
 3483:     }
 3484: 
 3485:     let reply = agentResult.content;
 3486:     const allToolCalls = [...externalEvidenceRecords, ...agentResult.toolCalls];
 3487:     console.log('[VERIFICATION] externalEvidenceRecords:', externalEvidenceRecords.length, 'registros');
 3488:     console.log('[VERIFICATION] agentResult.toolCalls:', agentResult.toolCalls.length, 'tool calls do modelo');
 3489:     console.log('[VERIFICATION] allToolCalls total:', allToolCalls.length, 'para validaÃ§Ã£o');
 3490:     for (const item of agentResult.toolResults) {
 3491:       registerToolEvidenceSources(evidenceSources, item.toolCall, item.result);
 3492:     }
 3493: 
 3494:     // TEST MODE: Verification Engine fica apenas em observabilidade; nao altera reply.
 3495:     if (verificationPlan.mustUseExternalEvidence && typeof window !== 'undefined' && window.WorionVerificationEngine) {
 3496:       if (typeof showWorionStatus === 'function') showWorionStatus('evidence');
 3497:       const evidenceUsed = window.WorionVerificationEngine.countExternalEvidence(allToolCalls);
 3498:       const validation = window.WorionVerificationEngine.validateResponse(verificationPlan, evidenceUsed);
 3499: 
 3500:       // Registrar no LangSmith
 3501:       if (typeof markTraceFlag === 'function') {
 3502:         markTraceFlag(turnTraceRun, 'verification_required', true);
 3503:         markTraceFlag(turnTraceRun, 'verification_domain', verificationPlan.domain);
 3504:         markTraceFlag(turnTraceRun, 'external_evidence_used', evidenceUsed.hasExternalEvidence);
 3505:         markTraceFlag(turnTraceRun, 'external_tool_calls_count', evidenceUsed.count);
 3506:       }
 3507: 
 3508:       console.log('[VERIFICATION] ValidaÃ§Ã£o:', validation);
 3509:       console.log('[VERIFICATION] EvidÃªncia usada:', evidenceUsed);
 3510: 
 3511:       if (!validation.approved) {
 3512:         console.warn('[VERIFICATION] TEST MODE: bloqueio factual desativado; resposta preservada.', validation.reason);
 3513:         if (typeof markTraceFlag === 'function') {
 3514:           markTraceFlag(turnTraceRun, 'verification_blocker_disabled_test_mode', true);
 3515:           markTraceFlag(turnTraceRun, 'verification_validation_reason', validation.reason);
 3516:         }
 3517:       }
 3518:     }
 3519: 
 3520:     const hadPendingArtifactRequest = Boolean(pendingArtifactRequest);
 3521:     if (pendingArtifactRequest) {
 3522:       const artifactResult = pendingArtifactRequest.type === 'image'
 3523:         ? ''
 3524:         : await executeArtifactWebhook(pendingArtifactRequest, reply);
 3525:       if (artifactResult) reply = `${reply}\n\n${artifactResult}`;
 3526:       pendingArtifactRequest = null;
 3527:     }
 3528:     if (typeof showWorionStatus === 'function') showWorionStatus('evidence');
 3529:     const gatedReply = applyEvidenceGate(reply, verificationPlan, evidenceSources);
 3530:     reply = gatedReply;
 3531:     if (typeof showWorionStatus === 'function') showWorionStatus('composing');
 3532:     reply = normalizeAssistantReply(reply, content);
 3533: 
 3534:     // GROUNDING VALIDATION: em TEST MODE, valida apenas para log e nunca altera reply.
 3535:     // EXCEÃ‡ÃƒO: Se gerou artifact (PDF, cÃ³digo, etc), nÃ£o valida nomes na mensagem de texto
 3536:     const hasArtifact = hadPendingArtifactRequest || agentResult.toolCalls.some(tc =>
 3537:       tc.function?.name === 'generate_pdf' ||
 3538:       tc.function?.name === 'create_artifact'
 3539:     );
 3540: 
 3541:     if (isFactualRequest && !hasArtifact) {
 3542:       if (typeof showWorionStatus === 'function') showWorionStatus('evidence');
 3543:       const validation = validateGroundedResponse(reply, groundingData);
 3544: 
 3545:       if (!validation.valid) {
 3546:         console.warn('[GROUNDING GATE] TEST MODE: barreira final desativada; resposta preservada.', validation.reason);
 3547: 
 3548:         if (typeof markTraceFlag === 'function') {
 3549:           markTraceFlag(turnTraceRun, 'grounding_gate_blocker_disabled_test_mode', true);
 3550:           markTraceFlag(turnTraceRun, 'grounding_validation_failed', true);
 3551:           markTraceFlag(turnTraceRun, 'grounding_validation_reason', validation.reason);
 3552:         }
 3553:       } else {
 3554:         // Marcar no trace
 3555:         if (typeof markTraceFlag === 'function') {
 3556:           markTraceFlag(turnTraceRun, 'grounding_validation_passed', true);
 3557:           markTraceFlag(turnTraceRun, 'grounding_sources_used', groundingData?.count || 0);
 3558:         }
 3559:         if (validation.mode === 'fallback_primary_source') {
 3560:           console.warn('[GROUNDING GATE] TEST MODE: fallback por fonte primaria registrado sem alterar reply.');
 3561:           if (typeof markTraceFlag === 'function') {
 3562:             markTraceFlag(turnTraceRun, 'grounding_fallback_primary_source', true);
 3563:             markTraceFlag(turnTraceRun, 'grounding_verified_percent', validation.verifiedPercent || 0);
 3564:           }
 3565:         }
 3566:       }
 3567:     }
 3568: 
 3569:     // EVASIVE ANSWER REPAIR: Detecta e corrige respostas evasivas em pedidos de pesquisa
 3570:     if (typeof window !== 'undefined' && window.WorionVerificationEngine) {
 3571:       const isResearchRequest = window.WorionVerificationEngine.looksLikeResearchRequest(content);
 3572:       const isEvasive = window.WorionVerificationEngine.isEvasiveResearchAnswer(reply, content);
 3573: 
 3574:       if (isResearchRequest && isEvasive && !isFactualRequest) { // SÃ³ repara se nÃ£o passou pelo grounding
 3575:         console.log('[EVASIVE_REPAIR] Resposta evasiva detectada em pedido de pesquisa. Refazendo...');
 3576:         if (typeof showWorionStatus === 'function') showWorionStatus('composing');
 3577: 
 3578:         const repairPrompt = window.WorionVerificationEngine.buildResearchRepairPrompt(content);
 3579:         const repairMessages = [
 3580:           { role: 'system', content: systemPrompt },
 3581:           ...(thinkingContext ? [{ role: 'system', content: thinkingContext }] : []),
 3582:           ...originMessages.filter(m => m.content !== '...' && ['user', 'assistant'].includes(m.role)).map(formatMessageForOpenAI),
 3583:           { role: 'assistant', content: reply },
 3584:           { role: 'user', content: repairPrompt }
 3585:         ];
 3586: 
 3587:         try {
 3588:           const repairRoute = WORION_EXECUTION_ROUTER_TEST ? getExecutionRoute(content) : null;
 3589:           const repairProfile = repairRoute ? (EXECUTION_PROFILES[repairRoute] || EXECUTION_PROFILES.direct_answer) : null;
 3590:           const repairTools = WORION_EXECUTION_ROUTER_TEST
 3591:             ? selectToolsByProfile(WORION_TOOLS, repairProfile || {})
 3592:             : WORION_TOOLS;
 3593: 
 3594:           console.log('[EVASIVE_REPAIR] route:', repairRoute || 'legacy');
 3595:           console.log('[EVASIVE_REPAIR] selectedTools:', repairTools.map(tool => tool.function?.name));
 3596: 
 3597:           const repairResult = await runOpenAIWithTools(repairMessages, repairTools, {
 3598:             model: currentAgent.model || 'gpt-4o-mini',
 3599:             temperature: 0.2, // temperatura mais baixa para execuÃ§Ã£o objetiva
 3600:             max_tokens: repairProfile?.maxTokens || getResponseTokenBudget(content),
 3601:             maxToolRounds: repairProfile?.maxToolRounds,
 3602:             thinking: repairProfile?.thinking,
 3603:             executionRoute: repairRoute,
 3604:             executionProfile: repairProfile
 3605:           });
 3606: 
 3607:           // Registrar evidÃªncias do reparo
 3608:           for (const item of repairResult.toolResults) {
 3609:             registerToolEvidenceSources(evidenceSources, item.toolCall, item.result);
 3610:           }
 3611: 
 3612:           const repairedReply = repairResult.content;
 3613:           const stillEvasive = window.WorionVerificationEngine.isEvasiveResearchAnswer(repairedReply, content);
 3614: 
 3615:           if (!stillEvasive && repairedReply && repairedReply.length > 50) {
 3616:             console.log('[EVASIVE_REPAIR] Resposta reparada com sucesso.');
 3617:             reply = normalizeAssistantReply(repairedReply, content);
 3618: 
 3619:             // Marcar no trace
 3620:             if (typeof markTraceFlag === 'function') {
 3621:               markTraceFlag(turnTraceRun, 'evasive_answer_detected', true);
 3622:               markTraceFlag(turnTraceRun, 'evasive_answer_repaired', true);
 3623:             }
 3624:           } else {
 3625:             console.warn('[EVASIVE_REPAIR] Resposta reparada ainda evasiva ou muito curta. Mantendo resposta original.');
 3626:             if (typeof markTraceFlag === 'function') {
 3627:               markTraceFlag(turnTraceRun, 'evasive_answer_detected', true);
 3628:               markTraceFlag(turnTraceRun, 'evasive_answer_repair_failed', true);
 3629:             }
 3630:           }
 3631:         } catch (repairError) {
 3632:           console.error('[EVASIVE_REPAIR] Erro ao reparar resposta:', repairError);
 3633:           if (typeof markTraceFlag === 'function') {
 3634:             markTraceFlag(turnTraceRun, 'evasive_answer_detected', true);
 3635:             markTraceFlag(turnTraceRun, 'evasive_answer_repair_error', true);
 3636:           }
 3637:           // MantÃ©m resposta original em caso de erro
 3638:         }
 3639:       }
 3640:     }
 3641: 
 3642:     const finalEvidencePack = {
 3643:       ...evidencePack,
 3644:       sources: evidenceSources,
 3645:       evidenceSources,
 3646:       count: Array.isArray(evidenceSources) ? evidenceSources.length : evidencePack.count
 3647:     };
 3648: 
 3649:     const narrativeValidation = validateNarrativeClaims(reply, finalEvidencePack, {
 3650:       enabled: !isInternalDiagnostic && (isFactualRequest || verificationPlan.mustUseExternalEvidence),
 3651:       hasArtifact,
 3652:       isContextualFollowup: isInternalDiagnostic || (!isFactualRequest && !verificationPlan.mustUseExternalEvidence)
 3653:     });
 3654:     if (typeof markTraceFlag === 'function') {
 3655:       markTraceFlag(turnTraceRun, 'narrative_claim_validation_checked', !narrativeValidation.skipped);
 3656:       markTraceFlag(turnTraceRun, 'narrative_claim_validation_passed', narrativeValidation.valid);
 3657:       markTraceFlag(turnTraceRun, 'narrative_claims_checked', narrativeValidation.claimsChecked || 0);
 3658:       markTraceFlag(turnTraceRun, 'narrative_claims_unsupported', narrativeValidation.unsupportedCount || 0);
 3659:     }
 3660:     if (!narrativeValidation.valid) {
 3661:       console.warn('[NARRATIVE CLAIM VALIDATOR] TEST MODE: bloqueio factual desativado; resposta preservada.', narrativeValidation.reason);
 3662:       if (typeof markTraceFlag === 'function') {
 3663:         markTraceFlag(turnTraceRun, 'narrative_claim_validation_blocker_disabled_test_mode', true);
 3664:         markTraceFlag(turnTraceRun, 'narrative_claim_validation_reason', narrativeValidation.reason);
 3665:       }
 3666:       if (typeof logStep === 'function') {
 3667:         await logStep(turnTraceRun, 'narrativeClaimValidation', {
 3668:           enabled: true,
 3669:           hasArtifact,
 3670:           query: content
 3671:         }, {
 3672:           approved: false,
 3673:           reason: narrativeValidation.reason,
 3674:           unsupported: narrativeValidation.unsupported
 3675:         });
 3676:       }
 3677:     } else if (!narrativeValidation.skipped && typeof logStep === 'function') {
 3678:       await logStep(turnTraceRun, 'narrativeClaimValidation', {
 3679:         enabled: true,
 3680:         hasArtifact,
 3681:         query: content
 3682:       }, {
 3683:         approved: true,
 3684:         claimsChecked: narrativeValidation.claimsChecked || 0,
 3685:         unsupportedCount: narrativeValidation.unsupportedCount || 0
 3686:       });
 3687:     }
 3688: 
 3689:     await setAssistantReply(reply);
 3690:   } catch (error) {
 3691:     console.error('Erro ao enviar mensagem:', error);
 3692:     if (typeof traceError === 'function') await traceError(turnTraceRun, 'finalAnswer', error);
 3693:     pendingArtifactRequest = null;
 3694:     const aborted = responseAbortRequested || error.name === 'AbortError';
 3695:     const safeToolLimit = error?.code === 'TOOL_ROUND_LIMIT';
 3696:     originMessages[assistantIndex] = {
 3697:       role: 'assistant',
 3698:       content: aborted
 3699:         ? 'Resposta interrompida.'
 3700:         : (safeToolLimit ? 'NÃ£o consegui concluir a execuÃ§Ã£o das ferramentas dentro do limite seguro.' : `Erro: ${error.message}`),
 3701:       createdAt: new Date().toISOString()
 3702:     };
 3703:   } finally {
 3704:     if (typeof hideExecutionStatus === 'function') hideExecutionStatus();
 3705:     isAssistantResponding = false;
 3706:     responseAbortRequested = false;
 3707:     currentResponseController = null;
 3708:     currentTurnPolicy = {
 3709:       explicitNotionWriteAuthorized: false,
 3710:       deferNotionWrite: false,
 3711:       shouldExecuteDeferredNow: false
 3712:     };
 3713:     await finalizeTurnTrace(turnTraceRun, assistantIndex, '', originMessages);
 3714:   }
 3715: 
 3716:   sessionSaved = false;
 3717:   renderOriginConversation(originConversationId);
 3718:   await saveConversationSnapshot(originSnapshot, { silent: true });
 3719:   if (originConversationId && typeof queueContextIndexing === 'function') {
 3720:     queueContextIndexing(originConversationId, getCleanMessages(originMessages));
 3721:   }
 3722: 
 3723:   // Retorna foco ao input apÃ³s resposta
 3724:   setTimeout(() => {
 3725:     if (isOriginConversationActive(originConversationId) && typeof focusComposerInput === 'function') focusComposerInput();
 3726:   }, 100);
 3727: }
```

## BUSCA 3 — WorionVerificationEngine em JS exceto chat.js e verification.js
```text
Ausencia confirmada: nenhuma ocorrencia de "WorionVerificationEngine" em arquivos JS dentro de js/ exceto chat.js e verification.js.
```

