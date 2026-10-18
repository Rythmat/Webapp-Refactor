// @vitest-environment jsdom
/**
 * One effects rack (milestone 2.10). A track's chain, a return's and the
 * master's show in the same FxRack: the dock's Effects tab, the dock's
 * Master and the Mix view's RackDock. The side rail's Effects library is
 * the only list that adds effects, and it fills the rack in front of the
 * student: in Mix, the rack the RackDock shows.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { FxBody } from '@/daw/shell/inspector/panels/FxBody';
import { FxRack } from '../FxRack';
import { RackDock } from '../RackDock';
import { openRack, rackTargetOf } from '../rackTarget';

const s = () => useStore.getState();

let synth = '';

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  synth = s().addTrack('midi', 'oracle-synth', 'Synth');
  s().setSelectedTrackId(synth);
});

afterEach(cleanup);

describe('which rack the library fills', () => {
  it('in Create: the dock’s Master when it shows, else the selected track', () => {
    s().setCurrentView('arrange');
    expect(rackTargetOf(s())).toEqual({ kind: 'track', id: synth });
    s().setDockMaster(true);
    expect(rackTargetOf(s())).toEqual({ kind: 'master' });
    // A rack left open in Mix doesn't count in Create.
    s().setDockMaster(false);
    s().setMixRack({ kind: 'return', id: 'A' });
    expect(rackTargetOf(s())).toEqual({ kind: 'track', id: synth });
  });

  it('in Mix: the open rack, else the selected track', () => {
    s().setCurrentView('studio');
    expect(rackTargetOf(s())).toEqual({ kind: 'track', id: synth });
    s().setMixRack({ kind: 'return', id: 'B' });
    expect(rackTargetOf(s())).toEqual({ kind: 'return', id: 'B' });
    // The dock's Master is Create's.
    s().setDockMaster(true);
    expect(rackTargetOf(s())).toEqual({ kind: 'return', id: 'B' });
  });

  it('takes nothing for a rack whose track is gone', () => {
    s().setCurrentView('studio');
    s().setMixRack({ kind: 'track', id: 'gone' });
    expect(rackTargetOf(s())).toBeNull();
  });

  it('adds to a return’s rack in Mix, without the sidechain', () => {
    s().setCurrentView('studio');
    openRack({ kind: 'return', id: 'A' });
    render(<FxBody />);
    expect(screen.getByTestId('effects-library-target').textContent).toContain(
      'Return A',
    );
    expect(screen.queryByTestId('inspector-fx-ducker')).toBeNull();
    const before = s().returns.find((r) => r.id === 'A')!.fxChain.length;
    fireEvent.click(screen.getByTestId('inspector-fx-compressor'));
    const ret = s().returns.find((r) => r.id === 'A')!;
    expect(ret.fxChain).toContain('compressor');
    expect(ret.fxChain.length).toBe(before + 1);
    expect(s().dockEffect).toBe('compressor');
    // The anchors say which rack they add to.
    expect(
      screen
        .getByTestId('inspector-fx-eq')
        .getAttribute('data-tutorial-target'),
    ).toBe('return:A');
  });

  it('adds to the master in Mix, stamped for the lesson’s master step', () => {
    s().setCurrentView('studio');
    openRack({ kind: 'master' });
    render(<FxBody />);
    expect(
      screen
        .getByTestId('inspector-fx-compressor')
        .getAttribute('data-tutorial-target'),
    ).toBe('master');
    fireEvent.click(screen.getByTestId('inspector-fx-compressor'));
    expect(s().masteringFxChain).toContain('compressor');
    expect(s().tracks[0].activeEffects).not.toContain('compressor');
  });

  it('opens the track’s rack in Mix when it adds to the selected track', () => {
    s().setCurrentView('studio');
    render(<FxBody />);
    fireEvent.click(screen.getByTestId('inspector-fx-eq'));
    expect(s().tracks[0].activeEffects).toContain('eq');
    expect(s().mixRack).toEqual({ kind: 'track', id: synth });
  });
});

describe('openRack', () => {
  it('opens the rack, shows the effect and selects a track’s', () => {
    const other = s().addTrack('midi', 'oracle-synth', 'Lead');
    openRack({ kind: 'track', id: other }, 'reverb');
    expect(s().mixRack).toEqual({ kind: 'track', id: other });
    expect(s().selectedTrackId).toBe(other);
    expect(s().dockEffect).toBe('reverb');
  });
});

describe('the RackDock', () => {
  it('starts shut, opens on a rack and shuts with its button or Escape', () => {
    s().setCurrentView('studio');
    render(<RackDock />);
    const dock = screen.getByTestId('rack-dock');
    expect(dock.dataset.open).toBeUndefined();
    expect(screen.queryByTestId('rack-dock-body')).toBeNull();

    act(() => openRack({ kind: 'return', id: 'A' }));
    expect(screen.getByTestId('rack-dock').dataset.open).toBe('true');
    const body = screen.getByTestId('rack-dock-body');
    expect(body.getAttribute('data-tutorial-id')).toBe('return-fx-A');
    expect(screen.getByTestId('fx-rack').dataset.rack).toBe('return:A');
    expect(screen.getByText('Effects · Return A')).toBeTruthy();

    fireEvent.click(screen.getByTestId('rack-dock-toggle'));
    expect(s().mixRack).toBeNull();

    // The bar's button opens the last rack again.
    fireEvent.click(screen.getByTestId('rack-dock-toggle'));
    expect(s().mixRack).toEqual({ kind: 'return', id: 'A' });
  });

  it('shows a deleted track’s rack as shut', () => {
    s().setCurrentView('studio');
    openRack({ kind: 'track', id: synth });
    render(<RackDock />);
    expect(screen.getByTestId('rack-dock').dataset.open).toBe('true');
    act(() => s().removeTrack(synth));
    expect(screen.getByTestId('rack-dock').dataset.open).toBeUndefined();
  });
});

describe('FxRack', () => {
  it('reads and writes each kind of rack in its own slice', () => {
    s().addMasteringFx('compressor');
    s().addActiveEffect(synth, 'eq');
    const { rerender } = render(<FxRack target={{ kind: 'master' }} />);
    expect(screen.getByTestId('fx-rack').dataset.rack).toBe('master');
    expect(screen.getByText('1 of 5')).toBeTruthy();

    rerender(<FxRack target={{ kind: 'track', id: synth }} />);
    expect(screen.getByTestId('fx-rack').dataset.rack).toBe('track');

    rerender(<FxRack target={{ kind: 'return', id: 'B' }} />);
    expect(screen.getByTestId('fx-rack').dataset.rack).toBe('return:B');
  });
});

describe('one implementation', () => {
  // The dock's Master and the Mix view's master column are built from the
  // same modules, so the two can't drift apart.
  const read = (path: string) =>
    readFileSync(resolve(__dirname, '..', path), 'utf8');

  it('the dock’s Master and Effects tab use FxRack and the master parts', () => {
    const dockMaster = read('../dock/DockMaster.tsx');
    expect(dockMaster).toContain("from '@/daw/shell/mix/FxRack'");
    expect(dockMaster).toContain(
      "from '@/daw/shell/mix/master/MasterGainFader'",
    );
    expect(dockMaster).toContain(
      "from '@/daw/shell/mix/master/MasterOutputMeter'",
    );
    expect(read('../dock/DockEffects.tsx')).toContain(
      "from '@/daw/shell/mix/FxRack'",
    );
  });

  it('the Mix master column uses the same master parts', () => {
    const column = read('MasterColumn.tsx');
    expect(column).toMatch(
      /from '(\.\/|@\/daw\/shell\/mix\/)master\/MasterGainFader'/,
    );
    expect(column).toMatch(
      /from '(\.\/|@\/daw\/shell\/mix\/)master\/MasterOutputMeter'/,
    );
  });
});
