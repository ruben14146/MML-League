import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { serverError } from "@/lib/http";

// The signed-in user's own tickets — never anyone else's.
export async function GET() {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from("tickets")
    .select("*, ticket_items(name, image_url)")
    .eq("discord_id", session.user.discordId)
    .order("created_at", { ascending: false });

  if (error) return serverError(error, "account.tickets");
  return NextResponse.json({ tickets: data });
}
