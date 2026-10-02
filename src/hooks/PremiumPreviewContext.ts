import { createContext } from 'react';

/**
 * Overrides `useIsPremium` for a subtree, or does nothing.
 *
 * The console's mirror of the app shows pages as a student would see them;
 * without this, every premium-gated page would bounce the admin to the plan
 * page because the admin has no subscription. The default is null — no
 * override — so the student and teacher app never sees a difference.
 */
export const PremiumPreviewContext = createContext<boolean | null>(null);
