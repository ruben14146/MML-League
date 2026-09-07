import { auth } from "@/lib/auth";
import { getStaffRole } from "@/lib/roles";
import type { StaffRole } from "@/lib/db.types";
import type { Session } from "next-auth";

export async function requireStaffSession(): Promise<
  { session: Session; role: StaffRole } | null
> {
  const session = await auth();
  const discordId = session?.user?.discordId;
  const role = await getStaffRole(discordId);
  if (!session || !role) return null;
  return { session, role };
}
