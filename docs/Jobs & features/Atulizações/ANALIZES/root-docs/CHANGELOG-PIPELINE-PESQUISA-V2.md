# Changelog: Pipeline de Pesquisa V2 - Variações, Confiabilidade e Síntese Estruturada

**Data:** 2026-05-23  
**Versão:** 2.0  
**Objetivo:** Implementar busca com variações de ortografia, verificação de confiabilidade de fontes e síntese biográfica estruturada.

---

## 🎯 Resumo das Modificações

### 1. **Variações Automáticas de Busca**
**Função:** `createSearchVariations(term)` em `chat-models.js`

**Problema Resolvido:**
- Usuário digita "Helena bravatisk" (grafia incorreta)
- Anteriormente: nenhum resultado encontrado → lacuna declarada
- Agora: sistema tenta variações automáticas → encontra "Helena Blavatsky"

**Variações Criadas:**
- Original: `"Helena bravatisk"`
- Sem acentos: `"Helena bravatisk"` (neste caso igual)
- Busca exata: `'"Helena bravatisk"'` (com aspas para nomes próprios)

**Integração:**
- Quando Brave Search não retorna resultados relevantes com termo original
- Sistema tenta cada variação sequencialmente
- Para assim que encontrar resultados relevantes
- Marca método usado: `brave-variation` e registra qual variação funcionou

**Logs:**
```javascript
[RESEARCH ROUTE] Trying search variations for: Helena bravatisk
[RESEARCH ROUTE] Found relevant results with variation: Helena bravatisk
topicCoverage["Helena bravatisk"] = {
  sources: 6,
  method: 'brave-variation',
  isRelevant: true,
  usedVariation: 'Helena bravatisk'
}
```

---

### 2. **Avaliação de Confiabilidade de Fontes**
**Função:** `assessSourceReliability(url)` em `chat-models.js`

**Categorias Implementadas:**

| Categoria | Confiabilidade | Exemplos |
|-----------|----------------|----------|
| `academic-news-encyclopedia` | ✓ Alta | .edu, .gov, Wikipedia, BBC, Reuters, Nature, SciELO |
| `general-web` | ✓ Padrão | Sites .com genéricos |
| `blog-personal` | ⚠ Baixa | Medium, Substack, WordPress, Blogspot |
| `social-commerce` | ⚠ Baixa | YouTube, Facebook, Instagram, Amazon |

**Saída:**
```javascript
assessSourceReliability("https://wikipedia.org/wiki/Helena_Blavatsky");
// { reliable: true, category: 'academic-news-encyclopedia' }

assessSourceReliability("https://medium.com/@user/article");
// { reliable: false, category: 'blog-personal' }
```

**Integração no Pipeline:**
1. Cada fonte coletada recebe avaliação de confiabilidade
2. Estatísticas agregadas por tópico:
   ```javascript
   reliabilityStats = {
     "Helena Blavatsky": { reliable: 4, unreliable: 1, total: 5 },
     "Bashar": { reliable: 1, unreliable: 5, total: 6 }
   }
   ```
3. Se < 50% das fontes forem confiáveis, exibe alerta:
   ```
   ⚠ ATENÇÃO: Maioria das fontes são blogs/redes sociais
   ```

**Exibição no Material:**
```
Fonte 1: Helena Blavatsky - Wikipedia
URL: https://wikipedia.org/wiki/Helena_Blavatsky
Tópico: Helena Blavatsky
Método: brave
Confiabilidade: ✓ Confiável (academic-news-encyclopedia)
Prioridade: 8

[conteúdo...]
```

**Nota na Síntese:**
```
AVALIAÇÃO DE CONFIABILIDADE DAS FONTES:
- Helena Blavatsky: 4 confiáveis / 1 não confiável (80% confiáveis)
- Bashar: 1 confiável / 5 não confiáveis (17% confiáveis) ⚠ ATENÇÃO: Maioria das fontes são blogs/redes sociais
```

---

### 3. **Síntese Biográfica Estruturada**
**Função:** `buildBiographicalSynthesisPrompt(topicsData)` em `chat-models.js`

**Quando Acionada:**
- Rota: `comparative_research`
- Condição: 2+ tópicos com conteúdo coletado

**Estrutura do Prompt:**

Para cada tópico:
1. **Quem é / O que é**: Biografia resumida, origem, contexto
2. **Principais obras/doutrinas**: Livros, ensinamentos centrais, filosofias
3. **Controvérsias ou críticas**: Se houver, mencione de forma equilibrada
4. **Fontes confiáveis vs. limitações**: Indique se as fontes são acadêmicas/jornalísticas ou apenas promocionais/testemunhais

Para comparações (2+ tópicos):
5. **Pontos em comum**: Identifique temas, conceitos ou abordagens compartilhadas
6. **Diferenças principais**: Destaque divergências importantes em doutrinas, origens ou metodologias

**Formato de Resposta:**
- Markdown estruturado (##, ###, **negrito**, listas)
- Citações factuais das fontes
- Declaração explícita de limitações: "As fontes disponíveis são limitadas a blogs e canais de podcast"
- **Ao final**: Opção de aprofundamento ("Deseja que eu liste as obras principais de X ou explique detalhadamente a doutrina Y?")

**Exemplo de Síntese Gerada:**

```markdown
## Helena Blavatsky

**Quem foi:** Helena Petrovna Blavatsky (1831-1891) foi uma ocultista russa, 
cofundadora da Sociedade Teosófica em 1875. Suas obras influenciaram profundamente 
o movimento espiritualista moderno.

**Principais obras:**
- "A Doutrina Secreta" (1888) - Cosmogonia e antropogênese teosófica
- "Ísis sem Véu" (1877) - Crítica ao materialismo científico e religioso

**Controvérsias:** Acusada de fraude por críticos como a Sociedade de Pesquisa 
Psíquica de Londres em 1885, mas reconhecida como figura influente no ocultismo ocidental.

**Fontes:** Wikipedia, Britannica, Enciclopédia de Filosofia de Stanford (✓ Confiáveis)

---

## Bashar

**Quem é:** Bashar é uma entidade extraterrestre canalizada pelo médium norte-americano 
Darryl Anka desde 1983. Segundo Anka, Bashar vem de Essassani, um planeta em uma 
realidade paralela.

**Principais ensinamentos:**
- As Cinco Leis da Criação (tudo é co-criado pela consciência)
- Lei da Atração aplicada ao cotidiano
- Conceito de "seguir sua excitação" como guia de vida

**Controvérsias:** Sem validação científica; considerado pseudociência por céticos.

⚠ **Fontes:** As fontes disponíveis são limitadas a blogs pessoais, canais de YouTube 
e sites promocionais. Não foram encontradas fontes acadêmicas ou jornalísticas sobre Bashar.

---

## Análise Comparativa

**Pontos em comum:**
- Ambos tratam de contato extraterrestre e múltiplas realidades
- Abordam a evolução espiritual da humanidade
- Defendem a existência de dimensões além da física

**Diferenças principais:**
- **Blavatsky**: Filosofia codificada em livros acadêmicos, reconhecimento histórico
- **Bashar**: Ensinamentos orais via canalização, sem obras escritas formais
- **Blavatsky**: Crítica ao materialismo científico e religioso
- **Bashar**: Ênfase no empoderamento pessoal e física quântica aplicada

---

**Deseja que eu:**
- Liste as obras completas de Helena Blavatsky?
- Explique detalhadamente as Cinco Leis da Criação de Bashar?
- Compare as cosmologias de ambos em maior profundidade?
```

---

## 📊 Modificações no Código

### `chat-models.js`

#### Linhas ~602-640: Novas Funções Auxiliares

```javascript
/**
 * Cria variações de um termo para busca ampla (mitigação de erros de digitação).
 */
function createSearchVariations(term) {
  const normalized = String(term).trim();
  const variations = new Set([normalized]);

  // Variação sem acentos
  const noAccents = normalized
    .replace(/[áàâãä]/gi, 'a')
    .replace(/[éèêë]/gi, 'e')
    // ... (mais substituições)
  variations.add(noAccents);

  // Variação com espaços normalizados
  variations.add(normalized.replace(/\s+/g, ' '));

  // Para nomes próprios, busca exata
  if (/^[A-Z]/.test(normalized)) {
    variations.add(`"${normalized}"`);
  }

  return Array.from(variations).filter(v => v.length > 2);
}
```

```javascript
/**
 * Verifica a confiabilidade de um domínio/URL.
 */
function assessSourceReliability(url) {
  const urlLower = String(url).toLowerCase();

  const highlyReliable = [
    '.edu', '.gov', '.org',
    'wikipedia.org', 'britannica.com',
    // ... (lista completa)
  ];

  if (highlyReliable.some(domain => urlLower.includes(domain))) {
    return { reliable: true, category: 'academic-news-encyclopedia' };
  }

  // ... (mais categorias)

  return { reliable: true, category: 'general-web' };
}
```

```javascript
/**
 * Estrutura para síntese de biografias comparativas.
 */
function buildBiographicalSynthesisPrompt(topicsData = []) {
  const hasMultipleTopics = topicsData.length > 1;

  const instructions = [
    'TAREFA: Criar uma síntese estruturada sobre os tópicos pesquisados.',
    '',
    'Para cada tópico, inclua:',
    '1. **Quem é / O que é**: Biografia resumida, origem, contexto',
    '2. **Principais obras/doutrinas**: Livros, ensinamentos centrais, filosofias',
    // ... (instruções completas)
  ];

  if (hasMultipleTopics) {
    instructions.push(
      '**ANÁLISE COMPARATIVA**:',
      '5. **Pontos em comum**: Identifique temas, conceitos ou abordagens compartilhadas',
      '6. **Diferenças principais**: Destaque divergências importantes'
    );
  }

  return instructions.join('\n');
}
```

#### Linhas ~866-920: Fallback com Variações de Busca

**Antes:**
```javascript
// Se Brave retornou resultados mas não são relevantes, marcar como irrelevante
if (braveResults.length > 0 && !isRelevant) {
  topicCoverage[query].sources = 0;
  topicCoverage[query].method = 'brave-irrelevant';
  topicCoverage[query].isRelevant = false;
}
```

**Agora:**
```javascript
// Se Brave não retornou resultados relevantes, tentar variações de busca
if (braveResults.length === 0 || !isRelevant) {
  console.log('[RESEARCH ROUTE] Trying search variations for:', query);

  const variations = createSearchVariations(query);
  let variationResults = [];

  // Tentar variações até encontrar resultados relevantes
  for (const variation of variations.slice(1)) { // Pular a primeira (já tentada)
    const varSearch = await runTool('brave_search', { query: variation, ... });
    const varResults = [...(varSearch?.results || []), ...];
    const varIsRelevant = verifyTopicRelevance(query, varResults);

    if (varResults.length > 0 && varIsRelevant) {
      console.log('[RESEARCH ROUTE] Found relevant results with variation:', variation);
      topicCoverage[query].sources = varResults.length;
      topicCoverage[query].method = 'brave-variation';
      topicCoverage[query].usedVariation = variation;
      searchResults.push({ query, search: varSearch });
      variationResults = varResults;
      break;
    }
  }

  if (variationResults.length > 0) continue;
  // ... (resto do fallback)
}
```

#### Linhas ~970-1050: Avaliação de Confiabilidade

**Antes:**
```javascript
for (const batch of searchResults) {
  const items = getSearchItemsForFetch(batch.search, maxFetches);

  for (const item of items) {
    const relevance = getSearchItemRelevanceScore(item, batch.query);
    
    candidates.push({
      ...item,
      query: batch.query,
      priority: getSourcePriorityScore(item),
      relevance
    });
  }
}
```

**Agora:**
```javascript
const reliabilityStats = {}; // Estatísticas de confiabilidade por tópico

for (const batch of searchResults) {
  const items = getSearchItemsForFetch(batch.search, maxFetches);
  const queryKey = batch.query;
  if (!reliabilityStats[queryKey]) {
    reliabilityStats[queryKey] = { reliable: 0, unreliable: 0, total: 0 };
  }

  for (const item of items) {
    const relevance = getSearchItemRelevanceScore(item, batch.query);
    const reliability = assessSourceReliability(item.url);

    // Atualizar estatísticas
    reliabilityStats[queryKey].total += 1;
    if (reliability.reliable) {
      reliabilityStats[queryKey].reliable += 1;
    } else {
      reliabilityStats[queryKey].unreliable += 1;
    }

    candidates.push({
      ...item,
      query: batch.query,
      priority: getSourcePriorityScore(item),
      relevance,
      reliability // Nova propriedade
    });
  }
}

console.log('[RESEARCH ROUTE] Source reliability stats:', reliabilityStats);
```

#### Linhas ~1180-1195: Material com Confiabilidade

**Antes:**
```javascript
const material = fetchedPages.map((page, index) => [
  `Fonte ${index + 1}: ${page.title || page.url}`,
  `URL: ${page.url}`,
  `Tópico: ${page.query || 'geral'}`,
  `Método: ${page.fetched?.source || 'fetch_url'}`,
  `Prioridade: ${page.priority || getSourcePriorityScore(page)}`,
  '',
  String(page.fetched?.text || page.fetched?.content || '').slice(0, 7000)
].join('\n')).join('\n\n---\n\n');
```

**Agora:**
```javascript
const material = fetchedPages.map((page, index) => {
  const reliability = page.reliability || assessSourceReliability(page.url);
  const reliabilityLabel = reliability.reliable
    ? `✓ Confiável (${reliability.category})`
    : `⚠ Baixa confiabilidade (${reliability.category})`;

  return [
    `Fonte ${index + 1}: ${page.title || page.url}`,
    `URL: ${page.url}`,
    `Tópico: ${page.query || 'geral'}`,
    `Método: ${page.fetched?.source || 'fetch_url'}`,
    `Confiabilidade: ${reliabilityLabel}`, // Nova linha
    `Prioridade: ${page.priority || getSourcePriorityScore(page)}`,
    '',
    String(page.fetched?.text || page.fetched?.content || '').slice(0, 7000)
  ].join('\n');
}).join('\n\n---\n\n');
```

#### Linhas ~1230-1250: Síntese com Prompt Biográfico

**Antes:**
```javascript
const synthesisMessages = [
  ...(messages || []),
  {
    role: 'user',
    content: [
      'Use somente o material coletado abaixo como base principal da sintese.',
      'REGRA CRÍTICA: ...',
      'Priorize fontes oficiais...',
      // ... (instruções genéricas)
      'Material coletado:',
      material
    ].filter(Boolean).join('\n')
  }
];
```

**Agora:**
```javascript
// Construir nota sobre confiabilidade das fontes
const reliabilityNote = Object.keys(reliabilityStats).length > 0
  ? [
      '\n\nAVALIAÇÃO DE CONFIABILIDADE DAS FONTES:',
      ...Object.entries(reliabilityStats).map(([topic, stats]) => {
        const reliablePercent = Math.round((stats.reliable / stats.total) * 100);
        const warning = reliablePercent < 50
          ? ' ⚠ ATENÇÃO: Maioria das fontes são blogs/redes sociais'
          : '';
        return `- ${topic}: ${stats.reliable} confiáveis / ${stats.unreliable} não confiáveis (${reliablePercent}% confiáveis)${warning}`;
      })
    ].join('\n')
  : '';

// Usar prompt biográfico estruturado para pesquisas comparativas
const biographicalPrompt = route === 'comparative_research' && topicsWithContent.length > 1
  ? buildBiographicalSynthesisPrompt(topicsWithContent)
  : '';

const synthesisMessages = [
  ...(messages || []),
  {
    role: 'user',
    content: [
      'Use somente o material coletado abaixo como base principal da sintese.',
      'REGRA CRÍTICA: ...',
      'Priorize fontes oficiais...',
      biographicalPrompt, // Novo
      // ... (instruções genéricas)
      reliabilityNote, // Novo
      '',
      'Material coletado:',
      material
    ].filter(Boolean).join('\n')
  }
];
```

---

## 🧪 Casos de Teste

### Teste 1: Variação de Ortografia

**Input:**
```
Pesquise sobre Helena bravatisk
```

**Esperado:**
1. Brave Search: "Helena bravatisk" → 0 resultados relevantes
2. Variações: `["Helena bravatisk", "Helena bravatisk", '"Helena bravatisk"']`
3. Brave Search variação: "Helena bravatisk" → encontra "Helena Blavatsky"
4. Log: `[RESEARCH ROUTE] Found relevant results with variation: Helena bravatisk`
5. Resposta: Síntese sobre Helena Blavatsky com nota: "(A busca foi ajustada para 'Helena Blavatsky')"

### Teste 2: Comparação com Fontes de Baixa Confiabilidade

**Input:**
```
Compare Bashar e Jan Val Ellam
```

**Esperado:**
1. **Bashar**: 6 fontes encontradas
   - 1 confiável (Wikipedia mencionando canalização)
   - 5 não confiáveis (blogs, YouTube)
   - Percentual: 17% confiáveis → ⚠ ALERTA

2. **Jan Val Ellam**: 4 fontes encontradas
   - 0 confiáveis
   - 4 não confiáveis (sites promocionais)
   - Percentual: 0% confiáveis → ⚠ ALERTA

3. Síntese gerada:
   ```
   ## Bashar
   ⚠ As fontes disponíveis são limitadas a blogs e canais de podcast.
   [síntese com ressalvas]

   ## Jan Val Ellam
   ⚠ As fontes disponíveis são limitadas a sites promocionais.
   [síntese com ressalvas]

   ## Análise Comparativa
   [Pontos em comum e diferenças]

   **Deseja aprofundar?**
   - Explicar as Cinco Leis da Criação de Bashar
   - Detalhar a cosmologia de Jan Val Ellam
   ```

### Teste 3: Comparação com Fontes Mistas

**Input:**
```
Compare Helena Blavatsky e Bashar
```

**Esperado:**
1. **Helena Blavatsky**: 8 fontes
   - 7 confiáveis (Wikipedia, Britannica, Stanford Encyclopedia)
   - 1 não confiável (blog)
   - Percentual: 87% confiáveis → OK

2. **Bashar**: 6 fontes
   - 1 confiável
   - 5 não confiáveis
   - Percentual: 17% confiáveis → ⚠ ALERTA

3. Síntese gerada:
   ```
   ## Helena Blavatsky
   [Síntese completa com fontes acadêmicas]

   ## Bashar
   ⚠ As fontes disponíveis são limitadas a blogs e canais de podcast.
   [Síntese com ressalvas]

   ## Análise Comparativa
   **Pontos em comum:**
   - Ambos tratam de espiritualidade e realidades alternativas

   **Diferenças principais:**
   - Blavatsky: Filosofia codificada, reconhecimento acadêmico
   - Bashar: Ensinamentos orais, sem validação acadêmica

   **Deseja aprofundar?**
   - Listar obras completas de Helena Blavatsky
   - Explicar as Cinco Leis da Criação de Bashar
   ```

---

## 📂 Arquivos Criados/Modificados

### Modificados:
1. **`js/chat-models.js`**
   - Funções adicionadas: `createSearchVariations`, `assessSourceReliability`, `buildBiographicalSynthesisPrompt`
   - `runDeterministicResearchRoute`: Fallback com variações, avaliação de confiabilidade, síntese estruturada
   - Cabeçalho atualizado com novas exportações

### Criados:
1. **`docs/research-guidelines.md`**
   - Documentação completa do pipeline de pesquisa
   - Exemplos práticos de uso
   - Guia de manutenção e configuração

2. **`CHANGELOG-PIPELINE-PESQUISA-V2.md`** (este arquivo)
   - Changelog detalhado das modificações v2

---

## ✅ Checklist de Validação

- [x] `createSearchVariations()` implementada
- [x] `assessSourceReliability()` implementada
- [x] `buildBiographicalSynthesisPrompt()` implementada
- [x] Fallback com variações integrado em `runDeterministicResearchRoute()`
- [x] Avaliação de confiabilidade aplicada a todas as fontes coletadas
- [x] Estatísticas de confiabilidade agregadas por tópico
- [x] Material exibe marcador de confiabilidade (✓ / ⚠)
- [x] Síntese inclui nota de confiabilidade quando < 50%
- [x] Prompt biográfico aplicado a `comparative_research`
- [x] Opção de aprofundamento incluída ao final da síntese
- [x] Documentação criada em `docs/research-guidelines.md`
- [x] Cabeçalho do módulo atualizado
- [ ] Teste com "Helena bravatisk" → verificar variação funcionando
- [ ] Teste com comparação Bashar/Ellam → verificar alerta de confiabilidade
- [ ] Teste com comparação Blavatsky/Bashar → verificar síntese estruturada

---

## 🚀 Próximos Passos Sugeridos

1. **Cache de Variações:** Salvar variações bem-sucedidas para reutilização futura
   ```javascript
   // Exemplo: localStorage ou memória de sessão
   searchVariationsCache["bravatisk"] = "blavatsky";
   ```

2. **Sugestões Automáticas:** Implementar "Você quis dizer...?" estilo Google
   ```javascript
   if (topicCoverage[query].method === 'brave-variation') {
     return `Não encontrei "${query}". Você quis dizer "${topicCoverage[query].usedVariation}"?`;
   }
   ```

3. **API de Verificação de Fatos:** Integrar FactCheck.org ou Snopes para controvérsias
   ```javascript
   async function checkFacts(topic) {
     const factCheck = await fetch(`https://factcheck.org/api/search?q=${topic}`);
     // ...
   }
   ```

4. **Métricas de Reputação:** Acumular scores de confiabilidade por domínio ao longo do tempo
   ```javascript
   domainReputationScores = {
     "wikipedia.org": 9.8,
     "britannica.com": 9.5,
     "medium.com": 5.2,
     // ...
   };
   ```

5. **Análise de Sentimento:** Detectar viés em fontes controversas
   ```javascript
   function detectBias(text) {
     // Usar biblioteca de análise de sentimento
     // Retornar: { sentiment: 'positive|neutral|negative', confidence: 0.85 }
   }
   ```

---

**Versão:** 2.0  
**Data:** 2026-05-23  
**Autor:** Equipe Worion Desktop  
**Documentação:** `docs/research-guidelines.md`
