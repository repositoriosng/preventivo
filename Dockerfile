# Construye el frontend Vite
FROM node:lts-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build

# Sirve los archivos estáticos en el puerto asignado por Railway
FROM caddy:2-alpine

WORKDIR /app
COPY Caddyfile ./Caddyfile
RUN caddy fmt --overwrite Caddyfile
COPY --from=build /app/dist ./dist

CMD ["caddy", "run", "--config", "/app/Caddyfile", "--adapter", "caddyfile"]
