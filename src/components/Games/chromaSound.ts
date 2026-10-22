// ── Chroma's sound ──────────────────────────────────────────────────────────
// Every note plays on Peter's Oracle patch BASIC SINE LEAD, an Atlas patch
// saved from the Studio's synth (daw/oracle-synth/store/presets/atlas). The
// Studio's instruments are a chunk of their own, loaded on demand as Echo's
// Make Your Song loads them, and the synth plays on the arcade's games
// channel, as Foli does, rather than straight to the speakers.
//
// Module-level and kept, as Learn's and Echo's voices are: one synth for the
// visit, made on first use. A note starts now and its release is scheduled on
// the audio clock, so a note played twice is never cut short by a timer.

import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from '@/audio/AudioEngine';
import type { InstrumentAdapter } from '@/daw/instruments/InstrumentAdapter';

/** The patch, as a Studio sound string. */
export const CHROMA_SOUND = 'oracle-synth:BASIC SINE LEAD';

/** The games channel's level for the lead: its notes peak near -4 dBFS. */
const LEAD_LEVEL = 0.8;

let lead: Promise<InstrumentAdapter | null> | null = null;

/** The lead, made once; null if it couldn't be made. */
export function loadChromaLead(): Promise<InstrumentAdapter | null> {
  lead ??= (async () => {
    const { createSoundInstrument, applySynthSound } = await import(
      '@/daw/instruments/soundString'
    );
    const adapter = createSoundInstrument(CHROMA_SOUND);
    if (!adapter) return null;
    await adapter.init(
      audioEngine.context,
      audioEngine.channel('games', LEAD_LEVEL),
    );
    applySynthSound(adapter, CHROMA_SOUND);
    return adapter;
  })().catch((err: unknown) => {
    console.error('[Chroma] the lead failed to load', err);
    lead = null;
    return null;
  });
  return lead;
}

/**
 * The lead as the game uses it: `ready` once it can play (or has failed: a
 * broken synth must not lock the player out), and `play(midi, seconds,
 * velocity 0–1)`.
 */
export function useChromaSound(): {
  ready: boolean;
  play: (midi: number, durationS: number, velocity01: number) => void;
} {
  const [ready, setReady] = useState(false);
  const adapterRef = useRef<InstrumentAdapter | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadChromaLead().then((adapter) => {
      adapterRef.current = adapter;
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const play = useCallback(
    (midi: number, durationS: number, velocity01: number) => {
      const adapter = adapterRef.current;
      if (!adapter) return;
      audioEngine.resume();
      const now = audioEngine.context.currentTime;
      const velocity = Math.round(Math.max(0, Math.min(1, velocity01)) * 127);
      adapter.noteOn(midi, velocity, now);
      adapter.noteOff(midi, now + Math.max(0, durationS));
    },
    [],
  );

  return { ready, play };
}
