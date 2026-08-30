"use client";

import "./globals.css";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-bold">Credi Marketplace</h1>
          <p className="mt-3 text-neutral-600">Se produjo un error inesperado.</p>
          <button type="button" onClick={reset} className="mt-6 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white">
            Recargar
          </button>
        </main>
      </body>
    </html>
  );
}
