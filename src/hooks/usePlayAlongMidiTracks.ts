import { useQuery } from '@tanstack/react-query';
import { Midi } from '@tonejs/midi';
import { capitalize } from 'lodash';
import { useMemo, useState } from 'react';
import { usePlayAlong } from './data';

type ParsedMidiTrack = {
  id: string;
  name: string;
  sourceId: string;
  sourceName: string;
  track: Midi['tracks'][number];
  beatsPerMinute: number;
};

export const usePlayAlongMidiTracks = (
  id: string,
  filterFunction?: (track: ParsedMidiTrack) => boolean,
) => {
  const playAlong = usePlayAlong({ id });

  // Load and parse MIDI file

  const { data: midi, ...rest } = useQuery({
    queryKey: ['midi', id],
    queryFn: async () => {
      const res = await fetch(playAlong.data?.midiFilePath || '');
      const arrayBuffer = await res.arrayBuffer();
      const midi = new Midi(arrayBuffer);

      if (!playAlong.data) {
        return [];
      }

      return midi.tracks
        .filter((track) => track.notes.length > 0)
        .map(
          (track, index) =>
            ({
              id: `${playAlong.data.id}-track-${index}`,
              name: track.instrument.name
                ? track.instrument.name.split(' ').map(capitalize).join(' ')
                : `Track ${index + 1}`,
              sourceId: playAlong.data?.id || '',
              sourceName: playAlong.data?.name || 'MIDI Track',
              track: track,
              beatsPerMinute: playAlong.data?.midiBeatsPerMinute || 120,
            }) satisfies ParsedMidiTrack,
        )
        .filter(filterFunction || (() => true));
    },
    enabled: !!playAlong.data?.midiFilePath,
  });

  const initialSelectedTrack = useMemo(() => {
    return midi?.[0];
  }, [midi]);

  const [selectedTrack, setSelectedTrack] = useState<ParsedMidiTrack | null>(
    null,
  );

  return {
    tracks: midi,
    selectedTrack: selectedTrack || initialSelectedTrack || null,
    setSelectedTrack,
    ...rest,
  };
};
