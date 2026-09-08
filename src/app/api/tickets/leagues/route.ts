import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { serverError } from "@/lib/http";

// Staff: distinct league names across all "outside MML" tickets, for the
// admin tickets list's league filter dropdown.
export async function GET() {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin()
    .from("tickets")
    .select("league_name")
    .not("league_name", "is", null);

  if (error) return serverError(error, "tickets.leagues");

  const leagues = Array.from(new Set((data ?? []).map((row) => row.league_name).filter(Boolean) as string[])).sort(
    (a, b) => a.localeCompare(b)
  );

  return NextResponse.json({ leagues });
}
