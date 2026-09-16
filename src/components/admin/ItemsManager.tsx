"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Upload, Pencil, Check, X, Box, Eraser } from "lucide-react";
import type { StoreItemRow, TicketItemRow } from "@/lib/db.types";
import { uploadImageDirect, uploadModelDirect } from "@/lib/uploadClient";

type Kind = "ticket" | "store";
type AnyItem = TicketItemRow | StoreItemRow;

function endpoint(kind: Kind) {
  return kind === "ticket" ? "/api/ticket-items" : "/api/store-items";
}

// Inline panel for attaching the 3D showcase assets (model + 3 texture
// maps) to an existing store item. Only shown for store items — ticket
// items don't get a 3D viewer.
function Store3DPanel({ item, onSaved }: { item: StoreItemRow; onSaved: () => void }) {
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [colorFile, setColorFile] = useState<File | null>(null);
  const [normalFile, setNormalFile] = useState<File | null>(null);
  const [metallicFile, setMetallicFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!modelFile && !colorFile && !normalFile && !metallicFile) return;
    setSaving(true);
    setError(null);
    try {
      const update: Record<string, unknown> = {};
      if (modelFile) {
        setProgress("Uploading model...");
        const { url, modelType } = await uploadModelDirect(modelFile);
        update.model_url = url;
        update.model_type = modelType;
      }
      if (colorFile) {
        setProgress("Uploading color/UV map...");
        update.color_map_url = await uploadImageDirect(colorFile);
      }
      if (normalFile) {
        setProgress("Uploading normal map...");
        update.normal_map_url = await uploadImageDirect(normalFile);
      }
      if (metallicFile) {
        setProgress("Uploading metallic map...");
        update.metallic_map_url = await uploadImageDirect(metallicFile);
      }

      setProgress("Saving...");
      const res = await fetch(`/api/store-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setModelFile(null);
      setColorFile(null);
      setNormalFile(null);
      setMetallicFile(null);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  async function clear3D() {
    if (!confirm("Remove the 3D showcase from this item? The photo stays.")) return;
    setSaving(true);
    try {
      await fetch(`/api/store-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_url: null,
          model_type: null,
          color_map_url: null,
          normal_map_url: null,
          metallic_map_url: null,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const fileRow = (
    label: string,
    file: File | null,
    setFile: (f: File | null) => void,
    accept: string,
    currentUrl: string | null
  ) => (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted">{label}</span>
      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-panel-border px-2.5 py-1.5 text-muted hover:text-teal">
        <Upload size={12} />
        {file ? file.name.slice(0, 14) : currentUrl ? "Replace" : "Upload"}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-panel-border bg-background-elevated p-3">
      {fileRow("Model (.obj/.fbx)", modelFile, setModelFile, ".obj,.fbx", item.model_url)}
      {fileRow("Color / UV map", colorFile, setColorFile, "image/*", item.color_map_url)}
      {fileRow("Normal map", normalFile, setNormalFile, "image/*", item.normal_map_url)}
      {fileRow("Metallic map", metallicFile, setMetallicFile, "image/*", item.metallic_map_url)}

      {error && <p className="text-xs text-danger">{error}</p>}
      {progress && <p className="text-xs text-teal">{progress}</p>}

      <div className="mt-1 flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving || (!modelFile && !colorFile && !normalFile && !metallicFile)}
          className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-teal to-pink px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-40"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Save
        </button>
        {item.model_url && (
          <button
            onClick={clear3D}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-40"
          >
            <Eraser size={12} />
            Remove 3D
          </button>
        )}
      </div>
    </div>
  );
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
  const [open3DId, setOpen3DId] = useState<string | null>(null);

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

  async function addItem() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let image_url: string | null = null;
      if (file) image_url = await uploadImageDirect(file);
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
      {kind === "store" && (
        <p className="mt-2 text-xs text-muted">
          Add the photo above first, then use the 3D button on an item below to attach a
          model and texture maps for the 3D showcase viewer.
        </p>
      )}

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
                    {kind === "store" && (
                      <button
                        onClick={() => setOpen3DId(open3DId === item.id ? null : item.id)}
                        className={`${
                          "model_url" in item && item.model_url ? "text-teal" : "text-muted"
                        } hover:text-teal`}
                        aria-label="3D showcase assets"
                      >
                        <Box size={13} />
                      </button>
                    )}
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
              {kind === "store" && open3DId === item.id && (
                <Store3DPanel item={item as StoreItemRow} onSaved={load} />
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
