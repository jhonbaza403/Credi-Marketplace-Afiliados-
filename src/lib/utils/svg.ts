const SVG_DANGEROUS_CONTENT = /<\/?(script|foreignObject|iframe|object|embed|frame|frameset)\b|\b(?:href|xlink:href|src|srcdoc)\s*=\s*["']\s*(?:javascript:|data:)|\bon[a-z]+\s*=|@import|url\s*\(\s*["']?javascript:/i;

export function isSafeSvgMarkup(value: string): boolean {
  return typeof value === "string" && !SVG_DANGEROUS_CONTENT.test(value);
}

export function sanitizeSvgMarkup(value: string): string {
  if (!isSafeSvgMarkup(value)) {
    throw new Error("SVG rechazado: contiene contenido activo o referencias inseguras.");
  }

  return value.replace(/<!--[\s\S]*?-->/g, "").trim();
}

export function svgDataUri(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitizeSvgMarkup(markup))}`;
}
