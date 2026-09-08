import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireStaffSession } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { serverError } from "@/lib/http";
import { isBanned } from "@/lib/bans";
import {
  generateTicketCode,
  isValidDiscordMessageLink,
  isValidPlayerId,
  isValidServerLink,
} from "@/lib/tickets";
import type { TicketRow, TicketStatus } from "@/lib/db.types";

type TicketWithItem = TicketRow & {
  ticket_items: { name: string; image_url: string | null } | null;
};

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
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const league = request.nextUrl.searchParams.get("league")?.trim();
  let query = supabaseAdmin()
    .from("tickets")
    .select("*, ticket_items(name, image_url)")
    .order("created_at", { ascending: false });

  if (status && VALID_STATUSES.includes(status as TicketStatus)) {
    query = query.eq("status", status as TicketStatus);
  }

  if (league) {
    query = query.eq("league_name", league);
  }

  if (search) {
    // Strip characters meaningful to PostgREST's .or() filter syntax so a
    // search term can't be crafted to splice in extra filter conditions.
    const safe = search.replace(/[,()]/g, "");
    query = query.or(
      `ticket_code.ilike.%${safe}%,discord_username.ilike.%${safe}%,discord_id.ilike.%${safe}%,player_id.ilike.%${safe}%`
    );
  }

  const { data, error } = await query;
  if (error) return serverError(error, "tickets.list");

  // Scam detection: flag when the same Discord message link (the "proof")
  // has been used across more than one ticket, regardless of status —
  // someone re-using proof from one event to claim multiple items.
  const { data: allLinks } = await supabaseAdmin()
    .from("tickets")
    .select("discord_message_link");
  const linkCounts = new Map<string, number>();
  for (const row of allLinks ?? []) {
    linkCounts.set(row.discord_message_link, (linkCounts.get(row.discord_message_link) ?? 0) + 1);
  }
  const tickets = ((data ?? []) as TicketWithItem[]).map((ticket) => ({
    ...ticket,
    link_reuse_count: linkCounts.get(ticket.discord_message_link) ?? 1,
  }));

  return NextResponse.json({ tickets });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.discordUsername) {
    return NextResponse.json({ error: "You must sign in with Discord first." }, { status: 401 });
  }
  // Defense-in-depth: the sign-in callback already blocks banned Discord
  // IDs from getting a session at all, but a ban can also land while
  // someone still holds an existing session cookie.
  if (await isBanned(session.user.discordId)) {
    return NextResponse.json({ error: "Your account has been banned." }, { status: 403 });
  }

  const body = await request.json();
  const itemId = String(body.item_id ?? "").trim();
  const playerId = String(body.player_id ?? "").trim();
  const discordMessageLink = String(body.discord_message_link ?? "").trim();
  const location = body.location === "outside" ? "outside" : "inside";
  const leagueName = location === "outside" ? String(body.league_name ?? "").trim() : null;
  const serverLink = location === "outside" ? String(body.server_link ?? "").trim() : null;

  if (!itemId) {
    return NextResponse.json({ error: "Pick an item first." }, { status: 400 });
  }
  if (!isValidPlayerId(playerId)) {
    return NextResponse.json(
      { error: "Enter a valid VRFS Player ID (numbers only)." },
      { status: 400 }
    );
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
        player_id: playerId,
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
      return serverError(error, "tickets.create");
    }
  }

  return NextResponse.json({ error: "Could not generate a unique ticket ID, try again." }, { status: 500 });
}
