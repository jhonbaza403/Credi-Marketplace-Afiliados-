import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const APP = path.join(SRC, 'app')
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

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
  return '/' + clean.split('/').filter(Boolean).filter((segment) => !/^\(.+\)$/.test(segment)).map((segment) => {
    if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return ':' + segment.slice(4, -1) + '*'
    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) return ':' + segment.slice(5, -2) + '*?'
    if (/^\[[^\]]+\]$/.test(segment)) return ':' + segment.slice(1, -1)
    return segment
  }).join('/')
}

function routeFromPageFile(file) {
  const rel = path.relative(APP, file).replace(/\\/g, '/')
  const parts = rel.split('/')
  if (!/^page\.(tsx?|jsx?)$/.test(parts.at(-1) ?? '')) return null
  parts.pop()
  return normalizeRoute(parts.join('/'))
}

function apiFromRouteFile(file) {
  const rel = path.relative(APP, file).replace(/\\/g, '/')
  if (!rel.startsWith('api/')) return null
  const parts = rel.split('/')
  if (!/^route\.(ts|js)$/.test(parts.at(-1) ?? '')) return null
  parts.pop()
  return normalizeRoute(parts.join('/'))
}

const pageFiles = walk(APP)
const sourceFiles = walk(SRC)
const pageRouteMap = new Map()
const apiRouteMap = new Map()
for (const file of pageFiles) {
  const route = routeFromPageFile(file)
  if (route) pageRouteMap.set(route, [...(pageRouteMap.get(route) ?? []), file])
  const api = apiFromRouteFile(file)
  if (api) apiRouteMap.set(api, [...(apiRouteMap.get(api) ?? []), file])
}
const routes = new Set(pageRouteMap.keys())
const apis = new Set(apiRouteMap.keys())
const refs = new Map()
const patterns = [
  /(?:href|to)\s*=\s*[{(]?\s*['\"]\/(?!\/)([^'\"?#]*)/g,
  /(?:router\.(?:push|replace)|redirect|permanentRedirect|window\.location\.(?:assign|replace))\s*\(\s*['\"]\/(?!\/)([^'\"?#]*)/g,
  /fetch\s*\(\s*['\"]\/(api\/[^'\"?#]*)/g,
]
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8')
  for (const pattern of patterns) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      const normalized = normalizeRoute('/' + match[1])
      refs.set(normalized, [...(refs.get(normalized) ?? []), path.relative(ROOT, file)])
    }
  }
}
function matchesDynamic(target, available) {
  if (available.has(target)) return true
  const parts = target.split('/').filter(Boolean)
  for (const candidate of available) {
    const c = candidate.split('/').filter(Boolean)
    if (c.length !== parts.length) continue
    if (c.every((segment, index) => segment.startsWith(':') || segment === parts[index])) return true
  }
  return false
}
const missing = []
for (const [route, files] of refs) {
  const isApi = route === '/api' || route.startsWith('/api/')
  const available = isApi ? apis : routes
  if (available.size && !matchesDynamic(route, available)) missing.push({ route, files: [...new Set(files)] })
}
const duplicateRoutes = [
  ...[...pageRouteMap.entries()].filter(([, files]) => files.length > 1),
  ...[...apiRouteMap.entries()].filter(([, files]) => files.length > 1),
]
console.log('=== Credi Marketplace Route/API Audit ===')
console.log('Pages discovered:', routes.size)
console.log('API routes discovered:', apis.size)
console.log('Static route references:', refs.size)
console.log('Missing references:', missing.length)
console.log('Duplicate canonical routes:', duplicateRoutes.length)
if (missing.length) { console.error('\nMissing references:'); for (const item of missing) console.error('-', item.route, '<-', item.files.join(', ')) }
if (duplicateRoutes.length) { console.error('\nDuplicate canonical routes:'); for (const [route, files] of duplicateRoutes) console.error('-', route, '<-', files.map((file) => path.relative(ROOT, file)).join(', ')) }
if (missing.length || duplicateRoutes.length) process.exit(1)
console.log('\nRoute/API audit: PASSED')