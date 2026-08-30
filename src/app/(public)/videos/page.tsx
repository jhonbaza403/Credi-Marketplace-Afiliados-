'use client';

// ==========================================================
// ARCHIVO: src/app/videos/page.tsx
// Credi Marketplace
//
// Feed vertical de videos.
//
// CARACTERÍSTICAS:
// - Feed vertical tipo marketplace/social.
// - Videos de hasta 90 segundos.
// - Reproducción automática.
// - Controles básicos.
// - Like.
// - Compartir.
// - Acceso al producto/servicio.
// - Diseño responsive.
// - Preparado para conectar Supabase.
//
// IMPORTANTE:
// La consulta a Supabase NO se realiza directamente aquí.
// La capa de datos deberá encargarse posteriormente.
// ==========================================================

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import Link from 'next/link';

import {
  Heart,
  MessageCircle,
  Package,
  Play,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react';

// ==========================================================
// TIPOS
// ==========================================================

type VideoItem = {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  productId?: string | null;
  productName?: string | null;
  creatorName?: string | null;
  likes?: number;
  comments?: number;
};

// ==========================================================
// DATOS TEMPORALES
// ==========================================================
//
// Estos datos mantienen la página funcional mientras
// conectamos la tabla real de Supabase.
//
// IMPORTANTE:
// Sustituir posteriormente por videoService.
// ==========================================================

const demoVideos: VideoItem[] = [
  {
    id: 'demo-1',
    title: 'Descubre nuevos productos',
    description:
      'Conoce productos y servicios destacados de Credi Marketplace.',
    videoUrl: '',
    thumbnailUrl: null,
    productId: null,
    productName: 'Ver productos',
    creatorName: 'Credi Marketplace',
    likes: 0,
    comments: 0,
  },
];

// ==========================================================
// COMPONENTE
// ==========================================================

export default function VideosFeedPage() {
  const [videos] =
    useState<VideoItem[]>(demoVideos);

  const [activeVideo, setActiveVideo] =
    useState<string | null>(
      demoVideos[0]?.id ?? null
    );

  const [muted, setMuted] =
    useState(true);

  const [likedVideos, setLikedVideos] =
    useState<Set<string>>(
      () => new Set()
    );

  // ========================================================
  // REFERENCIAS DE VIDEO
  // ========================================================

  const videoRefs =
    useRef<Record<string, HTMLVideoElement | null>>(
      {}
    );

  // ========================================================
  // OBSERVER
  // ========================================================

  useEffect(() => {
    const elements = Object.entries(
      videoRefs.current
    ).filter(
      ([, element]) =>
        element !== null
    );

    if (!elements.length) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const element =
              entry.target as HTMLVideoElement;

            if (entry.isIntersecting) {
              setActiveVideo(
                element.dataset.videoId ??
                  null
              );

              void element.play().catch(() => {
                // El navegador puede bloquear
                // autoplay; no interrumpimos la UI.
              });
            } else {
              element.pause();
            }
          });
        },
        {
          threshold: 0.75,
        }
      );

    elements.forEach(
      ([, element]) => {
        if (element) {
          observer.observe(element);
        }
      }
    );

    return () => {
      observer.disconnect();
    };
  }, [videos]);

  // ========================================================
  // LIKE
  // ========================================================

  const handleLike = useCallback(
    (videoId: string) => {
      setLikedVideos((current) => {
        const next =
          new Set(current);

        if (next.has(videoId)) {
          next.delete(videoId);
        } else {
          next.add(videoId);
        }

        return next;
      });

      // TODO:
      // Conectar posteriormente:
      //
      // videoService.toggleLike(videoId)
    },
    []
  );

  // ========================================================
  // COMPARTIR
  // ========================================================

  const handleShare = useCallback(
    async (video: VideoItem) => {
      const url =
        typeof window !== 'undefined'
          ? `${window.location.origin}/videos/${video.id}`
          : '';

      try {
        if (
          navigator.share
        ) {
          await navigator.share({
            title: video.title,
            text:
              video.description ??
              'Mira este video en Credi Marketplace.',
            url,
          });

          return;
        }

        await navigator.clipboard.writeText(
          url
        );
      } catch {
        // El usuario puede cancelar
        // el diálogo de compartir.
      }
    },
    []
  );

  // ========================================================
  // AUDIO
  // ========================================================

  const toggleMute =
    useCallback(() => {
      setMuted((current) => !current);

      Object.values(
        videoRefs.current
      ).forEach((video) => {
        if (video) {
          video.muted =
            !muted;
        }
      });
    }, [muted]);

  // ========================================================
  // ESTADO VACÍO
  // ========================================================

  if (!videos.length) {
    return (
      <main
        className="
          flex
          min-h-[calc(100vh-4rem)]
          items-center
          justify-center
          bg-black
          px-4
          text-white
        "
      >
        <div className="text-center">
          <Play
            aria-hidden="true"
            className="
              mx-auto
              size-12
              text-white/40
            "
          />

          <h1 className="mt-4 text-2xl font-black">
            No hay videos disponibles
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Próximamente encontrarás nuevos
            productos y servicios.
          </p>
        </div>
      </main>
    );
  }

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <main
      className="
        min-h-[calc(100vh-4rem)]
        bg-black
        text-white
      "
    >
      {/* ====================================================
          CABECERA
      ==================================================== */}

      <div
        className="
          sticky
          top-16
          z-30
          flex
          items-center
          justify-between
          border-b
          border-white/10
          bg-black/80
          px-4
          py-3
          backdrop-blur-xl
        "
      >
        <div>
          <h1 className="text-lg font-black">
            Videos
          </h1>

          <p className="text-xs text-white/50">
            Productos y servicios
          </p>
        </div>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={
            muted
              ? 'Activar sonido'
              : 'Silenciar videos'
          }
          className="
            flex
            size-10
            items-center
            justify-center
            rounded-full
            bg-white/10
            transition-colors
            hover:bg-white/20
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-white
          "
        >
          {muted ? (
            <VolumeX
              aria-hidden="true"
              className="size-5"
            />
          ) : (
            <Volume2
              aria-hidden="true"
              className="size-5"
            />
          )}
        </button>
      </div>

      {/* ====================================================
          FEED
      ==================================================== */}

      <div
        className="
          mx-auto
          w-full
          max-w-md
          snap-y
          snap-mandatory
          overflow-y-auto
          overscroll-contain
        "
      >
        {videos.map((video) => {
          const isLiked =
            likedVideos.has(
              video.id
            );

          const isActive =
            activeVideo ===
            video.id;

          return (
            <article
              key={video.id}
              className="
                relative
                h-[calc(100vh-4rem)]
                min-h-[600px]
                snap-start
                overflow-hidden
                bg-neutral-950
              "
            >
              {/* =================================================
                  VIDEO
              ================================================= */}

              {video.videoUrl ? (
                <video
                  ref={(element) => {
                    videoRefs.current[
                      video.id
                    ] = element;
                  }}
                  data-video-id={
                    video.id
                  }
                  src={
                    video.videoUrl
                  }
                  poster={
                    video.thumbnailUrl ??
                    undefined
                  }
                  muted={muted}
                  loop
                  playsInline
                  preload="metadata"
                  className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    object-cover
                  "
                  aria-label={
                    video.title
                  }
                />
              ) : (
                <div
                  className="
                    absolute
                    inset-0
                    flex
                    items-center
                    justify-center
                    bg-gradient-to-b
                    from-neutral-900
                    via-neutral-950
                    to-black
                  "
                >
                  <div className="text-center">
                    <Play
                      aria-hidden="true"
                      className="
                        mx-auto
                        size-14
                        text-white/30
                      "
                    />

                    <p className="mt-3 text-sm text-white/40">
                      Video próximamente
                    </p>
                  </div>
                </div>
              )}

              {/* =================================================
                  DEGRADADO
              ================================================= */}

              <div
                className="
                  pointer-events-none
                  absolute
                  inset-0
                  bg-gradient-to-t
                  from-black
                  via-black/20
                  to-transparent
                "
              />

              {/* =================================================
                  INFORMACIÓN
              ================================================= */}

              <div
                className="
                  absolute
                  inset-x-0
                  bottom-0
                  z-10
                  p-5
                  pb-8
                "
              >
                <div className="pr-16">
                  {video.creatorName && (
                    <p className="mb-2 text-sm font-bold">
                      @{video.creatorName}
                    </p>
                  )}

                  <h2 className="text-xl font-black">
                    {video.title}
                  </h2>

                  {video.description && (
                    <p
                      className="
                        mt-2
                        line-clamp-3
                        text-sm
                        leading-5
                        text-white/75
                      "
                    >
                      {video.description}
                    </p>
                  )}
                </div>

                {/* PRODUCTO */}

                {video.productId && (
                  <Link
                    href={`/productos/${video.productId}`}
                    className="
                      mt-4
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-white
                      px-4
                      py-2.5
                      text-sm
                      font-black
                      text-black
                      transition-transform
                      hover:scale-[1.02]
                    "
                  >
                    <Package
                      aria-hidden="true"
                      className="size-4"
                    />

                    {video.productName ??
                      'Ver producto'}
                  </Link>
                )}
              </div>

              {/* =================================================
                  ACCIONES
              ================================================= */}

              <div
                className="
                  absolute
                  right-4
                  bottom-28
                  z-20
                  flex
                  flex-col
                  items-center
                  gap-5
                "
              >
                {/* LIKE */}

                <button
                  type="button"
                  onClick={() =>
                    handleLike(
                      video.id
                    )
                  }
                  aria-label={
                    isLiked
                      ? 'Quitar me gusta'
                      : 'Me gusta'
                  }
                  aria-pressed={
                    isLiked
                  }
                  className="
                    flex
                    flex-col
                    items-center
                    gap-1
                  "
                >
                  <span
                    className={`
                      flex
                      size-12
                      items-center
                      justify-center
                      rounded-full
                      bg-black/45
                      backdrop-blur-md
                      transition-transform
                      hover:scale-110
                      ${
                        isLiked
                          ? 'text-red-500'
                          : 'text-white'
                      }
                    `}
                  >
                    <Heart
                      aria-hidden="true"
                      className="size-6"
                      fill={
                        isLiked
                          ? 'currentColor'
                          : 'none'
                      }
                    />
                  </span>

                  <span className="text-[11px] font-bold">
                    {video.likes ??
                      0}
                  </span>
                </button>

                {/* COMENTARIOS */}

                <button
                  type="button"
                  aria-label="Comentarios"
                  className="
                    flex
                    flex-col
                    items-center
                    gap-1
                  "
                >
                  <span
                    className="
                      flex
                      size-12
                      items-center
                      justify-center
                      rounded-full
                      bg-black/45
                      backdrop-blur-md
                    "
                  >
                    <MessageCircle
                      aria-hidden="true"
                      className="size-6"
                    />
                  </span>

                  <span className="text-[11px] font-bold">
                    {video.comments ??
                      0}
                  </span>
                </button>

                {/* COMPARTIR */}

                <button
                  type="button"
                  onClick={() =>
                    handleShare(
                      video
                    )
                  }
                  aria-label="Compartir video"
                  className="
                    flex
                    flex-col
                    items-center
                    gap-1
                  "
                >
                  <span
                    className="
                      flex
                      size-12
                      items-center
                      justify-center
                      rounded-full
                      bg-black/45
                      backdrop-blur-md
                      transition-transform
                      hover:scale-110
                    "
                  >
                    <Share2
                      aria-hidden="true"
                      className="size-6"
                    />
                  </span>

                  <span className="text-[11px] font-bold">
                    Compartir
                  </span>
                </button>
              </div>

              {/* =================================================
                  INDICADOR
              ================================================= */}

              {isActive &&
                video.videoUrl && (
                  <div
                    className="
                      absolute
                      left-1/2
                      top-1/2
                      z-10
                      -translate-x-1/2
                      -translate-y-1/2
                      pointer-events-none
                    "
                  >
                    <span className="sr-only">
                      Reproduciendo
                    </span>
                  </div>
                )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
