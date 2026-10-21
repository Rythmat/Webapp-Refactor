// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunCue } from '@/curriculum/engine/musicLiteracy/run';

/**
 * A whole game of Echo on screen, the transport faked (literacyRun.ts): the
 * test hands the game each cue itself, says where on the run a key lands,
 * and moves the clock on the game's own timers. Setup (levels in order,
 * High Scores), Melody Echo and Chord Echo played on the pads with one
 * miss (the streak goes out, the next call is easier), the Echo Boss lost
 * and fought again, the gate's numbers and its XP awarded once, then Make
 * Your Song's stand-in: Finish opens Level 2 and marks Start Here's Echo
 * stop done. And Game Settings, remembered.
 *
 * The boss's art (EchoBossArt.tsx): jsdom plays no video, so play() is
 * faked and the test fires the videos' events itself, or lets a video
 * that never starts give way to its still. The entrance, a reaction after
 * each echo (a frown for a good one, a nod for a miss, fit to the bar
 * between calls), the loss and the victory, Fight! and Continue, and the
 * stills under reduced motion.
 */

const input = vi.hoisted(() => ({
  stable: {
    subscribeNoteOn: () => () => {},
    subscribeNoteOff: () => () => {},
    start: async () => {},
    stop: () => {},
  },
}));
vi.mock('@/learn/context/LearnInputContext', () => ({
  LearnInputProvider: ({ children }: { children: ReactNode }) => children,
  useLearnInputStable: () => input.stable,
}));
vi.mock('@/audio/pianoSampler', () => ({
  startPianoSampler: async () => {},
  triggerPianoAttack: async () => {},
  triggerPianoRelease: async () => {},
  releaseAllPianoNotes: async () => {},
  setPianoSamplerVolume: () => {},
}));

/** The fake run: the latest start's cues and handler, and the clock's tick. */
const run = vi.hoisted(() => ({
  onCue: null as null | ((cue: unknown) => void),
  cues: [] as unknown[],
  tempo: 0,
  starts: 0,
  stops: 0,
  tick: null as number | null,
}));
vi.mock('@/curriculum/musicLiteracy/literacyRun', () => ({
  literacyClock: {
    soundingTicks: () => run.tick,
    playbackTicks: () => run.tick,
  },
  startLiteracyRun: async ({
    onCue,
    cues,
    tempo,
  }: {
    onCue: (cue: unknown) => void;
    cues: unknown[];
    tempo: number;
  }) => {
    run.onCue = onCue;
    run.cues = cues;
    run.tempo = tempo;
    run.starts += 1;
    return true;
  },
  stopLiteracyRun: () => {
    run.stops += 1;
  },
}));
// Make Your Song as the stand-in this game was written against: the song
// is tested in makeYourSong/__tests__.
vi.mock('../makeYourSong/MakeYourSong', () => import('./MakeYourSongStandIn'));
const xp = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => {}) }));
vi.mock('@/hooks/data/experience/useAwardExperience', () => ({
  useAwardArcadeExperience: () => xp,
}));

const { default: EchoGame, INTRO_MS, RESULT_MS } = await import('../EchoGame');
const {
  BOSS_FACE,
  BOSS_VORTEX,
  STILL_MS,
  VIDEO_START_MS,
  barSeconds,
  reactionRate,
} = await import('../bossArt');
const { BOSS_GAP_BARS } = await import('../echoFlow');
const { PAD_KEY_CODES } = await import('../input');
const { TYPING_NOTES } = await import('@/daw/commands/musicalTypingMap');
const { ECHO_PROGRESS_KEY, readEchoProgress } = await import('../echoProgress');
const { ECHO_SETTINGS_KEY, resetEchoSettingsCache } = await import(
  '../echoSettings'
);
const { readStopDone } = await import('@/curriculum/musicLiteracy/stopDone');

const flush = () =>
  act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const stage = () => document.querySelector('[data-echo-targets]')!;
const screenKind = () =>
  document
    .querySelector('[data-echo-screen]')
    ?.getAttribute('data-echo-screen');
const streak = () =>
  Number(
    document
      .querySelector('[data-echo-streak]')
      ?.getAttribute('data-echo-streak'),
  );

interface Target {
  onset: number;
  duration: number;
  midis: number[];
  pad: number;
}

/** A note's letter key with A on `octave`'s C, by its pitch class alone. */
const typedCode = (midi: number, octave: number) => {
  const offset = (((midi - (octave + 1) * 12) % 12) + 12) % 12;
  return Object.keys(TYPING_NOTES).find(
    (code) => TYPING_NOTES[code] === offset,
  )!;
};

/**
 * The run under way, played: each call's answer where `pass` says so
 * (nothing where it doesn't), on the pads or the letter keys, every cue
 * handed over in order. On the letters a chord is played by pitch class,
 * in whatever octave the keys are on: any voicing is the chord.
 */
async function playRun(
  pass: (call: number) => boolean,
  by: 'pads' | 'letters' = 'pads',
  /** Only this stretch of the run's ticks: from, up to (not including). */
  { from = -Infinity, until = Infinity } = {},
) {
  await flush();
  const targets = JSON.parse(
    stage().getAttribute('data-echo-targets')!,
  ) as Target[][];
  const octave = Number(
    document
      .querySelector('[data-typing-octave]')
      ?.getAttribute('data-typing-octave') ?? 4,
  );
  const codesOf = (t: Target) =>
    by === 'pads'
      ? [PAD_KEY_CODES[t.pad]]
      : t.midis.map((m) => typedCode(m, octave));
  const presses = targets
    .flatMap((list, call) => (pass(call) ? list : []))
    .flatMap((t) =>
      codesOf(t).flatMap((code) => [
        { tick: t.onset, code, down: true },
        { tick: t.onset + Math.min(100, t.duration / 2), code, down: false },
      ]),
    )
    .filter((p) => p.tick >= from && p.tick < until)
    .sort((a, b) => a.tick - b.tick || Number(a.down) - Number(b.down));
  const cues = (run.cues as RunCue[]).filter(
    (c) => c.tick >= from && c.tick < until,
  );
  const onCue = run.onCue!;
  // Each cue and key in its own act, so the screen keeps up (the boss's
  // pads change from melody to chords with its calls).
  for (const cue of cues) {
    while (presses.length && presses[0].tick <= cue.tick) {
      const press = presses.shift()!;
      run.tick = press.tick;
      act(() => {
        if (press.down) fireEvent.keyDown(window, { code: press.code });
        else fireEvent.keyUp(window, { code: press.code });
      });
    }
    run.tick = cue.tick;
    if (cue.kind === 'drum') continue;
    act(() => onCue(cue));
  }
}

function renderGame() {
  return render(
    <MemoryRouter>
      <EchoGame makeSeed={() => 'test-seed'} />
    </MemoryRouter>,
  );
}

/** The boss's videos asked to play, in order: the clip, at its rate. */
let plays: string[] = [];
const art = () => document.querySelector('[data-echo-boss-art]');
const artFront = () => art()?.getAttribute('data-echo-boss-front') ?? null;
const artStill = () => art()?.getAttribute('data-echo-boss-still') ?? null;
const video = (clip: string) =>
  document.querySelector(`video[data-echo-boss-clip="${clip}"]`)!;
/** A boss video plays to its end. */
const playOut = (clip: string) =>
  act(() => {
    fireEvent.playing(video(clip));
    fireEvent.ended(video(clip));
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  plays = [];
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    plays.push(`${this.dataset.echoBossClip}@${this.playbackRate.toFixed(2)}`);
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  localStorage.clear();
  localStorage.setItem(
    ECHO_SETTINGS_KEY,
    JSON.stringify({ input: 'pads', groove: false }),
  );
  resetEchoSettingsCache();
  xp.mutateAsync.mockClear();
  run.starts = 0;
  run.stops = 0;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('a game of Echo', () => {
  it('sets up a color, major or minor, and an open level', () => {
    renderGame();
    expect(screenKind()).toBe('setup');
    expect(screen.getByRole('radio', { name: 'C Major' })).toBeTruthy();
    const levels = [1, 2, 3].map(
      (n) =>
        document.querySelector(`[data-echo-level="${n}"]`) as HTMLButtonElement,
    );
    expect(levels.map((l) => l.disabled)).toEqual([false, true, true]);
    expect(levels[1].hasAttribute('data-locked')).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'D Major' }));
    fireEvent.click(document.querySelector('[data-echo-mode="minor"]')!);
    expect(document.querySelector('[data-echo-chosen-key]')?.textContent).toBe(
      'D',
    );
    fireEvent.click(document.querySelector('[data-echo-start]')!);
    expect(screenKind()).toBe('intro');
    expect(readEchoProgress().last).toEqual({
      level: 1,
      key: { tonic: 'D', mode: 'minor' },
    });
  });

  it('shows each level’s High Score, and opens a level once the one before is done', () => {
    localStorage.setItem(
      ECHO_PROGRESS_KEY,
      JSON.stringify({
        version: 1,
        unlocked: 2,
        highScores: { 1: 9 },
        songs: {},
        last: null,
      }),
    );
    renderGame();
    expect(
      document.querySelector('[data-echo-level="1"] [data-echo-high-score]')
        ?.textContent,
    ).toMatch(/High Score 9/);
    expect(
      (document.querySelector('[data-echo-level="2"]') as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      (document.querySelector('[data-echo-level="3"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('plays the sections, the boss (lost, then won), the gate and the song', async () => {
    renderGame();
    fireEvent.click(document.querySelector('[data-echo-start]')!);
    expect(screenKind()).toBe('intro');
    await wait(INTRO_MS);
    expect(screenKind()).toBe('round');

    // ── Melody Echo: eight rounds, the third missed ──
    for (let round = 0; round < 8; round++) {
      const el = stage();
      expect(el.getAttribute('data-echo-section')).toBe('melodyEcho');
      expect(el.getAttribute('data-echo-round')).toBe(String(round));
      // The round after the miss is an easier one, and says so.
      expect(el.hasAttribute('data-echo-easier')).toBe(round === 3);
      await playRun(() => round !== 2);
      const result = document.querySelector('[data-echo-result]');
      expect(result?.getAttribute('data-echo-result')).toBe(
        round === 2 ? 'miss' : 'pass',
      );
      if (round === 1) expect(streak()).toBe(2);
      if (round === 2) {
        // The streak goes out; what Atlas asked, and nothing played.
        expect(streak()).toBe(0);
        expect(result?.textContent).toMatch(/no notes/);
      }
      await wait(RESULT_MS);
    }

    // ── Chord Echo: six rounds on the chord pads ──
    expect(screenKind()).toBe('intro');
    expect(
      document.querySelector('[data-echo-section="chordEcho"]'),
    ).toBeTruthy();
    await wait(INTRO_MS);
    for (let round = 0; round < 6; round++) {
      expect(stage().getAttribute('data-echo-section')).toBe('chordEcho');
      expect(
        document.querySelectorAll('[data-echo-pads="chords"] [data-echo-pad]'),
      ).toHaveLength(7);
      await playRun(() => true);
      expect(
        document
          .querySelector('[data-echo-result]')
          ?.getAttribute('data-echo-result'),
      ).toBe('pass');
      // 5 good melody echoes after the miss, then the chords.
      expect(streak()).toBe(6 + round);
      await wait(RESULT_MS);
    }

    // The boss's videos are loading since Chord Echo began.
    expect(
      document.querySelectorAll('video[data-echo-boss-clip]'),
    ).toHaveLength(5);

    // ── The Echo Boss: its entrance ──
    expect(screenKind()).toBe('bossIntro');
    expect(screen.getByText('The Echo Boss Appears!')).toBeTruthy();
    await flush();
    expect(plays).toEqual(['emerge@1.00']);
    // The fight starts when the boss has emerged.
    await playOut('emerge');
    expect(screenKind()).toBe('boss');
    expect(artFront()).toBe('emerge');
    // The boss plays at the game's top tempo.
    await flush();
    expect(run.tempo).toBe(96);
    const reaction = (clip: 'frown' | 'nod') =>
      `${clip}@${reactionRate(clip, barSeconds(96) * BOSS_GAP_BARS).toFixed(2)}`;
    const health = () =>
      document
        .querySelector('[data-echo-boss-health]')
        ?.getAttribute('data-echo-boss-health');
    expect(health()).toBe('3');

    // ── Lost at the second miss: a nod, then the loss ──
    const stopsBefore = run.stops;
    await playRun((call) => call >= 2);
    expect(plays.slice(1)).toEqual([reaction('nod'), 'loss@1.00']);
    expect(
      document
        .querySelector('[data-echo-boss-card]')
        ?.getAttribute('data-echo-boss-card'),
    ).toBe('lost');
    // The music stopped once the fight was lost.
    expect(run.stops).toBeGreaterThan(stopsBefore);
    expect(health()).toBe('3');
    // Try the Boss again waits for the loss; its video never starts here,
    // so its still (the black hole) stands in, a moment.
    expect(
      screen.queryByRole('button', { name: 'Try the Boss again' }),
    ).toBeNull();
    await wait(VIDEO_START_MS);
    expect(artStill()).toBe(BOSS_VORTEX);
    await wait(STILL_MS.loss);
    expect(document.querySelector('[data-echo-boss-retry]')).toBeTruthy();

    // ── Try the Boss again: won at the third good echo ──
    const startsBefore = run.starts;
    fireEvent.click(screen.getByRole('button', { name: 'Try the Boss again' }));
    await flush();
    expect(run.starts).toBe(startsBefore + 1);
    expect(screenKind()).toBe('boss');
    expect(health()).toBe('3');
    // The boss is back, on its face.
    expect(artFront()).toBeNull();
    expect(artStill()).toBe(BOSS_FACE);
    plays = [];
    await playRun(() => true);
    // A frown at each good echo; the third wins.
    expect(plays).toEqual([
      reaction('frown'),
      reaction('frown'),
      'victory@1.00',
    ]);
    expect(
      document
        .querySelector('[data-echo-boss-card]')
        ?.getAttribute('data-echo-boss-outcome'),
    ).toBe('won');
    expect(health()).toBe('0');
    expect(xp.mutateAsync).not.toHaveBeenCalled();
    // Continue skips the victory: the gate.
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));

    // ── The gate ──
    expect(screenKind()).toBe('gate');
    expect(screen.getByText('You beat the Echo Boss!')).toBeTruthy();
    // 7 + 6 good echoes in the sections, 3 against the boss, the boss: 50.
    expect(
      document.querySelector('[data-echo-stat="xp"]')?.textContent,
    ).toMatch(/\+210/);
    expect(
      document.querySelector('[data-echo-stat="best-streak"]')?.textContent,
    ).toMatch(/11/);
    expect(document.querySelector('[data-echo-new-high-score]')).toBeTruthy();
    const percents = [
      ...document.querySelectorAll('[data-echo-section-stat]'),
    ].map((el) => [
      el.getAttribute('data-echo-section-stat'),
      el.querySelector('[data-echo-percent]')?.textContent,
    ]);
    expect(percents).toEqual([
      ['melodyEcho', '88%'],
      ['chordEcho', '100%'],
      ['boss', '60%'],
    ]);
    // Arcade XP, awarded once.
    expect(xp.mutateAsync).toHaveBeenCalledTimes(1);
    expect(readEchoProgress().highScores[1]).toBe(11);

    // ── Make Your Song ──
    fireEvent.click(document.querySelector('[data-echo-make-your-song]')!);
    vi.useRealTimers();
    expect(await screen.findByText('Finish My Song')).toBeTruthy();
    // The input the play screens hand over.
    expect(
      document.querySelectorAll('[data-make-your-song-stub] [data-echo-pad]'),
    ).toHaveLength(8);
    expect(readStopDone('echo')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Finish My Song' }));
    expect(readStopDone('echo')).toBe(true);
    expect(readEchoProgress().unlocked).toBe(2);
    expect(readEchoProgress().songs).toEqual({ 1: 1 });
    expect(xp.mutateAsync).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next Level!' }));
    expect(screenKind()).toBe('intro');
    expect(screen.getByText(/Level 2 · C Major/)).toBeTruthy();
  });

  it('hears a chord played on the keyboard, in any octave or order', async () => {
    localStorage.setItem(
      ECHO_SETTINGS_KEY,
      JSON.stringify({ input: 'keyboard', groove: false }),
    );
    resetEchoSettingsCache();
    renderGame();
    fireEvent.click(document.querySelector('[data-echo-start]')!);
    await wait(INTRO_MS);
    // Melody Echo let go by, to get to the chords.
    for (let round = 0; round < 8; round++) {
      await playRun(() => false);
      await wait(RESULT_MS);
    }
    await wait(INTRO_MS);
    for (let round = 0; round < 3; round++) {
      expect(stage().getAttribute('data-echo-section')).toBe('chordEcho');
      expect(
        document.querySelector('[data-echo-input="keyboard"]'),
      ).toBeTruthy();
      expect(document.querySelector('[data-echo-pads]')).toBeNull();
      await playRun(() => true, 'letters');
      const result = document.querySelector('[data-echo-result]');
      expect(result?.getAttribute('data-echo-result')).toBe('pass');
      // The chords named as the student played them.
      expect(result?.textContent).toMatch(/You.*\d (maj|min)/);
      await wait(RESULT_MS);
    }
  });

  it('pauses the music for Game Settings, and remembers what’s set there', async () => {
    renderGame();
    fireEvent.click(document.querySelector('[data-echo-start]')!);
    await wait(INTRO_MS);
    await flush();
    expect(run.starts).toBe(1);
    const stops = run.stops;
    fireEvent.click(document.querySelector('[data-echo-settings-button]')!);
    expect(run.stops).toBeGreaterThan(stops);
    const sheet = document.querySelector(
      '[data-guitar-sheet="echo-settings"]',
    )!;
    expect(sheet.textContent).toMatch(/Training wheels/);
    fireEvent.click(screen.getByRole('radio', { name: 'Keyboard' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Auto-Tune Melody' }));
    const saved = JSON.parse(localStorage.getItem(ECHO_SETTINGS_KEY)!);
    expect(saved.input).toBe('keyboard');
    expect(saved.scaffolding.autoTune).toBe(true);
    expect(saved.scaffolding.rootsOnly).toBe(false);
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    await flush();
    // Paused until Play: then the call again, from its count-in.
    expect(document.querySelector('[data-echo-paused]')?.textContent).toMatch(
      /from the count-in/,
    );
    fireEvent.click(document.querySelector('[data-echo-paused] button')!);
    await flush();
    expect(run.starts).toBe(2);
    expect(document.querySelector('[data-echo-input="keyboard"]')).toBeTruthy();
  });

  it('holds the game between activities until Play', async () => {
    renderGame();
    fireEvent.click(document.querySelector('[data-echo-start]')!);
    const pause = () =>
      document.querySelector<HTMLButtonElement>('[data-echo-pause-button]')!;
    // Over the title card: it waits, however long.
    expect(pause().textContent).toBe('Pause');
    fireEvent.click(pause());
    expect(pause().textContent).toBe('Play');
    await wait(INTRO_MS * 3);
    expect(screenKind()).toBe('intro');
    expect(document.querySelector('[data-echo-paused]')?.textContent).toMatch(
      /waits here/,
    );
    fireEvent.click(document.querySelector('[data-echo-paused] button')!);
    expect(document.querySelector('[data-echo-paused]')).toBeNull();
    await wait(INTRO_MS);
    expect(screenKind()).toBe('round');
    // A round echoed, then paused over its result: the next call waits.
    await playRun(() => true);
    expect(document.querySelector('[data-echo-result]')).toBeTruthy();
    const starts = run.starts;
    fireEvent.click(pause());
    await wait(RESULT_MS * 3);
    await flush();
    expect(stage().getAttribute('data-echo-round')).toBe('0');
    expect(run.starts).toBe(starts);
    // Play: the result's wait, then the next round.
    fireEvent.click(pause());
    await wait(RESULT_MS);
    await flush();
    expect(stage().getAttribute('data-echo-round')).toBe('1');
    expect(run.starts).toBe(starts + 1);
  });
});

describe('the Echo Boss’s art', () => {
  // Straight to the boss: the development shortcut (EchoGame's `?boss`).
  beforeEach(() => window.history.pushState({}, '', '/arcade/echo?boss'));
  afterEach(() => {
    window.history.pushState({}, '', '/');
    vi.unstubAllGlobals();
  });

  const startAtBoss = () => {
    renderGame();
    fireEvent.click(document.querySelector('[data-echo-start]')!);
    expect(screenKind()).toBe('bossIntro');
  };
  /** Where the run's first gap begins: the second call's count-in. */
  const firstGap = () => {
    const beats = (run.cues as RunCue[]).filter((c) => c.kind === 'beat');
    const answer = beats.findIndex((b) => b.phase === 'response');
    return beats.slice(answer).find((b) => b.phase === 'countIn')!.tick;
  };

  it('fights on Fight!, the entrance cut short at the face', async () => {
    startAtBoss();
    await flush();
    expect(plays).toEqual(['emerge@1.00']);
    act(() => {
      fireEvent.playing(video('emerge'));
    });
    // The live ring fades as the art comes up.
    expect(
      document
        .querySelector('[data-literacy-ring]')
        ?.getAttribute('data-literacy-ring'),
    ).toBe('faded');
    fireEvent.click(screen.getByRole('button', { name: /Fight!/ }));
    expect(screenKind()).toBe('boss');
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(artFront()).toBeNull();
    expect(artStill()).toBe(BOSS_FACE);
    await flush();
    expect(run.starts).toBe(1);
    // A late end of the entrance starts nothing more.
    act(() => {
      fireEvent.ended(video('emerge'));
    });
    expect(screenKind()).toBe('boss');
  });

  it('leaves a bar between calls for the boss to react, and grades on', async () => {
    startAtBoss();
    await playOut('emerge');
    await flush();
    const gap = firstGap();
    const bar = 1920;
    // The first call's answer, played and graded at the gap's downbeat.
    await playRun(() => true, 'pads', { until: gap + 1 });
    const tempo = run.tempo;
    expect(plays.at(-1)).toBe(
      `frown@${reactionRate('frown', barSeconds(tempo)).toFixed(2)}`,
    );
    expect(
      document
        .querySelector('[data-echo-boss-health]')
        ?.getAttribute('data-echo-boss-health'),
    ).toBe('2');
    // The bar is the next call's count-in: GET READY, the groove going on.
    expect(
      document
        .querySelector('[data-literacy-hub="bar"]')
        ?.getAttribute('data-cue'),
    ).toBe('getReady');
    const notes = (run.cues as RunCue[]).filter(
      (c) => c.kind === 'note' && c.tick >= gap,
    );
    expect(Math.min(...notes.map((n) => n.tick))).toBeGreaterThanOrEqual(
      gap + bar,
    );
    // The frown is over before the next call: then the face.
    await playOut('frown');
    // The next call, missed, then the third, good: a nod, then a frown.
    await playRun((call) => call !== 1, 'pads', { from: gap + 1 });
    expect(plays.slice(1)).toEqual([
      `frown@${reactionRate('frown', barSeconds(tempo)).toFixed(2)}`,
      `nod@${reactionRate('nod', barSeconds(tempo)).toFixed(2)}`,
      `frown@${reactionRate('frown', barSeconds(tempo)).toFixed(2)}`,
      'victory@1.00',
    ]);
    // Won at the fourth call; the victory plays out, the art fades back to
    // the ring, and the gate opens.
    await playOut('victory');
    expect(art()?.getAttribute('data-echo-boss-art')).toBe('down');
    expect(screenKind()).toBe('boss');
    await wait(700);
    expect(screenKind()).toBe('gate');
  });

  it('skips the loss on Continue', async () => {
    startAtBoss();
    await playOut('emerge');
    await playRun(() => false);
    expect(plays.at(-1)).toBe('loss@1.00');
    expect(document.querySelector('[data-echo-boss-retry]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(document.querySelector('[data-echo-boss-retry]')).toBeTruthy();
    // Its late end changes nothing.
    act(() => {
      fireEvent.ended(video('loss'));
    });
    expect(
      screen.getAllByRole('button', { name: 'Try the Boss again' }),
    ).toHaveLength(1);
  });

  it('shows stills under reduced motion, each a moment', async () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    startAtBoss();
    expect(document.querySelectorAll('video')).toHaveLength(0);
    // The entrance: the face, a moment, then the fight.
    expect(artStill()).toBe(BOSS_FACE);
    await wait(STILL_MS.emerge);
    expect(screenKind()).toBe('boss');
    await flush();
    const gap = firstGap();
    await playRun(() => true, 'pads', { until: gap + 1 });
    expect(artStill()).toBe('/echo/boss/boss-frown.webp');
    await wait((4 / reactionRate('frown', barSeconds(run.tempo))) * 1000);
    expect(artStill()).toBe(BOSS_FACE);
    await playRun(() => true, 'pads', { from: gap + 1 });
    expect(artStill()).toBe('/echo/boss/boss-victory.webp');
    await wait(STILL_MS.victory);
    expect(screenKind()).toBe('gate');
    expect(plays).toEqual([]);
  });
});
