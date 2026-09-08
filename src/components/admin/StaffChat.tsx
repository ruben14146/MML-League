"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { StaffMessageRow } from "@/lib/db.types";

export default function StaffChat() {
  const [messages, setMessages] = useState<StaffMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/staff/chat");
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
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/staff/chat", {
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-teal" size={26} />
      </div>
    );
  }

  return (
    <div className="panel flex flex-col gap-3 p-5">
      <div className="flex max-h-[60vh] min-h-[200px] flex-col gap-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No messages yet — say hi.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="max-w-[80%] self-start rounded-lg bg-background-elevated px-3 py-2 text-sm">
              <p className="mb-0.5 text-xs font-semibold text-teal">{m.sender_username}</p>
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
          placeholder="Message the staff team..."
          className="flex-1 rounded-lg border border-panel-border bg-background-elevated px-4 py-2.5 text-sm outline-none focus:border-teal"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-pink px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
