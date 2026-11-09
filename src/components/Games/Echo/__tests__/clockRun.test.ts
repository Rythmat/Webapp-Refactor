import { describe, expect, it } from 'vitest';
import { echoRandom, echoTimeline, melodyCall } from '@/curriculum/engine/echo';
import { echoRunCues, placeCall } from '../echoRunCues';
import { runViewAt } from '../useClockRun';

/**
 * A run drawn from the clock (useClockRun.ts): the projector's and the
 * teacher's view of a class's round, silent, is the cues up to now folded
 * as the transport's runner folds them.
 */

const call = melodyCall(1, { tonic: 'C', mode: 'major' }, echoRandom('clock'));
const placed = placeCall(call, echoTimeline(call));
const cues = echoRunCues([placed], { metronome: true });

describe('a run drawn from the clock', () => {
  it('is idle before the count-in', () => {
    expect(runViewAt(cues, -1)).toMatchObject({ tick: -1, hub: null });
  });

  it('counts in, then lights each of Atlas’s notes as it sounds', () => {
    expect(runViewAt(cues, 0).phase).toBe('countIn');
    const first = placed.notes.call[0];
    const view = runViewAt(cues, first.onset);
    expect(view.lit).toContain(first.midi);
    expect(view.hub).toEqual({ segment: 'call', index: 0 });
  });

  it('ends with the run', () => {
    const end = cues[cues.length - 1];
    expect(end.kind).toBe('end');
    expect(runViewAt(cues, end.tick).ended).toBe(true);
  });
});
