/**
 * React hook for managing synth tracks — preset changes and note updates.
 * Debounces re-renders for rapid knob changes.
 */

import { useCallback, useRef } from 'react';
import type { Track } from './use-audio-engine';
import {
  renderSynthToAudioBuffer,
  type SynthPreset,
  type SynthClipData,
} from '@/studio-daw/audio/synth-engine';
import type { MidiNote } from '@/studio-daw/audio/midi-engine';

interface UseSynthEngineOptions {
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
}

export const useSynthEngine = ({ setTracks }: UseSynthEngineOptions) => {
  const renderTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /** Re-render a synth clip's audio buffer from its synthData */
  const renderAndUpdateClip = useCallback(async (
    trackId: string,
    clipId: string,
    synthData: SynthClipData,
  ) => {
    try {
      const buffer = await renderSynthToAudioBuffer(
        synthData.preset,
        synthData.notes,
        synthData.totalDuration,
      );

      setTracks(prev => prev.map(track => {
        if (track.id !== trackId) return track;
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip;
            return {
              ...clip,
              synthData,
              buffer,
              duration: synthData.totalDuration,
            };
          }),
        };
      }));
    } catch (err) {
      console.error('[SynthEngine] Failed to render synth:', err);
    }
  }, [setTracks]);

  /** Debounced re-render (300ms) for rapid parameter changes */
  const debouncedRender = useCallback((
    trackId: string,
    clipId: string,
    synthData: SynthClipData,
  ) => {
    const key = `${trackId}_${clipId}`;
    const existing = renderTimeoutRef.current.get(key);
    if (existing) clearTimeout(existing);

    // Update synthData immediately (so UI reflects changes)
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      return {
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id !== clipId) return clip;
          return { ...clip, synthData };
        }),
      };
    }));

    // Debounce the actual audio re-render
    const timeout = setTimeout(() => {
      renderTimeoutRef.current.delete(key);
      renderAndUpdateClip(trackId, clipId, synthData);
    }, 300);
    renderTimeoutRef.current.set(key, timeout);
  }, [setTracks, renderAndUpdateClip]);

  /** Update the preset for a synth track's clip */
  const updateSynthPreset = useCallback((
    trackId: string,
    clipId: string,
    newPreset: SynthPreset,
  ) => {
    // Find the current clip to get its notes
    setTracks(prev => {
      const track = prev.find(t => t.id === trackId);
      const clip = track?.clips.find(c => c.id === clipId);
      if (!clip?.synthData) return prev;

      const synthData: SynthClipData = {
        ...clip.synthData,
        preset: newPreset,
      };

      // Trigger debounced render outside of setState
      setTimeout(() => debouncedRender(trackId, clipId, synthData), 0);
      return prev;
    });
  }, [setTracks, debouncedRender]);

  /** Update the notes for a synth track's clip (from piano roll) */
  const updateSynthNotes = useCallback(async (
    trackId: string,
    clipId: string,
    notes: MidiNote[],
    totalDuration: number,
  ) => {
    // Find current clip preset
    let synthData: SynthClipData | null = null;

    setTracks(prev => {
      const track = prev.find(t => t.id === trackId);
      const clip = track?.clips.find(c => c.id === clipId);
      if (!clip?.synthData) return prev;

      synthData = {
        preset: clip.synthData.preset,
        notes,
        totalDuration,
      };

      return prev;
    });

    if (synthData) {
      await renderAndUpdateClip(trackId, clipId, synthData);
    }
  }, [setTracks, renderAndUpdateClip]);

  return {
    updateSynthPreset,
    updateSynthNotes,
    renderAndUpdateClip,
  };
};
