import { z } from "zod";

export const productSchema = z.object({
  storeId: z.string().uuid(),

  categoryId: z
    .string()
    .uuid()
    .nullable()
    .optional(),

  title: z
    .string()
    .trim()
    .min(2)
    .max(200),

  slug: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug no tiene un formato válido",
    ),

  description: z
    .string()
    .trim()
    .max(10000)
    .nullable()
    .optional(),

  price: z
    .number()
    .finite()
    .nonnegative(),

  stock: z
    .number()
    .int()
    .nonnegative(),

  images: z
    .array(z.string().url())
    .default([]),

  isActive: z
    .boolean()
    .default(true),
});

export const createProductSchema = productSchema;

export const updateProductSchema = productSchema.partial();

export type ProductInput = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<
  typeof createProductSchema
>;
export type UpdateProductInput = z.infer<
  typeof updateProductSchema
>;
