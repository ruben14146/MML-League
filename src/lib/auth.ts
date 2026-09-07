import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

interface DiscordProfileRaw {
  id: string;
  username: string;
  avatar: string | null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      authorization: { params: { scope: "identify" } },
      profile(profile: DiscordProfileRaw) {
        return {
          id: profile.id,
          name: profile.username,
          discordId: profile.id,
          // Raw Discord username (not the display/global name), per spec.
          discordUsername: profile.username,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
        };
      },
    }),
  ],
  // Shorter-lived than the NextAuth default (30 days) — this app gates a
  // staff admin panel, so a stolen session cookie should go stale sooner.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.discordId = (user as { discordId?: string }).discordId;
        token.discordUsername = (user as { discordUsername?: string }).discordUsername;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.discordId = token.discordId as string | undefined;
        session.user.discordUsername = token.discordUsername as string | undefined;
      }
      return session;
    },
  },
});
