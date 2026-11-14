FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next-app/standalone ./
COPY --from=build --chown=node:node /app/.next-app/static ./.next-app/static
COPY --from=build --chown=node:node /app/database ./database
COPY --from=build --chown=node:node /app/scripts/transfer.mjs ./scripts/transfer.mjs
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups
USER node
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server.js"]
