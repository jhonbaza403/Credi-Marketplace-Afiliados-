import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const sourceRoots = [path.join(root, 'src'), path.join(root, 'scripts')]
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const ignored = new Set(['node_modules', '.next', '.git'])
const declared = new Set()
const used = new Set()
function walk(dir) { if (!fs.existsSync(dir)) return; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { if (ignored.has(entry.name)) continue; const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (extensions.has(path.extname(entry.name))) scan(full) } }
function scan(file) { const text = fs.readFileSync(file, 'utf8'); for (const match of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) used.add(match[1]); for (const match of text.matchAll(/process\.env\[['\"]([A-Z][A-Z0-9_]+)['\"]\]/g)) used.add(match[1]) }
for (const rootDir of sourceRoots) walk(rootDir)
const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8')
for (const line of example.split(/\r?\n/)) { const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/); if (match) declared.add(match[1]) }
const allowlist = new Set(['NODE_ENV','CI','VERCEL','VERCEL_ENV','VERCEL_URL','NEXT_RUNTIME','NEXT_PHASE','NEXT_TELEMETRY_DISABLED'])
const missing = [...used].filter((name) => !declared.has(name) && !allowlist.has(name)).sort()
console.log('=== Credi environment contract ===')
console.log('Used variables:', used.size)
console.log('Declared in .env.example:', declared.size)
console.log('Missing declarations:', missing.length)
if (missing.length) { console.error('\nVariables used in source but absent from .env.example:'); for (const name of missing) console.error('-', name); process.exit(1) }
console.log('Environment contract: PASSED')