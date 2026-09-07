import Link from "next/link";
import { Ticket, Search, ShoppingBag, ShieldCheck, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";

const CARDS = [
  {
    href: "/tickets/new",
    icon: Ticket,
    title: "Open a Ticket",
    desc: "Submit a new ticket for an event, pick your item, and link the proof.",
  },
  {
    href: "/tickets/status",
    icon: Search,
    title: "Check Status",
    desc: "Already submitted? Look up your ticket ID to see where it stands.",
  },
  {
    href: "/items",
    icon: ShoppingBag,
    title: "Our Items",
    desc: "Browse the items available across the league.",
  },
  {
    href: "/admin",
    icon: ShieldCheck,
    title: "Staff & Admin Panel",
    desc: "League staff: review tickets and manage items.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <section className="flex flex-col items-center gap-6 text-center">
        <Logo size={96} />
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          <span className="glow-text text-teal">MML</span> League
        </h1>
        <p className="max-w-xl text-balance text-muted">
          The home for MML tickets, event verification, and league items.
          Sign in with Discord to open a ticket or check where yours stands.
        </p>
        <Link
          href="/tickets/new"
          className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-teal to-pink px-6 py-3 font-semibold text-background transition-transform hover:scale-[1.03]"
        >
          Open a Ticket
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="gradient-border panel group relative flex flex-col gap-3 p-6 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background-elevated text-teal">
              <Icon size={22} />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted">{desc}</p>
            <ArrowRight
              size={16}
              className="absolute right-6 top-6 text-muted opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
            />
          </Link>
        ))}
      </section>
    </div>
  );
}
