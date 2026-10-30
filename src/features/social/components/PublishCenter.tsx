"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Camera, CheckCircle2, Eye, ImagePlus, Megaphone, Play, Radio, Send, Sparkles, Users } from "lucide-react";
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

export default function PublishCenter({ initialType = "post" }: { initialType?: ContentType }) {
  const [type, setType] = useState<ContentType>(initialType);
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
  const requiresDisclosure = type === "ad" || Boolean(affiliateRef);

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
  const firstMedia = media[0] ?? null;
  const previewShape = type === "story" ? "aspect-[4/5]" : type === "reel" ? "aspect-[9/14] max-h-[430px]" : "aspect-video";
  const previewTitle = title.trim() || (type === "ad" ? "Tu campaña comercial" : type === "reel" ? "Tu nuevo reel" : type === "story" ? "Tu historia" : "Tu próxima publicación");
  const previewBody = body.trim() || "El texto que escribas aparecerá aquí. Puedes combinarlo con imágenes o vídeos para presentar tu contenido.";
  const readiness = [
    { label: type === "reel" ? "Vídeo vertical añadido" : "Contenido preparado", done: type === "reel" ? media.some((item) => item.kind === "video") : Boolean(body.trim() || media.length) },
    { label: type === "ad" ? "Título de campaña" : "Mensaje o multimedia", done: type === "ad" ? Boolean(title.trim()) : Boolean(body.trim() || media.length) },
    { label: "Privacidad revisada", done: type === "ad" || Boolean(visibility) },
    { label: "Declaración comercial", done: !requiresDisclosure || disclosure },
  ];

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/95 p-4 text-[var(--foreground)] shadow-2xl backdrop-blur-xl sm:p-7 lg:p-8">
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_90%_0%,rgba(34,211,238,.2),transparent_35%),linear-gradient(135deg,#08152a,#11132e_65%,#24113d)] p-5 text-white shadow-xl sm:p-7">
        <div className="relative z-10 flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
            <Sparkles className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Credi Studio · Social Commerce</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Publica con estilo. Conecta con clientes.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
              Un compositor para tu comunidad y tu negocio. Crea contenido, presenta productos y dirige conversaciones comerciales desde Credi.
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

      <form onSubmit={submit} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]" aria-label={"Crear " + currentTab.label}>
        <div className="space-y-5">
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
            <span className="mt-1 block text-right text-[11px] text-[var(--muted)]">{title.length}/180</span>
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
            placeholder={type === "story" ? "Escribe un mensaje para tu historia…" : type === "reel" ? "Cuenta qué verá la gente en el vídeo…" : "Comparte una idea, novedad o descripción…"}
          />
          <span className="mt-1 block text-right text-[11px] text-[var(--muted)]">{body.length.toLocaleString("es-ES")}/5.000 caracteres</span>
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
          {saving ? "Enviando…" : type === "ad" ? "Enviar campaña a revisión" : "Enviar " + currentTab.label.toLowerCase() + " a revisión"}
        </button>

        </div>
        <aside className="space-y-4 xl:sticky xl:top-32 xl:self-start">
          <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-black"><Eye className="size-4 text-[var(--primary)]"/> Vista previa</span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-2.5 py-1 text-[10px] font-bold text-[var(--muted)]">Borrador visual</span>
            </div>
            <article className="p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-black text-white">C</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">Tu perfil en Credi</p>
                  <p className="text-[11px] text-[var(--muted)]">{type === "ad" ? "Campaña · revisión pendiente" : visibility === "public" ? "Público · comunidad Credi" : "Privado · solo tú"}</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wide text-[var(--primary)]">{currentTab.label}</span>
              </div>
              <div className={"mt-4 overflow-hidden rounded-2xl bg-[var(--surface-secondary)] " + previewShape}>
                {firstMedia ? firstMedia.kind === "video" ? (
                  <video src={firstMedia.url} controls playsInline preload="metadata" className="h-full w-full object-cover" aria-label="Vista previa del vídeo"/>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={firstMedia.url} alt="Vista previa de la publicación" className="h-full w-full object-cover"/>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,.14),transparent_45%),var(--surface-secondary)] p-6 text-center">
                    <div className="grid size-14 place-items-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"><Camera className="size-7"/></div>
                    <p className="text-sm font-bold text-[var(--foreground)]">Tu contenido aparecerá aquí</p>
                    <p className="max-w-xs text-xs leading-5 text-[var(--muted)]">Añade una foto, un vídeo o escribe tu mensaje para ver cómo se presentará.</p>
                  </div>
                )}
              </div>
              <div className="pt-4">
                <h3 className="text-base font-black">{previewTitle}</h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--muted)]">{previewBody}</p>
                {type === "ad" && destinationUrl.trim() && <p className="mt-3 truncate text-xs font-bold text-[var(--primary)]">{destinationUrl.trim()}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px] font-semibold text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5"><Users className="size-3.5"/> Comunidad</span>
                <span>{media.length} archivo{media.length === 1 ? "" : "s"}</span>
              </div>
            </article>
          </section>
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)]/70 p-4">
            <p className="text-sm font-black">Antes de enviar</p>
            <div className="mt-3 space-y-2.5">
              {readiness.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-xs">
                  {item.done ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600"/> : <span className="size-4 shrink-0 rounded-full border border-[var(--border-strong)]"/>}
                  <span className={item.done ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]"}>{item.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] leading-5 text-[var(--muted)]">La vista previa es orientativa. La plataforma confirma el estado de revisión después de guardar.</p>
          </section>
        </aside>
      </form>
      </section>
  );
}
