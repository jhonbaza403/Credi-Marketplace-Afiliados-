import { NextResponse } from "next/server"
import { improveProductDraft } from "@/lib/ai/product-assistant"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const MAX_BODY = 16000

export async function POST(request: Request) {
  try {
    const type = request.headers.get("content-type") ?? ""
    if (!type.toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "Content-Type debe ser application/json." }, { status: 415 })
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0")
    if (contentLength > MAX_BODY) {
      return NextResponse.json({ error: "La publicación es demasiado grande." }, { status: 413 })
    }

    const body = await request.json() as Record<string, unknown>
    const input = {
      title: typeof body.title === "string" ? body.title.slice(0, 150) : "",
      description: typeof body.description === "string" ? body.description.slice(0, 4000) : "",
      category: typeof body.category === "string" ? body.category.slice(0, 120) : "",
      price: typeof body.price === "string" ? body.price.slice(0, 40) : "",
      stock: typeof body.stock === "string" ? body.stock.slice(0, 40) : "",
      country: typeof body.country === "string" ? body.country.slice(0, 80) : "",
      audience: typeof body.audience === "string" ? body.audience.slice(0, 160) : "",
    }

    if (input.title.trim().length < 2 && input.description.trim().length < 10) {
      return NextResponse.json({ error: "Añade al menos un título o descripción para mejorar la publicación." }, { status: 400 })
    }

    const suggestion = await improveProductDraft(input)
    return NextResponse.json({ success: true, suggestion }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[product-publisher]", error)
    return NextResponse.json({ error: "No fue posible preparar la publicación." }, { status: 500 })
  }
}
