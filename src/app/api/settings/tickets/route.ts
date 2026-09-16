import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { getTicketSettings } from "@/lib/settings";
import { serverError } from "@/lib/http";

// Public: the ticket wizard needs this before a user has any session.
export async function GET() {
  const settings = await getTicketSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const enabled = Boolean(body.enabled);
  const reason = enabled ? null : String(body.reason ?? "").trim() || null;

  const { data, error } = await supabaseAdmin()
    .from("site_settings")
    .update({
      tickets_enabled: enabled,
      tickets_disabled_reason: reason,
      updated_by: staff.session.user?.discordUsername ?? null,
    })
    .eq("id", true)
    .select("tickets_enabled, tickets_disabled_reason")
    .single();

  if (error) return serverError(error, "settings.tickets.update");
  return NextResponse.json({ enabled: data.tickets_enabled, reason: data.tickets_disabled_reason });
}
