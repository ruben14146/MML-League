"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Upload, Pencil, Check, X } from "lucide-react";
import type { StoreItemRow, TicketItemRow } from "@/lib/db.types";

type Kind = "ticket" | "store";
type AnyItem = TicketItemRow | StoreItemRow;

function endpoint(kind: Kind) {
  return kind === "ticket" ? "/api/ticket-items" : "/api/store-items";
}

function ItemsList({ kind, title }: { kind: Kind; title: string }) {
  const [items, setItems] = useState<AnyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(endpoint(kind));
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadFile(f: File) {
    const form = new FormData();
    form.append("file", f);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  async function addItem() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let image_url: string | null = null;
      if (file) image_url = await uploadFile(file);
      await fetch(endpoint(kind), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image_url, description: description || undefined }),
      });
      setName("");
      setDescription("");
      setFile(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(id: string) {
    await fetch(`${endpoint(kind)}/${id}`, { method: "DELETE" });
    await load();
  }

  async function saveEdit(id: string) {
    await fetch(`${endpoint(kind)}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    await load();
  }

  return (
    <div className="panel p-6">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs text-muted">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-panel-border bg-background-elevated px-3 py-2 text-sm outline-none focus:border-teal"
            placeholder="Item name"
          />
        </div>
        {kind === "store" && (
          <div className="flex-1">
            <label className="text-xs text-muted">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-panel-border bg-background-elevated px-3 py-2 text-sm outline-none focus:border-teal"
              placeholder="Optional"
            />
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-panel-border px-3 py-2 text-sm text-muted hover:text-teal">
          <Upload size={15} />
          {file ? file.name.slice(0, 16) : "Image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          onClick={addItem}
          disabled={saving || !name.trim()}
          className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-teal to-pink px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Add
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-teal" size={22} />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No items yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-panel-border p-3">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ) : (
                <div className="aspect-square w-full rounded-lg bg-background-elevated" />
              )}
              {editingId === item.id ? (
                <div className="mt-2 flex items-center gap-1">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded border border-panel-border bg-background-elevated px-2 py-1 text-xs outline-none focus:border-teal"
                  />
                  <button onClick={() => saveEdit(item.id)} className="text-success">
                    <Check size={15} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-muted">
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="truncate text-xs font-medium">{item.name}</span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditName(item.name);
                      }}
                      className="text-muted hover:text-teal"
                    >
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="text-muted hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItemsManager() {
  return (
    <div className="flex flex-col gap-8">
      <ItemsList kind="ticket" title="Ticket Items" />
      <ItemsList kind="store" title="Our Items" />
    </div>
  );
}
