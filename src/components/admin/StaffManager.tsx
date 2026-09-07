"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, ShieldPlus } from "lucide-react";
import type { StaffRole, StaffRoleRow } from "@/lib/db.types";

type StaffEntry = StaffRoleRow & { bootstrap: boolean };

// Mirrors the server-side matrix in src/lib/roles.ts (kept separate since
// that file imports the server-only Supabase admin client).
const GRANTABLE: Record<StaffRole, StaffRole[]> = {
  developer: ["owner", "admin"],
  owner: ["admin"],
  admin: [],
};

const ROLE_STYLE: Record<StaffRole, string> = {
  developer: "text-pink border-pink/40 bg-pink/10",
  owner: "text-teal border-teal-dim bg-teal/10",
  admin: "text-warning border-warning/40 bg-warning/10",
};

export default function StaffManager() {
  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [viewerRole, setViewerRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [discordId, setDiscordId] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [role, setRole] = useState<StaffRole | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/staff");
    const data = await res.json();
    setStaff(data.staff ?? []);
    setViewerRole(data.viewerRole ?? null);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    load();
  }, []);

  const grantable = viewerRole ? GRANTABLE[viewerRole] : [];

  async function addStaff() {
    if (!discordId.trim() || !role) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discord_id: discordId.trim(),
          discord_username: discordUsername.trim() || null,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setDiscordId("");
      setDiscordUsername("");
      setRole("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(targetDiscordId: string) {
    setRemoving(targetDiscordId);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${targetDiscordId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
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
      {grantable.length > 0 && (
        <div className="panel flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold">Add staff</h2>
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
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="rounded-lg border border-panel-border bg-background-elevated px-3 py-2 text-sm outline-none focus:border-teal"
            >
              <option value="">Select role&hellip;</option>
              {grantable.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            onClick={addStaff}
            disabled={submitting || !discordId.trim() || !role}
            className="flex w-fit items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-pink px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldPlus size={16} />}
            Grant role
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {staff.map((entry) => {
          const canRevoke =
            !entry.bootstrap && viewerRole && GRANTABLE[viewerRole].includes(entry.role);
          return (
            <div
              key={entry.discord_id}
              className="panel flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-sm">{entry.discord_id}</p>
                <p className="text-xs text-muted">
                  {entry.discord_username ?? "Unknown username"}
                  {entry.bootstrap && " · root (from env)"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${ROLE_STYLE[entry.role]}`}
                >
                  {entry.role}
                </span>
                {canRevoke &&
                  (removing === entry.discord_id ? (
                    <Loader2 className="animate-spin text-teal" size={18} />
                  ) : (
                    <button
                      onClick={() => revoke(entry.discord_id)}
                      className="rounded-lg p-2 text-danger hover:bg-danger/10"
                      aria-label="Revoke"
                    >
                      <Trash2 size={16} />
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
