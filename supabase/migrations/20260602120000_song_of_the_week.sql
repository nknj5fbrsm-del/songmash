-- Song der Woche: Kalenderwoche Mo–So (Europe/Berlin), zwei Gewinner-Typen

create table public.competition_weeks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'finalized')),
  created_at timestamptz not null default now(),
  constraint competition_weeks_range check (ends_at > starts_at)
);

create unique index competition_weeks_starts_at_uidx on public.competition_weeks (starts_at);
create index competition_weeks_status_idx on public.competition_weeks (status, ends_at desc);

create table public.week_elo_snapshots (
  week_id uuid not null references public.competition_weeks (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  elo_at_start integer not null,
  primary key (week_id, song_id)
);

create table public.week_winners (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.competition_weeks (id) on delete cascade,
  winner_type text not null check (winner_type in ('leaderboard_champion', 'weekly_mvp')),
  song_id uuid references public.songs (id) on delete set null,
  song_title text not null,
  song_artist text not null,
  final_elo integer,
  elo_delta integer,
  final_rank integer,
  week_vote_count integer,
  created_at timestamptz not null default now(),
  constraint week_winners_unique_type unique (week_id, winner_type)
);

create index week_winners_week_id_idx on public.week_winners (week_id);

alter table public.competition_weeks enable row level security;
alter table public.week_elo_snapshots enable row level security;
alter table public.week_winners enable row level security;

create policy "Competition weeks are readable by everyone"
  on public.competition_weeks
  for select
  using (true);

create policy "Week snapshots are readable by everyone"
  on public.week_elo_snapshots
  for select
  using (true);

create policy "Week winners are readable by everyone"
  on public.week_winners
  for select
  using (true);
