import { supabaseAdmin } from "@/lib/supabase";

export async function getTicketSettings(): Promise<{ enabled: boolean; reason: string | null }> {
  const { data } = await supabaseAdmin()
    .from("site_settings")
    .select("tickets_enabled, tickets_disabled_reason")
    .eq("id", true)
    .maybeSingle();

  return {
    enabled: data?.tickets_enabled ?? true,
    reason: data?.tickets_disabled_reason ?? null,
  };
}
