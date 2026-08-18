"use server";

// Shared upload action for the Requests and Catalog photo fields --
// re-hosts a staff-picked file into Supabase Storage instead of only
// accepting a pasted external URL. This is also what fixes the deferred
// bug where prize images break on request cards because they point
// straight at Tinkercad (which requires an active login): once a photo
// is uploaded here, it lives in our own storage bucket as a plain public
// URL, not a link into someone else's site.
import { createServerClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/constants";

const BUCKET = PHOTO_BUCKET;
const MAX_BYTES = 8 * 1024 * 1024; // 8MB -- generous for a phone photo, small enough to stay fast on the shared wifi this app runs on.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];

export type UploadPhotoResult = { url: string; error?: undefined } | { url?: undefined; error: string };

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType ?? "jpg";
}

export async function uploadPhoto(formData: FormData): Promise<UploadPhotoResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file selected." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That photo is too large -- please use one under 8MB." };
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return { error: "That file type isn't supported -- please use a photo (JPG, PNG, GIF, WEBP, or HEIC)." };
  }

  const supabase = createServerClient();
  const path = `${crypto.randomUUID()}.${extensionFor(file)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
