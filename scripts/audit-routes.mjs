import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const APP = path.join(ROOT, 'src', 'app')
const SRC = path.join(ROOT, 'src')
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (EXT.has(path.extname(e.name))) out.push(p)
  }
  return out
}

function normalize(value) {
  return value.replace(/\\/g, '/').replace(/\/+/g, '/').split('?')[0].split('#')[0].replace(/\/$/, '') || '/'
}

function apiRoute(file) {
  const rel = path.relative(APP, file).replace(/\\/g, '/')
  if (!rel.startsWith('api/')) return null
  const parts = rel.split('/')
  if (!['route.ts', 'route.js'].includes(parts.at(-1))) return null
  parts.pop()
  return normalize('/' + parts.join('/'))
}

function methods(file) {
  const text = fs.readFileSync(file, 'utf8')
  return [...new Set([...text.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)].map(m => m[1]))]
}

function matches(actual, route) {
  const a = actual.split('/').filter(Boolean)
  const r = route.split('/').filter(Boolean)
  return a.length === r.length && r.every((x, i) => x.startsWith('[') || x === a[i])
}

const files = walk(APP)
const source = walk(SRC)
const routes = new Map()
for (const file of files) { const route = apiRoute(file); if (route) routes.set(route, methods(file)) }
const refs = []
const missing = []
const mismatches = []
const dynamic = []
const fetchRe = /fetch\s*\(\s*(['"])(\/api\/[^'"]+)\1\s*(?:,\s*\{([\s\S]{0,1600})\})?/g

for (const file of source) {
  const text = fs.readFileSync(file, 'utf8')
  for (const m of text.matchAll(fetchRe)) {
    const route = normalize(m[2])
    const method = (m[3]?.match(/\bmethod\s*:\s*['"]([A-Za-z]+)['"]/)?.[1] || 'GET').toUpperCase()
    refs.push({ route, method, file: path.relative(ROOT, file) })
    if (route.includes('${')) { dynamic.push({ route, file: path.relative(ROOT, file) }); continue }
    const entry = [...routes.entries()].find(([r]) => matches(route, r))
    if (!entry) missing.push({ route, file: path.relative(ROOT, file) })
    else if (!METHODS.has(method) || !entry[1].includes(method)) mismatches.push({ route, method, allowed: entry[1], file: path.relative(ROOT, file) })
  }
}

console.log('=== Credi Marketplace API Contract Audit ===')
console.log('API routes: ' + routes.size)
console.log('Static fetch contracts: ' + refs.length)
console.log('Missing endpoints: ' + missing.length)
console.log('HTTP method mismatches: ' + mismatches.length)
console.log('Dynamic API references: ' + dynamic.length)
for (const x of missing) console.error('- MISSING ' + x.route + ' <- ' + x.file)
for (const x of mismatches) console.error('- METHOD ' + x.method + ' ' + x.route + ' <- ' + x.file + ' (allowed: ' + x.allowed.join(', ') + ')')
if (dynamic.length) for (const x of dynamic) console.warn('- DYNAMIC ' + x.route + ' <- ' + x.file)
if (missing.length || mismatches.length) process.exit(1)
console.log('API contract audit: PASSED')
