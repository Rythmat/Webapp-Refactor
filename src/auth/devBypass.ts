import type {
  AuthAppUser,
  AuthContextData,
  UserRole,
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
// Leave it unset for normal development (real Auth0 login). Add
// `VITE_DEV_AUTH_BYPASS_PLAN=free` to sign in as a free account instead, to
// see the premium gates (the Prism lock, the Premium lessons) as a free
// student meets them.
export const DEV_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === '1';

/** Synthetic signed-in user. `role` is 'teacher' so ProtectedPage's
 *  admin-redirect and student/teacher-only guards all pass. Set
 *  `VITE_DEV_AUTH_BYPASS_ROLE=admin` (or `editor`) to open /console instead —
 *  its API calls still need a real backend, so pages show their error states.
 *  `null` in prod. */
const DEV_BYPASS_ROLE: UserRole =
  (['admin', 'editor', 'student'] as const).find(
    (role) => role === import.meta.env.VITE_DEV_AUTH_BYPASS_ROLE,
  ) ?? 'teacher';

const DEV_BYPASS_USER: AuthAppUser | null = import.meta.env.DEV
  ? {
      id: 'dev-bypass-user',
      auth0Sub: 'dev|bypass',
      role: DEV_BYPASS_ROLE,
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

/** `VITE_DEV_AUTH_BYPASS_PLAN=free`: the bypass user has a free account.
 *  (scripts/studio-perf/lessons.mjs serves this module with the flag read as
 *  'free' or 'premium' to sign a page in as each persona.) */
const DEV_BYPASS_FREE_PLAN =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS_PLAN === 'free';

/** By default an active paid subscription → getBillingUiState() === 'active'
 *  → isActivePaidState() === true → useIsPremium().isPremium === true. With
 *  the free plan, a free account's (no paid access, never subscribed) →
 *  'free' → isPremium === false. `null` in prod. */
export const DEV_BYPASS_SUBSCRIPTION: SubscriptionStatus | null = import.meta
  .env.DEV
  ? DEV_BYPASS_FREE_PLAN
    ? {
        hasPaidAccess: false,
        subscriptionStatus: null,
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        lastInvoiceStatus: null,
      }
    : {
        hasPaidAccess: true,
        subscriptionStatus: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodStart: Math.floor(Date.now() / 1000),
        currentPeriodEnd: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
        lastInvoiceStatus: 'paid',
      }
  : null;
