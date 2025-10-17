import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { usePlaybackContext } from '../PlaybackContext';
import { InputType, PlaybackEvent } from '../helpers';
import { useTotalDuration } from '../useTotalDuration';
import { useParsePlaybackEvents, useParseBPM } from './useParsePlaybackEvents';

type PlaybackState = {
  isPlaying: boolean;
  isPaused: boolean;
  activeEvents: PlaybackEvent[];
  currentPositionIndex: number; // the exact index currently being played (0-15)
  totalDuration: number; // in seconds
  currentPosition: number; // 0 to 1
};

type PlaybackActions = {
  play: (params?: { positionPercent?: number }) => void;
  stop: ({ pause }: { pause?: boolean }) => void;
  seek: (percentage: number) => void;
};

type Playback = PlaybackState & PlaybackActions;

interface PlaybackOptions {
  volume?: number; // Volume as percentage (0-1), where 0.5 is 50%, 0 is muted, 1 is full volume
  bpm?: number;
  beatsPerBar?: number;
  playbackRate?: number;
}

export const usePlayback = (
  input: InputType,
  options: PlaybackOptions = {},
): Playback => {
  // Generate a unique ID for this playback instance
  const instanceId = useRef(uuidv4()).current;

  // Get the playback context
  const playbackContext = usePlaybackContext();

  // Local state for position when not actively playing
  const [localActiveBarIndex, setLocalActiveBarIndex] = useState(0);
  const [localPlaybackPercentPosition, setLocalPlaybackPercentPosition] =
    useState(0);

  // Parse the input into playback events
  const events = useParsePlaybackEvents(input);
  const totalDurationSeconds = useTotalDuration(events);
  const { bpm: calculatedBPM, beatsPerBar: calculatedBeatsPerBar } =
    useParseBPM(input);

  const bpm = options.bpm || calculatedBPM;
  const beatsPerBar = options.beatsPerBar || calculatedBeatsPerBar;

  // Extract options
  const { playbackRate = 1, volume = 0.6 } = options;

  // Check if this instance is the one currently playing
  const isThisInstancePlaying =
    playbackContext.playingInstanceId === instanceId;

  const isThisInstancePaused = playbackContext.pausedInstanceId === instanceId;

  // Calculate current position index based on the current time
  const calculateCurrentActiveBarIndex = useCallback(
    (currentTime: number) => {
      const secondsPerBeat = 60 / bpm;
      const secondsPerBar = beatsPerBar * secondsPerBeat;

      // Calculate relative time within the current bar
      const barIndex = Math.floor(currentTime / secondsPerBar);
      const barStartTime = barIndex * secondsPerBar;
      const relativeTime = currentTime - barStartTime;

      // Calculate position index
      const totalPositions = 16;
      const positionLength = secondsPerBar / totalPositions;
      const positionWithinBar = Math.floor(relativeTime / positionLength);

      // Calculate the continuous active bar index
      return barIndex * totalPositions + positionWithinBar;
    },
    [beatsPerBar, bpm],
  );

  // Update position index when playing
  useEffect(() => {
    if (isThisInstancePlaying && totalDurationSeconds > 0) {
      setLocalActiveBarIndex(
        calculateCurrentActiveBarIndex(
          playbackContext.currentTimePercent * totalDurationSeconds,
        ),
      );
    }
  }, [
    isThisInstancePlaying,
    playbackContext.currentTimePercent,
    totalDurationSeconds,
    calculateCurrentActiveBarIndex,
    instanceId,
  ]);

  const instanceStateRef = useRef({
    isPlaying: isThisInstancePlaying,
    isPaused: isThisInstancePaused,
  });

  instanceStateRef.current.isPlaying = isThisInstancePlaying;
  instanceStateRef.current.isPaused = isThisInstancePaused;

  // Cleanup on unmount - stop playback if this instance is playing
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const { isPlaying, isPaused } = instanceStateRef.current;
      if (isPlaying || isPaused) {
        playbackContext.stop({ pause: false });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop playback
  const stop = useCallback(
    ({ pause = true }: { pause?: boolean } = {}) => {
      playbackContext.stop({ pause });
      // if (isThisInstancePlaying) {
      // }
      // Always reset local position to beginning
      setLocalPlaybackPercentPosition(
        pause ? playbackContext.currentTimePercent : 0,
      );
      setLocalActiveBarIndex(
        pause
          ? calculateCurrentActiveBarIndex(
              playbackContext.currentTimePercent * totalDurationSeconds,
            )
          : 0,
      );
    },
    [playbackContext, totalDurationSeconds, calculateCurrentActiveBarIndex],
  );

  // Play the track
  const play = useCallback(() => {
    // If already playing by this instance, stop it
    if (isThisInstancePlaying) {
      stop({ pause: false });
      return;
    }

    // Start playback through the context
    playbackContext.play(instanceId, events, {
      positionPercent: isThisInstancePaused ? localPlaybackPercentPosition : 0,
      bpm,
      playbackRate,
      volume,
    });
  }, [
    isThisInstancePlaying,
    playbackContext,
    instanceId,
    events,
    isThisInstancePaused,
    localPlaybackPercentPosition,
    bpm,
    playbackRate,
    volume,
    stop,
  ]);

  // Seek to a specific position
  const seek = useCallback(
    (percentage: number) => {
      // Clamp the new percentage position (0-1)
      const seekPercentage = Math.max(0, Math.min(percentage, 1));

      // Store the position locally
      setLocalPlaybackPercentPosition(seekPercentage);

      // If we're the playing instance, also update the context
      if (isThisInstancePlaying || isThisInstancePaused) {
        playbackContext.seek(seekPercentage, instanceId);
      } else {
        // Update position index for non-playing state
        const time = seekPercentage * totalDurationSeconds;
        const newActiveBarIndex = calculateCurrentActiveBarIndex(time);
        setLocalActiveBarIndex(newActiveBarIndex);
      }
    },
    [
      isThisInstancePlaying,
      isThisInstancePaused,
      playbackContext,
      instanceId,
      totalDurationSeconds,
      calculateCurrentActiveBarIndex,
    ],
  );

  return useMemo(
    () => ({
      isPlaying: isThisInstancePlaying,
      isPaused: isThisInstancePaused,
      activeEvents:
        isThisInstancePlaying || isThisInstancePaused
          ? playbackContext.activeEvents
          : [],
      currentPositionIndex: localActiveBarIndex,
      totalDuration: totalDurationSeconds,
      currentPosition: isThisInstancePlaying
        ? playbackContext.currentTimePercent
        : localPlaybackPercentPosition,
      play,
      stop,
      seek,
    }),
    [
      isThisInstancePlaying,
      isThisInstancePaused,
      playbackContext.activeEvents,
      playbackContext.currentTimePercent,
      localActiveBarIndex,
      totalDurationSeconds,
      localPlaybackPercentPosition,
      play,
      stop,
      seek,
    ],
  );
};
