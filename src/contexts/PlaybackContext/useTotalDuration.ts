import { useMemo } from 'react';
import { PlaybackEvent } from './helpers';

/**
 * Returns the total duration of the events
 * @param events - The events to calculate the duration of
 * @returns The total duration of the events in seconds
 */
export const useTotalDuration = (events: PlaybackEvent[]): number => {
  return useMemo(() => {
    // Find first event by time
    const firstEvent = Math.min(...events.map((event) => event.time));
    // Find last event by time
    const lastEvent = Math.max(
      ...events.map((event) => event.time + event.duration),
    );
    // Return the duration
    return lastEvent - firstEvent + firstEvent;
  }, [events]);
};

export const getTotalDuration = (events: PlaybackEvent[]): number => {
  // Find first event by time
  const firstEvent = Math.min(...events.map((event) => event.time));
  // Find last event by time
  const lastEvent = Math.max(
    ...events.map((event) => event.time + event.duration),
  );

  return lastEvent - firstEvent;
};
