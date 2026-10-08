// @vitest-environment jsdom
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';

// ── Instrument views have no fake controls (dock-instruments-17) ───────────
// Keyboard's preset arrows had no handler, the preset browser's Play tile was
// a plain box, the drum machine's "Sample" panel drew the same invented
// envelope for every pad, and the organ's Leslie rotors spun while the Leslie
// was switched off.

const engines = vi.hoisted(() => new Map<string, { instrument: unknown }>());
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: engines,
  subscribeEngineReady: () => () => {},
  getEngineReadyVersion: () => 0,
}));
vi.mock('@/daw/collab/studioRealtime', () => ({
  studioRealtime: { shouldBroadcast: () => false, send: vi.fn() },
}));
vi.mock('@/daw/instruments/SoundFontAdapter', () => ({
  SoundFontAdapter: class {},
}));
vi.mock('@/daw/oracle-synth/components/keyboard/PianoKeyboard', () => ({
  PianoKeyboard: () => null,
}));
vi.mock('@/daw/components/PianoRoll/PianoRoll', () => ({
  PianoRoll: () => null,
}));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: vi.fn() }));

import { useStore } from '@/daw/store';
import { TonewheelOrganEngine } from '@/daw/instruments/TonewheelOrganEngine';
import { PRESETS } from '@/daw/data/instrumentPresets';
import { KeyboardView } from '../KeyboardView';
import { PresetBrowser } from '../PresetBrowser';
import { DrumMachineView } from '../DrumMachineView';
import { OrganView } from '../OrganView';

beforeAll(() => {
  // jsdom has no 2D canvas; the drum grid skips drawing without one.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

beforeEach(() => {
  engines.clear();
  useStore.setState({ tracks: [], remoteUsers: new Map() });
});

afterEach(cleanup);

describe('KeyboardView', () => {
  it('shows the preset name with Browse, and no dead arrows', () => {
    const id = useStore.getState().addTrack('midi', 'piano-sampler', 'Keys');
    render(<KeyboardView trackId={id} />);

    expect(screen.getByText('Studio Grand')).toBeInTheDocument();
    // Every button in the view does something: Browse and the two modes.
    expect(
      screen.getAllByRole('button').map((b) => b.textContent?.trim()),
    ).toEqual(['Browse', 'Keyboard', 'Piano Roll']);
  });
});

describe('PresetBrowser', () => {
  it('lists presets as plain rows, with no Play tile', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <PresetBrowser onSelect={onSelect} onClose={vi.fn()} />,
    );
    expect(container.querySelector('.lucide-play')).toBeNull();

    const first = PRESETS.find((p) => p.category === 'Keyboards')!;
    fireEvent.click(screen.getByRole('button', { name: first.name }));
    expect(onSelect).toHaveBeenCalledWith(first);
  });
});

describe('DrumMachineView', () => {
  it('has no Sample panel with a made-up waveform', () => {
    const id = useStore.getState().addTrack('midi', 'drum-machine', 'Drums');
    render(<DrumMachineView trackId={id} />);

    expect(screen.getByRole('button', { name: /Velocity/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Sample/ })).toBeNull();
  });
});

describe('OrganView Leslie rotors', () => {
  function renderOrgan() {
    const id = useStore.getState().addTrack('midi', 'tonewheel-organ', 'Organ');
    const engine = new TonewheelOrganEngine();
    engines.set(id, { instrument: engine });
    render(<OrganView trackId={id} />);
    const leslie = screen.getByText('Leslie').parentElement!;
    const rotors = [...leslie.querySelectorAll('[data-stopped]')];
    return { id, engine, leslie, rotors };
  }

  const spinning = (rotors: Element[]) =>
    rotors.map(
      (r) =>
        r.getAttribute('data-stopped') === 'false' &&
        (r.firstElementChild as HTMLElement).style.animationPlayState ===
          'running',
    );

  it('spin while the Leslie is on', () => {
    const { rotors } = renderOrgan();
    expect(rotors).toHaveLength(2);
    expect(spinning(rotors)).toEqual([true, true]);
  });

  it('stand still once the Leslie is switched off, at any speed', () => {
    const { id, leslie } = renderOrgan();
    const toggle = within(leslie).getByText('Enabled')
      .nextElementSibling as HTMLElement;
    fireEvent.click(toggle);

    const organ = useStore
      .getState()
      .tracks.find((t) => t.id === id)!.organState!;
    expect(organ.leslieEnabled).toBe(false);
    expect(organ.leslieSpeed).not.toBe('stop');
    const rotors = [...leslie.querySelectorAll('[data-stopped]')];
    expect(spinning(rotors)).toEqual([false, false]);
  });
});
