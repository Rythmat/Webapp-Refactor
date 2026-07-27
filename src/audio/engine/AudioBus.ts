// ── AudioBus (compatibility shim) ────────────────────────────────────────────
// The Arcade's original shared-context helper. It now delegates entirely to
// audio/core, so the Arcade and the rest of the app are on the same graph.
//
// Kept so the ~6 game engines that import it did not all have to change in the
// same step as the extraction. New code should use the engine instead:
//
//     audioEngine.channel('games', volume)   // instead of createBus(volume)
//     audioEngine.context                    // instead of getAudioContext()
//     audioEngine.resume()                   // instead of resumeAudio()
//
// Removed once the game engines move onto InstrumentManager.

import { audioEngine } from '../AudioEngine';
import { audioContextOwner } from '../core/AudioContextOwner';
import { mixer } from '../core/Mixer';

/** @deprecated Use `audioEngine.context`. */
export function getAudioContext(): AudioContext {
  return audioContextOwner.get();
}

/** @deprecated Use `audioEngine.channel('games')`'s destination instead. */
export function getMasterBus(): GainNode {
  return mixer.bus('games');
}

/** @deprecated Use `audioEngine.channel('games', volume)`. */
export function createBus(volume = 1): GainNode {
  return mixer.channel('games', volume);
}

/** @deprecated Use `audioEngine.resume()`. */
export function resumeAudio(): void {
  audioContextOwner.resume();
}

/** @deprecated Use `audioEngine.isRunning()`. */
export function isAudioRunning(): boolean {
  return audioContextOwner.isRunning();
}

/** @deprecated Use `audioEngine.setMasterVolume(v)`. */
export function setMasterVolume(v: number): void {
  audioEngine.setMasterVolume(v);
}

/** @deprecated Use `audioEngine.getMasterVolume()`. */
export function getMasterVolume(): number {
  return audioEngine.getMasterVolume();
}
