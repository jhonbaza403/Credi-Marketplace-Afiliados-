const MAX_QUERY_LENGTH = 100

export function sanitizeSearchQuery(input: string): string {
  return input.normalize('NFKC').trim().slice(0, MAX_QUERY_LENGTH).replace(/[(),]/g, ' ').replace(/\s+/g, ' ')
}

export function buildSearchOrFilter(fields: readonly string[], input: string): string | null {
  const query = sanitizeSearchQuery(input)
  if (!query) return null
  const escaped = query.replace(/[%_\\]/g, (m) => `\\${m}`)
  const clauses = fields.filter((field) => /^[a-z_][a-z0-9_]*$/i.test(field)).map((field) => `${field}.ilike.%${escaped}%`)
  return clauses.length ? clauses.join(',') : null
}
