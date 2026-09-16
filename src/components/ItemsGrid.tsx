"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Loader2,
  PackageOpen,
  Box,
  Image as ImageIcon,
  RotateCcw,
  Maximize,
  Minimize,
  Sun,
} from "lucide-react";
import type { StoreItemRow } from "@/lib/db.types";
import type { LightRotation } from "@/components/Model3D";

const Model3D = dynamic(() => import("@/components/Model3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="animate-spin text-teal" size={26} />
    </div>
  ),
});

const PREFS_KEY = "mml3dViewerPrefs";
const AXES = ["x", "y", "z"] as const;
const AXIS_COLOR: Record<(typeof AXES)[number], string> = {
  x: "text-danger",
  y: "text-success",
  z: "text-teal",
};

export default function ItemsGrid() {
  const [items, setItems] = useState<StoreItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"photo" | "3d">("photo");
  const [brightness, setBrightness] = useState(1);
  const [lightRotation, setLightRotation] = useState<LightRotation>({ x: 0, y: 0, z: 0 });
  const [resetToken, setResetToken] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Lighting is a viewer-wide preference, not per-item — load whatever was
  // last saved (if anything) once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.brightness === "number") setBrightness(saved.brightness);
      if (saved.lightRotation) setLightRotation(saved.lightRotation);
    } catch {
      // localStorage may be unavailable (private browsing, etc.) — fine,
      // just fall back to defaults.
    }
  }, []);

  function saveAsDefault() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ brightness, lightRotation }));
    } catch {
      // ignore — purely a convenience, not worth surfacing an error for
    }
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === viewerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      viewerRef.current?.requestFullscreen();
    }
  }

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
    // Jump straight into 3D for items that have a model — no extra click
    // needed. Brightness/lighting stay as-is across items (a viewer
    // preference, not per-item state).
    setMode(has3D ? "3d" : "photo");
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
        <div
          ref={viewerRef}
          className={`relative w-full overflow-hidden bg-background-elevated ${
            isFullscreen
              ? "flex h-full items-center justify-center rounded-none"
              : "aspect-square rounded-lg sm:aspect-video"
          }`}
        >
          {selected &&
            (mode === "3d" && has3D ? (
              <Model3D
                modelUrl={selected.model_url!}
                modelType={selected.model_type!}
                colorMapUrl={selected.color_map_url}
                normalMapUrl={selected.normal_map_url}
                metallicMapUrl={selected.metallic_map_url}
                brightness={brightness}
                lightRotation={lightRotation}
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

          {mode === "3d" && has3D && (
            <div className="absolute left-3 top-3 flex w-60 flex-col gap-2.5 rounded-xl border border-panel-border bg-background/90 p-3 text-xs backdrop-blur">
              <div className="flex items-center gap-2">
                <Sun size={13} className="shrink-0 text-warning" />
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.05}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="h-1.5 flex-1 accent-teal"
                />
              </div>
              {AXES.map((axis) => (
                <div key={axis} className="flex items-center gap-2">
                  <span className={`w-3 font-semibold ${AXIS_COLOR[axis]}`}>{axis.toUpperCase()}</span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={lightRotation[axis]}
                    onChange={(e) =>
                      setLightRotation((r) => ({ ...r, [axis]: Number(e.target.value) }))
                    }
                    className="h-1.5 flex-1 accent-teal"
                  />
                  <span className="w-8 text-right text-muted">{lightRotation[axis]}&deg;</span>
                </div>
              ))}
              <button
                onClick={saveAsDefault}
                className="self-start text-teal hover:underline"
              >
                Save as default
              </button>
            </div>
          )}

          <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
            {has3D && (
              <button
                onClick={() => setMode((m) => (m === "3d" ? "photo" : "3d"))}
                className="flex items-center gap-1.5 rounded-full border border-panel-border bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground/90 backdrop-blur hover:border-teal-dim hover:text-teal"
              >
                {mode === "3d" ? <ImageIcon size={13} /> : <Box size={13} />}
                {mode === "3d" ? "Photo" : "3D view"}
              </button>
            )}
            {has3D && mode === "3d" && (
              <button
                onClick={() => setResetToken((t) => t + 1)}
                className="flex items-center justify-center rounded-full border border-panel-border bg-background/90 p-1.5 text-foreground/90 backdrop-blur hover:border-teal-dim hover:text-teal"
                aria-label="Reset view"
              >
                <RotateCcw size={13} />
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center rounded-full border border-panel-border bg-background/90 p-1.5 text-foreground/90 backdrop-blur hover:border-teal-dim hover:text-teal"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
            </button>
          </div>
        </div>

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
