/**
 * buildSessionCoverage — derive the "Curriculum covered" block for the session
 * report from a published deck's app-route slides + templateRef provenance +
 * atlas-completion counts. Pure and tested.
 *
 * e.g. "Covered: Unit nov-jazz · JAZZ:L1 §A Melody (4/6) · Theory dorian / G (3/6)"
 */
import type { SlideDeck } from '../slides/types';
import type { Interaction, InteractionResponsePayload } from '../types';
import { isAtlasResultComplete } from './buildSlideProgress';

export interface CoverageItem {
  kind: 'unit' | 'gcm-section' | 'theory' | 'song-lesson' | 'other';
  label: string;
  activityRef?: string;
  completedCount: number;
  totalCount: number;
  /** Whether to display an `n/m` completion badge (provenance items have none). */
  countable: boolean;
}

export interface SessionCoverage {
  items: CoverageItem[];
  summary: string;
}

const STATION_NAME: Record<string, string> = {
  A: 'Melody',
  B: 'Chords',
  C: 'Bass',
  D: 'Play-Along',
};

const labelForActivityRef = (
  ref: string,
): { kind: CoverageItem['kind']; label: string } => {
  const parts = ref.split(':');
  if (parts[0] === 'curriculum') {
    const [, genre, level, section] = parts;
    if (section) {
      const station = STATION_NAME[section] ?? section;
      return {
        kind: 'gcm-section',
        label: `${genre}:${level} §${section} ${station}`,
      };
    }
    return { kind: 'gcm-section', label: `${genre}:${level}` };
  }
  if (parts[0] === 'learn') {
    return { kind: 'theory', label: `Theory ${parts[1]} / ${parts[2]}` };
  }
  if (parts[0] === 'song' && parts[2] === 'lesson') {
    return { kind: 'song-lesson', label: 'Song theory lesson' };
  }
  return { kind: 'other', label: ref };
};

export const buildSessionCoverage = (input: {
  deck: SlideDeck | null | undefined;
  interactions: Interaction[];
  responsesByEnrollment: Record<
    string,
    Record<string, InteractionResponsePayload>
  >;
  participantCount: number;
}): SessionCoverage => {
  const { deck, interactions, responsesByEnrollment, participantCount } = input;
  const items: CoverageItem[] = [];

  if (deck?.templateRef?.unitSlug) {
    items.push({
      kind: 'unit',
      label: `Unit ${deck.templateRef.unitSlug}`,
      completedCount: 0,
      totalCount: 0,
      countable: false,
    });
  }

  if (deck) {
    const byId = new Map(interactions.map((i) => [i.id, i]));
    for (const slide of deck.slides) {
      if (slide.kind !== 'app-route') continue;
      const ix = byId.get(slide.interactionId);
      if (!ix?.atlas) continue;
      const ref = ix.atlas.activityRef;
      const { kind, label } = labelForActivityRef(ref);
      let completed = 0;
      for (const bag of Object.values(responsesByEnrollment)) {
        const payload = bag[ix.id];
        if (
          payload?.kind === 'atlas' &&
          isAtlasResultComplete(payload.result)
        ) {
          completed += 1;
        }
      }
      items.push({
        kind,
        label,
        activityRef: ref,
        completedCount: completed,
        totalCount: participantCount,
        countable: true,
      });
    }
  }

  const summary = items.length
    ? 'Covered: ' +
      items
        .map((i) =>
          i.countable
            ? `${i.label} (${i.completedCount}/${i.totalCount})`
            : i.label,
        )
        .join(' · ')
    : '';

  return { items, summary };
};
