import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/admin";
import { createSignedUpload } from "@/lib/storageUpload";
import { serverError } from "@/lib/http";

// Model files can be tens of MB, well past Vercel's ~4.5MB request body
// cap, so this only issues a signed upload URL — the browser uploads the
// actual bytes straight to Supabase storage. Extension is trusted since
// there's no byte content to sniff yet; acceptable given this endpoint is
// staff-only, and OBJ/FBX don't sniff reliably either way (see the old
// heuristic this replaced).
export async function POST(request: NextRequest) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const filename = String(body.filename ?? "");
  const ext = filename.toLowerCase().split(".").pop();

  if (ext !== "obj" && ext !== "fbx") {
    return NextResponse.json(
      { error: "Unsupported model file (must be .obj or .fbx)" },
      { status: 400 }
    );
  }

  try {
    const { path, token, publicUrl } = await createSignedUpload("item-models", ext);
    return NextResponse.json({ path, token, url: publicUrl, model_type: ext });
  } catch (error) {
    return serverError(error, "uploadModel.init");
  }
}
