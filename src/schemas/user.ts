import { z } from "zod";

export const userRoleSchema = z.enum([
  "customer",
  "vendor",
  "professional",
  "company",
  "admin",
]);

export const updateUserProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .optional(),

  avatarUrl: z
    .string()
    .url()
    .nullable()
    .optional(),
});

export const createStoreSchema = z.object({
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

export const updateStoreSchema =
  createStoreSchema.partial();

export type UserRoleInput = z.infer<
  typeof userRoleSchema
>;

export type UpdateUserProfileInput = z.infer<
  typeof updateUserProfileSchema
>;

export type CreateStoreInput = z.infer<
  typeof createStoreSchema
>;

export type UpdateStoreInput = z.infer<
  typeof updateStoreSchema
>;
