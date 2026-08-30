// ==========================================================
// ARCHIVO: src/lib/validation.ts
// Validaciones reutilizables de Credi Marketplace
//
// IMPORTANTE:
// Estas validaciones mejoran la experiencia del usuario,
// pero NO sustituyen:
//
// - Validaciones de PostgreSQL
// - RLS de Supabase
// - Autorización
// - Validaciones de Server Actions / API
// - Reglas de negocio del servidor
// ==========================================================

// ==========================================================
// CONSTANTES
// ==========================================================

/**
 * Límites generales utilizados por la aplicación.
 *
 * Mantener estos valores centralizados evita que diferentes
 * formularios utilicen reglas contradictorias.
 */
export const VALIDATION_LIMITS = {
  email: {
    minLength: 5,
    maxLength: 254,
  },

  password: {
    minLength: 8,
    maxLength: 128,
  },

  name: {
    minLength: 1,
    maxLength: 150,
  },

  title: {
    minLength: 2,
    maxLength: 200,
  },

  description: {
    maxLength: 10_000,
  },

  slug: {
    minLength: 2,
    maxLength: 150,
  },

  price: {
    min: 0,
    max: 999_999_999.99,
    decimals: 2,
  },

  quantity: {
    min: 1,
    max: 1_000_000,
  },

  rating: {
    min: 1,
    max: 5,
  },
} as const;

// ==========================================================
// UTILIDADES INTERNAS
// ==========================================================

/**
 * Determina si un valor es una cadena no vacía.
 */
function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0
  );
}

/**
 * Determina si un número es finito.
 */
function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  );
}

// ==========================================================
// EMAIL
// ==========================================================

/**
 * Valida un correo electrónico.
 *
 * No pretende implementar toda la especificación RFC 5322.
 * Está orientada a validación práctica de formularios.
 */
export function isValidEmail(
  email: string | undefined | null,
): boolean {
  if (!isNonEmptyString(email)) {
    return false;
  }

  const normalizedEmail = email.trim();

  if (
    normalizedEmail.length <
      VALIDATION_LIMITS.email.minLength ||
    normalizedEmail.length >
      VALIDATION_LIMITS.email.maxLength
  ) {
    return false;
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(normalizedEmail);
}

/**
 * Normaliza un correo electrónico.
 *
 * Útil antes de enviarlo a Supabase.
 */
export function normalizeEmail(
  email: string,
): string {
  return email.trim().toLowerCase();
}

// ==========================================================
// CONTRASEÑAS
// ==========================================================

/**
 * Valida la fortaleza mínima de una contraseña.
 *
 * Reglas:
 * - 8 caracteres mínimo
 * - 128 caracteres máximo
 * - al menos una mayúscula
 * - al menos una minúscula
 * - al menos un número
 *
 * No exigimos símbolos obligatoriamente para no imponer
 * una política innecesariamente rígida.
 */
export function isStrongPassword(
  password: string | undefined | null,
): boolean {
  if (
    typeof password !== 'string' ||
    password.length <
      VALIDATION_LIMITS.password.minLength ||
    password.length >
      VALIDATION_LIMITS.password.maxLength
  ) {
    return false;
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  return (
    hasUpperCase &&
    hasLowerCase &&
    hasNumber
  );
}

/**
 * Devuelve los problemas detectados en una contraseña.
 *
 * Útil para mostrar mensajes específicos al usuario.
 */
export function getPasswordErrors(
  password: string | undefined | null,
): string[] {
  const errors: string[] = [];

  if (typeof password !== 'string') {
    return ['La contraseña es obligatoria.'];
  }

  if (
    password.length <
    VALIDATION_LIMITS.password.minLength
  ) {
    errors.push(
      `Debe tener al menos ${VALIDATION_LIMITS.password.minLength} caracteres.`,
    );
  }

  if (
    password.length >
    VALIDATION_LIMITS.password.maxLength
  ) {
    errors.push(
      `No puede superar ${VALIDATION_LIMITS.password.maxLength} caracteres.`,
    );
  }

  if (!/[A-Z]/.test(password)) {
    errors.push(
      'Debe contener al menos una letra mayúscula.',
    );
  }

  if (!/[a-z]/.test(password)) {
    errors.push(
      'Debe contener al menos una letra minúscula.',
    );
  }

  if (!/\d/.test(password)) {
    errors.push(
      'Debe contener al menos un número.',
    );
  }

  return errors;
}

// ==========================================================
// NOMBRES
// ==========================================================

/**
 * Valida un nombre completo.
 */
export function isValidName(
  name: string | undefined | null,
): boolean {
  if (!isNonEmptyString(name)) {
    return false;
  }

  const normalizedName = name.trim();

  return (
    normalizedName.length >=
      VALIDATION_LIMITS.name.minLength &&
    normalizedName.length <=
      VALIDATION_LIMITS.name.maxLength
  );
}

/**
 * Normaliza espacios innecesarios en un nombre.
 */
export function normalizeName(
  name: string,
): string {
  return name
    .trim()
    .replace(/\s+/g, ' ');
}

// ==========================================================
// TEXTOS
// ==========================================================

/**
 * Valida un título comercial.
 */
export function isValidTitle(
  title: string | undefined | null,
): boolean {
  if (!isNonEmptyString(title)) {
    return false;
  }

  const value = title.trim();

  return (
    value.length >=
      VALIDATION_LIMITS.title.minLength &&
    value.length <=
      VALIDATION_LIMITS.title.maxLength
  );
}

/**
 * Valida una descripción.
 */
export function isValidDescription(
  description: string | undefined | null,
): boolean {
  if (
    description === undefined ||
    description === null
  ) {
    return true;
  }

  if (typeof description !== 'string') {
    return false;
  }

  return (
    description.trim().length <=
    VALIDATION_LIMITS.description.maxLength
  );
}

// ==========================================================
// SLUG
// ==========================================================

/**
 * Valida un slug compatible con la estructura
 * utilizada en PostgreSQL.
 *
 * Ejemplos válidos:
 *
 * producto-nuevo
 * zapatos-deportivos
 * servicios-legales
 *
 * Ejemplos inválidos:
 *
 * Producto Nuevo
 * producto_nuevo
 * producto--
 */
export function isValidSlug(
  slug: string | undefined | null,
): boolean {
  if (!isNonEmptyString(slug)) {
    return false;
  }

  const value = slug.trim();

  if (
    value.length <
      VALIDATION_LIMITS.slug.minLength ||
    value.length >
      VALIDATION_LIMITS.slug.maxLength
  ) {
    return false;
  }

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
    value,
  );
}

/**
 * Convierte texto a un slug básico.
 *
 * No sustituye una política de unicidad de PostgreSQL.
 */
export function createSlug(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// ==========================================================
// PRECIOS
// ==========================================================

/**
 * Valida un precio.
 *
 * Reglas:
 * - debe ser número
 * - debe ser finito
 * - no puede ser negativo
 * - máximo dos decimales
 * - no puede superar el máximo definido
 */
export function isValidPrice(
  price: number | undefined | null,
): boolean {
  if (!isFiniteNumber(price)) {
    return false;
  }

  if (
    price < VALIDATION_LIMITS.price.min ||
    price > VALIDATION_LIMITS.price.max
  ) {
    return false;
  }

  return hasValidDecimals(
    price,
    VALIDATION_LIMITS.price.decimals,
  );
}

/**
 * Valida el número de decimales de un valor.
 *
 * Se utiliza tolerancia matemática para evitar errores
 * derivados de la representación interna de números
 * de JavaScript.
 */
export function hasValidDecimals(
  value: number,
  decimals = 2,
): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }

  const factor = 10 ** decimals;

  return (
    Math.abs(
      value * factor -
        Math.round(value * factor),
    ) < 1e-8
  );
}

/**
 * Redondea un importe monetario.
 *
 * IMPORTANTE:
 * Para cálculos financieros definitivos en servidor o
 * PostgreSQL debe utilizarse NUMERIC/DECIMAL.
 */
export function roundMoney(
  amount: number,
  decimals = 2,
): number {
  if (!Number.isFinite(amount)) {
    return NaN;
  }

  const factor = 10 ** decimals;

  return (
    Math.round(
      (amount + Number.EPSILON) * factor,
    ) / factor
  );
}

// ==========================================================
// CANTIDADES
// ==========================================================

/**
 * Valida una cantidad de productos.
 */
export function isValidQuantity(
  quantity: number | undefined | null,
): boolean {
  if (!Number.isInteger(quantity)) {
    return false;
  }

  return (
    quantity >= VALIDATION_LIMITS.quantity.min &&
    quantity <= VALIDATION_LIMITS.quantity.max
  );
}

// ==========================================================
// STOCK
// ==========================================================

/**
 * Valida una cantidad de inventario.
 */
export function isValidStock(
  stock: number | undefined | null,
): boolean {
  if (!Number.isInteger(stock)) {
    return false;
  }

  return (
    stock >= 0 &&
    stock <= VALIDATION_LIMITS.quantity.max
  );
}

// ==========================================================
// RATING
// ==========================================================

/**
 * Valida una calificación de usuario.
 */
export function isValidRating(
  rating: number | undefined | null,
): boolean {
  if (!Number.isInteger(rating)) {
    return false;
  }

  return (
    rating >= VALIDATION_LIMITS.rating.min &&
    rating <= VALIDATION_LIMITS.rating.max
  );
}

// ==========================================================
// UUID
// ==========================================================

/**
 * Valida UUID versión estándar.
 *
 * Compatible con UUID utilizados por Supabase/PostgreSQL.
 */
export function isValidUUID(
  value: string | undefined | null,
): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

// ==========================================================
// URL
// ==========================================================

/**
 * Valida una URL HTTP/HTTPS.
 */
export function isValidHttpUrl(
  value: string | undefined | null,
): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value.trim());

    return (
      url.protocol === 'http:' ||
      url.protocol === 'https:'
    );
  } catch {
    return false;
  }
}

// ==========================================================
// FECHAS
// ==========================================================

/**
 * Valida una fecha representada como string.
 */
export function isValidDateString(
  value: string | undefined | null,
): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

// ==========================================================
// MONEDA
// ==========================================================

/**
 * Códigos de moneda ISO 4217 utilizados habitualmente
 * por Credi Marketplace.
 *
 * La lista puede ampliarse cuando se incorporen nuevas
 * monedas oficialmente soportadas.
 */
export const SUPPORTED_FIAT_CURRENCIES = [
  'USD',
  'EUR',
  'VES',
  'COP',
  'MXN',
  'BRL',
  'ARS',
  'CLP',
  'PEN',
] as const;

export type SupportedFiatCurrency =
  (typeof SUPPORTED_FIAT_CURRENCIES)[number];

/**
 * Valida una moneda FIAT soportada.
 */
export function isSupportedFiatCurrency(
  currency: string | undefined | null,
): currency is SupportedFiatCurrency {
  if (!isNonEmptyString(currency)) {
    return false;
  }

  return (
    SUPPORTED_FIAT_CURRENCIES.includes(
      currency.trim().toUpperCase() as SupportedFiatCurrency,
    )
  );
}

/**
 * Activos digitales utilizados actualmente
 * por el módulo B2B.
 */
export const SUPPORTED_CRYPTO_CURRENCIES = [
  'USDT',
] as const;

export type SupportedCryptoCurrency =
  (typeof SUPPORTED_CRYPTO_CURRENCIES)[number];

/**
 * Valida una criptomoneda soportada.
 */
export function isSupportedCryptoCurrency(
  currency: string | undefined | null,
): currency is SupportedCryptoCurrency {
  if (!isNonEmptyString(currency)) {
    return false;
  }

  return (
    SUPPORTED_CRYPTO_CURRENCIES.includes(
      currency.trim().toUpperCase() as SupportedCryptoCurrency,
    )
  );
}

// ==========================================================
// TEXTO SEGURO PARA ENTRADAS
// ==========================================================

/**
 * Limpia espacios innecesarios al principio y al final
 * y normaliza saltos de línea.
 *
 * NO debe considerarse una función de sanitización HTML.
 */
export function normalizeText(
  value: string,
): string {
  return value
    .replace(/\r\n/g, '\n')
    .trim();
}
