import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { serverError } from "@/lib/http";

export async function GET() {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin()
    .from("staff_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return serverError(error, "staff.chat.list");
  return NextResponse.json({ messages: data });
}

export async function POST(request: NextRequest) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const message = String(body.message ?? "").trim().slice(0, 2000);
  if (!message) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("staff_messages")
    .insert({
      sender_discord_id: staff.session.user?.discordId ?? "unknown",
      sender_username: staff.session.user?.discordUsername ?? "Unknown",
      body: message,
    })
    .select("*")
    .single();

  if (error) return serverError(error, "staff.chat.create");
  return NextResponse.json({ message: data }, { status: 201 });
}
