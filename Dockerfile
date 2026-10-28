
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client using the project's Prisma 7 configuration.
RUN npx prisma generate

# Compile the NestJS application.
RUN npm run build


FROM node:24-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]