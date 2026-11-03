FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Development (docker-compose.dev.yml): dependencies only. The source is mounted
# over /app and served by `next dev`, so edits reload without a rebuild.
FROM node:22-alpine AS dev
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci && mkdir .next
EXPOSE 3001
# node_modules lives in a volume that outlives rebuilds; reinstall when it no
# longer matches package.json (e.g. after pulling a commit that adds a package).
CMD ["sh", "-c", "npm ls >/dev/null 2>&1 || npm ci; exec npm run dev"]

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG API_PROXY_TARGET=http://backend:8000
# Inlined into the browser bundle ("View website" link).
ARG NEXT_PUBLIC_SITE_URL=http://localhost:8080
ENV API_PROXY_TARGET=$API_PROXY_TARGET \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
