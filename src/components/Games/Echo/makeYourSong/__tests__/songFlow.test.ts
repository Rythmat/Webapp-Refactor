import { describe, expect, it } from 'vitest';
import {
  BAR_TICKS,
  processTake,
  type EchoTake,
} from '@/curriculum/engine/echo';
import {
  initialSongFlow,
  songComplete,
  songFlowReducer,
  type SongAction,
  type SongFlow,
} from '../songFlow';

/**
 * Make Your Song's flow: the band, then takes in the mini-Studio (a
 * count-in, the phrase, the take shown, used or tried again), the pop-up
 * once both tracks have a take, Edit, Finish.
 */

const KEY = { tonic: 'C', mode: 'major' } as const;

const chordsTake = (
  degrees: [number[], number[]] = [
    [60, 64, 67],
    [57, 60, 64],
  ],
) =>
  processTake(
    degrees.flatMap((midis, bar) =>
      midis.map((midi) => ({ midi, onset: bar * BAR_TICKS, duration: 1800 })),
    ),
    { kind: 'chords', key: KEY, level: 1 },
  );
const melodyTake = () =>
  processTake(
    [
      { midi: 72, onset: 0, duration: 480 },
      { midi: 76, onset: 480, duration: 480 },
    ],
    { kind: 'melody', key: KEY, level: 1 },
  );

const run = (flow: SongFlow, ...actions: SongAction[]) =>
  actions.reduce(songFlowReducer, flow);

/** In the mini-Studio with a band. */
const studio = () =>
  run(
    initialSongFlow(),
    { type: 'pickBand', band: 'pop-band-1', variation: 'l1-singable' },
    { type: 'openStudio' },
  );

/** A take recorded and shown. */
const recorded = (flow: SongFlow, take: EchoTake) =>
  run(
    flow,
    { type: 'countIn', beat: 0 },
    { type: 'countIn', beat: 1 },
    { type: 'record' },
    { type: 'recorded', take },
  );

describe('Make Your Song’s flow', () => {
  it('opens on the band, and the studio only with one chosen', () => {
    const flow = initialSongFlow();
    expect(flow.screen).toBe('band');
    expect(songFlowReducer(flow, { type: 'openStudio' }).screen).toBe('band');
    expect(studio().screen).toBe('studio');
  });

  it('records the Chords first by default', () => {
    expect(initialSongFlow().selected).toBe('chords');
    const counting = run(studio(), { type: 'countIn', beat: 0 });
    expect(counting.activity).toEqual({
      kind: 'countIn',
      track: 'chords',
      beat: 0,
    });
  });

  it('takes a take: count-in, recording, review, then Use That Take', () => {
    let flow = run(studio(), { type: 'countIn', beat: 0 });
    flow = run(flow, { type: 'countIn', beat: 3 });
    expect(flow.activity).toMatchObject({ kind: 'countIn', beat: 3 });
    flow = run(flow, { type: 'record' });
    expect(flow.activity).toEqual({ kind: 'recording', track: 'chords' });
    const take = chordsTake();
    flow = run(flow, { type: 'recorded', take });
    expect(flow.activity).toEqual({ kind: 'review', take, playing: false });
    flow = run(flow, { type: 'useTake' });
    expect(flow.takes.chords).toBe(take);
    expect(flow.activity.kind).toBe('idle');
    // On to the track still waiting: the Melody.
    expect(flow.selected).toBe('melody');
    expect(flow.popup).toBe(false);
  });

  it('throws a take away with Try Another Take, or a Stop before its end', () => {
    const flow = run(recorded(studio(), chordsTake()), { type: 'tryAgain' });
    expect(flow.takes.chords).toBeNull();
    expect(flow.activity.kind).toBe('idle');
    expect(flow.selected).toBe('chords');
    const stopped = run(
      studio(),
      { type: 'countIn', beat: 0 },
      { type: 'record' },
      { type: 'stop' },
    );
    expect(stopped.activity.kind).toBe('idle');
    expect(stopped.takes.chords).toBeNull();
  });

  it('switches tracks only when nothing is recording', () => {
    const flow = run(studio(), { type: 'select', track: 'melody' });
    expect(flow.selected).toBe('melody');
    const busy = run(flow, { type: 'countIn', beat: 0 });
    expect(run(busy, { type: 'select', track: 'chords' }).selected).toBe(
      'melody',
    );
    const reviewing = recorded(flow, melodyTake());
    expect(run(reviewing, { type: 'select', track: 'chords' }).selected).toBe(
      'melody',
    );
    // Listening stops for a pick.
    const listening = run(flow, { type: 'listen' });
    expect(run(listening, { type: 'select', track: 'chords' })).toMatchObject({
      selected: 'chords',
      activity: { kind: 'idle' },
    });
  });

  it('records a used take again when its track is picked', () => {
    const first = chordsTake();
    let flow = run(recorded(studio(), first), { type: 'useTake' });
    flow = run(flow, { type: 'select', track: 'chords' });
    const second = chordsTake([
      [65, 69, 72],
      [67, 71, 74],
    ]);
    flow = run(recorded(flow, second), { type: 'useTake' });
    expect(flow.takes.chords).toBe(second);
    // A take tried again keeps the one used.
    flow = run(flow, { type: 'select', track: 'chords' });
    flow = run(recorded(flow, chordsTake()), { type: 'tryAgain' });
    expect(flow.takes.chords).toBe(second);
  });

  it('pops up Listen / Edit / Finish only once both tracks have a take', () => {
    let flow = run(recorded(studio(), chordsTake()), { type: 'useTake' });
    expect(flow.popup).toBe(false);
    expect(run(flow, { type: 'openPopup' }).popup).toBe(false);
    expect(run(flow, { type: 'finish' }).screen).toBe('studio');
    flow = run(recorded(flow, melodyTake()), { type: 'useTake' });
    expect(songComplete(flow)).toBe(true);
    expect(flow.popup).toBe(true);
    // Listen plays with the pop-up open.
    const listening = run(flow, { type: 'listen' });
    expect(listening).toMatchObject({
      popup: true,
      activity: { kind: 'listening' },
    });
  });

  it('goes back to the mini-Studio on Edit, and on to the victory on Finish', () => {
    let flow = run(recorded(studio(), chordsTake()), { type: 'useTake' });
    flow = run(recorded(flow, melodyTake()), { type: 'useTake' });
    const edited = run(flow, { type: 'edit' });
    expect(edited).toMatchObject({
      screen: 'studio',
      popup: false,
      activity: { kind: 'idle' },
    });
    // Edit's band change keeps the takes.
    const band = run(edited, { type: 'changeBand' });
    expect(band.screen).toBe('band');
    const back = run(
      band,
      { type: 'pickBand', band: 'funk-band-1', variation: 'l1-pocket' },
      { type: 'openStudio' },
    );
    expect(back.takes).toEqual(flow.takes);
    expect(back.band).toEqual({ band: 'funk-band-1', variation: 'l1-pocket' });
    // The pop-up again, then Finish.
    const done = run(back, { type: 'openPopup' }, { type: 'finish' });
    expect(done.screen).toBe('victory');
  });
});
