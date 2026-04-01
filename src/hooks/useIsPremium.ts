import {
  getBillingUiState,
  isActivePaidState,
} from '@/features/settings/subscription/subscriptionUtils';
import { useMySubscription } from '@/hooks/data/subscription/useMySubscription';

/**
 * Returns whether the current user has premium (paid) access.
 *
 * - `isPremium` is `true` for active, trialing, canceling, past_due, or free_access states.
 * - `isLoading` is `true` while subscription data is being fetched.
 *
 * While loading, `isPremium` defaults to `true` so premium users never see
 * a flash of locked content.
 */
export function useIsPremium() {
  const { data: subscription, isLoading } = useMySubscription();
  const uiState = getBillingUiState(subscription);
  const isPremium = isLoading ? true : isActivePaidState(uiState);
  return { isPremium, isLoading };
}
