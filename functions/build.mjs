// Empacota a função com o código compartilhado de ../src/lib (o deploy só envia functions/).
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.js'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
})
