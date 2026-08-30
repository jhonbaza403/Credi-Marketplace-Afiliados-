"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-neutral-950">Algo salió mal</h1>
      <p className="mt-3 text-neutral-600">No fue posible completar esta operación.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">
        Intentar nuevamente
      </button>
    </main>
  );
}
