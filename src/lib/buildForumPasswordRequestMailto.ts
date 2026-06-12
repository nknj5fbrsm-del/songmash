import { legal } from '../config/legal'

export function buildForumPasswordRequestMailto(): string {
  const body = [
    'Hallo,',
    '',
    'ich möchte Zugang zum SongMash Community-Forum.',
    '',
    'Ich habe mindestens einen Song auf SongMash eingereicht:',
    '',
    'Titel: ',
    'Künstlername: ',
    '',
    '—',
    'Gesendet über die Forum-Zugangsseite auf SongMash.',
  ].join('\n')

  const params = new URLSearchParams({
    subject: 'SongMash Forum: Passwort-Anfrage',
    body,
  })

  return `mailto:${legal.email}?${params.toString()}`
}
