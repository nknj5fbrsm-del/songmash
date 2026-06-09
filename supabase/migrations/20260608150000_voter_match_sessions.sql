-- Aktives Match pro Voter (Reload-sicher, nur Service Role).

create table public.voter_match_sessions (
  voter_id uuid primary key,
  song_a_id uuid not null references public.songs (id) on delete cascade,
  song_b_id uuid not null references public.songs (id) on delete cascade,
  exclude_song_ids jsonb not null default '[]'::jsonb,
  banned_pairs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  check (song_a_id <> song_b_id)
);

create index voter_match_sessions_updated_at_idx
  on public.voter_match_sessions (updated_at);

alter table public.voter_match_sessions enable row level security;
