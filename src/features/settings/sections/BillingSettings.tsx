/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

// ── Shared style tokens (match existing AccountSettings patterns) ─────────────

const HEADING: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--color-text)',
};

const PANEL: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
};

const LABEL: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-dim)',
};

const BTN_OUTLINE: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--color-accent)',
  border: '1px solid var(--color-accent)',
  borderRadius: '9999px',
  padding: '0.375rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
};

const BTN_ACCENT: React.CSSProperties = {
  background: 'var(--color-accent)',
  color: '#111',
  border: 'none',
  borderRadius: '9999px',
  padding: '0.375rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
};

const BTN_WARN: React.CSSProperties = {
  background: 'transparent',
  color: '#f59e0b',
  border: '1px solid #f59e0b',
  borderRadius: '9999px',
  padding: '0.375rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
};

// ── Badge colours ─────────────────────────────────────────────────────────────

const badgeStyle = (
  variant: 'positive' | 'warning' | 'neutral' | 'muted',
): React.CSSProperties => {
  const map: Record<typeof variant, React.CSSProperties> = {
    positive: {
      background: 'rgba(34,197,94,0.12)',
      color: '#4ade80',
      border: '1px solid rgba(34,197,94,0.25)',
    },
    warning: {
      background: 'rgba(245,158,11,0.12)',
      color: '#fbbf24',
      border: '1px solid rgba(245,158,11,0.25)',
    },
    neutral: {
      background: 'rgba(255,255,255,0.06)',
      color: 'var(--color-text-dim)',
      border: '1px solid var(--color-border)',
    },
    muted: {
      background: 'rgba(255,255,255,0.03)',
      color: 'var(--color-text-dim)',
      border: '1px solid var(--color-border)',
    },
  };
  return {
    ...map[variant],
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    borderRadius: '9999px',
    padding: '0.2rem 0.6rem',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Billing & subscription summary for the ProfilePage.
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

  const badgeVariant =
    uiState === 'active' || uiState === 'trialing' || uiState === 'free_access'
      ? 'positive'
      : paymentIssue
        ? 'warning'
        : uiState === 'canceling'
          ? 'warning'
          : 'neutral';

  const periodEndDate = formatPeriodDate(subscription?.currentPeriodEnd);
  const paymentMethodLine = subscription
    ? formatPaymentMethod(subscription)
    : null;
  const expiryLine = subscription ? formatExpiry(subscription) : null;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <h2 style={HEADING}>Billing</h2>
        <div style={PANEL} className="space-y-3">
          <div
            className="h-4 w-24 animate-pulse rounded"
            style={{ background: 'var(--color-border)' }}
          />
          <div
            className="h-3 w-64 animate-pulse rounded"
            style={{ background: 'var(--color-border)' }}
          />
          <div
            className="h-8 w-32 animate-pulse rounded-full"
            style={{ background: 'var(--color-border)' }}
          />
        </div>
      </>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <>
        <h2 style={HEADING}>Billing</h2>
        <div style={PANEL}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
            Unable to load subscription information. Please try again later.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 style={HEADING}>Billing</h2>

      {/* ── Return-from-checkout success notice ──────────────────────────── */}

      {/* ── Status card ──────────────────────────────────────────────────── */}
      <div style={PANEL} className="space-y-4">
        {/* Status row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span style={LABEL}>Subscription</span>
          <span style={badgeStyle(badgeVariant)}>
            {uiState === 'active' || uiState === 'trialing' ? (
              <CheckCircle2 size={10} />
            ) : paymentIssue || uiState === 'canceling' ? (
              <AlertTriangle size={10} />
            ) : null}
            {BILLING_STATE_LABEL[uiState]}
          </span>
        </div>

        {/* Status message */}
        <p
          style={{
            fontSize: '0.875rem',
            color: paymentIssue ? '#fbbf24' : 'var(--color-text-dim)',
          }}
        >
          {BILLING_STATE_MESSAGE[uiState]}
        </p>

        {/* Period end date */}
        {periodEndDate && uiState !== 'free_access' && (
          <div className="flex items-center justify-between">
            <span style={LABEL}>
              {uiState === 'canceling' ? 'Access ends' : 'Renews'}
            </span>
            <span
              style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}
            >
              {periodEndDate}
            </span>
          </div>
        )}

        {/* Last invoice status */}
        {subscription?.lastInvoiceStatus && uiState !== 'free_access' && (
          <div className="flex items-center justify-between">
            <span style={LABEL}>Last invoice</span>
            <span
              style={{
                fontSize: '0.875rem',
                color:
                  subscription.lastInvoiceStatus === 'paid'
                    ? '#4ade80'
                    : subscription.lastInvoiceStatus === 'open'
                      ? '#fbbf24'
                      : 'var(--color-text-dim)',
                textTransform: 'capitalize',
              }}
            >
              {subscription.lastInvoiceStatus}
            </span>
          </div>
        )}

        {/* Action button */}
        {uiState === 'free_access' ? (
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
            {subscription?.freeAccessDuration === 'temporary' &&
            subscription?.freeAccessExpiresAt ? (
              <div className="flex items-center justify-between">
                <span style={LABEL}>Access expires</span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-dim)',
                  }}
                >
                  {formatPeriodDate(subscription.freeAccessExpiresAt)}
                </span>
              </div>
            ) : (
              <p>Your insider access does not expire.</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={actionPending}
              style={
                paymentIssue ? BTN_WARN : isPaidUser ? BTN_OUTLINE : BTN_ACCENT
              }
              onClick={handleAction}
            >
              {actionPending ? 'Loading…' : actionLabel}
            </button>

            {isPaidUser && (
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <ExternalLink size={10} /> Opens Stripe
              </span>
            )}
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <p
            style={{
              fontSize: '0.75rem',
              color: '#f87171',
              marginTop: '0.25rem',
            }}
          >
            {actionError}
          </p>
        )}
      </div>

      {/* ── Payment method ────────────────────────────────────────────────── */}
      {/* Only rendered when the backend provides payment method data.
          TODO: backend GET /api/me/subscription does not yet return
          paymentMethodBrand / paymentMethodLast4 / exp fields.
          Add those fields to the UserBilling table query once Stripe
          payment-method retrieval is implemented server-side. */}
      {uiState !== 'free_access' &&
        (paymentMethodLine ?? expiryLine ?? subscription?.billingEmail) && (
          <>
            <h2 style={{ ...HEADING, marginTop: '1.5rem' }}>Payment Method</h2>
            <div style={PANEL} className="space-y-3">
              {paymentMethodLine && (
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      ...LABEL,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <CreditCard size={11} /> Card
                  </span>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text-dim)',
                    }}
                  >
                    {paymentMethodLine}
                  </span>
                </div>
              )}
              {expiryLine && (
                <div className="flex items-center justify-between">
                  <span style={LABEL}>Expires</span>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text-dim)',
                    }}
                  >
                    {expiryLine}
                  </span>
                </div>
              )}
              {subscription?.billingEmail && (
                <div className="flex items-center justify-between">
                  <span style={LABEL}>Billing email</span>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text-dim)',
                    }}
                  >
                    {subscription.billingEmail}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
    </>
  );
};
