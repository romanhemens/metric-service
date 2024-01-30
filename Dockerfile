
FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY app/ ./

EXPOSE 8085

CMD ["node", "index.js"]
