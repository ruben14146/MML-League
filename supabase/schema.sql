-- MML League schema
-- Run this in the Supabase SQL editor (or `supabase db push`) once your
-- project is created. All reads/writes happen through the Next.js server
-- using the service role key, so Row Level Security stays off by default —
-- if you later add direct client access, enable RLS and add policies first.

create extension if not exists "pgcrypto";

create table if not exists ticket_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists store_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique,
  discord_username text not null,
  discord_id text,
  discord_message_link text not null,
  player_id text,
  item_id uuid references ticket_items(id) on delete set null,
  location text not null check (location in ('inside', 'outside')),
  league_name text,
  server_link text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'sent_on_dash', 'sent_to_lockers')),
  admin_note text,
  handled_by text,
  is_booster boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickets_ticket_code_idx on tickets (ticket_code);
create index if not exists tickets_status_idx on tickets (status);
create index if not exists tickets_discord_message_link_idx on tickets (discord_message_link);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tickets_set_updated_at on tickets;
create trigger tickets_set_updated_at
  before update on tickets
  for each row
  execute function set_updated_at();

-- Storage bucket for item images uploaded from the admin panel.
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

-- Staff role assignments. Discord IDs listed in ADMIN_DISCORD_IDS are always
-- treated as "developer" regardless of this table (bootstrap/failsafe), so
-- staff access can never be locked out by deleting rows here.
create table if not exists staff_roles (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  discord_username text,
  role text not null check (role in ('developer', 'owner', 'admin')),
  granted_by text,
  created_at timestamptz not null default now()
);

-- Banned Discord IDs. A ban can be entered before someone has ever signed
-- in (pure Discord ID) or against a user with existing tickets. Checked at
-- sign-in (blocks login outright) and again on ticket creation as
-- defense-in-depth.
create table if not exists banned_users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  discord_username text,
  reason text,
  banned_by text,
  created_at timestamptz not null default now()
);

create index if not exists banned_users_discord_id_idx on banned_users (discord_id);

-- Per-ticket chat between the submitter and staff.
create table if not exists ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  sender_discord_id text not null,
  sender_username text not null,
  is_staff boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_messages_ticket_id_idx on ticket_messages (ticket_id);

-- Staff-only general chat.
create table if not exists staff_messages (
  id uuid primary key default gen_random_uuid(),
  sender_discord_id text not null,
  sender_username text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists staff_messages_created_at_idx on staff_messages (created_at);
