import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { serverError } from "@/lib/http";
import { buildDiscordBatches, sendDiscordBatches, type DiscordItemGroup } from "@/lib/discord";
import type { TicketRow } from "@/lib/db.types";

type TicketWithItem = TicketRow & { ticket_items: { name: string } | null };

// Staff: post every accepted ticket to the fulfillment Discord webhook,
// grouped by item (item order matches the same alphabetical order shown on
// the fulfillment page) as "player id | username | item | message link"
// lines, chunked to stay under Discord's message length limit.
export async function POST() {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const webhookUrl = process.env.DISCORD_TICKETS_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "DISCORD_TICKETS_WEBHOOK_URL is not configured on the server." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin()
    .from("tickets")
    .select("*, ticket_items(name)")
    .eq("status", "accepted")
    .order("created_at", { ascending: true });

  if (error) return serverError(error, "tickets.notifyDiscord");

  const tickets = (data ?? []) as TicketWithItem[];
  if (tickets.length === 0) {
    return NextResponse.json({ error: "No accepted tickets to send." }, { status: 400 });
  }

  const byItem = new Map<string, DiscordItemGroup>();
  for (const ticket of tickets) {
    const key = ticket.item_id ?? "unknown";
    const name = ticket.ticket_items?.name ?? "Unknown item";
    if (!byItem.has(key)) byItem.set(key, { name, lines: [] });
    byItem
      .get(key)!
      .lines.push(`${ticket.player_id ?? "—"} | ${ticket.discord_username} | ${name} | ${ticket.discord_message_link}`);
  }
  const groups = Array.from(byItem.values()).sort((a, b) => a.name.localeCompare(b.name));
  const batches = buildDiscordBatches(groups);

  try {
    await sendDiscordBatches(webhookUrl, batches);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send to Discord." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: batches.length, tickets: tickets.length });
}
