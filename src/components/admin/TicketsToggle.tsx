"use client";

import { useEffect, useState } from "react";
import { Loader2, Ticket, TicketX } from "lucide-react";

export default function TicketsToggle() {
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showReasonPrompt, setShowReasonPrompt] = useState(false);

  useEffect(() => {
    fetch("/api/settings/tickets")
      .then((r) => r.json())
      .then((d) => {
        setEnabled(d.enabled ?? true);
        setReason(d.reason ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(nextEnabled: boolean, nextReason: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled, reason: nextReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnabled(data.enabled);
        setReason(data.reason ?? "");
        setShowReasonPrompt(false);
      } else {
        alert(data.error ?? "Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  }

  function toggle() {
    if (enabled) {
      // Turning off — ask for a reason first.
      setShowReasonPrompt(true);
    } else {
      save(true, "");
    }
  }

  if (loading) {
    return (
      <div className="panel flex items-center justify-center p-5">
        <Loader2 className="animate-spin text-teal" size={20} />
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {enabled ? (
            <Ticket className="text-success" size={22} />
          ) : (
            <TicketX className="text-danger" size={22} />
          )}
          <div>
            <p className="font-semibold">Tickets are {enabled ? "open" : "closed"}</p>
            {!enabled && reason && <p className="text-xs text-muted">Reason: {reason}</p>}
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40 ${
            enabled
              ? "border border-danger/40 text-danger hover:bg-danger/10"
              : "bg-gradient-to-r from-teal to-pink text-background"
          }`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : enabled ? "Turn off" : "Turn on"}
        </button>
      </div>

      {showReasonPrompt && (
        <div className="mt-4 flex flex-col gap-2 border-t border-panel-border pt-4">
          <label className="text-xs text-muted">
            Reason shown to users when they try to open a ticket (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Closed for the weekend, back Monday"
            className="w-full rounded-lg border border-panel-border bg-background-elevated px-3 py-2 text-sm outline-none focus:border-teal"
          />
          <div className="flex gap-2">
            <button
              onClick={() => save(false, reason)}
              disabled={saving}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
            >
              Confirm turn off
            </button>
            <button
              onClick={() => setShowReasonPrompt(false)}
              className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
