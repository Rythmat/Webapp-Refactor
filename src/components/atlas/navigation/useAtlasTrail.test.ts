import { describe, expect, it } from 'vitest';
import { arrive } from './useAtlasTrail';

const empty = { entries: [], cursor: null };

/** Walk a sequence of (idx, search) arrivals from an empty trail. */
function walk(...steps: [number, string][]) {
  return steps.reduce(
    (state, [idx, search]) => arrive(state, idx, search),
    empty as ReturnType<typeof arrive>,
  );
}

const searches = (state: ReturnType<typeof arrive>) =>
  state.entries.map((e) => e.search);

describe('trail history semantics', () => {
  it('appends each new stop and puts the cursor on it', () => {
    const state = walk(
      [0, '?place=state:Indiana:United States'],
      [1, '?artist=Wes Montgomery'],
      [2, '?event=evt-bebop-nyc-1945'],
    );
    expect(searches(state)).toHaveLength(3);
    expect(state.cursor).toBe(2);
  });

  it('moves the cursor, without rewriting, on Back and Forward', () => {
    const visited = walk([0, '?q=wes'], [1, '?artist=Wes Montgomery']);
    const back = arrive(visited, 0, '?q=wes');
    expect(back.cursor).toBe(0);
    expect(back.entries).toBe(visited.entries);

    const forward = arrive(back, 1, '?artist=Wes Montgomery');
    expect(forward.cursor).toBe(1);
    expect(forward.entries).toBe(visited.entries);
  });

  it('drops the forward steps when a new stop follows going back', () => {
    // Exactly what a browser does to its forward stack.
    const state = walk(
      [0, '?q=wes'],
      [1, '?artist=Wes Montgomery'],
      [2, '?event=evt-bebop-nyc-1945'],
      [1, '?artist=Wes Montgomery'], // Back
      [2, '?place=city:new-orleans'], // a different click from there
    );
    expect(searches(state)).toEqual([
      '?q=wes',
      '?artist=Wes Montgomery',
      '?place=city:new-orleans',
    ]);
    expect(state.cursor).toBe(2);
  });

  it('bridges a detour off the globe without losing earlier steps', () => {
    // idx 1 is some other page (Learn); it never reaches the trail, and the
    // stop before it is still there to jump back to.
    const state = walk([0, '?q=wes'], [2, '?artist=Wes Montgomery']);
    expect(state.entries.map((e) => e.idx)).toEqual([0, 2]);
  });

  it('treats a replaced URL at the same index as a new stop there', () => {
    const state = walk([0, '?q=wes'], [0, '?q=wes montgomery']);
    expect(searches(state)).toEqual(['?q=wes montgomery']);
  });

  it('records the parsed stop, so the strip can describe it', () => {
    const state = walk([0, '?artist=Wes Montgomery&era=postwar']);
    expect(state.entries[0].stop).toEqual({
      kind: 'artist',
      artist: 'Wes Montgomery',
    });
  });
});
