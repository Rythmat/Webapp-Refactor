/**
 * Shared fluid-sizing tokens for the Annual Plan calendar.
 *
 * Each value is a CSS `clamp(min, N cqw, max)` string that scales with the
 * calendar CARD's width — the card sets `container-type: inline-size`, so
 * `cqw` (1% of the container's inline size) resolves against it. Both the
 * Month grid and the Week view render inside that card, so they grow and
 * shrink together and stay readable at any window width (immune to the
 * md-only sidebar, unlike `vw`). Mirrors the app's `XpCalendar.tsx` pattern.
 *
 * These are inert outside the card's container context.
 */
export const CAL_FONT = {
  /** Sun/Mon/… weekday header labels. */
  weekday: 'clamp(0.72rem, 1cqw, 0.85rem)',
  /** Date number in each cell (and the Week view's day headers). */
  dateNumber: 'clamp(0.85rem, 1.3cqw, 1.05rem)',
  /** Holiday / break label inside a non-school cell. */
  holiday: 'clamp(0.64rem, 0.9cqw, 0.74rem)',
  /** Unit-bar theme title. */
  unitTitle: 'clamp(0.78rem, 1.3cqw, 0.95rem)',
  /** Day-pill label (Month grid). */
  dayLabel: 'clamp(0.72rem, 1.1cqw, 0.85rem)',
  /** Coverage pill (N/M) inside a Unit bar. */
  coverage: 'clamp(0.6rem, 0.85cqw, 0.72rem)',
} as const;

export const CAL_METRIC = {
  /** Minimum height of a Month-grid date cell. */
  cellMinHeight: 'clamp(58px, 7cqw, 92px)',
  /** Reserved height of the date-header row inside a Month cell — clears the
   *  date number / today badge so the in-cell Unit bars start beneath it.
   *  Tracks the todayBadge (up to 1.5rem) plus the cell's py-1.5 top padding. */
  cellHeaderRow: 'clamp(28px, 3cqw, 38px)',
  /** Minimum height of a lane row in the bar overlay (rises with bar height). */
  laneRowMin: 'clamp(30px, 3.6cqw, 42px)',
  /** Square size of the "today" date badge. */
  todayBadge: 'clamp(1.2rem, 1.7cqw, 1.5rem)',
} as const;

/**
 * Week-view sizing. The Week view has only 5 (Mon–Fri) columns, so each has
 * far more room than a Month cell — these run larger for the reference's
 * spacious, readable look.
 */
export const CAL_WEEK = {
  /** Weekday name (MON, TUE …) in a day-column header. */
  weekdayName: 'clamp(0.7rem, 1cqw, 0.85rem)',
  /** Big date number in a day-column header. */
  dateNumber: 'clamp(1.1rem, 1.9cqw, 1.6rem)',
  /** Lesson-card title (the Day label). */
  cardTitle: 'clamp(0.82rem, 1.2cqw, 1rem)',
  /** Lesson-card subtitle (parent unit / theme). */
  cardSubtitle: 'clamp(0.72rem, 1cqw, 0.82rem)',
  /** Minimum height of a day column (keeps empty days substantial). */
  columnMinHeight: 'clamp(150px, 20cqw, 280px)',
  /** Minimum height of a unit-band lane row. */
  bandRowMin: 'clamp(30px, 3.4cqw, 40px)',
} as const;
