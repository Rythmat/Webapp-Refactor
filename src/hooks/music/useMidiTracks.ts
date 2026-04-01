import { Midi } from '@tonejs/midi';
import { useMemo } from 'react';
import { useMidi } from './useMidi';

export function useMidiTracks(input: File | Midi) {
  const isMidiInput = input instanceof Midi;

  const { data, isLoading, error } = useMidi(isMidiInput ? null : input);

  const tracks = useMemo(() => {
    if (isMidiInput) {
      return input.tracks;
    }

    return data?.tracks || [];
  }, [data, input, isMidiInput]);

  return useMemo(
    () => ({
      tracks,
      isLoading: isMidiInput ? false : isLoading,
      error: isMidiInput ? null : error,
    }),
    [tracks, isLoading, error, isMidiInput],
  );
}
