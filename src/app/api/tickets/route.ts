import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireStaffSession } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import {
  generateTicketCode,
  isValidDiscordMessageLink,
  isValidServerLink,
} from "@/lib/tickets";
import type { TicketStatus } from "@/lib/db.types";

const VALID_STATUSES: TicketStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "sent_on_dash",
  "sent_to_lockers",
];

// Admin: list all tickets, optionally filtered by status.
export async function GET(request: NextRequest) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = request.nextUrl.searchParams.get("status");
  let query = supabaseAdmin()
    .from("tickets")
    .select("*, ticket_items(name, image_url)")
    .order("created_at", { ascending: false });

  if (status && VALID_STATUSES.includes(status as TicketStatus)) {
    query = query.eq("status", status as TicketStatus);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.discordUsername) {
    return NextResponse.json({ error: "You must sign in with Discord first." }, { status: 401 });
  }

  const body = await request.json();
  const itemId = String(body.item_id ?? "").trim();
  const discordMessageLink = String(body.discord_message_link ?? "").trim();
  const location = body.location === "outside" ? "outside" : "inside";
  const leagueName = location === "outside" ? String(body.league_name ?? "").trim() : null;
  const serverLink = location === "outside" ? String(body.server_link ?? "").trim() : null;

  if (!itemId) {
    return NextResponse.json({ error: "Pick an item first." }, { status: 400 });
  }
  if (!isValidDiscordMessageLink(discordMessageLink)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid Discord message link." },
      { status: 400 }
    );
  }
  if (location === "outside") {
    if (!leagueName) {
      return NextResponse.json({ error: "Enter the league this event was hosted in." }, { status: 400 });
    }
    if (!serverLink || !isValidServerLink(serverLink)) {
      return NextResponse.json({ error: "Enter a valid Discord server invite link." }, { status: 400 });
    }
  }

  const db = supabaseAdmin();

  // Ticket codes are short and random — retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const ticketCode = generateTicketCode();
    const { data, error } = await db
      .from("tickets")
      .insert({
        ticket_code: ticketCode,
        discord_username: session.user.discordUsername,
        discord_id: session.user.discordId ?? null,
        discord_message_link: discordMessageLink,
        item_id: itemId,
        location,
        league_name: leagueName,
        server_link: serverLink,
        status: "pending",
      })
      .select("*")
      .single();

    if (!error) {
      return NextResponse.json({ ticket: data }, { status: 201 });
    }
    if (!String(error.message).includes("duplicate key")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Could not generate a unique ticket ID, try again." }, { status: 500 });
}
