import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaffSession } from "@/lib/admin";
import { canManageRole, isBootstrapDeveloper } from "@/lib/roles";
import { serverError } from "@/lib/http";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ discordId: string }> }
) {
  const staff = await requireStaffSession();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { discordId } = await params;

  if (isBootstrapDeveloper(discordId)) {
    return NextResponse.json(
      { error: "Root developers can't be revoked here." },
      { status: 400 }
    );
  }

  const { data: existing } = await supabaseAdmin()
    .from("staff_roles")
    .select("role")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "No staff member with that Discord ID." }, { status: 404 });
  }
  if (!canManageRole(staff.role, existing.role)) {
    return NextResponse.json(
      { error: `Your role (${staff.role}) can't revoke a ${existing.role}.` },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin().from("staff_roles").delete().eq("discord_id", discordId);
  if (error) return serverError(error, "staff.revoke");
  return NextResponse.json({ ok: true });
}
