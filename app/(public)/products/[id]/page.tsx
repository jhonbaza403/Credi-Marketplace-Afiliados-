'use client';

// ==========================================================
// ARCHIVO: src/app/products/[id]/page.tsx
// Credi Marketplace
//
// Detalle de producto.
//
// RESPONSABILIDADES:
// - Cargar un producto por ID.
// - Mostrar información comercial.
// - Mostrar galería de imágenes.
// - Mantener código de afiliado.
// - Dirigir al checkout.
// - Manejar estados de carga, error y producto agotado.
// - Diseño responsive y premium.
//
// ARQUITECTURA:
// - Supabase únicamente mediante createClient().
// - No utiliza SERVICE_ROLE_KEY.
// - El control real de acceso debe permanecer en RLS.
// ==========================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
} from 'lucide-react';

import {
  useParams,
  useRouter,
  useSearchParams,
} from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// ==========================================================
// 1. TIPOS
// ==========================================================

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  images: string[] | null;
  stock: number | null;
  is_active?: boolean | null;
}

type ProductState =
  | 'loading'
  | 'success'
  | 'error';

// ==========================================================
// 2. CONSTANTES
// ==========================================================

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop';

// ==========================================================
// 3. COMPONENTE
// ==========================================================

export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ========================================================
  // 3.1 IDENTIFICADORES
  // ========================================================

  const productId = useMemo(() => {
    const value = params?.id;

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return null;
  }, [params]);

  const refCode = useMemo(
    () => searchParams.get('ref')?.trim() || null,
    [searchParams]
  );

  // ========================================================
  // 3.2 ESTADO
  // ========================================================

  const [product, setProduct] =
    useState<Product | null>(null);

  const [state, setState] =
    useState<ProductState>('loading');

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [selectedImage, setSelectedImage] =
    useState(0);

  // ========================================================
  // 4. CARGAR PRODUCTO
  // ========================================================

  useEffect(() => {
    let cancelled = false;

    async function fetchProduct() {
      if (!productId) {
        if (!cancelled) {
          setState('error');
          setErrorMessage(
            'No se proporcionó un identificador válido.'
          );
        }

        return;
      }

      setState('loading');
      setErrorMessage(null);

      try {
        const {
          data,
          error,
        } = await supabase
          .from('products')
          .select(
            'id, title, description, price, images, stock, is_active'
          )
          .eq('id', productId)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          if (!cancelled) {
            setProduct(null);
            setState('error');
            setErrorMessage(
              'El producto no existe o ya no está disponible.'
            );
          }

          return;
        }

        if (!cancelled) {
          setProduct(data as Product);
          setSelectedImage(0);
          setState('success');
        }
      } catch (error: unknown) {
        console.error(
          '[ProductDetailPage] Error cargando producto:',
          error
        );

        if (!cancelled) {
          setProduct(null);
          setState('error');

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No fue posible cargar el producto.'
          );
        }
      }
    }

    void fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  // ========================================================
  // 5. IMÁGENES
  // ========================================================

  const productImages = useMemo(() => {
    const images =
      product?.images?.filter(
        (image): image is string =>
          typeof image === 'string' &&
          image.trim().length > 0
      ) ?? [];

    return images.length > 0
      ? images
      : [FALLBACK_IMAGE];
  }, [product?.images]);

  const currentImage =
    productImages[selectedImage] ??
    productImages[0] ??
    FALLBACK_IMAGE;

  // ========================================================
  // 6. DISPONIBILIDAD
  // ========================================================

  const stock = product?.stock ?? 0;

  const isAvailable = stock > 0;

  const availabilityLabel = useMemo(() => {
    if (stock <= 0) {
      return 'Agotado';
    }

    if (stock === 1) {
      return 'Última unidad';
    }

    if (stock <= 5) {
      return `Solo ${stock} unidades`;
    }

    return `${stock} unidades disponibles`;
  }, [stock]);

  // ========================================================
  // 7. PRECIO
  // ========================================================

  const formattedPrice = useMemo(() => {
    if (!product) {
      return '$0.00';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(product.price) || 0);
  }, [product]);

  // ========================================================
  // 8. GALERÍA
  // ========================================================

  const previousImage = useCallback(() => {
    setSelectedImage((current) =>
      current === 0
        ? productImages.length - 1
        : current - 1
    );
  }, [productImages.length]);

  const nextImage = useCallback(() => {
    setSelectedImage((current) =>
      current === productImages.length - 1
        ? 0
        : current + 1
    );
  }, [productImages.length]);

  // ========================================================
  // 9. CHECKOUT
  // ========================================================

  const handleBuyNow = useCallback(() => {
    if (!product || !isAvailable) {
      return;
    }

    const params = new URLSearchParams();

    params.set(
      'product_id',
      product.id
    );

    if (refCode) {
      params.set('ref', refCode);
    }

    router.push(
      `/checkout?${params.toString()}`
    );
  }, [
    product,
    isAvailable,
    refCode,
    router,
  ]);

  // ========================================================
  // 10. ESTADO DE CARGA
  // ========================================================

  if (state === 'loading') {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="mb-8 h-5 w-32 rounded bg-[var(--muted)]/10" />

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              <div className="aspect-square rounded-3xl bg-[var(--muted)]/10" />

              <div className="space-y-6 py-4">
                <div className="h-5 w-28 rounded bg-[var(--muted)]/10" />
                <div className="h-12 w-4/5 rounded bg-[var(--muted)]/10" />
                <div className="h-10 w-40 rounded bg-[var(--muted)]/10" />
                <div className="h-24 w-full rounded bg-[var(--muted)]/10" />
                <div className="h-14 w-full rounded-xl bg-[var(--muted)]/10" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ========================================================
  // 11. ERROR / NO ENCONTRADO
  // ========================================================

  if (
    state === 'error' ||
    !product
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-xl sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
            <Package
              aria-hidden="true"
              className="size-8"
            />
          </div>

          <h1 className="mt-6 text-2xl font-black text-[var(--foreground)]">
            Producto no disponible
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {errorMessage ??
              'El producto que buscas no existe, fue retirado o ya no está disponible.'}
          </p>

          <Link
            href="/products"
            className="
              mt-8
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-[var(--primary)]
              px-5
              py-3
              text-sm
              font-bold
              text-white
              shadow-lg
              transition-all
              hover:-translate-y-0.5
              hover:bg-[var(--primary-hover)]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[var(--primary)]
              focus-visible:ring-offset-2
            "
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4"
            />

            Volver al catálogo
          </Link>
        </div>
      </main>
    );
  }

  // ========================================================
  // 12. RENDER PRINCIPAL
  // ========================================================

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">

        {/* ==================================================
            BREADCRUMB / REGRESO
        ================================================== */}

        <Link
          href="/products"
          className="
            mb-8
            inline-flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-[var(--muted)]
            transition-colors
            hover:text-[var(--foreground)]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-[var(--primary)]
          "
        >
          <ArrowLeft
            aria-hidden="true"
            className="size-4"
          />

          Volver al catálogo
        </Link>

        {/* ==================================================
            PRODUCTO
        ================================================== */}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)] lg:gap-16">

          {/* =================================================
              GALERÍA
          ================================================= */}

          <section aria-label="Galería del producto">

            <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface-secondary)] shadow-2xl shadow-black/5">

              <Image
                src={currentImage}
                alt={product.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover transition-transform duration-500"
              />

              {/* AFILIADO */}

              {refCode && (
                <div className="absolute left-4 top-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/95 px-3 py-2 text-xs font-bold text-emerald-700 shadow-lg backdrop-blur dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300">
                    <Check
                      aria-hidden="true"
                      className="size-3.5"
                    />

                    Enlace de afiliado activo
                  </div>
                </div>
              )}

              {/* CONTROLES */}

              {productImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={previousImage}
                    aria-label="Imagen anterior"
                    className="
                      absolute
                      left-4
                      top-1/2
                      flex
                      size-10
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-white/20
                      bg-black/40
                      text-white
                      shadow-lg
                      backdrop-blur-md
                      transition
                      hover:bg-black/60
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-white
                    "
                  >
                    <ChevronLeft
                      aria-hidden="true"
                      className="size-5"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={nextImage}
                    aria-label="Siguiente imagen"
                    className="
                      absolute
                      right-4
                      top-1/2
                      flex
                      size-10
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-white/20
                      bg-black/40
                      text-white
                      shadow-lg
                      backdrop-blur-md
                      transition
                      hover:bg-black/60
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-white
                    "
                  >
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5"
                    />
                  </button>
                </>
              )}
            </div>

            {/* MINIATURAS */}

            {productImages.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {productImages
                  .slice(0, 5)
                  .map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() =>
                        setSelectedImage(index)
                      }
                      aria-label={`Ver imagen ${index + 1}`}
                      aria-current={
                        selectedImage === index
                      }
                    >
                      <div
                        className={`
                          relative
                          aspect-square
                          overflow-hidden
                          rounded-xl
                          border-2
                          bg-[var(--surface-secondary)]
                          transition-all
                          ${
                            selectedImage === index
                              ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20'
                              : 'border-[var(--border)] hover:border-[var(--primary)]/40'
                          }
                        `}
                      >
                        <Image
                          src={image}
                          alt={`${product.title} — imagen ${index + 1}`}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </section>

          {/* =================================================
              INFORMACIÓN
          ================================================= */}

          <section className="flex flex-col">

            {/* ETIQUETA */}

            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              <Sparkles
                aria-hidden="true"
                className="size-4"
              />

              Credi Marketplace
            </div>

            {/* TÍTULO */}

            <h1 className="mt-4 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl lg:leading-[1.08]">
              {product.title}
            </h1>

            {/* PRECIO */}

            <div className="mt-6">
              <span className="text-4xl font-black tracking-tight text-[var(--primary)] sm:text-5xl">
                {formattedPrice}
              </span>
            </div>

            {/* DESCRIPCIÓN */}

            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
                Descripción
              </h2>

              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--muted)] sm:text-base">
                {product.description?.trim() ||
                  'Este producto no tiene una descripción disponible actualmente.'}
              </p>
            </div>

            {/* DISPONIBILIDAD */}

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
              <div className="flex items-center justify-between gap-4">

                <div className="flex items-center gap-3">
                  <div
                    className={`
                      flex
                      size-10
                      items-center
                      justify-center
                      rounded-xl
                      ${
                        isAvailable
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }
                    `}
                  >
                    <Package
                      aria-hidden="true"
                      className="size-5"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[var(--muted)]">
                      Disponibilidad
                    </p>

                    <p
                      className={`
                        text-sm
                        font-black
                        ${
                          isAvailable
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      `}
                    >
                      {availabilityLabel}
                    </p>
                  </div>
                </div>

                {isAvailable && (
                  <span className="hidden text-xs font-semibold text-[var(--muted)] sm:block">
                    Compra segura
                  </span>
                )}
              </div>
            </div>

            {/* AFILIACIÓN */}

            {refCode && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Afiliación
                </p>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Esta compra conserva el código de referencia para atribuir la comisión correspondiente.
                </p>

                <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Referencia: {refCode}
                </p>
              </div>
            )}

            {/* CTA */}

            <div className="mt-8 space-y-3">

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!isAvailable}
                className="
                  inline-flex
                  min-h-14
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-[var(--primary)]
                  px-6
                  py-4
                  text-base
                  font-black
                  text-white
                  shadow-xl
                  shadow-blue-900/10
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-[var(--primary-hover)]
                  hover:shadow-2xl
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[var(--primary)]
                  focus-visible:ring-offset-2
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  disabled:hover:translate-y-0
                "
              >
                <ShoppingCart
                  aria-hidden="true"
                  className="size-5"
                />

                {isAvailable
                  ? 'Comprar ahora'
                  : 'Producto agotado'}
              </button>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-3">
                  <ShieldCheck
                    aria-hidden="true"
                    className="size-5 shrink-0 text-emerald-500"
                  />

                  <span className="text-xs font-semibold text-[var(--muted)]">
                    Compra protegida
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-3">
                  <Truck
                    aria-hidden="true"
                    className="size-5 shrink-0 text-[var(--primary)]"
                  />

                  <span className="text-xs font-semibold text-[var(--muted)]">
                    Gestión de pedido
                  </span>
                </div>
              </div>
            </div>

            {/* NOTA */}

            <p className="mt-6 text-center text-xs leading-5 text-[var(--muted-light)]">
              El precio y la disponibilidad pueden cambiar según las condiciones actuales del vendedor.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
