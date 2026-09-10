"use client";

import { FormEvent, useMemo, useState } from "react";
import MarketplaceMediaUploader from "@/components/media/MarketplaceMediaUploader";
import type { UploadedMarketplaceMedia } from "@/lib/storage/marketplace-media";

type ContentType = "post" | "story" | "reel" | "ad";

const tabs: { value: ContentType; label: string; description: string }[] = [
  { value: "post", label: "Publicación", description: "Comparte novedades, productos o contenido útil." },
  { value: "story", label: "Historia", description: "Contenido vertical que expira en 24 horas." },
  { value: "reel", label: "Reel", description: "Vídeo breve para mostrar tu producto o marca." },
  { value: "ad", label: "Publicidad", description: "Crea una campaña sujeta a revisión." },
];

export default function PublishCenter() {
  const [type, setType] = useState<ContentType>("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<UploadedMarketplaceMedia[]>([]);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [budget, setBudget] = useState("");
  const [disclosure, setDisclosure] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const currentTab = useMemo(() => tabs.find((tab) => tab.value === type) ?? tabs[0], [type]);

  function resetFields(nextType?: ContentType) {
    setTitle("");
    setBody("");
    setMedia([]);
    setDestinationUrl("");
    setBudget("");
    setDisclosure(false);
    if (nextType) setType(nextType);
  }

  function resetForm(nextType?: ContentType) {
    resetFields(nextType);
    setMessage(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);

    try {
      const cleanTitle = title.trim();
      const cleanBody = body.trim();
      if (!cleanBody && type !== "ad") throw new Error("Escribe el contenido antes de publicar.");
      if (type !== "story" && !cleanTitle) throw new Error("Añade un título antes de publicar.");
      if (type === "reel" && !media.some((item) => item.kind === "video")) throw new Error("Un reel necesita al menos un vídeo.");
      if (!media.length) throw new Error("Añade al menos una imagen o vídeo.");
      if (!disclosure) throw new Error("Confirma que la información es comprobable y que identificarás correctamente cualquier contenido patrocinado o afiliado.");

      const numericBudget = budget.trim() ? Number(budget) : null;
      const normalizedDestination = destinationUrl.trim() || null;
      const response = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: cleanTitle,
          body: cleanBody,
          media: media.map((item) => ({ type: item.kind, url: item.url })),
          visibility,
          destinationUrl: normalizedDestination,
          budget: numericBudget,
          disclosure: true,
        }),
      });

      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "No fue posible registrar el contenido.");

      resetFields();
      setMessage(data.message || "Contenido enviado a revisión.");
    } catch (error: unknown) {
      console.error("[PublishCenter] publish error", error);
      setMessage(error instanceof Error ? error.message : "No fue posible publicar el contenido.");
    } finally {
      setSaving(false);
    }
  }

  const uploaderKind = type === "reel" ? "video" : "image";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/95 p-6 text-[var(--foreground)] shadow-2xl backdrop-blur-xl sm:p-8">
      <div className="mb-6 rounded-3xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(8,15,40,.94),rgba(7,21,36,.9))] p-6 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Centro de publicaciones</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Publica desde tu propia cuenta</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Carga imagen o vídeo desde tu dispositivo. El servidor registra el contenido y lo deja en revisión antes de publicarlo.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Tipo de contenido">
        {tabs.map((tab) => (
          <button key={tab.value} type="button" role="tab" aria-selected={type === tab.value} onClick={() => resetForm(tab.value)} disabled={saving} className={`rounded-2xl border px-4 py-3 text-left transition ${type === tab.value ? "border-cyan-300/30 bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)]"} disabled:cursor-not-allowed disabled:opacity-60`}>
            <span className="block text-sm font-black">{tab.label}</span>
            <span className={`mt-1 block text-[11px] leading-4 ${type === tab.value ? "text-white/80" : "text-[var(--muted)]"}`}>{tab.description}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-5" aria-label={`Crear ${currentTab.label}`}>
        {type !== "story" && <label className="block text-sm font-semibold">Título<input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" placeholder="Título de tu contenido" /></label>}
        <label className="block text-sm font-semibold">{type === "story" ? "Texto de la historia" : "Contenido"}<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={5000} required={type !== "ad"} className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" placeholder="Escribe aquí lo que quieres compartir..." /></label>

        <div>
          <div className="mb-3"><p className="text-sm font-black">Multimedia</p><p className="text-xs text-[var(--muted)]">{type === "reel" ? "Selecciona un vídeo desde tu dispositivo." : "Selecciona una imagen desde tu dispositivo."}</p></div>
          <MarketplaceMediaUploader kind={uploaderKind} multiple={type === "post"} maxFiles={type === "post" ? 8 : 1} value={media} onChange={setMedia} />
        </div>

        {type !== "ad" && <label className="block text-sm font-semibold">Privacidad<select value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")} className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"><option value="public">Público</option><option value="private">Solo yo</option></select></label>}
        {type === "ad" && <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-semibold">URL de destino (opcional)<input type="url" value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" placeholder="https://..." /></label><label className="block text-sm font-semibold">Presupuesto (opcional)<input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" placeholder="0.00" /></label></div>}
        <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-sm"><input type="checkbox" checked={disclosure} onChange={(event) => setDisclosure(event.target.checked)} className="mt-1 size-4 shrink-0" required /><span>Afirmo que la información publicada es comprobable y que identificaré correctamente cualquier contenido patrocinado o afiliado cuando corresponda.</span></label>
        {message && <p role="status" aria-live="polite" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-sm">{message}</p>}
        <button type="submit" disabled={saving} aria-busy={saving} className="w-full rounded-2xl bg-[var(--primary)] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Registrando..." : type === "ad" ? "Enviar campaña a revisión" : `Enviar ${currentTab.label.toLowerCase()} a revisión`}</button>
      </form>
    </section>
  );
}
