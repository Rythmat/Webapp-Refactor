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
import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import { rackMaxPx } from '@/daw/shell/layout/layoutModel';

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

  it('falls back to the selected track when the open rack’s track is gone', () => {
    s().setCurrentView('studio');
    s().setMixRack({ kind: 'track', id: 'gone' });
    expect(rackTargetOf(s())).toEqual({ kind: 'track', id: synth });
    s().setSelectedTrackId(null);
    expect(rackTargetOf(s())).toBeNull();
  });

  it('counts the practice view before its session as Create', () => {
    s().setCurrentView('practice');
    s().setDockMaster(true);
    expect(rackTargetOf(s())).toEqual({ kind: 'master' });
  });

  it('adds nothing to a track a collaborator holds', () => {
    s().setCurrentView('studio');
    useStore.setState({
      remoteUsers: new Map([[7, { selectedTrackId: synth } as never]]) as never,
    });
    render(<FxBody />);
    fireEvent.click(screen.getByTestId('inspector-fx-eq'));
    expect(s().tracks[0].activeEffects).not.toContain('eq');
    expect(s().mixRack).toBeNull();
    expect(screen.getByTestId('effects-library-slot').textContent).toContain(
      'collaborator',
    );
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
    // Its open button still opens a rack: the master's, with no track left.
    fireEvent.click(screen.getByTestId('rack-dock-toggle'));
    expect(s().mixRack).toEqual({ kind: 'master' });
  });

  it('shows each rack the effect the student left it on', () => {
    s().addActiveEffect(synth, 'eq');
    s().addActiveEffect(synth, 'reverb');
    s().addMasteringFx('compressor');
    const track = { kind: 'track', id: synth } as const;
    const { rerender } = render(<FxRack target={track} />);
    act(() => s().setDockEffect('reverb'));
    rerender(<FxRack target={{ kind: 'master' }} />);
    expect(s().dockEffect).toBe('compressor');
    rerender(<FxRack target={track} />);
    expect(s().dockEffect).toBe('reverb');
  });
});

describe('FxRack', () => {
  // Each kind of rack writes its own slice and only it: an effect card's
  // on switch turns the effect off where it lives.
  const effectOf = (
    kind: 'track' | 'return' | 'master',
  ): { enabled: boolean } =>
    (kind === 'track'
      ? s().tracks[0].effects
      : kind === 'return'
        ? s().returns.find((r) => r.id === 'A')!.effects
        : s().masteringEffects
    ).eq as { enabled: boolean };

  it.each([
    ['track' as const, () => ({ kind: 'track' as const, id: synth })],
    ['return' as const, () => ({ kind: 'return' as const, id: 'A' as const })],
    ['master' as const, () => ({ kind: 'master' as const })],
  ])('switches an effect off in the %s rack and nowhere else', (kind, t) => {
    s().addActiveEffect(synth, 'eq');
    s().addReturnFx('A', 'eq');
    s().addMasteringFx('eq');
    const before = {
      track: effectOf('track').enabled,
      return: effectOf('return').enabled,
      master: effectOf('master').enabled,
    };
    render(<FxRack target={t()} />);
    fireEvent.click(screen.getByRole('button', { name: 'EQ on' }));
    for (const k of ['track', 'return', 'master'] as const) {
      expect(effectOf(k).enabled, k).toBe(k === kind ? !before[k] : before[k]);
    }
  });

  it('shows the chain as cards, the Add effect card after them', () => {
    s().addMasteringFx('compressor');
    s().addMasteringFx('eq');
    render(<FxRack target={{ kind: 'master' }} />);
    const row = screen.getByRole('group', { name: 'Effects chain' });
    expect(
      [...row.children].map((card) => (card as HTMLElement).dataset.testid),
    ).toEqual(['fx-card-compressor', 'fx-card-eq', 'fx-add-slot']);
    // No In and Out ends: the row is the chain.
    expect(screen.queryByText('In')).toBeNull();
    expect(screen.queryByText('Out')).toBeNull();
    expect(screen.getByText('2 of 5')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove EQ' }));
    expect(s().masteringFxChain).toEqual(['compressor']);
    // Its Add effect arms the library, as the dock's slot does.
    fireEvent.click(screen.getByTestId('fx-add-slot'));
    expect(s().libraryOpen && s().inspectorPanel === 'fx').toBe(true);
  });
});

describe('the RackDock’s keys and focus', () => {
  it('shuts on Escape, with focus moved into it when a strip opened it', () => {
    s().setCurrentView('studio');
    const opener = document.createElement('button');
    const mix = document.createElement('div');
    mix.dataset.testid = 'mix-view';
    mix.appendChild(opener);
    document.body.appendChild(mix);
    const keys = installKeyDispatcher();
    render(<RackDock />);
    opener.focus();
    act(() => openRack({ kind: 'return', id: 'A' }));
    const body = screen.getByTestId('rack-dock-body');
    expect(document.activeElement).toBe(body);
    fireEvent.keyDown(body, { key: 'Escape', code: 'Escape' });
    expect(s().mixRack).toBeNull();
    keys();
    mix.remove();
  });
});

describe('the RackDock’s height', () => {
  it('never takes the strips’ faders: a cap of the body less 300 px', () => {
    // 1366×655: a 567 px body.
    expect(rackMaxPx(567)).toBe(267);
    // 1440×787: the 85% share is the tighter one only on tall windows.
    expect(rackMaxPx(699)).toBe(399);
    expect(rackMaxPx(2000)).toBe(1700);
    // Never under the dock's own floor.
    expect(rackMaxPx(300)).toBe(120);
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
