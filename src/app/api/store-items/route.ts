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

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("store_items")
    .insert({ name, image_url: imageUrl, description })
    .select("*")
    .single();

  if (error) return serverError(error, "storeItems.create");
  return NextResponse.json({ item: data }, { status: 201 });
}
