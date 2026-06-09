# Base sólida e leve
FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copiamos as dependências primeiro para otimizar o cache
COPY package*.json ./

# Instalamos apenas o necessário para produção
RUN npm install --production

# Agora sim, copiamos todo o código da nossa obra
COPY . .

# A porta que o Worion respira
EXPOSE 3766

# O comando que desperta a criatura
CMD ["node", "worion-api/server.js"]
