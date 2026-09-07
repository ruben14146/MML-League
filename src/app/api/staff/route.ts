import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { canManageRole, isBootstrapDeveloper } from "@/lib/roles";
import type { StaffRole } from "@/lib/db.types";

const VALID_ROLES: StaffRole[] = ["developer", "owner", "admin"];

function bootstrapDevelopers() {
  return (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

// List everyone with staff access: bootstrap (env) developers plus every row
// in staff_roles.
export async function GET() {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin()
    .from("staff_roles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dbByDiscordId = new Map((data ?? []).map((row) => [row.discord_id, row]));

  const bootstrap = bootstrapDevelopers().map((discordId) => ({
    id: `bootstrap-${discordId}`,
    discord_id: discordId,
    discord_username: dbByDiscordId.get(discordId)?.discord_username ?? null,
    role: "developer" as StaffRole,
    granted_by: null,
    created_at: dbByDiscordId.get(discordId)?.created_at ?? null,
    bootstrap: true,
  }));

  const rows = (data ?? [])
    .filter((row) => !isBootstrapDeveloper(row.discord_id))
    .map((row) => ({ ...row, bootstrap: false }));

  return NextResponse.json({ staff: [...bootstrap, ...rows], viewerRole: staff.role });
}

// Grant (or change) a staff member's role.
export async function POST(request: NextRequest) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const discordId = String(body.discord_id ?? "").trim();
  const discordUsername = body.discord_username ? String(body.discord_username).trim() : null;
  const role = body.role as StaffRole;

  if (!discordId) {
    return NextResponse.json({ error: "Discord ID is required" }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (isBootstrapDeveloper(discordId)) {
    return NextResponse.json(
      { error: "This Discord ID is already a root developer." },
      { status: 400 }
    );
  }
  if (!canManageRole(staff.role, role)) {
    return NextResponse.json(
      { error: `Your role (${staff.role}) can't grant the ${role} role.` },
      { status: 403 }
    );
  }

  const { data: existing } = await supabaseAdmin()
    .from("staff_roles")
    .select("role")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (existing && !canManageRole(staff.role, existing.role)) {
    return NextResponse.json(
      { error: `Your role (${staff.role}) can't change a ${existing.role}'s role.` },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseAdmin()
    .from("staff_roles")
    .upsert(
      {
        discord_id: discordId,
        discord_username: discordUsername,
        role,
        granted_by: staff.session.user?.discordId ?? null,
      },
      { onConflict: "discord_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data }, { status: 201 });
}
