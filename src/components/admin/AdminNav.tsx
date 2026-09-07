"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Ticket, Boxes, Users, Ban } from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/items", label: "Items", icon: Boxes },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/bans", label: "Bans", icon: Ban },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-panel text-teal border border-teal-dim"
                : "border border-panel-border text-muted hover:text-teal"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
