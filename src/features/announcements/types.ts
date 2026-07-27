/** Where an announcement originates. Drives the icon + accent in the UI. */
export type AnnouncementSource =
  | 'live_session'
  | 'teacher'
  | 'challenge'
  | 'app_update'
  | 'welcome';

export interface AnnouncementCta {
  label: string;
  /** react-router path to navigate to. */
  to: string;
}

/**
 * A single item shown in the Home dashboard's Announcements row. Sources
 * (teacher posts, challenges, app updates) each adapt their own data into this
 * shape; the aggregator merges, de-dupes dismissed ones, and orders them.
 */
export interface Announcement {
  /**
   * Stable, source-prefixed unique id (e.g. `challenge:<id>`,
   * `app_update:<version>`, `teacher:<id>`). Used as the dismissal key so a
   * dismissal survives reloads and data refetches.
   */
  id: string;
  source: AnnouncementSource;
  title: string;
  body?: string;
  /** Unix ms — recency sort within a priority tier. */
  createdAt: number;
  /** Higher shows first; falls back to a per-source default in the aggregator. */
  priority?: number;
  cta?: AnnouncementCta;
  /** Defaults to true. */
  dismissible?: boolean;
}
