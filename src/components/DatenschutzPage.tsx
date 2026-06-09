import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatAddress, legal } from '../config/legal'

interface DatenschutzPageProps {
  onBack?: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="mb-3 text-lg font-semibold text-neutral-100">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-neutral-400">{children}</div>
    </section>
  )
}

export function DatenschutzPage({ onBack }: DatenschutzPageProps) {
  return (
    <div className="mx-auto max-w-2xl">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>
      )}

      <div className="card">
        <h1 className="mb-2 text-2xl font-bold text-neutral-50">Datenschutzerklärung</h1>
        <p className="mb-8 text-sm text-neutral-500">
          Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13 DSGVO
        </p>

        <Section title="1. Verantwortlicher">
          <p className="whitespace-pre-line">
            {legal.operatorName}
            {'\n'}
            {formatAddress()}
          </p>
          <p>
            E-Mail:{' '}
            <a href={`mailto:${legal.email}`} className="text-lime-400/90 hover:text-lime-300">
              {legal.email}
            </a>
          </p>
          <p>
            Ein Datenschutzbeauftragter ist nicht bestellt, da die gesetzlichen Voraussetzungen
            dafür nicht vorliegen.
          </p>
        </Section>

        <Section title="2. Überblick">
          <p>
            SongMash ist eine Community-Plattform zum Vergleichen und Bewerten von KI-Musik. Wir
            betreiben kein Nutzerkonto-System und setzen kein eigenes Tracking oder Werbe-Cookies
            ein.
          </p>
          <p>
            Beim Besuch der Website, beim Abstimmen (Voting) und beim Einreichen von Songs werden
            Daten verarbeitet — teils auf unseren Servern, teils lokal in deinem Browser. Beim
            Einreichen eines Songs nutzen wir zusätzlich einen Spam-Schutz von Cloudflare Turnstile
            (siehe Abschnitt 5).
          </p>
        </Section>

        <Section title="3. Hosting der Website">
          <p>
            Die statische Website wird über <strong className="text-neutral-300">GitHub Pages</strong>{' '}
            (GitHub, Inc.) bereitgestellt. Beim Aufruf der Seite werden technisch notwendige
            Verbindungsdaten (z. B. IP-Adresse, Zeitpunkt, angeforderte Datei, Browser-Typ)
            automatisch in Server-Logdateien verarbeitet.
          </p>
          <p>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren
            und stabilen Betrieb der Website).
          </p>
        </Section>

        <Section title="4. Supabase (Datenbank, Speicher, Edge Functions)">
          <p>
            Wenn SongMash mit Supabase verbunden ist, werden folgende Daten dort gespeichert oder
            verarbeitet:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-neutral-300">Songs:</strong> Titel, Künstlername, Audio-URL
              oder hochgeladene Audiodatei, optional Coverbild, Infotext, Tech-Tags, Quell-Link,
              Elo-Wert und Einreichungszeitpunkt
            </li>
            <li>
              <strong className="text-neutral-300">Votes:</strong> welche zwei Songs verglichen
              wurden, das Abstimmungsergebnis (A, B oder Skip) und Zeitstempel. Abstimmungen
              laufen nur über die Edge Function <code className="text-neutral-300">cast-vote</code>{' '}
              (kein direktes Einfügen aus dem Browser). Die Vote-Einträge selbst sind keinem
              Nutzerkonto zugeordnet.
            </li>
            <li>
              <strong className="text-neutral-300">Abstimm-Schutz:</strong> zur Begrenzung von Spam
              werden kurzlebige Ereignisse mit einer pseudonymen{' '}
              <strong className="text-neutral-300">Voter-ID</strong> (UUID aus deinem Browser) und
              einem IP-Schlüssel gespeichert (Tabelle{' '}
              <code className="text-neutral-300">vote_rate_events</code>, automatische Bereinigung
              nach etwa 48 Stunden).
            </li>
            <li>
              <strong className="text-neutral-300">Match-Sessions:</strong> welches Paar dir
              aktuell angezeigt wird und Pairing-Sperren, verknüpft mit derselben Voter-ID (bis zu
              24 Stunden, Tabelle <code className="text-neutral-300">voter_match_sessions</code>).
            </li>
            <li>
              <strong className="text-neutral-300">Plattform-Statistik:</strong> ein aggregierter
              Zähler der Duell-Runden gesamt (<code className="text-neutral-300">platform_stats</code>
              ) — ohne Personenbezug; wird beim Löschen einzelner Songs nicht verringert.
            </li>
            <li>
              <strong className="text-neutral-300">Datei-Uploads:</strong> Audio- und
              Cover-Dateien werden in <strong className="text-neutral-300">Cloudflare R2</strong>{' '}
              gespeichert (öffentliche CDN-URL). Metadaten und URLs verbleiben in Supabase.
            </li>
            <li>
              <strong className="text-neutral-300">Edge Functions:</strong> u. a.{' '}
              <code className="text-neutral-300">cast-vote</code> und{' '}
              <code className="text-neutral-300">get-match</code> für Abstimmungen und Match-Auswahl;{' '}
              beim Einreichen externer Links (z. B. Suno) werden URLs serverseitig verarbeitet; zum
              Löschen per Lösch-Code wird der Code serverseitig geprüft; beim Song-Einreichen wird
              eine kurzlebige Submit-Session nach erfolgreicher Turnstile-Prüfung vergeben
            </li>
            <li>
              <strong className="text-neutral-300">Lösch-Code:</strong> beim Einreichen wird ein
              zufälliger Code erzeugt und dir einmal angezeigt. In der Datenbank speichern wir nur
              einen kryptografischen Hash — nicht den Code selbst
            </li>
          </ul>
          <p>
            Anbieter: Supabase, Inc. (
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-400/90 hover:text-lime-300"
            >
              Datenschutzhinweise
            </a>
            ). Die Serverregion hängt von der Projektkonfiguration ab.
          </p>
          <p>
            <strong className="text-neutral-300">Cloudflare R2</strong> (Dateispeicher für Audio und
            Cover): Anbieter Cloudflare, Inc. (
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-400/90 hover:text-lime-300"
            >
              Datenschutzhinweise
            </a>
            ). Beim Abspielen oder Anzeigen von Covern ruft dein Browser die Dateien direkt von
            Cloudflare ab — ohne Cached Egress über Supabase.
          </p>
          <p>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Betrieb der Voting-Plattform) sowie Art. 6
            Abs. 1 lit. a DSGVO, soweit du durch das Einreichen eines Songs freiwillig Inhalte
            bereitstellst.
          </p>
        </Section>

        <Section title="5. Cloudflare Turnstile (Spam-Schutz beim Einreichen)">
          <p>
            Beim Einreichen eines Songs setzen wir{' '}
            <strong className="text-neutral-300">Cloudflare Turnstile</strong> ein, um automatisierte
            Massen-Einreichungen (Spam) zu verhindern. Dabei wird ein Widget von Cloudflare in die
            Seite eingebunden; die Prüfung kann sichtbar (z. B. Checkbox) oder im Hintergrund
            erfolgen.
          </p>
          <p>
            Dabei können u. a. folgende Daten verarbeitet werden: IP-Adresse, Browser- und
            Geräteinformationen, Zeitstempel sowie technische Signale zur Unterscheidung von
            menschlichen und automatisierten Zugriffen. Cloudflare kann dafür technisch notwendige
            Cookies oder vergleichbare Technologien setzen.
          </p>
          <p>
            Nach erfolgreicher Prüfung erhält dein Browser ein kurzlebiges Token. Unser Server
            tauscht dieses Token über eine Supabase Edge Function gegen eine temporäre
            Submit-Session (ca. 5 Minuten) — ohne dauerhafte Speicherung deiner IP oder des
            Turnstile-Tokens in unserer Datenbank.
          </p>
          <p>
            Anbieter: Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA (
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-400/90 hover:text-lime-300"
            >
              Datenschutzhinweise
            </a>
            ,{' '}
            <a
              href="https://developers.cloudflare.com/turnstile/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-400/90 hover:text-lime-300"
            >
              Turnstile-Dokumentation
            </a>
            ). Eine Übermittlung in ein Drittland (USA) kann stattfinden; Cloudflare stützt sich u. a.
            auf Standardvertragsklauseln.
          </p>
          <p>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren
            Betrieb der Plattform und am Schutz vor Missbrauch).
          </p>
        </Section>

        <Section title="6. Schriftarten (Google Fonts)">
          <p>
            Wir laden die Schriftart „DM Sans“ von{' '}
            <strong className="text-neutral-300">Google Fonts</strong> (Google LLC). Dabei kann deine
            IP-Adresse an Google übermittelt werden.
          </p>
          <p>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (einheitliches und lesbares Erscheinungsbild
            der Website).
          </p>
        </Section>

        <Section title="7. Externe Audio- und Link-Dienste">
          <p>
            Songs können Links zu Drittanbietern enthalten (z. B. Suno, Udio, YouTube). Beim Abspielen
            oder Aufruf dieser Inhalte gelten die Datenschutzbestimmungen der jeweiligen Anbieter. Wir
            haben darauf keinen Einfluss.
          </p>
        </Section>

        <Section title="8. Freiwillige Spenden (PayPal)">
          <p>
            Wenn du über den Link „Spende“ im Kopfbereich eine Zahlung leisten möchtest, wirst du zu{' '}
            <strong className="text-neutral-300">PayPal</strong> (PayPal (Europe) S.à r.l. et Cie,
            S.C.A. bzw. verbundene Unternehmen) weitergeleitet. Dort werden die für die Zahlung
            erforderlichen Daten (z. B. Zahlungsdaten, ggf. Name und E-Mail) von PayPal verarbeitet.
          </p>
          <p>
            Wir erhalten von PayPal in der Regel nur Informationen, die für die Zuordnung der Zahlung
            nötig sind (z. B. Betrag, Zeitpunkt, Status). Wir speichern diese Spendeninformationen
            nicht dauerhaft auf unseren Servern.
          </p>
          <p>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (deine freiwillige Entscheidung) sowie Art. 6
            Abs. 1 lit. f DSGVO (berechtigtes Interesse am Betrieb der Plattform).
          </p>
          <p>
            Datenschutzhinweise von PayPal:{' '}
            <a
              href="https://www.paypal.com/de/webapps/mpp/ua/privacy-full"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-400/90 hover:text-lime-300"
            >
              paypal.com — Datenschutz
            </a>
          </p>
        </Section>

        <Section title="9. Lokale Speicherung im Browser">
          <p>
            <strong className="text-neutral-300">Ohne Supabase:</strong> Song-Daten können im{' '}
            <code className="text-neutral-300">localStorage</code> deines Browsers gespeichert werden
            (nur lokal auf deinem Gerät). Die Match-Auswahl liegt dann in der{' '}
            <code className="text-neutral-300">sessionStorage</code> (nur bis zum Schließen des
            Tabs).
          </p>
          <p>
            <strong className="text-neutral-300">Mit Supabase:</strong> eine pseudonyme Voter-ID (
            <code className="text-neutral-300">songmash_voter_id</code>), dein persönlicher
            Vote-Zähler für Badges (<code className="text-neutral-300">songmash_user_votes</code>)
            und optional die Einstellung zum Ausblenden des Vote-Emblems (
            <code className="text-neutral-300">songmash_badge_emblem_hidden</code>) im{' '}
            <code className="text-neutral-300">localStorage</code>.
          </p>
          <p>
            <strong className="text-neutral-300">Moderation:</strong> Nach Eingabe des
            Moderator-Schlüssels wird ein Freischalt-Status in der{' '}
            <code className="text-neutral-300">sessionStorage</code> gespeichert (nur für die
            laufende Browser-Sitzung, nicht auf dem Server).
          </p>
          <p>
            <strong className="text-neutral-300">Inhalt melden:</strong> Gemeldete Song-IDs (
            <code className="text-neutral-300">songmash_content_reports</code>) und ein
            Tageszähler für Meldungen (
            <code className="text-neutral-300">songmash_content_reports_daily</code>) werden im{' '}
            <code className="text-neutral-300">localStorage</code> gespeichert — nur technische
            Kennungen, keine personenbezogenen Daten.
          </p>
          <p>
            Wir setzen kein eigenes Tracking ein. Für den Spam-Schutz beim Song-Einreichen können
            technisch notwendige Cookies von Cloudflare Turnstile gesetzt werden (siehe Abschnitt 5).
          </p>
        </Section>

        <Section title="10. Speicherdauer und Löschung">
          <p>
            Eingereichte Songs und Abstimmungen bleiben gespeichert, solange sie für den Betrieb der
            Plattform benötigt werden.
          </p>
          <p>
            Du kannst deinen eigenen Song mit dem beim Einreichen erhaltenen{' '}
            <strong className="text-neutral-300">Lösch-Code</strong> unter „Song entfernen“
            löschen. Ohne Code ist eine Zuordnung nicht möglich; dann nur Löschung durch den
            Betreiber nach Prüfung (z. B. bei berechtigten Anfragen).
          </p>
        </Section>

        <Section title="11. Deine Rechte">
          <p>Du hast gegenüber uns folgende Rechte bezüglich deiner personenbezogenen Daten:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Auskunft (Art. 15 DSGVO)</li>
            <li>Berichtigung (Art. 16 DSGVO)</li>
            <li>Löschung (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch (Art. 21 DSGVO)</li>
          </ul>
          <p>
            Wende dich dazu an die oben genannte E-Mail-Adresse. Du hast außerdem das Recht,
            Beschwerde bei einer Datenschutz-Aufsichtsbehörde einzureichen.
          </p>
        </Section>

        <Section title="12. Aufsichtsbehörde">
          <p className="whitespace-pre-line">
            Landesbeauftragter für den Datenschutz Sachsen-Anhalt
            {'\n'}
            Leiterstraße 9
            {'\n'}
            39104 Magdeburg
            {'\n'}
            <a
              href="https://datenschutz.sachsen-anhalt.de"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-400/90 hover:text-lime-300"
            >
              datenschutz.sachsen-anhalt.de
            </a>
          </p>
        </Section>

        <p className="border-t border-neutral-800 pt-6 text-xs text-neutral-600">
          Stand: {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
