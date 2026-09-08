import Link from "next/link";
import { auth } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";
import AccountView from "@/components/AccountView";

export default async function AccountPage() {
  const session = await auth();

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-24 text-center">
        <ShieldAlert size={40} className="text-teal" />
        <h1 className="text-2xl font-bold">Sign-in required</h1>
        <p className="text-muted">Sign in with Discord to view your account and tickets.</p>
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
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-bold">Your Account</h1>
      <p className="mt-1 text-sm text-muted">Your profile and everything you've submitted.</p>
      <div className="mt-6">
        <AccountView />
      </div>
    </div>
  );
}
