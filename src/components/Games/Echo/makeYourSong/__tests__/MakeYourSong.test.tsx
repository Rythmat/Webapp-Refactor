// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { EchoLevelNumber } from '@/curriculum/engine/echo';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import { buildBandPracticeTrack } from '@/features/practiceTracks/genre/bandPracticeTrack';
import { echoSongRefFromParams } from '@/features/practiceTracks/genre/echoSongRef';
import {
  peekEchoSong,
  takeEchoSong,
} from '@/features/practiceTracks/genre/echoSongStudio';
import { MakeYourSong } from '../MakeYourSong';
import type { PlayRequest } from '../songPlayer';
import type { EchoInputHandlers, MakeYourSongProps } from '../types';

/**
 * Make Your Song on the page: the band, the mini-Studio, takes recorded
 * through the input's handlers on the player's clock, the pop-up, the
 * victory and the Studio hand-off. The player is a fake: a test moves its
 * clock and plays its count-in, downbeat and end.
 */

const player = vi.hoisted(() => ({
  tick: 0 as number | null,
  requests: [] as PlayRequest[],
}));

vi.mock('../songPlayer', () => ({
  songPlayer: {
    load: vi.fn(async () => {}),
    prepareLive: vi.fn(async () => {}),
    play: vi.fn(async (request: PlayRequest) => {
      player.requests.push(request);
      return true;
    }),
    stop: vi.fn(),
    heardTick: () => player.tick,
    playedTick: () => player.tick,
    noteOn: vi.fn(),
    noteOff: vi.fn(),
  },
}));

vi.mock(
  '@/features/practiceTracks/genre/bandPracticeTrack',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/features/practiceTracks/genre/bandPracticeTrack')
      >();
    return {
      ...actual,
      buildBandPracticeTrack: vi.fn(actual.buildBandPracticeTrack),
    };
  },
);

const BAR = 1920;
let input: EchoInputHandlers | null = null;
const onSongFinished = vi.fn();
const onPlayAgain = vi.fn();
const onNextLevel = vi.fn();
const onExit = vi.fn();

/** Where the app went: the Studio's link lands here. */
function Where() {
  const location = useLocation();
  return (
    <p data-testid="where">
      {location.pathname}
      {location.search}
    </p>
  );
}

function renderGame(props: Partial<MakeYourSongProps> = {}) {
  return render(
    <MemoryRouter initialEntries={['/arcade/echo']}>
      <Routes>
        <Route
          path="/arcade/echo"
          element={
            <MakeYourSong
              level={1}
              keyChoice={{ tonic: 'C', mode: 'major' }}
              input="pads"
              scaffolding={{
                autoTune: false,
                rootsOnly: false,
                autoFill: false,
              }}
              renderInput={(handlers) => {
                input = handlers;
                return <div data-testid="input" data-kind={handlers.kind} />;
              }}
              onSongFinished={onSongFinished}
              onPlayAgain={onPlayAgain}
              onNextLevel={onNextLevel}
              onExit={onExit}
              {...props}
            />
          }
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const lastRun = () => player.requests[player.requests.length - 1];
const recordButton = () =>
  document.querySelector<HTMLButtonElement>('[data-echo-record]')!;
const track = (id: string) =>
  document.querySelector<HTMLElement>(`[data-echo-track="${id}"]`)!;
const clips = (id: string) =>
  track(id).querySelectorAll('[data-echo-clip]').length;
const bandChart = () =>
  document
    .querySelector('[data-echo-mini-studio]')
    ?.getAttribute('data-band-chart');

/** Into the mini-Studio on the first band, its sounds ready. */
async function openStudio() {
  await screen.findByRole('radiogroup', { name: 'Choose a Groove' });
  fireEvent.click(screen.getByRole('button', { name: 'Start My Song' }));
  await waitFor(() => expect(recordButton()).not.toBeDisabled());
}

/** A note played: down at `on`, up at `off`, ticks from the downbeat. */
type Played = { midi: number; on: number; off: number };

/** Record a take: Record, the count-in, the notes, the end. */
async function recordTake(notes: Played[]) {
  await waitFor(() => expect(recordButton()).not.toBeDisabled());
  fireEvent.click(recordButton());
  await waitFor(() => expect(player.requests.length).toBeGreaterThan(0));
  const run = lastRun();
  act(() => run.onCountIn?.(1));
  expect(document.querySelector('[data-echo-count-in]')).toHaveAttribute(
    'data-echo-count-in',
    '1',
  );
  act(() => run.onStart?.());
  const events = notes
    .flatMap((n) => [
      { tick: n.on, on: true, midi: n.midi },
      { tick: n.off, on: false, midi: n.midi },
    ])
    .sort((a, b) => a.tick - b.tick || Number(a.on) - Number(b.on));
  for (const e of events) {
    player.tick = e.tick;
    act(() => (e.on ? input!.noteOn(e.midi, 100) : input!.noteOff(e.midi)));
  }
  act(() => run.onEnd?.());
}

/** A chord a bar: its notes struck on the bar line and held. */
const chords = (...bars: number[][]): Played[] =>
  bars.flatMap((midis, bar) =>
    midis.map((midi) => ({ midi, on: bar * BAR, off: bar * BAR + 1800 })),
  );
const C = [60, 64, 67];
const Am = [57, 60, 64];
const F = [65, 69, 72];
const G = [67, 71, 74];
const melody: Played[] = [72, 76, 79, 76].map((midi, i) => ({
  midi,
  on: i * 480,
  off: i * 480 + 440,
}));

async function pressUseThatTake() {
  fireEvent.click(await screen.findByRole('button', { name: 'Use That Take' }));
}

/** Both takes in: 1 maj 6 min, and a melody. */
async function bothTakes() {
  await openStudio();
  await recordTake(chords(C, Am));
  await pressUseThatTake();
  await waitFor(() => expect(bandChart()).toBe('1-6-1-6-1-6-1-6'));
  await recordTake(melody);
  await pressUseThatTake();
}

beforeAll(() => pairingsReady);
beforeEach(() => {
  player.tick = 0;
  player.requests = [];
  input = null;
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  // Taking with any ref empties the hand-off box.
  takeEchoSong({} as never);
});

/** The ref of whatever is in the box, to empty it. */
function peekEchoSongRef() {
  const where = document.querySelector('[data-testid="where"]')?.textContent;
  if (!where?.includes('?')) return null;
  const params = new URLSearchParams(where.split('?')[1]);
  return echoSongRefFromParams((k) => params.get(k));
}

describe('Make Your Song', () => {
  it('chooses a band and groove, then opens on the Chords track', async () => {
    renderGame();
    expect(
      await screen.findByRole('heading', { name: 'Choose Your Band' }),
    ).toBeInTheDocument();
    await openStudio();
    expect(
      within(track('chords')).getByRole('button', { pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('input')).toHaveAttribute('data-kind', 'chords');
    expect(recordButton()).toHaveTextContent('Record Chords');
    // Before a chords take, the band plays the 1 chord.
    expect(bandChart()).toBe('1-1-1-1-1-1-1-1');
    expect(
      document.querySelectorAll('[data-echo-track^="band-"]').length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('records a take, shows it, and tries another or uses it', async () => {
    renderGame();
    await openStudio();
    await recordTake(chords(C, Am));
    // Recorded under the drums alone, the count-in a bar, the phrase 2 bars.
    const run = player.requests[0];
    expect(run).toMatchObject({ from: 0, to: 2 * BAR, countInBars: 1 });
    expect(run.tracks.map((t) => t.id)).toEqual(['drums']);
    const review = await screen.findByRole('region', {
      name: 'Your Chords Take',
    });
    expect(
      [...review.querySelectorAll('[data-echo-take-chord]')].map((el) =>
        el.getAttribute('data-echo-take-chord'),
      ),
    ).toEqual(['1 maj', '6 min']);
    fireEvent.click(screen.getByRole('button', { name: 'Try Another Take' }));
    expect(
      screen.queryByRole('region', { name: 'Your Chords Take' }),
    ).toBeNull();
    expect(clips('chords')).toBe(0);

    await recordTake(chords(C, Am));
    await pressUseThatTake();
    expect(clips('chords')).toBe(4);
    expect(track('chords')).toHaveAttribute('data-has-take', 'true');
  });

  it('plays the band over the student’s chords once a chords take is used', async () => {
    renderGame();
    await openStudio();
    const built = vi.mocked(buildBandPracticeTrack);
    await recordTake(chords(C, Am));
    await pressUseThatTake();
    await waitFor(() => expect(bandChart()).toBe('1-6-1-6-1-6-1-6'));
    const request = built.mock.calls.at(-1)![0];
    expect(request.chart.chords).toEqual([
      '1',
      '6',
      '1',
      '6',
      '1',
      '6',
      '1',
      '6',
    ]);
    expect(request.timedChords!.changes.map((c) => [c.tick, c.symbol])).toEqual(
      [0, 1, 2, 3].flatMap((r) => [
        [r * 2 * BAR, 'C'],
        [r * 2 * BAR + BAR, 'Am'],
      ]),
    );
    expect(request.timedChords!.length).toBe(8 * BAR);
  });

  it('switches tracks, and records a used take again from its track', async () => {
    renderGame();
    await openStudio();
    await recordTake(chords(C, Am));
    await pressUseThatTake();
    // On to the Melody, recorded over the whole band and the chords.
    expect(screen.getByTestId('input')).toHaveAttribute('data-kind', 'melody');
    expect(recordButton()).toHaveTextContent('Record Melody');
    fireEvent.click(within(track('chords')).getByRole('button'));
    expect(screen.getByTestId('input')).toHaveAttribute('data-kind', 'chords');
    expect(recordButton()).toHaveTextContent('Record Chords Again');

    await recordTake(chords(F, G));
    await pressUseThatTake();
    await waitFor(() => expect(bandChart()).toBe('4-5-4-5-4-5-4-5'));
    expect(
      [...track('chords').querySelectorAll('[data-echo-chord-block]')]
        .slice(0, 2)
        .map((el) => el.getAttribute('data-echo-chord-block')),
    ).toEqual(['4 maj', '5 maj']);

    fireEvent.click(within(track('melody')).getByRole('button'));
    await recordTake(melody);
    const run = lastRun();
    expect(run.tracks.map((t) => t.id)).toContain('chords');
    expect(run.tracks.map((t) => t.id)).toContain('drums');
    expect(run.tracks.length).toBeGreaterThan(2);
  });

  it('pops up Listen / Edit / Finish only once both tracks have a take', async () => {
    renderGame();
    await openStudio();
    await recordTake(chords(C, Am));
    await pressUseThatTake();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Finish My Song' })).toBeNull();
    await recordTake(melody);
    await pressUseThatTake();
    const popup = await screen.findByRole('dialog', {
      name: 'Your Song Is Ready!',
    });
    // Listen plays the whole song: the band and both takes.
    fireEvent.click(within(popup).getByRole('button', { name: 'Listen' }));
    await waitFor(() => expect(lastRun().to).toBe(8 * BAR));
    expect(lastRun().tracks.map((t) => t.id)).toEqual(
      expect.arrayContaining(['chords', 'melody', 'drums']),
    );
    expect(
      within(popup).getByRole('button', { name: 'Stop' }),
    ).toBeInTheDocument();
  });

  it('goes back to the mini-Studio on Edit, the band changeable, the takes kept', async () => {
    renderGame();
    await bothTakes();
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Edit',
      }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('[data-echo-mini-studio]')).not.toBeNull();
    expect(screen.getByTestId('input')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Change Band' }));
    const grooves = await screen.findByRole('radiogroup', {
      name: 'Choose a Groove',
    });
    const other = within(grooves).getAllByRole('radio')[1];
    fireEvent.click(other);
    fireEvent.click(screen.getByRole('button', { name: 'Back to My Song' }));
    await waitFor(() => expect(recordButton()).not.toBeDisabled());
    expect(clips('chords')).toBe(4);
    expect(clips('melody')).toBe(4);
    expect(
      document.querySelector('[data-echo-band-summary]'),
    ).toHaveTextContent(/BPM/);
    fireEvent.click(screen.getByRole('button', { name: 'Finish My Song' }));
    expect(
      await screen.findByRole('dialog', { name: 'Your Song Is Ready!' }),
    ).toBeInTheDocument();
  });

  it('finishes with the victory, calling onSongFinished once', async () => {
    const { rerender } = renderGame();
    await bothTakes();
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Finish',
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'You Made a Song!' }),
    ).toBeInTheDocument();
    expect(onSongFinished).toHaveBeenCalledTimes(1);
    rerender(
      <MemoryRouter initialEntries={['/arcade/echo']}>
        <p>again</p>
      </MemoryRouter>,
    );
    expect(onSongFinished).toHaveBeenCalledTimes(1);
  });

  it('shows the song’s chords, band and key, and the three ways on', async () => {
    renderGame();
    await bothTakes();
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Finish',
      }),
    );
    await screen.findByRole('heading', { name: 'You Made a Song!' });
    expect(
      screen.getByRole('list', { name: 'Your chords: 1 maj · 6 min' }),
    ).toHaveTextContent('1 maj' + 'C' + '6 min' + 'Am');
    expect(screen.getByText('C Major')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Next Level!/ }));
    expect(onNextLevel).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('button', { name: 'Take Your Song To The Studio!' }),
    );
    const where = await screen.findByTestId('where');
    expect(where.textContent).toMatch(/^\/studio\?echoSong=/);
    const ref = peekEchoSongRef()!;
    expect(ref).toMatchObject({ tonic: 'C', mode: 'major', level: '1' });
    const boxed = peekEchoSong(ref)!;
    expect(boxed.melody.events).toHaveLength(16);
    expect(boxed.band.length).toBeGreaterThan(0);
    expect(boxed.lane.map((c) => c.label).slice(0, 2)).toEqual([
      '1 maj',
      '6 min',
    ]);
  });

  it('hides Next Level! at the last level', async () => {
    renderGame({ onNextLevel: null });
    await bothTakes();
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Finish',
      }),
    );
    await screen.findByRole('heading', { name: 'You Made a Song!' });
    expect(screen.queryByRole('button', { name: /Next Level!/ })).toBeNull();
  });
});

describe('the song’s length, by level', () => {
  it.each([
    [1, '2 bars × 4', 4],
    [2, '4 bars × 2', 2],
    [3, '8 bars × 1', 1],
  ] as const)(
    'Level %i: eight bars, %s',
    async (level: EchoLevelNumber, label, repeats) => {
      renderGame({ level });
      await openStudio();
      expect(document.querySelectorAll('[data-echo-bar]')).toHaveLength(8);
      expect(
        document.querySelector('[data-echo-mini-studio]'),
      ).toHaveTextContent(label);
      await recordTake(chords(C, Am));
      expect(lastRun().to).toBe((8 / repeats) * BAR);
      await pressUseThatTake();
      expect(clips('chords')).toBe(repeats);
    },
  );
});
