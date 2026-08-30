import { z } from "zod";

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  addressLine1: z.string().trim().max(255).optional(),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(40).optional(),
  country: z.string().trim().max(120).optional(),
  countryCode: z.string().trim().length(2).optional(),
  reference: z.string().trim().max(500).nullable().optional(),
});

export const createOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z
    .number()
    .int()
    .positive()
    .max(10000),
});

export const createOrderSchema = z.object({
  orderItems: z
    .array(createOrderItemSchema)
    .min(1, "La orden debe contener al menos un producto"),

  shippingAddress: shippingAddressSchema
    .nullable()
    .optional(),

  affiliateRef: z
    .string()
    .trim()
    .max(255)
    .nullable()
    .optional(),
});

export const orderStatusSchema = z.enum([
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "completed",
]);

export type ShippingAddressInput = z.infer<
  typeof shippingAddressSchema
>;

export type CreateOrderItemInput = z.infer<
  typeof createOrderItemSchema
>;

export type CreateOrderInput = z.infer<
  typeof createOrderSchema
>;

export type OrderStatusInput = z.infer<
  typeof orderStatusSchema
>;
