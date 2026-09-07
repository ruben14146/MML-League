import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { serverError } from "@/lib/http";
import type { TicketStatus } from "@/lib/db.types";

// The only two bulk transitions the admin panel offers: every accepted
// ticket moves to "sent_on_dash", and every "sent_on_dash" ticket moves to
// "sent_to_lockers". Each bulk button always operates on a fixed source
// status so staff can't accidentally bulk-move the wrong tickets.
const BULK_TRANSITIONS: Record<string, TicketStatus> = {
  sent_on_dash: "accepted",
  sent_to_lockers: "sent_on_dash",
};

export async function POST(request: NextRequest) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const target = String(body.target ?? "");
  const fromStatus = BULK_TRANSITIONS[target];

  if (!fromStatus) {
    return NextResponse.json({ error: "Invalid bulk target" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("tickets")
    .update({ status: target as TicketStatus })
    .eq("status", fromStatus)
    .select("id");

  if (error) return serverError(error, "tickets.bulkStatus");
  return NextResponse.json({ updated: data?.length ?? 0 });
}
