/**
 * Which levels offer a Practice Track, across the whole library.
 *
 * The gate is content, not an allow-list: a section offers a Practice Track when
 * it has notes or chords of its own. That means each of the twelve stub genres
 * lights up by itself the moment its content lands, with no code change — and it
 * also means a half-authored flow could quietly start offering a Practice Track
 * over nothing. This is the test that would catch that.
 */

import { describe, it, expect } from 'vitest';
import { CURRICULUM_GENRE_IDS } from '@/curriculum/bridge/genreIdMap';
import { getActivityFlow } from '@/curriculum/data/activityFlows';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import {
  buildGenrePracticeTrack,
  flowHasPracticeTracks,
} from '../buildGenrePracticeTrack';

const SECTIONS: ActivitySectionId[] = ['A', 'B', 'C', 'D'];
const LEVELS = [1, 2, 3];
/** The genres with authored content today. Everything else is a stub. */
const AUTHORED = new Set(['funk', 'pop']);

const v2 = (flow: unknown): ActivityFlowV2 | null =>
  flow && typeof flow === 'object' && 'version' in flow && flow.version === 'v2'
    ? (flow as ActivityFlowV2)
    : null;

describe('practice track coverage', () => {
  for (const genre of CURRICULUM_GENRE_IDS) {
    for (const level of LEVELS) {
      it(`${genre} L${level}`, async () => {
        const flow = v2(await getActivityFlow(genre, level));
        if (!flow) return;
        const expected = AUTHORED.has(flow.genre);
        expect({
          genre: flow.genre,
          offers: flowHasPracticeTracks(flow),
        }).toMatchObject({ offers: expected });
        for (const section of SECTIONS) {
          const track = buildGenrePracticeTrack(flow, section);
          if (!expected) {
            expect(track).toBeNull();
            continue;
          }
          // An offered track always has a groove to play and a part to play it on.
          expect(track).not.toBeNull();
          expect(Object.keys(track!.clips).length).toBeGreaterThan(0);
          expect(track!.studentParts.length).toBeGreaterThan(0);
          expect(track!.chordCycle.length).toBeGreaterThan(0);
          expect(track!.scales.length).toBeGreaterThan(0);
        }
      });
    }
  }
});
