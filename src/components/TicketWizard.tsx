"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn, useSession } from "next-auth/react";
import { CheckCircle2, Copy, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import type { TicketItemRow, TicketLocation } from "@/lib/db.types";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

export default function TicketWizard() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<Step>(0);
  const [items, setItems] = useState<TicketItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  const [itemId, setItemId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [messageLink, setMessageLink] = useState("");
  const [location, setLocation] = useState<TicketLocation | "">("");
  const [leagueName, setLeagueName] = useState("");
  const [serverLink, setServerLink] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/ticket-items")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setItemsLoading(false));
  }, []);

  const maxStep: Step = location === "outside" ? 5 : 4;

  function next() {
    setError(null);
    setStep((s) => (Math.min(s + 1, maxStep) as Step));
  }
  function back() {
    setError(null);
    setStep((s) => (Math.max(s - 1, 0) as Step));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: itemId,
          player_id: playerId,
          discord_message_link: messageLink,
          location,
          league_name: leagueName,
          server_link: serverLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setTicketCode(data.ticket.ticket_code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-teal" size={28} />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="panel mx-auto mt-12 max-w-md p-8 text-center">
        <h2 className="text-xl font-semibold">Sign in required</h2>
        <p className="mt-2 text-sm text-muted">
          Sign in with Discord to open a ticket. We&apos;ll use your Discord
          username to identify your submission.
        </p>
        <button
          onClick={() => signIn("discord")}
          className="mt-6 rounded-lg bg-gradient-to-r from-teal to-pink px-5 py-2.5 font-semibold text-background"
        >
          Sign in with Discord
        </button>
      </div>
    );
  }

  if (ticketCode) {
    return (
      <div className="panel mx-auto mt-12 max-w-md p-8 text-center">
        <CheckCircle2 className="mx-auto text-success" size={40} />
        <h2 className="mt-4 text-xl font-semibold">Ticket submitted</h2>
        <p className="mt-1 text-sm text-muted">
          Save this ID — you&apos;ll need it to check your status.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="rounded-lg border border-panel-border bg-background-elevated px-4 py-2 font-mono text-lg tracking-wider text-teal">
            {ticketCode}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(ticketCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-lg border border-panel-border p-2.5 text-muted hover:text-teal"
            aria-label="Copy ticket ID"
          >
            <Copy size={16} />
          </button>
        </div>
        {copied && <p className="mt-2 text-xs text-teal">Copied!</p>}
      </div>
    );
  }

  const progress = ((step + 1) / (maxStep + 1)) * 100;

  return (
    <div className="mx-auto mt-10 max-w-xl px-5">
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-panel">
        <motion.div
          className="h-full bg-gradient-to-r from-teal to-pink"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>

      <div className="panel min-h-[320px] p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div>
                <h2 className="text-lg font-semibold">Pick an item</h2>
                <p className="mt-1 text-sm text-muted">Which item is this ticket for?</p>
                {itemsLoading ? (
                  <div className="mt-6 flex justify-center">
                    <Loader2 className="animate-spin text-teal" size={24} />
                  </div>
                ) : items.length === 0 ? (
                  <p className="mt-6 text-sm text-muted">No items have been added yet.</p>
                ) : (
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setItemId(item.id)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                          itemId === item.id
                            ? "border-teal bg-background-elevated"
                            : "border-panel-border hover:border-teal-dim"
                        }`}
                      >
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-background-elevated" />
                        )}
                        <span className="text-xs font-medium">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-lg font-semibold">Your VRFS Player ID</h2>
                <p className="mt-1 text-sm text-muted">
                  So we know exactly who to send this item to in-game.
                </p>
                <input
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  placeholder="e.g. 217174"
                  inputMode="numeric"
                  className="mt-6 w-full rounded-lg border border-panel-border bg-background-elevated px-4 py-3 text-sm outline-none focus:border-teal"
                />
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-lg font-semibold">Your Discord</h2>
                <p className="mt-1 text-sm text-muted">
                  Auto-filled from your Discord sign-in.
                </p>
                <div className="mt-6 rounded-lg border border-panel-border bg-background-elevated px-4 py-3 font-mono text-teal">
                  {session?.user?.discordUsername}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-lg font-semibold">Discord message link</h2>
                <p className="mt-1 text-sm text-muted">
                  Paste the link to the Discord message proving this event.
                </p>
                <input
                  value={messageLink}
                  onChange={(e) => setMessageLink(e.target.value)}
                  placeholder="https://discord.com/channels/.../.../..."
                  className="mt-6 w-full rounded-lg border border-panel-border bg-background-elevated px-4 py-3 text-sm outline-none focus:border-teal"
                />
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-lg font-semibold">Where was this hosted?</h2>
                <p className="mt-1 text-sm text-muted">
                  Was this event hosted inside or outside MML?
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {(["inside", "outside"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setLocation(opt)}
                      className={`rounded-xl border px-4 py-4 font-medium capitalize transition-colors ${
                        location === opt
                          ? "border-teal bg-background-elevated text-teal"
                          : "border-panel-border hover:border-teal-dim"
                      }`}
                    >
                      {opt} MML
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 5 && location === "outside" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Outside league details</h2>
                  <p className="mt-1 text-sm text-muted">
                    What league was this event hosted in?
                  </p>
                </div>
                <input
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="League name"
                  className="w-full rounded-lg border border-panel-border bg-background-elevated px-4 py-3 text-sm outline-none focus:border-teal"
                />
                <div>
                  <p className="text-sm text-muted">
                    Put the server link this event was hosted in.
                  </p>
                </div>
                <input
                  value={serverLink}
                  onChange={(e) => setServerLink(e.target.value)}
                  placeholder="https://discord.gg/..."
                  className="w-full rounded-lg border border-panel-border bg-background-elevated px-4 py-3 text-sm outline-none focus:border-teal"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-muted disabled:opacity-30"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {step < maxStep ? (
            <button
              onClick={next}
              disabled={
                (step === 0 && !itemId) ||
                (step === 1 && !playerId.trim()) ||
                (step === 3 && !messageLink.trim()) ||
                (step === 4 && !location)
              }
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-teal to-pink px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={
                submitting ||
                (location === "outside" && (!leagueName.trim() || !serverLink.trim()))
              }
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-pink px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Submit ticket
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
