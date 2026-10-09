// @vitest-environment jsdom
/**
 * A recorded jam opens in two steps (milestone 1.4): readPendingJam finds it
 * and never clears it, so an open that is refused or fails leaves it to open
 * again; applyJamSession writes it into the project openSession has just
 * reset, at the jam's tempo, with no reset, baseline, undo reset or clear.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { resetSessionToEmpty } from '@/daw/persistence/SessionSerializer';
import { isDocumentDirty } from '@/daw/persistence/saveStatusStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { applyJamSession, readPendingJam } from '../importJamSession';
import { loadJamSession, saveJamSession, type JamSession } from '../jamSession';

const s = () => useStore.getState();

const jam = (over: Partial<JamSession> = {}): JamSession => ({
  version: 1,
  roomId: 'room-1',
  recordedAt: 1,
  bpm: 96,
  localUserId: 'me',
  participants: [
    { userId: 'me', userName: 'Ana', color: '#ff0000' },
    { userId: 'you', userName: 'Ben', color: '#00ff00' },
  ],
  notes: [
    {
      userId: 'me',
      color: '#ff0000',
      instrument: 'piano',
      gmProgram: 0,
      midi: 60,
      velocity: 90,
      startMs: 0,
      endMs: 500,
    },
    {
      userId: 'you',
      color: '#00ff00',
      instrument: 'piano',
      gmProgram: 33,
      midi: 36,
      velocity: 90,
      startMs: 625,
      endMs: 1250,
    },
    {
      userId: 'me',
      color: '#ff0000',
      instrument: 'drums',
      gmProgram: 0,
      midi: 36,
      velocity: 100,
      startMs: 0,
      endMs: 100,
    },
  ],
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  useStore.setState(useStore.getInitialState(), true);
  resetSessionToEmpty();
});

describe('readPendingJam', () => {
  it('reads the waiting jam and leaves it waiting', () => {
    saveJamSession(jam());
    expect(readPendingJam()?.bpm).toBe(96);
    expect(readPendingJam()?.bpm).toBe(96);
    expect(loadJamSession()).not.toBeNull();
  });

  it('is null with no jam, an unreadable one or one with no notes', () => {
    expect(readPendingJam()).toBeNull();
    saveJamSession(jam({ notes: [] }));
    expect(readPendingJam()).toBeNull();
    // Still there: reading never clears.
    expect(loadJamSession()).not.toBeNull();
    localStorage.setItem('musicatlas:pending-jam-import', '{nope');
    expect(readPendingJam()).toBeNull();
  });
});

describe('applyJamSession', () => {
  it('writes a track per player and sound plus the drums, at the jam’s tempo', () => {
    const generation = getSessionGeneration();
    const created = applyJamSession(jam());

    expect(created).toBe(3);
    expect(s().bpm).toBe(96);
    expect(s().tracks.map((t) => t.name)).toEqual([
      'Ana — Acoustic Grand Piano (Jam)',
      'Ben — Electric Bass (finger) (Jam)',
      'Jam Drums',
    ]);
    // 625 ms at 96 bpm is one beat: tick 480.
    expect(s().tracks[1].midiClips[0].events[0].startTick).toBe(480);
    // No reset, no baseline, no clear: the opener's.
    expect(getSessionGeneration()).toBe(generation);
    expect(isDocumentDirty()).toBe(true);
  });

  it('never clears the hand-off', () => {
    saveJamSession(jam());
    applyJamSession(readPendingJam()!);
    expect(loadJamSession()).not.toBeNull();
  });

  it('falls back to 120 bpm for a jam with no tempo', () => {
    applyJamSession(jam({ bpm: 0 }));
    expect(s().bpm).toBe(120);
  });
});
