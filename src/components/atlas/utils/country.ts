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

  // Natural Earth's abbreviated NAME values, which is what a polygon click
  // hands us. Without these, ten countries opened a panel with no events in
  // them even though the dataset had events there all along.
  'dem. rep. congo': 'dr congo',
  congo: 'republic of congo',
  'eq. guinea': 'equatorial guinea',
  'central african rep.': 'central african republic',
  's. sudan': 'south sudan',
  'bosnia and herz.': 'bosnia and herzegovina',
  'united arab emirates': 'uae',
  'solomon is.': 'solomon islands',
  'dominican rep.': 'dominican republic',
};

export function normCountry(x: string | undefined | null): string {
  const s = (x ?? '').trim().toLowerCase();
  if (US.has(s)) return 'US';
  if (UK.has(s)) return 'UK';
  if (CA.has(s)) return 'CA';
  return ALIASES[s] ?? s;
}

/**
 * Natural Earth's names (as a country click hands them over) where the
 * datasets spell the country another way, before folding.
 */
const NATURAL_EARTH_NAMES: Record<string, string> = {
  'United States of America': 'US',
  'United Kingdom': 'UK',
  'Republic of Korea': 'South Korea',
  Korea: 'South Korea',
  'Dem. Rep. Korea': 'North Korea',
  'Czech Republic': 'Czechia',
  // NB: no "Côte d'Ivoire" entry. There used to be one mapping it to
  // 'Ivory Coast', but Natural Earth, CITIES and the events all spell it
  // "Côte d'Ivoire" — so the alias rewrote a name that matched into one that
  // did not, and clicking the country listed nothing.
};

/**
 * A country, by Natural Earth's name (a country click, a polygon's NAME),
 * as the events' key: an event is in it when normCountry of its own country
 * is this. The country panel lists by it and the map lights the land by it,
 * so the two always agree.
 */
export function countryKey(naturalEarthName: string): string {
  return normCountry(NATURAL_EARTH_NAMES[naturalEarthName] ?? naturalEarthName);
}

export function sameCountry(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  return normCountry(a) === normCountry(b);
}
