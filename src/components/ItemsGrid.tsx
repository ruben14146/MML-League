"use client";

import { useEffect, useState } from "react";
import { Loader2, PackageOpen } from "lucide-react";
import type { StoreItemRow } from "@/lib/db.types";

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
        <div key={item.id} className="panel flex flex-col gap-3 p-4">
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
          <div>
            <p className="font-semibold">{item.name}</p>
            {item.description && (
              <p className="mt-1 text-xs text-muted">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
