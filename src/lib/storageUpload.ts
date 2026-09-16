import { supabaseAdmin } from "@/lib/supabase";

// Vercel's serverless functions hard-cap request bodies at ~4.5MB, which
// model files and high-res texture maps regularly exceed — so uploads
// don't proxy the file through our own API at all. Instead we mint a
// short-lived, path-scoped signed upload URL (which bypasses storage RLS
// entirely, by design) and hand it to the browser, which uploads directly
// to Supabase. The upload endpoints below only ever see the filename.
export async function createSignedUpload(bucket: string, ext: string) {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Failed to prepare upload");

  const { data: pub } = supabaseAdmin().storage.from(bucket).getPublicUrl(path);
  return { path, token: data.token, publicUrl: pub.publicUrl };
}
