import { NextResponse } from "next/server"
import { getDatabaseServerClient } from "@/lib/database/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PUBLIC_FIELDS = "id,title,category,wholesale_price_usd,regular_price_usd,min_order_quantity,stock_available,image_url,video_media,description,country,status,moderation_status,created_at"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } })
}

export async function GET() {
  try {
    const supabase = await getDatabaseServerClient()
    const { data, error } = await supabase
      .from("b2b_products")
      .select(PUBLIC_FIELDS)
      .eq("status", "published")
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("[b2b/products][GET]", error)
      return json({ error: "No fue posible cargar el catálogo B2B." }, 500)
    }

    return json({ products: data ?? [] })
  } catch (error) {
    console.error("[b2b/products][GET]", error)
    return json({ error: "No fue posible cargar el catálogo B2B." }, 500)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getDatabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return json({ error: "Debes iniciar sesión para publicar una oferta B2B." }, 401)

    const contentType = request.headers.get("content-type") ?? ""
    if (!contentType.toLowerCase().includes("application/json")) {
      return json({ error: "Content-Type debe ser application/json." }, 415)
    }

    const body = await request.json() as Record<string, unknown>
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const category = typeof body.category === "string" ? body.category.trim() : ""
    const description = typeof body.description === "string" ? body.description.trim() : ""
    const countryRaw = typeof body.country === "string" ? body.country.trim().toUpperCase() : ""
    const binancePayId = typeof body.binancePayId === "string" ? body.binancePayId.trim().slice(0, 160) : ""
    const usdtWalletAddress = typeof body.usdtWalletAddress === "string" ? body.usdtWalletAddress.trim().slice(0, 220) : ""
    const wholesale = Number(body.wholesale)
    const regular = Number(body.regular)
    const moq = Number(body.moq)
    const stock = Number(body.stock)
    const images = Array.isArray(body.images) ? body.images : []
    const videos = Array.isArray(body.videos) ? body.videos : []

    if (title.length < 3 || title.length > 300) return json({ error: "El nombre de la oferta debe tener entre 3 y 300 caracteres." }, 400)
    if (!category || category.length > 120) return json({ error: "La categoría no es válida." }, 400)
    if (!(wholesale > 0) || !(regular > wholesale)) return json({ error: "El precio mayorista debe ser positivo y menor al precio de referencia." }, 400)
    if (!Number.isInteger(moq) || moq < 1) return json({ error: "El MOQ debe ser un entero positivo." }, 400)
    if (!Number.isInteger(stock) || stock < moq) return json({ error: "El stock debe ser un entero mayor o igual al MOQ." }, 400)
    if (description.length < 20 || description.length > 12000) return json({ error: "La descripción debe tener entre 20 y 12000 caracteres." }, 400)
    if (countryRaw && !/^[A-Z]{2}$/.test(countryRaw)) return json({ error: "El país debe usar un código ISO de 2 letras." }, 400)
    if (images.length < 1 || images.length > 12) return json({ error: "Debes incluir entre 1 y 12 imágenes." }, 400)
    if (videos.length > 1) return json({ error: "Solo se permite un vídeo por oferta B2B." }, 400)

    const { data, error } = await supabase
      .from("b2b_products")
      .insert({
        supplier_id: user.id,
        title,
        category,
        wholesale_price_usd: wholesale,
        regular_price_usd: regular,
        min_order_quantity: moq,
        stock_available: stock,
        binance_pay_id: binancePayId || null,
        usdt_wallet_address: usdtWalletAddress || null,
        image_url: typeof images[0] === "object" && images[0] !== null && typeof (images[0] as Record<string, unknown>).url === "string"
          ? (images[0] as Record<string, unknown>).url
          : null,
        video_media: videos,
        description,
        country: countryRaw || null,
        status: "draft",
        moderation_status: "pending",
      })
      .select("id,status,moderation_status,created_at")
      .single()

    if (error) {
      console.error("[b2b/products][POST]", error)
      return json({ error: "No fue posible registrar la oferta B2B." }, 400)
    }

    return json({ success: true, product: data }, 201)
  } catch (error) {
    console.error("[b2b/products][POST]", error)
    return json({ error: "No fue posible registrar la oferta B2B." }, 500)
  }
}