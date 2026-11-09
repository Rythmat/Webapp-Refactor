// @vitest-environment jsdom
/**
 * The synth's other sections in the dock (SynthDockCards): each card shows
 * its controls and edits the synth's store; a low dock drops the drawings
 * and selects but keeps the knobs.
 *
 * Run: npx vitest run src/daw/components/Controls/__tests__/synthDockCards.test.tsx
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useSynthStore } from '@/daw/oracle-synth/store';
import {
  EnvelopesCard,
  LfoCard,
  ModCard,
  SourcesCard,
} from '../SynthDockCards';
import { synthCardLayout, type LiveModulation } from '../synthDockKit';

const full = synthCardLayout(224);
const tight = synthCardLayout(150);
const live: LiveModulation = {
  subscribe: () => () => {},
  get: () => undefined,
};
const engine = { getLFO: () => null } as unknown as SynthEngine;
const initial = useSynthStore.getState();

afterEach(() => {
  cleanup();
  useSynthStore.setState(initial, true);
});

describe('the synth dock cards', () => {
  it('turns the sub on and off from its name', () => {
    render(<SourcesCard color="#fff" layout={full} live={live} />);
    const before = useSynthStore.getState().subOscillator.enabled;
    fireEvent.click(screen.getByRole('button', { name: 'Sub on' }));
    expect(useSynthStore.getState().subOscillator.enabled).toBe(!before);
  });

  it('runs Filter 1 into Filter 2 from the 1 → 2 switch', () => {
    render(<SourcesCard color="#fff" layout={full} live={live} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Run Filter 1 into Filter 2' }),
    );
    expect(useSynthStore.getState().routing.filterRouting.serial).toBe(true);
  });

  it('draws both envelopes in a tall dock, and keeps their knobs in a low one', () => {
    const { unmount } = render(<EnvelopesCard color="#fff" layout={full} />);
    expect(screen.getAllByTestId('synth-envelope-curve')).toHaveLength(2);
    expect(screen.getAllByRole('slider', { name: 'Attack' })).toHaveLength(2);
    unmount();
    render(<EnvelopesCard color="#fff" layout={tight} />);
    expect(screen.queryByTestId('synth-envelope-curve')).toBeNull();
    expect(screen.getAllByRole('slider', { name: 'Release' })).toHaveLength(2);
  });

  it('switches LFOs and lists what the shown one moves', () => {
    useSynthStore.setState({
      modRoutes: [
        {
          id: 'r1',
          source: { type: 'lfo', index: 1 },
          target: { source: 'flt1', param: 'cutoff' },
          amount: 0.5,
          polarity: 'unipolar',
          enabled: true,
        },
      ],
    });
    render(<LfoCard engine={engine} color="#fff" layout={full} />);
    expect(screen.getByText(/Nothing yet/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('synth-lfo-2'));
    expect(screen.getByText('Filter 1 cutoff')).toBeTruthy();
  });

  it('switches a route off and on from its dot', () => {
    useSynthStore.setState({
      modRoutes: [
        {
          id: 'r1',
          source: { type: 'macro', index: 0 },
          target: { source: 'osc1', param: 'wtPos' },
          amount: 0.25,
          polarity: 'unipolar',
          enabled: true,
        },
      ],
    });
    render(<ModCard color="#fff" layout={full} />);
    fireEvent.click(
      screen.getByRole('button', { name: /to Osc 1 position on/ }),
    );
    expect(useSynthStore.getState().modRoutes[0].enabled).toBe(false);
    expect(screen.getAllByRole('slider')).toHaveLength(8 + 1);
  });
});
