import { SITE_ORIGIN } from '@/constants/hosts';
import { FALLBACK_TIERS } from '@/features/settings/subscription/tiers';

/**
 * Landing SEO copy. Must match the static tags in `index.html` (what no-JS
 * social scrapers read) — react-helmet only enhances them for JS crawlers.
 */
export const LANDING_TITLE = 'Music Atlas';

export const LANDING_DESCRIPTION =
  'Music Atlas pairs a real music-theory engine with a full browser studio — go from understanding harmony to making your first real track, right in your browser.';

export const LANDING_URL = `${SITE_ORIGIN}/`;

/** schema.org SoftwareApplication with the public plans as offers. */
export const LANDING_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Music Atlas',
  url: LANDING_URL,
  description: LANDING_DESCRIPTION,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web browser',
  offers: FALLBACK_TIERS.map((tier) => ({
    '@type': 'Offer',
    name: tier.name,
    price: tier.price.replace('$', ''),
    priceCurrency: 'USD',
  })),
});
