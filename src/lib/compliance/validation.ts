import { z } from "zod";

export const complianceStatus = z.enum([
  "not_started",
  "pending",
  "submitted",
  "in_review",
  "additional_information",
  "approved",
  "rejected",
  "expired",
  "suspended",
]);

export const kycInputSchema = z.object({
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  documentType: z.enum([
    "id_front",
    "passport",
    "drivers_license",
    "address_proof",
  ]),
});

export const kybInputSchema = z.object({
  legalName: z.string().trim().min(2).max(200),
  tradeName: z.string().trim().max(200).optional().or(z.literal("")),
  taxId: z.string().trim().min(2).max(100),
  registrationNumber: z.string().trim().min(2).max(100),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  legalAddress: z.string().trim().min(5).max(500),
  businessActivity: z.string().trim().min(2).max(500),
  ubos: z.array(
    z.object({
      fullName: z.string().trim().min(2).max(200),
      ownershipPercent: z.number().min(0).max(100),
      roleTitle: z.string().trim().max(120).optional().or(z.literal("")),
      country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
    }),
  ).min(1).max(50),
});

export const documentUploadMetaSchema = z.object({
  caseType: z.enum(["kyc", "kyb"]),
  caseId: z.string().uuid(),
  documentType: z.string().trim().min(2).max(50),
});
