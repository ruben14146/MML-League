import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { serverError } from "@/lib/http";

const MAX_BYTES = 5 * 1024 * 1024;

// The image type is determined from the file's actual bytes, never from the
// client-supplied Content-Type or filename extension — both are trivially
// spoofable and could otherwise be used to smuggle a mislabeled file into
// public storage.
const SIGNATURES: { type: string; ext: string; bytes: number[] }[] = [
  { type: "image/png", ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/jpeg", ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/gif", ext: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
];

function sniffImageType(bytes: Uint8Array): { type: string; ext: string } | null {
  for (const sig of SIGNATURES) {
    if (sig.bytes.every((b, i) => bytes[i] === b)) return { type: sig.type, ext: sig.ext };
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { type: "image/webp", ext: "webp" };
  }
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
    return NextResponse.json({ error: "File is too large (max 5MB)" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = sniffImageType(bytes);
  if (!detected) {
    return NextResponse.json(
      { error: "Unsupported or invalid image file (must be PNG, JPEG, GIF, or WebP)" },
      { status: 400 }
    );
  }

  const path = `${crypto.randomUUID()}.${detected.ext}`;

  const { error } = await supabaseAdmin()
    .storage.from("item-images")
    .upload(path, bytes, { contentType: detected.type, upsert: false });

  if (error) return serverError(error, "upload");

  const { data: publicUrl } = supabaseAdmin().storage.from("item-images").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl.publicUrl });
}
