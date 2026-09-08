import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGuildBooster } from "@/lib/discordBot";

// The signed-in user's own profile info, including a live boost check.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const isBooster = await isGuildBooster(session.user.discordId);

  return NextResponse.json({
    discordId: session.user.discordId ?? null,
    discordUsername: session.user.discordUsername ?? null,
    image: session.user.image ?? null,
    isBooster,
  });
}
