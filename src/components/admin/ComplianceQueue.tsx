"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  user_id: string;
  status: string;
  country?: string | null;
  document_type?: string | null;
  legal_name?: string | null;
  trade_name?: string | null;
  created_at: string;
};

const labels: Record<string, string> = {
  submitted: "Enviado",
  in_review: "En revisión",
  additional_information: "Info adicional",
  approved: "Aprobado",
  rejected: "Rechazado",
  suspended: "Suspendido",
};

export default function ComplianceQueue() {
  const [kyc, setKyc] = useState<Item[]>([]);
  const [kyb, setKyb] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    const response = await fetch("/api/admin/compliance", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo cargar la cola");
    setKyc(data.kyc ?? []);
    setKyb(data.kyb ?? []);
  }

  useEffect(() => { void load().catch((e) => setError(e instanceof Error ? e.message : "Error")); }, []);

  async function decide(subjectType: "kyc" | "kyb", subjectId: string, decision: string) {
    const reason = window.prompt("Motivo obligatorio de la decisión:");
    if (!reason?.trim()) return;
    setBusyId(subjectId);
    try {
      const response = await fetch("/api/admin/compliance", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subjectType, subjectId, decision, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar el caso");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId("");
    }
  }

  const renderCase = (item: Item, type: "kyc" | "kyb") => (
    <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{type === "kyc" ? "KYC" : "KYB"} · {item.legal_name ?? item.user_id}</p>
          <p className="text-xs text-slate-500">ID: {item.id}</p>
          <p className="text-xs text-slate-500">{item.country ?? "--"} · {new Date(item.created_at).toLocaleString()}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{labels[item.status] ?? item.status}</span>
      </div>
      {type === "kyb" && <p className="mt-2 text-sm">Fiscal: {item.trade_name ?? "--"}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={busyId === item.id} onClick={() => void decide(type, item.id, "approved")} className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Aprobar</button>
        <button disabled={busyId === item.id} onClick={() => void decide(type, item.id, "additional_information")} className="rounded-md border px-3 py-2 text-xs font-semibold">Solicitar info</button>
        <button disabled={busyId === item.id} onClick={() => void decide(type, item.id, "rejected")} className="rounded-md bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Rechazar</button>
        <button disabled={busyId === item.id} onClick={() => void decide(type, item.id, "suspended")} className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Suspender</button>
      </div>
    </article>
  );

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header><p className="text-sm font-medium text-sky-600">Compliance</p><h1 className="text-3xl font-bold">Cola de revisión KYC / KYB</h1><p className="mt-2 text-sm text-slate-600">Las decisiones manuales quedan registradas en el historial de cumplimiento.</p></header>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <section><h2 className="mb-3 text-xl font-semibold">KYC</h2><div className="space-y-3">{kyc.length ? kyc.map((item) => renderCase(item, "kyc")) : <p className="text-sm text-slate-500">No hay casos KYC.</p>}</div></section>
      <section><h2 className="mb-3 text-xl font-semibold">KYB</h2><div className="space-y-3">{kyb.length ? kyb.map((item) => renderCase(item, "kyb")) : <p className="text-sm text-slate-500">No hay casos KYB.</p>}</div></section>
    </main>
  );
}
