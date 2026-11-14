import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // o Swagger UI (~1,5 MB) só carrega na página /api-docs/
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      // duas páginas: o app e a documentação das APIs (/api-docs/, pede login com Google)
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        apiDocs: resolve(import.meta.dirname, 'api-docs/index.html'),
      },
    },
  },
  test: {
    // testes de tela ficam em e2e/ e rodam com o Playwright
    include: ['src/**/*.test.{js,jsx}'],
  },
})
