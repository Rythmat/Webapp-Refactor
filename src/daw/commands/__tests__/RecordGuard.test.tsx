// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// TransportBar's neighbours that need the audio engine, auth or a session.
vi.mock('@/daw/hooks/useTransport', () => ({ seekTo: vi.fn() }));
vi.mock('@/daw/components/Transport/FileMenu', () => ({
  FileMenu: () => null,
}));
vi.mock('@/daw/components/Prism/CircleOfFifths', () => ({
  CircleOfFifths: () => null,
}));
vi.mock('@/daw/collab/ui/CollabToolbar', () => ({
  CollabToolbar: () => null,
}));
vi.mock('@/daw/collab/ui/LeaveSavePrompt', () => ({
  LeaveSavePrompt: () => null,
}));
vi.mock('@/daw/collab/ui/KickedModal', () => ({ KickedModal: () => null }));
vi.mock('@/daw/collab/ui/WaitingForSessionModal', () => ({
  WaitingForSessionModal: () => null,
}));

import {
  dismissRecordRequest,
  isRecordGuardOpen,
  requestRecord,
} from '../requestRecord';
import { RecordGuard } from '@/daw/components/Transport/RecordGuard';
import { TransportBar } from '@/daw/components/Transport/TransportBar';
import { useStore } from '@/daw/store';

const QUESTION = 'Overwrite existing recording?';

/** An armed vocal track with a take over bars 1-2, the playhead at bar 1. */
function armVocalsOverTake() {
  useStore.setState({
    tracks: [
      {
        id: 'vox',
        name: 'Vocals',
        type: 'audio',
        instrument: 'vocal-fx',
        color: '#888888',
        mute: false,
        solo: false,
        volume: 0.8,
        pan: 0,
        recordArmed: true,
        monitoring: false,
        midiInputId: null,
        audioInputId: null,
        audioInputChannel: null,
        effects: {},
        activeEffects: [],
        trackRole: 'auto',
        midiClips: [],
        audioClips: [
          {
            id: 'take-1',
            startTick: 0,
            duration: 3840,
            fadeInTicks: 0,
            fadeOutTicks: 0,
          },
        ],
      },
    ],
    position: 0,
    isPlaying: false,
    isRecording: false,
    isCountingIn: false,
    countInBars: 0,
  } as never);
}

beforeEach(() => {
  armVocalsOverTake();
});

afterEach(() => {
  cleanup();
  dismissRecordRequest();
});

describe('the Record button', () => {
  it('asks before recording over a take, as the R key does', () => {
    const onInit = vi.fn();
    render(
      <>
        <TransportBar onInit={onInit} isReady={false} />
        <RecordGuard />
      </>,
    );

    fireEvent.click(screen.getByTitle('Record'));

    expect(isRecordGuardOpen()).toBe(true);
    expect(screen.getByText(QUESTION)).toBeInTheDocument();
    expect(useStore.getState().isRecording).toBe(false);
    // The audio engine starts only once the student goes ahead.
    expect(onInit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onInit).toHaveBeenCalledTimes(1);
    expect(useStore.getState().isRecording).toBe(true);
    expect(isRecordGuardOpen()).toBe(false);
  });
});

describe('RecordGuard', () => {
  it('drops a question asked before it mounted', () => {
    // Asked while no guard was on screen, e.g. in an editor since left.
    requestRecord();
    expect(isRecordGuardOpen()).toBe(true);

    render(<RecordGuard />);

    expect(isRecordGuardOpen()).toBe(false);
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(useStore.getState().isRecording).toBe(false);
  });

  it('drops its open question when the editor unmounts', () => {
    const { unmount } = render(<RecordGuard />);
    act(() => {
      requestRecord();
    });
    expect(screen.getByText(QUESTION)).toBeInTheDocument();

    // The student leaves with the question still open (browser Back).
    unmount();
    expect(isRecordGuardOpen()).toBe(false);

    // The next editor starts without it.
    render(<RecordGuard />);
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(useStore.getState().isRecording).toBe(false);
  });
});
