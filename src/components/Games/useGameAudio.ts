import { useEffect, useState } from 'react';
import { audioEngine } from '@/audio/AudioEngine';
import { getPianoSampler } from '@/audio/pianoSampler';

/**
 * The heavyweight audio engines an arcade game can depend on. Both are
 * singletons that memoize their load, so warming one from several games costs
 * nothing extra and the browser cache carries the assets between games.
 *
 * - `jam-synth`     — the SpessaSynth worklet + the 31 MB GM soundfont. Used by
 *                     Chroma, Constellations and Chord Press's key bindings.
 * - `piano-sampler` — the Tone sampler's ~85 piano mp3s, which is what a click
 *                     on the shared PianoKeyboard sounds through.
 */
export type GameAudioEngine = 'jam-synth' | 'piano-sampler';

// Neither loader resumes its AudioContext. Until the page has user activation
// the browser leaves resume() pending indefinitely, which would stall the load
// and leave a game waiting on audio that never arrives. Both engines load fine
// on a suspended context; output is unblocked by the first note, which always
// follows a real gesture.
const LOADERS: Record<GameAudioEngine, () => Promise<unknown>> = {
  'jam-synth': () => audioEngine.loadInstrument('gm-soundfont'),
  'piano-sampler': getPianoSampler,
};

/**
 * Load a game's audio engine(s) as the game mounts — in parallel with its first
 * render, rather than on the first note — and report when sound is actually
 * available.
 *
 * Games use `ready` to hold their Start button (or their play surface) until
 * they can be heard, so a player is never interacting with a game that looks
 * alive but is silent.
 */
export function useGameAudio(engines: GameAudioEngine[]): { ready: boolean } {
  const [ready, setReady] = useState(false);
  // Depend on the contents, not the array identity, so an inline literal at the
  // call site doesn't restart the load on every render.
  const key = engines.join(',');

  useEffect(() => {
    let cancelled = false;
    const list = key ? (key.split(',') as GameAudioEngine[]) : [];

    Promise.all(list.map((engine) => LOADERS[engine]()))
      .catch((err) => {
        // Fail open: a broken engine must not lock the player out of the game.
        console.error('[useGameAudio] audio engine failed to load', err);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { ready };
}
