# Inventario Worion

Data de referencia: 2026-05-18

## Escopo

Levantamento apenas dos artefatos locais do workspace:
- agentes em `agents/`
- templates em `data/agent-templates.json`
- instalacoes em `data/installed-agents.json`
- estado do projeto em `docs/sessions/WORION_STATUS.md`
- perfil e configuracao local em `data/profile.json` e `data/config.json`

Nao ha alteracao de codigo neste documento.

## Inventario De Agentes

### Agentes locais existentes

| Agente | Arquivo | Status | Personalidade definida | Observacao |
|---|---|---:|---:|---|
| ADHD Guardian | `agents/adhd-guardian.md` | Salvo e instalado | Sim | Template instalado e com metadados completos. |
| Cartografo de Padrões | `agents/cartografo-de-padroes.md` | Salvo | Sim | Tem identidade forte e documento externo referenciado em `_docs`. |
| Companheiro de estrada | `agents/companheiro-de-estrada.md` | Salvo | Sim | Persona longa, filosófica e consistente. |
| Diário Reflexivo - Facilitador Pessoal | `agents/diario-reflexivo-facilitador-pessoal.md` | Salvo | Sim | Persona definida, com 2 documentos anexados. |
| Worion Assistente | `agents/worion-assistente.md` | Salvo | Sim | Agente operacional principal do sistema. |

### Resumo objetivo

- Agentes locais totais: 5
- Agentes com personalidade definida: 5
- Agentes instalados a partir de template: 1
- Agentes com documentos anexados: 2

## Agentes Salvos E Com Personalidade

Todos os 5 agentes locais possuem identidade textual clara:
- `adhd-guardian.md`
- `cartografo-de-padroes.md`
- `companheiro-de-estrada.md`
- `diario-reflexivo-facilitador-pessoal.md`
- `worion-assistente.md`

O grau de maturidade varia:
- `adhd-guardian.md` e `worion-assistente.md` são mais operacionais.
- `cartografo-de-padroes.md`, `companheiro-de-estrada.md` e `diario-reflexivo-facilitador-pessoal.md` são mais autorais e orientados a presença.

## Verificacao Inversa

O que o Worion ja tem:
- base Electron local funcional;
- chat com OpenAI;
- memoria local e sincronizacao externa;
- painel de agentes;
- painel de conversas;
- painel de projetos;
- painel de conectores;
- habilidade de carregar documentos de agente;
- suporte a contextos de projeto e anexos;
- status de projeto com config ativa;
- logs de internalidade ligados em `data/config.json`.

O que ainda falta ou esta incompleto:
- inventario formal de agentes por categoria e finalidade;
- consolidacao de “agentes instalados” versus “agentes apenas salvos”;
- auditoria de quais agentes usam tools modernas e quais ainda usam prompts isolados;
- cobertura de testes automatizados para os fluxos de agente e conversa;
- classificação de qualidade por agente;
- mapa de dependencias entre agentes, documentos e projetos;
- status de uso real por agente, como ultimo uso e frequência;
- documentação de performance e latencia por modo.

## Status Atual Do Projeto

Conforme `docs/sessions/WORION_STATUS.md`, o projeto está em:
- fase de consolidação funcional e limpeza de arquitetura;
- com chat, agentes, projetos, conectores, Notion e memória já operacionais;
- com necessidade de reduzir o acoplamento do `index.html` e endurecer a camada de ferramentas.

Estado local atual observado:
- `data/config.json` está com `internalLogs: true`;
- `data/profile.json` contém perfil preenchido e uso diário calculado;
- `data/installed-agents.json` confirma apenas um template instalado;
- `data/worion-import-status.json` mostra importação do Claude concluída com 105 conversas e 5786 chunks.

Leitura prática:
- o projeto não está em fase inicial;
- está em fase de consolidação e organização do ecossistema de agentes;
- falta transformar boa parte da capacidade já existente em catálogo consistente e medido.

## Lacunas Prioritarias

1. Catálogo estruturado de agentes
- Nome
- Objetivo
- Tom
- Tools
- Modelo
- Documento fonte
- Estado de instalação
- Último uso

2. Auditoria de prompts
- identificar agentes redundantes;
- identificar agentes sem diferença operacional real;
- identificar agentes com personalidade forte mas sem tool útil.

3. Camada de velocidade
- reduzir chamadas desnecessárias;
- evitar tool calls quando a resposta puder ser entregue direto;
- cachear contexto estável;
- evitar reconstrução repetitiva de prompt.

4. Camada de confiabilidade
- tratar falhas de ferramenta com fallback definido;
- registrar aborto, timeout e degradação por modo;
- testar persistência de conversa, projeto e memória.

## Sugestoes De Melhoria No Agente

### Melhorias de qualidade
- Criar uma ficha padrão por agente com objetivo, limites, tom, gatilhos e tools.
- Diferenciar explicitamente agentes “de presença” e agentes “operacionais”.
- Adicionar indicação de quando o agente deve falar curto ou quando deve expandir.
- Registrar qual agente é para conversa, qual é para execução e qual é para revisão.

### Melhorias de curadoria
- Remover sobreposição entre personas muito próximas.
- Consolidar agentes com mesma função base e variações pequenas.
- Dar peso maior a documentos anexados do que a prompt solta quando houver conflito.

### Melhorias de manutenção
- Manter um registro de alterações por agente.
- Separar documento mestre da persona e documentos suplementares.
- Criar revisão periódica de agentes inativos ou duplicados.

## Tools Que Podem Melhorar O Agente

### Tools funcionais
- `sequential_thinking`: melhora organização interna e encadeamento de decisão.
- `filesystem_read`: útil para ler contexto local, docs e histórico.
- `filesystem_write`: útil para gerar entregáveis e registrar artefatos.
- `save_project`: ajuda a transformar conversa em estado persistente.
- `brave_search`: melhora pesquisa atual e verificável.
- `memory_search`: melhora continuidade e retomada de contexto.
- `memory_read_conversation`: aprofunda conversas passadas relevantes.
- `notion_read_page` e `notion_search_pages`: úteis quando o contexto está no Notion.
- `create_notion_page`: útil para saída documentável e rastreável.

### Tools que aumentam velocidade
- `sequential_thinking` em modo enxuto, só quando houver ambiguidade real.
- `filesystem_read` com escopo pequeno para evitar leitura ampla demais.
- `memory_search` com consultas curtas e bem delimitadas.
- `brave_search` só quando o pedido exigir informação externa ou atual.
- `save_project` apenas quando houver mudança real de escopo ou entrega.

### Recomendação prática de velocidade
- para respostas curtas e presença, evitar tool calls;
- para respostas de análise, usar uma tool de raciocínio + uma de memória no máximo;
- para tarefas com artefato, usar escrita uma vez no fim, não no meio.

## Verificacao De Estrutura

Agentes com indicação de estrutura mais robusta:
- `adhd-guardian.md`
- `cartografo-de-padroes.md`
- `diario-reflexivo-facilitador-pessoal.md`

Agentes mais voltados a conversa e operação:
- `companheiro-de-estrada.md`
- `worion-assistente.md`

## Conclusao Operacional

O Worion já tem um núcleo funcional real e um conjunto pequeno, mas significativo, de agentes com identidade própria. O próximo ganho não está em criar muitos agentes novos, e sim em:
- medir o que já existe;
- classificar melhor os papéis;
- evitar redundância;
- anexar tools certas a cada função;
- acelerar os modos que não precisam de raciocínio pesado.

## Anexo De Leitura

Arquivos principais consultados:
- `agents/adhd-guardian.md`
- `agents/cartografo-de-padroes.md`
- `agents/companheiro-de-estrada.md`
- `agents/diario-reflexivo-facilitador-pessoal.md`
- `agents/worion-assistente.md`
- `data/agent-templates.json`
- `data/installed-agents.json`
- `data/profile.json`
- `data/config.json`
- `data/worion-import-status.json`
- `docs/sessions/WORION_STATUS.md`
