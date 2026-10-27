FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node","dist/src/index.js"]
