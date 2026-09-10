import { GoogleGenAI } from "@google/genai";

export interface ProductDraftInput {
  title: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  country: string;
  audience: string;
}

export interface ProductDraftSuggestion {
  title: string;
  description: string;
  category: string;
  tags: string[];
  sellingPoints: string[];
  checklist: string[];
  complianceNotes: string[];
}

const FALLBACK: ProductDraftSuggestion = {
  title: "",
  description: "",
  category: "",
  tags: [],
  sellingPoints: [],
  checklist: [
    "Añade fotografías claras del producto y sus características principales.",
    "Indica precio, moneda, disponibilidad y condiciones de entrega.",
    "Usa afirmaciones comerciales verificables y evita promesas engañosas.",
    "Completa la información fiscal y del vendedor que corresponda al país.",
  ],
  complianceNotes: [
    "La IA es una ayuda editorial; no sustituye una revisión jurídica o fiscal.",
    "No publiques datos personales, secretos, credenciales ni información financiera sensible.",
  ],
};

const SYSTEM_INSTRUCTION = [
  "Eres el asistente editorial de Credi Marketplace.",
  "Tu único objetivo es ayudar a preparar una ficha de producto antes de que el vendedor la publique.",
  "No publicas productos, no ejecutas pagos y no tomas decisiones en nombre del vendedor.",
  "Trabaja exclusivamente con los datos proporcionados.",
  "No inventes certificaciones, materiales, especificaciones, garantías, precios, disponibilidad, resultados médicos ni afirmaciones legales o fiscales.",
  "Mejora claridad, estructura, SEO y conversión sin cambiar hechos.",
  "Cuando falte información importante, dilo en checklist en lugar de inventarla.",
].join(" ");

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    category: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    sellingPoints: { type: "array", items: { type: "string" } },
    checklist: { type: "array", items: { type: "string" } },
    complianceNotes: { type: "array", items: { type: "string" } },
  },
  required: ["title", "description", "category", "tags", "sellingPoints", "checklist", "complianceNotes"],
};

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export async function improveProductDraft(input: ProductDraftInput): Promise<ProductDraftSuggestion> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ...FALLBACK,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
    };
  }

  const modelName = process.env.GEMINI_PRODUCT_MODEL?.trim() || "gemini-3.8-flash";
  const client = new GoogleGenAI({ apiKey });

  const prompt = JSON.stringify({
    task: "Mejorar una ficha de producto antes de su publicación",
    input,
  });

  const result = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = typeof result.text === "string" ? result.text.trim() : "";
  if (!text) return FALLBACK;

  const parsed = JSON.parse(text) as Partial<ProductDraftSuggestion>;
  const checklist = cleanList(parsed.checklist, 10, 240);
  const complianceNotes = cleanList(parsed.complianceNotes, 8, 280);

  return {
    title: cleanText(parsed.title, input.title.trim(), 150),
    description: cleanText(parsed.description, input.description.trim(), 4000),
    category: cleanText(parsed.category, input.category.trim(), 100),
    tags: cleanList(parsed.tags, 12, 60),
    sellingPoints: cleanList(parsed.sellingPoints, 8, 180),
    checklist: checklist.length ? checklist : FALLBACK.checklist,
    complianceNotes: complianceNotes.length ? complianceNotes : FALLBACK.complianceNotes,
  };
}
