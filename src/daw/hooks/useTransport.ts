import { useEffect } from 'react';
import * as Tone from 'tone';
import { useStore } from '@/daw/store';
import { getPlaybackLoop } from '@/daw/store/transportSlice';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { dropRepeatedTicks } from '@/daw/audio/transportTicks';
import {
  endPlayheadRun,
  notePlayheadSeek,
  startPlayheadRun,
} from '@/daw/engine/playheadClock';

// ── seekTo ──────────────────────────────────────────────────────────────
// Seek playhead to a specific tick position. Syncs Tone.Transport, the
// playhead clock and the store's parked position, so every playhead jumps
// immediately.

/**
 * The tempo while a tempo slider moves: heard at once through the transport,
 * and written to the store (which everything else follows) on release.
 */
export function previewTempo(bpm: number): void {
  if (Number.isFinite(bpm)) Tone.getTransport().bpm.value = bpm;
}

export function seekTo(tick: number) {
  const t = Math.max(0, Math.round(tick));
  Tone.getTransport().ticks = t;
  notePlayheadSeek(t);
  useStore.getState().setPosition(t);
  useStore.getState().setLastSeekPosition(t);
}

// ── useTransport ────────────────────────────────────────────────────────
// Two-way sync between Zustand transport state and Tone.Transport.
//   - BPM changes propagate to Tone.Transport.bpm
//   - Play / pause toggles Tone.Transport start / pause
//   - The playhead clock (engine/playheadClock.ts) follows the transport
//     between start and pause; the store's position is written on pause,
//     stop and seek only (milestone 1.7).

export function useTransport() {
  const isPlaying = useStore((s) => s.isPlaying);
  const bpm = useStore((s) => s.bpm);
  // Loops on the piano roll editor's own loop while that editor is open,
  // otherwise on the project loop.
  const loopEnabled = useStore((s) => getPlaybackLoop(s).enabled);
  const loopStart = useStore((s) => getPlaybackLoop(s).start);
  const loopEnd = useStore((s) => getPlaybackLoop(s).end);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);

  // Sync BPM → Tone.Transport
  useEffect(() => {
    Tone.getTransport().bpm.value = bpm;
  }, [bpm]);

  // Sync time signature → Tone.Transport
  useEffect(() => {
    Tone.getTransport().timeSignature = [tsNum, tsDen];
  }, [tsNum, tsDen]);

  // Sync loop state → Tone.Transport
  useEffect(() => {
    const transport = Tone.getTransport();
    transport.loop = loopEnabled;
    transport.loopStart = `${loopStart}i`;
    transport.loopEnd = `${loopEnd}i`;
  }, [loopEnabled, loopStart, loopEnd]);

  // Leaving the editor stops playback. Its track engines are disposed on the
  // way out, so the app-wide transport would only keep running the DAW's loop
  // and tempo under other screens, and a stale isPlaying would restart it on
  // the way back in.
  useEffect(() => {
    return () => {
      const transport = Tone.getTransport();
      if (transport.state === 'started') transport.pause();
      const s = useStore.getState();
      if (s.isPlaying || s.isCountingIn || s.isRecording) s.pause();
      endPlayheadRun();
    };
  }, []);

  // Sync play / pause → Tone.Transport
  useEffect(() => {
    const transport = Tone.getTransport();
    if (isPlaying) {
      // Ensure the shared context is running before starting playback — if it
      // was suspended/interrupted (sleep, tab background, iOS), transport.start
      // would silently produce no audio until the context resumes.
      void audioEngine.resumeIfNeeded();
      // At 48 kHz Tone's clock repeats a tick every few seconds, and a note,
      // clip or click on it would play twice: each tick runs once.
      dropRepeatedTicks(transport);
      const from = useStore.getState().position;
      transport.ticks = from;
      const at = Tone.now();
      startPlayheadRun(from, at);
      transport.start(at);
    } else {
      transport.pause();
      endPlayheadRun();
      // The pause or stop action parked the playhead in the store (pause
      // where it was heard, stop at the last seek): resume from there.
      transport.ticks = useStore.getState().position;
    }
  }, [isPlaying]);
}
