import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmRecordRequest,
  dismissRecordRequest,
  getRecordRequest,
  isRecordGuardOpen,
  requestRecord,
  wouldRecordOverTake,
} from '../requestRecord';
import { useStore } from '@/daw/store';
import {
  endPlayheadRun,
  setPlayheadSourceForTests,
  startPlayheadRun,
} from '@/daw/engine/playheadClock';

function audioTrack(
  id: string,
  recordArmed: boolean,
  takes: Array<[startTick: number, duration: number]>,
) {
  return {
    id,
    name: id,
    type: 'audio',
    instrument: 'vocal-fx',
    recordArmed,
    midiClips: [],
    audioClips: takes.map(([startTick, duration], i) => ({
      id: `${id}-take-${i}`,
      startTick,
      duration,
      fadeInTicks: 0,
      fadeOutTicks: 0,
    })),
  };
}

function setup(
  tracks: ReturnType<typeof audioTrack>[],
  position: number,
  extra: Record<string, unknown> = {},
) {
  useStore.setState({
    tracks,
    position,
    isPlaying: false,
    isRecording: false,
    isCountingIn: false,
    countInBars: 0,
    ...extra,
  } as never);
}

/** Asks about a take under the playhead and returns what the guard shows. */
function askAboutVocalTake(init?: () => void) {
  setup([audioTrack('vox', true, [[0, 3840]])], 0);
  expect(requestRecord(init)).toBe('asked');
  const request = getRecordRequest();
  expect(request).not.toBeNull();
  return request!;
}

const record = vi.fn();

beforeEach(() => {
  record.mockClear();
  useStore.setState({ record } as never);
});

afterEach(() => {
  dismissRecordRequest();
});

describe('wouldRecordOverTake', () => {
  it('is false with no armed audio track', () => {
    setup([audioTrack('vox', false, [[0, 3840]])], 0);
    expect(wouldRecordOverTake()).toBe(false);
  });

  it('is true when a take ends after the playhead, wherever it starts', () => {
    // Under the playhead.
    setup([audioTrack('vox', true, [[0, 3840]])], 1920);
    expect(wouldRecordOverTake()).toBe(true);
    // Ahead of it: the new take rolls into it.
    setup([audioTrack('vox', true, [[7680, 1920]])], 0);
    expect(wouldRecordOverTake()).toBe(true);
  });

  it('is false from the end of the last take on', () => {
    setup([audioTrack('vox', true, [[0, 3840]])], 3840);
    expect(wouldRecordOverTake()).toBe(false);
  });

  it('checks the track the recorder captures: the first armed one', () => {
    setup(
      [audioTrack('gtr', true, []), audioTrack('vox', true, [[0, 3840]])],
      0,
    );
    expect(wouldRecordOverTake()).toBe(false);
  });

  it('reads the live playhead while playing, not the parked one', () => {
    // 120 bpm: 960 ticks a second, the transport started at 0 from tick 0.
    const now = { t: 0 };
    setPlayheadSourceForTests({
      currentTime: () => now.t,
      outputLatency: () => 0,
      ticksAtTime: (time) => time * 960,
      scheduleTime: () => now.t + 0.1,
    });
    try {
      setup([audioTrack('vox', true, [[0, 3840]])], 0, { isPlaying: true });
      startPlayheadRun(0, 0);
      now.t = 1;
      expect(wouldRecordOverTake()).toBe(true);
      // Past the take: the store still says 0, the student is at 4800.
      now.t = 5;
      expect(wouldRecordOverTake()).toBe(false);
    } finally {
      endPlayheadRun();
      setPlayheadSourceForTests();
    }
  });

  it('is false while already recording or counting in', () => {
    setup([audioTrack('vox', true, [[0, 3840]])], 0, { isRecording: true });
    expect(wouldRecordOverTake()).toBe(false);
    setup([audioTrack('vox', true, [[0, 3840]])], 0, { isCountingIn: true });
    expect(wouldRecordOverTake()).toBe(false);
  });
});

describe('requestRecord', () => {
  it('records at once when no take is in the way', () => {
    setup([audioTrack('vox', true, [])], 0);
    const order: string[] = [];
    record.mockImplementation(() => order.push('record'));

    expect(requestRecord(() => order.push('init'))).toBe('started');

    expect(order).toEqual(['init', 'record']);
    expect(isRecordGuardOpen()).toBe(false);
  });

  it('asks first, and records only once the student confirms', () => {
    const init = vi.fn();
    const request = askAboutVocalTake(init);

    expect(request.trackId).toBe('vox');
    expect(isRecordGuardOpen()).toBe(true);
    expect(record).not.toHaveBeenCalled();
    expect(init).not.toHaveBeenCalled();

    confirmRecordRequest(request);

    expect(init).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledTimes(1);
    expect(isRecordGuardOpen()).toBe(false);
  });

  it('records nothing, and forgets the take, when the guard is dismissed', () => {
    askAboutVocalTake();

    dismissRecordRequest();

    expect(isRecordGuardOpen()).toBe(false);
    expect(getRecordRequest()).toBeNull();
    expect(record).not.toHaveBeenCalled();
  });

  it('starts no second take when recording began meanwhile', () => {
    const request = askAboutVocalTake();
    useStore.setState({ isRecording: true });

    confirmRecordRequest(request);

    expect(record).not.toHaveBeenCalled();
    expect(isRecordGuardOpen()).toBe(false);
  });

  it('asks again when another track was armed after the question', () => {
    const init = vi.fn();
    const request = askAboutVocalTake(init);
    // The guitar is armed now, and it has a take of its own ahead.
    setup(
      [
        audioTrack('gtr', true, [[1920, 1920]]),
        audioTrack('vox', true, [[0, 3840]]),
      ],
      0,
    );

    confirmRecordRequest(request);

    expect(record).not.toHaveBeenCalled();
    expect(getRecordRequest()?.trackId).toBe('gtr');

    // Nothing in the way on the newly armed track: Continue just records.
    setup([audioTrack('gtr', true, []), audioTrack('vox', true, [])], 0);
    confirmRecordRequest(getRecordRequest()!);
    expect(record).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledTimes(1);
  });
});
