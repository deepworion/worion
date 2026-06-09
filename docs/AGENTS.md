# WORION — Contexto para novas sessões Claude / Codex

> Leia este arquivo antes de qualquer tarefa neste projeto.

## O que é este projeto

**Workestria Core** — motor de automação SaaS baseado em Make.com (ex-Integromat).
Repositório: `leedermix-arch/workestria-core`
Branch de trabalho: `claude/continue-worion-modularization-gXdAA`

O objetivo é padronizar, modularizar e replicar automações com IA + Shopify em formato reutilizável.

---

## O que já foi feito

### Sessão 1 — Modularização do blueprint Make.com
Commit: `d283115` — `feat: modularização do workflow enriquecimento-catalogo-ia`

Estrutura criada:
```
workflows/
  enriquecimento-catalogo-ia.json          ← workflow completo sanitizado (importável no Make.com)
  docs/
    arquitetura-enriquecimento-catalogo.md ← diagrama de fluxo + configurações + estimativa de custo
  modules/
    index.json                             ← índice de todos os módulos
    shopify-buscar-produtos.json
    openai-identificar-produto-visao.json
    openai-enriquecer-catalogo.json
    json-parse-resposta-ia.json
    shopify-atualizar-produto.json
    credentials/
      shopify-connection.template.json
      openai-connection.template.json
      docs/
        setup-credenciais.md
```

### Workflow modularizado: Enriquecimento de Catálogo via IA
Fluxo: Shopify busca produtos → GPT-4o identifica por imagem → GPT chat enriquece → parse JSON → Shopify atualiza produto

- Origem: blueprint Make.com da loja `puppilapet.com.br`
- Credenciais: Shopify + OpenAI (IDs concretos substituídos por placeholders)
- Loja padrão: Puppila Pet | Vendor: "Puppila Pet" | productType: "pet"

---

## O que falta fazer (backlog)

- [ ] Criar workflow de monitoramento de estoque (próximo blueprint a modularizar)
- [ ] Adicionar módulo de notificação (Slack / WhatsApp) ao pipeline
- [ ] Criar testes de validação dos JSONs dos módulos
- [ ] Documentar padrão de nomenclatura de slugs para novos módulos
- [ ] Criar script CLI para montar workflow a partir de módulos individuais

---

## Convenções do repositório

| Pasta | Conteúdo |
|---|---|
| `workflows/` | Blueprints completos prontos para importar no Make.com |
| `workflows/modules/` | Módulos individuais reutilizáveis |
| `workflows/modules/credentials/` | Templates de conexão (sem secrets) |
| `workflows/docs/` | Arquitetura e guias de cada workflow |

### Padrão de slug
`[app]-[acao]-[contexto].json`
Exemplos: `shopify-buscar-produtos.json`, `openai-enriquecer-catalogo.json`

### Sanitização de credenciais
Nunca commitar IDs concretos de conexão Make.com.
Usar placeholders: `{{SHOPIFY_CONNECTION_ID}}`, `{{OPENAI_CONNECTION_ID}}`

---

## Como retomar uma sessão

```
git checkout claude/continue-worion-modularization-gXdAA
git pull origin claude/continue-worion-modularization-gXdAA
```

Depois diga ao Claude/Codex: **"leia o WORION.md e continue de onde parou"**
