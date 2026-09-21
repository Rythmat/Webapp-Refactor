import { audioEngine } from '@/daw/audio/AudioEngine';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';

/** How long an auditioned note sounds before it's released. */
const AUDITION_MS = 400;

// Pending releases keyed by `${trackId}:${note}`, so re-auditioning a pitch
// that's still sounding restarts it instead of stacking a second voice.
const pendingReleases = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Briefly sound one note on a track's instrument — editing feedback for the
 * piano roll, played through the same engine as a key press, so it follows the
 * track's instrument, FX and mute/solo. No-ops until the track's engine exists.
 */
export function auditionNote(
  trackId: string,
  note: number,
  velocity: number,
): void {
  const engine = trackEngineRegistry.get(trackId)?.trackEngine;
  if (!engine) return;
  void audioEngine.resumeIfNeeded();

  const key = `${trackId}:${note}`;
  const pending = pendingReleases.get(key);
  if (pending) {
    clearTimeout(pending);
    engine.noteOff(note);
  }
  engine.noteOn(note, velocity);
  pendingReleases.set(
    key,
    setTimeout(() => {
      pendingReleases.delete(key);
      engine.noteOff(note);
    }, AUDITION_MS),
  );
}
