import { createClient } from "@/lib/supabase/client";
import type { StorageUploadOptions, StorageObjectRef } from "./types";

export async function uploadObject(
  object: StorageObjectRef,
  body: File | Blob | ArrayBuffer,
  options: StorageUploadOptions = {},
) {
  const supabase = createClient();
  return supabase.storage.from(object.bucket).upload(object.path, body, {
    contentType: options.contentType,
    upsert: options.upsert ?? false,
    cacheControl: options.cacheControl,
  });
}

export async function removeObject(object: StorageObjectRef) {
  const supabase = createClient();
  return supabase.storage.from(object.bucket).remove([object.path]);
}
