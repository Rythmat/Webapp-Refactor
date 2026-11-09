// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { MidiNoteEvent } from '@prism/engine';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ── The drums' Generate and the drum dock's grooves (owner, 2026-10-22) ────
// The drum grid's bar has Generate (after Soundtrap's drum editor): one
// press writes a fresh groove over the pattern, as long as the clip, as one
// undo step. The Instrument tab's menu lists the kits, then the grooves: a
// kit picked plays the pads; a groove has Preview, to hear it first, and
// Add, to put it on the timeline. Run:
// npx vitest run src/daw/components/Controls/__tests__/drumGenerateAndGrooves.test.tsx

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: new Map(),
}));
vi.mock('@/daw/collab/studioRealtime', () => ({
  studioRealtime: { shouldBroadcast: () => false, send: vi.fn() },
}));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: vi.fn() }));

const g = vi.hoisted(() => ({
  events: new Map<string, MidiNoteEvent[]>(),
}));
vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: (id: string) => Promise.resolve(g.events.get(id) ?? null),
}));
// The Library's preview, without audio: it says what is playing.
const p = vi.hoisted(() => ({ started: [] as string[] }));
vi.mock('@/daw/shell/inspector/browser/preview', async () => {
  const { useBrowserStore } = await import(
    '@/daw/shell/inspector/browser/browserStore'
  );
  return {
    fromEvents: () => [],
    startNotesPreview: (id: string) => {
      p.started.push(id);
      useBrowserStore.getState().setPreview({ itemId: id, status: 'playing' });
      return Promise.resolve();
    },
    stopPreview: () => useBrowserStore.getState().setPreview(null),
  };
});

import { GROOVES } from '@/daw/data/groovesLibrary';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { useBrowserStore } from '@/daw/shell/inspector/browser/browserStore';
import { DRUM_KITS } from '@/daw/instruments/drumKits';
import { useStore } from '@/daw/store';
import {
  resetHistory,
  startHistory,
  undo,
  undoLabel,
} from '@/daw/store/history';
import { DrumPadsView } from '@/daw/shell/dock/DrumPadsView';
import { DrumMachineView } from '../DrumMachineView';

const BAR = 1920;
const hit = (note: number, startTick: number): MidiNoteEvent => ({
  note,
  velocity: 100,
  startTick,
  durationTicks: 120,
  channel: 10,
});
const s = () => useStore.getState();
let trackId = '';
let stopHistory = () => {};
const clips = () => s().tracks.find((t) => t.id === trackId)!.midiClips;

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  trackId = s().addTrack('midi', 'drum-machine', 'Drums');
  s().setSelectedTrackId(trackId);
  resetHistory();
  stopHistory = startHistory();
});

afterEach(() => {
  cleanup();
  stopHistory();
  resetHistory();
});

describe('the drum grid’s Generate', () => {
  it('writes a fresh groove over the pattern, the clip’s length, as one undo step', () => {
    s().addMidiClip(trackId, {
      id: 'beat',
      name: 'Beat',
      startTick: 0,
      durationTicks: 4 * BAR,
      events: [hit(36, 0)],
    });
    render(<DrumMachineView trackId={trackId} />);
    const before = clips()[0].events;

    fireEvent.click(screen.getByTestId('drum-generate'));
    const events = clips()[0].events;
    expect(events).not.toEqual(before);
    // The kick on every bar's one, the hits within the clip's four bars.
    for (const bar of [0, 1, 2, 3]) {
      expect(
        events.some((e) => e.note === 36 && e.startTick === bar * BAR),
      ).toBe(true);
    }
    expect(events.every((e) => e.startTick < 4 * BAR)).toBe(true);
    expect(events.some((e) => e.note === 38)).toBe(true);

    expect(undoLabel()).toBe('Generate drums');
    // A clip named for a groove isn't that groove any more.
    expect(clips()[0].name).toBe('Beat');
    act(() => {
      undo();
    });
    expect(clips()[0].events).toEqual(before);
  });

  it('lets a groove’s name go with its hits', () => {
    s().addMidiClip(trackId, {
      id: 'beat',
      name: GROOVES[0].name,
      startTick: 0,
      events: [hit(36, 0)],
    });
    render(<DrumMachineView trackId={trackId} />);
    fireEvent.click(screen.getByTestId('drum-generate'));
    expect(clips()[0].name).toBe('Drum Pattern');
  });

  it('makes a two-bar pattern on a track with no clip', () => {
    render(<DrumMachineView trackId={trackId} />);
    fireEvent.click(screen.getByTestId('drum-generate'));
    expect(clips()).toHaveLength(1);
    const events = clips()[0].events;
    expect(events.some((e) => e.startTick >= BAR)).toBe(true);
    expect(events.every((e) => e.startTick < 2 * BAR)).toBe(true);
  });
});

describe('the drum dock’s menu', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(420);
  });

  it('lists the kits first, and a kit picked is the track’s', () => {
    render(<DrumPadsView trackId={trackId} />);
    const kits = screen.getByRole('list', { name: 'Drum kits' });
    const names = [...kits.querySelectorAll('button')].map(
      (b) => b.textContent,
    );
    expect(names).toEqual(DRUM_KITS.map((k) => k.label));
    expect(names.slice(0, 3)).toEqual(['Natural', '808', 'House']);
    // The lesson anchor stays on the kits.
    expect(kits.dataset.tutorialId).toBe('drum-kit-selector');
    expect(
      kits
        .querySelector('[data-sound="natural"]')
        ?.getAttribute('aria-current'),
    ).toBe('true');

    fireEvent.click(kits.querySelector('[data-sound="808"]')!);
    expect(s().tracks.find((t) => t.id === trackId)?.drumKit).toBe('808');
  });

  it('lists the grooves second, by genre, each with its tempo', () => {
    render(<DrumPadsView trackId={trackId} />);
    const list = screen.getByRole('list', { name: 'Grooves' });
    for (const groove of GROOVES) {
      const row = list.querySelector(`[data-groove="${groove.id}"]`);
      expect(row?.textContent).toContain(groove.name);
      expect(row?.textContent).toContain(`${groove.bpm} BPM`);
    }
    expect(list.textContent).toContain('Hip Hop');
  });

  it('previews a groove on the track’s kit, and stops it', () => {
    const [groove] = GROOVES;
    (trackEngineRegistry as Map<string, unknown>).set(trackId, {
      trackEngine: {},
    });
    p.started.length = 0;
    render(<DrumPadsView trackId={trackId} />);
    const preview = screen.getByRole('button', {
      name: `Preview ${groove.name}`,
    });
    fireEvent.click(preview);
    expect(p.started).toEqual([`dock-groove:${trackId}:${groove.id}`]);
    const stop = screen.getByRole('button', { name: `Stop ${groove.name}` });
    expect(stop.getAttribute('aria-pressed')).toBe('true');
    // Listening adds nothing.
    expect(clips()).toHaveLength(0);
    fireEvent.click(stop);
    expect(useBrowserStore.getState().preview).toBeNull();
    (trackEngineRegistry as Map<string, unknown>).delete(trackId);
  });

  it('adds a groove to the timeline at the playhead’s bar, selected, as one undo step', async () => {
    const [groove] = GROOVES;
    g.events.set(groove.id, [hit(36, 0), hit(38, 480)]);
    s().addMidiClip(trackId, {
      id: 'beat',
      name: 'Beat',
      startTick: 0,
      events: [hit(36, 0)],
    });
    render(<DrumPadsView trackId={trackId} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: `Add ${groove.name} to the timeline`,
        }),
      );
    });
    expect(clips()).toHaveLength(2);
    const added = clips()[1];
    expect(added.name).toBe(groove.name);
    expect(added.startTick).toBe(0);
    expect(added.events.map((e) => e.note)).toEqual([36, 38]);
    expect(s().selectedClipId).toBe(added.id);
    // The drum grid shows it, so the menu marks it.
    expect(
      document
        .querySelector(`[data-groove="${groove.id}"]`)
        ?.getAttribute('aria-current'),
    ).toBe('true');
    expect(undoLabel()).toBe(`Add ${groove.name}`);
    act(() => {
      undo();
    });
    expect(clips()).toHaveLength(1);
  });
});
