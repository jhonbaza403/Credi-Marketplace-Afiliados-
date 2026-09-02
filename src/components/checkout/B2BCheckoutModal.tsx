"use client";

// ==========================================================
// ARCHIVO:
// src/components/checkout/B2BCheckoutModal.tsx
//
// Credi Marketplace
//
// Modal de solicitud de compra B2B
//
// Next.js 16
// React 19
// TypeScript
// Supabase
//
// REGLAS:
// - El cliente no confirma definitivamente un pago.
// - El cliente no controla el inventario.
// - El precio recibido del cliente no constituye autoridad.
// - La operación definitiva debe ser validada por backend/RLS.
// ==========================================================

import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";

// ==========================================================
// TIPOS
// ==========================================================

export interface B2BCheckoutModalProps {
  productId: string;
  productName: string;

  wholesalePrice: number;

  minQuantity: number;

  /**
   * Máximo disponible para este producto/lote.
   */
  maxQuantity?: number;

  /**
   * Proveedor asociado al producto.
   */
  supplierId?: string | null;

  /**
   * Datos opcionales de pago.
   */
  binancePayId?: string;

  usdtWalletAddress?: string;

  /**
   * Callback opcional al cerrar.
   */
  onClose?: () => void;
}

// ==========================================================
// CONSTANTES
// ==========================================================

const DEFAULT_MAX_QUANTITY = 1_000_000;

const MAX_PRODUCT_NAME_LENGTH = 200;

// ==========================================================
// HELPERS
// ==========================================================

function normalizePositiveInteger(
  value: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);

  return normalized > 0
    ? normalized
    : fallback;
}

function normalizePrice(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 0;
  }

  return Number(
    value.toFixed(2),
  );
}

// ==========================================================
// COMPONENTE
// ==========================================================

export default function B2BCheckoutModal({
  productId,
  productName,
  wholesalePrice,
  minQuantity,
  maxQuantity,
  supplierId,
  onClose,
}: B2BCheckoutModalProps) {
  // ========================================================
  // VALORES NORMALIZADOS
  // ========================================================

  const safeMinQuantity = useMemo(
    () =>
      Math.max(
        1,
        normalizePositiveInteger(
          minQuantity,
          1,
        ),
      ),
    [minQuantity],
  );

  const safeMaxQuantity = useMemo(() => {
    const configuredMaximum =
      maxQuantity === undefined
        ? DEFAULT_MAX_QUANTITY
        : normalizePositiveInteger(
            maxQuantity,
            DEFAULT_MAX_QUANTITY,
          );

    return Math.max(
      safeMinQuantity,
      Math.min(
        configuredMaximum,
        DEFAULT_MAX_QUANTITY,
      ),
    );
  }, [
    maxQuantity,
    safeMinQuantity,
  ]);

  const safeWholesalePrice =
    useMemo(
      () =>
        normalizePrice(
          wholesalePrice,
        ),
      [wholesalePrice],
    );

  // ========================================================
  // ESTADO
  // ========================================================

  const [quantity, setQuantity] =
    useState<number>(
      safeMinQuantity,
    );

  const [open, setOpen] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  // ========================================================
  // CANTIDAD NORMALIZADA
  // ========================================================

  const safeQuantity = useMemo(
    () => {
      if (
        !Number.isFinite(quantity)
      ) {
        return safeMinQuantity;
      }

      return Math.min(
        safeMaxQuantity,
        Math.max(
          safeMinQuantity,
          Math.floor(quantity),
        ),
      );
    },
    [
      quantity,
      safeMinQuantity,
      safeMaxQuantity,
    ],
  );

  // ========================================================
  // TOTAL
  // ========================================================

  const total = useMemo(
    () =>
      Number(
        (
          safeQuantity *
          safeWholesalePrice
        ).toFixed(2),
      ),
    [
      safeQuantity,
      safeWholesalePrice,
    ],
  );

  // ========================================================
  // ABRIR
  // ========================================================

  const openModal = useCallback(() => {
    setQuantity(
      safeMinQuantity,
    );

    setError(null);
    setMessage(null);
    setOpen(true);
  }, [safeMinQuantity]);

  // ========================================================
  // CERRAR
  // ========================================================

  const closeModal = useCallback(() => {
    if (submitting) {
      return;
    }

    setOpen(false);
    setError(null);
    setMessage(null);

    onClose?.();
  }, [
    submitting,
    onClose,
  ]);

  // ========================================================
  // CAMBIO DE CANTIDAD
  // ========================================================

  const handleQuantityChange =
    useCallback(
      (
        event: ChangeEvent<HTMLInputElement>,
      ) => {
        const parsed =
          Number(event.target.value);

        if (
          !Number.isFinite(parsed)
        ) {
          setQuantity(
            safeMinQuantity,
          );
          return;
        }

        setQuantity(
          Math.min(
            safeMaxQuantity,
            Math.max(
              safeMinQuantity,
              Math.floor(parsed),
            ),
          ),
        );

        setError(null);
        setMessage(null);
      },
      [
        safeMinQuantity,
        safeMaxQuantity,
      ],
    );

  // ========================================================
  // VALIDACIÓN
  // ========================================================

  const validate = useCallback(
    (): string | null => {
      const normalizedProductId =
        productId.trim();

      const normalizedProductName =
        productName.trim();

      if (!normalizedProductId) {
        return "El producto seleccionado no es válido.";
      }

      if (
        !normalizedProductName
      ) {
        return "El producto seleccionado no tiene un nombre válido.";
      }

      if (
        normalizedProductName.length >
        MAX_PRODUCT_NAME_LENGTH
      ) {
        return "El nombre del producto es demasiado largo.";
      }

      if (
        safeWholesalePrice <= 0
      ) {
        return "El precio mayorista no es válido.";
      }

      if (
        safeQuantity <
        safeMinQuantity
      ) {
        return `La cantidad mínima es de ${safeMinQuantity.toLocaleString()}.`;
      }

      if (
        safeQuantity >
        safeMaxQuantity
      ) {
        return `La cantidad máxima disponible es de ${safeMaxQuantity.toLocaleString()}.`;
      }

      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {
        return "No fue posible calcular correctamente el total.";
      }

      return null;
    },
    [
      productId,
      productName,
      safeWholesalePrice,
      safeQuantity,
      safeMinQuantity,
      safeMaxQuantity,
      total,
    ],
  );

  // ========================================================
  // ENVIAR SOLICITUD
  // ========================================================

  const submit = useCallback(
    async () => {
      if (submitting) {
        return;
      }

      setError(null);
      setMessage(null);

      const validationError =
        validate();

      if (validationError) {
        setError(
          validationError,
        );
        return;
      }

      setSubmitting(true);

      try {
        const supabase =
          createClient();

        const {
          data: {
            user,
          },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw new Error(
            "No fue posible comprobar la sesión.",
          );
        }

        if (!user) {
          setError(
            "Debes iniciar sesión para realizar una solicitud B2B.",
          );
          return;
        }

        const normalizedProductId =
          productId.trim();

        const normalizedProductName =
          productName
            .trim()
            .slice(
              0,
              MAX_PRODUCT_NAME_LENGTH,
            );

        const { error:
          insertError } =
          await supabase
            .from(
              "b2b_orders",
            )
            .insert({
              user_id: user.id,

              product_id:
                normalizedProductId,

              product_title:
                normalizedProductName,

              supplier_id:
                supplierId?.trim() ||
                null,

              quantity:
                safeQuantity,

              unit_price_usd:
                safeWholesalePrice,

              total_usd:
                total,

              status:
                "verifying",
            });

        if (insertError) {
          console.error(
            "[B2BCheckoutModal] Supabase error:",
            insertError,
          );

          throw new Error(
            "No fue posible registrar la solicitud B2B.",
          );
        }

        setQuantity(
          safeQuantity,
        );

        setMessage(
          "Solicitud B2B registrada correctamente. Quedará pendiente de verificación.",
        );
      } catch (cause) {
        console.error(
          "[B2BCheckoutModal] Error:",
          cause,
        );

        setError(
          cause instanceof Error
            ? cause.message
            : "No fue posible registrar la solicitud.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      submitting,
      validate,
      productId,
      productName,
      supplierId,
      safeQuantity,
      safeWholesalePrice,
      total,
    ],
  );

  // ========================================================
  // BOTÓN PRINCIPAL
  // ========================================================

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="
          inline-flex
          items-center
          justify-center
          rounded-xl
          bg-primary
          px-5
          py-3
          text-sm
          font-black
          text-primary-foreground
          shadow-sm
          transition
          hover:opacity-90
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
          focus-visible:ring-offset-2
        "
      >
        Solicitar compra B2B
      </button>

      {/* ====================================================
          MODAL
      ==================================================== */}

      {open && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/70
            p-4
            backdrop-blur-sm
          "
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !submitting
            ) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="b2b-checkout-title"
            className="
              w-full
              max-w-lg
              max-h-[90vh]
              overflow-y-auto
              rounded-3xl
              border
              border-border
              bg-background
              p-6
              shadow-2xl
              sm:p-8
            "
          >
            {/* CABECERA */}

            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div className="min-w-0">
                <p
                  className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-widest
                    text-primary
                  "
                >
                  Credi Marketplace B2B
                </p>

                <h2
                  id="b2b-checkout-title"
                  className="
                    mt-2
                    text-2xl
                    font-black
                    text-foreground
                  "
                >
                  Solicitud B2B
                </h2>

                <p
                  className="
                    mt-2
                    text-sm
                    text-muted-foreground
                  "
                >
                  {productName}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Cerrar modal"
                className="
                  rounded-lg
                  px-3
                  py-2
                  text-sm
                  font-bold
                  text-muted-foreground
                  transition
                  hover:bg-muted
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cerrar
              </button>
            </div>

            {/* RESUMEN */}

            <div
              className="
                mt-6
                grid
                grid-cols-2
                gap-3
              "
            >
              <div
                className="
                  rounded-2xl
                  border
                  border-border
                  bg-muted/40
                  p-4
                "
              >
                <p className="text-xs text-muted-foreground">
                  Precio unitario
                </p>

                <p className="mt-1 text-lg font-black text-foreground">
                  ${safeWholesalePrice.toFixed(2)}
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  border
                  border-border
                  bg-muted/40
                  p-4
                "
              >
                <p className="text-xs text-muted-foreground">
                  Máximo disponible
                </p>

                <p className="mt-1 text-lg font-black text-foreground">
                  {safeMaxQuantity.toLocaleString()}
                </p>
              </div>
            </div>

            {/* FORMULARIO */}

            <div className="mt-6">
              <label
                htmlFor="b2b-quantity"
                className="
                  block
                  text-sm
                  font-bold
                  text-foreground
                "
              >
                Cantidad
              </label>

              <input
                id="b2b-quantity"
                type="number"
                min={safeMinQuantity}
                max={safeMaxQuantity}
                step={1}
                value={safeQuantity}
                onChange={
                  handleQuantityChange
                }
                disabled={submitting}
                className="
                  mt-2
                  w-full
                  rounded-xl
                  border
                  border-border
                  bg-background
                  px-4
                  py-3
                  text-sm
                  text-foreground
                  outline-none
                  transition
                  focus:ring-2
                  focus:ring-primary
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              />

              <p
                className="
                  mt-2
                  text-xs
                  text-muted-foreground
                "
              >
                Mínimo:{" "}
                {safeMinQuantity.toLocaleString()}
                {" · "}
                Máximo:{" "}
                {safeMaxQuantity.toLocaleString()}
              </p>
            </div>

            {/* TOTAL */}

            <div
              className="
                mt-5
                rounded-2xl
                border
                border-border
                bg-muted/30
                p-5
              "
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Total estimado
                </span>

                <strong
                  className="
                    text-xl
                    font-black
                    text-foreground
                  "
                >
                  ${total.toFixed(2)} USD
                </strong>
              </div>
            </div>

            {/* MENSAJE */}

            {error && (
              <div
                role="alert"
                className="
                  mt-5
                  rounded-xl
                  border
                  border-destructive/20
                  bg-destructive/10
                  p-4
                  text-sm
                  text-destructive
                "
              >
                {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                aria-live="polite"
                className="
                  mt-5
                  rounded-xl
                  border
                  border-emerald-500/20
                  bg-emerald-500/10
                  p-4
                  text-sm
                  text-emerald-600
                  dark:text-emerald-400
                "
              >
                {message}
              </div>
            )}

            {/* ACCIÓN */}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="
                mt-6
                w-full
                rounded-xl
                bg-primary
                px-5
                py-3.5
                text-sm
                font-black
                text-primary-foreground
                shadow-lg
                transition
                hover:opacity-90
                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary
                focus-visible:ring-offset-2
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {submitting
                ? "Registrando..."
                : "Confirmar solicitud"}
            </button>

            <p
              className="
                mt-4
                text-center
                text-xs
                leading-5
                text-muted-foreground
              "
            >
              La solicitud quedará pendiente
              de verificación. El registro de
              esta solicitud no constituye una
              confirmación automática del pago.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
