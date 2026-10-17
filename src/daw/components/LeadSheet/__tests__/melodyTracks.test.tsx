// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import type {
  StaffLayout,
  StaffViewProps,
} from '@/components/notation/StaffView';
import { installDomShims } from '@/daw/ui/__tests__/dom';

// ── Choosing the melody tracks ─────────────────────────────────────────────
// The toolbar's picker ticks tracks onto the sheet, and the sheet writes each
// on its own staff, in track order, the chord symbols over the top one only.
// With nothing ticked it picks one itself and says so: "Auto: Lead".

const h = vi.hoisted(() => ({ staff: null as StaffViewProps | null }));
vi.mock('@/components/notation/StaffView', () => ({
  // The palettes draw their cells in the music font; it never arrives here.
  loadVexFlow: () => new Promise(() => {}),
  StaffView: (props: StaffViewProps) => {
    h.staff = props;
    return <div data-testid="staff">{props.overlay}</div>;
  },
}));
vi.mock('@/hooks/data/auth/useMe', () => ({
  useMe: () => ({ data: undefined }),
}));

import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import { useStore, type AllSlices } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { LeadSheetView } from '../LeadSheetView';
import { MelodyTrackPicker } from '../MelodyTrackPicker';

const s = () => useStore.getState();
const ev = (note: number, startTick: number): MidiNoteEvent => ({
  note,
  startTick,
  durationTicks: 480,
  velocity: 100,
  channel: 0,
});

const CHORDS: ChordRegion[] = [
  {
    id: 'chord-c',
    startTick: 0,
    endTick: 1920,
    name: '1 major',
    noteName: 'C',
    color: [200, 80, 80],
  },
  {
    id: 'chord-g',
    startTick: 1920,
    endTick: 3840,
    name: '5 major',
    noteName: 'G',
    color: [80, 80, 200],
  },
];

let keys = '';
let lead = '';
let bass = '';
let kit = '';
let vocal = '';

beforeAll(installDomShims);

beforeEach(() => {
  h.staff = null;
  useStore.setState({
    tracks: [],
    remoteUsers: new Map(),
    currentView: 'leadsheet',
    chordRegions: CHORDS,
    rootNote: 0,
    mode: 'ionian',
    leadSheetShowMelody: false,
    leadSheetMelodyTrackIds: [],
  } as Partial<AllSlices>);
  keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  lead = s().addTrack('midi', 'oracle-synth', 'Lead');
  bass = s().addTrack('midi', 'bass-electric', 'Bass');
  kit = s().addTrack('midi', 'drum-machine', 'Drums');
  vocal = s().addTrack('audio', 'vocal-fx', 'Vocal');
  s().addMidiClip(keys, {
    id: 'keys-clip',
    startTick: 0,
    events: [ev(64, 0), ev(67, 1920)],
  });
  s().addMidiClip(lead, {
    id: 'lead-clip',
    startTick: 0,
    events: [ev(72, 0), ev(74, 480)],
  });
  s().addMidiClip(kit, { id: 'kit-clip', startTick: 0, events: [ev(36, 0)] });
  // The bass has nothing on it yet.
});
afterEach(cleanup);

const trigger = () => screen.getByTestId('melody-track-picker');
function openPicker() {
  fireEvent.click(trigger());
  return within(screen.getByRole('dialog', { name: 'Melody tracks' }));
}
const box = (menu: ReturnType<typeof openPicker>, name: string) =>
  menu.getByRole('checkbox', { name });

describe('the melody track picker', () => {
  it('offers the instrument tracks, each with its colour, never a kit or audio', () => {
    render(<MelodyTrackPicker />);
    const menu = openPicker();
    const options = menu.getAllByTestId('melody-track-option');
    expect(options.map((o) => o.textContent)).toEqual([
      'Keys',
      'Lead',
      'Bassno notes yet',
    ]);
    expect(menu.queryByRole('checkbox', { name: /Drums/ })).toBeNull();
    expect(menu.queryByRole('checkbox', { name: /Vocal/ })).toBeNull();
    // Each row carries its track's colour dot.
    const dot = options[1].querySelector('span[aria-hidden]') as HTMLElement;
    expect(dot.style.background).not.toBe('');
    expect(kit && vocal).toBeTruthy();
  });

  it('says which track Auto picked, and why', () => {
    render(<MelodyTrackPicker />);
    // Lead, by its name, as the track header's Auto role reads it.
    expect(trigger()).toHaveTextContent('Auto: Lead');
    const menu = openPicker();
    expect(menu.getByRole('radio', { name: /Auto: Lead/ })).toBeChecked();
    expect(
      menu.getByText(/the track set to Melody in its track header/),
    ).toBeInTheDocument();
    expect(box(menu, 'Lead')).not.toBeChecked();
  });

  it('turns Melody on when a track is ticked while it is off', () => {
    render(<MelodyTrackPicker />);
    const menu = openPicker();
    fireEvent.click(box(menu, 'Keys'));
    expect(s().leadSheetShowMelody).toBe(true);
    expect(s().leadSheetMelodyTrackIds).toEqual([keys]);
    expect(trigger()).toHaveTextContent('Keys');
    expect(trigger()).not.toHaveTextContent('Auto');
    expect(menu.getByRole('radio', { name: /Auto/ })).not.toBeChecked();
  });

  it('shows two ticked tracks in track order, whichever came first', () => {
    render(<MelodyTrackPicker />);
    const menu = openPicker();
    fireEvent.click(box(menu, 'Lead'));
    fireEvent.click(box(menu, 'Keys'));
    expect(s().leadSheetMelodyTrackIds).toEqual([keys, lead]);
    expect(trigger()).toHaveTextContent('Keys, Lead');
  });

  it('goes back to Auto when the last track is unticked', () => {
    act(() => s().setLeadSheetMelodyTrackIds([keys], { show: true }));
    render(<MelodyTrackPicker />);
    const menu = openPicker();
    fireEvent.click(box(menu, 'Keys'));
    expect(s().leadSheetMelodyTrackIds).toEqual([]);
    expect(s().leadSheetShowMelody).toBe(true);
    expect(trigger()).toHaveTextContent('Auto: Lead');
    expect(menu.getByRole('radio', { name: /Auto/ })).toBeChecked();
  });

  it('goes back to Auto, and shows it, when Auto is chosen', () => {
    act(() => s().setLeadSheetMelodyTrackIds([keys, bass]));
    render(<MelodyTrackPicker />);
    const menu = openPicker();
    fireEvent.click(menu.getByRole('radio', { name: /Auto/ }));
    expect(s().leadSheetMelodyTrackIds).toEqual([]);
    expect(s().leadSheetShowMelody).toBe(true);
  });

  it('stays open when the first tick swaps the chart for the written sheet', () => {
    render(<LeadSheetView />);
    // The chord chart: no staff yet.
    expect(h.staff).toBeNull();
    fireEvent.click(box(openPicker(), 'Keys'));
    // The sheet and its own toolbar took the chart's place; the picker
    // opened again in it, on the box just ticked, ready for a second one.
    expect(h.staff!.parts.map((p) => p.id)).toEqual([keys]);
    const menu = within(screen.getByRole('dialog', { name: 'Melody tracks' }));
    expect(box(menu, 'Keys')).toBeChecked();
    expect(box(menu, 'Keys')).toHaveFocus();
    fireEvent.click(box(menu, 'Lead'));
    expect(s().leadSheetMelodyTrackIds).toEqual([keys, lead]);
  });

  it('never opens by itself on a later visit', () => {
    act(() => s().setLeadSheetMelodyTrackIds([keys], { show: true }));
    render(<MelodyTrackPicker />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('passes over a deleted track, then goes back to Auto', () => {
    act(() => s().setLeadSheetMelodyTrackIds([keys, bass], { show: true }));
    render(<MelodyTrackPicker />);
    expect(trigger()).toHaveTextContent('Keys, Bass');
    act(() => s().removeTrack(bass));
    expect(trigger()).toHaveTextContent('Keys');
    expect(trigger()).not.toHaveTextContent('Bass');
    act(() => s().removeTrack(keys));
    expect(trigger()).toHaveTextContent('Auto: Lead');
  });
});

describe('the setter other code calls', () => {
  it('assigns tracks and, asked to, shows them', () => {
    s().setLeadSheetMelodyTrackIds([bass, bass]);
    expect(s().leadSheetMelodyTrackIds).toEqual([bass]);
    expect(s().leadSheetShowMelody).toBe(false);
    s().setLeadSheetMelodyTrackIds([lead], { show: true });
    expect(s().leadSheetMelodyTrackIds).toEqual([lead]);
    expect(s().leadSheetShowMelody).toBe(true);
    s().setLeadSheetMelodyTrackIds([]);
    expect(s().leadSheetMelodyTrackIds).toEqual([]);
  });

  it('keeps a toggled list in track order, without tracks that are gone', () => {
    useStore.setState({ leadSheetMelodyTrackIds: ['gone', lead] });
    s().toggleLeadSheetMelodyTrack(keys);
    expect(s().leadSheetMelodyTrackIds).toEqual([keys, lead]);
  });
});

/** A drawn layout: a bar per part, a note on each beat that holds one. */
function layoutFor(partCount: number): StaffLayout {
  const measures = Array.from({ length: partCount }, (_, partIndex) => [
    {
      measureIndex: 0,
      partIndex,
      system: 0,
      x: 40,
      y: 30 + partIndex * 120,
      width: 200,
      height: 80,
      startTick: 0,
      endTick: 1920,
    },
    {
      measureIndex: 1,
      partIndex,
      system: 0,
      x: 240,
      y: 30 + partIndex * 120,
      width: 200,
      height: 80,
      startTick: 1920,
      endTick: 3840,
    },
  ]).flat();
  return {
    barlines: [],
    measures,
    notes: [],
    rests: [],
    scale: 1,
    systemHeight: 120 * partCount,
    stepPx: 5,
    topLineDrop: 40,
  };
}

const chordButtons = () =>
  screen.queryAllByTitle(/drag it to another beat/).map((b) => b.textContent);

describe('the sheet with Melody on', () => {
  it('writes the Auto track on its own when nothing is ticked', () => {
    act(() => s().setLeadSheetShowMelody(true));
    render(<LeadSheetView />);
    expect(h.staff!.parts.map((p) => p.id)).toEqual([lead]);
  });

  it('stacks a named staff per ticked track, in track order', () => {
    act(() => s().setLeadSheetMelodyTrackIds([lead, keys], { show: true }));
    render(<LeadSheetView />);
    expect(h.staff!.parts.map((p) => [p.id, p.name])).toEqual([
      [keys, 'Keys'],
      [lead, 'Lead'],
    ]);
  });

  it('writes the chord symbols over the top staff only', () => {
    act(() => s().setLeadSheetMelodyTrackIds([keys, lead], { show: true }));
    render(<LeadSheetView />);
    act(() => h.staff!.onLayout!(layoutFor(2)));
    // Two chords, once each: over the top staff, never repeated below it.
    expect(chordButtons()).toEqual(['C', 'G']);
    const tops = screen
      .queryAllByTitle(/drag it to another beat/)
      .map((b) => parseFloat(b.style.top));
    expect(tops.every((top) => top < 150)).toBe(true);
  });

  it('keeps a staff of rests for a ticked track with no notes, and says so', () => {
    act(() => s().setLeadSheetMelodyTrackIds([lead, bass], { show: true }));
    render(<LeadSheetView />);
    expect(h.staff!.parts.map((p) => p.id)).toEqual([lead, bass]);
    expect(screen.getByTestId('melody-empty-hint')).toHaveTextContent(
      'Bass has no notes yet.',
    );
  });

  it('goes back to the chord chart with Melody off', () => {
    act(() => s().setLeadSheetMelodyTrackIds([lead, keys]));
    render(<LeadSheetView />);
    expect(h.staff).toBeNull();
  });

  it('lands an edit on the staff’s own track', () => {
    const uninstall = installKeyDispatcher();
    try {
      act(() => s().setLeadSheetMelodyTrackIds([keys, lead], { show: true }));
      render(<LeadSheetView />);
      // The second staff's first note: Lead's C5.
      const leadNote =
        h.staff!.parts[1].score.measures[0].staves.treble![0].items[0].keys[0]
          .noteId;
      expect(leadNote.startsWith(`${lead}:`)).toBe(true);
      act(() =>
        h.staff!.onNotePointerDown!({ noteId: leadNote, noteIds: [leadNote] }, {
          preventDefault: () => {},
          clientX: 10,
          clientY: 10,
          shiftKey: false,
          metaKey: false,
          ctrlKey: false,
        } as unknown as React.PointerEvent),
      );
      act(() => {
        window.dispatchEvent(new Event('pointerup'));
      });
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp' }),
        );
      });
      const notes = (id: string) =>
        s()
          .tracks.find((t) => t.id === id)!
          .midiClips[0].events.map((e) => e.note);
      // C5 up a step is D5; the Keys staff above is untouched.
      expect(notes(lead)).toEqual([74, 74]);
      expect(notes(keys)).toEqual([64, 67]);
    } finally {
      uninstall();
    }
  });
});
