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
  if (!['route.ts', 'route.js', 'route.tsx', 'route.jsx'].includes(parts.at(-1))) return null
  parts.pop()
  return normalize('/' + parts.join('/'))
}

function methods(file) {
  const source = fs.readFileSync(file, 'utf8')
  const found = []
  const patterns = [
    /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g,
    /export\s+(?:const|let|var)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=/g,
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.push(match[1])
  }
  return [...new Set(found)]
}

function matches(actual, route) {
  const a = actual.split('/').filter(Boolean)
  const r = route.split('/').filter(Boolean)
  return a.length === r.length && r.every((x, i) => x.startsWith('[') || x === a[i])
}

function findFetchCalls(source) {
  const calls = []
  for (const match of source.matchAll(/fetch\s*\(/g)) {
    const start = match.index ?? 0
    let i = start + match[0].length
    while (/\s/.test(source[i] ?? '')) i++
    const quote = source[i]
    if (quote !== "'" && quote !== '"') continue
    const closeQuote = source.indexOf(quote, i + 1)
    if (closeQuote < 0) continue
    const url = source.slice(i + 1, closeQuote)
    if (!url.startsWith('/api/')) continue

    let cursor = closeQuote + 1
    while (/\s/.test(source[cursor] ?? '')) cursor++
    let init = ''
    if (source[cursor] === ',') {
      cursor++
      while (/\s/.test(source[cursor] ?? '')) cursor++
      if (source[cursor] === '{') {
        const initStart = cursor
        let depth = 0
        let quoteChar = null
        let escaped = false
        for (; cursor < source.length; cursor++) {
          const ch = source[cursor]
          if (quoteChar) {
            if (escaped) escaped = false
            else if (ch === '\\') escaped = true
            else if (ch === quoteChar) quoteChar = null
            continue
          }
          if (ch === "'" || ch === '"') { quoteChar = ch; continue }
          if (ch === '{') depth++
          if (ch === '}') {
            depth--
            if (depth === 0) { cursor++; break }
          }
        }
        init = source.slice(initStart, cursor)
      }
    }
    calls.push({ url, init })
  }
  return calls
}

const files = walk(APP)
const source = walk(SRC)
const routes = new Map()
for (const file of files) {
  const route = apiRoute(file)
  if (route) routes.set(route, methods(file))
}

const refs = []
const missing = []
const mismatches = []
const dynamic = []

for (const file of source) {
  const sourceText = fs.readFileSync(file, 'utf8')
  for (const call of findFetchCalls(sourceText)) {
    const route = normalize(call.url)
    const method = (call.init.match(/\bmethod\s*:\s*['"]([A-Za-z]+)['"]/)?.[1] || 'GET').toUpperCase()
    const relativeFile = path.relative(ROOT, file)
    refs.push({ route, method, file: relativeFile })

    if (route.includes('\${')) {
      dynamic.push({ route, file: relativeFile })
      continue
    }

    const entry = [...routes.entries()].find(([r]) => matches(route, r))
    if (!entry) missing.push({ route, file: relativeFile })
    else if (!METHODS.has(method) || !entry[1].includes(method)) {
      mismatches.push({ route, method, allowed: entry[1], file: relativeFile })
    }
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
for (const x of dynamic) console.warn('- DYNAMIC ' + x.route + ' <- ' + x.file)
if (missing.length || mismatches.length) process.exit(1)
console.log('API contract audit: PASSED')
