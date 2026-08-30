import { existsSync } from 'node:fs'

const required = [
  'package.json',
  'next.config.ts',
  'tsconfig.json',
  'eslint.config.mjs',
  'postcss.config.mjs',
  '.nvmrc',
  'src/app/layout.tsx',
  'src/app/globals.css',
  'src/proxy.ts',
  'supabase/config.toml',
]

const missing = required.filter((file) => !existsSync(file))
if (missing.length) {
  console.error(`Missing required files:\n${missing.join('\n')}`)
  process.exit(1)
}

console.log('Credi Marketplace structural verification passed.')
