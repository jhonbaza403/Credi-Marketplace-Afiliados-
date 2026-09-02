import { z } from "zod";

/**
 * ============================================================
 * CREDI MARKETPLACE
 * CHECKOUT SCHEMA
 * ============================================================
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const productIdSchema = z
  .string()
  .trim()
  .regex(
    UUID_REGEX,
    "El identificador del producto no es válido.",
  );

const quantitySchema = z
  .number({
    message:
      "La cantidad debe ser un número.",
  })
  .int(
    "La cantidad debe ser un número entero.",
  )
  .min(
    1,
    "La cantidad mínima es 1.",
  )
  .max(
    1000,
    "La cantidad máxima permitida es 1000.",
  );

export const checkoutItemSchema = z
  .object({
    product_id: productIdSchema,
    quantity: quantitySchema,
  })
  .strict();

export const checkoutSchema = z
  .object({
    items: z
      .array(checkoutItemSchema)
      .min(
        1,
        "El carrito no puede estar vacío.",
      )
      .max(
        100,
        "El checkout no puede contener más de 100 productos.",
      ),

    affiliate_ref: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .optional()
      .nullable(),

    region: z
      .string()
      .trim()
      .min(2)
      .max(32)
      .optional()
      .default("GLOBAL"),
  })
  .strict()
  .superRefine((data, ctx) => {
    const normalizedIds =
      data.items.map((item) =>
        item.product_id.toLowerCase(),
      );

    const uniqueIds =
      new Set(normalizedIds);

    if (
      uniqueIds.size !==
      normalizedIds.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message:
          "No se permiten productos duplicados en el checkout.",
      });
    }
  });

export type CheckoutInput =
  z.infer<typeof checkoutSchema>;

export type CheckoutItemInput =
  z.infer<typeof checkoutItemSchema>;

export function validateCheckout(
  payload: unknown,
) {
  return checkoutSchema.safeParse(
    payload,
  );
}

export function parseCheckout(
  payload: unknown,
): CheckoutInput {
  return checkoutSchema.parse(
    payload,
  );
}
