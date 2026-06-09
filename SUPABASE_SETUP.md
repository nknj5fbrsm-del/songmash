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

## 7. Cloudflare R2 (Audio & Cover)

Neue Uploads und Suno-Imports landen in **Cloudflare R2** statt Supabase Storage — das spart **Cached Egress** bei Supabase.

### 7.1 Edge Secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Beschreibung |
|--------|--------------|
| `R2_ACCOUNT_ID` | Cloudflare Account-ID |
| `R2_BUCKET_NAME` | z. B. `songmash-audio-und-cover` |
| `R2_PUBLIC_BASE_URL` | öffentliche R2-Dev-URL (ohne trailing slash) |
| `R2_S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | S3-kompatibler Access Key (vom R2 API-Token) |
| `R2_SECRET_ACCESS_KEY` | S3-kompatibles Secret |
| `MODERATOR_KEY` | gleicher Wert wie `VITE_MODERATOR_KEY` (für Moderation-Asset-Löschung) |

### 7.2 Client / CI

In `.env.local` und GitHub Actions:

```env
VITE_R2_PUBLIC_URL=https://pub-a6d3efc7833c4556b272d9c2695e3d17.r2.dev
```

### 7.3 R2 CORS (Cloudflare Dashboard)

Erlaubte Origins: `https://nknj5fbrsm-del.github.io`, `http://localhost:5173`  
Methoden: `GET`, `HEAD`, `PUT` — Header: `Content-Type`

---

## 8. Edge Functions deployen (Suno, Lösch-Code, R2)

Suno-Audio kann im Browser nicht direkt von GitHub Pages abgespielt werden.  
Die App importiert Suno-Links serverseitig in **R2** (Function `import-audio`).  
Browser-Uploads nutzen `r2-presign` (Presigned PUT direkt nach R2).

```bash
npx supabase login
npx supabase functions deploy r2-presign import-audio delete-song-by-token purge-song-assets week-cycle --project-ref cwymmgfstfkgaiatbsev
```

**Ohne `r2-presign`** schlagen Datei-Uploads in Production fehl.

**Ohne `delete-song-by-token`** funktioniert „Song entfernen“ per Lösch-Code nicht.

**Ohne `purge-song-assets`** löscht die Moderation keine R2-Dateien (DB-Eintrag wird trotzdem entfernt).

**Ohne `week-cycle`** gibt es keinen Song-der-Woche-Countdown und keine automatische Wochenfinalisierung.

### Phase 2: Bestehende Supabase-URLs nach R2 migrieren

```bash
npx supabase functions deploy migrate-assets-to-r2 --project-ref cwymmgfstfkgaiatbsev
```

Dry-Run (keine Änderungen):

```bash
curl -X POST 'https://cwymmgfstfkgaiatbsev.supabase.co/functions/v1/migrate-assets-to-r2' \
  -H 'Authorization: Bearer DEIN_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"dryRun":true,"limit":10,"moderatorKey":"DEIN_MODERATOR_KEY"}'
```

Echte Migration: `"dryRun":false` — danach alte Dateien im Supabase-Bucket `song-assets` manuell prüfen und leeren.

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

## 9. Song der Woche (Kalenderwoche Mo–So)

Migration im **SQL Editor** oder via `supabase db push`:

`supabase/migrations/20260602120000_song_of_the_week.sql`

Legt an: `competition_weeks`, `week_elo_snapshots`, `week_winners`.

**Edge Function `week-cycle`:**

- finalisiert abgelaufene Wochen (Platz-1-Snapshot + Weekly MVP)
- legt die aktuelle Berlin-Kalenderwoche an und erstellt Elo-Snapshots

Die App ruft `week-cycle` beim Laden im Hintergrund auf. Zusätzlich empfohlen: **Scheduled Function** im Supabase Dashboard (z. B. Sonntag 23:59 `Europe/Berlin`, Cron `59 23 * * 0`) → POST auf `/functions/v1/week-cycle`.

---

## 9b. Vote-Schutz (`cast-vote`)

Migration im **SQL Editor** (oder `supabase db push`):

`supabase/migrations/20260608140000_vote_rate_limits.sql`

- Tabelle `vote_rate_events` für Rate-Limits (IP + anonyme `voter_id`)
- Entfernt direktes `INSERT` auf `votes` vom Client

**Edge Function deployen:**

```bash
npx supabase functions deploy cast-vote --project-ref cwymmgfstfkgaiatbsev
```

Limits (serverseitig): 3 s Abstand, 6/min, 80/h, 200/Tag; Skips 15/h, 40/Tag; nach 3 Skips in Folge 30 s Pause.

Ohne Migration **und** deployte Function funktionieren Votes in Production nicht.

---

## 10. App starten

```bash
npm run dev
```

Oben erscheint **„Verbunden mit Supabase“**, wenn `.env.local` korrekt ist.

Beim ersten Start werden die Demo-Songs automatisch in die DB geschrieben (nur wenn die Tabelle leer ist).

---

## Fallback ohne Supabase

Ohne `.env.local` nutzt die App weiterhin **localStorage** — praktisch für reines Lokal-Testing.

---

## 11. Cloudflare Turnstile (Spam-Schutz beim Einreichen)

**Lokal / GitHub Pages (öffentlich):**

```env
VITE_TURNSTILE_SITE_KEY=dein-site-key
```

In GitHub → **Settings → Secrets → Actions** denselben Wert als `VITE_TURNSTILE_SITE_KEY` hinterlegen.

**Supabase Edge Function Secret:**

| Name | Wert |
|------|------|
| `TURNSTILE_SECRET_KEY` | Secret Key aus dem Turnstile-Dashboard |

**Deploy (einmalig nach Änderungen):**

```bash
npx supabase functions deploy turnstile-session --project-ref cwymmgfstfkgaiatbsev
npx supabase functions deploy submit-song --project-ref cwymmgfstfkgaiatbsev
npx supabase functions deploy r2-presign --project-ref cwymmgfstfkgaiatbsev
npx supabase functions deploy import-audio --project-ref cwymmgfstfkgaiatbsev
```

Ohne `VITE_TURNSTILE_SITE_KEY` bleibt die Checkbox ausgeblendet (nur für lokales Dev ohne Turnstile).

---

## 12. Nächste Schritte (optional)

- **Auth** aktivieren → nur eingeloggte User dürfen Songs einreichen
- **Elo serverseitig** berechnen (Edge Function / DB Trigger)
- **Supabase Storage** für eigene MP3-Uploads statt Suno-Links
