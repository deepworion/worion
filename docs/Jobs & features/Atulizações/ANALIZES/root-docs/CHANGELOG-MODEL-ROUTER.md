# Changelog: Model Router - Seleção Inteligente de Modelos

**Data:** 2026-05-23  
**Versão:** 1.0  
**Objetivo:** Implementar seleção automática de modelos baseada em heurísticas de conteúdo e rotas de execução.

---

## 🎯 Resumo

O Model Router analisa a mensagem do usuário e escolhe automaticamente o modelo mais adequado:

- **Silêncio/opinião** → `gpt-4o-mini` (leve e rápido)
- **Código/debug** → `deepseek-v4-pro` (raciocínio lógico)
- **Comparação/análise** → `gpt-4o` (raciocínio complexo)
- **Resumo/tradução** → `claude-3-5-haiku` (rápido)
- **Pesquisa factual** → `deepseek-v4-pro` (síntese)
- **Padrão** → `gpt-4o-mini` (custo-benefício)

---

## 📂 Arquivos Criados/Modificados

### Criados:
1. **`js/model-router.js`** (novo)
   - Funções: `selectModelForMessage`, `isModelRouterEnabled`, `getModelInfo`, `logModelSelection`
   - Heurísticas de detecção: `isSilence`, `isCodeRelated`, `isDeepAnalysis`, `isSummaryTask`, `isResearchTask`
   - Mapeamento de modelos disponíveis com metadados

2. **`docs/model-router.md`** (novo)
   - Documentação completa do sistema
   - Exemplos práticos
   - API reference
   - Guia de configuração

3. **`CHANGELOG-MODEL-ROUTER.md`** (este arquivo)

### Modificados:
1. **`js/chat.js`**
   - Linhas ~331-337: Integração do Model Router
   - Substituição de `selectedRuntimeModel` por `resolvedModel` em todas as chamadas
   - Log estruturado da seleção de modelo

2. **`index.html`**
   - Linha 91: Adicionado `<script src="js/model-router.js"></script>`

3. **`.env.example`**
   - Adicionada configuração `WORION_MODEL_ROUTER_ENABLED=false`

---

## 🔧 Como Usar

### 1. Habilitar o Model Router

Edite `.env` (ou crie `.env.local`):

```bash
WORION_MODEL_ROUTER_ENABLED=true
```

### 2. Reiniciar o Aplicativo

```bash
npm start
```

### 3. Testar

Envie mensagens de diferentes tipos e observe os logs no console:

```
[MODEL ROUTER] {
  selected: 'deepseek-v4-pro',
  reason: 'code-debug',
  confidence: 0.85,
  provider: 'deepseek',
  specialty: 'reasoning-code',
  message: 'Como corrigir esse erro no JavaScript?'
}
```

---

## 📊 Lógica de Seleção

### Prioridade 1: Rota de Execução

| Rota | Modelo |
|------|--------|
| `silence`, `opinion`, `direct_answer`, `definition` | `gpt-4o-mini` |
| `focused_research`, `source_check`, `code`, `internal_diagnostic` | `deepseek-v4-pro` |
| `comparative_research`, `deep_research` | `gpt-4o` |

### Prioridade 2: Análise de Conteúdo

**Código/Debug:**
```javascript
// Palavras-chave
codigo, função, erro, debug, javascript, python, api, git, npm

// Exemplo
"Como faço para corrigir esse erro no JavaScript?" → deepseek-v4-pro
```

**Comparação/Análise:**
```javascript
// Palavras-chave
compare, analise, semelhanças, diferenças, versus

// Exemplo
"Compare Helena Blavatsky e Bashar" → gpt-4o
```

**Resumo/Tradução:**
```javascript
// Palavras-chave
resuma, traduza, organize, liste

// Exemplo
"Resuma esse texto em 3 frases" → claude-3-5-haiku
```

**Pesquisa Factual:**
```javascript
// Palavras-chave
pesquise, busque, quem é, o que é

// Exemplo
"Pesquise sobre Helena Blavatsky" → deepseek-v4-pro
```

---

## 🧪 Casos de Teste

### Teste 1: Código

**Input:**
```
Como faço para corrigir esse erro no JavaScript?

TypeError: Cannot read property 'map' of undefined
```

**Esperado:**
```javascript
{
  selected: 'deepseek-v4-pro',
  reason: 'code-debug',
  confidence: 0.85
}
```

---

### Teste 2: Comparação

**Input:**
```
Compare Helena Blavatsky e Bashar
```

**Esperado:**
```javascript
{
  selected: 'gpt-4o',
  reason: 'deep-analysis',
  confidence: 0.8
}
```

---

### Teste 3: Resumo

**Input:**
```
Resuma esse texto em 3 frases
```

**Esperado:**
```javascript
{
  selected: 'claude-3-5-haiku',
  reason: 'summary-fast',
  confidence: 0.75
}
```

---

### Teste 4: Pesquisa

**Input:**
```
Pesquise sobre Helena Blavatsky
```

**Esperado:**
```javascript
{
  selected: 'deepseek-v4-pro',
  reason: 'research-reasoning',
  confidence: 0.7
}
```

---

### Teste 5: Rota Prioritária

**Input:**
```
Compare A e B
```

**Rota detectada:** `comparative_research`

**Esperado:**
```javascript
{
  selected: 'gpt-4o',
  reason: 'route:comparative_research-complex',
  confidence: 0.95
}
```

---

## 📝 Código Implementado

### `js/model-router.js`

**Função Principal:**
```javascript
function selectModelForMessage(message, options = {}) {
  if (!MODEL_ROUTER_ENABLED) {
    return { model: 'deepseek-v4-pro', reason: 'router-disabled', confidence: 1.0 };
  }

  const normalized = normalizeForRouting(message);
  const executionRoute = options.executionRoute || options.route || '';

  // 1. Silêncio
  if (isSilence(message)) {
    return { model: 'gpt-4o-mini', reason: 'silence-lightweight', confidence: 1.0 };
  }

  // 2. Rota de execução (prioridade)
  if (executionRoute) {
    switch (executionRoute) {
      case 'comparative_research':
      case 'deep_research':
        return { model: 'gpt-4o', reason: `route:${executionRoute}-complex`, confidence: 0.95 };
      // ... (outras rotas)
    }
  }

  // 3. Análise por conteúdo
  if (isCodeRelated(normalized)) {
    return { model: 'deepseek-v4-pro', reason: 'code-debug', confidence: 0.85 };
  }

  if (isDeepAnalysis(normalized)) {
    return { model: 'gpt-4o', reason: 'deep-analysis', confidence: 0.8 };
  }

  // ... (outras heurísticas)

  // 4. Padrão
  return { model: 'gpt-4o-mini', reason: 'default-general', confidence: 0.5 };
}
```

**Heurísticas de Detecção:**
```javascript
function isCodeRelated(normalized) {
  const codeKeywords = [
    'codigo', 'função', 'erro', 'debug', 'javascript', 'python', 'api', 'json',
    'git', 'npm', 'function', 'const', 'async', 'class', // ...
  ];
  return codeKeywords.some(keyword => normalized.includes(keyword));
}

function isDeepAnalysis(normalized) {
  const analysisKeywords = [
    'compare', 'analise', 'semelhanças', 'diferenças', 'convergência',
    'pontos em comum', 'versus', // ...
  ];
  const hasKeyword = analysisKeywords.some(keyword => normalized.includes(keyword));
  const wordCount = normalized.split(/\s+/).length;
  const hasMultipleEntities = normalized.split(/\s+e\s+/).length > 2;

  return hasKeyword || (wordCount > 50 && hasMultipleEntities);
}
```

### `js/chat.js` - Integração

**Linhas ~331-337:**
```javascript
// Model Router: Selecionar modelo mais adequado baseado em conteúdo e rota
let resolvedModel = selectedRuntimeModel;
if (!selectedRuntimeModel && typeof selectModelForMessage === 'function' && isModelRouterEnabled()) {
  const modelSelection = selectModelForMessage(content, { executionRoute });
  resolvedModel = modelSelection.model;
  if (typeof logModelSelection === 'function') {
    logModelSelection(content, modelSelection);
  }
}
```

**Substituição de `selectedRuntimeModel` por `resolvedModel`:**
```javascript
// Antes
const data = await callModelWithRetry({
  ...(selectedRuntimeModel ? { model: selectedRuntimeModel } : {}),
  messages: apiMessages,
  // ...
});

// Agora
const data = await callModelWithRetry({
  ...(resolvedModel ? { model: resolvedModel } : {}),
  messages: apiMessages,
  // ...
});
```

---

## 📈 Benefícios

### 1. **Eficiência de Custo**
- Perguntas simples usam modelos baratos (gpt-4o-mini)
- Perguntas complexas usam modelos caros (gpt-4o) apenas quando necessário

### 2. **Qualidade Otimizada**
- Código usa DeepSeek (especializado em raciocínio lógico)
- Comparações usam GPT-4o (raciocínio criativo)
- Resumos usam Claude Haiku (rápido e eficiente)

### 3. **Latência Reduzida**
- Tarefas simples (resumo, tradução) usam modelos rápidos
- Não gasta tempo com raciocínio profundo quando não é necessário

### 4. **Transparência**
- Logs estruturados mostram qual modelo foi escolhido e por quê
- Confiança da seleção permite futura interação com usuário

---

## ⚠️ Limitações

1. **Heurísticas simples:** Palavras-chave podem falhar para perguntas ambíguas
2. **Sem memória:** Não lembra seleções anteriores na conversa
3. **Português/Inglês apenas:** Outras línguas podem não funcionar
4. **Sem feedback do usuário:** Não aprende com erros de seleção

---

## 🔮 Melhorias Futuras

### 1. Aprendizado com Feedback
```javascript
// Permitir correção do usuário
"Esse modelo não foi adequado. Use GPT-4o em vez disso."
```

### 2. Histórico de Performance
```javascript
// Rastrear qual modelo teve melhor resultado
{
  "code-debug": { "deepseek-v4-pro": 0.92, "gpt-4o": 0.78 },
  "deep-analysis": { "gpt-4o": 0.95, "deepseek-v4-pro": 0.81 }
}
```

### 3. Seleção Híbrida
```javascript
// Usar múltiplos modelos para tarefas complexas
// 1. DeepSeek gera primeira resposta (raciocínio)
// 2. GPT-4o refina (criatividade)
// 3. Claude Haiku resume
```

### 4. Custo-Benefício Dinâmico
```bash
# Permitir ajuste de orçamento
WORION_MODEL_BUDGET=low   # Preferir modelos baratos
WORION_MODEL_BUDGET=high  # Preferir modelos caros
```

---

## ✅ Checklist de Validação

- [x] `js/model-router.js` criado com funções principais
- [x] Heurísticas implementadas para 5 categorias (código, análise, resumo, pesquisa, padrão)
- [x] Integração em `js/chat.js` (linhas ~331-337)
- [x] Substituição de `selectedRuntimeModel` por `resolvedModel` em todas as chamadas
- [x] `<script>` adicionado ao `index.html`
- [x] Configuração `WORION_MODEL_ROUTER_ENABLED` adicionada ao `.env.example`
- [x] Documentação completa em `docs/model-router.md`
- [ ] Teste com código: "Como corrigir esse erro?" → `deepseek-v4-pro`
- [ ] Teste com comparação: "Compare A e B" → `gpt-4o`
- [ ] Teste com resumo: "Resuma esse texto" → `claude-3-5-haiku`
- [ ] Teste com pesquisa: "Pesquise sobre X" → `deepseek-v4-pro`
- [ ] Verificar logs estruturados no console

---

**Versão:** 1.0  
**Data:** 2026-05-23  
**Documentação:** `docs/model-router.md`  
**Arquivo principal:** `js/model-router.js`
