import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdminDiscordId } from "@/lib/admin";
import { ShieldAlert } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const discordId = session?.user?.discordId;

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

  if (!isAdminDiscordId(discordId)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-24 text-center">
        <ShieldAlert size={40} className="text-danger" />
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-muted">
          Your Discord account isn&apos;t on the staff allowlist for the admin panel.
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
      <AdminNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
