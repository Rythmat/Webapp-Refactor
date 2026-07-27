import { useContext, useEffect } from 'react';
import type { AudioEngine } from '../AudioEngine';
import { AudioEngineContext } from './AudioEngineProvider';

/**
 * The application's audio engine. Prefer this over importing the singleton
 * directly in components: it keeps pages honest about being *clients* of the
 * engine, and leaves the door open to injecting a stub in tests.
 */
export function useAudioEngine(): AudioEngine {
  return useContext(AudioEngineContext);
}

/**
 * Warm clips as a page mounts, in parallel with its first render, so its
 * interactive surface is never ahead of its audio.
 */
export function useAudioClipPreload(clipIds: readonly string[]): void {
  const engine = useAudioEngine();
  // Depend on contents, not array identity, so an inline literal at the call
  // site doesn't restart the load every render.
  const key = clipIds.join(',');
  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length) void engine.preload({ clips: ids });
  }, [engine, key]);
}
