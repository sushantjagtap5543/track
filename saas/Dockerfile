FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps
RUN npx prisma generate

COPY . .

# Generate Prisma client
RUN chmod +x node_modules/.bin/prisma && npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
