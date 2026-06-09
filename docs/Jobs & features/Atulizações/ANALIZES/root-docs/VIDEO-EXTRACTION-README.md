# Extração de Conteúdo de Vídeos - Guia de Uso e Reversão

## 📋 O que foi implementado

Foram adicionadas **duas novas ferramentas** ao Worion para extrair conteúdo de vídeos do YouTube e Instagram:

### 1. `youtube_transcript`
Extrai transcrições/legendas de vídeos do YouTube **com streaming progressivo**.

**Parâmetros:**
- `url` (obrigatório): URL do vídeo do YouTube
- `language` (opcional): Código do idioma (pt, en, es, etc.). Padrão: pt

**Exemplo de uso no chat:**
```
Extraia a transcrição deste vídeo: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Resposta esperada:**
- ✨ **Streaming progressivo:** A transcrição aparece aos poucos (10 linhas por vez)
- Você pode começar a ler enquanto o resto carrega
- Texto completo da transcrição
- Versão com timestamps
- Número de segmentos encontrados

### 2. `instagram_content`
Extrai conteúdo textual (caption, comentários) de posts/reels do Instagram.

**Parâmetros:**
- `url` (obrigatório): URL do post/reel do Instagram
- `include_comments` (opcional): Se deve incluir comentários. Padrão: false

**Exemplo de uso no chat:**
```
Extraia o conteúdo deste post do Instagram: https://www.instagram.com/p/ABC123/
```

**⚠️ NOTA:** A ferramenta do Instagram tem limitações e pode requerer credenciais. Veja seção "Configuração" abaixo.

---

## 🔧 Arquivos Modificados

1. **`js/tools.js`**
   - Adicionadas as tools `youtube_transcript` e `instagram_content`
   - Adicionadas funções `detectVideoTranscriptionRequest` e `executeDirectVideoTranscription`
   - Backup criado: `js/tools.js.backup-20260525-203454`

2. **`js/chat.js`**
   - Adicionada detecção automática de URLs de vídeo antes do processamento normal
   - Backup criado: `js/chat.js.backup-[timestamp]`

3. **`package.json`**
   - Adicionadas dependências:
     - `youtube-transcript`: ^1.2.1
     - `instagram-private-api`: ^1.46.1

---

## ⚙️ Configuração

### YouTube
✅ **Funciona sem configuração adicional!** A biblioteca `youtube-transcript` não requer API key.

### Instagram (Opcional)
Para funcionalidade completa do Instagram, adicione ao seu `.env`:

```env
IG_USERNAME=seu_usuario_instagram
IG_PASSWORD=sua_senha_instagram
```

**IMPORTANTE:** O Instagram tem proteções contra scraping. A ferramenta funciona de forma limitada sem credenciais.

---

## 🔄 Como Reverter (Modo Reversível)

Se você quiser remover essas funcionalidades:

### Opção 1: Reverter arquivo manualmente
```bash
# Encontre o backup mais recente
ls js/tools.js.backup-*

# Restaure o backup (substitua [timestamp] pelo valor correto)
cp js/tools.js.backup-[timestamp] js/tools.js
```

### Opção 2: Remover apenas as tools
Edite `js/tools.js` e remova:

1. **As duas tools** (linhas começando em `youtube_transcript:` e `instagram_content:`)
2. **Os nomes das tools** na documentação do cabeçalho (linha `TOOLS REGISTRADAS:`)

### Opção 3: Manter código mas desinstalar dependências
```bash
npm uninstall youtube-transcript instagram-private-api
```

Isso mantém o código mas desabilita as ferramentas (elas retornarão erro de módulo não encontrado).

---

## 🧪 Como Testar

### Teste 1: YouTube
```
No chat do Worion, digite:
"Extraia a transcrição deste vídeo: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### Teste 2: Verificar se as tools foram registradas
```
No console do navegador (F12), execute:
console.log(Object.keys(TOOL_REGISTRY).filter(k => k.includes('youtube') || k.includes('instagram')));
```

Deve retornar: `['youtube_transcript', 'instagram_content']`

---

## 📝 Detalhes Técnicos

### Como funciona o YouTube
- Usa a biblioteca `youtube-transcript` que acessa as legendas públicas do YouTube
- Não requer API key da Google
- Tenta primeiro no idioma solicitado, depois em inglês como fallback
- Retorna texto completo e versão com timestamps

### Como funciona o Instagram (limitado)
- Tenta usar `instagram-private-api` se credenciais estiverem configuradas
- Fallback para scraping básico via fetch se biblioteca não disponível
- Instagram bloqueia muitas tentativas de scraping, então resultados podem variar

### Formato da resposta
Ambas as tools retornam objetos com:
```javascript
{
  success: true/false,
  // ... dados específicos da plataforma
  message: "Mensagem de status"
}
```

---

## 🐛 Problemas Conhecidos

1. **Instagram requer autenticação** para extrair conteúdo completo
2. **Vídeos privados do YouTube** não funcionarão
3. **Vídeos sem legendas** retornarão erro
4. **Rate limiting**: Muitas requisições podem ser bloqueadas

---

## 📦 Estrutura dos Backups

Todos os backups criados durante a implementação:
- `js/tools.js.backup-[timestamp]` - Backup do arquivo original

Para listar todos os backups:
```bash
ls js/*.backup-*
```

---

## ✅ Checklist de Implementação

- [x] Ferramentas adicionadas ao `TOOL_REGISTRY`
- [x] Documentação no cabeçalho do arquivo atualizada
- [x] Dependências adicionadas ao `package.json`
- [x] Dependências instaladas via npm
- [x] Backup do arquivo original criado
- [x] Guia de uso e reversão documentado

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique o console do navegador (F12) para erros
2. Verifique se as dependências foram instaladas: `npm list youtube-transcript instagram-private-api`
3. Teste com um vídeo público do YouTube primeiro
4. Se necessário, reverta usando os backups criados

---

**Data de implementação:** 2026-05-25  
**Versão do Worion:** V2.2.1  
**Modo:** Reversível (backups disponíveis)
