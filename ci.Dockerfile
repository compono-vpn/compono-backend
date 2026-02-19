FROM node:24.13-alpine AS backend-build
WORKDIR /opt/app

ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x,linux-musl-arm64-openssl-3.0.x

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY patches ./patches

RUN npm ci

COPY . .

RUN npm run migrate:generate

RUN npm run build

RUN npm cache clean --force

RUN npm prune --omit=dev

FROM node:24.13-alpine
WORKDIR /opt/app

ARG GIT_HASH=unknown

RUN apk add --no-cache mimalloc curl
ENV LD_PRELOAD=/usr/lib/libmimalloc.so

ENV PRISMA_HIDE_UPDATE_MESSAGE=true
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

ENV PM2_DISABLE_VERSION_CHECK=true
ENV NODE_OPTIONS="--max-old-space-size=16384"

ENV GIT_HASH=${GIT_HASH}
ENV DISABLE_FRONTEND=true

COPY --from=backend-build /opt/app/dist ./dist
COPY --from=backend-build /opt/app/prisma ./prisma
COPY --from=backend-build /opt/app/patches ./patches
COPY --from=backend-build /opt/app/node_modules ./node_modules

COPY configs /var/lib/remnawave/configs
COPY package*.json ./
COPY prisma.config.ts ./prisma.config.ts
COPY libs ./libs

COPY ecosystem.config.js ./
COPY docker-entrypoint.sh ./

RUN npm install pm2 -g \
    && npm link

ENTRYPOINT [ "/bin/sh", "docker-entrypoint.sh" ]

CMD [ "pm2-runtime", "start", "ecosystem.config.js", "--env", "production" ]
