"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import Logo from "./Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/tickets/new", label: "Ticket System" },
  { href: "/tickets/status", label: "Check Status" },
  { href: "/items", label: "Our Items" },
  { href: "/admin", label: "Staff & Admin Panel" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-panel-border/80 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-lg font-extrabold tracking-wide">MML</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-panel text-teal"
                    : "text-foreground/80 hover:bg-panel hover:text-teal"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {status === "authenticated" ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-panel-border bg-panel px-3 py-1.5 text-sm">
                {session.user?.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-5 w-5 rounded-full"
                  />
                )}
                <span className="text-foreground/90">
                  {session.user?.discordUsername}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="rounded-lg p-2 text-muted hover:text-danger"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("discord")}
              className="rounded-lg bg-gradient-to-r from-teal to-pink px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Sign in with Discord
            </button>
          )}
        </div>

        <button
          className="p-2 text-foreground md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-panel-border bg-background px-5 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/90 hover:bg-panel hover:text-teal"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-panel-border pt-3">
            {status === "authenticated" ? (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 text-sm text-danger"
              >
                <LogOut size={16} /> Sign out ({session.user?.discordUsername})
              </button>
            ) : (
              <button
                onClick={() => signIn("discord")}
                className="w-full rounded-lg bg-gradient-to-r from-teal to-pink px-4 py-2 text-sm font-semibold text-background"
              >
                Sign in with Discord
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
