// @vitest-environment jsdom
/**
 * Part 2 in the player, as a student meets it: choosing a key on the circle
 * and major or minor, choosing chords from the palette (the problems, Hear
 * it, Save) with the choices kept on the device; a step waiting for a choice
 * with its link; a chord echo graded; the replay; and Pass 2, the create
 * pass, from the call to its transcription, the repeat and the result, and
 * an empty call. The transport is faked (literacyRun.ts) as in the Part 1
 * player test: the test hands over each cue and says where a key lands.
 * The lesson is the frozen Part 2 fixture, not the live seed.
 */

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
import type {
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { PART2_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/part2Fixture';
import {
  choicesStorageKey,
  emptyChoices,
  withMode,
  withProgression,
  withTonic,
  type LiteracyChoices,
} from '@/curriculum/engine/musicLiteracy/choices';
import { EMPTY_CALL_FEEDBACK } from '@/curriculum/engine/musicLiteracy/createPass';
import type { RunCue } from '@/curriculum/engine/musicLiteracy/run';

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

/** The fake run: the latest start's cues and handler, and the clock's tick. */
const run = vi.hoisted(() => ({
  onCue: null as null | ((cue: unknown) => void),
  cues: [] as unknown[],
  added: [] as unknown[],
  starts: 0,
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
  }: {
    onCue: (cue: unknown) => void;
    cues: unknown[];
  }) => {
    run.onCue = onCue;
    run.cues = cues;
    run.added = [];
    run.starts += 1;
    return true;
  },
  addLiteracyRunCues: (cues: unknown[]) => {
    run.added.push(...cues);
  },
  stopLiteracyRun: () => {},
  previewLiteracyGroove: async () => {},
}));
vi.mock('@/audio/pianoSampler', () => ({
  triggerPianoAttack: async () => {},
  triggerPianoRelease: async () => {},
  releaseAllPianoNotes: async () => {},
  setPianoSamplerVolume: () => {},
}));
vi.mock('@/features/classroom/msp', () => ({
  useMspModuleCompletion: () => ({ reportCompletion: () => {} }),
}));

const { MusicLiteracyPlayer } = await import('../MusicLiteracyPlayer');

const lesson = PART2_FIXTURE;
const PROGRESS = `music_literacy_progress_${lesson.id}`;
const CHOICES = choicesStorageKey(lesson.id);

const cMajor = withMode(withTonic(emptyChoices(), 'C'), 'major');

function saveChoices(choices: LiteracyChoices) {
  localStorage.setItem(CHOICES, JSON.stringify(choices));
}
const savedChoices = () => JSON.parse(localStorage.getItem(CHOICES) ?? 'null');
const progress = () => JSON.parse(localStorage.getItem(PROGRESS) ?? '{}');

function renderPlayer(tag?: string, l: MusicLiteracyLesson = lesson) {
  return render(
    <MemoryRouter
      initialEntries={[
        `/curriculum/music-literacy/${l.id}${tag ? `?step=${tag}` : ''}`,
      ]}
    >
      <MusicLiteracyPlayer lesson={l} />
    </MemoryRouter>,
  );
}

const title = () => document.querySelector('[data-guitar-title]')?.textContent;
const headline = () =>
  document.querySelector('[data-literacy-turn]')?.textContent;
const bar = () => document.querySelector('[data-guitar-bar]')!;

/** The run's cues up to `tick`, each handed over once. */
let fedTo = -1;
function feedTo(tick: number) {
  const cues = run.cues as RunCue[];
  act(() =>
    cues
      .filter((c) => c.tick <= tick && c.tick > fedTo)
      .forEach((c) => run.onCue!(c)),
  );
  fedTo = tick;
}

async function press(name: string | RegExp) {
  fedTo = -1;
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

/** Keys pressed together at `tick` (letter keys, A = C4), held a while. */
function chordAt(codes: readonly string[], tick: number, hold = 400) {
  run.tick = tick;
  act(() => {
    for (const code of codes) fireEvent.keyDown(window, { code });
  });
  run.tick = tick + hold;
  act(() => {
    for (const code of codes) fireEvent.keyUp(window, { code });
  });
}
const typeAt = (code: string, tick: number, hold?: number) =>
  chordAt([code], tick, hold);

beforeEach(() => {
  localStorage.clear();
  run.onCue = null;
  run.starts = 0;
  run.tick = null;
  run.added = [];
  fedTo = -1;
});
afterEach(() => cleanup());

describe('choosing a color', () => {
  it('picks the key on the circle, names it, plays it and remembers it', async () => {
    renderPlayer();
    expect(title()).toBe('Choose your key');
    expect(screen.getByRole('heading', { name: 'Choose your color' }));
    // Nothing chosen yet: Next isn't the way on.
    expect(bar().querySelector('[data-primary]')).toBeNull();
    const ring = screen.getByRole('radiogroup', { name: 'Choose your key' });
    expect(ring.querySelectorAll('[role="radio"]')).toHaveLength(12);

    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'E♭ Major' }));
    });
    expect(savedChoices()).toMatchObject({ version: 1, tonic: 'Eb' });
    expect(
      screen
        .getByRole('radio', { name: 'E♭ Major' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      document.querySelector('[data-literacy-chosen-key]')?.textContent,
    ).toBe('E♭');
    expect(screen.getByText('Your 1 is E♭.')).toBeTruthy();
    // Picking it played its 1, 3 and 5.
    expect(run.starts).toBe(1);
    expect(
      (run.cues as RunCue[])
        .filter((c) => c.kind === 'note')
        .map((c) => c.kind === 'note' && c.midi)
        .slice(0, 3),
    ).toEqual([63, 67, 70]);
    // The step is done, and Next is the way on.
    expect(progress()['choose-key']).toMatchObject({ passed: true });
    expect(bar().querySelector('[data-primary]')?.textContent).toBe('Next');

    // Kept on the device: a new visit opens on the same key.
    cleanup();
    renderPlayer();
    expect(
      screen
        .getByRole('radio', { name: 'E♭ Major' })
        .getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('picks major or minor, showing the color minor takes', async () => {
    saveChoices(withTonic(emptyChoices(), 'C'));
    renderPlayer('choose-mode');
    expect(title()).toBe('Major or minor?');
    const minor = screen.getByRole('radio', { name: /C Minor/ });
    expect(minor.textContent).toContain('Minor takes E♭’s color');
    expect(minor.textContent).toContain('1 · ♭3 · 5');
    expect(
      screen.getByRole('radio', { name: /C Major/ }).textContent,
    ).toContain('1 · 3 · 5');

    await act(async () => {
      fireEvent.click(minor);
    });
    expect(savedChoices()).toMatchObject({ tonic: 'C', mode: 'minor' });
    expect(minor.getAttribute('aria-checked')).toBe('true');
    expect(progress()['choose-mode']).toMatchObject({ passed: true });
    // Minor's 1, ♭3 and 5 heard.
    expect(
      (run.cues as RunCue[])
        .filter((c) => c.kind === 'note')
        .map((c) => c.kind === 'note' && c.midi)
        .slice(0, 3),
    ).toEqual([60, 63, 67]);
  });

  it('shows a minor key in its relative major’s color, on the step’s circle', async () => {
    saveChoices(withMode(withTonic(emptyChoices(), 'C'), 'minor'));
    renderPlayer('one-three-five');
    expect(
      document.querySelector('[data-literacy-key]')?.textContent,
    ).toContain('C Minor');
    expect(
      document.querySelector('[data-literacy-key]')?.textContent,
    ).toContain('in E♭’s color');
    const selected = [
      ...document.querySelectorAll('[data-literacy-circle] path'),
    ].find((path) => path.getAttribute('stroke') === '#fff');
    expect(selected?.getAttribute('fill')).toBe('rgb(157, 127, 206)'); // E♭
    expect(
      document
        .querySelector('[data-literacy-degrees]')
        ?.getAttribute('aria-label'),
    ).toBe('Scale degrees 1 ♭3 5');
  });
});

describe('choosing chords', () => {
  it('fills the X from the six slices around the key, says what’s wrong, plays it and saves it', async () => {
    saveChoices(cMajor);
    renderPlayer('choose-x');
    expect(title()).toBe('Choose your X');
    const palette = screen.getByRole('group', {
      name: 'The chords of C Major',
    });
    // The palette: the mode's chords but the 1, each by its hybrid name.
    expect(
      [...palette.querySelectorAll('[role="button"]')].map((s) =>
        s.getAttribute('aria-label'),
      ),
    ).toEqual(['4 maj', '5 maj', '2 min', '6 min', '3 min']);
    const bars = () =>
      [...document.querySelectorAll('[data-template-bar]')].map(
        (b) => b.textContent,
      );
    expect(bars()).toEqual(['Bar 11 maj', 'Bar 2X']);
    expect(screen.getByText('Choose a chord for every X.')).toBeTruthy();
    const save = () =>
      document.querySelector<HTMLButtonElement>('[data-literacy-save]')!;
    expect(save().disabled).toBe(true);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '4 maj' }));
    });
    expect(bars()).toEqual(['Bar 11 maj', 'Bar 24 maj']);
    // The chord was heard as it was picked: F major, F3–C4.
    expect(
      (run.cues as RunCue[])
        .filter((c) => c.kind === 'note')
        .map((c) => c.kind === 'note' && c.midi),
    ).toEqual([53, 57, 60]);
    expect(document.querySelector('[data-literacy-problems]')).toBeNull();

    // Hear it: the whole progression, a chord each half bar.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Hear it' }));
    });
    const heard = (run.cues as RunCue[]).filter((c) => c.kind === 'note');
    expect(heard.map((c) => c.tick)).toEqual([0, 0, 0, 960, 960, 960]);

    await act(async () => {
      fireEvent.click(save());
    });
    expect(savedChoices().progressions['one-x']).toEqual({
      template: ['1', 'X'],
      chords: ['1', '4'],
      harmony: 'triads',
      tonic: 'C',
      mode: 'major',
    });
    expect(document.querySelector('[data-literacy-saved]')).toBeTruthy();
    expect(progress()['choose-x']).toMatchObject({ passed: true });
  });

  it('asks for as many different chords as the step wants, no more, no fewer', async () => {
    saveChoices(cMajor);
    const steps: LiteracyStep[] = [
      ...lesson.steps,
      {
        kind: 'chooseChords',
        tag: 'choose-one-x-x',
        title: 'One X, twice',
        template: ['1', 'X', 'X'],
        distinct: 1,
        harmony: 'triads',
        saveAs: 'one-x-x',
      },
    ];
    renderPlayer('choose-one-x-x', { ...lesson, steps });
    const tap = async (name: string) =>
      act(async () => {
        fireEvent.click(screen.getByRole('button', { name }));
      });
    await tap('4 maj');
    await tap('5 maj');
    expect(screen.getByText('Use just 1 different chord.')).toBeTruthy();

    // Bar 2 again, and the same chord as bar 3: right.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Bar 2:/ }));
    });
    await tap('5 maj');
    expect(document.querySelector('[data-literacy-problems]')).toBeNull();

    // Four chords, four different: two the same is too few.
    cleanup();
    saveChoices(cMajor);
    renderPlayer('choose-four');
    for (const chord of ['4 maj7', '5 dom7', '4 maj7', '6 min7']) {
      await tap(chord);
    }
    expect(screen.getByText('Use 4 different chords.')).toBeTruthy();
    expect(
      document.querySelector<HTMLButtonElement>('[data-literacy-save]')!
        .disabled,
    ).toBe(true);
  });
});

describe('a step that needs a choice', () => {
  it('waits for the key with a link to choose it', async () => {
    renderPlayer('one-three-five');
    expect(
      screen.getByRole('heading', { name: 'First, choose your color' }),
    ).toBeTruthy();
    expect(document.querySelector('[data-literacy-hub]')).toBeTruthy(); // kept, hidden
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Choose your color' }),
      );
    });
    expect(title()).toBe('Choose your key');
  });

  it('waits for the mode, then for the chords it plays', async () => {
    saveChoices(withTonic(emptyChoices(), 'D'));
    renderPlayer('the-1-chord');
    expect(
      screen.getByRole('heading', { name: 'First, choose major or minor' }),
    ).toBeTruthy();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Choose major or minor' }),
      );
    });
    expect(title()).toBe('Major or minor?');

    cleanup();
    saveChoices(cMajor);
    renderPlayer('hear-four');
    expect(
      screen.getByRole('heading', { name: 'First, choose your chords' }),
    ).toBeTruthy();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Choose your chords' }),
      );
    });
    expect(title()).toBe('Four chords');
  });
});

describe('a chord echo', () => {
  it('plays the chords in their rhythm, names each bar’s chord, and grades the chords played back', async () => {
    saveChoices(cMajor);
    renderPlayer('the-1-chord');
    expect(title()).toBe('The 1 chord');
    const chordBars = () =>
      [...document.querySelectorAll('[data-chord-bar]')].map((b) => [
        b.textContent,
        b.hasAttribute('data-lit'),
      ]);
    expect(chordBars()).toEqual([
      ['1 maj', false],
      ['4 maj', false],
    ]);
    // The roll marks each call bar by its chord.
    expect(
      [...document.querySelectorAll('[data-roll-band]')].map((b) =>
        b.getAttribute('data-roll-band'),
      ),
    ).toEqual(['1 maj', '4 maj']);

    await press('Play');
    // The call: C major, then F major, voiced D3–C♯4 roots.
    const calls = (run.cues as RunCue[]).filter(
      (c) => c.kind === 'note' && c.segment === 'call',
    );
    expect(calls.slice(0, 3).map((c) => c.kind === 'note' && c.midi)).toEqual([
      60, 64, 67,
    ]);
    feedTo(1920);
    expect(headline()).toBe('Get Ready');
    expect(
      document.querySelector('[data-literacy-hub-chord]')?.textContent,
    ).toBe('1 maj');
    feedTo(1920 * 2 + 10);
    expect(
      document.querySelector('[data-literacy-hub-chord]')?.textContent,
    ).toBe('4 maj');
    expect(chordBars()[1]).toEqual(['4 maj', true]);

    // The answer, chord for chord: C E G three times, then F A C.
    feedTo(5760);
    const C = ['KeyA', 'KeyD', 'KeyG'];
    const F = ['KeyF', 'KeyH', 'KeyK'];
    for (const tick of [5760, 6240, 6720]) chordAt(C, tick, 300);
    for (const tick of [7680, 8160, 8640]) chordAt(F, tick, 300);
    feedTo(9600);
    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
    expect(document.querySelector('[data-guitar-result] dt')?.textContent).toBe(
      'Chords',
    );
    expect(progress()['the-1-chord']).toMatchObject({
      best: 100,
      passed: true,
    });
  });

  it('marks a chord missing a note wrong', async () => {
    saveChoices(cMajor);
    renderPlayer('the-1-chord');
    await press('Play');
    feedTo(5760);
    for (const tick of [5760, 6240, 6720]) chordAt(['KeyA', 'KeyD'], tick);
    for (const tick of [7680, 8160, 8640]) {
      chordAt(['KeyF', 'KeyH', 'KeyK'], tick);
    }
    feedTo(9600);
    expect(screen.getByText(/3 chords missing a note/)).toBeTruthy();
  });
});

describe('the replay', () => {
  it('plays the saved progression as triads, then with 7ths, to listen to', async () => {
    saveChoices(
      withProgression(cMajor, 'four', {
        template: ['X', 'X', 'X', 'X'],
        chords: ['4', '5', '6', '2'],
        harmony: 'sevenths',
        tonic: 'C',
        mode: 'major',
      }),
    );
    renderPlayer('hear-four');
    expect(title()).toBe('Your four, with 7ths');
    const rows = () =>
      [...document.querySelectorAll('[data-literacy-chord-bars] ol')].map(
        (row) =>
          [...row.querySelectorAll('[data-chord-bar]')].map(
            (b) => b.textContent,
          ),
      );
    expect(rows()).toEqual([
      ['4 maj', '5 maj', '6 min', '2 min'],
      ['4 maj7', '5 dom7', '6 min7', '2 min7'],
    ]);
    // Nothing to grade: Listen is the way in.
    expect(bar().querySelector('[data-primary]')?.textContent).toBe('Listen');
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();

    await press('Listen');
    feedTo(0);
    expect(headline()).toBe('Listen');
    feedTo(1920);
    expect(headline()).toBe('Triads');
    feedTo(1920 * 5 + 10);
    expect(headline()).toBe('With 7ths');
    const lit = document.querySelector('[data-chord-bar][data-lit]');
    expect(lit?.textContent).toBe('4 maj7');
    feedTo(1920 * 9);
    expect(document.querySelector('[data-guitar-result]')).toBeNull();
    expect(progress()['hear-four']).toMatchObject({ passed: true });
    // The lesson's last step: Finish is the way on.
    expect(bar().querySelector('[data-primary]')?.textContent).toBe('Finish');
  });
});

describe('Pass 2, the create pass', () => {
  /** Pass 1 of 1-3-5 played right, in C major. */
  async function passTheEcho() {
    saveChoices(cMajor);
    renderPlayer('one-three-five');
    await press('Play');
    feedTo(3840);
    typeAt('KeyA', 3840);
    typeAt('KeyD', 4320);
    typeAt('KeyG', 4800);
    feedTo(5760);
    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
  }

  it('is offered after the echo: “Now Create Your Own Rhythms!”', async () => {
    await passTheEcho();
    expect(
      document.querySelector('[data-literacy-offer="create"]')?.textContent,
    ).toBe('Now Create Your Own Rhythms!');
    expect(bar().querySelector('[data-primary]')?.textContent).toContain(
      'Create Your Own',
    );
  });

  it('runs the student’s call, transcribes it, lights it for the repeat, and grades the repeat against it', async () => {
    await passTheEcho();
    await press(/Create Your Own/);
    expect(
      screen
        .getByRole('button', { name: /^Pass 2: Create/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    // No Atlas notes: the call is the student's.
    expect((run.cues as RunCue[]).some((c) => c.kind === 'note')).toBe(false);
    feedTo(0);
    expect(headline()).toBe('Get Ready');
    feedTo(1920);
    expect(headline()).toBe('Your Call');
    // The step's notes lit softly, 1, 3 and 5 in the hub.
    expect(
      document
        .querySelector('[data-literacy-degrees]')
        ?.getAttribute('aria-label'),
    ).toBe('Scale degrees 1 3 5');

    // Their call: 1 on the beat, 3 on the "and" (a touch late), a long 5,
    // and a D, which isn't one of the step's notes.
    typeAt('KeyA', 1920, 200);
    typeAt('KeyD', 2160 + 20, 200);
    typeAt('KeyS', 2640, 100);
    typeAt('KeyG', 2880, 900);
    feedTo(3360);
    expect(headline()).toBe('Go!');

    // The call is over: transcribed, and its keys lit for the repeat.
    feedTo(3840);
    const lights = run.added as RunCue[];
    expect(
      lights
        .filter((c) => c.kind === 'note')
        .map((c) => c.kind === 'note' && [c.tick, c.midi, c.sound]),
    ).toEqual([
      [3840, 60, false],
      [4080, 64, false],
      [4800, 67, false],
    ]);

    feedTo(4320);
    expect(headline()).toBe('Repeat It');
    // The repeat, note for note (the 3 played early).
    typeAt('KeyA', 3840, 200);
    typeAt('KeyD', 4080 - 150, 200);
    typeAt('KeyG', 4800, 900);
    feedTo(5760);

    const result = document.querySelector('[data-literacy-create-result]')!;
    expect(result).toBeTruthy();
    expect(result.querySelector('h2')?.textContent).toMatch(/^\d+%$/);
    // Their call and their repeat, side by side.
    expect(
      [...result.querySelectorAll('figcaption')].map((f) => f.textContent),
    ).toEqual(['Your call', 'Your repeat']);
    // Each note marked.
    expect(
      [...result.querySelectorAll('[data-timing]')].map((m) => [
        m.textContent,
        m.getAttribute('data-timing'),
      ]),
    ).toEqual([
      ['✓1on time', 'onTime'],
      ['◀3early', 'early'],
      ['✓5on time', 'onTime'],
    ]);
    // The D was left out, and shown gray.
    expect(
      result.querySelectorAll(
        '[data-literacy-compare="call"] [data-compare-note="gray"]',
      ),
    ).toHaveLength(1);
    expect(result.textContent).toContain('Gray notes aren’t this step’s notes');
    // Its own progress, apart from the echo's.
    expect(progress()['one-three-five:create']).toMatchObject({
      attempts: 1,
    });
    expect(progress()['one-three-five']).toMatchObject({
      best: 100,
      passed: true,
      attempts: 1,
    });
  });

  it('passes a clean repeat and checks Pass 2', async () => {
    await passTheEcho();
    await press(/Create Your Own/);
    const call: [string, number][] = [
      ['KeyA', 0],
      ['KeyD', 480],
      ['KeyG', 960],
      ['KeyG', 1200],
    ];
    for (const [code, at] of call) typeAt(code, 1920 + at, 200);
    feedTo(3840);
    for (const [code, at] of call) typeAt(code, 3840 + at, 200);
    feedTo(5760);
    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
    expect(screen.getByText('Passed')).toBeTruthy();
    expect(progress()['one-three-five:create']).toMatchObject({
      best: 100,
      passed: true,
    });
    expect(
      screen.getByRole('button', { name: 'Pass 2: Create, passed' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Pass 1: Echo, passed' }),
    ).toBeTruthy();
  });

  it('says to try again after an empty call, and records nothing', async () => {
    await passTheEcho();
    await press(/Create Your Own/);
    feedTo(3840);
    expect(
      document.querySelector('[data-literacy-empty-call]')?.textContent,
    ).toContain(EMPTY_CALL_FEEDBACK);
    expect(bar().querySelector('[data-primary]')?.textContent).toBe(
      'Try Again',
    );
    expect(progress()['one-three-five:create']).toBeUndefined();

    await press('Try Again');
    expect(run.starts).toBe(3);
    expect(headline()).toBe('Your rhythm');
  });

  it('can be opened from its tab, on a chord call too', async () => {
    saveChoices(cMajor);
    renderPlayer('the-1-chord');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Pass 2: Create/ }));
    });
    expect(
      document.querySelector('[data-literacy-run-lead]')?.textContent,
    ).toContain('Play your own rhythm');
    await press('Play');
    // Bar 1's chord is C major, bar 2's F major: a rhythm of each.
    feedTo(1920);
    expect(
      document.querySelector('[data-literacy-hub-chord]')?.textContent,
    ).toBe('1 maj');
    chordAt(['KeyA', 'KeyD', 'KeyG'], 1920, 300);
    chordAt(['KeyA', 'KeyD', 'KeyG'], 2880, 300);
    chordAt(['KeyF', 'KeyH', 'KeyK'], 3840, 900);
    feedTo(5760);
    expect(
      (run.added as RunCue[]).filter((c) => c.kind === 'note'),
    ).toHaveLength(9);
    chordAt(['KeyA', 'KeyD', 'KeyG'], 5760, 300);
    chordAt(['KeyA', 'KeyD', 'KeyG'], 6720, 300);
    chordAt(['KeyF', 'KeyH', 'KeyK'], 7680, 900);
    feedTo(9600);
    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
    expect(
      [...document.querySelectorAll('[data-timing]')].map((m) => m.textContent),
    ).toEqual(['✓1 majon time', '✓1 majon time', '✓4 majon time']);
  });
});

describe('the step list', () => {
  it('groups the steps by section, with Pass 2’s check beside the step’s', async () => {
    saveChoices(cMajor);
    localStorage.setItem(
      PROGRESS,
      JSON.stringify({
        'one-three-five': { best: 90, passed: true, attempts: 1 },
        'one-three-five:create': { best: 80, passed: true, attempts: 1 },
      }),
    );
    renderPlayer('one-three-five');
    await act(async () => {
      fireEvent.click(document.querySelector('[data-guitar-step-count]')!);
    });
    const list = document.querySelector('[data-guitar-step-list]')!;
    expect([...list.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([
      'Part 2 fixture',
      'Choose a Color',
      'Part 2 fixture',
      'Create a Melody',
      'Chords',
      '7th Chords',
    ]);
    expect(
      screen.getByRole('button', {
        name: '2: 1-3-5: passed; Create: passed',
      }),
    ).toBeTruthy();
  });
});

describe('the keyboard', () => {
  const fiveSixFive: LiteracyStep = {
    tag: 'five-six-five',
    title: '5-6-5',
    call: {
      bars: 1,
      notes: [
        { tick: 0, duration: 480, degree: '5' },
        { tick: 480, duration: 480, degree: '6' },
        { tick: 960, duration: 480, degree: '5' },
      ],
    },
  };
  const withStep = { ...lesson, steps: [...lesson.steps, fiveSixFive] };
  const whiteKeys = () =>
    document.querySelectorAll(
      '[data-literacy-keyboard] [data-testid="piano-keyboard-fill"] > div.flex-1',
    ).length;

  it('shows C3–C5, and widens to D5 for F major’s 6', () => {
    saveChoices(cMajor);
    renderPlayer('five-six-five', withStep);
    expect(whiteKeys()).toBe(15);
    cleanup();
    saveChoices(withMode(withTonic(emptyChoices(), 'F'), 'major'));
    renderPlayer('five-six-five', withStep);
    expect(whiteKeys()).toBe(16);
    // The 6 is on D5, the new last key, labeled.
    expect(
      document.querySelector('[data-literacy-keyboard] [data-key-label="6"]'),
    ).toBeTruthy();
  });
});
