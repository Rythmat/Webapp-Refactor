import { describe, expect, it, vi } from 'vitest';
import { newBlankDay } from '../../../plan/newBlankDay';
import { findForbiddenKey, publishDay } from '../../../publish/publishDay';
import { applyCortexLessonToDay, roleAvailable } from '../buildDeck';
import { loadLessonAtlas } from '../loadLessonAtlas';
import { planCortexLesson } from '../planLesson';
import {
  EMPTY_FOCUS_CONTEXT,
  rankFocusCandidates,
  searchFocus,
  suggestFocus,
} from '../suggestFocus';
import { DEFAULT_CORTEX_CHOICES, GROUP_ROLES } from '../types';

/**
 * The generator on the real Atlas: the repo graph the console's Cortex draws,
 * and the Studio's real tutorials.
 */

// `eventConnections.ts` reads the content store for its arc drawing; the arcs
// themselves are a plain list (as in repoSnapshot.test.ts).
vi.mock('@/content/contentStore', () => ({
  contentGeneration: 0,
  MUSIC_HISTORY: [],
}));

const LOAD = 60_000;

describe('Cortex lessons on the real Atlas', () => {
  it(
    'has well over a hundred artists and cities to suggest',
    async () => {
      const { graph, catalog } = await loadLessonAtlas();
      const ranked = rankFocusCandidates(graph, catalog);
      expect(ranked.length).toBeGreaterThan(150);
      expect(ranked.some((r) => r.focus.kind === 'artist')).toBe(true);
      expect(ranked.some((r) => r.focus.kind === 'place')).toBe(true);
      expect(
        suggestFocus(graph, catalog, EMPTY_FOCUS_CONTEXT, 0),
      ).not.toBeNull();
    },
    LOAD,
  );

  it(
    'builds and publishes a clean lesson for the top 20, in every role they support',
    async () => {
      const { graph, catalog } = await loadLessonAtlas();
      const top = rankFocusCandidates(graph, catalog).slice(0, 20);
      let built = 0;
      for (const { focus } of top) {
        const plan = planCortexLesson(graph, catalog, focus);
        expect(plan.showcase.facts.length, focus.label).toBeGreaterThan(0);
        for (const role of GROUP_ROLES) {
          if (!roleAvailable(plan, role)) continue;
          const day = applyCortexLessonToDay(newBlankDay(focus.label), plan, {
            ...DEFAULT_CORTEX_CHOICES,
            role,
          });
          expect(findForbiddenKey(publishDay(day)), focus.label).toBeNull();
          built++;
        }
        // Every suggested focus can run at least the Producer.
        expect(roleAvailable(plan, 'producer'), focus.label).toBe(true);
      }
      expect(built).toBeGreaterThan(40);
    },
    LOAD,
  );

  it(
    'turns the Day of a planned song into a lesson about its artist',
    async () => {
      const { graph, catalog } = await loadLessonAtlas();
      const focus = suggestFocus(
        graph,
        catalog,
        { ...EMPTY_FOCUS_CONTEXT, plannedSongIds: ['whats_going_on'] },
        0,
      );
      expect(focus).toMatchObject({
        id: 'artist:marvin-gaye',
        reason: { kind: 'plannedSong', songId: 'whats_going_on' },
      });
      const plan = planCortexLesson(graph, catalog, focus!);
      expect(plan.promoter?.nodes.length).toBeGreaterThan(5);
      expect(plan.showcase.listen).toBeDefined();
    },
    LOAD,
  );

  it(
    "builds a city's board out of artists, events and songs found there",
    async () => {
      const { graph, catalog } = await loadLessonAtlas();
      const [detroit] = searchFocus(graph, catalog, 'Detroit');
      expect(detroit.id).toBe('place:detroit');
      const board = planCortexLesson(graph, catalog, detroit).promoter!;
      const kinds = new Set(board.nodes.map((n) => n.kind));
      expect(kinds).toEqual(new Set(['place', 'artist', 'event', 'song']));
      expect(board.nodes.length).toBeLessThanOrEqual(36);
      expect(board.edges.length).toBeGreaterThan(board.nodes.length - 1);
    },
    LOAD,
  );
});
