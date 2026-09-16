"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, PackageOpen, Box, Image as ImageIcon } from "lucide-react";
import type { StoreItemRow } from "@/lib/db.types";

const Model3D = dynamic(() => import("@/components/Model3D"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-background-elevated">
      <Loader2 className="animate-spin text-teal" size={22} />
    </div>
  ),
});

function ItemCard({ item }: { item: StoreItemRow }) {
  const has3D = !!(item.model_url && item.model_type);
  const [show3D, setShow3D] = useState(has3D);

  return (
    <div className="panel flex flex-col gap-3 p-4">
      <div className="relative aspect-square w-full">
        {show3D && has3D ? (
          <Model3D
            modelUrl={item.model_url!}
            modelType={item.model_type!}
            colorMapUrl={item.color_map_url}
            normalMapUrl={item.normal_map_url}
            metallicMapUrl={item.metallic_map_url}
            className="h-full w-full"
          />
        ) : item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <div className="h-full w-full rounded-lg bg-background-elevated" />
        )}

        {has3D && item.image_url && (
          <button
            onClick={() => setShow3D((v) => !v)}
            className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-panel-border bg-background/90 px-2.5 py-1 text-[10px] font-medium text-foreground/90 backdrop-blur hover:border-teal-dim hover:text-teal"
          >
            {show3D ? <ImageIcon size={12} /> : <Box size={12} />}
            {show3D ? "Photo" : "3D view"}
          </button>
        )}
      </div>
      <div>
        <p className="font-semibold">{item.name}</p>
        {item.description && <p className="mt-1 text-xs text-muted">{item.description}</p>}
      </div>
    </div>
  );
}

export default function ItemsGrid() {
  const [items, setItems] = useState<StoreItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/store-items")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

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
    <div className="mx-auto mt-10 grid max-w-6xl grid-cols-2 gap-4 px-5 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
