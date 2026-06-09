# Configuração do Instagram - Guia Completo

## ⚠️ Importante: Instagram tem limitações

O Instagram **bloqueia** acesso automatizado por padrão. Diferente do YouTube (que funciona sem login), o Instagram requer autenticação.

---

## 🎯 Suas Opções

### **Opção 1: Copiar manualmente** ⭐ RECOMENDADO
- Abra o post no Instagram
- Copie o texto/caption
- Cole no chat do Worion
- **Prós:** Simples, seguro, sempre funciona
- **Contras:** Manual

### **Opção 2: Configurar credenciais** ⚙️ Automático
- Configure uma conta secundária do Instagram
- O Worion extrai automaticamente
- **Prós:** Automático, funciona com URLs
- **Contras:** Risco de bloqueio, precisa manutenção

### **Opção 3: Fallback básico** 🔄 Limitado
- Scraping básico (já está ativo)
- Funciona apenas para posts públicos
- Taxa de sucesso: ~30-40%
- **Prós:** Não precisa configurar nada
- **Contras:** Muito limitado, pode falhar

---

## 🔧 Opção 2: Como Configurar (Detalhado)

### Passo 1: Criar conta secundária (RECOMENDADO)

⚠️ **NÃO use sua conta principal!** Instagram pode bloquear contas que fazem muitas requisições automatizadas.

1. Crie uma nova conta no Instagram
2. Use um email diferente (ex: `worion.bot@gmail.com`)
3. Complete o perfil básico
4. Aguarde 24-48h antes de usar (contas novas são mais suspeitas)

### Passo 2: Adicionar credenciais no `.env`

1. **Abra o arquivo `.env`** na raiz do projeto Worion
2. **Adicione as linhas:**

```bash
# Instagram Content Extraction
IG_USERNAME=sua_conta_secundaria
IG_PASSWORD=sua_senha_secundaria
```

3. **Salve o arquivo**
4. **Reinicie o Worion:** `npm start`

### Passo 3: Testar

```
Extraia o conteúdo deste post: https://www.instagram.com/p/ABC123/
```

---

## 🛡️ Segurança e Limitações

### ⚠️ Riscos

1. **Bloqueio de conta:**
   - Instagram detecta uso automatizado
   - Pode suspender temporariamente ou permanentemente
   - Por isso: **USE CONTA SECUNDÁRIA!**

2. **Rate limiting:**
   - Instagram limita requisições por hora/dia
   - Muitos pedidos = bloqueio temporário
   - Recomendado: Max 20-30 posts por dia

3. **Autenticação 2FA:**
   - Se a conta tem 2FA ativo, pode não funcionar
   - Recomendado: Desative 2FA na conta secundária

### ✅ Boas Práticas

1. **Use conta secundária dedicada**
2. **Não extraia muitos posts seguidos** (aguarde 1-2min entre cada)
3. **Mantenha a conta ativa manualmente** (faça login manual às vezes)
4. **Monitore por mensagens do Instagram** (avisos de atividade suspeita)

---

## 🔍 O que é extraído

Quando funciona, você recebe:

```json
{
  "caption": "Texto do post...",
  "author": "@usuario",
  "likes": 1234,
  "comments": [
    { "user": "@fulano", "text": "Comentário..." },
    ...
  ]
}
```

**Com `include_comments: true`:**
- Top 10 comentários do post

**Sem credenciais (fallback):**
- Apenas caption (quando disponível)
- Taxa de sucesso baixa (~30%)

---

## 🧪 Exemplos de Uso

### Exemplo 1: Básico
```
Extraia o conteúdo deste post: https://www.instagram.com/p/ABC123/
```

### Exemplo 2: Com comentários (se configurado)
```
Extraia o post com comentários: https://www.instagram.com/p/ABC123/
```
(Nota: Ainda não implementado no UI, apenas via tool direta)

### Exemplo 3: Reel
```
Extraia o conteúdo deste reel: https://www.instagram.com/reel/XYZ789/
```

---

## ❌ Erros Comuns

### "Credenciais do Instagram não configuradas"
**Solução:** Adicione `IG_USERNAME` e `IG_PASSWORD` no `.env`

### "Login failed"
**Possíveis causas:**
- Senha incorreta
- Conta tem 2FA ativo
- Instagram bloqueou login de "local suspeito"
- Conta muito nova (aguarde 24-48h)

**Solução:**
1. Faça login manual no navegador
2. Confirme qualquer verificação de segurança
3. Tente novamente no Worion

### "Challenge required"
Instagram quer verificação adicional (código SMS, email, etc.)

**Solução:**
1. Faça login manual no navegador
2. Complete a verificação
3. Aguarde algumas horas
4. Tente novamente no Worion

---

## 🔄 Alternativas

### 1. Copiar manualmente (mais fácil)
Sinceramente, para uso ocasional, **copiar o texto manualmente** é mais prático e seguro.

### 2. Usar API oficial do Instagram
Se você tem um aplicativo registrado no Meta/Facebook Developers:
- Crie um app no Meta for Developers
- Obtenha token de acesso
- Use a Graph API oficial
- **Muito mais seguro**, mas requer setup complexo

### 3. Serviços terceiros
Existem APIs pagas que fazem scraping do Instagram:
- RapidAPI Instagram endpoints
- Apify Instagram scrapers
- **Pago**, mas mais confiável

---

## 📊 Comparação: Instagram vs YouTube

| Feature | YouTube | Instagram |
|---------|---------|-----------|
| Requer login | ❌ Não | ✅ Sim |
| Taxa de sucesso | ~95% | ~40% (sem login), ~80% (com login) |
| Risco de bloqueio | ❌ Nenhum | ⚠️ Alto |
| Configuração | Nenhuma | Conta + senha |
| Recomendação | ✅ Use sempre | ⚠️ Use com cautela |

---

## 💡 Recomendação Final

**Para uso casual:** Copie e cole manualmente o texto dos posts.

**Para uso frequente:** Configure conta secundária e monitore por bloqueios.

**Para produção:** Use a API oficial do Instagram ou serviço terceiro pago.

---

## 🆘 Precisa de ajuda?

Se você optar por configurar as credenciais e encontrar problemas:

1. Verifique o console do Worion para erros detalhados
2. Confirme que `.env` está na raiz do projeto
3. Confirme que as credenciais estão corretas
4. Tente fazer login manual no navegador primeiro
5. Se persistir, volte para cópia manual (Opção 1)

---

**Última atualização:** 2026-05-25  
**Status da feature:** ⚠️ Beta - use com cautela
