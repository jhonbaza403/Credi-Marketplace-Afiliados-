import { GoogleGenerativeAI } from "@google/generative-ai";

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

function cleanJson(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function improveProductDraft(input: ProductDraftInput): Promise<ProductDraftSuggestion> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { ...FALLBACK, title: input.title.trim(), description: input.description.trim(), category: input.category.trim() };

  const modelName = process.env.GEMINI_PRODUCT_MODEL?.trim() || "gemini-2.5-flash";
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction:
      "Eres un asistente editorial de un marketplace. Solo ayudas a preparar fichas de productos para publicación. No inventes certificaciones, características, precios, garantías, resultados médicos, legales o fiscales. Mejora claridad, estructura, SEO y conversión con información proporcionada por el usuario. Devuelve únicamente JSON válido.",
  });

  const prompt = JSON.stringify({
    task: "Mejorar una ficha de producto antes de publicarla",
    input,
    outputSchema: {
      title: "string",
      description: "string",
      category: "string",
      tags: ["string"],
      sellingPoints: ["string"],
      checklist: ["string"],
      complianceNotes: ["string"],
    },
  });

  const result = await model.generateContent(prompt);
  const text = cleanJson(result.response.text());
  const parsed = JSON.parse(text) as Partial<ProductDraftSuggestion>;

  return {
    title: typeof parsed.title === "string" ? parsed.title : input.title.trim(),
    description: typeof parsed.description === "string" ? parsed.description : input.description.trim(),
    category: typeof parsed.category === "string" ? parsed.category : input.category.trim(),
    tags: Array.isArray(parsed.tags) ? parsed.tags.filter((value): value is string => typeof value === "string").slice(0, 12) : [],
    sellingPoints: Array.isArray(parsed.sellingPoints) ? parsed.sellingPoints.filter((value): value is string => typeof value === "string").slice(0, 8) : [],
    checklist: Array.isArray(parsed.checklist) ? parsed.checklist.filter((value): value is string => typeof value === "string").slice(0, 10) : FALLBACK.checklist,
    complianceNotes: Array.isArray(parsed.complianceNotes) ? parsed.complianceNotes.filter((value): value is string => typeof value === "string").slice(0, 8) : FALLBACK.complianceNotes,
  };
}
