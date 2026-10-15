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
