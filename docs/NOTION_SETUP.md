# 🔧 Configuração do Notion — Passo a Passo

## 1. Criar Database no Notion

1. Abra o Notion
2. Crie uma nova página
3. Digite `/database` e selecione "Database - Full page"
4. Nomeie o database: **"Sessões dos Agentes"**

## 2. Configurar Propriedades

O database precisa ter pelo menos:
- ✅ **title** (tipo: Title) — já vem por padrão

Propriedades opcionais (recomendadas):
- **Data** (tipo: Date) — para ordenar sessões
- **Agente** (tipo: Select) — qual agente foi usado
- **Tags** (tipo: Multi-select) — TCC, TDAH, Reflexão, etc.

## 3. Obter o Database ID

### Método Visual:
1. Abra o database no Notion
2. Copie a URL do navegador
3. URL será algo como:
   ```
   https://www.notion.so/workspace/177da2804a7080058e3dfb50a8f62d6a?v=...
   ```
4. O Database ID é a parte: `177da2804a7080058e3dfb50a8f62d6a`

### Método pela API:
```javascript
// Cole no console do navegador (com token Notion válido)
const NOTION_TOKEN = '[REDACTED_NOTION_TOKEN]';

fetch('https://api.notion.com/v1/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
  },
  body: JSON.stringify({
    filter: { property: 'object', value: 'database' }
  })
})
.then(r => r.json())
.then(data => {
  console.log('Databases encontrados:');
  data.results.forEach(db => {
    console.log(`- ${db.title[0]?.plain_text}: ${db.id}`);
  });
});
```

## 4. Configurar no App

Abra `index.html` e procure por (linha ~350):
```javascript
const NOTION_DATABASE_ID = '177da2804a7080058e3dfb50a8f62d6a';
```

Substitua pelo ID do seu database:
```javascript
const NOTION_DATABASE_ID = 'SEU_ID_AQUI';
```

## 5. Testar

1. Inicie o app: `npm start`
2. Abra um agente
3. Inicie um chat
4. Digite algumas mensagens
5. Clique em "Encerrar sessão"
6. Verifique se a página foi criada no Notion

---

## ⚠️ Problemas Comuns

### Erro: "Could not find database"
- Verifique se o ID está correto
- Verifique se o token Notion tem acesso ao database

### Erro: "Invalid request"
- Database deve ter propriedade `title` (tipo Title)
- Verifique se o token está válido

### Conversa muito longa truncada
- Notion API limita 1000 blocos por página
- Para conversas longas, considere dividir em múltiplas páginas

---

## 🎨 Template Recomendado

Crie um template de página para suas sessões:

```markdown
# 🧠 Sessão [Agente] — DD/MM/YYYY

**Data**: DD/MM/YYYY às HH:MM
**Agente**: Nome do Agente
**Duração**: X mensagens

---

## Conversa

[Histórico da conversa aqui]

---

## Insights

- [ ] Insight 1
- [ ] Insight 2

## Próximos Passos

- [ ] Ação 1
- [ ] Ação 2
```

---

## 🚀 Pronto!

Com o Database ID configurado, o sistema está completo:
- ✅ Agentes carregados dinamicamente
- ✅ Chat com OpenAI
- ✅ Sessões salvas no Notion

**Bom uso!** 🎉
