/**
 * UI Sound Engine — lightweight Web Audio API singleton for UI feedback sounds.
 *
 * Lazy-initializes AudioContext on first play (respects browser autoplay policy).
 * Pre-fetches and caches decoded AudioBuffers for instant playback.
 * Respects a global mute setting persisted in localStorage.
 */

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

let ctx: AudioContext | null = null;
let gainNode: GainNode | null = null;
const bufferCache = new Map<SoundName, AudioBuffer>();
let preloaded = false;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    gainNode = ctx.createGain();
    gainNode.gain.value = 0.5; // default UI sound volume
    gainNode.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

async function preload(): Promise<void> {
  if (preloaded) return;
  preloaded = true;
  const audioCtx = getContext();

  const entries = Object.entries(SOUND_MAP) as [SoundName, string][];
  await Promise.all(
    entries.map(async ([name, url]) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        bufferCache.set(name, audioBuffer);
      } catch {
        // Silently skip failed loads — UI sounds are non-critical
      }
    }),
  );
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
 * Safe to call anytime — will no-op if muted, context unavailable, or buffer not loaded.
 */
export function playSound(name: SoundName): void {
  if (isUISoundMuted()) return;

  const audioCtx = getContext();

  // Trigger preload on first interaction
  if (!preloaded) {
    preload();
  }

  const buffer = bufferCache.get(name);
  if (!buffer || !gainNode) return;

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(gainNode);
  source.start(0);
}

/**
 * Set the volume for UI sounds (0 to 1).
 */
export function setUISoundVolume(vol: number): void {
  if (gainNode) {
    gainNode.gain.value = Math.max(0, Math.min(1, vol));
  }
}
