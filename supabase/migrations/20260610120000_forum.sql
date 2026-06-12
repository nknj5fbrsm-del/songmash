-- SongMash Community-Forum (Zugriff nur über Edge Functions + Service Role)

create table public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.forum_boards (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.forum_categories (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index forum_boards_category_id_idx on public.forum_boards (category_id, sort_order);

create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.forum_boards (id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 3),
  author_name text not null check (char_length(trim(author_name)) >= 2),
  song_id uuid references public.songs (id) on delete set null,
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forum_threads_board_id_idx on public.forum_threads (board_id, is_pinned desc, updated_at desc);

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_name text not null check (char_length(trim(author_name)) >= 2),
  body text not null check (char_length(trim(body)) > 0),
  song_id uuid references public.songs (id) on delete set null,
  created_at timestamptz not null default now()
);

create index forum_posts_thread_id_idx on public.forum_posts (thread_id, created_at);

alter table public.forum_categories enable row level security;
alter table public.forum_boards enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;

-- Start-Kategorien und Boards
insert into public.forum_categories (id, name, description, sort_order) values
  ('a1000001-0001-4001-8001-000000000001', 'SongMash', 'Alles rund um SongMash und die Community.', 1),
  ('a1000001-0001-4001-8001-000000000002', 'Off-Topic', 'Gespräche abseits von SongMash.', 2),
  ('a1000001-0001-4001-8001-000000000003', 'Meta', 'Forum, Ideen und Feedback zur Plattform.', 3);

insert into public.forum_boards (id, category_id, name, description, sort_order) values
  ('b1000001-0001-4001-8001-000000000001', 'a1000001-0001-4001-8001-000000000001', 'Allgemein', 'Austausch rund um SongMash.', 1),
  ('b1000001-0001-4001-8001-000000000002', 'a1000001-0001-4001-8001-000000000001', 'Feedback zu Songs', 'Kritik, Tipps und Diskussion zu einzelnen Tracks.', 2),
  ('b1000001-0001-4001-8001-000000000003', 'a1000001-0001-4001-8001-000000000001', 'Neue Einreichungen', 'Frisch eingereichte Songs vorstellen.', 3),
  ('b1000001-0001-4001-8001-000000000004', 'a1000001-0001-4001-8001-000000000002', 'Musik', 'KI-Musik, Tools und Inspiration.', 1),
  ('b1000001-0001-4001-8001-000000000005', 'a1000001-0001-4001-8001-000000000002', 'Sonstiges', 'Alles andere — entspannt bleiben.', 2),
  ('b1000001-0001-4001-8001-000000000006', 'a1000001-0001-4001-8001-000000000003', 'Forum & Ideen', 'Vorschläge für SongMash und dieses Forum.', 1);
