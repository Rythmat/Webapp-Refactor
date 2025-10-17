import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import * as Tone from 'tone';
import { PlaybackEvent } from './helpers';
import { getTotalDuration } from './useTotalDuration';

type PlaybackContextType = {
  playingInstanceId: string | null;
  pausedInstanceId: string | null;
  activeEvents: PlaybackEvent[];
  currentTimePercent: number;
  totalDurationSeconds: number;
  play: (
    instanceId: string,
    events: PlaybackEvent[],
    params?: {
      positionPercent?: number;
      bpm?: number;
      playbackRate?: number;
      volume?: number;
    },
  ) => void;
  seek: (positionPercent: number, instanceId: string) => void;
  stop: ({ pause }: { pause?: boolean }) => void;
};

const PlaybackContext = createContext<PlaybackContextType>({
  playingInstanceId: null,
  pausedInstanceId: null,
  currentTimePercent: 0,
  totalDurationSeconds: 0,
  activeEvents: [],
  play: () => {},
  seek: () => {},
  stop: () => {},
});

export const PlaybackProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [playingInstanceId, setPlayingInstanceId] = useState<string | null>(
    null,
  );
  const [pausedInstanceId, setPausedInstanceId] = useState<string | null>(null);
  const [currentEvents, setCurrentEvents] = useState<PlaybackEvent[]>([]);
  const [currentTimePercent, setCurrentTimePercent] = useState(0);
  const [activeEvents, setActiveEvents] = useState<PlaybackEvent[]>([]);
  const [pausedEvents, setPausedEvents] = useState<PlaybackEvent[] | null>(
    null,
  );

  // Refs for Tone.js objects
  const synth = useRef<Tone.PolySynth | null>(null);
  const part = useRef<Tone.Part | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize or get the synth
  const getSynth = useCallback(() => {
    if (synth.current) {
      return synth.current;
    }

    // Initialize Tone.js synth
    synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
    return synth.current;
  }, []);

  // Dispose of synth when the component unmounts
  useEffect(() => {
    return () => {
      if (synth.current) {
        synth.current.dispose();
        synth.current = null;
      }
    };
  }, []);

  // Centralized function to cancel animation frames
  const cancelAnimationFrame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      try {
        window.cancelAnimationFrame(animationFrameRef.current);
      } catch (error) {
        console.error('Error canceling animation frame:', error);
      } finally {
        animationFrameRef.current = null;
      }
    }
  }, []);

  // Clear all scheduled events and reset the transport
  const clearTransport = useCallback(() => {
    const transport = Tone.getTransport();

    // Cancel all events and stop the transport
    transport.cancel();
    transport.stop();
  }, []);

  // Stop playback
  const stop = useCallback(
    ({ pause = true }: { pause?: boolean } = {}) => {
      if (pause) {
        Tone.getTransport().pause();
        setPausedEvents(activeEvents);
        setPlayingInstanceId(null);
        setPausedInstanceId(playingInstanceId);
        return;
      }

      // Cancel animation frame
      cancelAnimationFrame();

      // Clear transport and scheduled events
      clearTransport();

      // Clear part if it exists
      if (part.current) {
        try {
          part.current.stop();
          part.current.dispose();
          part.current = null;
        } catch (err) {
          console.error('Error stopping part:', err);
        }
      }

      // Reset state
      setPlayingInstanceId(null);
      setPausedInstanceId(null);
      setCurrentTimePercent(0);
      setPausedEvents(null);
      setActiveEvents([]);
      setCurrentEvents([]);
    },
    [activeEvents, cancelAnimationFrame, clearTransport, playingInstanceId],
  );

  // Update time display during playback
  useEffect(() => {
    if (!playingInstanceId) {
      setCurrentTimePercent(0);
      return;
    }

    const updateTime = () => {
      const totalDurationSeconds = getTotalDuration(currentEvents);

      if (Tone.getTransport().state === 'started' && !part.current?.mute) {
        const newTime = Tone.getTransport().seconds;

        if (totalDurationSeconds > 0) {
          setCurrentTimePercent(newTime / totalDurationSeconds);
          animationFrameRef.current = window.requestAnimationFrame(updateTime);
        }
      } else if (Tone.getTransport().state !== 'started') {
        // Transport has stopped, clean up
        stop({ pause: false });
      }
    };

    // Cancel any existing animation frame before starting a new one
    cancelAnimationFrame();
    animationFrameRef.current = window.requestAnimationFrame(updateTime);

    return cancelAnimationFrame;
  }, [playingInstanceId, cancelAnimationFrame, stop, currentEvents]);

  // Play the provided events
  const play = useCallback(
    async (
      instanceId: string,
      events: PlaybackEvent[],
      params?: {
        positionPercent?: number;
        bpm?: number;
        playbackRate?: number;
        volume?: number;
      },
    ) => {
      // If another instance is playing, stop it first
      if (playingInstanceId && playingInstanceId !== instanceId) {
        stop({ pause: false });
      }

      // Check if the transport is paused for this instance, and if so, simply resume it
      if (
        pausedInstanceId === instanceId &&
        Array.isArray(pausedEvents) &&
        currentTimePercent < 1
      ) {
        Tone.getTransport().start();
        setPlayingInstanceId(instanceId);
        setPausedEvents(null);
        setPausedInstanceId(null);
        return;
      }

      // Apply parameters
      const positionPercent = params?.positionPercent || 0;
      const newBpm = params?.bpm || 120;
      const newPlaybackRate = params?.playbackRate || 1;
      const volume = params?.volume !== undefined ? params.volume : 1;

      // Set state
      setPlayingInstanceId(instanceId);
      setPausedInstanceId(null);
      setPausedEvents(null);
      setCurrentTimePercent(positionPercent);
      setActiveEvents([]);
      setCurrentEvents(events);

      const transport = Tone.getTransport();

      try {
        // Start audio context if it's not started yet
        if (transport.context.state !== 'running') {
          await Tone.start();
        }

        // Set the BPM
        transport.bpm.value = newBpm;

        // Set the volume on the synth
        const synth = getSynth();
        // Convert volume from 0-1 range to Tone.js volume in decibels
        // 0 (silent) maps to -Infinity dB, 1 (full) maps to 0 dB
        synth.volume.value = volume === 0 ? -Infinity : 20 * Math.log10(volume);

        // Store playback rate in state but don't try to set it on transport
        // as it's not directly supported in Tone.js Transport

        // Clear any existing transport state
        clearTransport();

        // Create a new part if needed
        if (part.current) {
          try {
            part.current.stop();
            part.current.dispose();
            part.current = null;
          } catch (err) {
            console.error('Error stopping part:', err);
          }
        }

        part.current = new Tone.Part((time, event) => {
          const synth = getSynth();

          // Add the event to active events
          setActiveEvents((prev) => [...prev, event]);

          // Only trigger sound for note events, not for rests
          if (event.type === 'note') {
            synth.triggerAttackRelease(
              Tone.Frequency(event.midi, 'midi').toNote(),
              event.duration,
              time,
              event.velocity,
            );
          }

          // Remove event from active events after duration
          const timeoutId = setTimeout(() => {
            setActiveEvents((prev) => prev.filter(({ id }) => id !== event.id));
          }, event.duration * 1000);

          // Store the timeout ID to clear it if needed
          return () => clearTimeout(timeoutId);
        }, events);

        // Set transport time to starting position
        transport.seconds = positionPercent * getTotalDuration(events);

        // Start the part at the current position
        part.current.playbackRate = newPlaybackRate;
        part.current.start(0, positionPercent * getTotalDuration(events));

        // Start the transport
        transport.start();

        // schedule the stop event

        const totalDurationSeconds = getTotalDuration(events);
        transport.scheduleOnce(() => {
          stop({ pause: false });
        }, totalDurationSeconds);
      } catch (err) {
        console.error('Failed to play track:', err);
        stop({ pause: false });
      }
    },
    [
      playingInstanceId,
      pausedInstanceId,
      pausedEvents,
      currentTimePercent,
      stop,
      getSynth,
      clearTransport,
    ],
  );

  // Seek to a specific position
  const seek = useCallback(
    (position: number, instanceId: string) => {
      setCurrentTimePercent(position);

      if (instanceId === playingInstanceId || instanceId === pausedInstanceId) {
        // Update transport position
        Tone.getTransport().seconds =
          position * getTotalDuration(currentEvents);
      }
    },
    [playingInstanceId, pausedInstanceId, currentEvents],
  );

  const value = useMemo(
    () => ({
      playingInstanceId,
      pausedInstanceId,
      currentTimePercent,
      totalDurationSeconds: getTotalDuration(currentEvents),
      activeEvents: pausedEvents ? pausedEvents : activeEvents,
      play,
      seek,
      stop,
    }),
    [
      activeEvents,
      currentEvents,
      currentTimePercent,
      pausedEvents,
      play,
      playingInstanceId,
      pausedInstanceId,
      seek,
      stop,
    ],
  );

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
};

export const usePlaybackContext = () => {
  return useContext(PlaybackContext);
};
