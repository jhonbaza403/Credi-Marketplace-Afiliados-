import { z } from "zod";

export const sellerSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(2)
    .max(160),

  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug no tiene un formato válido",
    ),

  description: z
    .string()
    .trim()
    .max(5000)
    .nullable()
    .optional(),
});

export const createSellerSchema = sellerSchema;

export const updateSellerSchema = sellerSchema.partial();

export type SellerInput = z.infer<typeof sellerSchema>;
export type CreateSellerInput = z.infer<
  typeof createSellerSchema
>;
export type UpdateSellerInput = z.infer<
  typeof updateSellerSchema
>;
