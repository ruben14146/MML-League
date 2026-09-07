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
  Ban,
  Pencil,
  AlertTriangle,
  Search,
  X,
} from "lucide-react";
import type { TicketRow, TicketStatus } from "@/lib/db.types";

type TicketWithItem = TicketRow & {
  ticket_items: { name: string; image_url: string | null } | null;
  link_reuse_count: number;
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
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [tickets, setTickets] = useState<TicketWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState<TicketStatus | null>(null);
  const [banning, setBanning] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ status: filter });
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/tickets?${params}`);
    const data = await res.json();
    setTickets(data.tickets ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount/filter-change
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  // Debounce the search box so we're not firing a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  async function updateStatus(code: string, status: TicketStatus, adminNote?: string) {
    setUpdating(code);
    await fetch(`/api/tickets/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminNote === undefined ? { status } : { status, admin_note: adminNote }),
    });
    await load();
    setUpdating(null);
  }

  function reject(code: string) {
    const reason = prompt("Rejection reason (shown to the user on their status page):");
    if (reason === null) return; // cancelled
    updateStatus(code, "rejected", reason.trim());
  }

  function editReason(code: string, currentNote: string | null) {
    const reason = prompt("Reason shown to the user on their status page:", currentNote ?? "");
    if (reason === null) return; // cancelled
    updateStatus(code, "rejected", reason.trim());
  }

  async function banUser(discordId: string, discordUsername: string) {
    if (!confirm(`Ban ${discordUsername} (${discordId})? They won't be able to sign in or submit tickets.`)) {
      return;
    }
    setBanning(discordId);
    try {
      const res = await fetch("/api/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discord_id: discordId, discord_username: discordUsername }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error ?? "Something went wrong");
    } finally {
      setBanning(null);
    }
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
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by ticket code, Discord username/ID, or player ID..."
          className="w-full rounded-lg border border-panel-border bg-background-elevated py-2.5 pl-9 pr-9 text-sm outline-none focus:border-teal"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-teal"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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
                    {ticket.player_id && (
                      <>
                        {" "}
                        &middot; Player ID: <span className="font-mono text-foreground">{ticket.player_id}</span>
                      </>
                    )}
                  </p>
                  <a
                    href={ticket.discord_message_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-teal-dim hover:text-teal"
                  >
                    Message link <ExternalLink size={11} />
                  </a>
                  {ticket.link_reuse_count > 1 && (
                    <span className="mt-1 ml-3 inline-flex items-center gap-1 text-xs text-danger">
                      <AlertTriangle size={11} />
                      Link used {ticket.link_reuse_count}x — possible scam
                    </span>
                  )}
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
                  {ticket.status === "rejected" && ticket.admin_note && (
                    <p className="mt-1 text-xs text-danger">Reason: {ticket.admin_note}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col items-start gap-0.5">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[ticket.status]}`}
                  >
                    {STATUS_LABEL[ticket.status]}
                  </span>
                  {ticket.handled_by && (
                    <span className="text-[10px] text-muted">by {ticket.handled_by}</span>
                  )}
                </div>
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
                      onClick={() => reject(ticket.ticket_code)}
                      disabled={ticket.status === "rejected"}
                      className="rounded-lg p-2 text-danger hover:bg-danger/10 disabled:opacity-30"
                      aria-label="Reject"
                    >
                      <XCircle size={18} />
                    </button>
                    {ticket.status === "rejected" && (
                      <button
                        onClick={() => editReason(ticket.ticket_code, ticket.admin_note)}
                        className="rounded-lg p-2 text-muted hover:bg-panel hover:text-teal"
                        aria-label="Edit rejection reason"
                      >
                        <Pencil size={18} />
                      </button>
                    )}
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
                    {ticket.discord_id && (
                      <button
                        onClick={() => banUser(ticket.discord_id!, ticket.discord_username)}
                        disabled={banning === ticket.discord_id}
                        className="rounded-lg p-2 text-danger hover:bg-danger/10 disabled:opacity-30"
                        aria-label="Ban user"
                      >
                        {banning === ticket.discord_id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Ban size={18} />
                        )}
                      </button>
                    )}
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
