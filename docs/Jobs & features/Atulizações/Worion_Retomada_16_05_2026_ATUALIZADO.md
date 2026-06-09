# Worion — Checkpoint de Retomada

**Data do checkpoint:** 15/05/2026  
**Arquivo:** `Worion_Retomada_16_05_2026.md`  
**Objetivo:** registrar o que foi implementado hoje e indicar exatamente onde retomar amanhã.

---

## 1. Estado Geral

O Worion avançou de uma base modular com tools isoladas para o início de uma arquitetura mais robusta de memória, execução orientada a objetivos e recuperação de contexto.

O trabalho principal de hoje envolveu:

- migração correta das conversas do Claude para as tabelas centrais de memória no Supabase;
- correção da tool `supabase_select`;
- implementação das primeiras tools de memória operacional;
- início do Goal Execution Engine v2;
- criação de configuração global para execução;
- criação de logs internos;
- criação da tag de rollback `pre-goal-engine-v2`.

---

## 2. Migração das Conversas do Claude

Foi corrigido o `worion-importer.js` para salvar as conversas importadas do Claude nas tabelas corretas:

### Tabelas corretas

```text
memory_conversations
memory_chunks
```

### Resultado da importação

```json
{
  "totalConversations": 105,
  "totalChunks": 5786,
  "importedConversations": 105,
  "importedChunks": 5786,
  "failedBatches": 0,
  "finalCounts": {
    "memory_conversations_claude": 105,
    "memory_chunks_claude": 5786,
    "worion_memory_conversations_claude": 0
  }
}
```

### Observação importante

A tabela antiga `worion_memory_conversations` não deve mais ser usada para importações do Claude/GPT.

Ela continua existindo, mas o modelo correto para memórias importadas é:

```text
memory_conversations = uma linha por conversa
memory_chunks = uma linha por mensagem/chunk
```

---

## 3. Correção da Tool `supabase_select`

A tool `supabase_select` foi corrigida para consultar as tabelas centrais de memória.

### Agora aceita

```text
api_keys_vault_v2
memory_conversations
memory_chunks
worion_memory_conversations
```

### Novos filtros adicionados

```text
source_id
role
id_prefix
count
```

### Consulta validada

Para contar conversas do Claude:

```json
{
  "table": "memory_conversations",
  "source_id": "claude",
  "count": true
}
```

Resultado validado:

```text
105 conversas do Claude
```

Para contar chunks/mensagens do Claude:

```json
{
  "table": "memory_chunks",
  "source_id": "claude",
  "count": true
}
```

Resultado esperado:

```text
5786 chunks/mensagens
```

---

## 4. Prompt Atualizado

O `js/prompt.js` foi atualizado para orientar o Worion a usar as tabelas corretas:

```text
Para consultar conversas importadas do Claude/GPT na Supabase, use supabase_select nas tabelas memory_conversations e memory_chunks.
Para contar conversas do Claude, use table="memory_conversations", source_id="claude", count=true.
Não use worion_memory_conversations para importações Claude/GPT.
```

Depois, o prompt também recebeu instrução para uso do fluxo de memória:

```text
memory_search → memory_read_conversation → memory_summarize_conversation → memory_save_to_notion
```

---

## 5. Tools de Memória Implementadas

Foram adicionadas 5 tools no `js/tools.js`.

### 5.1 `memory_search`

Busca termo em `memory_chunks.content` usando `ilike`.

Parâmetros:

```json
{
  "query": "string",
  "source_id": "opcional",
  "limit": 10
}
```

Retorna:

```text
conversation_id
source_id
role
chunk_index
snippet
created_at
```

---

### 5.2 `memory_read_conversation`

Recebe `conversation_id`.

Busca:

- metadados em `memory_conversations`;
- chunks em `memory_chunks`;
- mensagens ordenadas por `chunk_index`.

Retorna:

```text
title
source_id
message_count
messages
transcript
```

---

### 5.3 `memory_summarize_conversation`

Executa:

```text
memory_read_conversation
→ GPT-4o
→ resumo operacional
```

Formato solicitado:

```text
Resumo
Decisões tomadas
Tarefas
Pendências
Links mencionados
```

Foi ajustada para incluir também o `summary` exportado da origem, quando disponível.

---

### 5.4 `memory_merge_sessions`

Recebe uma lista de `conversation_ids`.

Fluxo:

```text
lê várias conversas
concatena os conteúdos
envia ao GPT-4o
gera resumo consolidado por tema
```

---

### 5.5 `memory_save_to_notion`

Recebe:

```json
{
  "title": "Título da página",
  "content": "Resumo ou sessão consolidada"
}
```

Executa:

```text
createNotionPage(title, content)
```

---

## 6. Teste Real das Tools de Memória

Foi criado temporariamente um arquivo `test-memory-tools.js` para validar as tools.

Depois ele foi removido.

### Prompt testado

```text
Pesquise nas memórias do Claude sobre Worion e faça um resumo da conversa mais relevante.
```

### Resultado

A busca encontrou resultados em `memory_chunks`.

Conversa mais relevante:

```text
Conectores para melhorar o ambiente
```

Mensagens:

```text
138
```

Resumo principal gerado:

```text
A conversa aborda a implementação de conectores e melhorias no ambiente de trabalho, focando em Shopify, GitHub, Supabase e n8n.
Também trata do Worion como centro de controle cognitivo, migração do Supabase, dashboard multitenant, execução real de ações e memória unificada via MCP.
```

### Validações concluídas

```text
Sintaxe JS: OK
Teste real Supabase + GPT-4o: OK
npm start: rodando após 8s sem erro no stderr
```

---

## 7. Arquivo `Execucoes_worion.md`

Foi lido o arquivo:

```text
C:\Users\User\Desktop\Execucoes_worion.md
```

Ele contém a especificação do **Goal Execution Engine v2**.

### Objetivo do documento

Transformar o Worion de:

```text
chat que chama tools
```

para:

```text
executor orientado a objetivos
```

### Componentes previstos

- classificação de pedidos;
- planejamento interno com `sequential_thinking`;
- execução de plano de tools;
- fallback para Notion, Supabase e filesystem;
- paralelismo quando possível;
- timeout e cancelamento;
- logs internos;
- relatório final padronizado;
- tag de rollback antes da implementação.

---

## 8. Início do Goal Execution Engine v2

A implementação começou, mas não foi finalizada.

### Tag de rollback

Foi criada a tag:

```text
pre-goal-engine-v2
```

### Arquivo criado

```text
data/config.json
```

Conteúdo:

```json
{
  "goalTimeout": 120,
  "enableGoalEngine": true,
  "enableGoalParallelTools": true,
  "internalLogs": true
}
```

---

## 9. Alterações em `js/app.js`

Foram adicionados:

```text
CONFIG_PATH
currentGoalAborted
currentGoalRun
worionConfig
```

Também foi adicionada função para carregar configuração:

```text
loadWorionConfig()
```

E um atalho para cancelar execução:

```text
Ctrl + .
```

Esse atalho chama:

```text
cancelCurrentGoal()
```

---

## 10. Alterações em `js/logger.js`

O arquivo foi refeito.

### Funções atuais

```text
logAction()
logInternalAction()
```

### Função nova

`logInternalAction()` grava logs internos em:

```text
data/logs/internal/YYYY-MM-DD.jsonl
```

Esses logs não devem aparecer no chat principal.

---

## 11. Alterações em `js/tools.js`

Foi adicionada a tool:

```text
classify_request
```

### Função

Classificar internamente pedidos como:

```text
simple_query
direct_action
compound_goal
```

### Status

Implementada como tool inicial de roteamento.

---

## 12. Ponto Exato Onde Parou

A implementação parou durante a alteração de `executeToolCall()` no `js/tools.js`.

O objetivo era criar:

```text
executeToolCallWithFallback()
```

A ideia era que toda execução de tool passasse por uma camada de fallback.

### Situação atual

- Parte da infraestrutura foi criada.
- A tag de rollback foi criada.
- `data/config.json` foi criado.
- `logger.js` foi atualizado.
- `app.js` foi alterado.
- `classify_request` foi adicionada.
- A implementação de fallback em `executeToolCall()` começou, mas ainda precisa ser concluída e validada.

---

## 13. O Que Retomar Amanhã

### Etapa 1 — Revisar estado do Git

Executar:

```bash
git status --short --branch
git diff js/tools.js
git diff js/app.js
git diff js/logger.js
git diff data/config.json
```

Confirmar se a alteração em `executeToolCall()` ficou completa ou parcial.

---

### Etapa 2 — Validar sintaxe

Executar:

```bash
node --check js/tools.js
node --check js/app.js
node --check js/logger.js
node --check js/chat.js
```

Ou:

```bash
node -e "const fs=require('fs'); for (const file of fs.readdirSync('js').filter(f=>f.endsWith('.js'))) { new Function(fs.readFileSync('js/'+file,'utf8')); } console.log('all js syntax ok');"
```

---

### Etapa 3 — Finalizar `executeToolCallWithFallback`

Implementar camada de fallback para:

```text
Notion
Supabase
Filesystem
Brave
Memory tools
```

### Regra principal

Erro de tool não deve encerrar automaticamente a tarefa.

Fluxo esperado:

```text
tool falhou
→ registrar erro
→ procurar fallback
→ tentar alternativa
→ só bloquear quando não houver caminho técnico
```

---

### Etapa 4 — Implementar Goal Execution Engine no `chat.js`

Criar fluxo para objetivo composto:

```text
mensagem do usuário
→ classificar intenção
→ se compound_goal:
   → sequential_thinking
   → montar plano
   → executar tools
   → aplicar fallback
   → validar resultado
   → responder relatório final
```

---

### Etapa 5 — Criar relatório final padronizado

Formato:

```markdown
## Resultado

- **Status:** concluído / parcial / bloqueado
- **Objetivo:** ...
- **Tools usadas:** ...
- **Itens encontrados:** ...
- **Ações realizadas:** ...
- **Pendências reais:** ...
```

Não finalizar com frases genéricas.

---

### Etapa 6 — Corrigir busca inteligente no Notion

Implementar:

```text
normalizeNotionSearchQuery()
findNotionPageSmart()
extractTestCommandFromNotionContent()
```

Caso real a validar:

```text
verifique a página Teste de Integração — 15/05/2026 no notion e execute o teste 3
```

Página real:

```text
Teste de Integração — 15/05/2026
Page ID: 3618bcbf-b9ad-8139-8088-c07c68f22546
Local:
Workestria HQ
└── Worion Workspace HQ
```

Teste 3 da página:

```text
Onde eu falei sobre overlays no meu histórico do Claude?
```

Fluxo esperado:

```text
Notion search
→ read page
→ extract Teste 3
→ memory_search("overlays", source_id="claude")
→ listar trechos relevantes
→ relatório final
```

---

### Etapa 7 — Testes obrigatórios

#### Teste 1

```text
pesquise na supabase quantas conversas do Claude estão salvas
```

Esperado:

```text
105 conversas
```

#### Teste 2

```text
Pesquise nas memórias do Claude sobre Worion e faça um resumo da conversa mais relevante.
```

Esperado:

```text
memory_search
→ memory_read_conversation
→ memory_summarize_conversation
```

#### Teste 3

```text
verifique a página Teste de Integração — 15/05/2026 no notion e execute o teste 3
```

Esperado:

```text
localizar página
ler conteúdo
executar teste 3
buscar overlays no Claude
retornar relatório
```

#### Teste 4

```text
mãos agradecendo emoji
```

Esperado:

```text
🙏
```

Sem Goal Engine.

---

## 14. Pendências Técnicas

### Alta prioridade

- finalizar `executeToolCallWithFallback`;
- implementar executor de objetivos compostos no `chat.js`;
- corrigir busca inteligente de páginas do Notion;
- garantir que `Status: concluído` só seja usado quando a ação foi realmente concluída;
- remover respostas genéricas.

### Média prioridade

- implementar paralelismo controlado;
- implementar timeout real por objetivo;
- implementar botão/atalho de cancelamento visual;
- melhorar UI de progresso;
- registrar execução em logs internos.

### Futuro

- busca semântica com embeddings;
- ranking por relevância nas memórias;
- salvamento automático de resumos no Notion;
- timeline visual de conhecimento;
- conexão com memórias exportadas do ChatGPT.

---

## 15. Comando Sugerido para Retomada

Use este comando amanhã no Codex/Claude Code:

```text
Leia o arquivo docs/checkpoints/Worion_Retomada_16_05_2026.md e retome exatamente do ponto onde parou.

Primeiro valide o estado atual com git diff e node --check.
Depois finalize a implementação interrompida do Goal Execution Engine v2, começando por executeToolCallWithFallback no js/tools.js.

Não refatore o projeto inteiro.
Não remova as tools já implementadas.
Não quebre memory_search, memory_read_conversation, memory_summarize_conversation, memory_merge_sessions e memory_save_to_notion.

Ao final, rode os testes descritos no checkpoint.
```

---

## 16. Status Final do Dia

```text
Memória Claude importada: concluído
Supabase select corrigido: concluído
Tools de memória: concluído
Prompt de memória: concluído
Teste Supabase + GPT-4o: concluído
Goal Execution Engine v2: iniciado, mas pendente
Busca inteligente Notion: pendente
Fallback geral de tools: pendente
Relatório final padronizado: pendente
```

---

## 17. Próxima Ação Recomendada

Retomar amanhã exatamente nesta ordem:

```text
1. Verificar git diff
2. Validar sintaxe dos JS
3. Concluir executeToolCallWithFallback
4. Implementar executor composto no chat.js
5. Corrigir busca inteligente Notion
6. Testar página Teste de Integração — 15/05/2026
7. Testar memory_search sobre overlays
8. Validar relatório final
9. Commit e push
```

---

## 18. Sessão de Documentação da Arquitetura — 16/05/2026

### O Que Foi Realizado

Foi criada a documentação completa da arquitetura do Worion Desktop para resolver o problema de retrabalho e risco de quebrar dependências invisíveis em novas sessões.

### Artefatos Criados

1. **docs/architecture.json** — Arquivo central com:
   - Ordem exata de carregamento dos scripts (11 módulos)
   - Responsabilidade de cada módulo
   - Dependências entre módulos
   - Exports de cada módulo
   - Tools registradas (17 tools em tools.js)
   - Problemas conhecidos documentados
   - Regras de touch (o que ler antes de modificar)
   - Gate rules para validação

2. **Cabeçalhos informativos em todos os JS** — Cada arquivo em `js/` agora possui um bloco de documentação no topo com:
   - Nome do módulo
   - Responsabilidade (uma linha)
   - Dependências
   - Exports
   - Tools registradas
   - Regra de touch
   - Problemas conhecidos

3. **validate-architecture.js** — Script de validação que verifica:
   - Arquivos documentados vs reais
   - Presença de cabeçalhos em todos os JS
   - Consistência do load_order

4. **package.json atualizado** — Adicionado script `npm run validate`

### Resultado da Validação

```
✅ Arquitetura documentada e íntegra.
```

### Commit e Push

```
commit 49f55cc
docs: architecture.json + cabeçalhos informativos em todos os módulos JS + script de validação

14 arquivos alterados
- docs/architecture.json (novo)
- validate-architecture.js (novo)
- package.json (script validate adicionado)
- Todos os 11 arquivos JS atualizados com cabeçalhos
```

### Ordem de Carregamento Confirmada

1. js/utils.js — Base utilitária (sem dependências)
2. js/logger.js — Sistema de logs
3. js/connectors.js — APIs externas (Supabase, Notion, Brave, n8n)
4. js/memory.js — Perfil e conversas locais
5. js/projects.js — Projetos e templates de agentes
6. js/tools.js — **Núcleo do Goal Engine** (17 tools registradas)
7. js/prompt.js — Construção de prompts
8. js/artifacts.js — Upload e processamento de arquivos
9. js/chat.js — Lógica principal de chat e Goal Execution Engine
10. js/ui.js — Camada de apresentação completa
11. js/app.js — Ponto de entrada e inicialização

### Problemas Conhecidos Documentados

- **tools.js**: executeToolCallWithFallback está em implementação (conforme checkpoint)
- **chat.js**: Goal Execution Engine v2 está em implementação parcial (conforme checkpoint)

### Como Usar em Futuras Sessões

1. **Iniciar nova sessão**:
   ```bash
   node validate-architecture.js
   ```

2. **Antes de modificar qualquer módulo**:
   - Ler `docs/architecture.json` para o módulo específico
   - Verificar "touch_rule" para saber quais arquivos ler antes
   - Verificar "dependencies" para entender dependências

3. **Após modificações**:
   - Atualizar `docs/architecture.json` se necessário
   - Atualizar cabeçalho do arquivo modificado
   - Executar `node validate-architecture.js`
   - Se passou: commit e push

### Benefícios Imediatos

- ✅ Zero contexto perdido entre sessões
- ✅ Dependências explícitas documentadas
- ✅ Ordem de carregamento preservada
- ✅ Problemas conhecidos rastreados
- ✅ Validação automatizada de integridade
- ✅ Onboarding instantâneo para novos agentes

### Próximas Ações Recomendadas

A partir de agora, toda nova sessão deve:
1. Ler `docs/architecture.json` antes de iniciar
2. Executar `node validate-architecture.js` antes de commit
3. Atualizar documentação junto com código
4. Seguir as touch_rules ao modificar módulos críticos

---

## 19. Status Atualizado do Dia

```text
Memória Claude importada: concluído
Supabase select corrigido: concluído
Tools de memória: concluído
Prompt de memória: concluído
Teste Supabase + GPT-4o: concluído
Documentação de arquitetura: concluído ✅ NOVO
Script de validação: concluído ✅ NOVO
Goal Execution Engine v2: iniciado, mas pendente
Busca inteligente Notion: pendente
Fallback geral de tools: pendente
Relatório final padronizado: pendente
```
---

## 20. Melhorias de UX — Upload, Arquivos e Links Externos — 16/05/2026

### O Que Foi Resolvido

Foi concluído um ciclo de correções críticas de UX e navegação externa no Worion Desktop.

Essas melhorias corrigem problemas que estavam impactando diretamente o uso real do sistema:

- o upload só aparecia depois de iniciar uma conversa;
- não era possível arrastar arquivos para o Worion;
- não era possível colar imagens ou arquivos no input;
- links externos abriam dentro da janela Electron e substituíam o chat;
- PDF e DOCX não eram processados corretamente;
- formatos não suportados geravam mensagens ruins ou travavam o fluxo.

---

### 20.1 Upload Disponível na Tela Inicial

**Status:** concluído

Antes, o botão de upload/clipe só aparecia depois que uma conversa era iniciada.

Agora:

- o clipe aparece também na tela inicial;
- é possível anexar arquivos antes da primeira mensagem;
- a primeira mensagem já pode iniciar uma conversa com artifact vinculado;
- preview de anexos funciona antes de iniciar o chat.

**Arquivos modificados:**

```text
js/ui.js
js/artifacts.js
css/style.css
```

**Commit:**

```text
ff6cf0b - fix: adiciona upload na tela inicial
```

---

### 20.2 Drag and Drop de Arquivos

**Status:** concluído

Agora o Worion aceita arquivos arrastados diretamente para a área de input.

Funciona em:

- tela inicial;
- conversa existente.

Eventos implementados:

```text
dragover
dragenter
dragleave
drop
```

Também foi adicionado feedback visual com a classe:

```text
.drag-over
```

**Arquivos modificados:**

```text
js/artifacts.js
js/ui.js
css/style.css
```

**Commit:**

```text
a84d62e - fix: adiciona drag and drop de arquivos
```

---

### 20.3 Colar Imagem ou Arquivo no Input

**Status:** concluído

Agora o Worion aceita:

- imagens copiadas para a área de transferência;
- arquivos copiados;
- texto colado normalmente.

A implementação preserva o comportamento padrão de colar texto.

**Funções adicionadas:**

```text
handlePaste(e)
setupPasteHandler()
```

**Arquivos modificados:**

```text
js/artifacts.js
js/ui.js
```

**Commit:**

```text
47fe9fe - fix: adiciona suporte a colar arquivos no input
```

---

### 20.4 Links Externos no Navegador Padrão

**Status:** concluído

Problema anterior:

- links retornados pelo Brave ou em respostas Markdown navegavam dentro da janela Electron;
- o chat era substituído pela página externa;
- o usuário precisava reiniciar o app pelo PowerShell.

Agora:

- links `http://` e `https://` abrem no navegador padrão do sistema;
- a janela principal do Worion permanece no chat;
- `shell.openExternal()` foi aplicado;
- navegação interna indesejada foi bloqueada.

**Implementações principais:**

```text
webContents.setWindowOpenHandler
will-navigate
new-window handler
target="_blank"
rel="noopener noreferrer"
```

**Arquivos modificados:**

```text
main.js
js/ui.js
```

**Commit:**

```text
0d4b202 - fix: abre links externos no navegador padrão
```

---

### 20.5 Suporte a PDF e DOCX

**Status:** concluído

Agora o Worion processa documentos PDF e DOCX.

**Dependências instaladas:**

```text
pdf-parse@2.4.5
mammoth@1.12.0
```

**PDF:**

- lê buffer;
- extrai texto com `pdf-parse`;
- salva artifact com texto extraído;
- permite resumo/análise pelo chat.

**DOCX:**

- lê buffer;
- extrai texto com `mammoth`;
- salva artifact com texto extraído;
- permite resumo/análise pelo chat.

**Funções adicionadas:**

```text
extractPdfText(file)
extractDocxText(file)
```

**Arquivos modificados:**

```text
js/artifacts.js
```

**Commit:**

```text
79aaedb - feat: adiciona suporte a pdf e docx nos artifacts
```

---

### 20.6 Tratamento de Formatos Não Suportados

**Status:** concluído

Antes, formatos não suportados geravam mensagens confusas ou quebravam o fluxo.

Agora:

- qualquer arquivo pode ser anexado;
- formatos sem extração automática são salvos como `kind: 'unsupported'`;
- o app não trava;
- o usuário recebe mensagem clara.

Mensagem esperada:

```text
Arquivo anexado: [nome.xyz]

A extração automática não suporta este formato.

Formatos com extração: .png, .jpg, .webp, .pdf, .docx, .txt, .md, .json, .csv e outros.
```

**Arquivo modificado:**

```text
js/artifacts.js
```

**Commit:**

```text
3d1f7c2 - fix: melhora tratamento de formatos não suportados
```

---

## 21. Validação das Melhorias de UX

### Checklist Validado

```text
Upload na tela inicial: OK
Upload em conversa existente: OK
Drag and drop de PNG: OK
Drag and drop de PDF: OK
Paste de imagem copiada: OK
PDF resumido corretamente: OK
DOCX resumido corretamente: OK
Link externo abre no navegador padrão: OK
Worion permanece no chat após clique em link: OK
Console sem erros críticos: OK
Formato não suportado não trava app: OK
```

---

## 22. Impacto das Melhorias de UX

### Antes

```text
Upload só após iniciar conversa
Sem drag and drop
Sem paste de imagem/arquivo
Links quebravam o app
PDF/DOCX não funcionavam
Formatos não suportados travavam ou confundiam
```

### Depois

```text
Upload disponível antes da primeira conversa
Arrastar e soltar arquivos
Colar imagens e arquivos
Links externos abrem fora do Electron
PDF e DOCX com extração de texto
Qualquer formato pode ser anexado sem travar
```

---

## 23. Próximos Passos de UX Sugeridos

Após a conclusão do ciclo de upload e links externos, as próximas melhorias sugeridas são:

```text
1. Preview de PDF dentro do chat
2. Suporte a planilhas XLSX
3. Compressão automática de imagens grandes
4. Indicador de progresso para arquivos grandes
5. Cache de textos extraídos de PDF/DOCX
```

---

## 24. Status Atualizado Pós-Melhorias de UX

```text
Memória Claude importada: concluído
Supabase select corrigido: concluído
Tools de memória: concluído
Prompt de memória: concluído
Teste Supabase + GPT-4o: concluído
Documentação de arquitetura: concluído
Script de validação: concluído
Upload na tela inicial: concluído
Drag and drop: concluído
Paste de imagens/arquivos: concluído
Links externos no navegador padrão: concluído
PDF/DOCX nos artifacts: concluído
Tratamento de formatos não suportados: concluído

Goal Execution Engine v2: iniciado, mas pendente
Busca inteligente Notion: pendente
Fallback geral de tools: pendente
Relatório final padronizado: pendente
```

---

## 25. Ordem de Retomada Atualizada

Como o ciclo de UX/upload foi concluído, a retomada deve voltar para o núcleo operacional do Worion.

### Ordem recomendada:

```text
1. Verificar git status e git diff
2. Rodar node validate-architecture.js
3. Validar sintaxe JS
4. Concluir executeToolCallWithFallback em js/tools.js
5. Implementar executor composto no chat.js
6. Corrigir busca inteligente no Notion
7. Testar página Teste de Integração — 15/05/2026
8. Testar memory_search sobre overlays
9. Validar relatório final padronizado
10. Commit e push
```

---

## 26. Comando Atualizado Para Retomada

Use este comando na próxima sessão:

```text
Leia docs/checkpoints/Worion_Retomada_16_05_2026.md e docs/architecture.json.

Primeiro rode:
node validate-architecture.js

Depois valide:
node --check js/tools.js
node --check js/chat.js
node --check js/app.js
node --check js/logger.js

O ciclo de melhorias de UX/upload já foi concluído:
- upload na tela inicial;
- drag and drop;
- paste de imagens/arquivos;
- links externos no navegador padrão;
- PDF/DOCX;
- fallback para formatos não suportados.

Agora retome o núcleo operacional:
1. finalizar executeToolCallWithFallback em js/tools.js;
2. implementar Goal Execution Engine v2 em js/chat.js;
3. corrigir busca inteligente no Notion;
4. validar execução da página Teste de Integração — 15/05/2026;
5. garantir que Status: concluído só apareça quando a ação realmente foi executada.

Não refatore o projeto inteiro.
Não quebre as tools de memória.
Não remova funcionalidades de upload recém-implementadas.
Ao final, rode os testes do checkpoint, faça commit e push.
```

