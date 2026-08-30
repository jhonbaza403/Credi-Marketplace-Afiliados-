'use client';

// ==========================================================
// ARCHIVO: src/components/B2BCheckoutModal.tsx
// Credi Marketplace
//
// NIVEL: PRODUCCIÓN / B2B
//
// PROPÓSITO:
// Modal avanzado para solicitar una orden mayorista.
//
// PRINCIPIOS:
// - El cliente NO verifica pagos.
// - El cliente NO confirma fondos.
// - El cliente NO modifica precios provenientes de BD.
// - El cliente solamente prepara y registra una solicitud.
// - La seguridad definitiva corresponde a Supabase/RLS/backend.
// - Las órdenes quedan en estado "verifying" hasta validación.
// ==========================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { createClient } from '@/lib/supabase/client';

// ==========================================================
// 1. TIPOS
// ==========================================================

type PaymentMethod = 'binance_pay' | 'usdt_trc20';

type CopiedField = 'binance' | 'wallet' | null;

interface B2BCheckoutModalProps {
  productId: string;
  productName: string;
  supplierId?: string;
  wholesalePrice: number;
  minQuantity: number;
  binancePayId: string;
  usdtWalletAddress: string;
  onClose: () => void;
}

// ==========================================================
// 2. CONSTANTES DE SEGURIDAD
// ==========================================================

const MAX_B2B_QUANTITY = 1_000_000;

const MAX_PAYMENT_REFERENCE_LENGTH = 200;

const COPY_FEEDBACK_DURATION = 2000;

const AUTO_CLOSE_DELAY = 2500;

// ==========================================================
// 3. UTILIDADES
// ==========================================================

function sanitizeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.floor(value);
}

function sanitizeQuantity(
  value: number,
  minimum: number,
): number {
  const normalized = sanitizeInteger(value);

  return Math.min(
    Math.max(normalized, minimum),
    MAX_B2B_QUANTITY,
  );
}

function sanitizePrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value;
}

function formatUSDT(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ==========================================================
// 4. COMPONENTE
// ==========================================================

export default function B2BCheckoutModal({
  productId,
  productName,
  supplierId,
  wholesalePrice,
  minQuantity,
  binancePayId,
  usdtWalletAddress,
  onClose,
}: B2BCheckoutModalProps) {
  // ========================================================
  // 4.1 NORMALIZACIÓN
  // ========================================================

  const safeMinQuantity = useMemo(() => {
    const normalized = sanitizeInteger(minQuantity);

    return Math.min(
      Math.max(normalized, 1),
      MAX_B2B_QUANTITY,
    );
  }, [minQuantity]);

  const safeWholesalePrice = useMemo(
    () => sanitizePrice(wholesalePrice),
    [wholesalePrice],
  );

  // ========================================================
  // 4.2 ESTADO
  // ========================================================

  const [quantity, setQuantity] = useState(
    safeMinQuantity,
  );

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('binance_pay');

  const [paymentReference, setPaymentReference] =
    useState('');

  const [copiedField, setCopiedField] =
    useState<CopiedField>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  // ========================================================
  // 4.3 SINCRONIZACIÓN DE CANTIDAD
  // ========================================================

  useEffect(() => {
    setQuantity((current) =>
      sanitizeQuantity(
        current,
        safeMinQuantity,
      ),
    );
  }, [safeMinQuantity]);

  // ========================================================
  // 4.4 TOTAL
  // ========================================================

  const normalizedQuantity = useMemo(
    () =>
      sanitizeQuantity(
        quantity,
        safeMinQuantity,
      ),
    [quantity, safeMinQuantity],
  );

  const totalUSD = useMemo(
    () =>
      normalizedQuantity *
      safeWholesalePrice,
    [normalizedQuantity, safeWholesalePrice],
  );

  // ========================================================
  // 5. CERRAR MODAL
  // ========================================================

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    onClose();
  }, [isSubmitting, onClose]);

  // ========================================================
  // 6. ESCAPE
  // ========================================================

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [isSubmitting, onClose]);

  // ========================================================
  // 7. COPIAR DATOS
  // ========================================================

  const handleCopy = useCallback(
    async (
      value: string,
      field: Exclude<CopiedField, null>,
    ) => {
      const normalizedValue = value.trim();

      if (!normalizedValue) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          normalizedValue,
        );

        setCopiedField(field);

        window.setTimeout(() => {
          setCopiedField(null);
        }, COPY_FEEDBACK_DURATION);
      } catch (error: unknown) {
        console.error(
          'Error al copiar información de pago:',
          error,
        );

        setErrorMessage(
          'No fue posible copiar automáticamente. Selecciona el dato manualmente.',
        );
      }
    },
    [],
  );

  // ========================================================
  // 8. CAMBIO DE CANTIDAD
  // ========================================================

  const handleQuantityChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;

    if (value === '') {
      setQuantity(safeMinQuantity);
      return;
    }

    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed)) {
      setQuantity(safeMinQuantity);
      return;
    }

    setQuantity(
      sanitizeQuantity(
        parsed,
        safeMinQuantity,
      ),
    );

    setErrorMessage(null);
  };

  // ========================================================
  // 9. CAMBIO DE MÉTODO
  // ========================================================

  const handlePaymentMethodChange = (
    method: PaymentMethod,
  ) => {
    if (isSubmitting) {
      return;
    }

    setPaymentMethod(method);
    setPaymentReference('');
    setCopiedField(null);
    setErrorMessage(null);
  };

  // ========================================================
  // 10. VALIDACIÓN
  // ========================================================

  const validateOrder = (): string | null => {
    if (!productId.trim()) {
      return 'El producto seleccionado no es válido.';
    }

    if (!productName.trim()) {
      return 'El producto seleccionado no tiene un nombre válido.';
    }

    if (safeWholesalePrice <= 0) {
      return 'El precio mayorista recibido no es válido.';
    }

    if (
      normalizedQuantity <
      safeMinQuantity
    ) {
      return `La cantidad mínima es de ${safeMinQuantity.toLocaleString()} unidades.`;
    }

    if (
      normalizedQuantity >
      MAX_B2B_QUANTITY
    ) {
      return `La cantidad máxima permitida es de ${MAX_B2B_QUANTITY.toLocaleString()} unidades.`;
    }

    if (
      !Number.isFinite(totalUSD) ||
      totalUSD <= 0
    ) {
      return 'No fue posible calcular correctamente el importe total.';
    }

    const reference =
      paymentReference.trim();

    if (!reference) {
      return 'Debes introducir la referencia del pago.';
    }

    if (
      reference.length >
      MAX_PAYMENT_REFERENCE_LENGTH
    ) {
      return `La referencia no puede superar los ${MAX_PAYMENT_REFERENCE_LENGTH} caracteres.`;
    }

    if (
      paymentMethod === 'binance_pay' &&
      !binancePayId.trim()
    ) {
      return 'El proveedor no tiene configurado un Binance Pay ID.';
    }

    if (
      paymentMethod === 'usdt_trc20' &&
      !usdtWalletAddress.trim()
    ) {
      return 'El proveedor no tiene configurada una dirección USDT TRC20.';
    }

    return null;
  };

  // ========================================================
  // 11. CREACIÓN DE ORDEN
  // ========================================================

  const handleConfirmPayment = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isSubmitting || successMessage) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const validationError =
      validateOrder();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // ----------------------------------------------------
      // AUTENTICACIÓN
      // ----------------------------------------------------

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(
          'No fue posible comprobar la sesión.',
        );
      }

      if (!user) {
        throw new Error(
          'Debes iniciar sesión para realizar una orden mayorista.',
        );
      }

      // ----------------------------------------------------
      // REFERENCIA
      // ----------------------------------------------------

      const normalizedReference =
        paymentReference.trim();

      // ----------------------------------------------------
      // INSERCIÓN
      //
      // IMPORTANTE:
      // El frontend no determina que el pago sea válido.
      // ----------------------------------------------------

      const { error: insertError } =
        await supabase
          .from('b2b_orders')
          .insert({
            user_id: user.id,

            product_id:
              productId.trim(),

            product_title:
              productName.trim(),

            supplier_id:
              supplierId?.trim() || null,

            quantity:
              normalizedQuantity,

            unit_price_usd:
              safeWholesalePrice,

            total_usd:
              totalUSD,

            payment_method:
              paymentMethod,

            // ------------------------------------------------
            // COMPATIBILIDAD CON ESQUEMA ACTUAL
            //
            // Si posteriormente se agrega un campo:
            // payment_reference
            //
            // deberá migrarse este dato allí.
            // ------------------------------------------------

            binance_tx_id:
              normalizedReference,

            status:
              'verifying',
          });

      if (insertError) {
        console.error(
          'Supabase B2B order error:',
          insertError,
        );

        throw new Error(
          'No fue posible registrar la orden en la plataforma.',
        );
      }

      // ----------------------------------------------------
      // ÉXITO
      // ----------------------------------------------------

      setSuccessMessage(
        'Solicitud registrada correctamente. La orden permanecerá pendiente hasta completar la verificación del pago.',
      );

      window.setTimeout(() => {
        onClose();
      }, AUTO_CLOSE_DELAY);
    } catch (error: unknown) {
      console.error(
        'Error al crear orden B2B:',
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado al registrar la orden.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // 12. RENDER
  // ========================================================

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        bg-black/75
        p-4
        backdrop-blur-md
      "
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isSubmitting
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="b2b-checkout-title"
        className="
          relative
          w-full max-w-lg
          max-h-[92vh]
          overflow-y-auto
          rounded-3xl
          border border-border
          bg-card
          text-card-foreground
          shadow-2xl
        "
      >
        {/* ==================================================
            CABECERA
        ================================================== */}

        <div
          className="
            sticky top-0 z-10
            flex items-start justify-between
            gap-4
            border-b border-border
            bg-card/95
            p-6
            backdrop-blur
          "
        >
          <div className="min-w-0">
            <span
              className="
                inline-flex items-center
                rounded-full
                border border-amber-500/20
                bg-amber-500/10
                px-3 py-1
                text-[10px]
                font-black
                uppercase
                tracking-widest
                text-amber-500
              "
            >
              Operación B2B
            </span>

            <h2
              id="b2b-checkout-title"
              className="
                mt-2
                break-words
                text-xl
                font-black
                leading-tight
                text-foreground
              "
            >
              {productName}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Cerrar pedido mayorista"
            className="
              shrink-0
              rounded-xl
              p-2
              text-xl
              font-bold
              text-muted-foreground
              transition
              hover:bg-muted
              hover:text-foreground
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* ==================================================
              ESTADO DE OPERACIÓN
          ================================================== */}

          {errorMessage && (
            <div
              role="alert"
              className="
                mb-5
                rounded-2xl
                border border-destructive/30
                bg-destructive/10
                p-4
                text-sm
                font-medium
                text-destructive
              "
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="
                mb-5
                rounded-2xl
                border border-emerald-500/30
                bg-emerald-500/10
                p-4
                text-sm
                font-medium
                text-emerald-600
                dark:text-emerald-400
              "
            >
              {successMessage}
            </div>
          )}

          {/* ==================================================
              RESUMEN
          ================================================== */}

          <div
            className="
              rounded-2xl
              border border-border
              bg-muted/30
              p-4
            "
          >
            <div className="flex justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Pedido mínimo
              </span>

              <strong className="text-xs text-foreground">
                {safeMinQuantity.toLocaleString()} unidades
              </strong>
            </div>

            <div className="mt-2 flex justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Precio unitario
              </span>

              <strong className="text-xs text-foreground">
                ${formatUSDT(safeWholesalePrice)} USDT
              </strong>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-end justify-between gap-4">
                <span className="text-xs font-semibold text-muted-foreground">
                  Total de la operación
                </span>

                <strong className="text-2xl font-black text-amber-500">
                  ${formatUSDT(totalUSD)}
                </strong>
              </div>

              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                USDT
              </p>
            </div>
          </div>

          {/* ==================================================
              CANTIDAD
          ================================================== */}

          <div className="mt-6">
            <label
              htmlFor="b2b-quantity"
              className="
                mb-2
                block
                text-xs
                font-bold
                text-foreground
              "
            >
              Cantidad a comprar
            </label>

            <input
              id="b2b-quantity"
              type="number"
              inputMode="numeric"
              min={safeMinQuantity}
              max={MAX_B2B_QUANTITY}
              step={1}
              value={quantity}
              onChange={handleQuantityChange}
              disabled={isSubmitting}
              className="
                w-full
                rounded-2xl
                border border-border
                bg-background
                px-4 py-3
                font-bold
                text-foreground
                outline-none
                transition
                focus:border-amber-500
                focus:ring-4
                focus:ring-amber-500/10
                disabled:opacity-60
              "
            />
          </div>

          {/* ==================================================
              MÉTODO DE PAGO
          ================================================== */}

          <fieldset className="mt-6">
            <legend
              className="
                mb-3
                text-xs
                font-bold
                text-foreground
              "
            >
              Selecciona el método de pago
            </legend>

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: 'binance_pay',
                    title: 'Binance Pay',
                    description:
                      'Pago mediante Pay ID.',
                    icon: '⚡',
                  },
                  {
                    id: 'usdt_trc20',
                    title: 'USDT TRC20',
                    description:
                      'Red TRON (TRC20).',
                    icon: '◎',
                  },
                ] as const
              ).map((method) => {
                const active =
                  paymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() =>
                      handlePaymentMethodChange(
                        method.id,
                      )
                    }
                    disabled={isSubmitting}
                    aria-pressed={active}
                    className={`
                      rounded-2xl
                      border
                      p-4
                      text-left
                      transition
                      focus:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-amber-500
                      ${
                        active
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-border bg-muted/30 hover:border-amber-500/50'
                      }
                    `}
                  >
                    <span className="block text-lg">
                      {method.icon}
                    </span>

                    <span
                      className={`
                        mt-1 block
                        text-sm font-bold
                        ${
                          active
                            ? 'text-amber-500'
                            : 'text-foreground'
                        }
                      `}
                    >
                      {method.title}
                    </span>

                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {method.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ==================================================
              INFORMACIÓN DE PAGO
          ================================================== */}

          <section
            aria-label="Información de pago"
            className="
              mt-6
              rounded-2xl
              border border-border
              bg-muted/40
              p-4
            "
          >
            {paymentMethod ===
            'binance_pay' ? (
              <>
                <p className="text-xs leading-5 text-muted-foreground">
                  Envía exactamente{' '}
                  <strong className="text-foreground">
                    ${formatUSDT(totalUSD)} USDT
                  </strong>{' '}
                  mediante Binance Pay utilizando el
                  siguiente Pay ID:
                </p>

                <div className="mt-3 flex gap-3 rounded-xl border border-border bg-card p-3">
                  <code className="min-w-0 flex-1 break-all font-mono text-sm font-bold text-foreground">
                    {binancePayId ||
                      'No configurado'}
                  </code>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        binancePayId,
                        'binance',
                      )
                    }
                    disabled={
                      isSubmitting ||
                      !binancePayId.trim()
                    }
                    className="
                      shrink-0
                      text-xs
                      font-bold
                      text-amber-500
                      hover:underline
                      disabled:opacity-50
                    "
                  >
                    {copiedField ===
                    'binance'
                      ? 'Copiado'
                      : 'Copiar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs leading-5 text-muted-foreground">
                  Envía exactamente{' '}
                  <strong className="text-foreground">
                    ${formatUSDT(totalUSD)} USDT
                  </strong>{' '}
                  utilizando exclusivamente la red{' '}
                  <strong className="text-foreground">
                    TRON (TRC20)
                  </strong>
                  .
                </p>

                <div className="mt-3 flex gap-3 rounded-xl border border-border bg-card p-3">
                  <code className="min-w-0 flex-1 break-all font-mono text-xs font-bold text-foreground">
                    {usdtWalletAddress ||
                      'No configurada'}
                  </code>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        usdtWalletAddress,
                        'wallet',
                      )
                    }
                    disabled={
                      isSubmitting ||
                      !usdtWalletAddress.trim()
                    }
                    className="
                      shrink-0
                      text-xs
                      font-bold
                      text-amber-500
                      hover:underline
                      disabled:opacity-50
                    "
                  >
                    {copiedField ===
                    'wallet'
                      ? 'Copiado'
                      : 'Copiar'}
                  </button>
                </div>

                <div
                  className="
                    mt-3
                    rounded-xl
                    border border-amber-500/20
                    bg-amber-500/5
                    p-3
                    text-[10px]
                    leading-5
                    text-amber-600
                    dark:text-amber-400
                  "
                >
                  Verifica cuidadosamente la red
                  TRC20 y la dirección antes de enviar
                  fondos. Una transferencia realizada
                  a una red incorrecta puede resultar
                  irreversible.
                </div>
              </>
            )}
          </section>

          {/* ==================================================
              CONFIRMACIÓN
          ================================================== */}

          <form
            onSubmit={handleConfirmPayment}
            className="mt-6"
          >
            <label
              htmlFor="b2b-payment-reference"
              className="
                mb-2
                block
                text-xs
                font-bold
                text-foreground
              "
            >
              {paymentMethod ===
              'binance_pay'
                ? 'Referencia / Order ID'
                : 'TXID de la transacción'}
            </label>

            <input
              id="b2b-payment-reference"
              type="text"
              required
              maxLength={
                MAX_PAYMENT_REFERENCE_LENGTH
              }
              autoComplete="off"
              spellCheck={false}
              value={paymentReference}
              placeholder={
                paymentMethod ===
                'binance_pay'
                  ? 'Ej.: 218391029381029'
                  : 'Introduce el TXID de la operación'
              }
              onChange={(event) => {
                setPaymentReference(
                  event.target.value,
                );
                setErrorMessage(null);
              }}
              disabled={isSubmitting}
              className="
                w-full
                rounded-2xl
                border border-border
                bg-background
                px-4 py-3
                text-sm
                text-foreground
                outline-none
                transition
                focus:border-amber-500
                focus:ring-4
                focus:ring-amber-500/10
                disabled:opacity-60
              "
            />

            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
              Esta referencia será almacenada para
              permitir la posterior conciliación y
              verificación del pago.
            </p>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !paymentReference.trim() ||
                !!successMessage
              }
              className="
                mt-5
                w-full
                rounded-2xl
                bg-amber-500
                px-5 py-3.5
                font-black
                text-slate-950
                shadow-lg
                transition
                hover:bg-amber-600
                hover:shadow-xl
                focus:outline-none
                focus-visible:ring-4
                focus-visible:ring-amber-500/30
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {isSubmitting
                ? 'Registrando solicitud…'
                : successMessage
                  ? 'Solicitud registrada'
                  : 'Registrar Pedido Mayorista'}
            </button>
          </form>

          {/* ==================================================
              AVISO LEGAL / OPERATIVO
          ================================================== */}

          <div
            className="
              mt-5
              rounded-xl
              border border-border
              bg-muted/30
              p-3
            "
          >
            <p className="text-center text-[10px] leading-5 text-muted-foreground">
              <strong className="text-foreground">
                Importante:
              </strong>{' '}
              registrar esta solicitud no constituye
              confirmación de recepción de fondos.
              La orden permanecerá pendiente hasta que
              el pago sea validado por el procedimiento
              correspondiente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
