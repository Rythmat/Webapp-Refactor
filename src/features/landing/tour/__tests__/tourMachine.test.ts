import { describe, expect, it } from 'vitest';
import {
  createTourState,
  isAdvancing,
  tabProgress,
  tourReducer,
  USER_IDLE_MS,
  type TourAction,
  type TourState,
} from '../tourMachine';

const TABS = [
  { steps: [{ durationMs: 100 }, { durationMs: 200 }] },
  { steps: [{ durationMs: 100 }] },
];

const run = (state: TourState, ...actions: TourAction[]) =>
  actions.reduce((s, a) => tourReducer(s, a, TABS), state);

const tick = (dt: number): TourAction => ({ type: 'TICK', dt });

describe('tourMachine', () => {
  it('advances steps, then tabs, and wraps back to the first tab', () => {
    let s = createTourState(TABS);
    s = run(s, tick(100));
    expect([s.tab, s.step]).toEqual([0, 1]);
    s = run(s, tick(200));
    expect([s.tab, s.step]).toEqual([1, 0]);
    s = run(s, tick(100));
    expect([s.tab, s.step]).toEqual([0, 0]);
  });

  it('carries leftover time into the next step', () => {
    const s = run(createTourState(TABS), tick(150));
    expect([s.step, s.elapsed]).toEqual([1, 50]);
  });

  it('holds while any pause reason is active and resumes when all clear', () => {
    let s = run(
      createTourState(TABS),
      { type: 'PAUSE', reason: 'offscreen' },
      { type: 'PAUSE', reason: 'manual' },
      { type: 'PAUSE', reason: 'manual' },
      tick(100),
    );
    expect(s.pauses).toEqual(['offscreen', 'manual']);
    expect([s.step, s.elapsed]).toEqual([0, 0]);
    expect(isAdvancing(s)).toBe(false);

    s = run(s, { type: 'RESUME', reason: 'offscreen' }, tick(50));
    expect(s.elapsed).toBe(0);
    s = run(s, { type: 'RESUME', reason: 'manual' }, tick(50));
    expect(s.elapsed).toBe(50);
  });

  it('stops advancing on user takeover and resumes after idling', () => {
    let s = run(createTourState(TABS), { type: 'USER_ACTION' }, tick(200));
    expect(s.status).toBe('user');
    expect([s.tab, s.step]).toEqual([0, 0]);

    let waited = 200;
    while (s.status === 'user') {
      s = run(s, tick(200));
      waited += 200;
    }
    expect(waited).toBe(USER_IDLE_MS);
    expect(s.status).toBe('playing');
    expect(s.elapsed).toBe(0);
  });

  it('selecting a tab restarts it and resumes auto-play after a takeover', () => {
    const s = run(
      createTourState(TABS),
      { type: 'USER_ACTION' },
      { type: 'SELECT_TAB', tab: 1 },
    );
    expect([s.tab, s.step, s.status]).toEqual([1, 0, 'playing']);
  });

  it('selecting a step hands control to the visitor', () => {
    const s = run(createTourState(TABS), { type: 'SELECT_STEP', step: 1 });
    expect([s.step, s.status]).toEqual([1, 'user']);
  });

  it('never advances in static (reduced-motion) mode and shows final steps', () => {
    let s = createTourState(TABS, { isStatic: true });
    expect([s.step, s.status]).toEqual([1, 'static']);
    s = run(s, tick(5000), { type: 'USER_ACTION' });
    expect([s.tab, s.step, s.status]).toEqual([0, 1, 'static']);
    s = run(s, { type: 'SELECT_TAB', tab: 1 });
    expect([s.tab, s.step, s.status]).toEqual([1, 0, 'static']);
    expect(tabProgress(s, TABS)).toBe(1);
  });

  it('reports tab progress across steps', () => {
    const s = run(createTourState(TABS), tick(100), tick(50));
    expect(tabProgress(s, TABS)).toBeCloseTo(150 / 300);
  });

  it('clamps oversized ticks', () => {
    const s = run(createTourState(TABS), tick(10_000));
    expect([s.tab, s.step, s.elapsed]).toEqual([0, 1, 150]);
  });
});
