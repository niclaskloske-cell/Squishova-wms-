# Mehrstufiger Build: das fertige Image enthaelt weder Quelltext noch
# Build-Werkzeuge, nur den lauffaehigen Server.

FROM node:22-alpine AS deps
# Prisma braucht auf Alpine openssl — ohne das findet es seine Engines nicht.
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build
# Den Seed zu einer eigenstaendigen JavaScript-Datei buendeln.
# Grund: seed.ts importiert aus src/, und src/ liegt nicht im fertigen Image —
# der standalone-Output enthaelt nur die uebersetzte Anwendung. Das Buendeln
# zieht den benoetigten Code mit hinein.
RUN npx esbuild prisma/seed.ts \
      --bundle --platform=node --target=node22 --format=cjs \
      --outfile=prisma/seed.cjs --external:@prisma/client

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# Nicht als root laufen lassen.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Der standalone-Output bringt nur die tatsaechlich benoetigten Module mit.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Schema und Migrationen.
COPY --from=builder /app/prisma ./prisma

# Vollstaendige node_modules statt einzelner Pakete.
#
# Der standalone-Output enthaelt nur, was die laufende Anwendung braucht — das
# Migrationswerkzeug und der Seed gehoeren nicht dazu. Deren Abhaengigkeiten
# einzeln herauszupicken ist eine Endlosschleife (@prisma/engines, effect, ...),
# deshalb hier bewusst alles. Kostet Platz, ist dafuer verlaesslich.
COPY --from=builder /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
