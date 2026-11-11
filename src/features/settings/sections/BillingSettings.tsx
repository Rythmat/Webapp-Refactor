import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/components/utilities';
import {
  getBillingUiState,
  getBillingActionLabel,
  hasPaymentIssue,
  isActivePaidState,
  BILLING_STATE_LABEL,
  BILLING_STATE_MESSAGE,
  formatPeriodDate,
  formatPaymentMethod,
  formatExpiry,
} from '@/features/settings/subscription/subscriptionUtils';
import { useStripeCheckout, useStripePortal } from '@/hooks/data/credits';
import {
  useMySubscription,
  useRefreshSubscription,
} from '@/hooks/data/subscription';
import {
  ACCOUNT_PILL,
  ACCOUNT_PILL_PRIMARY,
  AccountChip,
  SettingsGroup,
  SettingsRow,
} from '../ui/accountKit';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Billing & subscription summary, in the Account area's look (owner,
 * 2026-11-10): cards of rows, grey pills, the subscribe pill white; no teal.
 * A payment problem keeps its amber.
 *
 * Shows current subscription status, renewal dates, invoice warnings, and
 * payment-method summary. Provides a single action button whose label adapts
 * to the user's state (Subscribe / Manage Billing / Update Payment Method).
 *
 * Also reads the `?checkout` query param on mount and refreshes subscription
 * data when the user returns from Stripe Checkout or the Billing Portal.
 */
export const BillingSettings = () => {
  const { data: subscription, isLoading, isError } = useMySubscription();
  const refreshSubscription = useRefreshSubscription();
  const checkout = useStripeCheckout();
  const portal = useStripePortal();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Handle return from Stripe Checkout / Billing Portal ───────────────────
  // When Stripe redirects back, it appends ?checkout=success or ?checkout=cancelled.
  // We detect this and force-refetch subscription state so the UI is immediately current.
  useEffect(() => {
    const checkoutParam = searchParams.get('checkout');
    if (checkoutParam === 'success' || checkoutParam === 'cancelled') {
      refreshSubscription();
      // Clean up the query param so refreshes don't re-trigger.
      const next = new URLSearchParams(searchParams);
      next.delete('checkout');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshSubscription]);

  const uiState = getBillingUiState(subscription);
  const paymentIssue = hasPaymentIssue(uiState);
  const isPaidUser = isActivePaidState(uiState);
  const actionLabel = getBillingActionLabel(uiState);

  // Determine which action button to show and its handler.
  const handleAction = () => {
    if (isPaidUser) {
      portal.mutate();
    } else {
      checkout.mutate();
    }
  };
  const actionPending = checkout.isPending || portal.isPending;
  const actionError = checkout.error?.message ?? portal.error?.message ?? null;

  const periodEndDate = formatPeriodDate(subscription?.currentPeriodEnd);
  const paymentMethodLine = subscription
    ? formatPaymentMethod(subscription)
    : null;
  const expiryLine = subscription ? formatExpiry(subscription) : null;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SettingsGroup className="p-[0.909rem]">
        <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-3 w-64 animate-pulse rounded bg-white/10" />
      </SettingsGroup>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <SettingsGroup>
        <SettingsRow
          plain
          title="Subscription"
          description="Unable to load subscription information. Please try again later."
        />
      </SettingsGroup>
    );
  }

  const value = 'text-[0.795rem] text-white/70';
  const showPayment =
    uiState !== 'free_access' &&
    (paymentMethodLine ?? expiryLine ?? subscription?.billingEmail);

  return (
    <>
      <SettingsGroup>
        <SettingsRow
          plain
          title="Subscription"
          description={
            <span className={paymentIssue ? 'text-amber-400' : undefined}>
              {BILLING_STATE_MESSAGE[uiState]}
            </span>
          }
          action={
            <AccountChip>
              <span className="flex items-center gap-1">
                {uiState === 'active' || uiState === 'trialing' ? (
                  <CheckCircle2 aria-hidden className="size-3" />
                ) : paymentIssue || uiState === 'canceling' ? (
                  <AlertTriangle
                    aria-hidden
                    className="size-3 text-amber-400"
                  />
                ) : null}
                {BILLING_STATE_LABEL[uiState]}
              </span>
            </AccountChip>
          }
        />
        {periodEndDate && uiState !== 'free_access' && (
          <SettingsRow
            plain
            title={uiState === 'canceling' ? 'Access ends' : 'Renews'}
            action={<span className={value}>{periodEndDate}</span>}
          />
        )}
        {subscription?.lastInvoiceStatus && uiState !== 'free_access' && (
          <SettingsRow
            plain
            title="Last invoice"
            action={
              <span
                className={cn(
                  value,
                  'capitalize',
                  subscription.lastInvoiceStatus === 'open' && 'text-amber-400',
                )}
              >
                {subscription.lastInvoiceStatus}
              </span>
            }
          />
        )}
        {uiState === 'free_access' ? (
          subscription?.freeAccessDuration === 'temporary' &&
          subscription?.freeAccessExpiresAt ? (
            <SettingsRow
              plain
              title="Access expires"
              action={
                <span className={value}>
                  {formatPeriodDate(subscription.freeAccessExpiresAt)}
                </span>
              }
            />
          ) : (
            <SettingsRow
              plain
              title="Access"
              description="Your insider access does not expire."
            />
          )
        ) : (
          <SettingsRow
            plain
            title="Billing"
            description={
              actionError ? (
                <span className="text-red-400">{actionError}</span>
              ) : isPaidUser ? (
                'Your payment method, invoices, or cancelling. Opens Stripe.'
              ) : undefined
            }
            action={
              <button
                type="button"
                disabled={actionPending}
                className={cn(
                  ACCOUNT_PILL,
                  !isPaidUser && !paymentIssue && ACCOUNT_PILL_PRIMARY,
                  paymentIssue && 'text-amber-400',
                )}
                onClick={handleAction}
              >
                {actionPending ? 'Loading…' : actionLabel}
              </button>
            }
          />
        )}
      </SettingsGroup>

      {/* Only when the backend provides payment method data.
          TODO: backend GET /api/me/subscription does not yet return
          paymentMethodBrand / paymentMethodLast4 / exp fields.
          Add those fields to the UserBilling table query once Stripe
          payment-method retrieval is implemented server-side. */}
      {showPayment && (
        <SettingsGroup>
          {paymentMethodLine && (
            <SettingsRow
              plain
              title="Card"
              action={<span className={value}>{paymentMethodLine}</span>}
            />
          )}
          {expiryLine && (
            <SettingsRow
              plain
              title="Expires"
              action={<span className={value}>{expiryLine}</span>}
            />
          )}
          {subscription?.billingEmail && (
            <SettingsRow
              plain
              title="Billing email"
              action={
                <span className={value}>{subscription.billingEmail}</span>
              }
            />
          )}
        </SettingsGroup>
      )}
    </>
  );
};
