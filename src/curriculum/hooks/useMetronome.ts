import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

interface UseMetronomeOptions {
  bpm: number;
  enabled: boolean;
  beatsPerBar?: number; // default 4
  accentBeat1?: boolean; // default true — louder click on beat 1
}

export function useMetronome({
  bpm,
  enabled,
  beatsPerBar = 4,
  accentBeat1 = true,
}: UseMetronomeOptions) {
  const synthRef = useRef<Tone.MembraneSynth | null>(null);
  const loopRef = useRef<Tone.Sequence | null>(null);
  const runningRef = useRef(false);

  const ensureSynth = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.05 },
      }).toDestination();
    }
  }, []);

  const ensureSequence = useCallback(() => {
    if (!loopRef.current) {
      const beats = Array.from({ length: beatsPerBar }, (_, i) => i);
      loopRef.current = new Tone.Sequence(
        (time, beat) => {
          const isAccent = accentBeat1 && beat === 0;
          synthRef.current?.triggerAttackRelease(
            isAccent ? 'C5' : 'C6',
            '32n',
            time,
            isAccent ? 0.9 : 0.5,
          );
        },
        beats,
        '4n',
      );
    }
  }, [beatsPerBar, accentBeat1]);

  // prepare: sets up synth + a FRESH sequence + schedules loop at position 0, but
  // does NOT start the Transport. Always disposes the old sequence first so that
  // Transport.cancel() or prior stop() calls leave no stale state that would cause
  // beat 1 to be dropped when Transport next starts from position 0.
  const prepare = useCallback(async () => {
    await Tone.start();
    ensureSynth();
    // Always dispose the old sequence — Transport.cancel() clears its internal events
    // and a stopped sequence may not re-register cleanly via start(0).
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current.dispose();
      loopRef.current = null;
    }
    ensureSequence();
    Tone.getTransport().bpm.value = bpm;
    // Cast resets CFA narrowing — ensureSequence() sets loopRef.current above
    (loopRef.current as Tone.Sequence | null)?.start(0);
    runningRef.current = true;
    console.log('[metronome] prepared. transport:', Tone.getTransport().state);
  }, [bpm, ensureSynth, ensureSequence]);

  // start: called from useEffect (React-driven) OR as fallback manual start.
  // Idempotent — safe to call multiple times.
  const start = useCallback(async () => {
    console.log(
      '[metronome] start called. running:',
      runningRef.current,
      'transport:',
      Tone.getTransport().state,
      'loop:',
      !!loopRef.current,
      'synth:',
      !!synthRef.current,
    );
    if (runningRef.current) return; // already running (prepare() was called), don't restart
    await prepare();
    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start();
    }
    console.log('[metronome] started. transport:', Tone.getTransport().state);
  }, [prepare]);

  const stop = useCallback(() => {
    console.log('[metronome] stop called. running:', runningRef.current);
    if (!runningRef.current) return;
    loopRef.current?.stop();
    runningRef.current = false;
  }, []);

  const setBpm = useCallback((newBpm: number) => {
    Tone.getTransport().bpm.value = newBpm;
  }, []);

  // React-driven start/stop. The runningRef guard prevents the useEffect
  // from interfering with a manually-started metronome.
  useEffect(() => {
    console.log(
      '[metronome] useEffect. enabled:',
      enabled,
      'running:',
      runningRef.current,
    );
    if (enabled && !runningRef.current) {
      start();
    } else if (!enabled && runningRef.current) {
      stop();
    }
  }, [enabled, start, stop]);

  // Dispose on unmount
  useEffect(() => {
    return () => {
      loopRef.current?.stop();
      loopRef.current?.dispose();
      loopRef.current = null;
      synthRef.current?.dispose();
      synthRef.current = null;
      runningRef.current = false;
    };
  }, []);

  return { setBpm, start, prepare };
}
