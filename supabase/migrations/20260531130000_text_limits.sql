-- Infotext auf 250 Zeichen begrenzen (App-Limit)

alter table public.songs drop constraint if exists songs_description_check;

-- Bestehende Einträge kürzen, sonst schlägt das neue Constraint fehl
update public.songs
set description = left(description, 250)
where description is not null
  and char_length(description) > 250;

alter table public.songs
  add constraint songs_description_check
  check (description is null or char_length(description) <= 250);
