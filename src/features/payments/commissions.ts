// ==========================================================
// ARCHIVO: src/features/payments/commissions.ts
// Credi Marketplace
//
// Motor de cálculo de comisiones
// Next.js 16.3
// React 19
// TypeScript
//
// RESPONSABILIDADES:
// - Determinar la comisión de una venta.
// - Calcular ingresos netos del vendedor.
// - Aplicar diferentes tasas según el plan.
// - Mantener precisión monetaria.
// - Validar entradas.
// - Evitar resultados monetarios inválidos.
//
// IMPORTANTE:
// Este módulo NO procesa pagos.
// Este módulo NO autoriza transacciones.
// Este módulo NO sustituye la validación del servidor.
//
// Para operaciones financieras definitivas, el cálculo debe
// repetirse/verificarse en servidor antes de registrar el pago.
// ==========================================================

import type {
  SubscriptionPlanId,
} from '@/features/subscriptions/plans';

// ==========================================================
// CONSTANTES
// ==========================================================

/**
 * Número de decimales monetarios estándar.
 */
export const MONEY_DECIMALS = 2;

/**
 * Tasa máxima permitida de comisión.
 *
 * Se expresa como porcentaje:
 *
 * 5 = 5%
 * 2 = 2%
 */
export const MAX_COMMISSION_PERCENTAGE = 100;

/**
 * Configuración predeterminada de comisiones.
 *
 * IMPORTANTE:
 *
 * Los porcentajes se expresan como números humanos:
 *
 * 5  = 5%
 * 2  = 2%
 *
 * NO:
 *
 * 0.05
 * 0.02
 */
export interface CommissionConfig {
  /**
   * Comisión estándar.
   */
  basePercentage: number;

  /**
   * Comisión para vendedores Premium Pro.
   */
  premiumPercentage: number;
}

/**
 * Configuración oficial actual.
 *
 * Object.freeze evita modificaciones accidentales
 * durante la ejecución del cliente.
 */
export const DEFAULT_COMMISSION_CONFIG: Readonly<CommissionConfig> =
  Object.freeze({
    basePercentage: 5,
    premiumPercentage: 2,
  });

// ==========================================================
// TIPOS
// ==========================================================

/**
 * Resultado de un cálculo de comisión.
 */
export interface CommissionCalculation {
  /**
   * Monto bruto de la venta.
   */
  saleAmount: number;

  /**
   * Porcentaje aplicado.
   *
   * Ejemplo:
   * 5 = 5%
   */
  percentage: number;

  /**
   * Tasa decimal utilizada internamente.
   *
   * Ejemplo:
   * 5% = 0.05
   */
  rate: number;

  /**
   * Comisión retenida por Credi Marketplace.
   */
  commission: number;

  /**
   * Cantidad neta correspondiente al vendedor.
   */
  sellerEarnings: number;
}

/**
 * Opciones para el cálculo.
 */
export interface CommissionOptions {
  /**
   * Plan actual del vendedor.
   */
  planId?: SubscriptionPlanId | null;

  /**
   * Configuración personalizada.
   *
   * Útil para promociones, campañas o configuraciones
   * administrativas controladas por servidor.
   */
  config?: Partial<CommissionConfig>;
}

// ==========================================================
// ERRORES
// ==========================================================

/**
 * Error específico para operaciones financieras inválidas.
 */
export class CommissionCalculationError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'CommissionCalculationError';
  }
}

// ==========================================================
// VALIDACIÓN
// ==========================================================

/**
 * Comprueba que un importe monetario sea válido.
 */
function assertValidMoneyAmount(
  amount: number,
  fieldName: string,
): void {
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount)
  ) {
    throw new CommissionCalculationError(
      `${fieldName} debe ser un número finito.`,
    );
  }

  if (amount < 0) {
    throw new CommissionCalculationError(
      `${fieldName} no puede ser negativo.`,
    );
  }
}

/**
 * Comprueba que una tasa porcentual sea válida.
 */
function assertValidPercentage(
  percentage: number,
  fieldName: string,
): void {
  if (
    typeof percentage !== 'number' ||
    !Number.isFinite(percentage)
  ) {
    throw new CommissionCalculationError(
      `${fieldName} debe ser un número finito.`,
    );
  }

  if (
    percentage < 0 ||
    percentage > MAX_COMMISSION_PERCENTAGE
  ) {
    throw new CommissionCalculationError(
      `${fieldName} debe estar entre 0 y ${MAX_COMMISSION_PERCENTAGE}.`,
    );
  }
}

// ==========================================================
// REDONDEO MONETARIO
// ==========================================================

/**
 * Redondea un importe monetario a dos decimales.
 *
 * Se utiliza únicamente para presentación/cálculo final.
 *
 * Para contabilidad financiera de máxima precisión,
 * recomendamos posteriormente trabajar en unidades
 * mínimas enteras o utilizar una estrategia decimal en
 * servidor.
 */
export function roundMoney(
  amount: number,
): number {
  assertValidMoneyAmount(
    amount,
    'El importe',
  );

  const factor =
    10 ** MONEY_DECIMALS;

  return (
    Math.round(
      (amount + Number.EPSILON) *
        factor,
    ) / factor
  );
}

// ==========================================================
// PORCENTAJE → TASA DECIMAL
// ==========================================================

/**
 * Convierte:
 *
 * 5 → 0.05
 * 2 → 0.02
 */
export function percentageToRate(
  percentage: number,
): number {
  assertValidPercentage(
    percentage,
    'El porcentaje',
  );

  return percentage / 100;
}

// ==========================================================
// OBTENER COMISIÓN SEGÚN PLAN
// ==========================================================

/**
 * Determina el porcentaje de comisión correspondiente
 * al plan del vendedor.
 */
export function getCommissionPercentage(
  planId: SubscriptionPlanId | null | undefined,
  config: Partial<CommissionConfig> = {},
): number {
  const basePercentage =
    config.basePercentage ??
    DEFAULT_COMMISSION_CONFIG.basePercentage;

  const premiumPercentage =
    config.premiumPercentage ??
    DEFAULT_COMMISSION_CONFIG.premiumPercentage;

  assertValidPercentage(
    basePercentage,
    'basePercentage',
  );

  assertValidPercentage(
    premiumPercentage,
    'premiumPercentage',
  );

  if (planId === 'premium-pro') {
    return premiumPercentage;
  }

  return basePercentage;
}

// ==========================================================
// CÁLCULO PRINCIPAL
// ==========================================================

/**
 * Calcula la comisión de una venta.
 *
 * Ejemplo:
 *
 * Venta: $100
 * Comisión: 5%
 *
 * Resultado:
 *
 * commission = 5
 * sellerEarnings = 95
 */
export function calculateCommission(
  saleAmount: number,
  options: CommissionOptions = {},
): CommissionCalculation {
  assertValidMoneyAmount(
    saleAmount,
    'saleAmount',
  );

  const percentage =
    getCommissionPercentage(
      options.planId,
      options.config,
    );

  const rate =
    percentageToRate(percentage);

  const commission =
    roundMoney(
      saleAmount * rate,
    );

  const sellerEarnings =
    roundMoney(
      saleAmount - commission,
    );

  /**
   * Protección adicional contra errores de
   * precisión de punto flotante.
   */
  if (
    commission < 0 ||
    sellerEarnings < 0 ||
    commission > saleAmount
  ) {
    throw new CommissionCalculationError(
      'El cálculo de la comisión produjo un resultado financiero inválido.',
    );
  }

  return {
    saleAmount: roundMoney(saleAmount),
    percentage,
    rate,
    commission,
    sellerEarnings,
  };
}

// ==========================================================
// COMPATIBILIDAD CON EL CÓDIGO ANTERIOR
// ==========================================================

/**
 * Versión simplificada para componentes que todavía
 * trabajan con el booleano isSellerPremium.
 *
 * Se conserva temporalmente para evitar romper componentes
 * existentes.
 *
 * NUEVO CÓDIGO:
 * Preferir calculateCommission() utilizando planId.
 */
export function calculateCommissionLegacy(
  saleAmount: number,
  isSellerPremium = false,
): {
  commission: number;
  sellerEarnings: number;
} {
  const result =
    calculateCommission(
      saleAmount,
      {
        planId: isSellerPremium
          ? 'premium-pro'
          : 'free',
      },
    );

  return {
    commission: result.commission,
    sellerEarnings:
      result.sellerEarnings,
  };
}

// ==========================================================
// CÁLCULO INVERSO
// ==========================================================

/**
 * Calcula cuánto debe cobrarse para que el vendedor
 * reciba exactamente el importe neto solicitado,
 * considerando la comisión.
 *
 * Ejemplo:
 *
 * El vendedor quiere recibir $98.
 * Comisión = 2%.
 *
 * Precio bruto ≈ $100.
 */
export function calculateGrossAmountForSellerEarnings(
  desiredSellerEarnings: number,
  planId: SubscriptionPlanId | null | undefined,
  config: Partial<CommissionConfig> = {},
): number {
  assertValidMoneyAmount(
    desiredSellerEarnings,
    'desiredSellerEarnings',
  );

  const percentage =
    getCommissionPercentage(
      planId,
      config,
    );

  const rate =
    percentageToRate(percentage);

  if (rate >= 1) {
    throw new CommissionCalculationError(
      'No es posible calcular el importe bruto cuando la comisión es del 100%.',
    );
  }

  return roundMoney(
    desiredSellerEarnings /
      (1 - rate),
  );
}

// ==========================================================
// UTILIDADES
// ==========================================================

/**
 * Comprueba si una comisión es válida.
 */
export function isValidCommissionPercentage(
  percentage: number,
): boolean {
  return (
    typeof percentage === 'number' &&
    Number.isFinite(percentage) &&
    percentage >= 0 &&
    percentage <=
      MAX_COMMISSION_PERCENTAGE
  );
}
