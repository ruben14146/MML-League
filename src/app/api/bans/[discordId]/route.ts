import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { serverError } from "@/lib/http";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ discordId: string }> }
) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { discordId } = await params;

  const { error } = await supabaseAdmin().from("banned_users").delete().eq("discord_id", discordId);
  if (error) return serverError(error, "bans.revoke");
  return NextResponse.json({ ok: true });
}
