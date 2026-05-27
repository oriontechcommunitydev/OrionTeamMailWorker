// Proje kökünde build-server.mjs oluştur
// Bu script server/index.ts'i CommonJS olarak derler

import { build } from 'esbuild'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: [resolve(__dirname, 'server/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: resolve(__dirname, 'server.cjs'),
  external: [
    'express',
    'cors',
    '@supabase/supabase-js',
    'axios',
    'zod',
  ],
})

console.log('✅ server.cjs oluşturuldu')

