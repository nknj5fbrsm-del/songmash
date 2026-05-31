import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatAddress, legal } from '../config/legal'

interface ImpressumPageProps {
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

export function ImpressumPage({ onBack }: ImpressumPageProps) {
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
        <h1 className="mb-2 text-2xl font-bold text-neutral-50">Impressum</h1>
        <p className="mb-8 text-sm text-neutral-500">Angaben gemäß § 5 DDG</p>

        <Section title="Anbieter">
          <p className="whitespace-pre-line">
            {legal.operatorName}
            {'\n'}
            {formatAddress()}
          </p>
        </Section>

        <Section title="Kontakt">
          <p>
            E-Mail:{' '}
            <a href={`mailto:${legal.email}`} className="text-lime-400/90 hover:text-lime-300">
              {legal.email}
            </a>
          </p>
          {legal.phone && <p>Telefon: {legal.phone}</p>}
        </Section>

        <Section title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
          <p className="whitespace-pre-line">
            {legal.contentResponsible}
            {'\n'}
            {formatAddress()}
          </p>
        </Section>

        <Section title="Haftung für Inhalte">
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
            nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
            Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
            Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
            Tätigkeit hinweisen.
          </p>
          <p>
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
            allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch
            erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
            Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
            entfernen.
          </p>
        </Section>

        <Section title="Haftung für Links">
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter (z. B. Suno, Audio-Quellen),
            auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte
            auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der
            jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </p>
        </Section>

        <Section title="Urheberrecht">
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
            dem deutschen Urheberrecht. Beiträge Dritter (eingereichte Songs, Cover, Texte) sind
            Eigentum der jeweiligen Rechteinhaber. Die Veröffentlichung erfolgt durch die
            einreichenden Nutzer in eigenem Namen.
          </p>
        </Section>

        <p className="border-t border-neutral-800 pt-6 text-xs text-neutral-600">
          Stand: {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
