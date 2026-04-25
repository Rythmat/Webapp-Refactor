/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle2, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  useBillingConfig,
  useCreditsBalance,
  useStripeCheckout,
  useStripePortal,
} from '@/hooks/data/credits';
import {
  useMySubscription,
  useRefreshSubscription,
} from '@/hooks/data/subscription';
import {
  getBillingUiState,
  hasPaymentIssue,
  isActivePaidState,
  BILLING_STATE_LABEL,
  BILLING_STATE_MESSAGE,
  formatPeriodDate,
} from './subscription/subscriptionUtils';

const FALLBACK_TIERS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    credits: '50 credits (one-time)',
    features: ['AI chord generation', 'Basic MIDI export', 'Community access'],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$10',
    period: '/month',
    credits: '100 credits/month',
    features: ['Access to all content'],
  },
];

export const PlanPage = () => {
  const { data: billingConfig } = useBillingConfig();
  const { data: credits, isLoading: creditsLoading } = useCreditsBalance();
  const { data: subscription, isLoading: subLoading } = useMySubscription();
  const queryClient = useQueryClient();
  const refreshSubscription = useRefreshSubscription();
  const checkout = useStripeCheckout();
  const portal = useStripePortal();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Handle return from Stripe Checkout / Billing Portal ──────────────────
  // Stripe redirects back with ?checkout=success or ?checkout=cancelled.
  // Force-refetch subscription state so the plan page reflects the new status.
  useEffect(() => {
    const checkoutParam = searchParams.get('checkout');
    if (checkoutParam === 'success' || checkoutParam === 'cancelled') {
      refreshSubscription();
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      const next = new URLSearchParams(searchParams);
      next.delete('checkout');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshSubscription]);

  const uiState = getBillingUiState(subscription);
  const paymentIssue = hasPaymentIssue(uiState);
  const isPaidUser = isActivePaidState(uiState);
  const periodEndDate = formatPeriodDate(subscription?.currentPeriodEnd);

  const tiers = billingConfig?.tiers ?? FALLBACK_TIERS;
  const tierAllowance = Object.fromEntries(
    tiers.map((tier) => [tier.id, tier.credits]),
  ) as Record<string, number>;

  const currentTier = isPaidUser ? 'pro' : (credits?.tier ?? 'free');
  const balance = credits?.balance ?? 0;
  const allowance = tierAllowance[currentTier] ?? 50;
  const usagePercent = Math.min(100, Math.round((balance / allowance) * 100));

  const isLoading = creditsLoading || subLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Subscription Plan</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription and credits.
        </p>
      </div>

      {/* ── Subscription status banner ────────────────────────────────────── */}
      {uiState !== 'unknown' && (
        <div
          className="flex items-start gap-3 rounded-lg border p-4"
          style={
            paymentIssue
              ? {
                  borderColor: 'rgba(245,158,11,0.35)',
                  background: 'rgba(245,158,11,0.06)',
                }
              : uiState === 'active' || uiState === 'trialing'
                ? {
                    borderColor: 'rgba(34,197,94,0.25)',
                    background: 'rgba(34,197,94,0.06)',
                  }
                : {}
          }
        >
          {paymentIssue ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          ) : uiState === 'active' || uiState === 'trialing' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-400" />
          ) : null}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {BILLING_STATE_LABEL[uiState]}
              </span>
              {subscription?.cancelAtPeriodEnd && periodEndDate && (
                <span className="text-xs text-muted-foreground">
                  · Ends {periodEndDate}
                </span>
              )}
              {!subscription?.cancelAtPeriodEnd &&
                periodEndDate &&
                isPaidUser && (
                  <span className="text-xs text-muted-foreground">
                    · Renews {periodEndDate}
                  </span>
                )}
            </div>
            <p className="text-sm text-muted-foreground">
              {BILLING_STATE_MESSAGE[uiState]}
            </p>
          </div>
        </div>
      )}

      {/* ── Credit usage ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            <span className="font-medium">Credits</span>
          </div>
          <span className="text-sm text-muted-foreground capitalize">
            {currentTier} plan
          </span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span>{balance} remaining</span>
            <span className="text-muted-foreground">{allowance} total</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
        {credits?.lifetimeUsed !== undefined && (
          <p className="mt-2 text-xs text-muted-foreground">
            {credits.lifetimeUsed} credits used all time
          </p>
        )}
      </div>

      {/* ── Tier cards ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {tiers.map((tier) => {
          const isCurrent = currentTier === tier.id;
          const canUpgrade =
            tier.id !== 'free' &&
            !isCurrent &&
            tiers.findIndex((t) => t.id === tier.id) >
              tiers.findIndex((t) => t.id === currentTier);

          return (
            <div
              key={tier.id}
              className={`flex flex-col rounded-lg border p-6 ${
                isCurrent
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{tier.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-sm text-muted-foreground">
                  {tier.period}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {tier.credits}
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent && isPaidUser && periodEndDate && (
                  <p className="mb-2 text-center text-xs text-muted-foreground">
                    {subscription?.cancelAtPeriodEnd
                      ? `Access until ${periodEndDate}`
                      : `Next billing: ${periodEndDate}`}
                  </p>
                )}
                {isCurrent ? (
                  <Button className="w-full" disabled variant="outline">
                    Current plan
                  </Button>
                ) : canUpgrade ? (
                  <Button
                    className="w-full"
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate()}
                  >
                    {checkout.isPending
                      ? 'Loading…'
                      : `Upgrade to ${tier.name}`}
                  </Button>
                ) : (
                  <Button className="w-full" disabled variant="outline">
                    {tier.id === 'free' ? 'Free plan' : 'Current or lower'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Checkout/portal errors ────────────────────────────────────────── */}
      {(checkout.error ?? portal.error) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {checkout.error?.message ?? portal.error?.message}
        </div>
      )}

      {/* ── Manage billing ───────────────────────────────────────────────── */}
      {isPaidUser && (
        <div className="rounded-lg border p-6">
          <h3 className="font-medium">Billing</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your payment method, view invoices, or cancel your
            subscription.
          </p>
          <Button
            className="mt-4"
            disabled={portal.isPending}
            variant="outline"
            onClick={() => portal.mutate()}
          >
            {portal.isPending ? 'Loading…' : 'Manage billing'}
          </Button>
        </div>
      )}
    </div>
  );
};
