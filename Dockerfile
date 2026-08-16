# Construye el frontend Vite
FROM node:lts-alpine AS build

WORKDIR /app

# Vite incorpora estas variables en el JavaScript durante el build.
# Railway las inyecta al Dockerfile únicamente cuando se declaran como ARG.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

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
