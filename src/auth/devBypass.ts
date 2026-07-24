import type {
  AuthAppUser,
  AuthContextData,
} from '@/contexts/AuthContext/types';
import type { SubscriptionStatus } from '@/features/settings/subscription/subscriptionUtils';

// ── DEV-only auth + premium bypass ──────────────────────────────────────────
//
// Lets local development / automated verification open the app as an
// authenticated PREMIUM user WITHOUT a real Auth0 login or a real backend
// token. Intended for driving the Studio editor (e.g. Playwright) to verify
// UI that sits behind the auth gate and the premium (Prism) gate.
//
// SECURITY: every export below is guarded on `import.meta.env.DEV`, which Vite
// statically replaces with `false` in any production build. The mock objects
// therefore fold to `null` and are dead-code-eliminated from the shipped
// bundle, and `DEV_AUTH_BYPASS` is `false` — so this can never be enabled in
// production, regardless of the env flag.
//
// Enable it for a local session by starting Vite with the flag, e.g.:
//   VITE_DEV_AUTH_BYPASS=1 npx vite
// Leave it unset for normal development (real Auth0 login).
export const DEV_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === '1';

/** Synthetic signed-in user. `role` is 'teacher' so ProtectedPage's
 *  admin-redirect and student/teacher-only guards all pass. `null` in prod. */
const DEV_BYPASS_USER: AuthAppUser | null = import.meta.env.DEV
  ? {
      id: 'dev-bypass-user',
      auth0Sub: 'dev|bypass',
      role: 'teacher',
      email: 'dev@localhost',
      fullName: 'Dev Bypass',
      nickname: 'Dev',
      username: 'devbypass',
      school: null,
      avatarUrl: null,
      avatarConfig: null,
      birthDate: null,
      organizations: [],
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }
  : null;

/** AuthContextData overrides that mark the session authenticated + ready.
 *  A truthy `token` lets token-gated queries (e.g. useMySubscription's
 *  `enabled: !!token`) run so the mocked subscription below surfaces.
 *  `null` in prod. */
export const DEV_BYPASS_AUTH_DATA: AuthContextData | null =
  import.meta.env.DEV && DEV_BYPASS_USER
    ? {
        userId: DEV_BYPASS_USER.id,
        token: 'dev-bypass-token',
        appSessionId: 'dev-bypass-session',
        expiresAt: null,
        error: null,
        role: DEV_BYPASS_USER.role,
        isAuth0Loading: false,
        isAuth0Authenticated: true,
        isPending: false,
        isBootstrapLoading: false,
        appUser: DEV_BYPASS_USER,
      }
    : null;

/** Active paid subscription → getBillingUiState() === 'active' →
 *  isActivePaidState() === true → useIsPremium().isPremium === true.
 *  `null` in prod. */
export const DEV_BYPASS_SUBSCRIPTION: SubscriptionStatus | null = import.meta
  .env.DEV
  ? {
      hasPaidAccess: true,
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodStart: Math.floor(Date.now() / 1000),
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      lastInvoiceStatus: 'paid',
    }
  : null;
