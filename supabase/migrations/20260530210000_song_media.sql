-- Cover, Infotext und Storage für Uploads

alter table public.songs
  add column if not exists cover_url text,
  add column if not exists description text check (description is null or char_length(description) <= 500);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'song-assets',
  'song-assets',
  true,
  15728640,
  array['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Song assets are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'song-assets');

create policy "Anyone can upload song assets"
  on storage.objects
  for insert
  with check (bucket_id = 'song-assets');
