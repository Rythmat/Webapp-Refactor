import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useMusicAtlas, Notes } from '@/contexts/MusicAtlasContext';

export const useNotes = () => {
  const musicAtlas = useMusicAtlas();

  return useQuery({
    queryKey: ['notes'],
    queryFn: () => musicAtlas.notes.getNotes(),
  });
};

export type Note = Notes.GetNotes.ResponseBody[number];

export const useNoteByMidiMap = () => {
  const { data, isLoading, error } = useNotes();

  const noteByMidiMap = useMemo(() => {
    if (!data) {
      return new Map<number, Note>();
    }

    return new Map(data?.map((note) => [note.midi, note]));
  }, [data]);

  return useMemo(
    () => ({
      data: noteByMidiMap,
      isLoading,
      error,
    }),
    [noteByMidiMap, isLoading, error],
  );
};
