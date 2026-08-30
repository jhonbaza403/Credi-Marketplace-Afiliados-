'use client';

import {
  FormEvent,
  ReactNode,
  useMemo,
  useState,
} from 'react';

import { createClient } from '@/lib/supabase/client';

// ==========================================================
// ARCHIVO: src/components/B2BProductForm.tsx
// Credi Marketplace
//
// FORMULARIO PREMIUM DE PUBLICACIÓN B2B
//
// Características:
// - UX profesional
// - Validación local robusta
// - Accesibilidad
// - Estado de carga
// - Estado de éxito
// - Mensajes de error integrados
// - Protección contra doble envío
// - Normalización de datos
// - Vista previa económica
// - Validación de URL
// - Preparado para RLS / restricciones SQL
// ==========================================================

// ==========================================================
// TIPOS
// ==========================================================

interface B2BFormData {
  title: string;
  category: string;
  wholesalePriceUSD: string;
  regularPriceUSD: string;
  minOrderQuantity: string;
  stockAvailable: string;
  binancePayId: string;
  usdtWalletAddress: string;
  imageUrl: string;
  description: string;
}

type FormErrors = Partial<Record<keyof B2BFormData, string>>;

type SubmissionState =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'error';

// ==========================================================
// CONFIGURACIÓN
// ==========================================================

const INITIAL_FORM: B2BFormData = {
  title: '',
  category: 'Electrónica',
  wholesalePriceUSD: '',
  regularPriceUSD: '',
  minOrderQuantity: '10',
  stockAvailable: '',
  binancePayId: '',
  usdtWalletAddress: '',
  imageUrl: '',
  description: '',
};

const CATEGORIES = [
  'Electrónica',
  'Moda & Accesorios',
  'Educación & Publicaciones',
  'Hogar & Construcción',
] as const;

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 3000;
const MAX_PAYMENT_ID_LENGTH = 100;
const MAX_WALLET_LENGTH = 100;

// ==========================================================
// COMPONENTE PRINCIPAL
// ==========================================================

export default function B2BProductForm() {
  const [formData, setFormData] =
    useState<B2BFormData>(INITIAL_FORM);

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [submissionState, setSubmissionState] =
    useState<SubmissionState>('idle');

  const [serverMessage, setServerMessage] =
    useState<string | null>(null);

  // ========================================================
  // ACTUALIZACIÓN DE CAMPOS
  // ========================================================

  const updateField = <K extends keyof B2BFormData>(
    field: K,
    value: B2BFormData[K],
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      const next = { ...previous };
      delete next[field];

      return next;
    });

    setServerMessage(null);

    if (submissionState !== 'idle') {
      setSubmissionState('idle');
    }
  };

  // ========================================================
  // VALIDACIÓN
  // ========================================================

  const validateForm = (): FormErrors => {
    const nextErrors: FormErrors = {};

    const title = formData.title.trim();
    const description = formData.description.trim();

    const wholesalePrice =
      Number(formData.wholesalePriceUSD);

    const regularPrice =
      Number(formData.regularPriceUSD);

    const minQuantity =
      Number(formData.minOrderQuantity);

    const stock =
      Number(formData.stockAvailable);

    const binancePayId =
      formData.binancePayId.trim();

    const wallet =
      formData.usdtWalletAddress.trim();

    const imageUrl =
      formData.imageUrl.trim();

    // ------------------------------------------------------
    // TÍTULO
    // ------------------------------------------------------

    if (!title) {
      nextErrors.title =
        'Indica el nombre del producto o lote.';
    } else if (title.length < 3) {
      nextErrors.title =
        'El título debe contener al menos 3 caracteres.';
    } else if (title.length > MAX_TITLE_LENGTH) {
      nextErrors.title =
        `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres.`;
    }

    // ------------------------------------------------------
    // CATEGORÍA
    // ------------------------------------------------------

    if (
      !CATEGORIES.includes(
        formData.category as (typeof CATEGORIES)[number],
      )
    ) {
      nextErrors.category =
        'Selecciona una categoría válida.';
    }

    // ------------------------------------------------------
    // DESCRIPCIÓN
    // ------------------------------------------------------

    if (!description) {
      nextErrors.description =
        'La descripción es obligatoria.';
    } else if (description.length < 20) {
      nextErrors.description =
        'La descripción debe contener al menos 20 caracteres.';
    } else if (
      description.length > MAX_DESCRIPTION_LENGTH
    ) {
      nextErrors.description =
        `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres.`;
    }

    // ------------------------------------------------------
    // PRECIO MAYORISTA
    // ------------------------------------------------------

    if (
      !Number.isFinite(wholesalePrice) ||
      wholesalePrice <= 0
    ) {
      nextErrors.wholesalePriceUSD =
        'Introduce un precio mayorista válido.';
    }

    // ------------------------------------------------------
    // PRECIO DE REFERENCIA
    // ------------------------------------------------------

    if (
      !Number.isFinite(regularPrice) ||
      regularPrice <= 0
    ) {
      nextErrors.regularPriceUSD =
        'Introduce un precio de referencia válido.';
    }

    if (
      Number.isFinite(wholesalePrice) &&
      Number.isFinite(regularPrice) &&
      wholesalePrice >= regularPrice
    ) {
      nextErrors.wholesalePriceUSD =
        'Debe ser inferior al precio de referencia.';
    }

    // ------------------------------------------------------
    // MOQ
    // ------------------------------------------------------

    if (
      !Number.isInteger(minQuantity) ||
      minQuantity < 1
    ) {
      nextErrors.minOrderQuantity =
        'La cantidad mínima debe ser un entero mayor que 0.';
    }

    // ------------------------------------------------------
    // STOCK
    // ------------------------------------------------------

    if (
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      nextErrors.stockAvailable =
        'El stock debe ser un entero igual o mayor que 0.';
    }

    if (
      Number.isInteger(stock) &&
      Number.isInteger(minQuantity) &&
      stock < minQuantity
    ) {
      nextErrors.stockAvailable =
        'El stock no puede ser inferior al MOQ.';
    }

    // ------------------------------------------------------
    // BINANCE PAY
    // ------------------------------------------------------

    if (!binancePayId) {
      nextErrors.binancePayId =
        'Indica el Binance Pay ID.';
    } else if (
      binancePayId.length > MAX_PAYMENT_ID_LENGTH
    ) {
      nextErrors.binancePayId =
        'El Binance Pay ID no es válido.';
    }

    // ------------------------------------------------------
    // WALLET
    // ------------------------------------------------------

    if (!wallet) {
      nextErrors.usdtWalletAddress =
        'Indica la dirección USDT TRC20.';
    } else if (
      wallet.length > MAX_WALLET_LENGTH
    ) {
      nextErrors.usdtWalletAddress =
        'La dirección introducida es demasiado larga.';
    }

    // ------------------------------------------------------
    // IMAGEN
    // ------------------------------------------------------

    if (!imageUrl) {
      nextErrors.imageUrl =
        'La URL de la imagen es obligatoria.';
    } else {
      try {
        const parsedUrl = new URL(imageUrl);

        if (
          parsedUrl.protocol !== 'https:' &&
          parsedUrl.protocol !== 'http:'
        ) {
          nextErrors.imageUrl =
            'La imagen debe utilizar una URL HTTP o HTTPS.';
        }
      } catch {
        nextErrors.imageUrl =
          'Introduce una URL de imagen válida.';
      }
    }

    return nextErrors;
  };

  // ========================================================
  // PREVISUALIZACIÓN ECONÓMICA
  // ========================================================

  const financialSummary = useMemo(() => {
    const wholesale =
      Number(formData.wholesalePriceUSD);

    const regular =
      Number(formData.regularPriceUSD);

    const quantity =
      Number(formData.minOrderQuantity);

    if (
      !Number.isFinite(wholesale) ||
      wholesale <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return null;
    }

    const orderValue =
      wholesale * quantity;

    const referenceValue =
      Number.isFinite(regular) && regular > 0
        ? regular * quantity
        : null;

    const savings =
      referenceValue !== null
        ? referenceValue - orderValue
        : null;

    return {
      orderValue,
      referenceValue,
      savings,
    };
  }, [
    formData.wholesalePriceUSD,
    formData.regularPriceUSD,
    formData.minOrderQuantity,
  ]);

  // ========================================================
  // ENVÍO
  // ========================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submissionState === 'submitting') {
      return;
    }

    setServerMessage(null);

    const validationErrors =
      validateForm();

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSubmissionState('error');

      window.setTimeout(() => {
        document
          .querySelector<HTMLElement>(
            '[aria-invalid="true"]',
          )
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
      }, 50);

      return;
    }

    setSubmissionState('submitting');

    try {
      const supabase = createClient();

      // ----------------------------------------------------
      // AUTENTICACIÓN
      // ----------------------------------------------------

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          'Debes iniciar sesión para publicar una oferta mayorista.',
        );
      }

      // ----------------------------------------------------
      // NORMALIZACIÓN
      // ----------------------------------------------------

      const wholesalePrice =
        Number(formData.wholesalePriceUSD);

      const regularPrice =
        Number(formData.regularPriceUSD);

      const minQuantity =
        Number(formData.minOrderQuantity);

      const stock =
        Number(formData.stockAvailable);

      const payload = {
        supplier_id: user.id,

        title:
          formData.title.trim(),

        category:
          formData.category,

        wholesale_price_usd:
          wholesalePrice,

        regular_price_usd:
          regularPrice,

        min_order_quantity:
          minQuantity,

        stock_available:
          stock,

        binance_pay_id:
          formData.binancePayId.trim(),

        usdt_wallet_address:
          formData.usdtWalletAddress.trim(),

        image_url:
          formData.imageUrl.trim(),

        description:
          formData.description.trim(),

        // Si tu tabla posee este campo:
        // status: 'pending',
      };

      // ----------------------------------------------------
      // INSERCIÓN SUPABASE
      // ----------------------------------------------------

      const { error: insertError } =
        await supabase
          .from('b2b_products')
          .insert(payload);

      if (insertError) {
        console.error(
          'B2B product insertion error:',
          insertError,
        );

        throw new Error(
          'No fue posible registrar la oferta en este momento.',
        );
      }

      setSubmissionState('success');
      setErrors({});
      setServerMessage(null);

      setFormData(INITIAL_FORM);
    } catch (error: unknown) {
      console.error(
        'B2B publication error:',
        error,
      );

      setSubmissionState('error');

      setServerMessage(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado.',
      );
    }
  };

  // ========================================================
  // RESTABLECER
  // ========================================================

  const handleReset = () => {
    if (submissionState === 'submitting') {
      return;
    }

    setFormData(INITIAL_FORM);
    setErrors({});
    setServerMessage(null);
    setSubmissionState('idle');
  };

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="
        mx-auto
        w-full
        max-w-4xl
        overflow-hidden
        rounded-3xl
        border
        border-border
        bg-card
        text-card-foreground
        shadow-2xl
      "
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <div
        className="
          border-b
          border-border
          bg-gradient-to-br
          from-amber-500/10
          via-transparent
          to-transparent
          px-6
          py-7
          md:px-10
          md:py-9
        "
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div
              className="
                mb-3
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-amber-500/20
                bg-amber-500/10
                px-3
                py-1.5
                text-[10px]
                font-bold
                uppercase
                tracking-widest
                text-amber-500
              "
            >
              <i
                className="fa-solid fa-boxes-stacked"
                aria-hidden="true"
              />

              Portal B2B
            </div>

            <h2
              className="
                text-2xl
                font-black
                tracking-tight
                text-foreground
                md:text-3xl
              "
            >
              Publicar oferta mayorista
            </h2>

            <p
              className="
                mt-2
                max-w-2xl
                text-sm
                leading-relaxed
                text-muted-foreground
              "
            >
              Presenta productos o lotes a compradores
              profesionales con precios, disponibilidad y
              condiciones comerciales claramente definidas.
            </p>
          </div>

          <div
            className="
              hidden
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-amber-500/10
              text-xl
              text-amber-500
              sm:flex
            "
            aria-hidden="true"
          >
            <i className="fa-solid fa-store" />
          </div>
        </div>
      </div>

      {/* ==================================================
          CONTENIDO
      ================================================== */}

      <div className="space-y-8 p-6 md:p-10">

        {/* ==================================================
            ERROR GENERAL
        ================================================== */}

        {submissionState === 'error' &&
          serverMessage && (
            <div
              role="alert"
              className="
                flex
                items-start
                gap-3
                rounded-2xl
                border
                border-destructive/20
                bg-destructive/10
                p-4
                text-sm
                text-destructive
              "
            >
              <i
                className="fa-solid fa-circle-exclamation mt-0.5"
                aria-hidden="true"
              />

              <div>
                <p className="font-bold">
                  No fue posible completar la publicación.
                </p>

                <p className="mt-1 opacity-90">
                  {serverMessage}
                </p>
              </div>
            </div>
          )}

        {/* ==================================================
            INFORMACIÓN GENERAL
        ================================================== */}

        <section
          aria-labelledby="b2b-general-title"
          className="space-y-5"
        >
          <SectionHeader
            id="b2b-general-title"
            icon="fa-box-open"
            title="Información del producto"
            description="Define la información comercial que visualizarán los compradores."
          />

          <Field
            id="b2b-title"
            label="Título del producto o lote"
            required
            error={errors.title}
          >
            <input
              id="b2b-title"
              type="text"
              value={formData.title}
              maxLength={MAX_TITLE_LENGTH}
              placeholder="Ej. Lote de 50 cornetas Bluetooth impermeables"
              disabled={
                submissionState === 'submitting'
              }
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title
                  ? 'b2b-title-error'
                  : undefined
              }
              onChange={(event) =>
                updateField(
                  'title',
                  event.target.value,
                )
              }
              className={inputClass(
                Boolean(errors.title),
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              id="b2b-category"
              label="Categoría"
              required
              error={errors.category}
            >
              <select
                id="b2b-category"
                value={formData.category}
                disabled={
                  submissionState === 'submitting'
                }
                aria-invalid={Boolean(errors.category)}
                onChange={(event) =>
                  updateField(
                    'category',
                    event.target.value,
                  )
                }
                className={inputClass(
                  Boolean(errors.category),
                )}
              >
                {CATEGORIES.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="b2b-image"
              label="URL de imagen"
              required
              error={errors.imageUrl}
            >
              <input
                id="b2b-image"
                type="url"
                value={formData.imageUrl}
                placeholder="https://..."
                disabled={
                  submissionState === 'submitting'
                }
                aria-invalid={Boolean(
                  errors.imageUrl,
                )}
                aria-describedby={
                  errors.imageUrl
                    ? 'b2b-image-error'
                    : undefined
                }
                onChange={(event) =>
                  updateField(
                    'imageUrl',
                    event.target.value,
                  )
                }
                className={inputClass(
                  Boolean(errors.imageUrl),
                )}
              />
            </Field>
          </div>

          <Field
            id="b2b-description"
            label="Descripción comercial"
            required
            error={errors.description}
          >
            <textarea
              id="b2b-description"
              rows={6}
              maxLength={MAX_DESCRIPTION_LENGTH}
              value={formData.description}
              placeholder="Describe características, presentación, garantía, condiciones comerciales, tiempos de entrega y cualquier información relevante..."
              disabled={
                submissionState === 'submitting'
              }
              aria-invalid={Boolean(
                errors.description,
              )}
              aria-describedby={
                errors.description
                  ? 'b2b-description-error'
                  : undefined
              }
              onChange={(event) =>
                updateField(
                  'description',
                  event.target.value,
                )
              }
              className={`${inputClass(
                Boolean(errors.description),
              )} resize-none`}
            />

            <div className="mt-1.5 flex justify-end">
              <span className="text-[10px] text-muted-foreground">
                {formData.description.length}/
                {MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
          </Field>
        </section>

        {/* ==================================================
            PRECIOS
        ================================================== */}

        <section
          aria-labelledby="b2b-pricing-title"
          className="space-y-5"
        >
          <SectionHeader
            id="b2b-pricing-title"
            icon="fa-chart-line"
            title="Precios y disponibilidad"
            description="Establece el precio mayorista, referencia comercial y volumen disponible."
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <MoneyField
              id="b2b-wholesale-price"
              label="Precio mayorista"
              value={formData.wholesalePriceUSD}
              error={errors.wholesalePriceUSD}
              onChange={(value) =>
                updateField(
                  'wholesalePriceUSD',
                  value,
                )
              }
              disabled={
                submissionState === 'submitting'
              }
            />

            <MoneyField
              id="b2b-regular-price"
              label="Precio de referencia"
              value={formData.regularPriceUSD}
              error={errors.regularPriceUSD}
              onChange={(value) =>
                updateField(
                  'regularPriceUSD',
                  value,
                )
              }
              disabled={
                submissionState === 'submitting'
              }
            />

            <NumberField
              id="b2b-moq"
              label="Cantidad mínima de pedido"
              value={formData.minOrderQuantity}
              error={errors.minOrderQuantity}
              onChange={(value) =>
                updateField(
                  'minOrderQuantity',
                  value,
                )
              }
              min={1}
              disabled={
                submissionState === 'submitting'
              }
            />

            <NumberField
              id="b2b-stock"
              label="Stock total disponible"
              value={formData.stockAvailable}
              error={errors.stockAvailable}
              onChange={(value) =>
                updateField(
                  'stockAvailable',
                  value,
                )
              }
              min={0}
              disabled={
                submissionState === 'submitting'
              }
            />
          </div>

          {/* =================================================
              RESUMEN ECONÓMICO
          ================================================== */}

          {financialSummary && (
            <div
              className="
                grid
                grid-cols-1
                gap-3
                rounded-2xl
                border
                border-emerald-500/20
                bg-emerald-500/5
                p-5
                sm:grid-cols-3
              "
            >
              <SummaryItem
                label="Valor mínimo del pedido"
                value={financialSummary.orderValue}
              />

              {financialSummary.referenceValue !== null && (
                <SummaryItem
                  label="Valor de referencia"
                  value={
                    financialSummary.referenceValue
                  }
                />
              )}

              {financialSummary.savings !== null && (
                <SummaryItem
                  label="Diferencia comercial"
                  value={
                    financialSummary.savings
                  }
                />
              )}
            </div>
          )}
        </section>

        {/* ==================================================
            PAGOS
        ================================================== */}

        <section
          aria-labelledby="b2b-payment-title"
          className="space-y-5"
        >
          <SectionHeader
            id="b2b-payment-title"
            icon="fa-shield-halved"
            title="Información de pago"
            description="Configura los datos que utilizará la plataforma para identificar el destino del pago."
          />

          <div
            className="
              rounded-2xl
              border
              border-amber-500/20
              bg-amber-500/5
              p-4
              text-xs
              leading-relaxed
              text-muted-foreground
            "
          >
            <div className="flex items-start gap-3">
              <i
                className="fa-solid fa-triangle-exclamation mt-0.5 text-amber-500"
                aria-hidden="true"
              />

              <p>
                Verifica cuidadosamente estos datos antes de
                publicar. La plataforma no debe considerar
                una oferta como pago verificado únicamente
                por haber registrado esta información.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              id="b2b-binance-id"
              label="Binance Pay ID"
              required
              error={errors.binancePayId}
            >
              <input
                id="b2b-binance-id"
                type="text"
                maxLength={MAX_PAYMENT_ID_LENGTH}
                value={formData.binancePayId}
                placeholder="Ej. 218391029"
                disabled={
                  submissionState === 'submitting'
                }
                aria-invalid={Boolean(
                  errors.binancePayId,
                )}
                aria-describedby={
                  errors.binancePayId
                    ? 'b2b-binance-id-error'
                    : undefined
                }
                onChange={(event) =>
                  updateField(
                    'binancePayId',
                    event.target.value,
                  )
                }
                className={`${inputClass(
                  Boolean(errors.binancePayId),
                )} font-mono`}
              />
            </Field>

            <Field
              id="b2b-wallet"
              label="Dirección USDT TRC20"
              required
              error={errors.usdtWalletAddress}
            >
              <input
                id="b2b-wallet"
                type="text"
                maxLength={MAX_WALLET_LENGTH}
                value={formData.usdtWalletAddress}
                placeholder="Dirección de red TRON"
                disabled={
                  submissionState === 'submitting'
                }
                aria-invalid={Boolean(
                  errors.usdtWalletAddress,
                )}
                aria-describedby={
                  errors.usdtWalletAddress
                    ? 'b2b-wallet-error'
                    : undefined
                }
                onChange={(event) =>
                  updateField(
                    'usdtWalletAddress',
                    event.target.value,
                  )
                }
                className={`${inputClass(
                  Boolean(
                    errors.usdtWalletAddress,
                  ),
                )} font-mono`}
              />

              <p className="mt-1.5 text-[10px] text-muted-foreground">
                TRC20 corresponde a la red TRON.
              </p>
            </Field>
          </div>
        </section>

        {/* ==================================================
            SEGURIDAD
        ================================================== */}

        <div
          className="
            rounded-2xl
            border
            border-border
            bg-muted/30
            p-5
          "
        >
          <div className="flex items-start gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-primary/10
                text-primary
              "
              aria-hidden="true"
            >
              <i className="fa-solid fa-lock" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground">
                Publicación sujeta a validación
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Registrar esta oferta no constituye una
                verificación de pago, autenticidad del
                producto ni garantía de cumplimiento.
                Las operaciones deberán someterse a las
                reglas de validación y moderación de
                Credi Marketplace.
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================
            ÉXITO
        ================================================== */}

        {submissionState === 'success' && (
          <div
            role="status"
            aria-live="polite"
            className="
              rounded-2xl
              border
              border-emerald-500/20
              bg-emerald-500/10
              p-5
            "
          >
            <div className="flex items-start gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-500
                  text-white
                "
                aria-hidden="true"
              >
                <i className="fa-solid fa-check" />
              </div>

              <div>
                <h3 className="font-bold text-foreground">
                  Oferta registrada correctamente
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  La oferta fue enviada correctamente al
                  sistema. Si tu plataforma utiliza
                  moderación previa, quedará pendiente de
                  revisión antes de hacerse pública.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================
            ACCIONES
        ================================================== */}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={
              submissionState === 'submitting'
            }
            className="
              rounded-xl
              border
              border-border
              bg-background
              px-6
              py-3
              text-sm
              font-bold
              text-foreground
              transition
              hover:bg-muted
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Limpiar formulario
          </button>

          <button
            type="submit"
            disabled={
              submissionState === 'submitting'
            }
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-amber-500
              px-7
              py-3
              text-sm
              font-black
              text-slate-950
              shadow-lg
              shadow-amber-500/20
              transition
              hover:bg-amber-400
              hover:shadow-xl
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-amber-500
              focus-visible:ring-offset-2
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {submissionState === 'submitting' ? (
              <>
                <i
                  className="fa-solid fa-circle-notch animate-spin"
                  aria-hidden="true"
                />

                Publicando oferta...
              </>
            ) : (
              <>
                <i
                  className="fa-solid fa-paper-plane"
                  aria-hidden="true"
                />

                Publicar oferta mayorista
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// ==========================================================
// COMPONENTE: SECTION HEADER
// ==========================================================

interface SectionHeaderProps {
  id: string;
  icon: string;
  title: string;
  description: string;
}

function SectionHeader({
  id,
  icon,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-primary/10
          text-primary
        "
        aria-hidden="true"
      >
        <i className={`fa-solid ${icon}`} />
      </div>

      <div>
        <h3
          id={id}
          className="text-sm font-black text-foreground"
        >
          {title}
        </h3>

        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

// ==========================================================
// COMPONENTE: FIELD
// ==========================================================

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold text-foreground"
      >
        {label}

        {required && (
          <span
            className="ml-1 text-amber-500"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium text-destructive"
        >
          <i
            className="fa-solid fa-circle-exclamation mr-1"
            aria-hidden="true"
          />

          {error}
        </p>
      )}
    </div>
  );
}

// ==========================================================
// COMPONENTE: MONEY FIELD
// ==========================================================

interface MoneyFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function MoneyField({
  id,
  label,
  value,
  error,
  disabled,
  onChange,
}: MoneyFieldProps) {
  return (
    <Field
      id={id}
      label={label}
      required
      error={error}
    >
      <div className="relative">
        <span
          className="
            pointer-events-none
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            text-sm
            font-black
            text-emerald-500
          "
          aria-hidden="true"
        >
          $
        </span>

        <input
          id={id}
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={value}
          placeholder="0.00"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${id}-error` : undefined
          }
          onChange={(event) =>
            onChange(event.target.value)
          }
          className={`${inputClass(
            Boolean(error),
          )} pl-9 font-bold`}
        />
      </div>
    </Field>
  );
}

// ==========================================================
// COMPONENTE: NUMBER FIELD
// ==========================================================

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  min: number;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function NumberField({
  id,
  label,
  value,
  error,
  min,
  disabled,
  onChange,
}: NumberFieldProps) {
  return (
    <Field
      id={id}
      label={label}
      required
      error={error}
    >
      <input
        id={id}
        type="number"
        min={min}
        step="1"
        inputMode="numeric"
        value={value}
        placeholder="0"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : undefined
        }
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={inputClass(Boolean(error))}
      />
    </Field>
  );
}

// ==========================================================
// COMPONENTE: RESUMEN
// ==========================================================

interface SummaryItemProps {
  label: string;
  value: number;
}

function SummaryItem({
  label,
  value,
}: SummaryItemProps) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-emerald-500">
        $
        {value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
    </div>
  );
}

// ==========================================================
// CLASES DE INPUT
// ==========================================================

function inputClass(hasError: boolean) {
  return `
    w-full
    rounded-xl
    border
    ${
      hasError
        ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
        : 'border-border focus:border-primary focus:ring-primary/20'
    }
    bg-muted/40
    px-4
    py-3
    text-sm
    text-foreground
    outline-none
    transition
    placeholder:text-muted-foreground/60
    focus:ring-2
    disabled:cursor-not-allowed
    disabled:opacity-60
  `;
}
