"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ContentType = "post" | "story" | "reel" | "ad";

type MediaItem = { type: "image" | "video"; url: string };

const tabs: { value: ContentType; label: string }[] = [
  { value: "post", label: "Publicación" },
  { value: "story", label: "Historia" },
  { value: "reel", label: "Reel" },
  { value: "ad", label: "Publicidad" },
];

export default function PublishCenter() {
  const supabase = useMemo(() => createClient(), []);
  const [type, setType] = useState<ContentType>("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<MediaItem["type"]>("image");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resetMessage = () => setMessage(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessage();
    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Debes iniciar sesión para publicar contenido.");
      }

      const cleanBody = body.trim();
      if (!cleanBody && type !== "ad") {
        throw new Error("Escribe el contenido antes de publicar.");
      }
      if (type === "ad" && !title.trim()) {
        throw new Error("La publicidad necesita un título.");
      }

      const media = mediaUrl.trim()
        ? [{ type: mediaType, url: mediaUrl.trim() } satisfies MediaItem]
        : [];

      if (type === "post") {
        const { error } = await supabase.from("feed_posts").insert({
          owner_id: user.id,
          title: title.trim(),
          body: cleanBody,
          media,
          visibility,
          status: "published",
          published_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      if (type === "story") {
        const { error } = await supabase.from("stories").insert({
          owner_id: user.id,
          body: cleanBody,
          media,
          visibility,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        if (error) throw error;
      }

      if (type === "reel") {
        const { error } = await supabase.from("reels").insert({
          owner_id: user.id,
          title: title.trim(),
          body: cleanBody,
          media,
          visibility,
          status: "published",
          published_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      if (type === "ad") {
        const { error } = await supabase.from("advertisements").insert({
          owner_id: user.id,
          title: title.trim(),
          body: cleanBody,
          media,
          visibility: undefined,
          destination_url: destinationUrl.trim() || null,
          status: "active",
          budget_amount: budget.trim() ? Number(budget) : null,
          starts_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      setMessage("Contenido publicado correctamente en tu cuenta.");
      setTitle("");
      setBody("");
      setMediaUrl("");
      setDestinationUrl("");
      setBudget("");
    } catch (error: unknown) {
      console.error("[PublishCenter] publish error", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible publicar el contenido.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Centro de publicaciones</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Publica desde tu propia cuenta</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Cada contenido queda asociado a tu usuario. Puedes mantenerlo privado o hacerlo público sin mezclarlo con las cuentas de otros usuarios.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Tipo de contenido">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={type === tab.value}
            onClick={() => { setType(tab.value); resetMessage(); }}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${type === tab.value ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground hover:bg-muted"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-5" aria-label={`Crear ${type}`}>
        {(type === "post" || type === "reel" || type === "ad") && (
          <label className="block text-sm font-semibold text-foreground">
            Título
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Título de tu contenido"
              aria-label="Título del contenido"
            />
          </label>
        )}

        <label className="block text-sm font-semibold text-foreground">
          {type === "story" ? "Texto de la historia" : "Contenido"}
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            required={type !== "ad"}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Escribe aquí lo que quieres compartir..."
            aria-label="Contenido de la publicación"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <label className="block text-sm font-semibold text-foreground">
            URL de imagen o vídeo (opcional)
            <input
              type="url"
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="https://..."
              aria-label="URL del contenido multimedia"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Tipo
            <select
              value={mediaType}
              onChange={(event) => setMediaType(event.target.value as MediaItem["type"])}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
              aria-label="Tipo de medio"
            >
              <option value="image">Imagen</option>
              <option value="video">Vídeo</option>
            </select>
          </label>
        </div>

        {type !== "story" && (
          <label className="block text-sm font-semibold text-foreground">
            Privacidad
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as "public" | "private")}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none"
              aria-label="Privacidad de la publicación"
            >
              <option value="public">Público</option>
              <option value="private">Solo yo</option>
            </select>
          </label>
        )}

        {type === "story" && <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Las historias públicas expiran automáticamente después de 24 horas.</p>}

        {type === "ad" && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-foreground">
              URL de destino (opcional)
              <input type="url" value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none" placeholder="https://..." aria-label="URL de destino de la publicidad" />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Presupuesto (opcional)
              <input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none" placeholder="0.00" aria-label="Presupuesto de publicidad" />
            </label>
          </div>
        )}

        {message && <p role="status" aria-live="polite" className="rounded-xl border border-border bg-muted p-3 text-sm text-foreground">{message}</p>}

        <button type="submit" disabled={saving} aria-busy={saving} className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "Publicando..." : `Publicar ${type === "post" ? "publicación" : tabs.find((tab) => tab.value === type)?.label.toLowerCase()}`}
        </button>
      </form>
    </section>
  );
}
