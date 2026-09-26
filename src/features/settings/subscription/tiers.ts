/** A plan as shown on a pricing card (Plan page + landing pricing teaser). */
export interface TierDisplay {
  id: 'free' | 'pro';
  name: string;
  price: string;
  period: string;
  credits: string;
  features: string[];
}

/**
 * Plans shown while the billing config (`GET /api/billing/config`) is loading
 * or unavailable. Keep in sync with the server's tier definitions.
 */
export const FALLBACK_TIERS: TierDisplay[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    credits: '50 credits (one-time)',
    features: ['AI chord generation', 'Basic MIDI export', 'Community access'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$10',
    period: '/month',
    credits: '100 credits/month',
    features: ['Access to all content'],
  },
];
