import { z } from "zod";

export const paymentMethodSchema = z.enum([
  "paypal",
  "binance_pay",
  "usdt",
  "bank_transfer",
]);

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),

  method: paymentMethodSchema,
});

export const paymentWebhookSchema = z.object({
  provider: z.string().trim().min(1).max(100),

  eventId: z.string().trim().min(1).max(255),

  eventType: z.string().trim().min(1).max(255),

  transactionId: z.string().trim().max(255).optional(),

  orderId: z.string().uuid().optional(),

  status: z.enum([
    "pending",
    "processing",
    "authorized",
    "completed",
    "failed",
    "cancelled",
    "refunded",
  ]),

  amount: z.number().finite().nonnegative().optional(),

  currency: z.string().trim().length(3).optional(),

  occurredAt: z.string().datetime(),
});

export type PaymentMethodInput = z.infer<
  typeof paymentMethodSchema
>;

export type CreatePaymentInput = z.infer<
  typeof createPaymentSchema
>;

export type PaymentWebhookInput = z.infer<
  typeof paymentWebhookSchema
>;
