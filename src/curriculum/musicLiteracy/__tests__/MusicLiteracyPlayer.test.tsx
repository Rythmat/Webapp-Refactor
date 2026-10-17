// @vitest-environment jsdom
/**
 * The Music Literacy step, as a student meets it: Play, the count-in, the
 * words lighting syllable by syllable, the call, YOUR TURN, the answer on
 * the computer keyboard, the score, Try again and Next, and the minor step's
 * color. The transport run is faked (literacyRun.ts): the test hands the
 * player each cue itself and says where on the timeline a key lands.
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLiveMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import {
  runCues,
  type RunCue,
  type RunMode,
} from '@/curriculum/engine/musicLiteracy/run';

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
  kit: undefined as string | undefined,
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
    kit,
  }: {
    onCue: (cue: unknown) => void;
    cues: unknown[];
    kit?: string;
  }) => {
    run.onCue = onCue;
    run.cues = cues;
    run.kit = kit;
    run.starts += 1;
    return true;
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
const msp = vi.hoisted(() => ({ reportCompletion: vi.fn() }));
vi.mock('@/features/classroom/msp', () => ({
  useMspModuleCompletion: () => msp,
}));

const { MusicLiteracyPlayer } = await import('../MusicLiteracyPlayer');
const { setDrumGrooveClick, setDrumGrooveId } = await import(
  '@/learn/audio/drumGrooveSettingsStore'
);

const lesson = getLiveMusicLiteracy('music-literacy-part-1')!;

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{`${pathname}${search}`}</output>;
};

function renderPlayer(
  url = '/curriculum/music-literacy/music-literacy-part-1',
) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <MusicLiteracyPlayer lesson={lesson} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const hub = () => document.querySelector('[data-literacy-hub]')!;
const title = () => document.querySelector('[data-guitar-title]')?.textContent;
const stepIndex = () => lesson.steps.findIndex((s) => s.title === title());

/** Every cue of the current step's run up to `tick`, not yet handed over. */
let fed = 0;
function feedTo(tick: number, mode: RunMode = 'play') {
  const cues = runCues(lesson, lesson.steps[stepIndex()], mode, {
    metronome: false,
  });
  const due = cues.filter((c) => c.tick <= tick).slice(fed);
  fed += due.length;
  act(() => due.forEach((cue: RunCue) => run.onCue!(cue)));
}

async function press(button: string | RegExp) {
  fed = 0;
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: button }));
  });
}

/** Type `code` landing on `tick`, held for most of a beat. */
function typeAt(code: string, tick: number) {
  run.tick = tick;
  act(() => {
    fireEvent.keyDown(window, { code });
  });
  run.tick = tick + 400;
  act(() => {
    fireEvent.keyUp(window, { code });
  });
}

describe('a Music Literacy step', () => {
  beforeEach(() => {
    localStorage.clear();
    run.onCue = null;
    run.starts = 0;
    run.tick = null;
    msp.reportCompletion.mockClear();
  });
  afterEach(() => {
    cleanup();
    setDrumGrooveId(null);
    setDrumGrooveClick(false);
  });

  it('runs count-in, words, call, then the student’s turn, and scores the answer', async () => {
    renderPlayer();
    expect(title()).toBe('A note called C');
    expect(hub().getAttribute('data-turn')).toBe('idle');
    expect(hub().textContent).toContain('The call');
    expect(
      document
        .querySelector('[data-literacy-degrees]')
        ?.getAttribute('aria-label'),
    ).toBe('Scale degrees 1 1 1');

    await press('Play');
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();

    feedTo(0);
    expect(hub().getAttribute('data-turn')).toBe('countIn');
    expect(hub().textContent).toContain('Ready');

    feedTo(1920);
    expect(hub().getAttribute('data-turn')).toBe('words');
    expect(hub().textContent).toContain('My turn');
    expect(document.querySelector('[data-word-now]')?.textContent).toContain(
      'Hey',
    );
    feedTo(1920 + 1440);
    expect(document.querySelector('[data-word-now]')?.textContent).toContain(
      'gon',
    );

    feedTo(5760 + 500);
    expect(hub().getAttribute('data-turn')).toBe('call');
    // The call is the teacher's too: MY TURN, its degrees lit as they sound.
    expect(hub().textContent).toContain('My turn');
    expect(document.querySelectorAll('[data-degree-lit]')).toHaveLength(1);

    feedTo(7680);
    expect(hub().getAttribute('data-turn')).toBe('response');
    expect(hub().textContent).toContain('Your turn');

    typeAt('KeyA', 7680);
    typeAt('KeyA', 8160);
    typeAt('KeyA', 8640);
    feedTo(9600);

    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
    expect(screen.getByText('Passed')).toBeTruthy();
    expect(
      JSON.parse(
        localStorage.getItem('music_literacy_progress_music-literacy-part-1')!,
      )['note-called-c'],
    ).toMatchObject({ best: 100, passed: true });
    expect(
      document
        .querySelector('[data-guitar-step-count]')
        ?.getAttribute('aria-label'),
    ).toBe('Step 1 of 7, passed');
  });

  it('scores wrong notes low and still offers Next; Try again runs it again', async () => {
    renderPlayer();
    await press('Play');
    feedTo(7680);
    typeAt('KeyD', 7680);
    typeAt('KeyF', 8160);
    typeAt('KeyG', 8640);
    feedTo(9600);
    expect(screen.getByRole('heading', { name: '0%' })).toBeTruthy();
    expect(screen.getByText('Not yet · 70% passes')).toBeTruthy();

    await press('Try Again');
    expect(run.starts).toBe(2);
    feedTo(7680);
    // Played along with the call: not the answer.
    typeAt('KeyA', 5760);
    feedTo(9600);
    expect(screen.getByRole('heading', { name: '0%' })).toBeTruthy();

    await press(/^Next$/);
    expect(title()).toBe('The root is 1');
    expect(hub().getAttribute('data-turn')).toBe('idle');
  });

  it('shows a minor step in its relative major’s color', () => {
    renderPlayer();
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    }
    expect(title()).toBe('Flat the 3: Minor');
    expect(
      document.querySelector('[data-literacy-key]')?.textContent,
    ).toContain('C Minor');
    const selected = [
      ...document.querySelectorAll('[data-literacy-circle] path'),
    ].find((path) => path.getAttribute('stroke') === '#fff');
    expect(selected?.getAttribute('fill')).toBe('rgb(157, 127, 206)'); // E♭
    expect(
      document
        .querySelector('[data-literacy-degrees]')
        ?.getAttribute('aria-label'),
    ).toBe('Scale degrees 1 ♭3 1');
  });

  it('tells the classroom when the last step is passed', async () => {
    renderPlayer();
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    }
    expect(title()).toBe('The Minor Triad');
    await press('Play');
    // Two bars of call: the answer starts at 9600.
    feedTo(9600);
    ['KeyA', 'KeyE', 'KeyG', 'KeyE', 'KeyA'].forEach((code, i) =>
      typeAt(code, 9600 + i * 480),
    );
    feedTo(13440);
    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
    expect(msp.reportCompletion).toHaveBeenCalledTimes(1);

    // The last step's Finish goes back to the path the lesson is on.
    await press(/^Finish$/);
    expect(screen.getByTestId('location').textContent).toBe(
      '/learn?tab=StartHere',
    );
  });

  it('opens on the step `?step=` names (Start Here’s Continue)', () => {
    renderPlayer(
      '/curriculum/music-literacy/music-literacy-part-1?step=add-the-3',
    );
    expect(title()).toBe('Add the 3: Major');
    cleanup();
    // A step it doesn't know: step 1.
    renderPlayer('/curriculum/music-literacy/music-literacy-part-1?step=gone');
    expect(title()).toBe('A note called C');
  });

  it('reads a syllable ending in "-" and the next as one word, each lit on its own', async () => {
    renderPlayer();
    expect(
      document
        .querySelector('[data-literacy-words]')
        ?.getAttribute('aria-label'),
    ).toBe("Words: Hey hey hey I'm gon-na play on a note called C");
    const syllable = (i: number) =>
      document.querySelector(`[data-word-index="${i}"]`)!;
    // "gon-" and "na" share a word; "I'm" is a word of its own.
    expect(syllable(4).textContent).toContain('gon-');
    expect(syllable(4).parentElement).toBe(syllable(5).parentElement);
    expect(syllable(4).parentElement?.hasAttribute('data-literacy-word')).toBe(
      true,
    );
    expect(syllable(3).parentElement).not.toBe(syllable(4).parentElement);

    await press('Play');
    feedTo(1920 + 1680);
    const lit = document.querySelectorAll('[data-word-now]');
    expect(lit).toHaveLength(1);
    expect(lit[0].getAttribute('data-word-index')).toBe('5');
  });

  it('lets Listen and Practice run without a score', async () => {
    renderPlayer();
    await press('Listen');
    feedTo(9600, 'listen');
    expect(document.querySelector('[data-guitar-result]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    await press('Practice');
    feedTo(9600, 'practice');
    expect(document.querySelector('[data-guitar-result]')).toBeNull();
    expect(
      localStorage.getItem('music_literacy_progress_music-literacy-part-1'),
    ).toBeNull();
  });

  it('never shows a key wrong in the teacher’s turn, nor grades it', async () => {
    renderPlayer();
    await press('Play');
    feedTo(1920 + 480);
    // A teacher playing along on E (the D key; not in the call) during the words.
    run.tick = 1920 + 480;
    const grayKeys = () =>
      [...document.querySelectorAll<HTMLElement>('div')].filter(
        (el) => el.style.backgroundColor === 'rgb(113, 113, 122)', // WRONG_KEY_COLOR
      );
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyD' });
    });
    expect(grayKeys()).toHaveLength(0);
    act(() => {
      fireEvent.keyUp(window, { code: 'KeyD' });
    });
    typeAt('KeyG', 5760 + 480); // and G during the call
    feedTo(7680);
    typeAt('KeyA', 7680);
    typeAt('KeyA', 8160);
    typeAt('KeyA', 8640);
    feedTo(9600);
    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
    // Out of the run, that E is wrong again (C is the figure): gray.
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyD' });
    });
    expect(grayKeys().length).toBeGreaterThan(0);
  });

  it('plays a chosen groove from the words, ends on its final downbeat, and grades the same', async () => {
    setDrumGrooveId('straight-8');
    renderPlayer();
    await press('Play');
    await vi.waitFor(() => expect(run.starts).toBe(1));
    expect(run.kit).toBe('custom_custom_natural_01');
    const cues = run.cues as RunCue[];
    const drums = cues.filter((c) => c.kind === 'drum');
    expect(drums[0].tick).toBe(1920);
    expect(drums.filter((c) => c.tick === 9600).map((c) => c.note)).toEqual([
      36, 49,
    ]);
    expect(cues.at(-1)).toEqual({ kind: 'end', tick: 9600 + 960 });
    // The drums keep time: no click past the count-in.
    expect(
      cues.filter((c) => c.kind === 'beat' && c.click).map((c) => c.tick),
    ).toEqual([0, 480, 960, 1440]);

    const feed = (tick: number) =>
      act(() =>
        cues
          .filter((c) => c.tick <= tick && c.tick > fedTo)
          .forEach((c) => run.onCue!(c)),
      );
    let fedTo = -1;
    feed(7680);
    fedTo = 7680;
    typeAt('KeyA', 7680);
    typeAt('KeyA', 8160);
    typeAt('KeyA', 8640);
    feed(9600);
    fedTo = 9600;
    // The final downbeat is ringing: the result waits for it.
    expect(document.querySelector('[data-guitar-result]')).toBeNull();
    expect(hub().textContent).toContain('Your turn');
    feed(9600 + 960);
    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
  });

  it('clicks over the groove when asked to, and plays it in Listen too', async () => {
    setDrumGrooveId('straight-8');
    setDrumGrooveClick(true);
    renderPlayer();
    await press('Listen');
    await vi.waitFor(() => expect(run.starts).toBe(1));
    const cues = run.cues as RunCue[];
    expect(cues.some((c) => c.kind === 'drum')).toBe(true);
    expect(
      cues
        .filter((c) => c.kind === 'beat' && c.tick < 9600)
        .every((c) => c.kind === 'beat' && c.click),
    ).toBe(true);
  });
});

describe('a step whose words have a pickup', () => {
  // "When I play in a Key…" with "When I" on 4 and its "and", in the
  // count-in bar, over the drums.
  const root = lesson.steps.find((s) => s.tag === 'root-is-1')!;
  const pickupLesson = {
    ...lesson,
    steps: [
      {
        ...root,
        words: {
          ...root.words,
          pickup: 480,
          notes: root.words.notes.map((n) => ({ ...n, tick: n.tick - 480 })),
        },
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    run.onCue = null;
    run.starts = 0;
    run.tick = null;
  });
  afterEach(() => {
    cleanup();
    setDrumGrooveId(null);
  });

  it('counts in under the pickup, sings "When I" on 4 and its "and", brings the drums in on the downbeat, and grades the same', async () => {
    setDrumGrooveId('straight-8');
    render(
      <MemoryRouter initialEntries={['/curriculum/music-literacy/x']}>
        <MusicLiteracyPlayer lesson={pickupLesson} />
      </MemoryRouter>,
    );
    // The pickup opens the first line of the words.
    const firstLine = document.querySelectorAll(
      '[data-literacy-words] p:first-child [data-word-index]',
    );
    expect([...firstLine].slice(0, 3).map((w) => w.textContent)).toEqual([
      '·When',
      '·I',
      '·play',
    ]);
    // The roll marks the downbeat with a double bar, ruler and grid.
    expect(document.querySelectorAll('[data-roll-double-bar]')).toHaveLength(2);

    await press('Play');
    await vi.waitFor(() => expect(run.starts).toBe(1));
    const cues = run.cues as RunCue[];
    expect(
      cues.filter((c) => c.kind === 'beat' && c.click).map((c) => c.tick),
    ).toEqual([0, 480, 960, 1440]);
    expect(cues.find((c) => c.kind === 'drum')?.tick).toBe(1920);

    let fedTo = -1;
    const feed = (tick: number) => {
      act(() =>
        cues
          .filter((c) => c.tick <= tick && c.tick > fedTo)
          .forEach((c) => run.onCue!(c)),
      );
      fedTo = tick;
    };
    const now = () => document.querySelector('[data-word-now]')?.textContent;
    feed(960);
    expect(hub().textContent).toContain('Ready');
    feed(1440);
    expect(hub().textContent).toContain('My turn');
    expect(now()).toContain('When');
    feed(1680);
    expect(now()).toContain('I');
    feed(1920);
    expect(now()).toContain('play');

    feed(7680);
    typeAt('KeyA', 7680);
    typeAt('KeyA', 8160);
    typeAt('KeyA', 8640);
    feed(9600 + 960);
    expect(screen.getByRole('heading', { name: '100%' })).toBeTruthy();
  });
});
