"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Monitor,
  PackageCheck,
} from "lucide-react";
import type { TicketRow, TicketStatus } from "@/lib/db.types";

type TicketWithItem = TicketRow & {
  ticket_items: { name: string; image_url: string | null } | null;
};

const FILTERS: (TicketStatus | "all")[] = [
  "all",
  "pending",
  "accepted",
  "rejected",
  "sent_on_dash",
  "sent_to_lockers",
];

const STATUS_LABEL: Record<TicketStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  sent_on_dash: "Sent on dash",
  sent_to_lockers: "Sent to lockers",
};

const STATUS_STYLE: Record<TicketStatus, string> = {
  pending: "text-warning border-warning/40 bg-warning/10",
  accepted: "text-success border-success/40 bg-success/10",
  rejected: "text-danger border-danger/40 bg-danger/10",
  sent_on_dash: "text-teal border-teal-dim bg-teal/10",
  sent_to_lockers: "text-pink border-pink/40 bg-pink/10",
};

export default function TicketsTable() {
  const [filter, setFilter] = useState<TicketStatus | "all">("pending");
  const [tickets, setTickets] = useState<TicketWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState<TicketStatus | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/tickets?status=${filter}`);
    const data = await res.json();
    setTickets(data.tickets ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount/filter-change
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function updateStatus(code: string, status: TicketStatus) {
    setUpdating(code);
    await fetch(`/api/tickets/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setUpdating(null);
  }

  async function bulkUpdate(target: "sent_on_dash" | "sent_to_lockers") {
    const fromLabel = target === "sent_on_dash" ? "accepted" : "sent on dash";
    if (!confirm(`Move every "${fromLabel}" ticket to "${STATUS_LABEL[target]}"?`)) return;

    setBulkRunning(target);
    try {
      const res = await fetch("/api/tickets/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (res.ok) await load();
      else alert(data.error ?? "Something went wrong");
    } finally {
      setBulkRunning(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-panel text-teal border border-teal-dim"
                : "border border-panel-border text-muted hover:text-teal"
            }`}
          >
            {f === "all" ? "all" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => bulkUpdate("sent_on_dash")}
          disabled={bulkRunning !== null}
          className="flex items-center gap-2 rounded-lg border border-teal-dim px-4 py-2 text-sm font-medium text-teal hover:bg-teal/10 disabled:opacity-40"
        >
          {bulkRunning === "sent_on_dash" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Monitor size={16} />
          )}
          Bulk: accepted &rarr; sent on dash
        </button>
        <button
          onClick={() => bulkUpdate("sent_to_lockers")}
          disabled={bulkRunning !== null}
          className="flex items-center gap-2 rounded-lg border border-pink/40 px-4 py-2 text-sm font-medium text-pink hover:bg-pink/10 disabled:opacity-40"
        >
          {bulkRunning === "sent_to_lockers" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <PackageCheck size={16} />
          )}
          Bulk: sent on dash &rarr; sent to lockers
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-teal" size={26} />
        </div>
      ) : tickets.length === 0 ? (
        <p className="mt-10 text-center text-muted">No tickets in this view.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
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
                  <p className="text-sm font-medium">{ticket.discord_username}</p>
                  <p className="text-xs text-muted">
                    {ticket.ticket_items?.name ?? "Unknown item"} &middot;{" "}
                    {ticket.location === "outside"
                      ? `Outside MML (${ticket.league_name})`
                      : "Inside MML"}
                  </p>
                  <a
                    href={ticket.discord_message_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-teal-dim hover:text-teal"
                  >
                    Message link <ExternalLink size={11} />
                  </a>
                  {ticket.server_link && (
                    <a
                      href={ticket.server_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 ml-3 inline-flex items-center gap-1 text-xs text-teal-dim hover:text-teal"
                    >
                      Server link <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[ticket.status]}`}
                >
                  {STATUS_LABEL[ticket.status]}
                </span>
                {updating === ticket.ticket_code ? (
                  <Loader2 className="animate-spin text-teal" size={18} />
                ) : (
                  <>
                    <button
                      onClick={() => updateStatus(ticket.ticket_code, "accepted")}
                      disabled={ticket.status === "accepted"}
                      className="rounded-lg p-2 text-success hover:bg-success/10 disabled:opacity-30"
                      aria-label="Accept"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <button
                      onClick={() => updateStatus(ticket.ticket_code, "rejected")}
                      disabled={ticket.status === "rejected"}
                      className="rounded-lg p-2 text-danger hover:bg-danger/10 disabled:opacity-30"
                      aria-label="Reject"
                    >
                      <XCircle size={18} />
                    </button>
                    <button
                      onClick={() => updateStatus(ticket.ticket_code, "pending")}
                      disabled={ticket.status === "pending"}
                      className="rounded-lg p-2 text-warning hover:bg-warning/10 disabled:opacity-30"
                      aria-label="Mark pending"
                    >
                      <Clock size={18} />
                    </button>
                    <button
                      onClick={() => updateStatus(ticket.ticket_code, "sent_on_dash")}
                      disabled={ticket.status === "sent_on_dash"}
                      className="rounded-lg p-2 text-teal hover:bg-teal/10 disabled:opacity-30"
                      aria-label="Mark sent on dash"
                    >
                      <Monitor size={18} />
                    </button>
                    <button
                      onClick={() => updateStatus(ticket.ticket_code, "sent_to_lockers")}
                      disabled={ticket.status === "sent_to_lockers"}
                      className="rounded-lg p-2 text-pink hover:bg-pink/10 disabled:opacity-30"
                      aria-label="Mark sent to lockers"
                    >
                      <PackageCheck size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
