import { supabaseAdmin } from "@/lib/supabase";
import type { StaffRole } from "@/lib/db.types";

// Discord IDs in ADMIN_DISCORD_IDS are always "developer", regardless of the
// staff_roles table — a bootstrap/failsafe so staff access can never be
// locked out by deleting rows.
function bootstrapDeveloperIds() {
  return (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isBootstrapDeveloper(discordId: string | null | undefined) {
  if (!discordId) return false;
  return bootstrapDeveloperIds().includes(discordId);
}

export async function getStaffRole(
  discordId: string | null | undefined
): Promise<StaffRole | null> {
  if (!discordId) return null;
  if (isBootstrapDeveloper(discordId)) return "developer";

  const { data } = await supabaseAdmin()
    .from("staff_roles")
    .select("role")
    .eq("discord_id", discordId)
    .maybeSingle();

  return data?.role ?? null;
}

// A role can only grant/revoke roles strictly below its own rank:
// developer -> owner, admin
// owner -> admin
// admin -> nobody
const GRANTABLE: Record<StaffRole, StaffRole[]> = {
  developer: ["owner", "admin"],
  owner: ["admin"],
  admin: [],
};

export function canManageRole(actor: StaffRole, target: StaffRole) {
  return GRANTABLE[actor].includes(target);
}

export function grantableRoles(actor: StaffRole): StaffRole[] {
  return GRANTABLE[actor];
}

// Keeps staff_roles.discord_username fresh from the signed-in session, so
// the staff list can display real usernames instead of "Unknown username" —
// nothing else populates that column automatically. Safe to call for
// bootstrap developers too: their effective role always comes from
// isBootstrapDeveloper regardless of what's stored here.
export async function syncStaffUsername(
  discordId: string,
  discordUsername: string,
  role: StaffRole
) {
  await supabaseAdmin()
    .from("staff_roles")
    .upsert(
      { discord_id: discordId, discord_username: discordUsername, role },
      { onConflict: "discord_id" }
    );
}
