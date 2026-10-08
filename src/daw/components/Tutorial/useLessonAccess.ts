import { useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { useIsPremium } from '@/hooks/useIsPremium';
import { type LessonAccess, lessonAccess } from './tutorialCatalog';

/**
 * lessonAccess() for the signed-in student: what opening a lesson should do
 * ('open', 'wait' or 'upgrade'), the one rule the Production tab and the
 * editor's `?tutorial=` boot both apply (owner decision 8).
 *
 * A signed-in student whose token isn't in yet counts as loading too: the
 * subscription query waits for the token, and until then useIsPremium()
 * reports "not loading, not premium". The editor consumes a lesson link when
 * it decides, so deciding then would turn a premium student away for good.
 *
 * Returns a function of the lesson id that changes only when the answer can,
 * so the boot effect can depend on it and run again once the plan is known.
 */
export function useLessonAccess(): (id: string | null) => LessonAccess {
  const { isPremium, isLoading } = useIsPremium();
  const { isAuth0Authenticated, token } = useAuthContext();
  const planUnknown = isLoading || (isAuth0Authenticated && !token);
  return useCallback(
    (id: string | null) =>
      lessonAccess(id, { isPremium, isLoading: planUnknown }),
    [isPremium, planUnknown],
  );
}
