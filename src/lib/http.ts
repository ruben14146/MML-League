import { NextResponse } from "next/server";

// Never forward raw Supabase/Postgres error text to the client — it can
// leak schema details (column/constraint names, table structure). Log the
// real error server-side (visible in Vercel logs) and return a generic
// message instead.
export function serverError(error: unknown, context: string) {
  console.error(`[${context}]`, error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
