import { legal } from '../config/legal'

export function buildForumPasswordRequestMailto(): string {
  const body = [
    'Hallo,',
    '',
    'ich möchte Zugang zum SongMash Community-Forum.',
    '',
    'Gewünschter Anzeigename im Forum:',
    '',
    'Ich habe mindestens einen Song auf SongMash eingereicht:',
    '',
    'Titel:',
    'Künstlername:',
    '',
    '—',
    'Gesendet über die Forum-Zugangsseite auf SongMash.',
  ].join('\n')

  const subject = 'SongMash Forum: Zugangscode-Anfrage'

  // encodeURIComponent statt URLSearchParams — iOS-Mail decodiert + oft nicht zu Leerzeichen
  return `mailto:${legal.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
