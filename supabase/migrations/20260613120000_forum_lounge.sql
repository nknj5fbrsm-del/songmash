-- Forum-Lounge: gemeinsamer Text-Chat (Zugriff nur über Edge Functions)

create table public.forum_lounge_messages (
  id uuid primary key default gen_random_uuid(),
  author_name text not null check (char_length(trim(author_name)) >= 2),
  body text not null check (char_length(trim(body)) between 1 and 400),
  created_at timestamptz not null default now()
);

create index forum_lounge_messages_created_at_idx
  on public.forum_lounge_messages (created_at desc);

create table public.forum_lounge_rate_events (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  created_at timestamptz not null default now()
);

create index forum_lounge_rate_events_session_created_idx
  on public.forum_lounge_rate_events (session_key, created_at desc);

alter table public.forum_lounge_messages enable row level security;
alter table public.forum_lounge_rate_events enable row level security;
