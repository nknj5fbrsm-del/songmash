/**
 * Pflichtangaben für Impressum — bitte vor dem Live-Betrieb ausfüllen.
 * Ohne vollständige, korrekte Angaben ist das Impressum rechtlich wirkungslos.
 */
export const legal = {
  operatorName: 'Nils Pocklitz',
  address: {
    street: 'Magdeburger Str. 5',
    postalCode: '06484',
    city: 'Quedlinburg',
    country: 'Deutschland',
  },
  email: 'anomalie-aquatisch.5n@icloud.com',
  phone: undefined as string | undefined,
  /** Verantwortlich für redaktionelle Inhalte (§ 18 Abs. 2 MStV) */
  contentResponsible: 'Nils Pocklitz',
  /** Öffentlicher PayPal-Spendenlink (Hosted Button) */
  paypalDonateUrl:
    'https://www.paypal.com/donate/?hosted_button_id=JGN9EMCZQQPY4',
} as const

export function getPaypalDonateUrl(): string | undefined {
  const fromEnv = import.meta.env.VITE_PAYPAL_DONATE_URL?.trim()
  return fromEnv || legal.paypalDonateUrl
}

export function formatAddress(): string {
  const { street, postalCode, city, country } = legal.address
  return `${street}\n${postalCode} ${city}\n${country}`
}
