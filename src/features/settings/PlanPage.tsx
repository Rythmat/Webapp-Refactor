import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/components/utilities';
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
  trackCheckoutStarted,
  trackSubscriptionActivated,
} from '@/telemetry/hooks/useTelemetryProduct';
import {
  getBillingUiState,
  hasPaymentIssue,
  isActivePaidState,
  BILLING_STATE_LABEL,
  BILLING_STATE_MESSAGE,
  formatPeriodDate,
} from './subscription/subscriptionUtils';
import { FALLBACK_TIERS } from './subscription/tiers';
import {
  ACCOUNT_PILL,
  ACCOUNT_PILL_PRIMARY,
  AccountChip,
  SettingsGroup,
  SettingsRow,
} from './ui/accountKit';

/**
 * The plans and credits, in the Account area's look (owner, 2026-11-10,
 * Samply's subscription layout in the app's own colours: no teal, no
 * yellow). `embedded`: inside Account › Subscription, under that page's own
 * title, so its header, width and status (the Billing section's) step aside.
 */
export const PlanPage = ({ embedded = false }: { embedded?: boolean }) => {
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
      if (checkoutParam === 'success') {
        trackSubscriptionActivated();
      }
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
      <div
        className={cn(
          'flex flex-col gap-[0.455rem]',
          !embedded && 'mx-auto max-w-3xl',
        )}
      >
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-[0.455rem] border border-white/[0.08] bg-white/[0.05]"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-[1.364rem]',
        !embedded && 'mx-auto max-w-3xl',
      )}
    >
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold">Subscription Plan</h1>
          <p className="mt-1 text-white/[0.48]">
            Manage your subscription and credits.
          </p>
        </div>
      )}

      {/* ── Subscription status (embedded, the Billing section has it) ──── */}
      {!embedded && uiState !== 'unknown' && (
        <SettingsGroup>
          <SettingsRow
            plain
            title={
              <span className="flex items-center gap-2">
                {paymentIssue ? (
                  <AlertTriangle
                    aria-hidden
                    className="size-4 text-amber-400"
                  />
                ) : uiState === 'active' || uiState === 'trialing' ? (
                  <CheckCircle2 aria-hidden className="size-4" />
                ) : null}
                {BILLING_STATE_LABEL[uiState]}
              </span>
            }
            description={BILLING_STATE_MESSAGE[uiState]}
            action={
              periodEndDate &&
              (isPaidUser || subscription?.cancelAtPeriodEnd) ? (
                <span className="text-[0.795rem] text-white/70">
                  {subscription?.cancelAtPeriodEnd
                    ? `Ends ${periodEndDate}`
                    : `Renews ${periodEndDate}`}
                </span>
              ) : undefined
            }
          />
        </SettingsGroup>
      )}

      {/* ── The plans, as Samply's: one card each, 8px apart ─────────────── */}
      <div className="flex flex-col gap-[0.455rem]">
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
              data-plan={tier.id}
              className="flex flex-col gap-[0.909rem] rounded-[0.455rem] border border-white/[0.08] bg-white/[0.05] p-[0.909rem] sm:flex-row"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[0.227rem]">
                <div className="flex items-center gap-[0.455rem]">
                  <h3 className="text-[0.909rem] font-semibold leading-[1.364rem] text-white">
                    {tier.name}
                  </h3>
                  {isCurrent && <AccountChip>Current plan</AccountChip>}
                </div>
                <p className="text-[0.795rem] leading-[1.136rem] text-white/[0.48]">
                  {tier.price === '$0'
                    ? 'Free forever'
                    : `${tier.price}${tier.period}`}{' '}
                  ·{' '}
                  {/^\d+$/.test(String(tier.credits))
                    ? `${tier.credits} credits`
                    : tier.credits}
                </p>
                {isCurrent && isPaidUser && periodEndDate && (
                  <p className="text-[0.682rem] leading-[0.909rem] text-white/[0.48]">
                    {subscription?.cancelAtPeriodEnd
                      ? `Access until ${periodEndDate}`
                      : `Next billing: ${periodEndDate}`}
                  </p>
                )}
                {canUpgrade && (
                  <button
                    type="button"
                    className={cn(
                      ACCOUNT_PILL,
                      ACCOUNT_PILL_PRIMARY,
                      'mt-[0.909rem] self-start',
                    )}
                    disabled={checkout.isPending}
                    onClick={() => {
                      trackCheckoutStarted();
                      checkout.mutate();
                    }}
                  >
                    {checkout.isPending ? 'Loading…' : 'Upgrade'}
                  </button>
                )}
              </div>
              <ul className="flex min-w-0 flex-1 flex-col gap-[0.227rem]">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-[0.682rem] text-[0.795rem] leading-[1.136rem] text-white"
                  >
                    <Check
                      aria-hidden
                      className="size-[0.909rem] shrink-0 text-white/60"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ── Credits, as Samply's storage: a ring and its figure ─────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-[0.682rem]">
          <svg
            aria-hidden
            viewBox="0 0 32 32"
            className="size-[1.818rem] -rotate-90"
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="rgb(255 255 255 / 0.25)"
              strokeWidth="2"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="rgb(255 255 255 / 0.6)"
              strokeWidth="2"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${usagePercent} 100`}
            />
          </svg>
          <div className="flex flex-col">
            <span className="text-[0.682rem] leading-[0.909rem] text-white/[0.48]">
              Credits left
            </span>
            <span className="text-[0.795rem] leading-[1.136rem] text-white">
              {balance} of {allowance}
            </span>
          </div>
        </div>
        {credits?.lifetimeUsed !== undefined && (
          <span className="text-[0.682rem] text-white/[0.48]">
            {credits.lifetimeUsed} used all time
          </span>
        )}
      </div>

      {/* ── Checkout/portal errors ────────────────────────────────────────── */}
      {(checkout.error ?? portal.error) && (
        <p className="text-[0.795rem] text-red-400">
          {checkout.error?.message ?? portal.error?.message}
        </p>
      )}

      {/* ── Manage billing ─────────────────────────────────────────────────
          Embedded, Account › Subscription's own Billing section has it. */}
      {isPaidUser && !embedded && (
        <SettingsGroup>
          <SettingsRow
            plain
            title="Billing"
            description="Manage your payment method, view invoices, or cancel your subscription."
            action={
              <button
                type="button"
                className={ACCOUNT_PILL}
                disabled={portal.isPending}
                onClick={() => portal.mutate()}
              >
                {portal.isPending ? 'Loading…' : 'Manage billing'}
              </button>
            }
          />
        </SettingsGroup>
      )}
    </div>
  );
};
