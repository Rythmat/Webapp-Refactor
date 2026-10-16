// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FXRoute } from '../../audio/types';
import { useSynthStore } from '../../store';
import { FXPanel } from './FXPanel';

// ── The synth's FX slots offer no target ───────────────────────────────────
// Every effect runs in one fixed chain on the synth's output (FXChain), and
// nothing reads a route's `target`, so the TARGET menu (Master, Osc 1/2,
// Filter 1/2) changed nothing (synth-ui-09). A slot now picks only its effect.

const initial = useSynthStore.getState();

function showRoutes(fxRoutes: FXRoute[]) {
  useSynthStore.setState({ fxRoutes });
}

beforeEach(() => {
  useSynthStore.setState({ fx: initial.fx, fxRoutes: initial.fxRoutes });
});

afterEach(cleanup);

describe('Oracle synth FX slots', () => {
  it('offer only the effect menu, with no target or arrow', () => {
    // A route saved with a non-master target, as the old menu could write.
    showRoutes([
      { id: 'fx-a', type: 'delay', target: 'osc1' },
      { id: 'fx-b', type: 'reverb', target: 'master' },
    ]);
    render(<FXPanel />);

    const menus = screen.getAllByRole('combobox');
    expect(menus).toHaveLength(2);
    expect(menus.map((m) => (m as HTMLSelectElement).value)).toEqual([
      'delay',
      'reverb',
    ]);
    for (const target of ['MASTER', 'OSC 1', 'OSC 2', 'FILTER 1', 'FILTER 2']) {
      expect(screen.queryByRole('option', { name: target })).toBeNull();
    }
    expect(screen.queryByText('→')).toBeNull();
    // The effects' own controls are still there.
    expect(screen.getByRole('slider', { name: 'TIME' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'SIZE' })).toBeInTheDocument();
  });

  it('still switches a slot to another effect, leaving its target alone', () => {
    showRoutes([{ id: 'fx-a', type: 'delay', target: 'osc1' }]);
    render(<FXPanel />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'chorus' },
    });

    const { fxRoutes, fx } = useSynthStore.getState();
    expect(fxRoutes).toEqual([{ id: 'fx-a', type: 'chorus', target: 'osc1' }]);
    expect(fx.chorus.enabled).toBe(true);
    expect(fx.delay.enabled).toBe(false);
    expect(screen.getByRole('slider', { name: 'DEPTH' })).toBeInTheDocument();
  });

  it('adds a route on the master, the chain every effect runs on', () => {
    showRoutes([]);
    render(<FXPanel />);

    fireEvent.click(screen.getByRole('button', { name: '+ ADD' }));

    const [route] = useSynthStore.getState().fxRoutes;
    expect(route.target).toBe('master');
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });
});

// ── The panel lists what the chain plays ───────────────────────────────────
// Most pack presets switch an effect on with no route (synth-ui-09), so a
// panel built from routes said "No effects" while drive was audibly on. A
// slot shows for every effect that is on or routed, in chain order.

function presetWith(enabled: FXRoute['type'][], fxRoutes: FXRoute[]) {
  const fx = structuredClone(initial.fx);
  for (const type of enabled) fx[type].enabled = true;
  useSynthStore.setState({ fx, fxRoutes });
}

/** The on/off switch at the head of the slot that shows `type`. */
function slotToggle(type: string): HTMLElement {
  const menu = screen
    .getAllByRole('combobox')
    .find((m) => (m as HTMLSelectElement).value === type);
  // The menu sits in the Dropdown's wrapper, the switch just before it.
  const row = menu?.parentElement?.parentElement;
  if (!row?.firstElementChild) throw new Error(type);
  return row.firstElementChild as HTMLElement;
}

describe('Oracle synth FX panel', () => {
  it('shows effects a preset switched on without a route, in chain order', () => {
    presetWith(
      ['drive', 'reverb', 'delay'],
      [{ id: 'fx-1', type: 'reverb', target: 'master' }],
    );
    render(<FXPanel />);

    expect(screen.queryByText(/No effects/)).toBeNull();
    expect(
      screen
        .getAllByRole('combobox')
        .map((m) => (m as HTMLSelectElement).value),
    ).toEqual(['drive', 'delay', 'reverb']);
    expect(screen.getByRole('slider', { name: 'AMOUNT' })).toBeInTheDocument();
  });

  it('keeps an unrouted effect in the list when it is switched off', () => {
    presetWith(['drive'], []);
    render(<FXPanel />);

    fireEvent.click(slotToggle('drive'));

    const { fx, fxRoutes } = useSynthStore.getState();
    expect(fx.drive.enabled).toBe(false);
    expect(fxRoutes.map((r) => r.type)).toEqual(['drive']);
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('removes an unrouted effect by switching it off', () => {
    presetWith(['delay'], []);
    render(<FXPanel />);

    fireEvent.click(screen.getByRole('button', { name: '×' }));

    const { fx, fxRoutes } = useSynthStore.getState();
    expect(fx.delay.enabled).toBe(false);
    expect(fxRoutes).toEqual([]);
    expect(screen.getByText(/No effects/)).toBeInTheDocument();
  });

  it('swaps an unrouted effect for another through a new route', () => {
    presetWith(['drive'], [{ id: 'fx-1', type: 'chorus', target: 'master' }]);
    render(<FXPanel />);

    const driveMenu = screen
      .getAllByRole('combobox')
      .find((m) => (m as HTMLSelectElement).value === 'drive')!;
    fireEvent.change(driveMenu, { target: { value: 'phaser' } });

    const { fx, fxRoutes } = useSynthStore.getState();
    expect(fx.drive.enabled).toBe(false);
    expect(fx.phaser.enabled).toBe(true);
    expect(fxRoutes.map((r) => r.type).sort()).toEqual(['chorus', 'phaser']);
    expect(new Set(fxRoutes.map((r) => r.id)).size).toBe(2);
  });

  it('adds an effect that is not already playing', () => {
    presetWith(['drive', 'chorus'], []);
    render(<FXPanel />);

    fireEvent.click(screen.getByRole('button', { name: '+ ADD' }));

    const { fx, fxRoutes } = useSynthStore.getState();
    expect(fxRoutes.map((r) => r.type)).toEqual(['phaser']);
    expect(fx.phaser.enabled).toBe(true);
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
  });

  it('gives a new route an id the patch does not use yet', () => {
    presetWith(
      [],
      [
        { id: 'fx-1', type: 'drive', target: 'master' },
        { id: 'fx-2', type: 'chorus', target: 'master' },
        { id: 'fx-3', type: 'phaser', target: 'master' },
      ],
    );
    useSynthStore.getState().addFXRoute();

    const ids = useSynthStore.getState().fxRoutes.map((r) => r.id);
    expect(new Set(ids).size).toBe(4);
  });
});
