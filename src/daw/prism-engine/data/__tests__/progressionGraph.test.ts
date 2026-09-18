import { describe, expect, it } from 'vitest';
import { CHORDS } from '../chords';
import { PROGRESSION_GRAPH } from '../progressionGraph';

const DEGREE = /^(?:b|#)?[1-7]$/;

/** "4 major7" and "1 major/5" must both be a real degree and chord quality. */
function problem(chord: string): string | null {
  const [main, bass] = chord.split('/');
  const space = main.indexOf(' ');
  if (space < 0) return 'no quality';
  if (!DEGREE.test(main.slice(0, space))) return 'bad degree';
  if (!(main.slice(space + 1) in CHORDS)) return 'unknown quality';
  if (bass !== undefined && !DEGREE.test(bass)) return 'bad bass';
  return null;
}

describe('PROGRESSION_GRAPH', () => {
  it('only names real chords', () => {
    const bad: string[] = [];
    for (const [path, nexts] of Object.entries(PROGRESSION_GRAPH)) {
      for (const chord of [...path.split('|'), ...nexts]) {
        const why = problem(chord);
        if (why) bad.push(`${chord} (${why}) in "${path}"`);
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});
