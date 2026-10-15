import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Proxy reverso: redireciona /api/svc-* para cada microsserviço
// Isso evita CORS em desenvolvimento e centraliza o roteamento
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/usuarios':    { target: process.env.VITE_API_USUARIOS    || 'http://localhost:8001', rewrite: p => p.replace(/^\/api\/usuarios/, ''),    changeOrigin: true },
      '/api/produtos':    { target: process.env.VITE_API_PRODUTOS    || 'http://localhost:8002', rewrite: p => p.replace(/^\/api\/produtos/, ''),    changeOrigin: true },
      '/api/estoque':     { target: process.env.VITE_API_ESTOQUE     || 'http://localhost:8003', rewrite: p => p.replace(/^\/api\/estoque/, ''),     changeOrigin: true },
      '/api/pedidos':     { target: process.env.VITE_API_PEDIDOS     || 'http://localhost:8004', rewrite: p => p.replace(/^\/api\/pedidos/, ''),     changeOrigin: true },
      '/api/pagamentos':  { target: process.env.VITE_API_PAGAMENTOS  || 'http://localhost:8005', rewrite: p => p.replace(/^\/api\/pagamentos/, ''),  changeOrigin: true },
      '/api/notificacoes':{ target: process.env.VITE_API_NOTIFICACOES|| 'http://localhost:8006', rewrite: p => p.replace(/^\/api\/notificacoes/, ''),changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
})
