# Plano: Worion Stellar OS - Sistema Operacional Multiagentes

Data: 2026-06-09
Status: plano de arquitetura e produto
Escopo: nova experiencia operacional do Worion para orquestrar multiplos agentes, monitorar logs, diagnosticar falhas e lancar agentes de correcao usando DeepWorion via Bash.

---

## 1. Visao Executiva

O Worion Stellar OS e uma camada de sistema operacional cognitivo sobre o Worion Desktop. A interface deixa de ser apenas uma lista de chats e passa a ser um mapa estelar vivo: cada agente e uma estrela, cada troca de contexto e uma sinapse luminosa, cada log e um pulso operacional, cada erro e uma anomalia que pode convocar agentes de diagnostico e correcao.

A meta nao e criar uma animacao bonita. A meta e construir um cockpit real de trabalho:

- escolher pastas e espacos de trabalho;
- definir quais agentes atuam em cada pasta;
- executar DeepWorion no Bash com contexto controlado;
- acompanhar logs em tempo real;
- detectar falhas, gargalos e loops;
- permitir que agentes analisem logs e proponham ou executem correcao;
- visualizar colaboracao entre agentes como uma constelacao funcional;
- manter rastreabilidade total do que foi decidido, executado e alterado.

O resultado esperado e uma experiencia estilo Jarvis: escura, precisa, reativa, com comandos naturais, observabilidade permanente e agentes especializados que parecem presencas operacionais, nao botoes.

---

## 2. Principios Do Produto

1. O usuario trabalha em espacos, nao em abas soltas.
2. Cada espaco aponta para uma pasta local real.
3. Cada agente tem papel, memoria, ferramentas permitidas e limites de acao.
4. Nenhum agente altera arquivo sem trilha de auditoria.
5. Logs sao primeira classe: tudo que roda gera evento observavel.
6. A UI mostra pensamento operacional, nao apenas resposta textual.
7. A automacao corrige problemas, mas a autoridade final continua configuravel.
8. DeepWorion via Bash e o motor executor local.
9. O mapa estelar e uma visualizacao do estado real do sistema.
10. A beleza visual nunca pode esconder status, risco ou falha.

---

## 3. Metafora Central: Mapa Estelar Do Worion

A tela principal e um campo de estrelas. Cada estrela representa um agente ativo ou disponivel. As estrelas da constelacao de Orion devem ser a nomenclatura base do sistema:

| Agente | Estrela | Papel |
|---|---|---|
| Rigel | Beta Orionis | Arquiteto de raciocinio profundo e sintese tecnica |
| Betelgeuse | Alpha Orionis | Estrategista, visao macro, produto e decisao |
| Bellatrix | Gamma Orionis | Agente de correcao, combate bugs e regressao |
| Saiph | Kappa Orionis | Executor de tarefas locais e automacoes |
| Alnitak | Zeta Orionis | Investigador de codigo e dependencias |
| Alnilam | Epsilon Orionis | Memoria, contexto longo e continuidade |
| Mintaka | Delta Orionis | Roteador de intencao e coordenador de fluxo |
| Meissa | Lambda Orionis | Observabilidade, logs, metricas e alertas |
| Hatsya | Iota Orionis | Agente de testes, validacao e reproducao |
| Tabit | Pi3 Orionis | Curador de workspace, pastas, documentos e escopo |

Nomes externos podem existir como agentes convidados, mas a constelacao de Orion deve ser a identidade canonica da feature.

---

## 4. Experiencia Principal

### 4.1 Primeiro frame

A primeira tela deve abrir no "Observatorio":

- fundo escuro profundo;
- constelacao de Orion no centro;
- estrelas com brilho proporcional ao status;
- linhas de conexao surgindo apenas quando ha colaboracao real;
- painel lateral esquerdo para espacos de trabalho;
- painel lateral direito para logs, eventos e decisoes;
- barra inferior para comando natural, voz e execucao DeepWorion;
- mini terminal recolhivel para Bash.

Nao deve parecer uma landing page. Deve parecer um cockpit operacional.

### 4.2 Seletor de pastas e espacos

O usuario cria um "Espaco" escolhendo uma pasta local:

```text
Espaco: Worion Desktop
Pasta raiz: C:\Users\User\worion-desktop
Agentes ativos: Mintaka, Alnilam, Alnitak, Bellatrix, Hatsya, Meissa
Politica de execucao: aprovar antes de editar
Terminal: Bash
Comando base: deepworion
```

Cada espaco salva:

- nome;
- caminho raiz;
- agentes permitidos;
- arquivos ignorados;
- comandos permitidos;
- nivel de autonomia;
- modelos preferenciais;
- historico de runs;
- ultimos problemas detectados;
- decisoes arquiteturais;
- relacao com memoria Supabase/Notion.

### 4.3 Acionamento por intencao

O usuario nao precisa escolher manualmente todos os agentes. Ele fala ou digita:

```text
Analise os logs do Worion, descubra por que o chat travou e proponha correcao.
```

Mintaka classifica a intencao:

- tipo: diagnostico;
- escopo: workspace atual;
- risco: medio;
- agentes convocados: Meissa, Alnitak, Bellatrix, Hatsya;
- permissao: leitura imediata, edicao sob aprovacao.

Na tela:

- Mintaka pulsa primeiro;
- uma linha azul vai para Meissa;
- Meissa acende lendo logs;
- Alnitak acende quando precisa investigar codigo;
- Bellatrix fica em modo "armed" aguardando patch;
- Hatsya fica em espera para validacao.

### 4.4 Conversa direta com uma estrela

O usuario pode tocar/clicar em uma estrela:

```text
Bellatrix, corrija apenas o bug do log parser. Nao toque na UI.
```

Isso abre uma frequencia direta com o agente, mas o TrafficController continua supervisionando risco, contexto e permissoes.

---

## 5. Arquitetura Do Sistema

### 5.1 Camadas

```text
Worion Stellar OS
  UI Observatorio (Three.js/WebGL + DOM operacional)
  Event Bus local
  TrafficController / Intent Router
  Agent Orchestrator
  Workspace Manager
  DeepWorion Bash Adapter
  Log Monitor
  Correction Pipeline
  Memory/RAG Layer
  Audit Ledger
  File System Guard
```

### 5.2 Componentes principais

#### UI Observatorio

Responsavel por:

- renderizar constelacao;
- mostrar status dos agentes;
- animar sinapses reais a partir de eventos;
- expor seletor de pastas;
- mostrar logs e timeline;
- permitir comando por texto/voz;
- abrir terminal DeepWorion integrado.

Tecnologia recomendada:

- Three.js para o campo estelar;
- Canvas/WebGL para particulas e linhas;
- DOM/CSS para paineis, controles e logs;
- EventSource/WebSocket local para eventos em tempo real.

#### Workspace Manager

Responsavel por:

- criar espacos de trabalho;
- validar pasta raiz;
- salvar configuracao local;
- aplicar ignorados;
- definir escopo de leitura/escrita dos agentes;
- mapear agentes por espaco.

Modelo:

```json
{
  "id": "worion-desktop",
  "name": "Worion Desktop",
  "rootPath": "C:\\Users\\User\\worion-desktop",
  "shell": "bash",
  "commandBase": "deepworion",
  "allowedAgents": ["mintaka", "alnilam", "alnitak", "bellatrix", "hatsya", "meissa"],
  "writePolicy": "approval_required",
  "ignored": ["node_modules", ".git", "dist", "build"],
  "createdAt": "2026-06-09T00:00:00.000Z"
}
```

#### TrafficController / Mintaka

Responsavel por:

- classificar intencao;
- escolher agentes;
- montar plano de execucao;
- decidir leitura vs escrita;
- coordenar paralelismo;
- impedir loop de agentes;
- registrar tudo no Audit Ledger.

Contrato de decisao:

```json
{
  "intent": "diagnose_and_fix",
  "risk": "medium",
  "workspaceId": "worion-desktop",
  "agents": ["meissa", "alnitak", "bellatrix", "hatsya"],
  "permissions": {
    "read": true,
    "write": "approval_required",
    "execute": "approval_required"
  },
  "successCriteria": [
    "erro reproduzido",
    "causa identificada",
    "patch aplicado",
    "teste executado",
    "log sem reincidencia"
  ]
}
```

#### Agent Orchestrator

Responsavel por:

- iniciar runs;
- pausar runs;
- cancelar runs;
- enviar contexto para cada agente;
- receber resultados;
- resolver conflitos;
- publicar eventos para UI;
- persistir artefatos.

Cada run possui:

- id;
- workspace;
- agente;
- prompt;
- comando DeepWorion;
- stdout/stderr;
- arquivos lidos;
- arquivos sugeridos;
- arquivos alterados;
- status;
- custo/tempo;
- decisao final.

#### DeepWorion Bash Adapter

Responsavel por executar DeepWorion no Bash, mesmo em ambiente Windows/Electron.

Exemplo de comando:

```bash
deepworion "Analise os logs do workspace atual e gere diagnostico objetivo" \
  --agent meissa \
  --model gpt-mini \
  --workspace "/mnt/c/Users/User/worion-desktop" \
  --read logs \
  --save supabase
```

No Windows, o adapter deve traduzir caminhos:

```text
C:\Users\User\worion-desktop
-> /mnt/c/Users/User/worion-desktop
```

O adapter deve capturar:

- stdout;
- stderr;
- exit code;
- duracao;
- comando normalizado;
- agente;
- workspace;
- modelo;
- modo de permissao.

#### Log Monitor / Meissa

Responsavel por:

- assistir arquivos de log;
- acompanhar processos;
- classificar severidade;
- agrupar eventos repetidos;
- detectar loop, crash, timeout e erro de API;
- enviar anomalias para o TrafficController;
- convocar agentes de diagnostico quando permitido.

Fontes de log:

- stdout/stderr de DeepWorion;
- logs do Electron main process;
- console do renderer quando capturado;
- `worion-api/server.js`;
- arquivos `logs/*.log`;
- eventos de execucao de agentes;
- erros de filesystem;
- erros de Supabase/Notion/API.

#### Correction Pipeline / Bellatrix

Pipeline padrao:

```text
Detectar erro
  -> reproduzir ou confirmar
  -> localizar causa provavel
  -> gerar plano minimo
  -> pedir aprovacao se houver escrita
  -> aplicar patch
  -> executar teste/validacao
  -> observar logs novamente
  -> registrar decisao
```

Estados:

- `observing`;
- `diagnosing`;
- `patch_ready`;
- `awaiting_approval`;
- `patching`;
- `validating`;
- `resolved`;
- `failed`;
- `rolled_back`.

#### Audit Ledger

Tudo que agentes fazem deve virar evento.

Evento minimo:

```json
{
  "id": "evt_...",
  "timestamp": "2026-06-09T00:00:00.000Z",
  "workspaceId": "worion-desktop",
  "agentId": "bellatrix",
  "type": "patch_proposed",
  "severity": "medium",
  "summary": "Corrigir parser de logs quando stderr vem vazio",
  "inputRefs": ["run_123", "log_456"],
  "outputRefs": ["patch_789"],
  "requiresApproval": true
}
```

Persistencia recomendada:

- arquivo local JSONL para replay rapido;
- Supabase para historico pesquisavel;
- Notion apenas para decisoes consolidadas, nao para cada evento bruto.

---

## 6. Comunicacao Entre Agentes

### 6.1 Quadro branco compartilhado

Os agentes nao devem conversar apenas por texto solto. Eles devem compartilhar artefatos estruturados:

- hipoteses;
- evidencias;
- arquivos relevantes;
- decisoes;
- patches;
- resultados de teste;
- riscos;
- proximas acoes.

Modelo:

```json
{
  "runId": "run_123",
  "blackboard": {
    "problem": "chat travando apos envio",
    "hypotheses": [
      {
        "agent": "meissa",
        "claim": "timeout na chamada local API",
        "confidence": 0.72,
        "evidence": ["stderr run_91", "server log line 188"]
      }
    ],
    "files": ["js/chat.js", "worion-api/server.js"],
    "patches": [],
    "tests": []
  }
}
```

### 6.2 Sinapses visuais

Cada troca no blackboard gera uma sinapse visual:

- azul: roteamento;
- dourado: memoria/contexto;
- vermelho: erro/anomalia;
- verde: validacao;
- branco: resposta final;
- violeta: aprendizado consolidado.

Importante: a linha so aparece quando existe evento real no Event Bus.

### 6.3 Pulsos de aprendizado

Quando um agente consolida aprendizado, ele publica:

```json
{
  "type": "learning_pulse",
  "from": "alnilam",
  "topic": "padrao de erro recorrente no DeepWorion Bash Adapter",
  "memoryTarget": "supabase",
  "visibility": ["mintaka", "meissa", "bellatrix"]
}
```

Na UI, isso vira uma onda discreta partindo da estrela, tocando as estrelas interessadas.

---

## 7. Agentes Canonicos

### Mintaka - Traffic Controller

Missao: entender intencao, escolher agentes e controlar risco.

Ferramentas:

- classificador de intencao;
- leitura de workspace config;
- criacao de plano;
- Event Bus;
- Audit Ledger.

Nao faz:

- patch direto;
- execucao longa;
- decisao irreversivel sem politica explicita.

### Alnilam - Memoria E Contexto

Missao: recuperar memoria, documentos, historico e continuidade.

Ferramentas:

- Supabase;
- Notion;
- memory cards;
- chunks;
- conversas anteriores;
- docs locais.

### Alnitak - Investigador De Codigo

Missao: vasculhar arquivos, dependencias, chamadas e contratos internos.

Ferramentas:

- ripgrep;
- leitura de arquivos;
- analise de import/export;
- architecture.json;
- historico git.

### Bellatrix - Correcao

Missao: propor e aplicar patches minimos.

Ferramentas:

- apply patch;
- diff;
- validacao local;
- rollback assistido quando houver patch proprio.

Politica:

- prefere mudanca pequena;
- nao refatora fora do escopo;
- sempre entrega criterio de validacao.

### Hatsya - Testes E Validacao

Missao: reproduzir erro e provar correcao.

Ferramentas:

- npm scripts;
- node --check;
- testes unitarios/e2e quando existirem;
- validacao de logs;
- smoke test.

### Meissa - Observabilidade

Missao: ver o sistema respirando.

Ferramentas:

- tail de logs;
- parser de stdout/stderr;
- detector de crash;
- timeline;
- severidade;
- agrupamento de eventos.

### Saiph - Executor Local

Missao: rodar tarefas permitidas no shell.

Ferramentas:

- Bash;
- DeepWorion CLI;
- scripts;
- jobs;
- filas.

### Rigel - Arquiteto

Missao: sintese profunda, desenho tecnico e decisoes estruturais.

Ferramentas:

- docs;
- arquitetura;
- blackboard;
- memoria;
- analise de tradeoffs.

### Betelgeuse - Produto E Estrategia

Missao: transformar objetivo nebuloso em feature, roadmap e prioridade.

Ferramentas:

- backlog;
- PRD;
- Notion;
- criterios de valor.

### Tabit - Curador De Workspace

Missao: organizar pastas, escopos, documentos e contexto de trabalho.

Ferramentas:

- seletor de pastas;
- indexacao local;
- tags;
- regras de inclusao/exclusao.

---

## 8. UX Futurista Estilo Jarvis

### 8.1 Layout

```text
+---------------------------------------------------------------+
| Espacos        Observatorio Estelar                 Logs Vivo |
|                                                               |
| Worion        * Betelgeuse                 Meissa: warning    |
| CustoMeeting        \                       Bellatrix: armed  |
| Playground           * Alnilam -- * Mintaka                  |
|                       \          /                           |
|                        * Rigel                               |
|                   * Alnitak -- * Bellatrix                   |
|                                                               |
| [comando natural / voz / deepworion]      [terminal bash ^]   |
+---------------------------------------------------------------+
```

### 8.2 Estados visuais

| Estado | Visual |
|---|---|
| idle | brilho baixo e respiracao lenta |
| thinking | pulso interno lento |
| reading | halo dourado |
| executing | aneis concentricos |
| error | cintilacao vermelha controlada |
| awaiting approval | borda ambar e linha pontilhada |
| patching | feixe concentrado para arquivo/artefato |
| validating | brilho verde em sweep |
| resolved | pulso branco curto |

### 8.3 Paineis

Painel esquerdo: Espacos

- lista de workspaces;
- botao de pasta;
- status por espaco;
- agentes ativos;
- politica de permissao.

Painel direito: Observabilidade

- timeline de eventos;
- logs agrupados;
- anomalias;
- runs ativos;
- patches pendentes;
- aprovacoes.

Painel inferior: Comando

- input natural;
- seletor de modo: observar, diagnosticar, corrigir, executar;
- microfone;
- botao de terminal;
- modelo atual;
- agente convocado.

Terminal recolhivel:

- mostra comando Bash real;
- stdout/stderr colorido;
- botao copiar comando;
- botao rerun;
- botao abrir run completa.

### 8.4 Interacoes sem menu tradicional

- clique em estrela: foco no agente;
- duplo clique: conversa direta;
- arrastar estrela para pasta: vincula agente ao espaco;
- clicar sinapse: mostra mensagem/artefato trocado;
- clicar anomalia vermelha: abre diagnostico;
- comando "corrija isso": inicia Correction Pipeline;
- comando "so observe": coloca sistema em modo passivo.

---

## 9. DeepWorion Via Bash

### 9.1 Contrato do adapter

O adapter deve expor uma funcao interna:

```js
runDeepWorion({
  workspaceRoot,
  shell: 'bash',
  agent: 'meissa',
  model: 'gpt-mini',
  prompt,
  mode: 'diagnose',
  save: 'supabase',
  timeoutMs: 120000
})
```

Retorno:

```json
{
  "runId": "run_123",
  "exitCode": 0,
  "stdout": "...",
  "stderr": "",
  "durationMs": 18420,
  "command": "deepworion ...",
  "artifacts": [],
  "events": []
}
```

### 9.2 Modos de uso

Diagnostico:

```bash
deepworion "Analise os logs e gere causa provavel com evidencias" --agent meissa --model gpt-mini
```

Arquitetura:

```bash
deepworion "Desenhe o plano tecnico minimo para corrigir esta falha" --agent rigel --model claude
```

Patch:

```bash
deepworion "Gere patch minimo para a causa confirmada. Nao refatore fora do escopo." --agent bellatrix --model gpt-mini
```

Validacao:

```bash
deepworion "Valide a correcao e diga quais comandos devem rodar" --agent hatsya --model gpt-mini
```

### 9.3 Guardrails

- comandos destrutivos exigem aprovacao;
- escrita em arquivo exige diff antes;
- execucao com `--exec --force` deve ser permitida apenas por politica explicita;
- cada comando deve registrar runId;
- stdout e stderr nunca podem ser descartados;
- prompts devem incluir workspace e objetivo;
- nenhum agente deve receber segredo bruto se nao precisar.

---

## 10. Sistema De Monitoramento De Logs

### 10.1 Pipeline

```text
Process output / log file
  -> Log Collector
  -> Parser
  -> Classifier
  -> Event Bus
  -> UI Timeline
  -> Anomaly Detector
  -> Agent Trigger
```

### 10.2 Severidades

- trace: detalhe tecnico;
- info: evento normal;
- notice: evento importante;
- warning: risco;
- error: falha;
- critical: sistema quebrado;
- action_required: precisa de decisao do usuario.

### 10.3 Detectores iniciais

- comando DeepWorion falhou;
- timeout;
- API key ausente;
- erro de Supabase;
- erro de Notion;
- arquivo nao encontrado;
- JSON invalido;
- import quebrado;
- processo Electron morto;
- loop de agente;
- patch sem validacao;
- memoria retornando vazia;
- diferenca entre agente esperado e agente executado.

---

## 11. Correcao Assistida Por Agentes

### 11.1 Fluxo completo

```text
Meissa detecta erro
Mintaka classifica risco
Alnitak localiza arquivos envolvidos
Rigel decide abordagem
Bellatrix gera patch minimo
Usuario aprova se necessario
Saiph aplica/roda comando
Hatsya valida
Alnilam salva aprendizado
Meissa observa se o erro voltou
```

### 11.2 Politicas de autonomia

| Politica | Leitura | Escrita | Execucao |
|---|---|---|---|
| observar | sim | nao | nao |
| diagnosticar | sim | nao | comandos seguros |
| sugerir correcao | sim | diff apenas | testes sob aprovacao |
| corrigir assistido | sim | com aprovacao | com aprovacao |
| laboratorio | sim | auto em sandbox | auto em sandbox |

Padrao recomendado: `corrigir assistido`.

---

## 12. Modelo De Dados Inicial

### workspaces.json

```json
{
  "workspaces": []
}
```

### agents.registry.json

```json
{
  "agents": [
    {
      "id": "rigel",
      "name": "Rigel",
      "star": "Beta Orionis",
      "role": "Arquiteto",
      "color": "#8fb7ff",
      "tools": ["read_docs", "analyze_architecture", "deepworion"],
      "defaultModel": "claude"
    }
  ]
}
```

### events.jsonl

Cada linha e um evento JSON independente. Isso permite replay do observatorio.

### runs.jsonl

Historico detalhado de execucoes DeepWorion.

---

## 13. Roadmap De Implementacao

### Fase 1 - Fundacao operacional

Entregas:

- criar Workspace Manager;
- salvar e carregar espacos;
- seletor de pasta no Electron;
- registrar agentes Orion em JSON;
- criar Event Bus local;
- criar Audit Ledger JSONL;
- criar DeepWorion Bash Adapter;
- capturar stdout/stderr/exit code.

Criterio de aceite:

- usuario escolhe uma pasta;
- seleciona agentes ativos;
- roda um comando DeepWorion via Bash;
- ve run registrada com stdout/stderr.

### Fase 2 - Observabilidade

Entregas:

- Log Monitor;
- parser de eventos;
- severidade;
- timeline;
- detector de anomalia basico;
- painel direito de logs.

Criterio de aceite:

- erro em comando aparece como evento vermelho;
- timeout vira alerta;
- run pode ser aberta e auditada.

### Fase 3 - Orquestracao multiagente

Entregas:

- Mintaka classifica intencao;
- Orchestrator convoca multiplos agentes;
- blackboard compartilhado;
- eventos de sinapse;
- limites de loop e timeout;
- resumo final com contribuicoes por agente.

Criterio de aceite:

- pedido de diagnostico convoca Meissa, Alnitak e Rigel;
- cada agente produz artefato;
- UI mostra colaboracao real.

### Fase 4 - Pipeline de correcao

Entregas:

- Bellatrix gera patch;
- aprovacao antes de escrita;
- Hatsya valida;
- rollback assistido para patches da sessao;
- aprendizado consolidado por Alnilam.

Criterio de aceite:

- erro detectado gera patch proposto;
- usuario aprova;
- patch e aplicado;
- validacao roda;
- evento final marca resolvido ou falhou.

### Fase 5 - Observatorio estelar

Entregas:

- Three.js/WebGL;
- constelacao Orion;
- estrelas com estados reais;
- sinapses animadas por eventos;
- clique em agente;
- clique em sinapse;
- pulsos de aprendizado;
- terminal recolhivel.

Criterio de aceite:

- visual reflete Event Bus;
- nao ha animacao falsa;
- mapa fica utilizavel em desktop e notebook;
- texto nao sobrepoe controles.

### Fase 6 - Voz e modo Jarvis

Entregas:

- STT opcional;
- TTS opcional;
- wake command local;
- respostas curtas por voz;
- comandos naturais para agentes.

Criterio de aceite:

- usuario dita um diagnostico;
- sistema responde com status e pede aprovacao quando necessario.

---

## 14. Estrutura De Arquivos Sugerida

```text
js/stellar/
  stellar-app.js
  stellar-event-bus.js
  stellar-workspaces.js
  stellar-agents-registry.js
  stellar-orchestrator.js
  stellar-deepworion-adapter.js
  stellar-log-monitor.js
  stellar-correction-pipeline.js
  stellar-audit-ledger.js
  stellar-blackboard.js
  stellar-renderer-three.js
  stellar-ui-panels.js

data/stellar/
  workspaces.json
  agents.registry.json
  events.jsonl
  runs.jsonl
  blackboards/
  patches/
  logs/
```

---

## 15. Script Conceitual Da Experiencia

Cena: o usuario abre o Worion Stellar OS.

```text
O observatorio desperta.

Mintaka emite um pulso azul: "Espaco atual: Worion Desktop."
Tabit confirma a pasta raiz: "C:\Users\User\worion-desktop."
Meissa inicia observacao silenciosa dos logs.
Alnilam recupera contexto recente.

Usuario:
"Analise por que o DeepWorion travou no ultimo run e corrija se for seguro."

Mintaka classifica:
intencao = diagnosticar_e_corrigir
risco = medio
politica = corrigir_assistido

Sinapse azul: Mintaka -> Meissa.
Meissa le stdout, stderr e runs.jsonl.

Meissa:
"Encontrei falha recorrente: stderr vazio com exit code 1 nao esta sendo classificado."

Sinapse vermelha: Meissa -> Alnitak.
Alnitak investiga o adapter.

Alnitak:
"Arquivo provavel: stellar-deepworion-adapter.js. O parser assume mensagem textual."

Sinapse azul profunda: Alnitak -> Rigel.
Rigel sintetiza:
"A correcao minima e tratar exitCode != 0 como erro mesmo sem stderr."

Bellatrix acende em vermelho controlado:
"Patch pronto. Toca apenas no adapter e adiciona teste de classificacao."

O painel direito mostra:
[Aprovar patch] [Ver diff] [Cancelar]

Usuario aprova.

Saiph aplica.
Hatsya valida.
Meissa observa novo run.

Alnilam emite pulso violeta:
"Aprendizado salvo: falha silenciosa de processo deve ser classificada por exit code, nao apenas stderr."

Rigel entrega a ultima sinapse:
"Corrigido. O sistema agora detecta falha silenciosa do DeepWorion e abre diagnostico automaticamente."
```

---

## 16. Riscos Tecnicos

1. UI virar teatro visual sem eventos reais.
   - Mitigacao: toda animacao deve vir do Event Bus.

2. Agentes entrarem em loop.
   - Mitigacao: max steps, max duration, run budget e detector de repeticao.

3. Correcao automatica quebrar arquivo.
   - Mitigacao: diff antes, aprovacao, teste, rollback de patches da sessao.

4. DeepWorion Bash em Windows ter problema de path.
   - Mitigacao: path translator dedicado e testes com caminhos reais.

5. Logs ficarem barulhentos.
   - Mitigacao: agrupamento por fingerprint e severidade.

6. Memoria virar fonte confusa.
   - Mitigacao: separar evento bruto, decisao consolidada e aprendizado.

7. Permissoes pouco claras.
   - Mitigacao: politica por workspace e por agente visivel na UI.

---

## 17. MVP Realista

O MVP nao precisa ter voz nem WebGL perfeito. O MVP precisa provar a espinha dorsal:

1. Seletor de pasta.
2. Registro de workspace.
3. Lista de agentes Orion.
4. Execucao DeepWorion via Bash.
5. Captura de stdout/stderr.
6. Timeline de eventos.
7. Detector basico de erro.
8. Botao "analisar com Meissa".
9. Botao "propor correcao com Bellatrix".
10. Auditoria local.

Depois disso, o mapa estelar pode substituir progressivamente a tela tradicional.

---

## 18. Definicao De Pronto

A feature so deve ser considerada pronta quando:

- um workspace real pode ser escolhido por pasta;
- os agentes Orion podem ser ativados/desativados por workspace;
- DeepWorion roda no Bash a partir da UI;
- cada run gera evento, log e historico;
- erros sao detectados e classificados;
- agentes conseguem analisar logs;
- Bellatrix consegue propor patch com diff;
- escrita exige aprovacao na politica padrao;
- Hatsya consegue validar;
- Alnilam salva aprendizado;
- a UI estelar representa eventos reais;
- existe trilha de auditoria para explicar o que aconteceu.

---

## 19. Norte Arquitetural

O Worion Stellar OS deve ser tratado como um sistema operacional local de cognicao assistida.

O mapa estelar e a pele.
O Event Bus e o sistema nervoso.
O TrafficController e o cortex executivo.
O blackboard e a memoria de trabalho.
O DeepWorion Bash Adapter e o braco executor.
O Log Monitor e o sentido proprioceptivo.
O Correction Pipeline e o sistema imunologico.
O Audit Ledger e a consciencia historica.

Se uma estrela brilha, precisa existir um evento.
Se uma sinapse pulsa, precisa existir uma troca.
Se um agente corrige, precisa existir diff, validacao e registro.

Essa e a diferenca entre uma interface bonita e um organismo operacional.
