import { APP_VERSION } from '@/constants/version';

export { APP_VERSION };

export interface AppUpdate {
  /** Release this note belongs to (also the announcement's dedupe key). */
  version: string;
  title: string;
  body?: string;
  /** ISO date (YYYY-MM-DD) — used for recency sorting. */
  releasedAt: string;
  /** Optional deep-link for "what's new". */
  to?: string;
}

/**
 * In-app changelog surfaced as "app update" announcements on the Home dashboard.
 * Add the newest release at the top; each entry shows once per user until they
 * dismiss it (dedupe key = `app_update:<version>`). No backend required — this
 * is the client-side source of truth until/if a release-notes API ships.
 */
export const APP_UPDATES: AppUpdate[] = [
  {
    version: '1.0.0',
    title: 'Introducing Announcements',
    body: 'Class updates, new challenges and app news now appear here at the top of your Home.',
    releasedAt: '2026-07-10',
  },
];
