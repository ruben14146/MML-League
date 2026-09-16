import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { serverError } from "@/lib/http";
import type { StoreItemRow } from "@/lib/db.types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const update: Partial<StoreItemRow> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.description === "string" || body.description === null) {
    update.description = body.description;
  }
  if (typeof body.image_url === "string" || body.image_url === null) {
    update.image_url = body.image_url;
  }
  if (typeof body.model_url === "string" || body.model_url === null) {
    update.model_url = body.model_url;
  }
  if (body.model_type === "obj" || body.model_type === "fbx" || body.model_type === null) {
    update.model_type = body.model_type;
  }
  if (typeof body.color_map_url === "string" || body.color_map_url === null) {
    update.color_map_url = body.color_map_url;
  }
  if (typeof body.normal_map_url === "string" || body.normal_map_url === null) {
    update.normal_map_url = body.normal_map_url;
  }
  if (typeof body.metallic_map_url === "string" || body.metallic_map_url === null) {
    update.metallic_map_url = body.metallic_map_url;
  }
  if (typeof body.model_rotation_x === "number") update.model_rotation_x = body.model_rotation_x;
  if (typeof body.model_rotation_y === "number") update.model_rotation_y = body.model_rotation_y;
  if (typeof body.model_rotation_z === "number") update.model_rotation_z = body.model_rotation_z;

  const { data, error } = await supabaseAdmin()
    .from("store_items")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return serverError(error, "storeItems.update");
  return NextResponse.json({ item: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabaseAdmin().from("store_items").delete().eq("id", id);

  if (error) return serverError(error, "storeItems.delete");
  return NextResponse.json({ ok: true });
}
