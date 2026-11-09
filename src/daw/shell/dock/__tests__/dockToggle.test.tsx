// @vitest-environment jsdom
/**
 * Double-clicking the dock opens and shuts it (owner, 2026-10-22): the
 * resizer's double-click (and Enter) shuts it, and a double-click on the
 * shut dock's title row opens it on what plays the selected track. Shutting
 * takes Master, Maximize and an open automation lane with it.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const stub = vi.hoisted(() => (name: string) => {
  const Body = () => <div data-testid={`body-${name}`} />;
  Body.displayName = `Stub(${name})`;
  return Body;
});
vi.mock('@/daw/components/Controls/TrackControlsPanel', () => ({
  TrackControlsPanel: stub('instrument'),
}));
vi.mock('@/daw/shell/dock/DockEffects', () => ({
  DockEffects: stub('effects'),
}));
vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true }),
}));

import { useStore } from '@/daw/store';
import { Dock } from '../Dock';
import { closeDock, dockIsOpen, openDock, toggleDock } from '../dockOpen';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ remoteUsers: new Map(), currentView: 'arrange' });
});
afterEach(cleanup);

describe('opening and shutting the dock', () => {
  it('shuts a tab, Master, Maximize and an automation lane together', () => {
    const synth = s().addTrack('midi', 'oracle-synth', 'Synth');
    s().setSelectedTrackId(synth);
    s().setChannelStripTab('fx');
    s().setDockMaster(true);
    s().setDockMaximized(true);
    s().setAutomationOpenTrackId(synth);
    expect(dockIsOpen()).toBe(true);
    closeDock();
    expect(dockIsOpen()).toBe(false);
    expect(s().dockMaster).toBe(false);
    expect(s().dockMaximized).toBe(false);
    expect(s().automationOpenTrackId).toBeNull();
  });

  it('opens on what plays the selected track, and toggles', () => {
    const synth = s().addTrack('midi', 'oracle-synth', 'Synth');
    s().setSelectedTrackId(synth);
    s().setChannelStripTab(null);
    openDock();
    expect(s().channelStripTab).toBe('controls');
    toggleDock();
    expect(dockIsOpen()).toBe(false);
    toggleDock();
    expect(dockIsOpen()).toBe(true);
  });

  it('opens from a double-click on the shut dock’s title row, not its buttons', () => {
    const synth = s().addTrack('midi', 'oracle-synth', 'Synth');
    s().setSelectedTrackId(synth);
    render(<Dock />);
    // The dock opens itself over a project's first tracks; shut it.
    act(() => s().setChannelStripTab(null));
    // A double-click on the open button is its own two clicks, no more.
    fireEvent.doubleClick(screen.getByTestId('dock-toggle'));
    expect(dockIsOpen()).toBe(false);
    fireEvent.doubleClick(screen.getByTestId('dock-track-name'));
    expect(s().channelStripTab).toBe('controls');
  });
});
