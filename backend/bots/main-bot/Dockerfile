FROM node:20-alpine

WORKDIR /app

# Устанавливаем curl для health checks
RUN apk add --no-cache curl

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm cache clean --force && \
    npm install --no-audit --no-fund --prefer-offline || \
    npm install --no-audit --no-fund --force

# Копируем исходный код
COPY . .

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S telegram && \
    adduser -S telegram -u 1001

# Создаем директорию для логов
RUN mkdir -p logs && chown -R telegram:telegram logs

# Переключаемся на непривилегированного пользователя
USER telegram

# Запускаем бота
CMD ["node", "index.js"]