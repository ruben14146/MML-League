// Checks whether a Discord user is currently boosting the MML server.
// Requires a bot token with access to the guild (added as a server member)
// — OAuth alone can't see boost status, only the bot API can.
export async function isGuildBooster(discordId: string | null | undefined): Promise<boolean> {
  if (!discordId) return false;

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!botToken || !guildId) return false;

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      // Never let a slow/unreachable Discord API block ticket submission.
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return false; // 404 = not a member, or any other error — fail closed

    const member = (await res.json()) as { premium_since?: string | null };
    return member.premium_since != null;
  } catch {
    return false;
  }
}
