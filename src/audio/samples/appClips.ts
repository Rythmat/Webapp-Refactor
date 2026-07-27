// ── App clip registry ────────────────────────────────────────────────────────
// Stable ids for the application's fixed audio clips. Features play these by
// name and never handle paths, so a file can be renamed, re-encoded or moved
// behind a CDN in exactly one place.
//
// Lesson-specific and game-specific clips should register their own maps next
// to the feature that owns them, using the same pattern.

import { audioEngine } from '../AudioEngine';

/** Vite serves the app under BASE_URL; clip paths must respect it. */
function assetUrl(path: string): string {
  const raw = import.meta.env.BASE_URL ?? '/';
  const base = raw === '/' ? '' : raw.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const APP_CLIPS = {
  welcome: 'app:welcome',
  accepted: 'app:accepted',
  completion: 'app:completion',
  rejected: 'app:rejected',
} as const;

audioEngine.registerAudioClips({
  [APP_CLIPS.welcome]: assetUrl('/welcome.mp3'),
  [APP_CLIPS.accepted]: assetUrl('/accepted.wav'),
  [APP_CLIPS.completion]: assetUrl('/completion.wav'),
  [APP_CLIPS.rejected]: assetUrl('/rejected.wav'),
});
