FROM node:22-slim
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Generate Prisma client
RUN chmod +x node_modules/.bin/prisma && npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
