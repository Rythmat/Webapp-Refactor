// @vitest-environment jsdom
/**
 * The effects library and the dock's chain are one state (milestone 2.8,
 * after Soundtrap's, anatomy shots 40–46). While the side rail's Effects
 * panel shows, the chain's next empty slot is armed: Add effect opens the
 * panel, each pick fills the slot and arms the next, and the armed slot's ×
 * stops and puts the Inspector back as it was. The panel is the only list
 * that adds effects to a track, so its rows carry the fx-add-* anchors.
 * The rack's cap is one constant the store enforces.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { MAX_RACK_EFFECTS } from '@/daw/store/effectRack';
import { AddEffectSlot } from '@/daw/shell/dock/AddEffectSlot';
import { FxBody } from '../panels/FxBody';

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
const armed = () => s().libraryOpen && s().inspectorPanel === 'fx';

describe('Add effect', () => {
  it('arms the slot and opens the library; × stops and shuts the Inspector', () => {
    render(<AddEffectSlot count={0} />);
    const slot = screen.getByTestId('fx-add-slot');
    expect(slot.dataset.state).toBe('idle');

    fireEvent.click(slot);
    expect(armed()).toBe(true);
    expect(screen.getByTestId('fx-add-slot').dataset.state).toBe('armed');

    fireEvent.click(screen.getByTestId('fx-add-cancel'));
    expect(s().libraryOpen).toBe(false);
    expect(screen.getByTestId('fx-add-slot').dataset.state).toBe('idle');
  });

  it('puts back the panel that was showing', () => {
    s().toggleInspectorPanel('insight');
    render(<AddEffectSlot count={0} />);
    fireEvent.click(screen.getByTestId('fx-add-slot'));
    expect(s().inspectorPanel).toBe('fx');

    fireEvent.click(screen.getByTestId('fx-add-cancel'));
    expect(s().libraryOpen).toBe(true);
    expect(s().inspectorPanel).toBe('insight');
  });

  it('is the same state as the rail’s Effects icon', () => {
    render(<AddEffectSlot count={2} />);
    act(() => s().toggleInspectorPanel('fx'));
    expect(screen.getByTestId('fx-add-slot').dataset.state).toBe('armed');
    expect(screen.getByText('Slot 3')).toBeTruthy();
    act(() => s().toggleInspectorPanel('fx'));
    expect(screen.getByTestId('fx-add-slot').dataset.state).toBe('idle');
  });

  it('says the chain is full at the cap', () => {
    render(<AddEffectSlot count={MAX_RACK_EFFECTS} />);
    expect(screen.getByTestId('fx-add-slot').dataset.state).toBe('full');
  });
});

describe('the library', () => {
  it('fills the armed slot, arms the next and shows the pick in the dock', () => {
    s().setChannelStripTab('controls');
    s().openEffectsLibrary();
    render(<FxBody />);
    expect(screen.getByTestId('effects-library-slot').textContent).toContain(
      'slot 1 of 5',
    );

    fireEvent.click(screen.getByTestId('inspector-fx-reverb'));
    expect(chain()).toEqual(['reverb']);
    expect(s().channelStripTab).toBe('fx');
    expect(s().dockEffect).toBe('reverb');
    // Still open: the next slot is armed.
    expect(armed()).toBe(true);
    expect(screen.getByTestId('effects-library-slot').textContent).toContain(
      'slot 2 of 5',
    );

    fireEvent.click(screen.getByTestId('inspector-fx-delay'));
    expect(chain()).toEqual(['reverb', 'delay']);
    expect(s().dockEffect).toBe('delay');
  });

  it('shows an effect already in the chain instead of adding it twice', () => {
    s().addActiveEffect(synth, 'eq');
    s().addActiveEffect(synth, 'delay');
    render(<FxBody />);
    fireEvent.click(screen.getByTestId('inspector-fx-eq'));
    expect(chain()).toEqual(['eq', 'delay']);
    expect(s().dockEffect).toBe('eq');
  });

  it('turns the rest away at the cap', () => {
    for (const fx of ['eq', 'delay', 'reverb', 'gate', 'presence'] as const) {
      s().addActiveEffect(synth, fx);
    }
    render(<FxBody />);
    const saturator = screen.getByTestId('inspector-fx-saturator');
    expect(saturator.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(saturator);
    expect(chain()).toHaveLength(MAX_RACK_EFFECTS);
    expect(screen.getByTestId('effects-library-slot').textContent).toContain(
      'full',
    );
  });

  it('carries the fx-add-* anchors, stamped with the track rack', () => {
    render(<FxBody />);
    const row = document.querySelector('[data-tutorial-id="fx-add-delay"]');
    expect(row?.getAttribute('data-tutorial-target')).toBe('track');
  });

  it('gives each category a one-line purpose', () => {
    render(<FxBody />);
    expect(screen.getByText('Puts the sound in a room')).toBeTruthy();
    expect(screen.getByText('Controls how loud and how punchy the sound is'));
  });
});

describe('the rack’s cap', () => {
  it('is enforced by the store for a track, the master and a return', () => {
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
