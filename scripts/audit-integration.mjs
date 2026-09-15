import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs']
const ENTRY_PATTERNS = [
  /^src\/app\/.*\/(page|layout|loading|error|not-found|template|default)\.(ts|tsx|js|jsx)$/,
  /^src\/app\/.*\/route\.(ts|tsx|js|jsx)$/,
]
const IGNORE = new Set(['node_modules', '.next', 'android', 'ios', 'dist', 'build'])

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (EXTENSIONS.includes(path.extname(entry.name))) out.push(full)
  }
  return out
}

function rel(file) { return path.relative(ROOT, file).replaceAll(path.sep, '/') }
function normalize(file) { return path.normalize(file) }

function resolveImport(fromFile, specifier, files) {
  let base
  if (specifier.startsWith('@/')) base = path.join(SRC, specifier.slice(2))
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier)
  else return null

  const candidates = []
  if (path.extname(base)) candidates.push(base)
  else {
    for (const ext of EXTENSIONS) candidates.push(`${base}${ext}`)
    for (const ext of EXTENSIONS) candidates.push(path.join(base, `index${ext}`))
  }
  const normalized = new Set(files.map(normalize))
  return candidates.find((candidate) => normalized.has(normalize(candidate))) ?? null
}

const files = walk(SRC)
const fileSet = new Set(files)
const imports = new Map(files.map((file) => [file, new Set()]))
const reverse = new Map(files.map((file) => [file, new Set()]))
const unresolved = []

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const specs = new Set()
  for (const match of source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g)) specs.add(match[1])
  for (const match of source.matchAll(/(?:import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g)) specs.add(match[1])
  for (const specifier of specs) {
    const target = resolveImport(file, specifier, files)
    if (!target) {
      if (specifier.startsWith('.') || specifier.startsWith('@/')) unresolved.push({ from: rel(file), specifier })
      continue
    }
    imports.get(file).add(target)
    reverse.get(target).add(file)
  }
}

const entryFiles = files.filter((file) => {
  const r = rel(file)
  return ENTRY_PATTERNS.some((pattern) => pattern.test(r))
})
const reachable = new Set(entryFiles)
const queue = [...entryFiles]
while (queue.length) {
  const current = queue.shift()
  for (const target of imports.get(current) ?? []) {
    if (!reachable.has(target)) {
      reachable.add(target)
      queue.push(target)
    }
  }
}

const candidates = files
  .filter((file) => !reachable.has(file))
  .filter((file) => /^(src\/(components|features|hooks|lib|services|utils)\/)/.test(rel(file)))
  .map((file) => ({ file: rel(file), importedBy: [...(reverse.get(file) ?? [])].map(rel) }))
  .sort((a, b) => a.file.localeCompare(b.file))

const result = {
  generatedAt: new Date().toISOString(),
  sourceFiles: files.length,
  entryFiles: entryFiles.length,
  reachableFiles: reachable.size,
  potentialOrphans: candidates.length,
  unresolvedLocalImports: unresolved,
  potentialOrphanFiles: candidates,
  note: 'Potential orphans are static-analysis candidates only. Dynamic imports, framework conventions, generated code and runtime string references require manual verification before deletion.',
}

console.log(JSON.stringify(result, null, 2))

if (process.argv.includes('--strict') && unresolved.length > 0) process.exitCode = 1
