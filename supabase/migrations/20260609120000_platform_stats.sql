-- Plattform-Zähler: Duelle gesamt (sinkt nicht bei Song-Löschung)

create table public.platform_stats (
  id text primary key check (id = 'global'),
  total_vote_rounds bigint not null default 0 check (total_vote_rounds >= 0),
  updated_at timestamptz not null default now()
);

alter table public.platform_stats enable row level security;

create policy "Platform stats are readable by everyone"
  on public.platform_stats
  for select
  using (true);

insert into public.platform_stats (id, total_vote_rounds)
values ('global', (select count(*)::bigint from public.votes))
on conflict (id) do nothing;

create or replace function public.increment_platform_vote_rounds()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.platform_stats
  set
    total_vote_rounds = total_vote_rounds + 1,
    updated_at = now()
  where id = 'global';
  return new;
end;
$$;

create trigger votes_increment_platform_stats
  after insert on public.votes
  for each row
  execute function public.increment_platform_vote_rounds();
