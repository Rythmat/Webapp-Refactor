import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getBillingUiState,
  isActivePaidState,
} from '@/features/settings/subscription/subscriptionUtils';

/**
 * The dev bypass's subscription (src/auth/devBypass.ts): premium by default,
 * a free account with `VITE_DEV_AUTH_BYPASS_PLAN=free`, so the premium gates
 * can be seen as a free student meets them. The flags are read when the
 * module loads, so each case loads it fresh. Every case sets the plan, unset
 * included, so a developer's own .env.local (which may well pick the free
 * plan) can't change the outcome.
 */
async function subscriptionWith(plan: string | undefined) {
  vi.resetModules();
  vi.stubEnv('VITE_DEV_AUTH_BYPASS_PLAN', plan);
  const { DEV_BYPASS_SUBSCRIPTION } = await import('../devBypass');
  return DEV_BYPASS_SUBSCRIPTION;
}

const premiumOf = (s: Awaited<ReturnType<typeof subscriptionWith>>) =>
  isActivePaidState(getBillingUiState(s ?? undefined));

describe('the dev bypass plan', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is premium by default', async () => {
    const s = await subscriptionWith(undefined);
    expect(s).toMatchObject({
      hasPaidAccess: true,
      subscriptionStatus: 'active',
    });
    expect(premiumOf(s)).toBe(true);
  });

  it('is a free account, with no subscription, when the plan is free', async () => {
    const s = await subscriptionWith('free');
    expect(s).toEqual({
      hasPaidAccess: false,
      subscriptionStatus: null,
      cancelAtPeriodEnd: false,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      lastInvoiceStatus: null,
    });
    expect(getBillingUiState(s ?? undefined)).toBe('free');
    expect(premiumOf(s)).toBe(false);
  });

  it('stays premium for any other plan value', async () => {
    expect(premiumOf(await subscriptionWith('premium'))).toBe(true);
    expect(premiumOf(await subscriptionWith('FREE'))).toBe(true);
  });
});
