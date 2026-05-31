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
            betreiben kein Nutzerkonto-System und setzen kein Tracking oder Werbe-Cookies ein.
          </p>
          <p>
            Beim Besuch der Website, beim Abstimmen (Voting) und beim Einreichen von Songs werden
            Daten verarbeitet — teils auf unseren Servern, teils lokal in deinem Browser.
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
              wurden, das Abstimmungsergebnis (A, B oder Skip) und Zeitstempel — ohne Zuordnung zu
              einer Person
            </li>
            <li>
              <strong className="text-neutral-300">Datei-Uploads:</strong> Audio- und
              Cover-Dateien im Storage-Bucket „song-assets“
            </li>
            <li>
              <strong className="text-neutral-300">Edge Functions:</strong> beim Einreichen externer
              Links (z. B. Suno) werden URLs serverseitig verarbeitet, um Audio für die Wiedergabe
              bereitzustellen
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
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Betrieb der Voting-Plattform) sowie Art. 6
            Abs. 1 lit. a DSGVO, soweit du durch das Einreichen eines Songs freiwillig Inhalte
            bereitstellst.
          </p>
        </Section>

        <Section title="5. Schriftarten (Google Fonts)">
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

        <Section title="6. Externe Audio- und Link-Dienste">
          <p>
            Songs können Links zu Drittanbietern enthalten (z. B. Suno, Udio, YouTube). Beim Abspielen
            oder Aufruf dieser Inhalte gelten die Datenschutzbestimmungen der jeweiligen Anbieter. Wir
            haben darauf keinen Einfluss.
          </p>
        </Section>

        <Section title="7. Lokale Speicherung im Browser">
          <p>
            <strong className="text-neutral-300">Ohne Supabase:</strong> Song-Daten können im{' '}
            <code className="text-neutral-300">localStorage</code> deines Browsers gespeichert werden
            (nur lokal auf deinem Gerät).
          </p>
          <p>
            <strong className="text-neutral-300">Moderation:</strong> Nach Eingabe des
            Moderator-Schlüssels wird ein Freischalt-Status in der{' '}
            <code className="text-neutral-300">sessionStorage</code> gespeichert (nur für die
            laufende Browser-Sitzung, nicht auf dem Server).
          </p>
          <p>Es werden keine Tracking-Cookies gesetzt.</p>
        </Section>

        <Section title="8. Speicherdauer">
          <p>
            Eingereichte Songs und Abstimmungen bleiben gespeichert, solange sie für den Betrieb der
            Plattform benötigt werden. Songs können durch Moderation entfernt werden. Auf Anfrage
            prüfen wir die Löschung personenbezogener Inhalte, soweit uns diese zuordenbar sind.
          </p>
        </Section>

        <Section title="9. Deine Rechte">
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

        <Section title="10. Aufsichtsbehörde">
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
