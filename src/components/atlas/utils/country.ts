// The event/city datasets store country inconsistently ('US' vs 'United States',
// 'UK' vs 'GB', 'Canada' vs 'CA'). Fold the common variants to one token so
// same-named cities in different countries (Birmingham UK vs AL) don't collide.

const US = new Set([
  'us',
  'usa',
  'united states',
  'united states of america',
  'u.s.',
  'u.s.a.',
]);
const UK = new Set([
  'uk',
  'gb',
  'gbr',
  'united kingdom',
  'great britain',
  'britain',
  'england',
  'scotland',
  'wales',
  'northern ireland',
]);
const CA = new Set(['ca', 'can', 'canada']);

/**
 * Other spellings the event data uses for a country CITIES names in full.
 *
 * The song-derived events inherited ISO-2 codes from artistLocations.json
 * (`NO` for a-ha's Oslo, `JM` for Bob Marley's Kingston), so without these,
 * clicking Norway on the globe listed no a-ha and Jamaica missed most of its
 * reggae. Values are the lowercased CITIES name each variant folds to.
 */
const ALIASES: Record<string, string> = {
  au: 'australia',
  bb: 'barbados',
  fr: 'france',
  ie: 'ireland',
  is: 'iceland',
  jm: 'jamaica',
  nl: 'netherlands',
  no: 'norway',
  nz: 'new zealand',
  pr: 'puerto rico',
  se: 'sweden',
  'democratic republic of the congo': 'dr congo',
};

export function normCountry(x: string | undefined | null): string {
  const s = (x ?? '').trim().toLowerCase();
  if (US.has(s)) return 'US';
  if (UK.has(s)) return 'UK';
  if (CA.has(s)) return 'CA';
  return ALIASES[s] ?? s;
}

export function sameCountry(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  return normCountry(a) === normCountry(b);
}
