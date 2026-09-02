import Image from "next/image";

interface ShortItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  videoUrl?: string;
  author?: string;
}

interface ShortsFeedProps {
  shorts: readonly ShortItem[];
}

export default function ShortsFeed({
  shorts,
}: ShortsFeedProps) {
  if (shorts.length === 0) {
    return (
      <section className="rounded-xl border bg-gray-50 p-6 text-center text-gray-500">
        No hay contenido disponible.
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white p-6">
      <header className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Credi Shorts</h2>
        <p className="text-sm text-gray-600">
          Descubre productos, ofertas y novedades.
        </p>
      </header>

      <div className="flex gap-5 overflow-x-auto pb-4">
        {shorts.map((item) => (
          <article
            key={item.id}
            className="min-w-[260px] overflow-hidden rounded-xl border bg-white shadow-sm"
          >
            <div className="relative flex h-44 items-center justify-center bg-gray-100">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  unoptimized
                  sizes="260px"
                  className="object-cover"
                />
              ) : (
                <span className="text-gray-400">Video</span>
              )}
            </div>

            <div className="space-y-2 p-4">
              <h3 className="font-semibold text-gray-900">
                {item.title}
              </h3>

              {item.description && (
                <p className="text-sm text-gray-600">
                  {item.description}
                </p>
              )}

              {item.author && (
                <p className="text-xs text-gray-500">
                  Por {item.author}
                </p>
              )}

              {item.videoUrl && (
                <a
                  href={item.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                >
                  Ver video
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
