/**
 * UI feedback sounds.
 *
 * A thin, named layer over the shared AudioEngine's clip player — it used to
 * own an AudioContext, a gain node and a buffer cache of its own. Behaviour is
 * unchanged: buffers preload on first play, playback is synchronous and
 * no-ops when muted or not yet decoded, and mute persists in localStorage.
 */

import { audioEngine } from '@/audio/AudioEngine';

export type SoundName =
  | 'click'
  | 'alt-click'
  | 'select'
  | 'notification'
  | 'notification-deleted'
  | 'reward'
  | 'xp-gained'
  | 'item-locked'
  | 'insufficient-credits';

const SOUND_MAP: Record<SoundName, string> = {
  click: '/sounds/basic-click.wav',
  'alt-click': '/sounds/alt-click.wav',
  select: '/sounds/select-button.wav',
  notification: '/sounds/notification.wav',
  'notification-deleted': '/sounds/notification-deleted.wav',
  reward: '/sounds/reward-claimed.wav',
  'xp-gained': '/sounds/xp-gained.wav',
  'item-locked': '/sounds/item-locked.wav',
  'insufficient-credits': '/sounds/insufficient-credits.wav',
};

const MUTE_KEY = 'ui_sounds_muted';
/** Namespaced so UI clips can't collide with lesson or game clip ids. */
const clipId = (name: SoundName) => `ui:${name}`;

// Default UI level, matching the gain this module used to apply itself.
const DEFAULT_UI_VOLUME = 0.5;

let registered = false;
let preloadStarted = false;

function ensureRegistered(): void {
  if (registered) return;
  registered = true;
  const clips: Record<string, string> = {};
  for (const [name, url] of Object.entries(SOUND_MAP)) {
    clips[clipId(name as SoundName)] = url;
  }
  audioEngine.registerAudioClips(clips);
  audioEngine.setBusVolume('ui', DEFAULT_UI_VOLUME);
}

/** Check if UI sounds are globally muted. */
export function isUISoundMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === 'true';
}

/** Toggle global mute for UI sounds. */
export function setUISoundMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, String(muted));
}

/**
 * Play a UI sound by name.
 * Safe to call anytime — no-ops if muted or the buffer isn't loaded yet.
 */
export function playSound(name: SoundName): void {
  if (isUISoundMuted()) return;
  ensureRegistered();

  // Warm the whole set on the first interaction, as before.
  if (!preloadStarted) {
    preloadStarted = true;
    void audioEngine.preload({
      clips: Object.keys(SOUND_MAP).map((n) => clipId(n as SoundName)),
    });
  }

  audioEngine.playAudioClip(clipId(name));
}

/** Set the volume for UI sounds (0 to 1). */
export function setUISoundVolume(vol: number): void {
  ensureRegistered();
  audioEngine.setBusVolume('ui', vol);
}
