FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci


FROM node:22-bookworm-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Build-time placeholders.
# Real secrets are passed at runtime through /opt/demos/infra/envs/real-estate.env
ENV OPENAI_API_KEY=build-time-placeholder
ENV OPENAI_TEXT_MODEL=gpt-5.1
ENV OPENAI_VISION_MODEL=gpt-5.1
ENV OPENAI_IMAGE_MODEL=gpt-image-1

ENV DATABASE_PATH=/app/data/real-estate.sqlite

ENV REAL_ESTATE_UPLOADS_PATH=/app/uploads
ENV REAL_ESTATE_UPLOADS_PUBLIC_PATH=/uploads

ENV ROOM_AI_DEFAULT_VARIANTS=3
ENV ROOM_AI_MAX_PHOTOS=5
ENV ROOM_AI_MAX_IMAGE_MB=15
ENV ROOM_AI_DEBUG=false

ENV ADMIN_EMAIL=admin@example.com

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["./node_modules/.bin/next", "start"]