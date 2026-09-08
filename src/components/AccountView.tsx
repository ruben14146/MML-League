"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Monitor,
  PackageCheck,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import type { TicketRow, TicketStatus } from "@/lib/db.types";
import BoosterBadge from "@/components/BoosterBadge";
import TicketChat from "@/components/TicketChat";

type Me = { discordUsername: string | null; image: string | null; isBooster: boolean };
type TicketWithItem = TicketRow & { ticket_items: { name: string; image_url: string | null } | null };

const STATUS_META: Record<TicketStatus, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-warning", label: "Pending" },
  accepted: { icon: CheckCircle2, color: "text-success", label: "Accepted" },
  rejected: { icon: XCircle, color: "text-danger", label: "Rejected" },
  sent_on_dash: { icon: Monitor, color: "text-teal", label: "Sent on dash" },
  sent_to_lockers: { icon: PackageCheck, color: "text-pink", label: "Sent to lockers" },
};

export default function AccountView() {
  const [me, setMe] = useState<Me | null>(null);
  const [tickets, setTickets] = useState<TicketWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    Promise.all([
      fetch("/api/account/me").then((r) => r.json()),
      fetch("/api/account/tickets").then((r) => r.json()),
    ]).then(([meData, ticketsData]) => {
      setMe(meData);
      setTickets(ticketsData.tickets ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-teal" size={26} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="panel flex items-center gap-4 p-5">
        {me?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.image} alt="" className="h-14 w-14 rounded-full" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-background-elevated" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{me?.discordUsername ?? "Unknown"}</p>
            {me?.isBooster && <BoosterBadge size="md" />}
          </div>
          <p className="text-xs text-muted">{tickets.length} ticket(s) submitted</p>
        </div>
      </div>

      {tickets.length === 0 ? (
        <p className="mt-4 text-center text-muted">You haven't submitted any tickets yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => {
            const meta = STATUS_META[ticket.status];
            const StatusIcon = meta.icon;
            const chatOpen = openChat === ticket.ticket_code;
            return (
              <div key={ticket.id} className="panel flex flex-col gap-3 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {ticket.ticket_items?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ticket.ticket_items.image_url}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-background-elevated" />
                    )}
                    <div>
                      <p className="font-mono text-sm text-teal">{ticket.ticket_code}</p>
                      <p className="text-sm font-medium">{ticket.ticket_items?.name ?? "Unknown item"}</p>
                      <a
                        href={ticket.discord_message_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-teal-dim hover:text-teal"
                      >
                        Message link <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${meta.color}`}>
                      <StatusIcon size={16} />
                      {meta.label}
                    </span>
                    <button
                      onClick={() => setOpenChat(chatOpen ? null : ticket.ticket_code)}
                      className="flex items-center gap-1.5 rounded-lg border border-panel-border px-3 py-1.5 text-xs font-medium text-muted hover:border-teal-dim hover:text-teal"
                    >
                      <MessageCircle size={14} />
                      {chatOpen ? "Hide chat" : "Chat"}
                    </button>
                  </div>
                </div>
                {ticket.status === "rejected" && ticket.admin_note && (
                  <p className="text-xs text-danger">Rejection reason: {ticket.admin_note}</p>
                )}
                {chatOpen && <TicketChat ticketCode={ticket.ticket_code} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
