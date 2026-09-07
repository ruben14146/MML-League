# MML League

A ticket system, item catalogue, and staff admin panel for the MML league.
Built with Next.js (App Router), NextAuth (Discord OAuth), and Supabase.

## Stack

- **Next.js 16** — App Router, TypeScript, Tailwind CSS
- **NextAuth v5** — Discord sign-in (uses the raw Discord *username*, not the display name)
- **Supabase** — Postgres for tickets/items, Storage for item images
- All reads/writes go through this app's own API routes using the Supabase
  **service role key** on the server — nothing talks to Supabase directly
  from the browser, so there's no RLS to configure.

## How the ticket flow works

1. User picks an item from the list configured in the admin panel.
2. User signs in with Discord — their Discord **username** auto-fills (not
   their nickname/display name).
3. User pastes the Discord message link that proves the event.
4. User picks **Inside MML** or **Outside MML**.
   - If **Outside MML**, they also enter the league name and the Discord
     server invite link the event was hosted in.
5. On submit, they get a ticket ID (e.g. `MML-7F3K9A`).
6. That ID can be looked up any time on **Check Status** to see
   `pending` / `accepted` / `rejected`, plus any staff note.

Staff review and update tickets from **Staff & Admin Panel → Tickets**.
Items (both the ones users can pick when opening a ticket, and the public
"Our Items" showcase) are managed from **Admin Panel → Items**, with image
upload straight to Supabase Storage.

## Local setup

```bash
npm install
cp .env.example .env.local
```

### 1. Discord OAuth app

In the [Discord Developer Portal](https://discord.com/developers/applications):

1. Create (or open) your application → **OAuth2**.
2. Add a redirect URL:
   - Local dev: `http://localhost:3000/api/auth/callback/discord`
   - Production: `https://<your-domain>/api/auth/callback/discord`
3. Copy the **Client ID** and **Client Secret** into `.env.local`:
   ```
   AUTH_DISCORD_ID=...
   AUTH_DISCORD_SECRET=...
   ```
4. Generate an auth secret: `npx auth secret` (writes `AUTH_SECRET`).

### 2. Admin access

Turn on Developer Mode in Discord (User Settings → Advanced), right-click
your profile → **Copy User ID**. Add it (comma-separated for multiple staff)
to `.env.local`:

```
ADMIN_DISCORD_IDS=123456789012345678,987654321098765432
```

Anyone signed in with one of these Discord accounts can reach `/admin`.

### 3. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) — it
   creates the `tickets`, `ticket_items`, `store_items` tables and a public
   `item-images` storage bucket.
3. From **Project Settings → API**, copy the Project URL and the
   **service_role** secret key into `.env.local`:
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

### 4. Run it

```bash
npm run dev
```

## Deploying

Push this repo to GitHub, then:

1. Import it into **Vercel** and set the same environment variables as
   `.env.local` (with the production Discord redirect URL added to the
   Discord app).
2. Point `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` at your Supabase
   project (create one for production if you used a throwaway one locally).

## Branding assets

The logo, banner, and background texture are currently placeholder SVGs
generated in code (`src/components/Logo.tsx`, `src/components/WaveTexture.tsx`)
using the brand colors `#64ddff` and `#f6a9f3`. Drop the real logo/banner
files in `public/` and swap them in once you have them exported as files.
