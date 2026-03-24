/**
 * Subscription status types and UI mapping utilities.
 *
 * All status logic is centralised here so raw backend strings are never
 * scattered across components. Import the helpers and types from this file
 * whenever subscription state needs to drive UI.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The shape returned by GET /api/me/subscription.
 * Payment-method fields are optional — the backend may add them later.
 */
export interface SubscriptionStatus {
  hasPaidAccess: boolean;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  /** Unix timestamp (seconds) */
  currentPeriodStart: number | null;
  /** Unix timestamp (seconds) */
  currentPeriodEnd: number | null;
  lastInvoiceStatus: string | null;

  // ── Payment method summary (optional — safe fields only, no raw card data)
  // Add these fields to the backend GET /api/me/subscription response
  // once the Stripe payment-method retrieval is implemented server-side.
  paymentMethodBrand?: string | null;
  paymentMethodLast4?: string | null;
  paymentMethodExpMonth?: number | null;
  paymentMethodExpYear?: number | null;
  billingEmail?: string | null;
  freeAccessDuration?: 'perpetual' | 'temporary' | null;
  freeAccessExpiresAt?: number | null;
}

/**
 * Derived UI states that drive labels, badges, and copy.
 * Maps multiple raw Stripe statuses into a smaller set of user-facing concepts.
 */
export type BillingUiState =
  | 'active' // active subscription, no cancellation scheduled
  | 'trialing' // in trial period
  | 'canceling' // active but will end at period end
  | 'past_due' // payment failed, Stripe retrying
  | 'unpaid' // payment exhausted all retries
  | 'incomplete' // initial payment not complete
  | 'canceled' // subscription ended
  | 'free_access' // granted free access
  | 'free' // no subscription
  | 'unknown'; // no data yet / loading

// ─────────────────────────────────────────────────────────────────────────────
// State derivation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive the single UI state that best represents the current subscription.
 * Uses `cancelAtPeriodEnd` to distinguish active-but-canceling from fully active.
 */
export function getBillingUiState(
  status: SubscriptionStatus | undefined,
): BillingUiState {
  if (!status) return 'unknown';
  if (!status.subscriptionStatus) return 'free';

  const s = status.subscriptionStatus;

  if (s === 'free_access') return 'free_access';
  if (s === 'active' && status.cancelAtPeriodEnd) return 'canceling';
  if (s === 'active') return 'active';
  if (s === 'trialing') return 'trialing';
  if (s === 'past_due') return 'past_due';
  if (s === 'unpaid') return 'unpaid';
  if (s === 'incomplete' || s === 'incomplete_expired') return 'incomplete';
  if (s === 'canceled') return 'canceled';

  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// Label / copy maps
// ─────────────────────────────────────────────────────────────────────────────

/** Short user-facing label for each UI state (badge / heading). */
export const BILLING_STATE_LABEL: Record<BillingUiState, string> = {
  active: 'Active',
  trialing: 'Trial',
  canceling: 'Canceling',
  past_due: 'Past Due',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
  canceled: 'Canceled',
  free_access: 'Free Access',
  free: 'Free',
  unknown: 'No subscription',
};

/** Contextual sentence shown beneath the status badge. */
export const BILLING_STATE_MESSAGE: Record<BillingUiState, string> = {
  active: 'Your subscription is active.',
  trialing: 'You are currently in a trial period.',
  canceling:
    'Your subscription is active but will not renew. Access ends at the period end date.',
  past_due:
    "We couldn't process your most recent payment. Update your payment method in billing settings.",
  unpaid:
    'Your account has unpaid invoices. Please update your payment method to restore access.',
  incomplete:
    'Your subscription setup is incomplete. Please complete checkout or contact support.',
  canceled: 'Your subscription has ended.',
  free_access: 'You have been granted free access.',
  free: 'You are currently on the free plan.',
  unknown: 'Subscription status unavailable.',
};

/** Which button label to show based on UI state. */
export function getBillingActionLabel(uiState: BillingUiState): string {
  switch (uiState) {
    case 'free_access':
      return '';
    case 'active':
    case 'trialing':
    case 'canceling':
      return 'Manage Billing';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'Update Payment Method';
    case 'canceled':
      return 'Resume Subscription';
    case 'free':
    case 'unknown':
    default:
      return 'Upgrade to Pro';
  }
}

/** Whether the current state represents a payment problem requiring user action. */
export function hasPaymentIssue(uiState: BillingUiState): boolean {
  return (
    uiState === 'past_due' || uiState === 'unpaid' || uiState === 'incomplete'
  );
}

/** Whether the state represents an active paid subscription (including trial). */
export function isActivePaidState(uiState: BillingUiState): boolean {
  return (
    uiState === 'active' ||
    uiState === 'trialing' ||
    uiState === 'canceling' ||
    uiState === 'past_due' ||
    uiState === 'free_access'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date formatting
// ─────────────────────────────────────────────────────────────────────────────

/** Format a Unix timestamp (seconds) into a readable date string. */
export function formatPeriodDate(
  unixTimestamp: number | null | undefined,
): string | null {
  if (!unixTimestamp) return null;
  return new Date(unixTimestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Format a payment method for display. Returns null if no data is available. */
export function formatPaymentMethod(status: SubscriptionStatus): string | null {
  const { paymentMethodBrand, paymentMethodLast4 } = status;
  if (!paymentMethodBrand && !paymentMethodLast4) return null;

  const brand = paymentMethodBrand
    ? paymentMethodBrand.charAt(0).toUpperCase() +
      paymentMethodBrand.slice(1).toLowerCase()
    : 'Card';

  return paymentMethodLast4
    ? `${brand} ending in ${paymentMethodLast4}`
    : brand;
}

/** Format expiry as "MM/YYYY". Returns null if not available. */
export function formatExpiry(status: SubscriptionStatus): string | null {
  const { paymentMethodExpMonth, paymentMethodExpYear } = status;
  if (!paymentMethodExpMonth || !paymentMethodExpYear) return null;
  const month = String(paymentMethodExpMonth).padStart(2, '0');
  return `${month}/${paymentMethodExpYear}`;
}
