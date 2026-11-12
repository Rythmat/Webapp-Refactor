import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { PerStudentPreviewContext } from '@/components/ui/PerStudent';
import { WelcomeRoutes } from '@/constants/routes';
import { useLearnProfile } from '@/features/learn/profile/useLearnProfile';

/**
 * Where a student who has never been welcomed should go first, or null.
 * Asked only on the landing pages (Home, the Learn dashboard), and only once
 * the account has answered: never on a guess, never from a deep link. Never
 * in the console's mirror either, which shows those pages to an admin who is
 * no student to welcome.
 */
export function useWelcomeRedirect(): string | null {
  const inMirror = useContext(PerStudentPreviewContext) !== null;
  const { profile, answered } = useLearnProfile();
  const { pathname, search } = useLocation();
  if (inMirror || !answered || profile.welcomedAt) return null;
  return WelcomeRoutes.root(undefined, {
    continue: `${pathname}${search}`,
  });
}
