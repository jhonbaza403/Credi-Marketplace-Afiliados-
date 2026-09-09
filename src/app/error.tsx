"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Credi Marketplace] Route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <span aria-hidden="true" className="text-2xl font-black">!</span>
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-950">No pudimos cargar esta sección</h1>
      <p className="mt-3 text-slate-600">
        El servicio encontró un problema temporal. Puedes reintentar o continuar desde una sección pública de la plataforma.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Reintentar
        </button>
        <Link
          href="/marketplace"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
        >
          Marketplace
        </Link>
        <Link
          href="/services"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
        >
          Servicios
        </Link>
      </div>
    </main>
  );
}
