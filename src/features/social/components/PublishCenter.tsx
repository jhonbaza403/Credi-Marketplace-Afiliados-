"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MarketplaceMediaUploader from "@/components/media/MarketplaceMediaUploader";
import type { UploadedMarketplaceMedia } from "@/lib/storage/marketplace-media";

type ContentType = "post" | "story" | "reel" | "ad";

type MediaItem = { type: "image" | "video"; url: string };

const tabs: { value: ContentType; label: string; description: string }[] = [
  { value: "post", label: "Publicación", description: "Comparte novedades, productos o contenido útil." },
  { value: "story", label: "Historia", description: "Contenido vertical que expira en 24 horas." },
  { value: "reel", label: "Reel", description: "Vídeo breve para mostrar tu producto o marca." },
  { value: "ad", label: "Publicidad", description: "Crea una campaña sujeta a revisión." },
];

function mediaPayload(items: UploadedMarketplaceMedia[]): MediaItem[] {
  return items.map((item) => ({ type: item.kind, url: item.url }));
}

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

  function resetForm(nextType?: ContentType) {
    setTitle("");
    setBody("");
    setMedia([]);
    setDestinationUrl("");
    setBudget("");
    setDisclosure(false);
    setMessage(null);
    if (nextType) setType(nextType);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Debes iniciar sesión para publicar contenido.");

      const cleanTitle = title.trim();
      const cleanBody = body.trim();
      if (!cleanBody && type !== "ad") throw new Error("Escribe el contenido antes de publicar.");
      if (type !== "story" && !cleanTitle) throw new Error("Añade un título antes de publicar.");
      if (type === "reel" && !media.some((item) => item.kind === "video")) throw new Error("Un reel necesita al menos un vídeo.");
      if (!media.length) throw new Error("Añade al menos una imagen o vídeo.");
      if ((type === "post" || type === "story" || type === "reel" || type === "ad") && !disclosure) {
        throw new Error("Confirma que el contenido no contiene afirmaciones engañosas y que marcarás cualquier contenido patrocinado o afiliado cuando corresponda.");
      }

      const payloadMedia = mediaPayload(media);

      if (type === "post") {
        const { error } = await supabase.from("feed_posts").insert({
          owner_id: user.id,
          title: cleanTitle,
          body: cleanBody,
          media: payloadMedia,
          visibility,
          status: "published",
          published_at: new Date().toISOString(),
          is_sponsored: false,
          affiliate_disclosure: false,
          moderation_status: "approved",
        });
        if (error) throw error;
      } else if (type === "story") {
        const { error } = await supabase.from("stories").insert({
          owner_id: user.id,
          body: cleanBody,
          media: payloadMedia,
          visibility,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_sponsored: false,
          affiliate_disclosure: false,
          moderation_status: "approved",
        });
        if (error) throw error;
      } else if (type === "reel") {
        const { error } = await supabase.from("reels").insert({
          owner_id: user.id,
          title: cleanTitle,
          body: cleanBody,
          media: payloadMedia,
          visibility,
          status: "published",
          published_at: new Date().toISOString(),
          is_sponsored: false,
          affiliate_disclosure: false,
          moderation_status: "approved",
        });
        if (error) throw error;
      } else {
        const numericBudget = budget.trim() ? Number(budget) : null;
        if (numericBudget !== null && (!Number.isFinite(numericBudget) || numericBudget < 0)) throw new Error("El presupuesto no es válido.");
        const normalizedDestination = destinationUrl.trim();
        if (normalizedDestination) {
          const parsed = new URL(normalizedDestination);
          if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("La URL de destino debe ser HTTP o HTTPS.");
        }
        const { error } = await supabase.from("advertisements").insert({
          owner_id: user.id,
          title: cleanTitle,
          body: cleanBody,
          media: payloadMedia,
          destination_url: normalizedDestination || null,
          status: "active",
          moderation_status: "pending_review",
          budget_amount: numericBudget,
          starts_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      setMessage(type === "ad" ? "Campaña enviada a revisión. Podrá activarse cuando supere los controles correspondientes." : "Contenido publicado correctamente en tu cuenta.");
      resetForm();
    } catch (error: unknown) {
      console.error("[PublishCenter] publish error", error);
      setMessage(error instanceof Error ? error.message : "No fue posible publicar el contenido.");
    } finally {
      setSaving(false);
    }
  }

  const uploaderKind = type === "reel" ? "video" : "image";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 rounded-3xl border border-primary/15 bg-primary/[0.04] p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Centro de publicaciones</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Publica desde tu propia cuenta</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Carga multimedia directamente desde tu computadora, Android o iPhone. Las publicaciones quedan ligadas a tu usuario y las campañas publicitarias pasan a revisión.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Tipo de contenido">
        {tabs.map((tab) => (
          <button key={tab.value} type="button" role="tab" aria-selected={type === tab.value} onClick={() => resetForm(tab.value)} className={`rounded-2xl border px-4 py-3 text-left transition ${type === tab.value ? "border-primary/30 bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"}`}>
            <span className="block text-sm font-black">{tab.label}</span>
            <span className={`mt-1 block text-[11px] leading-4 ${type === tab.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{tab.description}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-5" aria-label={`Crear ${currentTab.label}`}>
        {type !== "story" && (
          <label className="block text-sm font-semibold text-foreground">Título<input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30" placeholder="Título de tu contenido" aria-label="Título del contenido" /></label>
        )}

        <label className="block text-sm font-semibold text-foreground">{type === "story" ? "Texto de la historia" : "Contenido"}<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={5000} required={type !== "ad"} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30" placeholder="Escribe aquí lo que quieres compartir..." aria-label="Contenido de la publicación" /></label>

        <div>
          <div className="mb-3"><p className="text-sm font-black text-foreground">Multimedia</p><p className="text-xs text-muted-foreground">{type === "reel" ? "Selecciona un vídeo desde tu dispositivo." : "Selecciona una imagen desde tu dispositivo."}</p></div>
          <MarketplaceMediaUploader kind={uploaderKind} multiple={type === "post"} maxFiles={type === "post" ? 8 : 1} value={media} onChange={setMedia} />
        </div>

        {type !== "ad" && <label className="block text-sm font-semibold text-foreground">Privacidad<select value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none" aria-label="Privacidad de la publicación"><option value="public">Público</option><option value="private">Solo yo</option></select></label>}

        {type === "story" && <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Las historias públicas expiran automáticamente después de 24 horas.</p>}
        {type === "ad" && <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-semibold text-foreground">URL de destino (opcional)<input type="url" value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none" placeholder="https://..." aria-label="URL de destino de la publicidad" /></label><label className="block text-sm font-semibold text-foreground">Presupuesto (opcional)<input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none" placeholder="0.00" aria-label="Presupuesto de publicidad" /></label></div>}

        <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-4 text-sm text-foreground"><input type="checkbox" checked={disclosure} onChange={(event) => setDisclosure(event.target.checked)} className="mt-1 size-4 shrink-0" required /><span>Afirmo que la información publicada es comprobable y que identificaré correctamente cualquier contenido patrocinado o afiliado cuando corresponda.</span></label>

        {message && <p role="status" aria-live="polite" className="rounded-2xl border border-border bg-muted p-4 text-sm text-foreground">{message}</p>}
        <button type="submit" disabled={saving} aria-busy={saving} className="w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Publicando..." : type === "ad" ? "Enviar campaña a revisión" : `Publicar ${currentTab.label.toLowerCase()}`}</button>
      </form>
    </section>
  );
}
