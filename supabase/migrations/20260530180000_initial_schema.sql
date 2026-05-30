-- SongMash initial schema

create extension if not exists "pgcrypto";

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  artist text not null check (char_length(trim(artist)) > 0),
  audio_url text not null check (char_length(trim(audio_url)) > 0),
  source_url text,
  elo_rating integer not null default 1500 check (elo_rating >= 0),
  tech_stack_tags text[] not null default '{}',
  submission_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index songs_elo_rating_idx on public.songs (elo_rating desc);
create index songs_created_at_idx on public.songs (created_at desc);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  song_a_id uuid not null references public.songs (id) on delete cascade,
  song_b_id uuid not null references public.songs (id) on delete cascade,
  winner text not null check (winner in ('A', 'B', 'skip')),
  created_at timestamptz not null default now(),
  check (song_a_id <> song_b_id)
);

create index votes_created_at_idx on public.votes (created_at desc);

alter table public.songs enable row level security;
alter table public.votes enable row level security;

create policy "Songs are readable by everyone"
  on public.songs
  for select
  using (true);

create policy "Songs can be inserted by anyone"
  on public.songs
  for insert
  with check (true);

create policy "Song Elo can be updated by anyone"
  on public.songs
  for update
  using (true)
  with check (true);

create policy "Votes are readable by everyone"
  on public.votes
  for select
  using (true);

create policy "Votes can be inserted by anyone"
  on public.votes
  for insert
  with check (true);
