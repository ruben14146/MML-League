"use client";

import { useState } from "react";
import { Loader2, Search, Clock, CheckCircle2, XCircle, Monitor, PackageCheck } from "lucide-react";
import type { TicketStatus } from "@/lib/db.types";

interface TicketStatusResult {
  ticket_code: string;
  status: TicketStatus;
  admin_note: string | null;
  created_at: string;
  ticket_items: { name: string; image_url: string | null } | null;
}

const STATUS_META: Record<TicketStatus, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-warning", label: "Pending review" },
  accepted: { icon: CheckCircle2, color: "text-success", label: "Accepted" },
  rejected: { icon: XCircle, color: "text-danger", label: "Rejected" },
  sent_on_dash: { icon: Monitor, color: "text-teal", label: "Sent on dash" },
  sent_to_lockers: { icon: PackageCheck, color: "text-pink", label: "Sent to lockers" },
};

export default function StatusChecker() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TicketStatusResult | null>(null);

  async function check() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ticket not found");
      setResult(data.ticket);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ticket not found");
    } finally {
      setLoading(false);
    }
  }

  const meta = result ? STATUS_META[result.status] : null;
  const StatusIcon = meta?.icon;

  return (
    <div className="mx-auto mt-10 max-w-md px-5">
      <div className="panel p-6">
        <label className="text-sm font-medium text-muted">Ticket ID</label>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && check()}
            placeholder="MML-XXXXXX"
            className="w-full rounded-lg border border-panel-border bg-background-elevated px-4 py-3 font-mono text-sm uppercase outline-none focus:border-teal"
          />
          <button
            onClick={check}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-pink px-4 py-3 text-sm font-semibold text-background disabled:opacity-40"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {result && meta && StatusIcon && (
          <div className="mt-6 rounded-xl border border-panel-border bg-background-elevated p-5">
            <div className="flex items-center gap-3">
              <StatusIcon className={meta.color} size={26} />
              <div>
                <p className={`font-semibold ${meta.color}`}>{meta.label}</p>
                <p className="text-xs text-muted">{result.ticket_code}</p>
              </div>
            </div>
            {result.ticket_items && (
              <p className="mt-3 text-sm text-muted">
                Item: <span className="text-foreground">{result.ticket_items.name}</span>
              </p>
            )}
            {result.admin_note && (
              <p className="mt-3 rounded-lg bg-panel p-3 text-sm text-foreground/90">
                Staff note: {result.admin_note}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
