import * as Tone from 'tone';
import { audioEngine } from './AudioEngine';
import type { ClickSound } from './clickSounds';
import { createClickVoice } from './clickVoice';

// ── One click to hear a choice (milestone 2.8) ─────────────────────────────
//
// The Click menu plays the sound it was set to, once, so the student hears
// what they picked. Loaded on demand: the menu sits in the bottom rail on
// every view, and Tone stays out of the editor's first load. Silent until
// the audio has started (the first Play or key).

export function previewClick(sound: ClickSound, db: number): void {
  if (!audioEngine.getIsInitialized()) return;
  const voice = createClickVoice(sound, audioEngine.getOutput(), db);
  voice.trigger(true, Tone.now() + 0.02);
  window.setTimeout(() => voice.dispose(), 500);
}
