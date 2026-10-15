# Stage 1: build da aplicação React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
# Variáveis injetadas em build-time via ARG → VITE_ são embutidas no bundle
ARG VITE_API_USUARIOS=http://localhost:8001
ARG VITE_API_PRODUTOS=http://localhost:8002
ARG VITE_API_ESTOQUE=http://localhost:8003
ARG VITE_API_PEDIDOS=http://localhost:8004
ARG VITE_API_PAGAMENTOS=http://localhost:8005
ARG VITE_API_NOTIFICACOES=http://localhost:8006
ENV VITE_API_USUARIOS=$VITE_API_USUARIOS
ENV VITE_API_PRODUTOS=$VITE_API_PRODUTOS
ENV VITE_API_ESTOQUE=$VITE_API_ESTOQUE
ENV VITE_API_PEDIDOS=$VITE_API_PEDIDOS
ENV VITE_API_PAGAMENTOS=$VITE_API_PAGAMENTOS
ENV VITE_API_NOTIFICACOES=$VITE_API_NOTIFICACOES
RUN npm run build

# Stage 2: nginx serve os assets estáticos
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Certificado self-signed gerado no build: chave privada não vive no repositório.
# Em ambiente real, monte o certificado da CA em /etc/nginx/ssl via volume.
RUN apk add --no-cache openssl && mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
      -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
      -subj "/CN=localhost/O=ecom-lab" 2>/dev/null
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
