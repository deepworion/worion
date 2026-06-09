# Model Router - Seleção Inteligente de Modelos

**Versão:** 1.0  
**Data:** 2026-05-23  
**Arquivo:** `js/model-router.js`

---

## 📋 Visão Geral

O Model Router é um sistema de seleção automática de modelos de linguagem baseado em heurísticas de conteúdo e rotas de execução. Ele analisa a mensagem do usuário e escolhe o modelo mais adequado (GPT-4o, GPT-4o-mini, DeepSeek-v4-pro, Claude Haiku) para maximizar qualidade e eficiência.

---

## 🎯 Objetivo

**Problema:** Usar sempre o mesmo modelo (ex: DeepSeek) para todas as tarefas é ineficiente:
- Perguntas simples ("oi", "obrigado") não precisam de raciocínio profundo
- Código requer raciocínio lógico (DeepSeek é melhor)
- Comparações complexas requerem raciocínio criativo (GPT-4o é melhor)
- Resumos precisam apenas de velocidade (Claude Haiku é mais rápido)

**Solução:** Selecionar automaticamente o modelo mais adequado para cada tipo de pergunta.

---

## 🔧 Configuração

### 1. Habilitar o Model Router

Edite o arquivo `.env` (ou `.env.local`):

```bash
WORION_MODEL_ROUTER_ENABLED=true
```

### 2. Reiniciar o Aplicativo

```bash
npm start
```

### 3. Verificar no Console

O Model Router exibe logs estruturados:

```
[MODEL ROUTER] {
  selected: 'deepseek-v4-pro',
  reason: 'code-debug',
  confidence: 0.85,
  provider: 'deepseek',
  specialty: 'reasoning-code',
  message: 'Como faço para corrigir esse erro no JavaScript?'
}
```

---

## 🧠 Lógica de Seleção

### Prioridade 1: Rota de Execução

Se a rota de execução é conhecida (determinada por `chat-routing.js`), ela tem prioridade:

| Rota | Modelo Selecionado | Razão |
|------|-------------------|-------|
| `silence` | `gpt-4o-mini` | Resposta leve para silêncio |
| `opinion` | `gpt-4o-mini` | Opinião não requer raciocínio profundo |
| `definition` | `gpt-4o-mini` | Definição simples |
| `direct_answer` | `gpt-4o-mini` | Resposta direta |
| `focused_research` | `deepseek-v4-pro` | Raciocínio + síntese |
| `source_check` | `deepseek-v4-pro` | Verificação de fontes |
| `comparative_research` | `gpt-4o` | Análise comparativa complexa |
| `deep_research` | `gpt-4o` | Pesquisa profunda |
| `code` | `deepseek-v4-pro` | Código e debug |
| `internal_diagnostic` | `deepseek-v4-pro` | Diagnóstico técnico |

### Prioridade 2: Análise de Conteúdo (Heurísticas)

Se a rota não for determinada ou for genérica, o sistema analisa palavras-chave:

#### 1️⃣ **Silêncio** → `gpt-4o-mini`
```javascript
// Detecção
isSilence(message) → mensagem vazia, ".", "...", ou muito curta

// Exemplos
"."          → gpt-4o-mini
"..."        → gpt-4o-mini
"   "        → gpt-4o-mini
```

#### 2️⃣ **Código/Debug** → `deepseek-v4-pro`
```javascript
// Palavras-chave (PT + EN)
codigo, função, erro, debug, bug, javascript, python, api, json,
git, commit, npm, console, exception, stack trace,
function, const, let, var, async, await, class, return

// Exemplos
"Como faço para corrigir esse erro no JavaScript?"        → deepseek-v4-pro
"Escreva uma função que calcule fatorial"                 → deepseek-v4-pro
"Debug esse código Python"                                → deepseek-v4-pro
"Git merge conflict - como resolver?"                     → deepseek-v4-pro
```

#### 3️⃣ **Comparação/Análise Profunda** → `gpt-4o`
```javascript
// Palavras-chave (PT + EN)
compare, comparar, comparação, analise, análise,
semelhanças, diferenças, convergência, divergência,
pontos em comum, versus, vs., entre,
compare, comparison, analyze, similarities, differences

// Ou: mensagem longa (> 50 palavras) com múltiplas entidades (A e B e C)

// Exemplos
"Compare Helena Blavatsky e Bashar"                       → gpt-4o
"Analise as semelhanças entre Python e JavaScript"       → gpt-4o
"Quais são os pontos em comum entre A, B e C?"           → gpt-4o
```

#### 4️⃣ **Resumo/Tradução** → `claude-3-5-haiku`
```javascript
// Palavras-chave (PT + EN)
resuma, resumir, traduza, traduzir, organize, organizar,
simplifique, extraia, liste,
summarize, summary, tldr, translate, organize, extract, list

// Exemplos
"Resuma esse texto em 3 frases"                           → claude-3-5-haiku
"Traduza para inglês"                                     → claude-3-5-haiku
"Liste os pontos principais"                              → claude-3-5-haiku
"TLDR?"                                                   → claude-3-5-haiku
```

#### 5️⃣ **Pesquisa Factual** → `deepseek-v4-pro`
```javascript
// Palavras-chave (PT + EN)
pesquise, busque, procure, encontre, me conte, me fale,
quem é, o que é, quando, onde, como, por que, fonte,
research, search, find, who is, what is, source

// Exemplos
"Pesquise sobre Helena Blavatsky"                         → deepseek-v4-pro
"Quem é Jan Val Ellam?"                                   → deepseek-v4-pro
"Me conte sobre a história da Teosofia"                   → deepseek-v4-pro
```

#### 6️⃣ **Padrão** → `gpt-4o-mini`
```javascript
// Tudo que não se enquadra nas categorias acima

// Exemplos
"Bom dia!"                                                → gpt-4o-mini
"Obrigado pela ajuda"                                     → gpt-4o-mini
"Estou com uma dúvida sobre..."                          → gpt-4o-mini
```

---

## 📊 Modelos Disponíveis

| Modelo | Provider | Contexto | Custo | Especialidade |
|--------|----------|----------|-------|---------------|
| `gpt-4o` | OpenAI | 128k | Alto | Raciocínio criativo e complexo |
| `gpt-4o-mini` | OpenAI | 128k | Baixo | Tarefas gerais |
| `deepseek-v4-pro` | DeepSeek | 128k | Médio | Raciocínio lógico e código |
| `claude-3-5-sonnet` | Anthropic | 200k | Alto | Análise criativa |
| `claude-3-5-haiku` | Anthropic | 200k | Baixo | Resumos rápidos |

---

## 📝 Exemplos Práticos

### Exemplo 1: Código

**Input:**
```
Como faço para corrigir esse erro no JavaScript?

TypeError: Cannot read property 'map' of undefined
  at App.js:15
```

**Model Router:**
```javascript
{
  selected: 'deepseek-v4-pro',
  reason: 'code-debug',
  confidence: 0.85,
  provider: 'deepseek',
  specialty: 'reasoning-code'
}
```

**Justificativa:** Contém "erro", "JavaScript" e stack trace → modelo especializado em código.

---

### Exemplo 2: Comparação

**Input:**
```
Compare Helena Blavatsky e Bashar. Quais são as semelhanças e diferenças?
```

**Model Router:**
```javascript
{
  selected: 'gpt-4o',
  reason: 'deep-analysis',
  confidence: 0.8,
  provider: 'openai',
  specialty: 'reasoning-creative'
}
```

**Justificativa:** Contém "compare" e "semelhanças" → raciocínio criativo complexo.

---

### Exemplo 3: Resumo

**Input:**
```
Resuma esse texto em 3 frases:

[texto longo...]
```

**Model Router:**
```javascript
{
  selected: 'claude-3-5-haiku',
  reason: 'summary-fast',
  confidence: 0.75,
  provider: 'anthropic',
  specialty: 'fast-summary'
}
```

**Justificativa:** Contém "resuma" → modelo rápido e eficiente.

---

### Exemplo 4: Pesquisa Factual

**Input:**
```
Pesquise sobre Helena Blavatsky e me conte quem ela foi
```

**Model Router:**
```javascript
{
  selected: 'deepseek-v4-pro',
  reason: 'research-reasoning',
  confidence: 0.7,
  provider: 'deepseek',
  specialty: 'reasoning-code'
}
```

**Justificativa:** Contém "pesquise" → raciocínio para síntese de informações.

---

### Exemplo 5: Rota de Execução Prioritária

**Input:**
```
Compare A e B
```

**Model Router (com rota `comparative_research`):**
```javascript
{
  selected: 'gpt-4o',
  reason: 'route:comparative_research-complex',
  confidence: 0.95,
  provider: 'openai',
  specialty: 'reasoning-creative'
}
```

**Justificativa:** Rota de execução tem prioridade sobre heurísticas de conteúdo.

---

## 🔍 Confiança da Seleção

O Model Router retorna um `confidence` (confiança) de 0.0 a 1.0:

| Confiança | Significado |
|-----------|-------------|
| 1.0 | Certeza absoluta (rota de execução ou silêncio) |
| 0.95 | Muito alta (rota de execução conhecida) |
| 0.85-0.9 | Alta (palavra-chave forte, ex: "código", "erro") |
| 0.7-0.8 | Média-alta (palavra-chave moderada, ex: "compare", "resuma") |
| 0.5-0.7 | Média-baixa (palavra-chave fraca, ex: "pesquise") |
| 0.5 | Padrão (nenhuma palavra-chave encontrada) |

**Uso futuro:** Pode ser usado para decidir se pede confirmação ao usuário antes de executar.

---

## 🛠️ API

### `selectModelForMessage(message, options)`

Seleciona o modelo mais adequado para a mensagem.

**Parâmetros:**
- `message` (string): Mensagem do usuário
- `options` (object): Opções adicionais
  - `executionRoute` (string): Rota de execução determinada (opcional)
  - `route` (string): Alias para `executionRoute`

**Retorno:**
```javascript
{
  model: string,      // Nome do modelo selecionado
  reason: string,     // Razão da seleção
  confidence: number  // Confiança (0.0 a 1.0)
}
```

**Exemplo:**
```javascript
const selection = selectModelForMessage("Compare A e B", { executionRoute: 'comparative_research' });
console.log(selection);
// { model: 'gpt-4o', reason: 'route:comparative_research-complex', confidence: 0.95 }
```

---

### `isModelRouterEnabled()`

Verifica se o Model Router está habilitado.

**Retorno:** `boolean`

**Exemplo:**
```javascript
if (isModelRouterEnabled()) {
  const selection = selectModelForMessage("Oi!");
  console.log(selection.model); // 'gpt-4o-mini'
}
```

---

### `getModelInfo(modelName)`

Retorna informações sobre um modelo específico.

**Parâmetro:**
- `modelName` (string): Nome do modelo

**Retorno:**
```javascript
{
  provider: string,   // 'openai' | 'deepseek' | 'anthropic'
  context: number,    // Tamanho do contexto (ex: 128000)
  cost: string,       // 'low' | 'medium' | 'high'
  specialty: string   // Especialidade do modelo
}
```

**Exemplo:**
```javascript
const info = getModelInfo('deepseek-v4-pro');
console.log(info);
// { provider: 'deepseek', context: 128000, cost: 'medium', specialty: 'reasoning-code' }
```

---

### `logModelSelection(message, selection)`

Exibe log estruturado da seleção de modelo.

**Parâmetros:**
- `message` (string): Mensagem do usuário
- `selection` (object): Resultado de `selectModelForMessage`

**Exemplo:**
```javascript
const selection = selectModelForMessage("Debug esse código");
logModelSelection("Debug esse código", selection);
// [MODEL ROUTER] { selected: 'deepseek-v4-pro', reason: 'code-debug', ... }
```

---

## 📈 Métricas e Monitoramento

### Logs no Console

Todos os roteamentos são logados automaticamente:

```
[MODEL ROUTER] {
  selected: 'gpt-4o',
  reason: 'deep-analysis',
  confidence: 0.8,
  provider: 'openai',
  specialty: 'reasoning-creative',
  message: 'Compare Helena Blavatsky e Bashar. Quais são...'
}
```

### Análise de Uso

Para analisar quais modelos estão sendo mais usados:

1. Abra o DevTools (F12)
2. Execute no console:
```javascript
// Rastrear seleções
const selections = [];
const originalSelect = selectModelForMessage;
window.selectModelForMessage = function(message, options) {
  const result = originalSelect(message, options);
  selections.push(result);
  return result;
};

// Após várias mensagens, analisar
console.table(selections);
```

---

## 🔮 Melhorias Futuras

### 1. Aprendizado com Feedback

Permitir que o usuário corrija a seleção de modelo:

```javascript
"Esse modelo não foi adequado. Use GPT-4o em vez disso."
```

Sistema aprende e ajusta pesos das heurísticas.

### 2. Histórico de Performance

Rastrear qual modelo teve melhor performance para cada tipo de pergunta:

```javascript
{
  "code-debug": { "deepseek-v4-pro": 0.92, "gpt-4o": 0.78 },
  "deep-analysis": { "gpt-4o": 0.95, "deepseek-v4-pro": 0.81 }
}
```

### 3. Seleção Híbrida

Para perguntas complexas, usar múltiplos modelos:
- DeepSeek gera primeira resposta (raciocínio)
- GPT-4o refina e adiciona criatividade
- Claude Haiku resume

### 4. Custo-Benefício Dinâmico

Permitir que o usuário defina orçamento:

```bash
WORION_MODEL_BUDGET=low   # Preferir modelos baratos
WORION_MODEL_BUDGET=high  # Preferir modelos caros (melhor qualidade)
```

---

## ⚠️ Limitações Conhecidas

1. **Heurísticas simples:** Palavras-chave podem falhar para perguntas ambíguas
   - Solução futura: Usar LLM pequeno para classificar intenção

2. **Sem memória:** Não lembra seleções anteriores
   - Solução futura: Rastrear histórico de conversa

3. **Português/Inglês apenas:** Outras línguas podem não funcionar bem
   - Solução futura: Adicionar palavras-chave em mais idiomas

4. **Sem feedback do usuário:** Não aprende com erros
   - Solução futura: Permitir correção manual

---

## 📚 Referências

- **Arquivo principal:** `js/model-router.js`
- **Integração:** `js/chat.js` (linhas ~331-337)
- **Configuração:** `.env.example` (linha WORION_MODEL_ROUTER_ENABLED)
- **Rotas de execução:** `js/chat-routing.js` (EXECUTION_PROFILES)

---

**Versão:** 1.0  
**Data:** 2026-05-23  
**Mantido por:** Equipe Worion Desktop
