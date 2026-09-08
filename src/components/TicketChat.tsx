"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { TicketMessageRow } from "@/lib/db.types";

export default function TicketChat({ ticketCode }: { ticketCode: string }) {
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/tickets/${ticketCode}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, then poll
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketCode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketCode}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      if (res.ok) {
        setText("");
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-panel-border bg-background-elevated p-3">
      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-teal" size={18} />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                m.is_staff ? "self-start bg-panel text-foreground" : "self-end bg-teal/10 text-foreground"
              }`}
            >
              <p className={`mb-0.5 font-semibold ${m.is_staff ? "text-teal" : "text-pink"}`}>
                {m.sender_username}
                {m.is_staff ? " (staff)" : ""}
              </p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-panel-border bg-background px-3 py-2 text-xs outline-none focus:border-teal"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="rounded-lg bg-gradient-to-r from-teal to-pink px-3 py-2 text-background disabled:opacity-40"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}
