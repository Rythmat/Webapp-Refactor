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
 * While loading, `isPremium` defaults to `false` so free users never see a
 * flash of unlocked content. The subscription status is prefetched in
 * AuthContext alongside the user bootstrap, so the data is typically cached
 * before any page component mounts — premium users won't see a flash of
 * locked content either.
 */
export function useIsPremium() {
  const { data: subscription, isLoading } = useMySubscription();
  const uiState = getBillingUiState(subscription);
  const isPremium = isLoading ? false : isActivePaidState(uiState);
  return { isPremium, isLoading };
}
