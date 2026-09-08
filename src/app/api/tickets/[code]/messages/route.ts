import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getStaffRole } from "@/lib/roles";
import { serverError } from "@/lib/http";

function normalizeCode(raw: string) {
  const trimmed = raw.trim().toUpperCase();
  return trimmed.startsWith("MML-") ? trimmed : `MML-${trimmed}`;
}

async function authorize(code: string) {
  const session = await auth();
  if (!session?.user?.discordId) return { error: "Not signed in.", status: 401 } as const;

  const { data: ticket } = await supabaseAdmin()
    .from("tickets")
    .select("id, discord_id")
    .eq("ticket_code", normalizeCode(code))
    .maybeSingle();

  if (!ticket) return { error: "No ticket found with that ID.", status: 404 } as const;

  const role = await getStaffRole(session.user.discordId);
  const isOwner = ticket.discord_id === session.user.discordId;
  if (!role && !isOwner) return { error: "Forbidden", status: 403 } as const;

  return { session, ticket, isStaff: !!role } as const;
}

// Ticket owner or any staff member can read the thread.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const auth_ = await authorize(code);
  if ("error" in auth_) return NextResponse.json({ error: auth_.error }, { status: auth_.status });

  const { data, error } = await supabaseAdmin()
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", auth_.ticket.id)
    .order("created_at", { ascending: true });

  if (error) return serverError(error, "tickets.messages.list");
  return NextResponse.json({ messages: data, isStaff: auth_.isStaff });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const auth_ = await authorize(code);
  if ("error" in auth_) return NextResponse.json({ error: auth_.error }, { status: auth_.status });

  const body = await request.json();
  const message = String(body.message ?? "").trim().slice(0, 2000);
  if (!message) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("ticket_messages")
    .insert({
      ticket_id: auth_.ticket.id,
      sender_discord_id: auth_.session.user.discordId!,
      sender_username: auth_.session.user.discordUsername ?? "Unknown",
      is_staff: auth_.isStaff,
      body: message,
    })
    .select("*")
    .single();

  if (error) return serverError(error, "tickets.messages.create");
  return NextResponse.json({ message: data }, { status: 201 });
}
