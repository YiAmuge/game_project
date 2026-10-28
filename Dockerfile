FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --cache /tmp/npm-cache && rm -rf /tmp/npm-cache
COPY index.html ./
COPY src ./src
COPY scripts ./scripts
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "scripts/serve.mjs"]
