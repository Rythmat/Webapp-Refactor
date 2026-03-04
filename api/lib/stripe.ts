import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
});

export const TIER_PRICES: Record<string, string | undefined> = {
  artist: process.env.STRIPE_PRICE_ARTIST,
  studio: process.env.STRIPE_PRICE_STUDIO,
};

export const TIER_CREDITS: Record<string, number> = {
  free: 50,
  artist: 100,
  studio: 200,
};
