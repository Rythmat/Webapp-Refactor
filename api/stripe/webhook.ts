/* eslint-disable import/no-default-export, sonarjs/cognitive-complexity */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { resolveApiBaseUrl } from '../lib/apiProxy';
import { stripe } from '../lib/stripe';

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

async function pushInternalBillingEvent(params: {
  req: VercelRequest;
  payload: {
    event:
      | 'checkout.session.completed'
      | 'customer.subscription.updated'
      | 'customer.subscription.deleted'
      | 'invoice.payment_succeeded';
    customerId: string;
    userId?: string;
    tier?: 'free' | 'artist' | 'studio';
    stripeSubscriptionId?: string | null;
    stripePeriodEnd?: number | null;
  };
}) {
  const apiBaseUrl = resolveApiBaseUrl(params.req);
  const internalToken = process.env.BILLING_INTERNAL_TOKEN;

  if (!internalToken) {
    throw new Error('Missing BILLING_INTERNAL_TOKEN');
  }

  const response = await fetch(
    `${apiBaseUrl.replace(/\/$/, '')}/api/billing/internal/stripe-event`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-billing-internal-token': internalToken,
      },
      body: JSON.stringify(params.payload),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Billing sync failed (${response.status}): ${text}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res
      .status(400)
      .json({ error: 'Missing signature or webhook secret' });
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

        const subscriptionId = session.subscription as string;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price.id;
          const tier = priceId ? tierFromPriceId(priceId) : null;

          if (tier) {
            await pushInternalBillingEvent({
              req,
              payload: {
                event: 'checkout.session.completed',
                userId,
                customerId,
                tier,
                stripeSubscriptionId: subscriptionId,
                stripePeriodEnd: sub.current_period_end,
              },
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const priceId = sub.items.data[0]?.price.id;
        const tier = priceId ? tierFromPriceId(priceId) : null;

        if (tier) {
          await pushInternalBillingEvent({
            req,
            payload: {
              event: 'customer.subscription.updated',
              customerId,
              tier,
              stripeSubscriptionId: sub.id,
              stripePeriodEnd: sub.current_period_end,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await pushInternalBillingEvent({
          req,
          payload: {
            event: 'customer.subscription.deleted',
            customerId,
            tier: 'free',
            stripeSubscriptionId: null,
            stripePeriodEnd: null,
          },
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            invoice.subscription as string,
          );
          const priceId = sub.items.data[0]?.price.id;
          const tier = priceId ? tierFromPriceId(priceId) : null;

          if (tier) {
            await pushInternalBillingEvent({
              req,
              payload: {
                event: 'invoice.payment_succeeded',
                customerId,
                tier,
                stripeSubscriptionId: sub.id,
                stripePeriodEnd: sub.current_period_end,
              },
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          `Payment failed for customer ${invoice.customer}, invoice ${invoice.id}`,
        );
        break;
      }
    }
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }

  return res.status(200).json({ received: true });
}
