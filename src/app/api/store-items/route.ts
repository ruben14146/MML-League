import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { serverError } from "@/lib/http";

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("store_items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return serverError(error, "storeItems.list");
  return NextResponse.json({ items: data });
}

export async function POST(request: NextRequest) {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const imageUrl = body.image_url ? String(body.image_url).trim() : null;
  const description = body.description ? String(body.description).trim() : null;
  const modelUrl = body.model_url ? String(body.model_url).trim() : null;
  const modelType = body.model_type === "obj" || body.model_type === "fbx" ? body.model_type : null;
  const colorMapUrl = body.color_map_url ? String(body.color_map_url).trim() : null;
  const normalMapUrl = body.normal_map_url ? String(body.normal_map_url).trim() : null;
  const metallicMapUrl = body.metallic_map_url ? String(body.metallic_map_url).trim() : null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("store_items")
    .insert({
      name,
      image_url: imageUrl,
      description,
      model_url: modelUrl,
      model_type: modelUrl ? modelType : null,
      color_map_url: colorMapUrl,
      normal_map_url: normalMapUrl,
      metallic_map_url: metallicMapUrl,
    })
    .select("*")
    .single();

  if (error) return serverError(error, "storeItems.create");
  return NextResponse.json({ item: data }, { status: 201 });
}
