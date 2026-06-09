# 🤖 Worion Desktop — Sistema de Agentes

## ✅ Implementado

### 1. Carregamento Dinâmico de Agentes
- Qualquer arquivo `.md` na pasta `agents/` vira um agente automaticamente
- Título extraído da primeira linha com `#`
- Descrição extraída da segunda linha
- Botão "Recarregar" para atualizar sem reiniciar o app

### 2. Chat com OpenAI
- API key buscada automaticamente do Supabase
- Modelo: `gpt-4o-mini`
- System prompt carregado do conteúdo do `.md`
- Histórico mantido durante a sessão

### 3. Salvar Sessão no Notion
- Botão "Encerrar sessão" no cabeçalho do chat
- Salva toda a conversa formatada em uma nova página
- Título: `🧠 Sessão [Nome do Agente] — DD/MM/YYYY`

---

## 🚀 Como Usar

### Iniciar o App
```bash
cd C:\Users\User\worion-desktop
npm start
```

### Adicionar Novo Agente
1. Crie um arquivo `.md` na pasta `agents/`
2. Primeira linha deve ser o título: `# Nome do Agente`
3. Segunda linha: descrição breve
4. Resto do arquivo: system prompt completo
5. Clique em "Recarregar" no app (ou reinicie)

### Usar um Agente
1. Clique no card do agente
2. Clique em "Iniciar chat"
3. Digite suas mensagens
4. Quando terminar, clique em "Encerrar sessão"

---

## ⚙️ Configuração Necessária

### 1. Database do Notion
No arquivo `index.html`, linha ~350, substitua:
```javascript
const NOTION_DATABASE_ID = 'SEU_DATABASE_ID_AQUI';
```

**Como encontrar o Database ID:**
1. Abra o database no Notion
2. URL será algo como: `notion.so/workspace/SEU_DATABASE_ID?v=...`
3. Copie o `SEU_DATABASE_ID`

### 2. Estrutura do Database
Crie um database no Notion com:
- Propriedade `title` (tipo Title)
- Outras propriedades são opcionais

### 3. Verificar Supabase
As credenciais já estão configuradas:
- URL: `https://zhdnqjwfpeexjrofosez.supabase.co`
- Service Role Key: já inserida
- Tabela: `api_keys_vault_v2`
- Filtros: `provider=openai`, `store=workestria`

---

## 📁 Estrutura de Arquivos

```
worion-desktop/
├── agents/
│   └── diario-reflexivo.md   ← Primeiro agente (já criado)
├── index.html                 ← Interface principal
├── main.js                    ← Electron config
├── package.json
└── README_AGENTES.md          ← Este arquivo
```

---

## 🔧 Solução de Problemas

### Agentes não aparecem
- Verifique se os arquivos estão em `agents/` com extensão `.md`
- Clique em "Recarregar"
- Verifique o console (Ctrl+Shift+I) para erros

### Chat não funciona
- Verifique se a OpenAI key está no Supabase
- Console deve mostrar: `✅ OpenAI key carregada do Supabase`
- Se aparecer erro de API, verifique se a key é válida

### Salvar no Notion falha
- Configure o `NOTION_DATABASE_ID` correto
- Verifique se o token Notion está válido
- Database deve ter propriedade `title`
- Console mostrará detalhes do erro

---

## 🎨 Personalização

### Adicionar Tags Automáticas
No código, na função `loadAgents()`, adicione lógica para extrair tags do markdown:
```javascript
// Exemplo: procurar por linha "Tags: TCC, TDAH"
const tagsMatch = content.match(/Tags?:\s*(.+)/i);
const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : ['Personalizado'];
```

### Mudar Modelo OpenAI
No `index.html`, função `sendMsg()`, linha ~310:
```javascript
model: 'gpt-4o',  // ou 'gpt-4', 'gpt-3.5-turbo', etc.
```

### Adicionar Conexões Externas
No objeto `agent`, campo `connections`:
```javascript
connections: { 
  notion: true, 
  obsidian: false, 
  github: false, 
  drive: false 
}
```

---

## 📝 Próximos Passos

- [ ] Configurar `NOTION_DATABASE_ID`
- [ ] Testar chat com "Diário Reflexivo"
- [ ] Adicionar mais agentes (criar novos `.md` em `agents/`)
- [ ] Personalizar conforme necessário

---

## 💡 Dicas

- Use Markdown no system prompt para formatação rica
- Mantenha system prompts < 8000 tokens para melhor performance
- Histórico de chat é resetado ao fechar o painel
- Notion API tem limite de 1000 blocos por página (conversas muito longas podem truncar)

---

**Sistema pronto para uso!** 🚀

Qualquer problema, verifique o console do Electron (Ctrl+Shift+I).
