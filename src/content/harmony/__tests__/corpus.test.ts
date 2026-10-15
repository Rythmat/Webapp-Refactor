import { describe, expect, it } from 'vitest';
import { buildHarmonyIndex, isStrongMatch } from '..';
import { corpusInput, corpusSongs } from './corpus';

/**
 * The crosscheck on the repo's own data. A chord the matcher cannot read
 * drops out of every match silently, so new vocabulary in the charts or the
 * library has to be taught here; and a few songs everyone knows pin that the
 * matching still hears what a musician would.
 */

const index = buildHarmonyIndex(corpusInput);

const strongIn = (songId: string, progressionId: number) =>
  (index.bySong.get(songId) ?? []).find(
    (m) => m.progressionId === progressionId && isStrongMatch(m),
  );

describe('the progression crosscheck on the repo’s data', () => {
  it('reads every chord of every library progression', () => {
    expect(index.unreadable).toEqual([]);
  });

  it('reads all but a handful of the charts’ chord labels', () => {
    const labels = corpusSongs.reduce(
      (n, song) =>
        n +
        song.sections.reduce(
          (m, section) =>
            m + section.bars.reduce((k, bar) => k + bar.chords.length, 0),
          0,
        ),
      0,
    );
    // Today: a few chart typos ('4 c♯min7' in Look What I Found), listed in
    // claude-ref/docs/progression-crosscheck/data-issues.md.
    expect(index.unread.length / labels).toBeLessThan(0.005);
  });

  it('hears the songs a musician would', () => {
    // 1-5-6-4, the section built on it.
    expect(strongIn('dont_stop_believin', 662)).toMatchObject({
      placement: 'loop',
    });
    expect(strongIn('hey_soul_sister', 662)).toBeDefined();
    // The 1-4 dominant vamp.
    expect(strongIn('feeling_alright', 304)).toMatchObject({
      tier: 'exact',
      placement: 'loop',
    });
    // A minor's 1-4-♭7-♭3 is the library's 6-2-5-1, from the relative major.
    expect(strongIn('i_will_survive', 447)).toMatchObject({ relative: true });
  });
});
