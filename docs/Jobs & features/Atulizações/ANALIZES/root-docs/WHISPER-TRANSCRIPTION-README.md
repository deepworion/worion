# Transcrição de Áudio/Vídeo Local com OpenAI Whisper

## 📋 O que foi implementado

Nova ferramenta **`whisper_transcribe`** para transcrever arquivos de áudio/vídeo locais usando a API do OpenAI Whisper.

### ✨ Recursos

- ✅ **Transcreve arquivos locais** (não precisa ser URL)
- ✅ **Múltiplos formatos**: mp3, mp4, wav, m4a, webm, mpeg, mpga
- ✅ **Limite de 25MB** por arquivo (limitação da API do Whisper)
- ✅ **Suporte a múltiplos idiomas** (português, inglês, espanhol, etc)
- ✅ **Custo baixo**: ~$0.006 por minuto de áudio (~$0.36 por hora)
- ✅ **Metadados incluídos**: duração, idioma detectado, tamanho do arquivo

---

## 🎯 Como Usar

### Uso Básico

No chat do Worion, mencione o caminho do arquivo:

```
Transcreva este arquivo: C:\Users\User\Downloads\video.mp4
```

Ou use a sintaxe mais natural:

```
Baixei um vídeo em C:\Users\User\Downloads\palestra.mp4, pode transcrever?
```

### Uso Avançado

**Especificar idioma** (melhora precisão):
```
Transcreva C:\Users\User\Downloads\video.mp4 em português
```

**Com contexto** (ajuda a API entender termos técnicos):
```
Transcreva C:\Users\User\Downloads\podcast.mp3
Contexto: discussão sobre inteligência artificial e machine learning
```

---

## 📝 Exemplos

### Exemplo 1: Vídeo do YouTube baixado
```
Usuário: Baixei um vídeo do YouTube em C:\Users\User\Downloads\aula-python.mp4, 
         pode me dar a transcrição?

Worion: [usa whisper_transcribe automaticamente]
        ✅ Transcrição concluída! 
        Arquivo: aula-python.mp4 (15.3MB, 847s)
        
        [texto completo da transcrição...]
```

### Exemplo 2: Podcast de áudio
```
Usuário: Transcreva C:\Podcasts\episodio-042.mp3

Worion: [transcreve o áudio]
        ✅ Transcrição concluída!
        Arquivo: episodio-042.mp3 (8.7MB, 543s)
        
        [texto da transcrição...]
```

### Exemplo 3: Arquivo muito grande
```
Usuário: Transcreva C:\Videos\filme.mp4

Worion: ❌ Arquivo muito grande (127.5MB). 
        O limite da API do Whisper é 25MB.
        
        💡 Sugestão: Tente comprimir o arquivo ou cortar em partes 
        menores de 25MB cada.
```

---

## ⚙️ Configuração

### Pré-requisitos

✅ **API Key da OpenAI configurada no Supabase Vault**

A ferramenta busca automaticamente a chave da OpenAI do Supabase Vault (tabela `api_keys_vault_v2`, provider=`openai`).

Se você ainda não configurou:

1. Obtenha sua API key em: https://platform.openai.com/api-keys
2. Adicione ao Supabase Vault:
   ```sql
   INSERT INTO api_keys_vault_v2 (provider, value, store)
   VALUES ('openai', 'sk-...', 'worion');
   ```

### Dependências

- ✅ `openai` (npm package) - instalado automaticamente
- ✅ OpenAI API key no Supabase Vault

---

## 💰 Custos

A API do Whisper cobra por minuto de áudio:

| Duração | Custo Aproximado |
|---------|------------------|
| 1 minuto | $0.006 |
| 10 minutos | $0.06 |
| 1 hora | $0.36 |
| 10 horas | $3.60 |

**Exemplo prático:**
- Podcast de 45 minutos: ~$0.27
- Aula de 1h30: ~$0.54
- Palestra de 2 horas: ~$0.72

---

## 📏 Limitações

### Tamanho do arquivo: 25MB

Se seu arquivo for maior que 25MB:

**Opção 1: Comprimir vídeo** (reduz tamanho mantendo duração)
```bash
ffmpeg -i input.mp4 -b:v 500k -b:a 64k output.mp4
```

**Opção 2: Extrair apenas áudio** (reduz muito o tamanho)
```bash
ffmpeg -i video.mp4 -vn -b:a 64k audio.mp3
```

**Opção 3: Cortar em partes menores**
```bash
# Primeiros 10 minutos
ffmpeg -i input.mp4 -t 600 -c copy parte1.mp4

# Próximos 10 minutos
ffmpeg -i input.mp4 -ss 600 -t 600 -c copy parte2.mp4
```

### Formatos suportados

✅ **Suportados**: mp3, mp4, mpeg, mpga, m4a, wav, webm

❌ **Não suportados**: avi, mov, flv, wmv (converta antes)

Para converter:
```bash
ffmpeg -i video.avi video.mp4
```

---

## 🔧 Detalhes Técnicos

### Parâmetros da Tool

```javascript
{
  file_path: string,      // Caminho completo do arquivo (obrigatório)
  language: string,       // Código ISO-639-1: pt, en, es, etc (opcional)
  prompt: string          // Contexto para guiar transcrição (opcional)
}
```

### Resposta de Sucesso

```javascript
{
  success: true,
  file_path: "C:\\Users\\User\\video.mp4",
  file_name: "video.mp4",
  file_size_mb: "15.30",
  duration_seconds: 847,
  language: "pt",
  text: "transcrição completa...",
  message: "Transcrição concluída! ..."
}
```

### Resposta de Erro

```javascript
{
  success: false,
  error: "Mensagem do erro",
  suggestion: "Como resolver",
  file_path: "..."
}
```

---

## 🐛 Resolução de Problemas

### "OpenAI key não encontrada"

**Causa:** API key não está configurada no Supabase Vault.

**Solução:**
1. Obtenha a key em https://platform.openai.com/api-keys
2. Adicione ao Vault no Supabase

### "Arquivo não encontrado"

**Causa:** Caminho do arquivo está incorreto.

**Soluções:**
- Use caminho completo: `C:\Users\User\Downloads\video.mp4`
- Verifique se o arquivo realmente existe
- No Windows, use barras invertidas (`\`) ou duplas (`\\`)

### "Arquivo muito grande"

**Causa:** Arquivo excede 25MB (limite da API).

**Soluções:**
1. Comprima o arquivo
2. Extraia apenas áudio (geralmente <5MB para vídeos de 1h)
3. Corte em partes menores

### "Formato não suportado"

**Causa:** Arquivo em formato não aceito pela API.

**Solução:** Converta para mp3, mp4 ou wav usando FFmpeg:
```bash
ffmpeg -i input.avi output.mp4
```

---

## 📊 Comparação: YouTube vs Whisper

| Feature | YouTube Transcript | Whisper Local |
|---------|-------------------|---------------|
| Entrada | URL do YouTube | Arquivo local |
| Custo | ✅ Grátis | 💰 ~$0.006/min |
| Limite de tamanho | ❌ Nenhum | ⚠️ 25MB |
| Formatos | Apenas YouTube | Vários formatos |
| Qualidade | ✅ Alta (quando disponível) | ✅✅ Muito alta |
| Idiomas | Limitado às legendas | 99+ idiomas |
| Legendas necessárias | ✅ Sim | ❌ Não |
| Velocidade | ⚡ Rápido | ⚡⚡ Muito rápido |

**Recomendação:**
- **YouTube videos:** Use `youtube_transcript` (grátis)
- **Arquivos locais:** Use `whisper_transcribe` (pago mas preciso)
- **YouTube sem legendas:** Baixe o vídeo e use Whisper

---

## 🔄 Workflow Recomendado

### Para vídeos do YouTube:

1. **Tente primeiro** `youtube_transcript` (grátis)
2. **Se não tiver legendas:** Baixe com `yt-dlp` e use Whisper
3. **Para melhor qualidade:** Sempre use Whisper (mais preciso)

### Para arquivos locais:

1. **Verifique o tamanho:** Deve ser <25MB
2. **Se >25MB:** Extraia áudio ou comprima
3. **Transcreva** com Whisper
4. **Especifique o idioma** se souber (melhora precisão)

---

## 🆘 Precisa de Ajuda?

1. Verifique se a API key da OpenAI está configurada
2. Confirme que o arquivo existe e está acessível
3. Verifique o tamanho do arquivo (<25MB)
4. Tente converter para mp3 se estiver em formato exótico
5. Veja os logs do console para erros detalhados

---

## 📦 Arquivos Modificados

- `js/tools.js` - Adicionada tool `whisper_transcribe`
- `package.json` - Adicionada dependência `openai`
- Backup criado: `js/tools.js.backup-whisper-[timestamp]`

---

**Data de implementação:** 2026-05-26  
**Versão do Worion:** V2.2.2  
**Custo estimado:** $0.006/minuto  
**Status:** ✅ Produção
