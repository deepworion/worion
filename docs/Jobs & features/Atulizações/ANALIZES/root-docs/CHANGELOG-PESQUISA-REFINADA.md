# Changelog: Refinamento da Lógica de Pesquisa e Síntese

**Data:** 2026-05-23  
**Objetivo:** Melhorar a detecção de termos desconhecidos, tratamento de perguntas definicionais e integridade das comparações.

---

## 🎯 Resumo das Mudanças

### 1. Detecção de Perguntas Definicionais
**Arquivo:** `js/chat-routing.js`

#### Funções Adicionadas:
- **`isDefinitionQuestion(text)`**: Detecta perguntas do tipo "O que é X?", "O que significa Y?", "Explique Z"
- **`askForClarification(term)`**: Gera mensagem padronizada pedindo esclarecimento sobre termos desconhecidos

#### Novo Perfil de Execução:
```javascript
definition: {
  thinking: 'disabled',
  maxToolRounds: 0,
  tools: [],
  maxTokens: 4000,
  maxSearches: 0,
  maxFetches: 0,
  synthesisRequired: true,
  askForClarificationIfUnknown: true
}
```

**Comportamento:**
- Perguntas definicionais não acionam Brave/Tavily
- Resposta baseada em conhecimento geral do modelo
- Se termo for desconhecido ou ambíguo, solicita esclarecimento ao usuário
- Explica siglas e acrônimos técnicos (ex: LLM → Large Language Model)

---

### 2. Verificação de Relevância de Tópicos
**Arquivo:** `js/chat-models.js`

#### Função Adicionada:
- **`verifyTopicRelevance(topic, results)`**: Verifica se os resultados de busca mencionam o termo pesquisado

**Lógica:**
1. Normaliza o tópico (remove acentos, lowercase)
2. Extrai termos principais (palavras com 4+ caracteres)
3. Verifica se pelo menos um resultado menciona algum termo no título ou snippet
4. Retorna `true` apenas se houver correspondência real

**Integração:**
- Aplicada tanto para Brave Search quanto Tavily Search
- Resultados irrelevantes são marcados como `brave-irrelevant` ou `tavily-irrelevant`
- Evita que resultados genéricos sejam considerados como cobertura válida

---

### 3. Mensagens de Esclarecimento Detalhadas
**Arquivo:** `js/chat-models.js` (função `runDeterministicResearchRoute`)

#### Antes:
```
Consultei as fontes disponíveis (Brave e Tavily), mas não encontrei 
material confiável suficiente para responder com segurança.

Tópicos sem fontes encontradas:
- Helena bravatisk
- Bashar
- Jan Val Ellam

Por favor, reformule a pergunta ou forneça mais contexto.
```

#### Agora:
```
Consultei as fontes disponíveis (Brave e Tavily), mas não encontrei 
material confiável suficiente para responder com segurança.

**Termos sem resultados encontrados:**
- "Helena bravatisk" → Por favor, verifique a grafia ou forneça mais 
  contexto sobre este termo.

**Termos com resultados não relacionados:**
- "Bashar" → Os resultados encontrados não parecem relacionados. 
  Poderia especificar melhor o que procura?

Por favor, reformule a pergunta ou forneça mais detalhes sobre o que 
está procurando.
```

---

### 4. Síntese Comparativa Melhorada
**Arquivo:** `js/chat-models.js` (mensagem de síntese em `runDeterministicResearchRoute`)

#### Alerta de Lacunas Aprimorado:
```
ALERTA DE LACUNAS: Os seguintes tópicos não tiveram fontes confiáveis encontradas:
- "Helena bravatisk": Nenhum resultado encontrado (termo pode estar incorreto 
  ou ser muito específico)
- "Bashar": Resultados encontrados mas não relacionados ao termo

INSTRUÇÕES CRÍTICAS:
1. Para cada tópico com lacuna, informe explicitamente ao usuário que não há 
   fontes confiáveis.
2. Sugira verificar a grafia ou fornecer mais contexto sobre termos desconhecidos.
3. NÃO especule, invente ou compare tópicos sem material suficiente.
4. Como esta é uma pesquisa comparativa, APENAS compare os tópicos que têm material. 
   Não force comparações sem dados.
```

**Benefícios:**
- Diferencia entre "termo desconhecido" e "resultados irrelevantes"
- Fornece sugestões específicas para cada tipo de problema
- Impede síntese comparativa forçada quando faltam dados

---

### 5. Tratamento de Perguntas Definicionais no Chat
**Arquivo:** `js/chat.js`

#### Novo Bloco de Execução:
```javascript
else if (executionRoute === 'definition') {
  console.log('[EXECUTION ROUTER] definition question - explaining concept without search');
  const definitionSystemPrompt = [
    systemPrompt,
    '',
    'Esta é uma pergunta conceitual/definitional. Forneça uma explicação didática 
     baseada no conhecimento geral.',
    'Se o termo for ambíguo ou desconhecido, peça esclarecimentos ao usuário.',
    'Se o termo envolver siglas ou acrônimos técnicos (ex: LLM, API, etc), explique 
     primeiro o significado e depois ofereça contexto.',
    'Seja conciso mas informativo. Não invente informações - se não souber, admita 
     e peça mais contexto.'
  ].join('\n');
  
  // ... chamada ao modelo sem tools
}
```

---

## 📊 Impacto nas Rotas de Execução

| Rota | Antes | Agora |
|------|-------|-------|
| `direct_answer` | Sem pesquisa | Sem pesquisa |
| `opinion` | Sem pesquisa | Sem pesquisa |
| **`definition`** | *Não existia* | **Sem pesquisa, explicação didática** |
| `focused_research` | Brave → Tavily | Brave (c/ verificação) → Tavily (c/ verificação) |
| `comparative_research` | Multi-eixo sem validação | Multi-eixo + verificação de relevância + alerta de lacunas |
| `deep_research` | Pesquisa profunda | Pesquisa profunda + verificação |

---

## 🧪 Casos de Teste Sugeridos

### Teste 1: Termo com Grafia Incorreta
**Input:** "Pesquise sobre Helena bravatisk"

**Esperado:**
```
Consultei as fontes disponíveis, mas não encontrei material confiável.

**Termos sem resultados encontrados:**
- "Helena bravatisk" → Por favor, verifique a grafia ou forneça mais contexto.
```

**Ação do Usuário:** Corrigir para "Helena Blavatsky"

---

### Teste 2: Pergunta Definitional
**Input:** "O que é Java LLM?"

**Esperado:**
- Não aciona Brave/Tavily
- Explica que LLM significa "Large Language Model"
- Explica que "Java LLM" refere-se à integração de LLMs em aplicações Java
- Pergunta se o usuário queria outro significado

---

### Teste 3: Comparação com Lacunas
**Input:** "Pesquise sobre Helena Blavatsky, Bashar, Jan Val Ellam, e verifique o que todos têm em comum."

**Esperado:**
1. **Helena Blavatsky**: Fontes encontradas → síntese incluída
2. **Bashar**: Resultados irrelevantes → alerta ao usuário
3. **Jan Val Ellam**: Fontes encontradas → síntese incluída

**Síntese:**
- Compara apenas Blavatsky e Ellam (que têm material)
- Informa explicitamente que "Bashar" não teve fontes confiáveis
- Não inventa comparações sem dados

---

## 📝 Funções Documentadas

### `chat-routing.js`
- ✅ `isDefinitionQuestion(text)` → Detecta perguntas definicionais
- ✅ `askForClarification(term)` → Gera mensagem de esclarecimento
- ✅ `isOpinionQuestion(text)` → Detecta perguntas de opinião (já existia)

### `chat-models.js`
- ✅ `verifyTopicRelevance(topic, results)` → Valida relevância de resultados
- ✅ `runDeterministicResearchRoute()` → Atualizada com verificação de relevância

### `chat.js`
- ✅ Tratamento de `executionRoute === 'definition'` → Resposta sem pesquisa

---

## 🔧 Manutenção Futura

### Melhorias Possíveis:
1. **Cache de Esclarecimentos**: Lembrar correções de grafia do usuário
2. **Sugestões Automáticas**: "Você quis dizer 'Blavatsky'?"
3. **Detecção de Siglas**: Reconhecer automaticamente padrões de siglas (ex: "LLM", "API")
4. **Métricas de Relevância**: Ajustar threshold de relevância com base em feedback do usuário

### Pontos de Atenção:
- A função `verifyTopicRelevance` usa caracteres Unicode normalizados (`[̀-ͯ]`) — garantir compatibilidade com diferentes encodings
- O perfil `definition` não aciona pesquisa — se o modelo não souber, deve pedir esclarecimento, não especular
- Mensagens de lacuna devem ser concisas mas informativas — evitar redundância

---

## ✅ Checklist de Validação

- [x] `isDefinitionQuestion()` implementada em `chat-routing.js`
- [x] `askForClarification()` implementada em `chat-routing.js`
- [x] Perfil `definition` adicionado a `EXECUTION_PROFILES`
- [x] Tratamento de `executionRoute === 'definition'` em `chat.js`
- [x] `verifyTopicRelevance()` implementada em `chat-models.js`
- [x] Verificação de relevância integrada em Brave Search
- [x] Verificação de relevância integrada em Tavily Search
- [x] Mensagens de lacuna detalhadas (termo desconhecido vs irrelevante)
- [x] Alerta de lacunas na síntese comparativa atualizado
- [x] Documentação adicionada nos cabeçalhos dos arquivos
- [ ] Teste com "Helena bravatisk" → verificar mensagem de esclarecimento
- [ ] Teste com "O que é Java LLM?" → verificar resposta sem pesquisa
- [ ] Teste com comparação parcial → verificar síntese apenas de tópicos com material

---

**Conclusão:** As modificações implementam um sistema de pesquisa mais inteligente que detecta lacunas de conhecimento, pede esclarecimentos ao usuário e preserva a integridade das comparações evitando sínteses forçadas sem dados suficientes.
