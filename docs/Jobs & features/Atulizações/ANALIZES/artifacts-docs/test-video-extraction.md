# Teste de Extração de Conteúdo de Vídeos

## Como testar no Worion

### Teste 1: YouTube (Simples)
No chat, digite:

```
Extraia a transcrição deste vídeo do YouTube: https://www.youtube.com/watch?v=jNQXAC9IVRw
```

O Worion deve automaticamente detectar a URL do YouTube e usar a tool `youtube_transcript`.

### Teste 2: YouTube (Com idioma específico)
```
Extraia a transcrição em inglês deste vídeo: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### Teste 3: Instagram (Limitado)
```
Extraia o conteúdo deste post do Instagram: https://www.instagram.com/p/ABC123/
```

**Nota:** Instagram pode não funcionar completamente sem credenciais configuradas.

---

## URLs de teste públicas

### YouTube
- Tutorial: `https://www.youtube.com/watch?v=jNQXAC9IVRw`
- Música: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Talk: `https://www.youtube.com/watch?v=8pTEmbeENF4`

### Instagram
- Qualquer post público do Instagram
- Formato: `https://www.instagram.com/p/[POST_ID]/`

---

## Verificação técnica

### Console do navegador (F12):

```javascript
// Verificar se as tools foram registradas
console.log('Tools de vídeo:', Object.keys(TOOL_REGISTRY).filter(k => 
  k.includes('youtube') || k.includes('instagram')
));

// Testar a tool diretamente
await TOOL_REGISTRY.youtube_transcript.execute({
  url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  language: 'pt'
});
```

---

## Resultados esperados

### YouTube (sucesso)
```javascript
{
  success: true,
  videoId: "jNQXAC9IVRw",
  language: "pt",
  fullText: "texto completo da transcrição...",
  timestampedText: "[0:00] Primeiro segmento\n[0:05] Segundo segmento...",
  segmentCount: 50,
  message: "Transcrição extraída com sucesso! 50 segmentos encontrados."
}
```

### YouTube (falha - sem legendas)
```javascript
{
  success: false,
  error: "Nenhuma transcrição disponível para este vídeo",
  videoId: "..."
}
```

### Instagram (sem credenciais)
```javascript
{
  success: false,
  error: "Extração do Instagram requer configuração de credenciais",
  message: "Para usar esta ferramenta, configure as credenciais...",
  alternative: "Use a ferramenta fetch_url..."
}
```

---

## Troubleshooting

### Erro: "Cannot find module 'youtube-transcript'"
**Solução:** Execute `npm install` na raiz do projeto

### YouTube não retorna transcrição
**Possíveis causas:**
1. Vídeo não tem legendas disponíveis
2. Vídeo é privado ou restrito
3. URL inválida

### Instagram sempre falha
**Esperado:** Instagram requer configuração adicional de credenciais no `.env`
