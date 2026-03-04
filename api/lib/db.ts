import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ── Subscription ─────────────────────────────────────────

export interface SubscriptionData {
  tier: 'free' | 'artist' | 'studio';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: number | null;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  tier: 'free',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  currentPeriodEnd: null,
};

export async function getSubscription(userId: string): Promise<SubscriptionData> {
  const data = await kv.get<SubscriptionData>(`user:${userId}:subscription`);
  return data ?? DEFAULT_SUBSCRIPTION;
}

export async function setSubscription(userId: string, data: Partial<SubscriptionData>): Promise<void> {
  const current = await getSubscription(userId);
  await kv.set(`user:${userId}:subscription`, { ...current, ...data });
}

// ── Credits ──────────────────────────────────────────────

export interface CreditData {
  balance: number;
  lifetimeUsed: number;
  lastRefresh: number;
}

const DEFAULT_CREDITS: CreditData = {
  balance: 0,
  lifetimeUsed: 0,
  lastRefresh: 0,
};

export async function getCredits(userId: string): Promise<CreditData> {
  const data = await kv.get<CreditData>(`user:${userId}:credits`);
  return data ?? DEFAULT_CREDITS;
}

export async function setCredits(userId: string, data: Partial<CreditData>): Promise<void> {
  const current = await getCredits(userId);
  await kv.set(`user:${userId}:credits`, { ...current, ...data });
}

export async function consumeCredit(userId: string): Promise<{ success: boolean; remaining: number }> {
  const credits = await getCredits(userId);

  if (credits.balance <= 0) {
    return { success: false, remaining: 0 };
  }

  const newBalance = credits.balance - 1;
  await setCredits(userId, {
    balance: newBalance,
    lifetimeUsed: credits.lifetimeUsed + 1,
  });

  return { success: true, remaining: newBalance };
}

export async function initializeFreeCredits(userId: string): Promise<void> {
  const existing = await kv.get(`user:${userId}:credits`);
  if (existing) return; // Don't overwrite existing credits

  await setCredits(userId, {
    balance: 50,
    lifetimeUsed: 0,
    lastRefresh: Date.now(),
  });
}

export async function refreshCredits(userId: string, tierAllowance: number): Promise<void> {
  await setCredits(userId, {
    balance: tierAllowance,
    lastRefresh: Date.now(),
  });
}

// ── Lookup helpers ───────────────────────────────────────

export async function findUserByStripeCustomer(customerId: string): Promise<string | null> {
  return kv.get<string>(`stripe:customer:${customerId}`);
}

export async function linkStripeCustomer(userId: string, customerId: string): Promise<void> {
  await kv.set(`stripe:customer:${customerId}`, userId);
}
