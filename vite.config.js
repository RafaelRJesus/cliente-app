import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // testes de tela ficam em e2e/ e rodam com o Playwright
    include: ['src/**/*.test.{js,jsx}'],
  },
})
