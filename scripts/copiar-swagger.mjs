// Copia o Swagger UI do node_modules para public/api-docs/vendor, para a
// página da documentação não depender de CDN. Roda antes do dev e do build.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const origem = dirname(require.resolve('swagger-ui-dist/package.json'))
const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'api-docs', 'vendor')

mkdirSync(destino, { recursive: true })
for (const arquivo of ['swagger-ui.css', 'swagger-ui-bundle.js']) {
  copyFileSync(join(origem, arquivo), join(destino, arquivo))
}
