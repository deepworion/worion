#!/bin/bash
# Script de reversão completa da feature de extração de vídeos

echo "🔄 Iniciando reversão da feature de extração de vídeos..."

# 1. Restaurar backups
if [ -f "js/tools.js.backup-20260525-203454" ]; then
    echo "📦 Restaurando tools.js..."
    cp js/tools.js.backup-20260525-203454 js/tools.js
    echo "✅ tools.js restaurado"
else
    echo "⚠️  Backup de tools.js não encontrado"
fi

# Encontrar e restaurar backup mais recente do chat.js
CHAT_BACKUP=$(ls -t js/chat.js.backup-* 2>/dev/null | head -1)
if [ -n "$CHAT_BACKUP" ]; then
    echo "📦 Restaurando chat.js de $CHAT_BACKUP..."
    cp "$CHAT_BACKUP" js/chat.js
    echo "✅ chat.js restaurado"
else
    echo "⚠️  Backup de chat.js não encontrado"
fi

# 2. Remover dependências
echo "📦 Removendo dependências npm..."
npm uninstall youtube-transcript instagram-private-api

# 3. Limpar arquivos de documentação (opcional)
read -p "❓ Deseja remover a documentação criada? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f VIDEO-EXTRACTION-README.md
    rm -f artifacts/test-video-extraction.md
    rm -f artifacts/ROLLBACK-VIDEO-EXTRACTION.sh
    echo "✅ Documentação removida"
fi

echo ""
echo "✅ Reversão concluída!"
echo "📋 Próximos passos:"
echo "   1. Reinicie o Worion: npm start"
echo "   2. Teste o chat normalmente"
echo ""
echo "ℹ️  Os backups originais foram mantidos em js/*.backup-*"
