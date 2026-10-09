# syntax=docker/dockerfile:1.7
#
# Targets:
#   runner  (default) the Next.js standalone server, ~200 MB, runs as non-root
#   migrate           prisma migrate deploy, plus the seed and admin scripts
#
#   docker build -t devops-tutor .
#   docker build --target migrate -t devops-tutor-migrate .

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# CA bundle for verifying Amazon RDS TLS certificates
FROM base AS certs
ADD --chmod=644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /certs/rds-global-bundle.pem

FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# postinstall runs prisma generate, which only needs the schema
RUN --mount=type=cache,target=/root/.npm npm ci

FROM base AS build
ARG APP_VERSION=dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM base AS migrate
ENV NODE_ENV=production \
    NODE_EXTRA_CA_CERTS=/app/certs/rds-global-bundle.pem
COPY --from=certs /certs ./certs
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts ./scripts
# Host-side deploy scripts travel with the image they deploy (see deploy.yml)
COPY deploy ./deploy
COPY --from=build /app/src/generated ./src/generated
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ARG APP_VERSION=dev
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_VERSION=${APP_VERSION} \
    NODE_EXTRA_CA_CERTS=/app/certs/rds-global-bundle.pem
COPY --from=certs /certs ./certs
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
