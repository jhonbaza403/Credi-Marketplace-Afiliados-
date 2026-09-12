import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const APP = path.join(SRC, 'app')

const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const ROUTE_REFERENCE = /(?:href\s*=\s*[{(]?\s*['\"](\/[^'\"?#]*)|(?:router\.(?:push|replace)|redirect|permanentRedirect|window\.location\.(?:assign|replace))\s*\(\s*['\"](\/[^'\"?#]*)|fetch\s*\(\s*['\"](\/api\/[^'\"?#]*)/g

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) continue
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(target, files)
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) files.push(target)
  }
  return files
}

function normalizeRoute(value) {
  const clean = value.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/'
  return clean
    .split('/')
    .filter(Boolean)
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .map((segment) => {
      if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return `:${segment.slice(4, -1)}*`
      if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) return `:${segment.slice(5, -2)}*?`
      if (/^\[[^\]]+\]$/.test(segment)) return `:${segment.slice(1, -1)}`
      return segment
    })
    .join('/')
    .replace(/\*\??$/, (suffix) => suffix)
    .replace(/^/, '/')
}

function routeFromPageFile(file) {
  const rel = path.relative(APP, file).replace(/\\/g, '/')
  const parts = rel.split('/')
  if (parts.at(-1) !== 'page.tsx' && parts.at(-1) !== 'page.ts' && parts.at(-1) !== 'page.jsx' && parts.at(-1) !== 'page.js') return null
  parts.pop()
  return normalizeRoute(parts.join('/'))
}

function apiFromRouteFile(file) {
  const rel = path.relative(APP, file).replace(/\\/g, '/')
  if (!rel.startsWith('api/')) return null
  const parts = rel.split('/')
  if (parts.at(-1) !== 'route.ts' && parts.at(-1) !== 'route.js') return null
  parts.pop()
  return normalizeRoute(parts.join('/'))
}

const pageFiles = walk(APP)
const sourceFiles = walk(SRC)
const routes = new Set()
const apis = new Set()

for (const file of pageFiles) {
  const route = routeFromPageFile(file)
  if (route) routes.add(route)
  const api = apiFromRouteFile(file)
  if (api) apis.add(api)
}

const refs = new Map()
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(ROUTE_REFERENCE)) {
    const value = match[1] || match[2] || match[3]
    if (!value) continue
    const normalized = normalizeRoute(value)
    const map = refs.get(normalized) ?? []
    map.push(path.relative(ROOT, file))
    refs.set(normalized, map)
  }
}

function matchesDynamic(target, available) {
  if (available.has(target)) return true
  const parts = target.split('/').filter(Boolean)
  for (const candidate of available) {
    const c = candidate.split('/').filter(Boolean)
    if (c.length !== parts.length) continue
    let ok = true
    for (let i = 0; i < parts.length; i++) {
      if (c[i].startsWith(':')) continue
      if (c[i] !== parts[i]) { ok = false; break }
    }
    if (ok) return true
  }
  return false
}

const missing = []
for (const [route, files] of refs) {
  const isApi = route === '/api' || route.startsWith('/api/')
  if ((isApi ? apis : routes).size === 0) continue
  if (!matchesDynamic(route, isApi ? apis : routes)) {
    missing.push({ route, files })
  }
}

const duplicateRoutes = [...routes].filter((route) => {
  const count = pageFiles.filter((file) => routeFromPageFile(file) === route).length
  return count > 1
})

console.log('=== Credi Marketplace Route/API Audit ===')
console.log(`Pages discovered: ${routes.size}`)
console.log(`API routes discovered: ${apis.size}`)
console.log(`Static route references: ${refs.size}`)
console.log(`Missing references: ${missing.length}`)
console.log(`Duplicate canonical routes: ${duplicateRoutes.length}`)

if (missing.length) {
  console.error('\nMissing references:')
  for (const item of missing) {
    console.error(`- ${item.route} <- ${item.files.join(', ')}`)
  }
}
if (duplicateRoutes.length) {
  console.error('\nDuplicate canonical routes:')
  for (const route of duplicateRoutes) console.error(`- ${route}`)
}

if (missing.length || duplicateRoutes.length) process.exit(1)
console.log('\nRoute/API audit: PASSED')
