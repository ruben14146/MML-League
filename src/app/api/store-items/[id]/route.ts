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
