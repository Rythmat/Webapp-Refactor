// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { TrackList } from '@/daw/shell/tracklist/TrackList';
import { MasterRow, selectMaster, useMasterSelected } from '../MasterRow';

// ── Master in the track list (owner, 2026-10-22) ───────────────────────────
// The Master strip is selectable as a track's row is, its name plain (no
// box, no chevron), with a mute as a track's header has. The list has one
// selection: a track, or Master. Run:
// npx vitest run src/daw/shell/bottombar/__tests__/masterStrip.test.tsx

const s = () => useStore.getState();

function Strip() {
  const selected = useMasterSelected();
  return (
    <div
      data-testid="strip"
      data-selected={selected || undefined}
      onClick={selectMaster}
    >
      <MasterRow layout="strip" />
    </div>
  );
}

let keys = '';

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  keys = s().addTrack('midi', 'soundfont', 'Keys');
  s().setSelectedTrackId(keys);
  useStore.setState({ currentView: 'arrange' });
});

afterEach(cleanup);

describe('the Master strip', () => {
  it('has a plain name, and a mute as the tracks have', () => {
    render(<Strip />);
    const name = screen.getByTestId('master-open');
    expect(name).toHaveTextContent('Master');
    expect(name.querySelector('svg')).toBeNull();
    const mute = screen.getByRole('button', { name: 'Mute Master' });
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    expect(s().masterMuted).toBe(true);
    expect(mute).toHaveAttribute('aria-pressed', 'true');
    // Muting doesn't select it.
    expect(s().dockMaster).toBe(false);
  });

  it('is selected by a click, and a track’s click takes the selection back', () => {
    render(
      <>
        <TrackList />
        <Strip />
      </>,
    );
    const row = document.querySelector(
      `li[data-track-id="${keys}"]`,
    ) as HTMLElement;
    expect(row).toHaveAttribute('aria-current', 'true');

    fireEvent.click(screen.getByTestId('strip'));
    expect(s().dockMaster).toBe(true);
    expect(screen.getByTestId('strip')).toHaveAttribute(
      'data-selected',
      'true',
    );
    // One selection in the list: the track's row no longer shows it.
    expect(row).not.toHaveAttribute('aria-current');
    // A second click keeps it selected, as a track's does.
    fireEvent.click(screen.getByTestId('master-open'));
    expect(s().dockMaster).toBe(true);

    act(() => fireEvent.click(row));
    expect(s().dockMaster).toBe(false);
    expect(s().selectedTrackId).toBe(keys);
    expect(row).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('strip')).not.toHaveAttribute('data-selected');
  });
});
