import Link from "next/link";
import { Clock, CheckCircle2, XCircle, Boxes } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";

async function getCounts() {
  try {
    const db = supabaseAdmin();
    const [pending, accepted, rejected, ticketItems, storeItems] = await Promise.all([
      db.from("tickets").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("tickets").select("id", { count: "exact", head: true }).eq("status", "accepted"),
      db.from("tickets").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      db.from("ticket_items").select("id", { count: "exact", head: true }),
      db.from("store_items").select("id", { count: "exact", head: true }),
    ]);
    return {
      pending: pending.count ?? 0,
      accepted: accepted.count ?? 0,
      rejected: rejected.count ?? 0,
      items: (ticketItems.count ?? 0) + (storeItems.count ?? 0),
      configured: true,
    };
  } catch {
    return { pending: 0, accepted: 0, rejected: 0, items: 0, configured: false };
  }
}

export default async function AdminDashboard() {
  const counts = await getCounts();

  const stats = [
    { label: "Pending", value: counts.pending, icon: Clock, color: "text-warning" },
    { label: "Accepted", value: counts.accepted, icon: CheckCircle2, color: "text-success" },
    { label: "Rejected", value: counts.rejected, icon: XCircle, color: "text-danger" },
    { label: "Total items", value: counts.items, icon: Boxes, color: "text-teal" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {!counts.configured && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Supabase isn&apos;t configured yet — set SUPABASE_URL and
          SUPABASE_SERVICE_ROLE_KEY to see live data.
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="panel p-5">
            <Icon className={color} size={22} />
            <p className="mt-3 text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/tickets"
          className="rounded-lg bg-gradient-to-r from-teal to-pink px-5 py-2.5 text-sm font-semibold text-background"
        >
          Review tickets
        </Link>
        <Link
          href="/admin/items"
          className="rounded-lg border border-panel-border px-5 py-2.5 text-sm font-semibold text-foreground/90 hover:border-teal-dim"
        >
          Manage items
        </Link>
      </div>
    </div>
  );
}
