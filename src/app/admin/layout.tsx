import Link from "next/link";
import { auth } from "@/lib/auth";
import { requireStaffSession } from "@/lib/admin";
import { ShieldAlert } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-24 text-center">
        <ShieldAlert size={40} className="text-teal" />
        <h1 className="text-2xl font-bold">Staff sign-in required</h1>
        <p className="text-muted">Sign in with Discord to access the staff and admin panel.</p>
        <Link
          href="/"
          className="mt-2 rounded-lg border border-panel-border px-4 py-2 text-sm text-muted hover:text-teal"
        >
          Back home
        </Link>
      </div>
    );
  }

  const staff = await requireStaffSession();

  if (!staff) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-24 text-center">
        <ShieldAlert size={40} className="text-danger" />
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-muted">
          Your Discord account isn&apos;t on the staff list for the admin panel.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg border border-panel-border px-4 py-2 text-sm text-muted hover:text-teal"
        >
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <AdminNav />
        <span className="rounded-full border border-teal-dim px-3 py-1 text-xs font-medium capitalize text-teal">
          {staff.role}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}
