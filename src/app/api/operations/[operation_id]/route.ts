import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ operation_id: string }> },
) {
  const requestId = crypto.randomUUID()

  try {
    const { operation_id: operationId } = await params
    if (!operationId || !isUuid(operationId)) {
      return NextResponse.json(
        { success: false, code: "INVALID_OPERATION_ID", error: "El operation_id no es válido." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, code: "UNAUTHENTICATED", error: "Debes iniciar sesión." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      )
    }

    const { data, error } = await supabase.rpc("get_credi_operation_timeline", {
      p_operation_id: operationId,
    })

    if (error) {
      if (error.code === "42501") {
        return NextResponse.json(
          { success: false, code: "FORBIDDEN", error: "No tienes autorización para consultar esta operación." },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        )
      }

      console.error(`[operation:${requestId}] timeline lookup failed`, error)
      return NextResponse.json(
        { success: false, code: "OPERATION_TIMELINE_FAILED", error: "No fue posible reconstruir la operación." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      )
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (error) {
    console.error(`[operation:${requestId}] unexpected error`, error)
    return NextResponse.json(
      { success: false, code: "INTERNAL_SERVER_ERROR", error: "Ocurrió un error al consultar la operación." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}
