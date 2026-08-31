import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    await request.text();
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook request" }, { status: 400 });
  }
}
