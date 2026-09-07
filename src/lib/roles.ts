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
