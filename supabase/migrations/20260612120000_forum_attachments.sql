-- Forum-Anhänge (Bild/Audio, getrennt von SongMash songs) + Upload-Rate-Limit

alter table public.forum_posts
  add column if not exists image_url text,
  add column if not exists audio_url text;

create table public.forum_upload_events (
  id uuid primary key default gen_random_uuid(),
  session_key text not null,
  kind text not null check (kind in ('image', 'audio')),
  created_at timestamptz not null default now()
);

create index forum_upload_events_session_created_idx
  on public.forum_upload_events (session_key, created_at desc);

alter table public.forum_upload_events enable row level security;
