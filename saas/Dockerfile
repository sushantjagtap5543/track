FROM node:18-alpine

WORKDIR /app

# Install native dependencies required for building bcrypt and prisma
RUN apk add --no-cache make gcc g++ python3

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
