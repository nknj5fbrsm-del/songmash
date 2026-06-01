-- Lösch-Code (nur Hash) pro Song für selbstständige Entfernung ohne Login

alter table public.songs
  add column if not exists deletion_token_hash text;

create unique index if not exists songs_deletion_token_hash_idx
  on public.songs (deletion_token_hash)
  where deletion_token_hash is not null;
