// Country name -> ISO 3166-1 alpha-2 code. A few names need explicit mapping
// (Congo DR, Cabo Verde, Ivory Coast, Bosnia). England has no country code and
// uses the subdivision flag emoji instead (handled below).
const ISO: Record<string, string> = {
  'South Africa': 'ZA',
  Canada: 'CA',
  Germany: 'DE',
  Paraguay: 'PY',
  Netherlands: 'NL',
  Morocco: 'MA',
  Brazil: 'BR',
  Japan: 'JP',
  France: 'FR',
  Sweden: 'SE',
  'Ivory Coast': 'CI',
  Norway: 'NO',
  Mexico: 'MX',
  Ecuador: 'EC',
  'Congo DR': 'CD',
  'United States': 'US',
  Bosnia: 'BA',
  Belgium: 'BE',
  Senegal: 'SN',
  Portugal: 'PT',
  Croatia: 'HR',
  Spain: 'ES',
  Austria: 'AT',
  Switzerland: 'CH',
  Algeria: 'DZ',
  Argentina: 'AR',
  'Cabo Verde': 'CV',
  Colombia: 'CO',
  Ghana: 'GH',
  Australia: 'AU',
  Egypt: 'EG',
}

/** England's subdivision flag emoji (St George's cross). */
const ENGLAND = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'

/** Returns an emoji flag for a team name, or an empty string if unknown. */
export function flagFor(team: string): string {
  if (team === 'England') return ENGLAND
  const code = ISO[team]
  if (!code) return ''
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)),
  )
}
