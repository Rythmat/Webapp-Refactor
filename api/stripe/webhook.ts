import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { stripe, TIER_CREDITS } from '../lib/stripe';
import {
  setSubscription,
  refreshCredits,
  linkStripeCustomer,
  findUserByStripeCustomer,
} from '../lib/db';

// Disable body parsing — Stripe needs the raw body for signature verification
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function tierFromPriceId(priceId: string): 'artist' | 'studio' | null {
  if (priceId === process.env.STRIPE_PRICE_ARTIST) return 'artist';
  if (priceId === process.env.STRIPE_PRICE_STUDIO) return 'studio';
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;

        if (!userId || !customerId) break;

        // Link Stripe customer to user
        await linkStripeCustomer(userId, customerId);

        // Get subscription details
        const subscriptionId = session.subscription as string;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price.id;
          const tier = priceId ? tierFromPriceId(priceId) : null;

          if (tier) {
            await setSubscription(userId, {
              tier,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: sub.current_period_end,
            });

            await refreshCredits(userId, TIER_CREDITS[tier]);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = await findUserByStripeCustomer(customerId);
        if (!userId) break;

        const priceId = sub.items.data[0]?.price.id;
        const tier = priceId ? tierFromPriceId(priceId) : null;

        if (tier) {
          await setSubscription(userId, {
            tier,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: sub.current_period_end,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = await findUserByStripeCustomer(customerId);
        if (!userId) break;

        await setSubscription(userId, {
          tier: 'free',
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await findUserByStripeCustomer(customerId);
        if (!userId) break;

        // Only refresh credits for subscription invoices (not one-time)
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const priceId = sub.items.data[0]?.price.id;
          const tier = priceId ? tierFromPriceId(priceId) : null;

          if (tier) {
            await refreshCredits(userId, TIER_CREDITS[tier]);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`Payment failed for customer ${invoice.customer}, invoice ${invoice.id}`);
        // Stripe handles retries automatically. Could send a notification here.
        break;
      }
    }
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }

  return res.status(200).json({ received: true });
}
