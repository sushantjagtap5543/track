# Stage 1: Build
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate

# Stage 2: Runtime
FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat curl
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY . .

# Security: Run as non-root
USER node

EXPOSE 3001
CMD ["npm", "start"]
