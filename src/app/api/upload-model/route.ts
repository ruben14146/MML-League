import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { serverError } from "@/lib/http";

const MAX_BYTES = 30 * 1024 * 1024;

// OBJ/FBX content is too free-form to sniff with a fixed byte signature the
// way images can be (OBJ is arbitrary text, ASCII FBX has no fixed magic),
// so this leans on content heuristics with the client-supplied extension as
// a fallback — acceptable since this endpoint is staff-only to begin with.
function detectModelType(bytes: Uint8Array, filename: string): "obj" | "fbx" | null {
  const fbxBinarySig = "Kaydara FBX Binary";
  const head = Array.from(bytes.slice(0, fbxBinarySig.length))
    .map((b) => String.fromCharCode(b))
    .join("");
  if (head === fbxBinarySig) return "fbx";

  const textHead = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 4096));
  if (/FBXHeaderExtension|;\s*FBX\s/i.test(textHead)) return "fbx";
  if (/^\s*(#|o |g |v |vt |vn |f |mtllib|usemtl)/m.test(textHead)) return "obj";

  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "obj" || ext === "fbx") return ext;
  return null;
}

export async function POST(request: NextRequest) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 30MB)" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const modelType = detectModelType(bytes, file.name);
  if (!modelType) {
    return NextResponse.json(
      { error: "Unsupported or invalid model file (must be .obj or .fbx)" },
      { status: 400 }
    );
  }

  const path = `${crypto.randomUUID()}.${modelType}`;

  const { error } = await supabaseAdmin()
    .storage.from("item-models")
    .upload(path, bytes, {
      contentType: modelType === "obj" ? "text/plain" : "application/octet-stream",
      upsert: false,
    });

  if (error) return serverError(error, "uploadModel");

  const { data: publicUrl } = supabaseAdmin().storage.from("item-models").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl.publicUrl, model_type: modelType });
}
