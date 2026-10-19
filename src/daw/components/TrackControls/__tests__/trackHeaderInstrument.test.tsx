// @vitest-environment jsdom
/**
 * The track header's instrument button and right-click menu (Studio
 * Basics): the button names what the track plays and opens the simple
 * picker, the picker changes the instrument and closes, the menu duplicates
 * the track, and the controls a lesson points at carry their anchors.
 *
 * Run: npx vitest run src/daw/components/TrackControls/__tests__/trackHeaderInstrument.test.tsx
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { TrackHeader } from '../TrackHeader';
import { InstrumentPicker } from '../InstrumentPicker';

const s = () => useStore.getState();
const byAnchor = (id: string) =>
  document.querySelector<HTMLElement>(`[data-tutorial-id="${id}"]`);

beforeAll(installDomShims);
afterEach(cleanup);

let keys = '';
let drums = '';
let vox = '';

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  keys = s().addTrack('midi', 'electric-piano', 'Rhodes');
  drums = s().addTrack('midi', 'drum-machine', 'Drums');
  vox = s().addTrack('audio', 'vocal-fx', 'Vox');
});

describe('the track header', () => {
  it('carries the anchors a lesson points at, by track index', () => {
    render(<TrackHeader trackId={keys} index={0} />);
    for (const id of [
      'track-header-0',
      'track-name-0',
      'track-instrument-0',
      'track-monitor-0',
      'track-mute-0',
      'track-solo-0',
      'track-arm-0',
      'track-volume-0',
    ]) {
      expect(byAnchor(id), id).not.toBeNull();
    }
  });

  it('names the instrument on a button that opens the picker', async () => {
    render(<TrackHeader trackId={keys} index={0} />);
    const button = screen.getByRole('button', {
      name: /Instrument: Electric Piano/,
    });
    fireEvent.click(button);
    const panel = await screen.findByRole('dialog', {
      name: 'Instrument for Rhodes',
    });
    // No drums for a melodic track, and no synth anywhere.
    const tabs = within(panel)
      .getAllByRole('tab')
      .map((t) => t.textContent);
    expect(tabs).toContain('Piano');
    expect(tabs).not.toContain('Drums');
    expect(panel.textContent).not.toMatch(/synth|oracle/i);
    // The instrument playing now is ticked, in its family.
    expect(
      within(panel).getByRole('button', {
        name: 'Electric Piano (playing now)',
      }),
    ).toHaveAttribute('aria-current', 'true');

    // Radix tabs choose on mouse down.
    fireEvent.mouseDown(byAnchor('instrument-family-strings')!);
    fireEvent.click(
      await within(panel).findByRole('button', { name: 'Cello' }),
    );
    expect(s().tracks[0]).toMatchObject({
      instrument: 'cello',
      name: 'Rhodes',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.getByRole('button', { name: /Instrument: Cello/ }),
    ).toBeTruthy();
  });

  it('offers a drum track its kits', async () => {
    render(<TrackHeader trackId={drums} index={1} />);
    fireEvent.click(byAnchor('track-instrument-1')!);
    const panel = await screen.findByRole('dialog');
    expect(within(panel).queryAllByRole('tab')).toHaveLength(0);
    fireEvent.click(within(panel).getByRole('button', { name: '808 Kit' }));
    expect(s().tracks[1]).toMatchObject({ drumKit: '808' });
  });

  it('shows an audio track’s instrument without a picker', () => {
    render(<TrackHeader trackId={vox} index={2} />);
    const label = byAnchor('track-instrument-2')!;
    expect(label.tagName).toBe('SPAN');
    expect(label.textContent).toBe('Vocal (Audio)');
  });

  it('duplicates the track from its right-click menu', async () => {
    render(<TrackHeader trackId={keys} index={0} />);
    fireEvent.contextMenu(byAnchor('track-header-0')!);
    const item = await screen.findByRole('menuitem', {
      name: /Duplicate Track/,
    });
    expect(item).toHaveAttribute('data-tutorial-id', 'track-menu-duplicate');
    fireEvent.click(item);
    await waitFor(() => expect(s().tracks).toHaveLength(4));
    expect(s().tracks.map((t) => t.name)).toEqual([
      'Rhodes',
      'Rhodes 2',
      'Drums',
      'Vox',
    ]);
    expect(s().selectedTrackId).toBe(s().tracks[1].id);
  });

  it('keeps Release for a shared session', () => {
    s().setSelectedTrackId(keys);
    render(<TrackHeader trackId={keys} index={0} />);
    expect(screen.queryByRole('button', { name: /Release/ })).toBeNull();
  });
});

describe('the picker', () => {
  it('moves between instruments with the arrow keys', () => {
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
});
