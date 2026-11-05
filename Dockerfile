FROM node:24-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci
COPY . .
# O build abre o banco padrão ao analisar as rotas; o site em produção usa o de /data.
RUN mkdir -p data && npm run build
ENV NODE_ENV=production
ENV PORT=3000
# Monte o disco persistente em /data: banco e arquivos ficam nele.
ENV DATABASE_URL=file:/data/vitrine.db
ENV STORAGE_LOCAL_DIR=/data/storage
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
