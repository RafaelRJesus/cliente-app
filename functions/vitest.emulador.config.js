import { defineConfig } from 'vitest/config'

// Mesmos testes da API, contra o emulador do Firestore (FIRESTORE_EMULATOR_HOST).
export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    env: { USAR_EMULADOR: '1' },
    testTimeout: 30_000,
    fileParallelism: false,
  },
})
