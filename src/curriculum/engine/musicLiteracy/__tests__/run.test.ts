import { describe, expect, it } from 'vitest';
import { secondsPerTick, stepTimeline } from '../literacy';
import { getLiveMusicLiteracy } from '../registry';
import {
  applyCue,
  FINAL_DOWNBEAT_BEATS,
  FINAL_DOWNBEAT_NOTES,
  groovePreviewCues,
  IDLE_RUN_VIEW,
  phaseAt,
  runCues,
  type BeatCue,
  type DrumCue,
  type NoteCue,
  type RunCue,
  type RunGroove,
  type RunView,
} from '../run';

const lesson = getLiveMusicLiteracy('music-literacy-part-1')!;
const step = (tag: string) => lesson.steps.find((s) => s.tag === tag)!;

const beats = (cues: RunCue[]) =>
  cues.filter((c): c is BeatCue => c.kind === 'beat');
const notes = (cues: RunCue[], segment: NoteCue['segment']) =>
  cues.filter((c): c is NoteCue => c.kind === 'note' && c.segment === segment);
const drums = (cues: RunCue[]) =>
  cues.filter((c): c is DrumCue => c.kind === 'drum');

describe('a run on the step timeline', () => {
  const play = runCues(lesson, step('add-the-3'), 'play', { metronome: false });

  it('keeps one steady pulse: a beat every quarter, count-in to the last bar', () => {
    const ticks = beats(play).map((c) => c.tick);
    expect(ticks).toHaveLength(20); // 5 bars of 4/4
    ticks.forEach((tick, i) => expect(tick).toBe(i * 480));
    expect(
      beats(play)
        .filter((c) => c.downbeat)
        .map((c) => c.tick),
    ).toEqual([0, 1920, 3840, 5760, 7680]);
  });

  it('turns over at the bars: count-in, words, call, then the student', () => {
    const phaseOf = (tick: number) =>
      beats(play).find((c) => c.tick === tick)!.phase;
    expect(phaseOf(0)).toBe('countIn');
    expect(phaseOf(1440)).toBe('countIn');
    expect(phaseOf(1920)).toBe('words');
    expect(phaseOf(5760)).toBe('call');
    expect(phaseOf(7680)).toBe('response');
    expect(phaseOf(9120)).toBe('response');
  });

  it('always counts in, and clicks past it only with the metronome on', () => {
    expect(
      beats(play)
        .filter((c) => c.click)
        .map((c) => c.tick),
    ).toEqual([0, 480, 960, 1440]);
    const clicking = runCues(lesson, step('add-the-3'), 'play', {
      metronome: true,
    });
    expect(beats(clicking).every((c) => c.click)).toBe(true);
  });

  it('plays and lights the words and the call', () => {
    const words = notes(play, 'words');
    expect(words.map((n) => n.midi)).toEqual([
      60, 60, 60, 60, 64, 60, 60, 60, 60, 64, 64,
    ]);
    expect(words[0].tick).toBe(1920);
    expect(words.every((n) => n.sound && n.light)).toBe(true);
    const call = notes(play, 'call');
    expect(call.map((n) => [n.tick, n.midi])).toEqual([
      [5760, 60],
      [6240, 64],
      [6720, 60],
    ]);
    expect(call.every((n) => n.sound && n.light)).toBe(true);
  });

  it('leaves the answer to the student in Play, lights it in Practice, plays it in Listen', () => {
    const answer = (mode: 'listen' | 'practice' | 'play') =>
      notes(
        runCues(lesson, step('add-the-3'), mode, { metronome: false }),
        'response',
      );
    expect(answer('play').map((n) => [n.tick, n.midi])).toEqual([
      [7680, 60],
      [8160, 64],
      [8640, 60],
    ]);
    expect(answer('play').some((n) => n.sound || n.light)).toBe(false);
    expect(answer('practice').every((n) => !n.sound && n.light)).toBe(true);
    expect(answer('listen').every((n) => n.sound && n.light)).toBe(true);
  });

  it('ends on the last bar line, and lets a key go before it strikes again', () => {
    expect(play.at(-1)).toEqual({ kind: 'end', tick: 9600 });
    // The words' last C ends where the call's first C begins.
    const at5760 = play.filter((c) => c.tick === 5760).map((c) => c.kind);
    expect(at5760).toEqual(['noteEnd', 'beat', 'note']);
    for (let i = 1; i < play.length; i++) {
      expect(play[i].tick).toBeGreaterThanOrEqual(play[i - 1].tick);
    }
  });

  it('puts the answer twelve seconds in at 80 (a bar of count-in, two of words, one of call)', () => {
    const timeline = stepTimeline(lesson, step('add-the-3'));
    expect(timeline.response.start * secondsPerTick(80)).toBeCloseTo(12);
    expect(timeline.total * secondsPerTick(80)).toBeCloseTo(15);
    expect(timeline.response.start * secondsPerTick(120)).toBeCloseTo(8);
  });
});

describe('whose turn it is', () => {
  const timeline = stepTimeline(lesson, step('note-called-c'));
  it('reads the phase from the tick', () => {
    expect(phaseAt(timeline, -1)).toBeNull();
    expect(phaseAt(timeline, 0)).toBe('countIn');
    expect(phaseAt(timeline, 1919)).toBe('countIn');
    expect(phaseAt(timeline, 1920)).toBe('words');
    expect(phaseAt(timeline, 5760)).toBe('call');
    expect(phaseAt(timeline, 7679)).toBe('call');
    expect(phaseAt(timeline, 7680)).toBe('response');
    expect(phaseAt(timeline, 9600)).toBeNull();
  });
});

describe('what a run shows', () => {
  const cues = runCues(lesson, step('add-the-3'), 'practice', {
    metronome: false,
  });
  const wordCount = notes(cues, 'words').length;
  /** The view once every cue up to `tick` has happened. */
  const viewAt = (tick: number): RunView =>
    cues
      .filter((c) => c.tick <= tick)
      .reduce((v, c) => applyCue(v, c, wordCount), IDLE_RUN_VIEW);

  it('counts the beat and says whose turn it is', () => {
    expect(viewAt(500)).toMatchObject({ phase: 'countIn', beat: 1 });
    expect(viewAt(1920)).toMatchObject({ phase: 'words', beat: 0 });
    expect(viewAt(6240)).toMatchObject({ phase: 'call', beat: 1 });
    expect(viewAt(8650)).toMatchObject({ phase: 'response', beat: 2 });
  });

  it('lights the syllable being sung, karaoke style', () => {
    expect(viewAt(1920).word).toBe(0); // "When"
    expect(viewAt(3360).word).toBe(4); // "3", sung on E
    expect(viewAt(4800).word).toBe(9); // "Ma"
    // Past the words, every syllable reads as sung.
    expect(viewAt(5760).word).toBe(wordCount);
  });

  it('lights the call’s degrees as they sound and the answer’s as they’re due', () => {
    expect(viewAt(6300).hub).toEqual({ segment: 'call', index: 1 });
    expect(viewAt(6300).lit).toEqual([64]);
    expect(viewAt(8200).hub).toEqual({ segment: 'response', index: 1 });
    expect(viewAt(8200).lit).toEqual([64]); // Practice lights the answer
    // Between notes (the rest at the bar's end) nothing is lit.
    expect(viewAt(9300)).toMatchObject({ hub: null, lit: [] });
  });

  it('ends with nothing lit', () => {
    expect(viewAt(9600)).toMatchObject({ ended: true, hub: null, lit: [] });
  });
});

describe('a run over a drum groove', () => {
  /** A bar of rock: kick 1 and 3, snare 2 and 4, eighth hats. */
  const rock: RunGroove = {
    loopTicks: 1920,
    hits: [
      { tick: 0, note: 36, velocity: 100 },
      { tick: 960, note: 36, velocity: 100 },
      { tick: 480, note: 38, velocity: 100 },
      { tick: 1440, note: 38, velocity: 100 },
      ...[0, 240, 480, 720, 960, 1200, 1440, 1680].map((tick) => ({
        tick,
        note: 42,
        velocity: 80,
      })),
    ],
    padGains: { 49: 0.5 },
  };
  // add-the-3: a bar of count-in, two of words, one of call, one of answer.
  const plain = runCues(lesson, step('add-the-3'), 'play', {
    metronome: false,
  });
  const over = runCues(lesson, step('add-the-3'), 'play', {
    metronome: false,
    groove: rock,
  });
  const loop = drums(over).filter((c) => c.tick < 9600);

  it('comes in on the words’ first beat, never in the count-in', () => {
    expect(loop[0].tick).toBe(1920);
    expect(loop.some((c) => c.tick < 1920)).toBe(false);
    // The count-in still clicks; the drums keep time after it.
    expect(
      beats(over)
        .filter((c) => c.click)
        .map((c) => c.tick),
    ).toEqual([0, 480, 960, 1440]);
  });

  it('loops through the words, the call and the answer, to its last bar line', () => {
    const kicks = loop.filter((c) => c.note === 36).map((c) => c.tick);
    expect(kicks).toEqual([1920, 2880, 3840, 4800, 5760, 6720, 7680, 8640]);
    expect(loop).toHaveLength(4 * rock.hits.length);
  });

  it('lands a kick and a crash together on the downbeat after the answer', () => {
    const final = drums(over).filter((c) => c.tick >= 9600);
    expect(final.map((c) => [c.tick, c.note])).toEqual([
      [9600, 36],
      [9600, 49],
    ]);
    expect(FINAL_DOWNBEAT_NOTES).toEqual([36, 49]);
    // At the groove's own levels: its crash is trimmed to half.
    expect(final.map((c) => c.velocity)).toEqual([112, 56]);
    // The pulse lights the downbeat with it, without a click.
    expect(beats(over).at(-1)).toMatchObject({
      tick: 9600,
      beat: 0,
      downbeat: true,
      click: false,
    });
  });

  it('is longer by the final downbeat and its ring, and ends after it', () => {
    expect(FINAL_DOWNBEAT_BEATS).toBe(2);
    expect(over.at(-1)).toEqual({ kind: 'end', tick: 9600 + 2 * 480 });
    expect(plain.at(-1)).toEqual({ kind: 'end', tick: 9600 });
  });

  it('moves nothing else: the pulse, the words, the call and the answer', () => {
    const others = (cues: RunCue[]) =>
      cues.filter(
        (c) => c.kind !== 'drum' && c.kind !== 'end' && c.tick < 9600,
      );
    expect(others(over)).toEqual(others(plain));
  });

  it('clicks over the drums only when asked to', () => {
    const clicking = runCues(lesson, step('add-the-3'), 'play', {
      metronome: true,
      groove: rock,
    });
    expect(
      beats(clicking)
        .filter((c) => c.tick < 9600)
        .every((c) => c.click),
    ).toBe(true);
  });

  it('plays a longer loop whole, and stops it at the answer’s end', () => {
    const twoBars: RunGroove = {
      loopTicks: 3840,
      hits: [
        { tick: 0, note: 49, velocity: 100 },
        { tick: 3600, note: 38, velocity: 100 },
      ],
    };
    const cues = drums(
      runCues(lesson, step('add-the-3'), 'listen', {
        metronome: false,
        groove: twoBars,
      }),
    );
    // Loops at 1920 and 5760; the third would begin on the final downbeat.
    expect(cues.map((c) => [c.tick, c.note])).toEqual([
      [1920, 49],
      [5520, 38],
      [5760, 49],
      [9360, 38],
      [9600, 36],
      [9600, 49],
    ]);
  });

  it('lets the final downbeat replace one played a touch early, not flam with it', () => {
    const pushed: RunGroove = {
      loopTicks: 1920 * 8,
      hits: [
        { tick: 0, note: 36, velocity: 100 },
        { tick: 7680 - 4, note: 36, velocity: 100 }, // bar 5's downbeat, early
        { tick: 7680 - 60, note: 38, velocity: 100 }, // a 32nd before: kept
      ],
    };
    const cues = drums(
      runCues(lesson, step('add-the-3'), 'play', {
        metronome: false,
        groove: pushed,
      }),
    );
    expect(cues.map((c) => [c.tick, c.note])).toEqual([
      [1920, 36],
      [9540, 38],
      [9600, 36],
      [9600, 49],
    ]);
  });

  it('draws nothing for a drum hit', () => {
    const view = { ...IDLE_RUN_VIEW, tick: 100 };
    expect(applyCue(view, loop[0], 3)).toBe(view);
  });

  it('previews a bar of the groove and its final downbeat', () => {
    const cues = groovePreviewCues(rock, 1920, 4);
    expect(drums(cues)).toHaveLength(rock.hits.length + 2);
    expect(
      drums(cues)
        .filter((c) => c.tick === 1920)
        .map((c) => c.note),
    ).toEqual([36, 49]);
    expect(cues.at(-1)).toEqual({ kind: 'end', tick: 1920 + 960 });
  });
});
