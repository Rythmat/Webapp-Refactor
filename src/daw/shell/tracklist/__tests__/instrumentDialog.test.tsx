// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// ── The simple instrument picker, for one track ────────────────────────────
// A track's ⋯ ▸ Instrument… and the dock's instrument button open the
// Instrument dialog on that track (InstrumentDialog). A melodic track is
// offered the melodic families, a drum track its kits; the instrument
// playing is ticked; a pick changes the instrument as one undo step that
// keeps the clips, the mix and a name of the student's own, and closes. The
// picker's arrow keys move between a family's instruments.
//
// Run: npx vitest run src/daw/shell/tracklist/__tests__/instrumentDialog.test.tsx

import { useStore } from '@/daw/store';
import {
  resetHistory,
  startHistory,
  undo,
  undoLabel,
} from '@/daw/store/history';
import { InstrumentDialogHost } from '../InstrumentDialog';
import { InstrumentPicker } from '../InstrumentPicker';
import {
  openInstrumentDialog,
  useInstrumentDialogStore,
} from '../instrumentDialogStore';

const s = () => useStore.getState();
const trackOf = (id: string) => s().tracks.find((t) => t.id === id)!;
const byAnchor = (id: string) =>
  document.querySelector<HTMLElement>(`[data-tutorial-id="${id}"]`);

let stopHistory: () => void = () => {};
let rhodes = '';
let drums = '';
let vox = '';

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ remoteUsers: new Map() });
  rhodes = s().addTrack('midi', 'electric-piano', 'Rhodes');
  drums = s().addTrack('midi', 'drum-machine', 'Drums');
  vox = s().addTrack('audio', 'vocal-fx', 'Vox');
  s().addMidiClip(rhodes, {
    id: 'chords',
    startTick: 0,
    events: [
      { note: 60, velocity: 90, startTick: 0, durationTicks: 480, channel: 0 },
    ],
  });
  s().updateTrack(rhodes, { volume: 0.42 });
  useInstrumentDialogStore.setState({ trackId: null });
  resetHistory();
  stopHistory = startHistory();
});

afterEach(() => {
  stopHistory();
  resetHistory();
  cleanup();
});

describe('the Instrument dialog', () => {
  it('is shut until a track asks for it', () => {
    render(<InstrumentDialogHost />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers a melodic track the melodic families, its own ticked', () => {
    render(<InstrumentDialogHost />);
    act(() => openInstrumentDialog(rhodes));
    const dialog = screen.getByRole('dialog', {
      name: 'Rhodes’s instrument',
    });
    expect(dialog).toHaveAttribute('data-tutorial-id', 'instrument-dialog');
    const families = within(dialog)
      .getAllByRole('tab')
      .map((tab) => tab.textContent);
    expect(families).toContain('Piano');
    expect(families).toContain('Strings');
    // No drums for a melodic track, and no synth anywhere.
    expect(families).not.toContain('Drums');
    expect(dialog.textContent).not.toMatch(/synth|oracle/i);
    expect(
      within(dialog).getByRole('button', {
        name: 'Electric Piano (playing now)',
      }),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('changes the instrument as one undo step, keeping the music, and closes', () => {
    render(<InstrumentDialogHost />);
    act(() => openInstrumentDialog(rhodes));
    // Radix tabs choose on mouse down.
    fireEvent.mouseDown(byAnchor('instrument-family-strings')!);
    fireEvent.click(screen.getByRole('button', { name: 'Cello' }));
    expect(trackOf(rhodes)).toMatchObject({
      instrument: 'cello',
      // A name of the student's own stays.
      name: 'Rhodes',
      volume: 0.42,
    });
    expect(trackOf(rhodes).midiClips[0].events).toHaveLength(1);
    expect(undoLabel()).toBe('Change instrument');
    expect(useInstrumentDialogStore.getState().trackId).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => undo());
    expect(trackOf(rhodes).instrument).toBe('electric-piano');
  });

  it('offers a drum track its kits', () => {
    render(<InstrumentDialogHost />);
    act(() => openInstrumentDialog(drums));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryAllByRole('tab')).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: '808 Kit' }));
    expect(trackOf(drums)).toMatchObject({
      instrument: 'drum-machine',
      drumKit: '808',
    });
  });

  it('shows nothing for an audio track or a track that is gone', () => {
    render(<InstrumentDialogHost />);
    act(() => openInstrumentDialog(vox));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => openInstrumentDialog(rhodes));
    expect(screen.getByRole('dialog')).toBeTruthy();
    act(() => s().removeTrack(rhodes));
    expect(screen.queryByRole('dialog')).toBeNull();
    // Closed for good: an undo that brings the track back opens nothing.
    expect(useInstrumentDialogStore.getState().trackId).toBeNull();
  });
});

describe('the picker', () => {
  it('moves between a family’s instruments with the arrow keys', () => {
    const picked: string[] = [];
    render(
      <InstrumentPicker
        families={['brass']}
        onPick={(item) => picked.push(item.id)}
      />,
    );
    const trumpet = screen.getByRole('button', { name: 'Trumpet' });
    trumpet.focus();
    fireEvent.keyDown(trumpet, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: 'Muted Trumpet' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(screen.getByRole('button', { name: 'Brass Section' })).toHaveFocus();
    fireEvent.click(document.activeElement!);
    expect(picked).toEqual(['brass-section']);
  });

  it('takes its name from the heading of the place it is in', () => {
    render(
      <>
        <h3 id="where">Instruments</h3>
        <InstrumentPicker
          title={null}
          labelledBy="where"
          families={['piano', 'brass']}
          onPick={() => {}}
        />
      </>,
    );
    expect(screen.getByRole('group', { name: 'Instruments' })).toHaveAttribute(
      'data-tutorial-id',
      'instrument-picker',
    );
    expect(screen.queryByText('Instrument')).toBeNull();
  });
});
