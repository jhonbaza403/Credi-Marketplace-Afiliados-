'use client';

// ==========================================================
// ARCHIVO: src/app/products/detail/page.tsx
// Credi Marketplace
//
// Detalle público de producto.
//
// RESPONSABILIDADES:
// - Cargar un producto por ID.
// - Mostrar información comercial.
// - Mantener el código de afiliado.
// - Dirigir al checkout.
// - Manejar estados de carga, error y producto agotado.
// - Presentación responsive y premium.
//
// REGLA:
// Este componente utiliza el cliente público de Supabase.
// Las reglas reales de acceso deben estar protegidas mediante RLS.
// ==========================================================

import Image from 'next/image';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Package,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

// ==========================================================
// 1. TIPOS
// ==========================================================

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  images: string[] | null;
  stock: number;
}

type ProductState =
  | 'loading'
  | 'success'
  | 'error'
  | 'missing';

// ==========================================================
// 2. CONSTANTES
// ==========================================================

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop';

const MAX_REF_LENGTH = 100;

// ==========================================================
// 3. CONTENIDO PRINCIPAL
// ==========================================================

function ProductDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const productId = searchParams.get('id');
  const rawRefCode = searchParams.get('ref');

  // --------------------------------------------------------
  // Estado
  // --------------------------------------------------------

  const [product, setProduct] =
    useState<Product | null>(null);

  const [state, setState] =
    useState<ProductState>('loading');

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [isBuying, setIsBuying] =
    useState(false);

  // ========================================================
  // 4. NORMALIZACIÓN DEL CÓDIGO DE AFILIADO
  // ========================================================

  const refCode = useMemo(() => {
    if (!rawRefCode) {
      return null;
    }

    const normalized = rawRefCode.trim();

    if (
      !normalized ||
      normalized.length > MAX_REF_LENGTH
    ) {
      return null;
    }

    return normalized;
  }, [rawRefCode]);

  // ========================================================
  // 5. CARGAR PRODUCTO
  // ========================================================

  useEffect(() => {
    let mounted = true;

    async function fetchProduct() {
      if (!productId) {
        if (mounted) {
          setState('missing');
          setProduct(null);
        }

        return;
      }

      setState('loading');
      setErrorMessage(null);

      try {
        const supabase = createClient();

        const {
          data,
          error,
        } = await supabase
          .from('products')
          .select(
            'id, title, description, price, images, stock'
          )
          .eq('id', productId)
          .eq('is_active', true)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            '[ProductDetail] Error consultando producto:',
            error
          );

          setProduct(null);
          setState('error');
          setErrorMessage(
            'No fue posible cargar la información del producto.'
          );

          return;
        }

        if (!data) {
          setProduct(null);
          setState('missing');
          return;
        }

        setProduct({
          id: data.id,
          title: data.title ?? 'Producto sin nombre',
          description: data.description ?? null,
          price:
            typeof data.price === 'number'
              ? data.price
              : Number(data.price) || 0,
          images: Array.isArray(data.images)
            ? data.images
            : null,
          stock:
            typeof data.stock === 'number'
              ? data.stock
              : Number(data.stock) || 0,
        });

        setState('success');
      } catch (error) {
        console.error(
          '[ProductDetail] Error inesperado:',
          error
        );

        if (!mounted) {
          return;
        }

        setProduct(null);
        setState('error');
        setErrorMessage(
          'Ocurrió un error inesperado al cargar el producto.'
        );
      }
    }

    void fetchProduct();

    return () => {
      mounted = false;
    };
  }, [productId]);

  // ========================================================
  // 6. IMAGEN PRINCIPAL
  // ========================================================

  const mainImage = useMemo(() => {
    const image = product?.images?.find(
      (item) =>
        typeof item === 'string' &&
        item.trim().length > 0
    );

    return image || FALLBACK_IMAGE;
  }, [product?.images]);

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
    }).format(product.price);
  }, [product]);

  // ========================================================
  // 8. DISPONIBILIDAD
  // ========================================================

  const isAvailable =
    product !== null &&
    product.stock > 0;

  // ========================================================
  // 9. CHECKOUT
  // ========================================================

  const handleBuyNow = useCallback(() => {
    if (!product || product.stock <= 0 || isBuying) {
      return;
    }

    setIsBuying(true);

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
    isBuying,
    product,
    refCode,
    router,
  ]);

  // ========================================================
  // 10. ESTADO DE CARGA
  // ========================================================

  if (state === 'loading') {
    return (
      <main
        className="
          flex
          min-h-[70vh]
          items-center
          justify-center
          bg-[var(--background)]
          px-4
        "
      >
        <div
          className="
            flex
            flex-col
            items-center
            gap-4
            text-center
          "
          role="status"
          aria-live="polite"
        >
          <div
            className="
              flex
              size-14
              items-center
              justify-center
              rounded-2xl
              bg-[var(--primary)]/10
            "
          >
            <Loader2
              aria-hidden="true"
              className="
                size-7
                animate-spin
                text-[var(--primary)]
              "
            />
          </div>

          <div>
            <p className="font-bold text-[var(--foreground)]">
              Cargando producto
            </p>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Estamos preparando los detalles...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ========================================================
  // 11. ESTADO DE ERROR / PRODUCTO NO ENCONTRADO
  // ========================================================

  if (
    state === 'error' ||
    state === 'missing' ||
    !product
  ) {
    const isMissing =
      state === 'missing';

    return (
      <main
        className="
          flex
          min-h-[70vh]
          items-center
          justify-center
          bg-[var(--background)]
          px-4
          py-16
        "
      >
        <div
          className="
            w-full
            max-w-lg
            rounded-3xl
            border
            border-[var(--border)]
            bg-[var(--surface)]
            p-8
            text-center
            shadow-xl
            sm:p-10
          "
        >
          <div
            className="
              mx-auto
              flex
              size-16
              items-center
              justify-center
              rounded-2xl
              bg-red-500/10
              text-red-500
            "
          >
            <AlertCircle
              aria-hidden="true"
              className="size-8"
            />
          </div>

          <h1
            className="
              mt-6
              text-2xl
              font-black
              tracking-tight
              text-[var(--foreground)]
            "
          >
            {isMissing
              ? 'Producto no encontrado'
              : 'No pudimos cargar el producto'}
          </h1>

          <p
            className="
              mx-auto
              mt-3
              max-w-md
              text-sm
              leading-6
              text-[var(--muted)]
            "
          >
            {isMissing
              ? 'El producto solicitado no existe, ya no está disponible o el enlace no es válido.'
              : errorMessage}
          </p>

          <Link
            href="/products"
            className="
              mt-7
              inline-flex
              min-h-11
              items-center
              justify-center
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
    <main
      className="
        min-h-screen
        bg-[var(--background)]
        py-8
        sm:py-10
        lg:py-14
      "
    >
      <div
        className="
          container-marketplace
          px-4
          sm:px-6
          lg:px-8
        "
      >
        {/* ==================================================
            BREADCRUMB
        ================================================== */}

        <nav
          aria-label="Ruta de navegación"
          className="mb-6"
        >
          <ol
            className="
              flex
              items-center
              gap-1
              text-xs
              text-[var(--muted)]
            "
          >
            <li>
              <Link
                href="/"
                className="hover:text-[var(--foreground)]"
              >
                Inicio
              </Link>
            </li>

            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>

            <li>
              <Link
                href="/products"
                className="hover:text-[var(--foreground)]"
              >
                Productos
              </Link>
            </li>

            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>

            <li
              aria-current="page"
              className="
                max-w-[220px]
                truncate
                font-medium
                text-[var(--foreground)]
              "
            >
              {product.title}
            </li>
          </ol>
        </nav>

        {/* ==================================================
            PRODUCTO
        ================================================== */}

        <section
          aria-labelledby="product-title"
          className="
            overflow-hidden
            rounded-[2rem]
            border
            border-[var(--border)]
            bg-[var(--surface)]
            shadow-xl
          "
        >
          <div
            className="
              grid
              grid-cols-1
              lg:grid-cols-2
            "
          >
            {/* =================================================
                IMAGEN
            ================================================= */}

            <div className="p-4 sm:p-6 lg:p-8">
              <div
                className="
                  relative
                  aspect-square
                  overflow-hidden
                  rounded-3xl
                  border
                  border-[var(--border)]
                  bg-[var(--surface-secondary)]
                "
              >
                <Image
                  src={mainImage}
                  alt={product.title}
                  fill
                  priority
                  sizes="
                    (max-width: 1024px) 100vw,
                    50vw
                  "
                  className="
                    object-cover
                    transition-transform
                    duration-700
                    hover:scale-[1.02]
                  "
                />

                {!isAvailable && (
                  <div
                    className="
                      absolute
                      inset-0
                      flex
                      items-center
                      justify-center
                      bg-black/45
                      backdrop-blur-[2px]
                    "
                  >
                    <span
                      className="
                        rounded-full
                        bg-black/70
                        px-4
                        py-2
                        text-sm
                        font-black
                        text-white
                        backdrop-blur-md
                      "
                    >
                      Agotado
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* =================================================
                INFORMACIÓN
            ================================================= */}

            <div
              className="
                flex
                flex-col
                justify-between
                border-t
                border-[var(--border)]
                p-6
                sm:p-8
                lg:border-l
                lg:border-t-0
                lg:p-10
              "
            >
              <div>
                {/* AFILIADO */}

                {refCode && (
                  <div
                    className="
                      mb-5
                      inline-flex
                      max-w-full
                      items-center
                      gap-2
                      rounded-full
                      border
                      border-emerald-500/20
                      bg-emerald-500/10
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                      text-emerald-700
                      dark:text-emerald-300
                    "
                  >
                    <Check
                      aria-hidden="true"
                      className="size-3.5 shrink-0"
                    />

                    <span className="truncate">
                      Enlace de afiliado activo
                    </span>
                  </div>
                )}

                {/* TÍTULO */}

                <h1
                  id="product-title"
                  className="
                    text-3xl
                    font-black
                    tracking-tight
                    text-[var(--foreground)]
                    sm:text-4xl
                  "
                >
                  {product.title}
                </h1>

                {/* PRECIO */}

                <div className="mt-6">
                  <span
                    className="
                      text-4xl
                      font-black
                      tracking-tight
                      text-[var(--primary)]
                    "
                  >
                    {formattedPrice}
                  </span>
                </div>

                {/* DESCRIPCIÓN */}

                <div
                  className="
                    mt-6
                    border-t
                    border-[var(--border)]
                    pt-6
                  "
                >
                  <h2
                    className="
                      text-sm
                      font-black
                      uppercase
                      tracking-wider
                      text-[var(--foreground)]
                    "
                  >
                    Descripción
                  </h2>

                  <p
                    className="
                      mt-3
                      text-sm
                      leading-7
                      text-[var(--muted)]
                    "
                  >
                    {product.description ||
                      'Este producto no cuenta actualmente con una descripción detallada.'}
                  </p>
                </div>

                {/* BENEFICIOS */}

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <div
                    className="
                      rounded-2xl
                      bg-[var(--surface-secondary)]
                      p-4
                    "
                  >
                    <Package
                      aria-hidden="true"
                      className="
                        size-5
                        text-[var(--primary)]
                      "
                    />

                    <p className="mt-2 text-xs font-bold text-[var(--foreground)]">
                      Producto verificado
                    </p>
                  </div>

                  <div
                    className="
                      rounded-2xl
                      bg-[var(--surface-secondary)]
                      p-4
                    "
                  >
                    <Truck
                      aria-hidden="true"
                      className="
                        size-5
                        text-[var(--primary)]
                      "
                    />

                    <p className="mt-2 text-xs font-bold text-[var(--foreground)]">
                      Compra sencilla
                    </p>
                  </div>

                  <div
                    className="
                      rounded-2xl
                      bg-[var(--surface-secondary)]
                      p-4
                    "
                  >
                    <ShieldCheck
                      aria-hidden="true"
                      className="
                        size-5
                        text-[var(--primary)]
                      "
                    />

                    <p className="mt-2 text-xs font-bold text-[var(--foreground)]">
                      Compra segura
                    </p>
                  </div>
                </div>
              </div>

              {/* =================================================
                  COMPRA
              ================================================= */}

              <div
                className="
                  mt-8
                  border-t
                  border-[var(--border)]
                  pt-6
                "
              >
                <div
                  className="
                    mb-4
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >
                  <div>
                    <p className="text-xs text-[var(--muted)]">
                      Disponibilidad
                    </p>

                    <p
                      className={`
                        mt-1
                        text-sm
                        font-black
                        ${
                          isAvailable
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500'
                        }
                      `}
                    >
                      {isAvailable
                        ? `${product.stock} unidades disponibles`
                        : 'Producto agotado'}
                    </p>
                  </div>

                  <ShoppingBag
                    aria-hidden="true"
                    className="
                      size-5
                      text-[var(--muted)]
                    "
                  />
                </div>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!isAvailable || isBuying}
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
                    shadow-lg
                    shadow-blue-900/10
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:bg-[var(--primary-hover)]
                    hover:shadow-xl
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[var(--primary)]
                    focus-visible:ring-offset-2
                    disabled:cursor-not-allowed
                    disabled:translate-y-0
                    disabled:opacity-50
                  "
                >
                  {isBuying ? (
                    <>
                      <Loader2
                        aria-hidden="true"
                        className="size-5 animate-spin"
                      />

                      Procesando...
                    </>
                  ) : !isAvailable ? (
                    'Producto agotado'
                  ) : (
                    <>
                      <ShoppingBag
                        aria-hidden="true"
                        className="size-5"
                      />

                      Comprar ahora
                    </>
                  )}
                </button>

                {refCode && (
                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      justify-center
                      gap-2
                      text-center
                      text-[11px]
                      text-[var(--muted)]
                    "
                  >
                    <Sparkles
                      aria-hidden="true"
                      className="size-3.5"
                    />

                    Compra realizada mediante enlace
                    de afiliado
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

// ==========================================================
// 13. PÁGINA
// ==========================================================

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <main
          className="
            flex
            min-h-[70vh]
            items-center
            justify-center
            bg-[var(--background)]
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
              text-sm
              font-semibold
              text-[var(--muted)]
            "
            role="status"
            aria-live="polite"
          >
            <Loader2
              aria-hidden="true"
              className="
                size-5
                animate-spin
                text-[var(--primary)]
              "
            />

            Cargando producto...
          </div>
        </main>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}
