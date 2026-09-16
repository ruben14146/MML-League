import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/admin";
import { createSignedUpload } from "@/lib/storageUpload";
import { serverError } from "@/lib/http";

const ALLOWED_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

// Issues a signed upload URL rather than proxying the file itself — large
// texture maps (4K normal/metallic maps in particular) regularly exceed
// Vercel's ~4.5MB serverless request body cap, so the browser uploads
// directly to Supabase storage instead. This trades away server-side
// magic-byte sniffing of the image for extension-based validation, which
// is an acceptable loosening given the endpoint is staff-only either way.
export async function POST(request: NextRequest) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const filename = String(body.filename ?? "");
  const ext = filename.toLowerCase().split(".").pop();
  const normalizedExt = ext === "jpeg" ? "jpg" : ext;

  if (!normalizedExt || !ALLOWED_EXT.has(normalizedExt)) {
    return NextResponse.json(
      { error: "Unsupported image file (must be PNG, JPEG, GIF, or WebP)" },
      { status: 400 }
    );
  }

  try {
    const { path, token, publicUrl } = await createSignedUpload("item-images", normalizedExt);
    return NextResponse.json({ path, token, url: publicUrl });
  } catch (error) {
    return serverError(error, "upload.init");
  }
}
