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
} as const

export function formatAddress(): string {
  const { street, postalCode, city, country } = legal.address
  return `${street}\n${postalCode} ${city}\n${country}`
}
