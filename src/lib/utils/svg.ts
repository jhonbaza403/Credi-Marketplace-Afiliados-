const SVG_FORBIDDEN = /<script|javascript:|on[a-z]+\s*=|<foreignObject/i;

export function isSafeSvgMarkup(value: string): boolean {
  return !SVG_FORBIDDEN.test(value);
}

export function sanitizeSvgMarkup(value: string): string {
  if (!isSafeSvgMarkup(value)) throw new Error("SVG no permitido: contiene contenido activo o inseguro.");
  return value
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/\s+xmlns:[^=]+="[^"]*"/gi, "");
}

export function svgDataUri(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitizeSvgMarkup(markup))}`;
}
