-- Rate-Limit-Tracking für cast-vote (nur Service Role schreibt).

create table public.vote_rate_events (
  id uuid primary key default gen_random_uuid(),
  ip_key text not null,
  voter_id text not null,
  winner text not null check (winner in ('A', 'B', 'skip')),
  created_at timestamptz not null default now()
);

create index vote_rate_events_ip_created_idx
  on public.vote_rate_events (ip_key, created_at desc);

create index vote_rate_events_voter_created_idx
  on public.vote_rate_events (voter_id, created_at desc);

alter table public.vote_rate_events enable row level security;

-- Direktes Vote-Insert vom Client abschalten (nur cast-vote Edge Function).
drop policy if exists "Votes can be inserted by anyone" on public.votes;
