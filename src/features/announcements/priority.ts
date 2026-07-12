import type { Announcement, AnnouncementSource } from './types';

/**
 * "High priority" announcements (teacher posts + app updates) loop in the
 * marquee until the user closes the box, and take precedence — when any is
 * present the low-priority ones (challenges, welcome) are hidden. Low-priority
 * announcements instead scroll once and then the box auto-closes.
 */
export const HIGH_PRIORITY_SOURCES: ReadonlySet<AnnouncementSource> = new Set([
  'teacher',
  'app_update',
]);

export function isHighPriority(a: Announcement): boolean {
  return HIGH_PRIORITY_SOURCES.has(a.source);
}
