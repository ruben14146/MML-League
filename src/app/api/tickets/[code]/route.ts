import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import type { TicketRow, TicketStatus } from "@/lib/db.types";

const VALID_STATUSES: TicketStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "sent_on_dash",
  "sent_to_lockers",
];

function normalizeCode(raw: string) {
  const trimmed = raw.trim().toUpperCase();
  return trimmed.startsWith("MML-") ? trimmed : `MML-${trimmed}`;
}

// Public: look up a ticket's status by its code.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data, error } = await supabaseAdmin()
    .from("tickets")
    .select("ticket_code, status, admin_note, created_at, updated_at, ticket_items(name, image_url)")
    .eq("ticket_code", normalizeCode(code))
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No ticket found with that ID." }, { status: 404 });

  return NextResponse.json({ ticket: data });
}

// Admin: update a ticket's status.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { code } = await params;
  const body = await request.json();
  const status: unknown = body.status;
  const adminNote = typeof body.admin_note === "string" ? body.admin_note.trim() : undefined;

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as TicketStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const update: Partial<TicketRow> = { status: status as TicketStatus };
  if (adminNote !== undefined) update.admin_note = adminNote || null;

  const { data, error } = await supabaseAdmin()
    .from("tickets")
    .update(update)
    .eq("ticket_code", normalizeCode(code))
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}
