import { supabaseAdmin } from "@/lib/supabase";

export async function isBanned(discordId: string | null | undefined): Promise<boolean> {
  if (!discordId) return false;
  const { data } = await supabaseAdmin()
    .from("banned_users")
    .select("discord_id")
    .eq("discord_id", discordId)
    .maybeSingle();
  return !!data;
}
