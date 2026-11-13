import { defineConfig } from 'vitest/config'

// Testes das regras do Firestore. Precisam do emulador: npm run test:regras
export default defineConfig({
  test: {
    include: ['regras/**/*.test.js'],
    testTimeout: 20_000,
    fileParallelism: false,
  },
})
