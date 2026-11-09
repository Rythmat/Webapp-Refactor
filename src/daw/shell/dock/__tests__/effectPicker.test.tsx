// @vitest-environment jsdom
/**
 * The Add effect picker (after Suno's "Add a track plugin" modal): Add
 * effect opens it, a pick adds to the rack in front of the student, shows
 * the pick in the dock and closes it. Effects are no longer a side rail
 * panel. The picker is the only list that adds effects to a track, so its
 * cards carry the fx-add-* anchors. The rack's cap is one constant the
 * store enforces.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RAIL_PANELS } from '@/daw/shell/inspector/railPanels';
import { useStore } from '@/daw/store';
import { MAX_RACK_EFFECTS } from '@/daw/store/effectRack';
import { AddEffectSlot } from '../AddEffectSlot';
import { EffectPickerBody, EffectPickerHost } from '../EffectPicker';

const s = () => useStore.getState();

let synth = '';

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  synth = s().addTrack('midi', 'oracle-synth', 'Synth');
  s().setSelectedTrackId(synth);
  s().setCurrentView('arrange');
  s().setInspectorOpenFor('arrange', false);
});

afterEach(cleanup);

const chain = () => s().tracks.find((t) => t.id === synth)!.activeEffects;

describe('Add effect', () => {
  it('opens the picker as a modal, not the side rail', () => {
    render(
      <>
        <AddEffectSlot count={0} />
        <EffectPickerHost />
      </>,
    );
    expect(screen.queryByTestId('effect-picker')).toBeNull();
    fireEvent.click(screen.getByTestId('fx-add-slot'));
    expect(s().effectPickerOpen).toBe(true);
    expect(s().libraryOpen).toBe(false);
    expect(screen.getByRole('dialog', { name: 'Add effect' })).toBeTruthy();
  });

  it('closes on Escape without adding', () => {
    s().openEffectsLibrary();
    render(<EffectPickerHost />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(s().effectPickerOpen).toBe(false);
    expect(chain()).toEqual([]);
  });

  it('says the chain is full at the cap', () => {
    render(<AddEffectSlot count={MAX_RACK_EFFECTS} />);
    expect(screen.getByTestId('fx-add-slot').dataset.state).toBe('full');
  });

  it('is gone from the side rail', () => {
    expect(RAIL_PANELS.map((p) => p.id)).not.toContain('fx');
  });
});

describe('the picker', () => {
  it('adds the pick, shows it in the dock and closes', () => {
    s().setChannelStripTab('controls');
    s().openEffectsLibrary();
    render(<EffectPickerBody />);
    expect(screen.getByTestId('effects-library-slot').textContent).toContain(
      'slot 1 of 5',
    );
    fireEvent.click(screen.getByTestId('effect-picker-reverb'));
    expect(chain()).toEqual(['reverb']);
    expect(s().channelStripTab).toBe('fx');
    expect(s().dockEffect).toBe('reverb');
    expect(s().effectPickerOpen).toBe(false);
  });

  it('shows an effect already in the chain instead of adding it twice', () => {
    s().addActiveEffect(synth, 'eq');
    s().addActiveEffect(synth, 'delay');
    render(<EffectPickerBody />);
    fireEvent.click(screen.getByTestId('effect-picker-eq'));
    expect(chain()).toEqual(['eq', 'delay']);
    expect(s().dockEffect).toBe('eq');
  });

  it('turns the rest away at the cap', () => {
    for (const fx of ['eq', 'delay', 'reverb', 'gate', 'presence'] as const) {
      s().addActiveEffect(synth, fx);
    }
    render(<EffectPickerBody />);
    const saturator = screen.getByTestId('effect-picker-saturator');
    expect(saturator.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(saturator);
    expect(chain()).toHaveLength(MAX_RACK_EFFECTS);
    expect(screen.getByTestId('effects-library-slot').textContent).toContain(
      'full',
    );
  });

  it('filters by the search', () => {
    render(<EffectPickerBody />);
    act(() => {
      fireEvent.change(screen.getByTestId('effect-picker-search'), {
        target: { value: 'echo' },
      });
    });
    expect(screen.getByTestId('effect-picker-delay')).toBeTruthy();
    expect(screen.queryByTestId('effect-picker-compressor')).toBeNull();
    act(() => {
      fireEvent.change(screen.getByTestId('effect-picker-search'), {
        target: { value: 'zzz' },
      });
    });
    expect(screen.getByTestId('effect-picker-none')).toBeTruthy();
  });

  it('carries the fx-add-* anchors, stamped with the track rack', () => {
    render(<EffectPickerBody />);
    const card = document.querySelector('[data-tutorial-id="fx-add-delay"]');
    expect(card?.getAttribute('data-tutorial-target')).toBe('track');
  });

  it('gives each category a one-line purpose', () => {
    render(<EffectPickerBody />);
    expect(screen.getByText('Puts the sound in a room')).toBeTruthy();
    expect(screen.getByText('Controls how loud and how punchy the sound is'));
  });
});

describe('the presets', () => {
  const showPresets = () =>
    fireEvent.click(screen.getByTestId('effect-picker-view-presets'));

  it('switch in from the Effects view, each card naming its effect', () => {
    render(<EffectPickerBody />);
    expect(screen.queryByTestId('effect-preset-reverb-plate')).toBeNull();
    showPresets();
    const card = screen.getByTestId('effect-preset-reverb-plate');
    expect(card.textContent).toContain('Vocal plate');
    expect(card.textContent).toContain('Reverb');
    expect(screen.queryByTestId('effect-picker-reverb')).toBeNull();
  });

  it('add the effect set to the preset, as one undo, and close', () => {
    useStore.setState({ bpm: 100 });
    s().openEffectsLibrary();
    render(<EffectPickerBody />);
    showPresets();
    fireEvent.click(screen.getByTestId('effect-preset-delay-quarter'));
    expect(chain()).toEqual(['delay']);
    const delay = s().tracks.find((t) => t.id === synth)!.effects.delay;
    expect(delay).toMatchObject({ enabled: true, time: 0.6, feedback: 0.35 });
    expect(s().dockEffect).toBe('delay');
    expect(s().effectPickerOpen).toBe(false);
  });

  it('set the effect already in the chain instead of adding it twice', () => {
    s().addActiveEffect(synth, 'reverb');
    render(<EffectPickerBody />);
    showPresets();
    fireEvent.click(screen.getByTestId('effect-preset-reverb-hall'));
    expect(chain()).toEqual(['reverb']);
    const reverb = s().tracks.find((t) => t.id === synth)!.effects.reverb;
    expect(reverb).toMatchObject({ type: 'hall', decay: 3.5 });
  });

  it('search by the preset’s name or its effect', () => {
    render(<EffectPickerBody />);
    showPresets();
    fireEvent.change(screen.getByTestId('effect-picker-search'), {
      target: { value: 'slapback' },
    });
    expect(screen.getByTestId('effect-preset-delay-slapback')).toBeTruthy();
    expect(screen.queryByTestId('effect-preset-reverb-hall')).toBeNull();
    fireEvent.change(screen.getByTestId('effect-picker-search'), {
      target: { value: 'saturator' },
    });
    expect(screen.getByTestId('effect-preset-saturator-tape')).toBeTruthy();
  });

  it('leave out the sidechain off a track’s rack', () => {
    s().setDockMaster(true);
    render(<EffectPickerBody />);
    showPresets();
    expect(screen.queryByTestId('effect-preset-ducker-big')).toBeNull();
  });
});

describe('the rack’s cap', () => {
  it('is enforced by the store for a track and the master', () => {
    for (const fx of ['eq', 'delay', 'reverb', 'gate', 'presence'] as const) {
      s().addActiveEffect(synth, fx);
      s().addMasteringFx(fx);
    }
    s().addActiveEffect(synth, 'saturator');
    s().addMasteringFx('saturator');
    expect(chain()).toHaveLength(MAX_RACK_EFFECTS);
    expect(s().masteringFxChain).toHaveLength(MAX_RACK_EFFECTS);
  });
});
