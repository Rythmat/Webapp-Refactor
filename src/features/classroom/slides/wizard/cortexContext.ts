import type { Day } from '../../types';
import { CORTEX_LESSON_TEMPLATE_ID } from '../cortex/buildDeck';
import type { FocusContext } from '../cortex/suggestFocus';

/** Recent lessons whose focus the generator avoids suggesting again. */
const RECENT_LESSONS = 10;

/**
 * The focus ids of the classroom's latest Cortex lessons, newest first
 * (scheduled ones by date, then unscheduled), leaving out the Day being
 * generated.
 */
export const recentFocusIds = (
  days: readonly Day[],
  exceptDayId?: string,
): string[] =>
  days
    .filter((d) => d.id !== exceptDayId && d.deck?.templateRef?.focusId)
    .sort((a, b) =>
      (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? ''),
    )
    .slice(0, RECENT_LESSONS)
    .map((d) => d.deck?.templateRef?.focusId as string);

/** `globe:event:<id>` or a bare event id → the event id. */
const eventIdOf = (activityRef: string): string | null => {
  const id = activityRef.replace(/^globe:event:/, '');
  return id.includes(':') ? null : id;
};

/**
 * What a planned Day says about its focus: its song of the day and its Globe
 * events (a Teach-year Day carries both, from the teach_day's `uses_song` and
 * `references_event`), and an older generated deck's song.
 */
export const focusContextForDay = (
  day: Day | null,
  recent: readonly string[],
): FocusContext => {
  const connect = day?.cells.connectRegulate.presentation;
  const ref = day?.deck?.templateRef;
  const songIds = [
    connect?.song?.id,
    ref && ref.templateId !== CORTEX_LESSON_TEMPLATE_ID
      ? ref.songId
      : undefined,
  ].filter((id): id is string => Boolean(id));
  const eventIds = (connect?.launchTiles ?? [])
    .filter((t) => t.module === 'globe')
    .map((t) => eventIdOf(t.activityRef))
    .filter((id): id is string => Boolean(id));
  return {
    plannedSongIds: [...new Set(songIds)],
    plannedEventIds: [...new Set(eventIds)],
    recentFocusIds: [...recent],
  };
};
