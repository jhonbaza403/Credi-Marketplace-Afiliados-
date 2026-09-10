import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CHAT_BUCKET = "credichat-private";
const SIGNED_URL_TTL_SECONDS = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storagePath = url.searchParams.get("path")?.trim();
  if (!storagePath || storagePath.length > 500) {
    return NextResponse.json({ error: "INVALID_MEDIA_PATH" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: attachment, error: attachmentError } = await admin
    .from("message_attachments")
    .select("storage_path,storage_bucket,message_id,messages!inner(conversation_id)")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (attachmentError || !attachment) {
    return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
  }

  if (attachment.storage_bucket !== CHAT_BUCKET) {
    return NextResponse.json({ error: "MEDIA_NOT_PRIVATE" }, { status: 410 });
  }

  const messageRelation = attachment.messages as { conversation_id: string } | { conversation_id: string }[] | null;
  const conversationId = Array.isArray(messageRelation) ? messageRelation[0]?.conversation_id : messageRelation?.conversation_id;
  if (!conversationId) {
    return NextResponse.json({ error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "SIGNED_URL_UNAVAILABLE" }, { status: 502 });
  }

  return NextResponse.redirect(signed.signedUrl, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
