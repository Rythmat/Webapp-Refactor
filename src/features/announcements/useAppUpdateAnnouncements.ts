import { useMemo } from 'react';
import { APP_UPDATES } from './appUpdates';
import type { Announcement } from './types';

/**
 * Surfaces the in-app changelog (appUpdates.ts) as "app update" announcements.
 * Dismissal is handled centrally by the aggregator (keyed `app_update:<version>`),
 * so each release note shows once per user until dismissed. No backend needed.
 */
export function useAppUpdateAnnouncements(): Announcement[] {
  return useMemo(
    () =>
      APP_UPDATES.map<Announcement>((u) => ({
        id: `app_update:${u.version}`,
        source: 'app_update',
        title: u.title,
        body: u.body,
        createdAt: Date.parse(u.releasedAt) || 0,
        cta: u.to ? { label: "What's new", to: u.to } : undefined,
      })),
    [],
  );
}
