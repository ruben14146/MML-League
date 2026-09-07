import { auth } from "@/lib/auth";

function allowlist() {
  return (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAdminDiscordId(discordId: string | null | undefined) {
  if (!discordId) return false;
  return allowlist().includes(discordId);
}

export async function requireAdminSession() {
  const session = await auth();
  const discordId = session?.user?.discordId;
  if (!session || !isAdminDiscordId(discordId)) {
    return null;
  }
  return session;
}
