FROM node:18-alpine

# Instalar herramientas para compilar dependencias nativas
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar manifiesto de dependencias
COPY package*.json ./

# Instalar dependencias nativamente en Linux
RUN npm install

# Copiar el resto del código
COPY . .

EXPOSE 3000

CMD ["node", "app.js"]