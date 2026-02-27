import { useEffect, useRef, useCallback } from 'react';
import { type ContourAnalysis, getContourAtTime } from '@/studio-daw/audio/contour-analysis';
import { type VolumeFollowMode } from '@/studio-daw/hooks/use-audio-engine';

interface ContourFollowingOptions {
  contour: ContourAnalysis | null;
  targetGainNodes: GainNode[];
  isPlaying: boolean;
  getCurrentTime: () => number;
  enabled: boolean;
  mode: VolumeFollowMode;
  influenceStrength: number;
  baseVolumes: number[];  // Original volume levels for each target
}

/**
 * Hook for real-time volume automation based on contour analysis.
 *
 * In 'duck' mode: Music gets quieter when speech is loud
 * In 'swell' mode: Music gets louder when speech is emphatic
 *
 * @param options Configuration options for contour following
 */
export function useContourFollowing(options: ContourFollowingOptions) {
  const {
    contour,
    targetGainNodes,
    isPlaying,
    getCurrentTime,
    enabled,
    mode,
    influenceStrength,
    baseVolumes,
  } = options;

  const animFrameRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);

  const updateGains = useCallback(() => {
    if (!contour || !enabled || targetGainNodes.length === 0) {
      return;
    }

    const currentTime = getCurrentTime();

    // Throttle updates to ~30fps for efficiency
    if (currentTime - lastUpdateTimeRef.current < 0.033) {
      animFrameRef.current = requestAnimationFrame(updateGains);
      return;
    }
    lastUpdateTimeRef.current = currentTime;

    // Get contour values at current time
    const { amplitude, speechLikelihood } = getContourAtTime(contour, currentTime);

    // Calculate gain multiplier based on mode
    let gainMultiplier: number;

    if (mode === 'duck') {
      // Duck mode: Higher amplitude/speech = lower music volume
      // When amplitude is 1.0 (loud speech), music should be quieter
      // When amplitude is 0.0 (silence), music can be at full volume
      const duckFactor = 1 - (amplitude * influenceStrength * 0.6);
      // Additional ducking when speech is detected
      const speechDuck = speechLikelihood > 0.5 ? (1 - influenceStrength * 0.3) : 1;
      gainMultiplier = Math.max(0.2, duckFactor * speechDuck);
    } else {
      // Swell mode: Higher amplitude = higher music volume
      // Music follows the emotional intensity of the speech
      const swellFactor = 0.4 + (amplitude * influenceStrength * 0.6);
      gainMultiplier = Math.min(1.2, swellFactor);
    }

    // Apply to all target gain nodes
    targetGainNodes.forEach((gainNode, index) => {
      if (!gainNode || !gainNode.context) return;

      const ctx = gainNode.context as AudioContext;
      const baseVolume = baseVolumes[index] ?? 1.0;
      const targetGain = baseVolume * gainMultiplier;

      // Smooth transition to prevent clicks
      try {
        gainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.1);
      } catch (e) {
        // Ignore if context is closed
      }
    });

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateGains);
    }
  }, [contour, targetGainNodes, getCurrentTime, enabled, mode, influenceStrength, baseVolumes, isPlaying]);

  // Start/stop the animation loop based on playback state
  useEffect(() => {
    if (isPlaying && enabled && contour) {
      animFrameRef.current = requestAnimationFrame(updateGains);
    } else {
      cancelAnimationFrame(animFrameRef.current);

      // Reset gains to base volumes when disabled
      if (!enabled) {
        targetGainNodes.forEach((gainNode, index) => {
          if (!gainNode || !gainNode.context) return;
          const ctx = gainNode.context as AudioContext;
          const baseVolume = baseVolumes[index] ?? 1.0;
          try {
            gainNode.gain.setTargetAtTime(baseVolume, ctx.currentTime, 0.1);
          } catch (e) {
            // Ignore if context is closed
          }
        });
      }
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, enabled, contour, updateGains, targetGainNodes, baseVolumes]);
}

/**
 * Simplified hook that takes a single reference track and returns the current
 * contour-based gain multiplier. Useful for visualizations.
 */
export function useContourGainValue(
  contour: ContourAnalysis | null,
  currentTime: number,
  mode: VolumeFollowMode,
  influenceStrength: number
): number {
  if (!contour) return 1.0;

  const { amplitude, speechLikelihood } = getContourAtTime(contour, currentTime);

  if (mode === 'duck') {
    const duckFactor = 1 - (amplitude * influenceStrength * 0.6);
    const speechDuck = speechLikelihood > 0.5 ? (1 - influenceStrength * 0.3) : 1;
    return Math.max(0.2, duckFactor * speechDuck);
  } else {
    const swellFactor = 0.4 + (amplitude * influenceStrength * 0.6);
    return Math.min(1.2, swellFactor);
  }
}

export default useContourFollowing;
