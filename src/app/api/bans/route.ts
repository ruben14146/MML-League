import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { getStaffRole } from "@/lib/roles";
import { serverError } from "@/lib/http";

// Discord snowflake IDs are 17-20 digit numbers.
const DISCORD_ID_RE = /^\d{17,20}$/;

export async function GET() {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin()
    .from("banned_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return serverError(error, "bans.list");
  return NextResponse.json({ bans: data });
}

export async function POST(request: NextRequest) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const discordId = String(body.discord_id ?? "").trim();
  const discordUsername = body.discord_username ? String(body.discord_username).trim() : null;
  const reason = body.reason ? String(body.reason).trim() : null;

  if (!DISCORD_ID_RE.test(discordId)) {
    return NextResponse.json({ error: "Enter a valid Discord user ID (17-20 digits)." }, { status: 400 });
  }

  // Refuse to ban anyone currently holding a staff role — avoids an admin
  // accidentally (or maliciously) locking out another staff member; that
  // has to go through revoking their role first.
  if (await getStaffRole(discordId)) {
    return NextResponse.json(
      { error: "This Discord ID belongs to a staff member — revoke their role first." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin()
    .from("banned_users")
    .upsert(
      {
        discord_id: discordId,
        discord_username: discordUsername,
        reason,
        banned_by: staff.session.user?.discordId ?? null,
      },
      { onConflict: "discord_id" }
    )
    .select("*")
    .single();

  if (error) return serverError(error, "bans.create");
  return NextResponse.json({ ban: data }, { status: 201 });
}
