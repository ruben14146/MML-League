"use client";

import { useEffect, useState } from "react";
import { Loader2, Ban, Trash2 } from "lucide-react";
import type { BannedUserRow } from "@/lib/db.types";

export default function BansManager() {
  const [bans, setBans] = useState<BannedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [discordId, setDiscordId] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/bans");
    const data = await res.json();
    setBans(data.bans ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    load();
  }, []);

  async function addBan() {
    if (!discordId.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discord_id: discordId.trim(),
          discord_username: discordUsername.trim() || null,
          reason: reason.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setDiscordId("");
      setDiscordUsername("");
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function unban(targetDiscordId: string) {
    setRemoving(targetDiscordId);
    try {
      await fetch(`/api/bans/${targetDiscordId}`, { method: "DELETE" });
      await load();
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-teal" size={26} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="panel flex flex-col gap-3 p-5">
        <h2 className="text-sm font-semibold">Ban a Discord ID</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={discordId}
            onChange={(e) => setDiscordId(e.target.value)}
            placeholder="Discord user ID"
            className="rounded-lg border border-panel-border bg-background-elevated px-3 py-2 text-sm outline-none focus:border-teal"
          />
          <input
            value={discordUsername}
            onChange={(e) => setDiscordUsername(e.target.value)}
            placeholder="Discord username (optional)"
            className="rounded-lg border border-panel-border bg-background-elevated px-3 py-2 text-sm outline-none focus:border-teal"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="rounded-lg border border-panel-border bg-background-elevated px-3 py-2 text-sm outline-none focus:border-teal"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          onClick={addBan}
          disabled={submitting || !discordId.trim()}
          className="flex w-fit items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
          Ban
        </button>
      </div>

      {bans.length === 0 ? (
        <p className="text-center text-muted">No one is banned.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {bans.map((ban) => (
            <div
              key={ban.discord_id}
              className="panel flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-sm">{ban.discord_id}</p>
                <p className="text-xs text-muted">
                  {ban.discord_username ?? "Unknown username"}
                  {ban.reason && ` · ${ban.reason}`}
                </p>
              </div>
              {removing === ban.discord_id ? (
                <Loader2 className="animate-spin text-teal" size={18} />
              ) : (
                <button
                  onClick={() => unban(ban.discord_id)}
                  className="flex items-center gap-2 rounded-lg border border-panel-border px-3 py-1.5 text-xs font-medium text-muted hover:border-teal-dim hover:text-teal"
                >
                  <Trash2 size={14} />
                  Unban
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
