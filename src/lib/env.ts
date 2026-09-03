import "server-only";

/**
 * Variables de entorno públicas requeridas por el runtime de Next.js.
 *
 * No colocar aquí secretos de servidor, service-role keys, tokens privados
 * ni credenciales de terceros. Las variables NEXT_PUBLIC_* son visibles
 * en el cliente y deben considerarse públicas.
 */
export type PublicEnv = Readonly<{
  supabaseUrl: string;
  supabasePublishableKey: string;
  siteUrl: string;
}>;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }

  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function validateUrl(name: string, value: string): string {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && !isLocalhost(url.hostname)) {
      throw new Error(
        `La variable ${name} debe usar HTTPS fuera de entornos locales.`,
      );
    }

    return url.toString().replace(/\/$/, "");
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTPS")) {
      throw error;
    }

    throw new Error(`La variable ${name} no contiene una URL válida.`);
  }
}

function isLocalhost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

function loadPublicEnv(): PublicEnv {
  const supabaseUrl = validateUrl(
    "NEXT_PUBLIC_SUPABASE_URL",
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  );

  const supabasePublishableKey = requireEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );

  if (supabasePublishableKey.length < 20) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no parece una clave válida.",
    );
  }

  const siteUrl = validateUrl(
    "NEXT_PUBLIC_SITE_URL",
    optionalEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  );

  return Object.freeze({
    supabaseUrl,
    supabasePublishableKey,
    siteUrl,
  });
}

export const env = loadPublicEnv();

export function getPublicEnv(): PublicEnv {
  return env;
}
