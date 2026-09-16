import { createClient } from "@supabase/supabase-js";
import type { ModelType } from "@/lib/db.types";

// Public by design — the anon/publishable key has no elevated access on
// its own. The actual authorization for each upload comes from the
// short-lived signed token minted server-side in /api/upload(-model),
// after that route's own staff-session check.
let browserClient: ReturnType<typeof createClient> | null = null;
function supabaseBrowser() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Uploads aren't configured yet (missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY).");
    }
    browserClient = createClient(url, key);
  }
  return browserClient;
}

async function directUpload(bucket: string, initEndpoint: string, file: File) {
  const initRes = await fetch(initEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name }),
  });
  const initText = await initRes.text();
  let initData: Record<string, unknown>;
  try {
    initData = JSON.parse(initText);
  } catch {
    throw new Error(`Upload failed (server returned an unexpected response).`);
  }
  if (!initRes.ok) throw new Error((initData.error as string) ?? "Upload failed");

  const { error } = await supabaseBrowser()
    .storage.from(bucket)
    .uploadToSignedUrl(initData.path as string, initData.token as string, file);
  if (error) throw new Error(error.message || "Upload failed");

  return initData;
}

export async function uploadImageDirect(file: File): Promise<string> {
  const data = await directUpload("item-images", "/api/upload", file);
  return data.url as string;
}

export async function uploadModelDirect(file: File): Promise<{ url: string; modelType: ModelType }> {
  const data = await directUpload("item-models", "/api/upload-model", file);
  return { url: data.url as string, modelType: data.model_type as ModelType };
}
