"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, ImagePlus, Megaphone, Play, Radio, Send, Sparkles } from "lucide-react";
import MarketplaceMediaUploader from "@/components/media/MarketplaceMediaUploader";
import type { UploadedMarketplaceMedia } from "@/lib/storage/marketplace-media";
import { normalizeUploadedMedia } from "@/lib/social/publishing";

type ContentType = "post" | "story" | "reel" | "ad";
type ApiIssue = { field?: string; message?: string };

type PublishResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  code?: string;
  requestId?: string;
  details?: ApiIssue[];
};

const tabs: { value: ContentType; label: string; description: string; icon: typeof Send }[] = [
  { value: "post", label: "Publicación", description: "Texto, imágenes o vídeo en tu muro.", icon: Send },
  { value: "story", label: "Historia", description: "Una historia de 24 horas, con texto o multimedia.", icon: Radio },
  { value: "reel", label: "Reel", description: "Un vídeo vertical para mostrar una idea o producto.", icon: Play },
  { value: "ad", label: "Publicidad", description: "Una campaña comercial enviada a revisión.", icon: Megaphone },
];

const FIELD_LABELS: Record<string, string> = {
  title: "Título",
  body: "Contenido",
  media: "Multimedia",
  type: "Tipo de publicación",
  visibility: "Privacidad",
  destinationUrl: "URL de destino",
  budget: "Presupuesto",
  disclosure: "Declaración comercial",
  operationContext: "Contexto comercial",
};

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
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const productId = searchParams.get("product_id") || searchParams.get("product");
  const affiliateRef = searchParams.get("ref");
  const operationSource = searchParams.get("source") || "publish";
  const requiresDisclosure = type === "ad" || Boolean(productId || affiliateRef);

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
    setNotice(null);
    setError(null);
    setRequestId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    setRequestId(null);

    try {
      const cleanTitle = title.trim();
      const cleanBody = body.trim();
      const normalizedMedia = normalizeUploadedMedia(media);

      if (type === "post" && !cleanBody && normalizedMedia.length === 0) {
        throw new Error("Escribe algo o añade una imagen o un vídeo para publicar.");
      }
      if (type === "story" && !cleanBody && normalizedMedia.length === 0) {
        throw new Error("Una historia necesita texto, una imagen o un vídeo.");
      }
      if (type === "reel" && !normalizedMedia.some((item) => item.type === "video")) {
        throw new Error("Un reel necesita al menos un vídeo.");
      }
      if (type === "ad" && !cleanTitle) {
        throw new Error("Añade un título para identificar tu campaña.");
      }
      if (type === "ad" && !normalizedMedia.some((item) => item.type === "image" || item.type === "video")) {
        throw new Error("Añade una imagen o un vídeo para crear la campaña.");
      }
      if (requiresDisclosure && !disclosure) {
        throw new Error("Confirma la declaración de contenido publicitario o afiliado para continuar.");
      }

      const numericBudget = budget.trim() ? Number(budget) : null;
      if (numericBudget !== null && (!Number.isFinite(numericBudget) || numericBudget < 0)) {
        throw new Error("El presupuesto debe ser un importe válido igual o mayor que cero.");
      }

      const response = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: cleanTitle,
          body: cleanBody,
          media: normalizedMedia,
          visibility,
          destinationUrl: destinationUrl.trim() || null,
          budget: numericBudget,
          disclosure,
          operationContext: {
            productId,
            affiliateRef,
            source: operationSource,
          },
        }),
      });

      const data = await response.json().catch(() => ({})) as PublishResponse;
      if (!response.ok || data.success !== true) {
        setRequestId(data.requestId || null);
        const details = (data.details || [])
          .map((issue) => {
            const label = FIELD_LABELS[issue.field?.split(".")[0] || ""] || issue.field || "Dato";
            return label + ": " + (issue.message || "Revisa este dato.");
          })
          .join(" · ");
        throw new Error(details || data.error || "No fue posible registrar el contenido. Comprueba los datos e inténtalo de nuevo.");
      }

      resetFields();
      setRequestId(data.requestId || null);
      setNotice(data.message || "Contenido recibido y enviado a revisión.");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "No fue posible publicar el contenido.");
    } finally {
      setSaving(false);
    }
  }

  const uploaderKind = type === "reel" ? "video" : "mixed";
  const maxFiles = type === "post" ? 10 : 1;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/95 p-4 text-[var(--foreground)] shadow-2xl backdrop-blur-xl sm:p-7 lg:p-8">
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.2),transparent_35%),linear-gradient(135deg,#08152a,#11132e_65%,#24113d)] p-5 text-white shadow-xl sm:p-7">
        <div className="relative z-10 flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
            <Sparkles className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Credi Studio</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Crea y comparte en un solo paso</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
              Publicaciones, historias, reels y campañas desde el mismo espacio. Elige el formato, añade tu contenido y revisa el resultado antes de enviarlo.
            </p>
          </div>
        </div>
        <div className="relative z-10 mt-5 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-200">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">Muro social</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">Marketplace</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">Comercio y comunidad</span>
        </div>
      </div>

      {productId && (
        <div className="mb-5 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4 text-sm">
          <p className="font-black text-cyan-800">Contexto comercial adjunto</p>
          <p className="mt-1 text-[var(--muted)]">La publicación conservará el producto y la referencia de afiliado para conectar Muro, producto, Chat y Checkout.</p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Tipo de contenido">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = type === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => resetForm(tab.value)}
              disabled={saving}
              className={"min-h-28 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 " +
                (selected
                  ? "border-cyan-300/50 bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-950/15"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-cyan-300/40 hover:bg-[var(--surface-secondary)]") +
                " disabled:cursor-not-allowed disabled:opacity-60"}
            >
              <Icon className={"size-5 " + (selected ? "text-white" : "text-[var(--primary)]")} aria-hidden="true" />
              <span className="mt-2 block text-sm font-black">{tab.label}</span>
              <span className={"mt-1 block text-[11px] leading-4 " + (selected ? "text-white/85" : "text-[var(--muted)]")}>{tab.description}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={submit} className="space-y-5" aria-label={"Crear " + currentTab.label}>
        {(type === "ad") && (
          <label className="block text-sm font-semibold">
            Título de la campaña
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={180}
              className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
              placeholder="Ej. Lanzamiento de temporada"
            />
          </label>
        )}
        {type !== "ad" && (
          <label className="block text-sm font-semibold">
            Título o encabezado <span className="font-normal text-[var(--muted)]">(opcional)</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={180}
              className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
              placeholder="Ponle un título a tu contenido"
            />
          </label>
        )}

        <label className="block text-sm font-semibold">
          {type === "story" ? "Texto de la historia" : type === "reel" ? "Descripción del reel" : type === "ad" ? "Texto de la campaña" : "¿Qué quieres compartir?"}
          <span className="ml-2 font-normal text-[var(--muted)]">(opcional si añades multimedia)</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={type === "story" ? 4 : 5}
            maxLength={5000}
            className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            placeholder={type === "story" ? "Escribe un mensaje para tu historia…" : "Comparte una idea, novedad o descripción…"}
          />
        </label>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]/65 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <ImagePlus className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-black">Fotos y vídeos</p>
              <p className="text-xs text-[var(--muted)]">
                {type === "reel" ? "Añade un vídeo para crear el reel." : type === "post" ? "Combina hasta 10 imágenes o vídeos en una publicación." : "Añade una imagen o un vídeo, o publica solo texto."}
              </p>
            </div>
          </div>
          <MarketplaceMediaUploader
            kind={uploaderKind}
            multiple={type === "post"}
            maxFiles={maxFiles}
            value={media}
            onChange={setMedia}
          />
        </div>

        {type !== "ad" && (
          <label className="block text-sm font-semibold">
            Privacidad
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as "public" | "private")}
              className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            >
              <option value="public">Público</option>
              <option value="private">Solo yo</option>
            </select>
          </label>
        )}

        {type === "ad" && (
          <div className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 md:grid-cols-2">
            <label className="block text-sm font-semibold">
              URL de destino <span className="font-normal text-[var(--muted)]">(opcional)</span>
              <input type="url" value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" placeholder="https://tu-tienda.com" />
            </label>
            <label className="block text-sm font-semibold">
              Presupuesto <span className="font-normal text-[var(--muted)]">(opcional)</span>
              <input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]" placeholder="0.00" />
            </label>
          </div>
        )}

        {requiresDisclosure && (
          <label className="flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-50/70 p-4 text-sm text-amber-950">
            <input type="checkbox" checked={disclosure} onChange={(event) => setDisclosure(event.target.checked)} className="mt-1 size-4 shrink-0" required />
            <span>
              Confirmo que identificaré esta pieza como publicidad o contenido afiliado y que la información comercial es comprobable.
            </span>
          </label>
        )}

        {error && (
          <div role="alert" aria-live="assertive" className="flex gap-3 rounded-2xl border border-rose-300/40 bg-rose-50 p-4 text-sm text-rose-900">
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-black">No se pudo enviar el contenido</p>
              <p className="mt-1 leading-6">{error}</p>
              {requestId && <p className="mt-2 text-xs text-rose-800">Código de soporte: {requestId}</p>}
            </div>
          </div>
        )}
        {notice && (
          <div role="status" aria-live="polite" className="flex gap-3 rounded-2xl border border-emerald-300/40 bg-emerald-50 p-4 text-sm text-emerald-950">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-black">Contenido recibido</p>
              <p className="mt-1 leading-6">{notice}</p>
              {requestId && <p className="mt-2 text-xs text-emerald-800">Referencia: {requestId}</p>}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Enviando…" : type === "ad" ? "Enviar campaña a revisión" : "Compartir " + currentTab.label.toLowerCase()}
        </button>
      </form>
    </section>
  );
}
