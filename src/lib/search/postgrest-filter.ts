const MAX_QUERY_LENGTH = 100;

/**
 * Convert arbitrary user input into a literal search term suitable for a
 * PostgREST ilike pattern. PostgREST operator grammar characters are removed
 * rather than interpreted as filter syntax.
 */
export function sanitizeSearchQuery(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
    .replace(/[\\%_.,(){}[\]:!|&*<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchOrFilter(
  fields: readonly string[],
  input: string,
): string | null {
  const query = sanitizeSearchQuery(input);
  if (!query) return null;

  // Escape LIKE metacharacters after normalization, even though the allowlist
  // above normally removes them. This keeps the helper safe if its policy is
  // relaxed later.
  const escaped = query.replace(/[\\%_]/g, (match) => `\\${match}`);
  const clauses = fields
    .filter((field) => /^[a-z_][a-z0-9_]*$/i.test(field))
    .map((field) => `${field}.ilike.%${escaped}%`);

  return clauses.length ? clauses.join(",") : null;
}
