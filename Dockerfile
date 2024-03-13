
FROM node:latest

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY app/ ./
COPY opentelemetry/proto ./opentelemetry/proto
COPY .env ./

EXPOSE 8085

CMD ["node", "index.js"]
