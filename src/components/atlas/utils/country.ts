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

export function normCountry(x: string | undefined | null): string {
  const s = (x ?? '').trim().toLowerCase();
  if (US.has(s)) return 'US';
  if (UK.has(s)) return 'UK';
  if (CA.has(s)) return 'CA';
  return s;
}

export function sameCountry(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  return normCountry(a) === normCountry(b);
}
