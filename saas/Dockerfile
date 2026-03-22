FROM node:18

WORKDIR /app

# Install native dependencies required for building bcrypt
RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Generate Prisma client
RUN chmod +x node_modules/.bin/prisma && npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
