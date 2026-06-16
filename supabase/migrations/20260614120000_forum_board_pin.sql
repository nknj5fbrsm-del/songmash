-- Unterbereiche innerhalb einer Kategorie anpinnen

alter table public.forum_boards
  add column if not exists is_pinned boolean not null default false;

drop index if exists forum_boards_category_id_idx;

create index forum_boards_category_id_idx
  on public.forum_boards (category_id, is_pinned desc, sort_order);
