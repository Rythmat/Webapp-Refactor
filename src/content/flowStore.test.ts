import { beforeEach, describe, expect, it } from 'vitest';
import {
  getActivityFlow,
  loadAllFlows,
  loadPianoFundamentals,
} from '@/curriculum/data/activityFlows';
import {
  ensureFlowContent,
  flowContentSource,
  flowKey,
  isFlowContentReady,
  resetFlowContent,
} from './flowStore';

/**
 * Lessons were the easiest of the three stores to move, because every consumer
 * already went through async accessors. These tests pin that: the public
 * signatures still resolve real content without any caller awaiting hydration
 * itself.
 */
const HYDRATION_TIMEOUT = 60_000;

describe('flowStore', () => {
  beforeEach(() => {
    resetFlowContent();
  });

  it('reports not-ready before hydration', () => {
    expect(isFlowContentReady()).toBe(false);
  });

  it(
    'hydrates from bundled data when no CDN is configured',
    async () => {
      await ensureFlowContent();
      expect(flowContentSource()).toBe('bundled');
      expect(isFlowContentReady()).toBe(true);
    },
    HYDRATION_TIMEOUT,
  );

  it(
    'resolves a lesson through the public accessor without pre-hydrating',
    async () => {
      // No ensureFlowContent() here on purpose — getActivityFlow awaits it.
      const flow = await getActivityFlow('funk', 1);

      expect(flow).not.toBeNull();
      expect(flow?.genre).toBe('funk');
      expect(flow?.level).toBe(1);
      expect(flow?.sections.map((s) => s.id)).toEqual(['A', 'B', 'C', 'D']);
    },
    HYDRATION_TIMEOUT,
  );

  it(
    'resolves a genre by any of its spellings',
    async () => {
      // The data says 'hip hop', the old loaders said 'hipHop', URLs say
      // 'hip hop'. All three must land on the same lesson, and the flow keeps
      // its own display spelling — only the lookup key is canonicalised.
      for (const spelling of ['hip hop', 'hipHop', 'hip-hop', 'HIP HOP']) {
        const flow = await getActivityFlow(spelling, 1);
        expect(flow, `"${spelling}" should resolve`).not.toBeNull();
        expect(flow?.genre).toBe('hip hop');
      }

      expect((await getActivityFlow('neo-soul', 1))?.genre).toBe('neo-soul');
      expect((await getActivityFlow('neoSoul', 1))?.genre).toBe('neo-soul');
      expect((await getActivityFlow('jamBand', 1))?.genre).toBe('jam band');
    },
    HYDRATION_TIMEOUT,
  );

  it('canonicalises every spelling to one key', () => {
    // The API's activityFlowSlug applies the identical rule, so this is the
    // contract between the published body.id and this store.
    expect(flowKey('hip hop', 1)).toBe('hiphop-l1');
    expect(flowKey('hipHop', 1)).toBe('hiphop-l1');
    expect(flowKey('neo-soul', 2)).toBe('neosoul-l2');
    expect(flowKey('jam band', 3)).toBe('jamband-l3');
  });

  it(
    'returns null for a genre or level that does not exist',
    async () => {
      expect(await getActivityFlow('not-a-genre', 1)).toBeNull();
      expect(await getActivityFlow('funk', 9)).toBeNull();
    },
    HYDRATION_TIMEOUT,
  );

  it(
    'exposes all 14 genres with 3 levels each',
    async () => {
      const all = await loadAllFlows();
      expect(all.size).toBe(14);
      for (const [genre, flows] of all) {
        expect(flows, `${genre} should have 3 levels`).toHaveLength(3);
        // Sorted, so a caller can index by level - 1.
        expect(flows.map((f) => f.level)).toEqual([1, 2, 3]);
      }
    },
    HYDRATION_TIMEOUT,
  );

  it(
    'resolves the Piano Fundamentals lesson',
    async () => {
      const flow = await loadPianoFundamentals();
      expect(flow.title).toBeTruthy();
      expect(flow.sections.length).toBeGreaterThan(0);
    },
    HYDRATION_TIMEOUT,
  );

  it('builds the lookup key the published id uses', () => {
    // The slug is the contract between the API row and this store.
    expect(flowKey('funk', 2)).toBe('funk-l2');
  });
});
