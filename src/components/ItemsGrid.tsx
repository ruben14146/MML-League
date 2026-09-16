"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, PackageOpen, Box, Image as ImageIcon, RotateCcw } from "lucide-react";
import type { StoreItemRow } from "@/lib/db.types";

const Model3D = dynamic(() => import("@/components/Model3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="animate-spin text-teal" size={26} />
    </div>
  ),
});

export default function ItemsGrid() {
  const [items, setItems] = useState<StoreItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"photo" | "3d">("photo");
  const [brightness, setBrightness] = useState(1);
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    fetch("/api/store-items")
      .then((r) => r.json())
      .then((d) => {
        const list: StoreItemRow[] = d.items ?? [];
        setItems(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const has3D = !!(selected?.model_url && selected?.model_type);

  useEffect(() => {
    // Switching items always starts back on the photo, at neutral brightness.
    setMode("photo");
    setBrightness(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-teal" size={28} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 text-center text-muted">
        <PackageOpen size={32} />
        <p>No items have been added yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-6 px-5 lg:flex-row">
      <div className="panel flex flex-1 flex-col gap-4 p-5 lg:order-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-background-elevated sm:aspect-video">
          {selected &&
            (mode === "3d" && has3D ? (
              <Model3D
                modelUrl={selected.model_url!}
                modelType={selected.model_type!}
                colorMapUrl={selected.color_map_url}
                normalMapUrl={selected.normal_map_url}
                metallicMapUrl={selected.metallic_map_url}
                brightness={brightness}
                resetToken={resetToken}
                className="h-full w-full"
              />
            ) : selected.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.image_url}
                alt={selected.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="h-full w-full" />
            ))}

          {has3D && (
            <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
              <button
                onClick={() => setMode((m) => (m === "3d" ? "photo" : "3d"))}
                className="flex items-center gap-1.5 rounded-full border border-panel-border bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground/90 backdrop-blur hover:border-teal-dim hover:text-teal"
              >
                {mode === "3d" ? <ImageIcon size={13} /> : <Box size={13} />}
                {mode === "3d" ? "Photo" : "3D view"}
              </button>
              {mode === "3d" && (
                <button
                  onClick={() => setResetToken((t) => t + 1)}
                  className="flex items-center justify-center rounded-full border border-panel-border bg-background/90 p-1.5 text-foreground/90 backdrop-blur hover:border-teal-dim hover:text-teal"
                  aria-label="Reset view"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {mode === "3d" && has3D && (
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>Dim</span>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.05}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="h-1.5 flex-1 accent-teal"
            />
            <span>Bright</span>
          </div>
        )}

        {selected && (
          <div>
            <p className="text-lg font-semibold">{selected.name}</p>
            {selected.description && (
              <p className="mt-1 text-sm text-muted">{selected.description}</p>
            )}
            {has3D && mode === "3d" && (
              <p className="mt-2 text-xs text-muted">Drag to rotate, scroll to zoom.</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:order-1 lg:w-64 lg:shrink-0 lg:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            className={`flex flex-col gap-2 rounded-lg border p-2 text-left transition-colors ${
              selectedId === item.id
                ? "border-teal bg-background-elevated"
                : "border-panel-border hover:border-teal-dim"
            }`}
          >
            <div className="aspect-square w-full overflow-hidden rounded-md bg-background-elevated">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <p className="truncate text-xs font-medium">{item.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
