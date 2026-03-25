FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Generate Prisma client
RUN chmod +x node_modules/.bin/prisma && npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
