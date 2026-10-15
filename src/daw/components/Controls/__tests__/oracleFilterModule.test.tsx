// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { FilterType } from '@/daw/oracle-synth/audio/types';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { FilterModule } from '@/daw/oracle-synth/components/modules/FilterModule';

// ── The Oracle synth's filter shows only controls the engine applies ───────
// Filter.setParams keeps `enabled` without applying it and never reads `pan`,
// and a biquad uses its gain only for peaking and shelf types (synth-engine-17).
// So ON/OFF and PAN are hidden, and GAIN shows only where it changes the sound.

// The response curve polls a live BiquadFilterNode every frame; not under test.
vi.mock(
  '@/daw/oracle-synth/components/visualizers/FilterResponseVisualizer',
  () => ({ FilterResponseVisualizer: () => null }),
);
// A marker in place of the synth's on/off switch, so the test sees one if the
// module ever renders it again.
vi.mock('@/daw/oracle-synth/components/controls/Toggle', () => ({
  Toggle: () => <span data-testid="synth-toggle" />,
}));

const initialFilters = useSynthStore.getState().filters;

function setFilterType(type: FilterType) {
  useSynthStore.getState().setFilterParam(0, 'type', type);
}

const knob = (name: string) => screen.queryByRole('slider', { name });

beforeEach(() => {
  useSynthStore.setState({ filters: initialFilters });
});

afterEach(cleanup);

describe('Oracle synth FilterModule', () => {
  it('has no ON/OFF switch, since the engine never bypasses the filter', () => {
    render(<FilterModule index={0} />);
    expect(screen.getByText('FILTER 1')).toBeInTheDocument();
    expect(screen.queryByTestId('synth-toggle')).toBeNull();
  });

  it('has no PAN knob, since the engine never pans the filter', () => {
    render(<FilterModule index={1} />);
    expect(knob('PAN')).toBeNull();
    expect(knob('CUTOFF')).toBeInTheDocument();
    expect(knob('RES')).toBeInTheDocument();
    expect(knob('MIX')).toBeInTheDocument();
  });

  it.each<FilterType>(['lowpass', 'highpass', 'bandpass', 'notch', 'allpass'])(
    'hides GAIN for a %s filter, which ignores it',
    (type) => {
      setFilterType(type);
      render(<FilterModule index={0} />);
      expect(knob('GAIN')).toBeNull();
    },
  );

  it.each<FilterType>(['peaking', 'lowshelf', 'highshelf'])(
    'shows GAIN for a %s filter, which applies it',
    (type) => {
      setFilterType(type);
      render(<FilterModule index={0} />);
      expect(knob('GAIN')).toBeInTheDocument();
    },
  );

  it('brings GAIN in when the type changes to a shelf', () => {
    setFilterType('lowpass');
    render(<FilterModule index={0} />);
    expect(knob('GAIN')).toBeNull();

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'highshelf' },
    });

    expect(useSynthStore.getState().filters[0].type).toBe('highshelf');
    expect(knob('GAIN')).toBeInTheDocument();
  });
});
