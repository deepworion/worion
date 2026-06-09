# Instruções: Ativar Model Router

**Data:** 2026-05-23  
**Status:** CORREÇÃO APLICADA

---

## 🔧 Correções Aplicadas

1. ✅ Variável `WORION_MODEL_ROUTER_ENABLED=true` adicionada ao `.env`
2. ✅ Logs de debug adicionados ao `model-router.js` e `chat.js`
3. ✅ Script de teste `test-env.js` criado

---

## 📋 Passos para Ativar

### Opção 1: Usar o arquivo `.env` (RECOMENDADO)

**A variável já foi adicionada ao `.env` automaticamente.**

1. **Verificar se `.env` existe:**
   ```powershell
   Get-Content .env | Select-String "MODEL_ROUTER"
   ```

   **Saída esperada:**
   ```
   WORION_MODEL_ROUTER_ENABLED=true
   ```

2. **Se a linha não aparecer, adicionar manualmente:**
   ```powershell
   Add-Content .env "`nWORION_MODEL_ROUTER_ENABLED=true"
   ```

3. **Reiniciar o Worion:**
   - Feche o aplicativo completamente (Ctrl+Q ou fechar janela)
   - Inicie novamente: `npm start`

---

### Opção 2: Configurar via PowerShell (TEMPORÁRIO - só vale para a sessão atual)

```powershell
# Definir variável
$env:WORION_MODEL_ROUTER_ENABLED="true"

# Verificar
echo $env:WORION_MODEL_ROUTER_ENABLED

# Iniciar Worion
npm start
```

**⚠️ Atenção:** Esta configuração é temporária. Quando fechar o PowerShell, a variável é perdida. Use a Opção 1 para configuração permanente.

---

## 🧪 Testes de Verificação

### Teste 1: Verificar Variável de Ambiente

```powershell
node test-env.js
```

**Saída esperada:**
```
=== TESTE DE VARIÁVEIS DE AMBIENTE ===

1. process.env existe? true
2. WORION_MODEL_ROUTER_ENABLED: true
3. Valor === "true"? true

=== OUTRAS VARIÁVEIS WORION ===

WORION_MODEL_ROUTER_ENABLED: CONFIGURADA
WORION_VAULT_SUPABASE_URL: CONFIGURADA
WORION_MEMORY_SUPABASE_URL: CONFIGURADA
...

=== TESTE CONCLUÍDO ===
```

**❌ Se aparecer `undefined` ou `false`:**
- O `.env` não está sendo lido
- Siga os passos da Opção 1 novamente

---

### Teste 2: Verificar Logs de Inicialização

Após iniciar o Worion (`npm start`), abra o DevTools (F12) e procure no console:

**Log esperado no carregamento:**
```
[MODEL ROUTER] Inicialização: {
  enabled: true,
  envValue: 'true',
  processEnvExists: true
}
```

**❌ Se aparecer `enabled: false`:**
- A variável não está configurada corretamente
- Execute `node test-env.js` para diagnosticar

---

### Teste 3: Verificar Seleção de Modelos

Envie mensagens de diferentes tipos e observe os logs:

#### 3.1 Teste: Código

**Mensagem:**
```
Como faço para corrigir esse erro no JavaScript?
```

**Log esperado:**
```
[MODEL ROUTER DEBUG] {
  selectedRuntimeModel: null,
  hasSelectFunc: true,
  hasIsEnabledFunc: true,
  isEnabled: true
}

[MODEL ROUTER] Seleção: {
  model: 'deepseek-v4-pro',
  reason: 'code-debug',
  confidence: 0.85
}

[MODEL ROUTER] {
  selected: 'deepseek-v4-pro',
  reason: 'code-debug',
  confidence: 0.85,
  provider: 'deepseek',
  specialty: 'reasoning-code',
  message: 'Como faço para corrigir esse erro no JavaScript?'
}
```

---

#### 3.2 Teste: Comparação

**Mensagem:**
```
Compare Helena Blavatsky e Bashar
```

**Log esperado:**
```
[MODEL ROUTER] Seleção: {
  model: 'gpt-4o',
  reason: 'deep-analysis',
  confidence: 0.8
}
```

---

#### 3.3 Teste: Resumo

**Mensagem:**
```
Resuma esse texto em 3 frases
```

**Log esperado:**
```
[MODEL ROUTER] Seleção: {
  model: 'claude-3-5-haiku',
  reason: 'summary-fast',
  confidence: 0.75
}
```

---

#### 3.4 Teste: Opinião

**Mensagem:**
```
Qual é a sua opinião sobre gatos?
```

**Log esperado:**
```
[MODEL ROUTER] Seleção: {
  model: 'gpt-4o-mini',
  reason: 'route:opinion',
  confidence: 1.0
}
```

---

## 🐛 Diagnóstico de Problemas

### Problema 1: Nenhum log `[MODEL ROUTER]` aparece

**Causa:** O arquivo `model-router.js` não está sendo carregado.

**Solução:**
1. Verificar se `index.html` contém:
   ```html
   <script src="js/model-router.js"></script>
   ```

2. Verificar se o arquivo existe:
   ```powershell
   Test-Path js\model-router.js
   ```

3. Reiniciar completamente o Worion.

---

### Problema 2: Log mostra `enabled: false`

**Causa:** A variável de ambiente não está sendo lida.

**Solução:**
1. Executar `node test-env.js`
2. Verificar se a saída mostra `WORION_MODEL_ROUTER_ENABLED: true`
3. Se não, adicionar novamente ao `.env`:
   ```powershell
   Add-Content .env "`nWORION_MODEL_ROUTER_ENABLED=true"
   ```

---

### Problema 3: Log mostra `hasSelectFunc: false`

**Causa:** A função `selectModelForMessage` não foi exportada corretamente.

**Solução:**
1. Verificar se `js/model-router.js` existe
2. Verificar se contém a exportação no final:
   ```javascript
   if (typeof window !== 'undefined') {
     window.selectModelForMessage = selectModelForMessage;
     window.isModelRouterEnabled = isModelRouterEnabled;
   }
   ```

---

### Problema 4: Modelo nunca varia (sempre `deepseek-v4-pro`)

**Causa possível 1:** Agente ativo tem modelo fixo configurado.

**Solução:**
- Verificar se `selectedRuntimeModel` é `null` no log DEBUG
- Se não for `null`, o agente está forçando um modelo específico
- Testar com agente padrão (sem modelo específico)

**Causa possível 2:** Roteador está desabilitado.

**Solução:**
- Verificar se `isEnabled: true` no log DEBUG
- Se `false`, verificar `.env` novamente

---

## ✅ Checklist de Validação

Marque cada item após verificar:

- [ ] **Variável de ambiente configurada**
  ```powershell
  node test-env.js
  # Deve mostrar: WORION_MODEL_ROUTER_ENABLED: true
  ```

- [ ] **Log de inicialização aparece**
  ```
  [MODEL ROUTER] Inicialização: { enabled: true, ... }
  ```

- [ ] **Log DEBUG aparece ao enviar mensagem**
  ```
  [MODEL ROUTER DEBUG] { ... }
  ```

- [ ] **Log de seleção aparece**
  ```
  [MODEL ROUTER] Seleção: { model: '...', reason: '...', ... }
  ```

- [ ] **Modelo varia entre perguntas**
  - Código → `deepseek-v4-pro`
  - Comparação → `gpt-4o`
  - Resumo → `claude-3-5-haiku`
  - Opinião → `gpt-4o-mini`

---

## 📞 Próximos Passos

1. **Fechar o Worion completamente**
2. **Executar teste de variável:**
   ```powershell
   node test-env.js
   ```
3. **Iniciar o Worion:**
   ```powershell
   npm start
   ```
4. **Abrir DevTools (F12)**
5. **Procurar log de inicialização:**
   ```
   [MODEL ROUTER] Inicialização: { enabled: true, ... }
   ```
6. **Enviar mensagem de teste:**
   ```
   Como faço para corrigir esse erro no JavaScript?
   ```
7. **Verificar logs:**
   - `[MODEL ROUTER DEBUG]`
   - `[MODEL ROUTER] Seleção:`
   - `[MODEL ROUTER] { selected: '...', ... }`

---

## 📊 Arquivos Modificados

1. ✅ `.env` - Variável `WORION_MODEL_ROUTER_ENABLED=true` adicionada
2. ✅ `js/model-router.js` - Log de inicialização adicionado
3. ✅ `js/chat.js` - Logs de debug adicionados
4. ✅ `test-env.js` - Script de teste criado
5. ✅ `INSTRUCOES-MODEL-ROUTER.md` - Este arquivo (instruções)

---

**Se após seguir todos os passos o problema persistir, envie:**
1. Saída completa de `node test-env.js`
2. Print dos logs do DevTools ao iniciar o Worion
3. Print dos logs ao enviar uma mensagem de teste

**Versão:** 1.1 (com correções)  
**Data:** 2026-05-23
