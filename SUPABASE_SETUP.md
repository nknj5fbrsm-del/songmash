# Supabase Setup für SongMash

## 1. `.env.local` anlegen

Kopiere `.env.example` nach `.env.local` und trage deinen **anon public** Key ein:

```bash
cp .env.example .env.local
```

In `.env.local`:

```env
VITE_SUPABASE_URL=https://cwymmgfstfkgaiatbsev.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...dein-anon-key...
```

Den anon Key findest du im Supabase Dashboard unter **Project Settings → API → Project API keys → anon public**.

---

## 2. Supabase CLI installieren & einloggen

```bash
brew install supabase/tap/supabase
supabase login
```

---

## 3. Projekt verknüpfen

```bash
cd /Users/nilspocklitz/Desktop/SongMash
supabase link --project-ref cwymmgfstfkgaiatbsev
```

(Datenbank-Passwort eingeben, das du beim Projekt-Anlegen gesetzt hast.)

---

## 4. Datenbank-Schema deployen

```bash
supabase db push
```

Das erstellt die Tabellen `songs` und `votes` inkl. Row Level Security.

---

## 4. Media-Migration (Cover, Infotext, Storage)

Falls du das Schema schon deployed hast, führe im **SQL Editor** auch den Inhalt von  
`supabase/migrations/20260530210000_song_media.sql` aus.

Das legt an:
- Spalten `cover_url` und `description` in `songs`
- Storage-Bucket `song-assets` für Audio- und Cover-Uploads

---

---

## 5. Moderation-Migration

Im **SQL Editor** auch ausführen:  
`supabase/migrations/20260530220000_moderation.sql`

Erlaubt Löschen von Songs und Storage-Dateien über die App.

In `.env.local`:

```env
VITE_MODERATOR_KEY=dein-geheimer-admin-key
```

App → **Moderation** → Key eingeben → Song entfernen.  
Elo wird danach aus allen verbleibenden Votes neu berechnet.

---

## 6. Lösch-Code-Migration

Im **SQL Editor** (Production) ausführen:  
`supabase/migrations/20260531150000_deletion_token.sql`

## 7. Edge Functions deployen (für Suno-Links in Production)

Suno-Audio kann im Browser nicht direkt von GitHub Pages abgespielt werden.  
Die App importiert Suno-Links serverseitig in **Supabase Storage** (Function `import-audio`).

```bash
npx supabase login
npx supabase functions deploy import-audio --project-ref cwymmgfstfkgaiatbsev
npx supabase functions deploy delete-song-by-token --project-ref cwymmgfstfkgaiatbsev
```

**Ohne `delete-song-by-token`** funktioniert „Song entfernen“ per Lösch-Code nicht.

Optional (für Udio/YouTube-Auflösung und alte Suno-CDN-Links beim Voting):

```bash
npx supabase functions deploy resolve-audio proxy-audio --project-ref cwymmgfstfkgaiatbsev
```

Danach in `.env.local` optional (bereits in `.env.example` vorbereitet):

```env
VITE_AUDIO_RESOLVER_URL=https://cwymmgfstfkgaiatbsev.supabase.co/functions/v1/resolve-audio
VITE_AUDIO_PROXY_URL=https://cwymmgfstfkgaiatbsev.supabase.co/functions/v1/proxy-audio
```

**Ohne deployte `import-audio`-Function** schlagen Suno-Seitenlinks in Production beim Test fehl.

---

## 8. App starten

```bash
npm run dev
```

Oben erscheint **„Verbunden mit Supabase“**, wenn `.env.local` korrekt ist.

Beim ersten Start werden die Demo-Songs automatisch in die DB geschrieben (nur wenn die Tabelle leer ist).

---

## Fallback ohne Supabase

Ohne `.env.local` nutzt die App weiterhin **localStorage** — praktisch für reines Lokal-Testing.

---

## Nächste Schritte (optional)

- **Auth** aktivieren → nur eingeloggte User dürfen Songs einreichen
- **Elo serverseitig** berechnen (Edge Function / DB Trigger)
- **Supabase Storage** für eigene MP3-Uploads statt Suno-Links
