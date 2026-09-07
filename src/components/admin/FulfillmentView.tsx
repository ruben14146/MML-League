"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Copy, Check, Send } from "lucide-react";
import type { TicketRow } from "@/lib/db.types";

type TicketWithItem = TicketRow & {
  ticket_items: { name: string; image_url: string | null } | null;
};

type ItemGroup = {
  itemId: string;
  name: string;
  imageUrl: string | null;
  playerIds: string[];
};

export default function FulfillmentView() {
  const [tickets, setTickets] = useState<TicketWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    fetch("/api/tickets?status=accepted")
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets ?? []))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo<ItemGroup[]>(() => {
    const byItem = new Map<string, ItemGroup>();
    for (const ticket of tickets) {
      const itemId = ticket.item_id ?? "unknown";
      const name = ticket.ticket_items?.name ?? "Unknown item";
      if (!byItem.has(itemId)) {
        byItem.set(itemId, {
          itemId,
          name,
          imageUrl: ticket.ticket_items?.image_url ?? null,
          playerIds: [],
        });
      }
      if (ticket.player_id) {
        byItem.get(itemId)!.playerIds.push(ticket.player_id);
      }
    }
    return Array.from(byItem.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tickets]);

  function copyIds(group: ItemGroup) {
    navigator.clipboard.writeText(group.playerIds.join(", "));
    setCopiedItemId(group.itemId);
    setTimeout(() => setCopiedItemId(null), 1500);
  }

  async function sendToDiscord() {
    if (!confirm("Send every accepted ticket to Discord, grouped by item?")) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/tickets/notify-discord", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setSendResult({
        ok: true,
        message: `Sent ${data.tickets} ticket(s) across ${data.sent} message(s).`,
      });
    } catch (e) {
      setSendResult({
        ok: false,
        message: e instanceof Error ? e.message : "Something went wrong",
      });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-teal" size={26} />
      </div>
    );
  }

  if (groups.length === 0) {
    return <p className="mt-10 text-center text-muted">No accepted tickets waiting on fulfillment.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={sendToDiscord}
          disabled={sending}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-pink px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send to Discord
        </button>
        {sendResult && (
          <p className={`text-sm ${sendResult.ok ? "text-success" : "text-danger"}`}>{sendResult.message}</p>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.itemId} className="panel p-5">
          <div className="flex items-center gap-3">
            {group.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-background-elevated" />
            )}
            <div>
              <p className="text-sm font-bold uppercase tracking-wide">{group.name}</p>
              <p className="text-xs text-muted">{group.playerIds.length} players</p>
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-muted">Player ID(s)</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-panel-border bg-background-elevated px-4 py-3 font-mono text-sm text-foreground/90">
              {group.playerIds.length > 0 ? group.playerIds.join(", ") : "—"}
            </div>
            <button
              onClick={() => copyIds(group)}
              disabled={group.playerIds.length === 0}
              className="flex items-center gap-2 rounded-lg border border-teal-dim px-3 py-2 text-xs font-semibold text-teal hover:bg-teal/10 disabled:opacity-40"
            >
              {copiedItemId === group.itemId ? <Check size={14} /> : <Copy size={14} />}
              {copiedItemId === group.itemId ? "Copied" : "Copy IDs"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
