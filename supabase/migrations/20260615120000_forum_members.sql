-- Forum-Mitglieder: persönliche Zugangscodes (Allowlist)

create table public.forum_members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 2 and 32),
  access_code_hash text not null,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index forum_members_display_name_idx on public.forum_members (lower(trim(display_name)));
create unique index forum_members_access_code_hash_idx on public.forum_members (access_code_hash);

alter table public.forum_members enable row level security;
