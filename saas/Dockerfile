FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat curl

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npx prisma generate

EXPOSE 3001
CMD ["npm", "start"]
