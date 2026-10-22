import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { useStore, type AllSlices } from '@/daw/store';
import { addFrameTask } from '@/daw/engine/engineClock';
import { getPlayheadTick, isPlayheadRunning } from '@/daw/engine/playheadClock';
import { transportStartedAt } from '@/daw/engine/playbackScheduler';
import { ticksHeardAt } from '@/daw/audio/heardTime';
import { MidiRecorder } from '@/daw/audio/MidiRecorder';
import { buildRecordedClip } from '@/daw/audio/recordedClip';
import { beginTake } from '@/daw/session/takesInFlight';
import { recordTargetTrackId } from '@/daw/midi/liveTarget';
import { takeWritesChords, writeTakeChords } from '@/daw/harmony/takeChords';
import { withTransaction, withoutHistory } from '@/daw/store/history';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { MidiClip } from '@/daw/store/tracksSlice';

// ── useMidiRecording ────────────────────────────────────────────────────
// Manages the MIDI recording lifecycle:
//   - When isRecording flips to true  -> start capturing note events
//   - When isRecording flips to false -> stop, convert to a MidiClip,
//     and add it to the track it was recording onto: the record target
//     when it started (the practice screen's track, else the first
//     record-armed MIDI track), or the target now if that one has gone.
//   - While the chord ruler's Auto is on, the take's chords go on the ruler
//     as it plays (about twice a second) and when it ends (takeChords.ts).
//     The live ones are a preview, outside undo: at the end the ruler goes
//     back to how it was at punch-in and the clip and its chords land as
//     one step, so undoing the take takes its chords too.

/** How often (ms) a take's chords are read while it plays. */
const LIVE_CHORDS_MS = 500;

/** Where a take that started on `startedOn` lands now. */
function takeTrackId(state: AllSlices, startedOn: string | null) {
  if (
    startedOn !== null &&
    state.tracks.some((t) => t.id === startedOn && t.type === 'midi')
  ) {
    return startedOn;
  }
  return recordTargetTrackId(state);
}

/** The take's span on the timeline: the clip's front to its last note's end. */
function clipSpan(clip: {
  startTick: number;
  events: { startTick: number; durationTicks: number }[];
}) {
  const end = clip.events.reduce(
    (most, n) => Math.max(most, n.startTick + n.durationTicks),
    0,
  );
  return { start: clip.startTick, end: clip.startTick + end };
}

/**
 * Puts a finished take on its track and, while Auto is on, its chords on the
 * ruler, as one undo step. `laneBefore` is the ruler at punch-in, before the
 * live preview (null: no preview was written).
 */
export function commitMidiTake(
  trackId: string,
  clip: MidiClip,
  laneBefore: ChordRegion[] | null,
): void {
  if (laneBefore !== null) {
    withoutHistory(() => useStore.setState({ chordRegions: laneBefore }));
  }
  withTransaction('Record take', () => {
    useStore.getState().addMidiClip(trackId, clip);
    if (!takeWritesChords(trackId)) return;
    const { start, end } = clipSpan(clip);
    writeTakeChords(
      clip.events.map((n) => ({ ...n, startTick: n.startTick + start })),
      start,
      end,
      { sourceClipId: clip.id },
    );
  });
}

export function useMidiRecording() {
  const isRecording = useStore((s) => s.isRecording);
  const recorderRef = useRef(new MidiRecorder());
  // Tick the take punched in at. It becomes the clip's front, so a player who
  // comes in late keeps that rest instead of having it trimmed away.
  const punchInTickRef = useRef(0);
  // The take in progress, counted for openSession (takesInFlight): an open
  // that replaces the session waits for it to be committed into it.
  const settleTakeRef = useRef<(() => void) | null>(null);
  // The track the take started on (recordTargetTrackId at punch-in).
  const targetRef = useRef<string | null>(null);
  // The chord ruler at punch-in, once the live preview has written to it.
  const laneBeforeRef = useRef<ChordRegion[] | null>(null);

  useEffect(() => {
    if (isRecording) {
      // A second startRecording() would drop the take in progress and
      // re-anchor it to wherever the playhead is now.
      if (recorderRef.current.isRecording()) return;
      // Anchor to the tick the student hears at punch-in. While playing that
      // is the speakers' clock (heardTime), the same model the take's notes
      // are placed by (MidiRecorder), so the front rest and the notes agree;
      // a punch-in while playing is past the store's parked position.
      // Stopped, it is the parked playhead.
      punchInTickRef.current = Math.round(
        isPlayheadRunning()
          ? ticksHeardAt(undefined, transportStartedAt())
          : getPlayheadTick(),
      );
      targetRef.current = recordTargetTrackId();
      laneBeforeRef.current = null;
      recorderRef.current.startRecording({
        transportStart: transportStartedAt,
      });
      settleTakeRef.current?.();
      const recorder = recorderRef.current;
      settleTakeRef.current = beginTake('midi', {
        alive: () => recorder.isRecording(),
      });
    } else if (recorderRef.current.isRecording()) {
      // Settled once the clip is in the store, or the take is dropped.
      const settle = settleTakeRef.current;
      settleTakeRef.current = null;
      const laneBefore = laneBeforeRef.current;
      laneBeforeRef.current = null;
      try {
        const { notes, ccEvents } = recorderRef.current.stopRecording();
        const trackId =
          notes.length > 0
            ? takeTrackId(useStore.getState(), targetRef.current)
            : null;
        if (trackId) {
          // Anchored to punch-in, so a take that came in after the downbeat
          // keeps that rest at the front of the clip instead of sliding up
          // to it. See buildRecordedClip.
          commitMidiTake(
            trackId,
            {
              id: crypto.randomUUID(),
              ...buildRecordedClip(notes, ccEvents, punchInTickRef.current),
            },
            laneBefore,
          );
        } else if (laneBefore !== null) {
          // No take: the preview's chords go.
          withoutHistory(() => useStore.setState({ chordRegions: laneBefore }));
        }
      } finally {
        settle?.();
      }
    }
  }, [isRecording]);

  // A take still running when the editor closes is kept, as Stop would keep
  // it. useTransport's unmount pause clears isRecording, but the effect above
  // never sees that from an unmounting editor, so the take would be dropped.
  // (usePlaybackEngine does the same for an audio take.) The store outlives
  // the editor, so the clip is there when the student comes back. DawApp
  // declares this hook before useAutosave, so the autosave's unmount flush,
  // which runs after this cleanup, writes the take to the crash-recovery slot.
  //
  // Known limit in a collab room: CollabProvider, the editor's parent, has
  // already torn the room down when this runs (React runs a closing tree's
  // cleanups parent first). The take stays on this device and never reaches
  // the peers, and a guest who rejoins gets the room's copy in its place.
  // Revisit with the 1.3 persistence work.
  useEffect(() => {
    const recorder = recorderRef.current;
    const settleRef = settleTakeRef;
    const target = targetRef;
    const laneBeforeAtClose = laneBeforeRef;
    return () => {
      const settle = settleRef.current;
      settleRef.current = null;
      try {
        if (!recorder.isRecording()) return;
        const laneBefore = laneBeforeAtClose.current;
        laneBeforeAtClose.current = null;
        const { notes, ccEvents } = recorder.stopRecording();
        const trackId =
          notes.length > 0
            ? takeTrackId(useStore.getState(), target.current)
            : null;
        if (!trackId) {
          if (laneBefore !== null) {
            withoutHistory(() =>
              useStore.setState({ chordRegions: laneBefore }),
            );
          }
          return;
        }
        commitMidiTake(
          trackId,
          {
            id: crypto.randomUUID(),
            ...buildRecordedClip(notes, ccEvents, punchInTickRef.current),
          },
          laneBefore,
        );
      } finally {
        settle?.();
      }
    };
  }, []);

  // Live recording display: snapshots of the take reach the store about 15
  // times a second, on the editor's frame loop.
  useEffect(() => {
    if (!isRecording) return;
    const trackId = recordTargetTrackId();
    if (!trackId) return;

    let chordsReadAt = 0;
    const stopTask = addFrameTask(
      () => {
        const nowTick = Math.round(Tone.getTransport().ticks);
        const snapshot = recorderRef.current.getSnapshot(nowTick);
        if (snapshot.length > 0) {
          const now = performance.now();
          if (
            now - chordsReadAt >= LIVE_CHORDS_MS &&
            takeWritesChords(trackId)
          ) {
            chordsReadAt = now;
            const base =
              laneBeforeRef.current ?? useStore.getState().chordRegions;
            laneBeforeRef.current = base;
            withoutHistory(() =>
              writeTakeChords(snapshot, punchInTickRef.current, nowTick, {
                base,
              }),
            );
          }
          // Same anchor the committed clip gets, so the overlay shows the take
          // where it will land — including the rest before the first note.
          useStore
            .getState()
            .setLiveRecording(
              trackId,
              snapshot,
              Math.min(punchInTickRef.current, snapshot[0].startTick),
            );
        }
      },
      { fps: 15, name: 'record-midi' },
    );

    return () => {
      stopTask();
      useStore.getState().clearLiveRecording();
    };
  }, [isRecording]);

  return recorderRef.current;
}
