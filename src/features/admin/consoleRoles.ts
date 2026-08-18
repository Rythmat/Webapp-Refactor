import { AdminRoutes } from '@/constants/routes';
import type { UserRole } from '@/contexts/AuthContext/types';

/**
 * Who reaches the console, and how much of it.
 *
 * Two roles land here. An `admin` sees everything. An `editor` sees the Content
 * tab and nothing else: their saves are proposals that an admin approves on the
 * Publishing page, so they have no business in Users, Telemetry, Insider Access
 * or Publishing itself.
 *
 * These predicates exist rather than inline `role === 'editor'` checks for one
 * concrete reason: the webapp already has two OTHER unrelated `editor` roles —
 * a classroom co-teacher and a collab-room member — so the bare string literal
 * is not greppable. Every account-role decision in the console goes through
 * here.
 */

/** Roles whose home is /console rather than the student/teacher app. */
export const isConsoleRole = (role: UserRole | null): boolean =>
  role === 'admin' || role === 'editor';

/** Full run of the console: users, telemetry, publishing, everything. */
export const isConsoleAdmin = (role: UserRole | null): boolean =>
  role === 'admin';

/** Content-only access, with every save held for an admin's approval. */
export const isContentEditor = (role: UserRole | null): boolean =>
  role === 'editor';

/**
 * Where a console user should land.
 *
 * An editor sent to the Users page — the admin default — would be bounced
 * straight back out, so the index redirect and the in-console catch-all both
 * ask this rather than hardcoding a destination.
 */
export const consoleHomeRoute = (role: UserRole | null): string =>
  isContentEditor(role)
    ? AdminRoutes.contentKind({ kind: 'activity_flow' })
    : AdminRoutes.users();
