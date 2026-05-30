-- Moderation: Songs und Storage-Dateien löschen

create policy "Songs can be deleted for moderation"
  on public.songs
  for delete
  using (true);

create policy "Song assets can be deleted for moderation"
  on storage.objects
  for delete
  using (bucket_id = 'song-assets');
