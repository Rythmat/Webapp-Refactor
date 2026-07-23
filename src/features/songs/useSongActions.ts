import { useCallback, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LearnRoutes, StudioRoutes } from '@/constants/routes';
import type { Song, SongMode } from '@/curriculum/types/songLibrary';
import { useUISound } from '@/hooks/useUISound';
import { seedStudioFromSong } from './seedStudioFromSong';
import { useSavedSongsStore } from './useSavedSongsStore';

type IconClickEvent = MouseEvent<HTMLElement> | undefined;

function stopAndPrevent(e: IconClickEvent) {
  e?.preventDefault();
  e?.stopPropagation();
}

function normalizeLessonMode(mode: SongMode): string {
  if (mode === 'major') return 'ionian';
  if (mode === 'minor') return 'aeolian';
  return mode;
}

export interface SongActions {
  openInLesson: (e?: MouseEvent<HTMLElement>) => void;
  openInStudio: (e?: MouseEvent<HTMLElement>) => void;
  openInGlobe: (e?: MouseEvent<HTMLElement>) => void;
  toggleSaved: (e?: MouseEvent<HTMLElement>) => void;
  isSaved: boolean;
}

export function useSongActions(song: Song): SongActions {
  const navigate = useNavigate();
  const { play } = useUISound();
  const isSaved = useSavedSongsStore((s) => Boolean(s.savedIds[song.id]));
  const toggleSavedInStore = useSavedSongsStore((s) => s.toggleSaved);

  const openInLesson = useCallback<SongActions['openInLesson']>(
    (e) => {
      stopAndPrevent(e);
      play('click');
      navigate(
        LearnRoutes.lesson({
          mode: normalizeLessonMode(song.mode),
          key: song.key,
        }),
      );
    },
    [navigate, play, song.mode, song.key],
  );

  const openInStudio = useCallback<SongActions['openInStudio']>(
    (e) => {
      stopAndPrevent(e);
      play('select');
      seedStudioFromSong(song);
      // `/studio` is now the Studio Dashboard; the DAW editor lives at
      // `/studio/editor`. This opens the editor with the chords just seeded above.
      navigate(StudioRoutes.editor.definition);
    },
    [navigate, play, song],
  );

  const openInGlobe = useCallback<SongActions['openInGlobe']>(
    (e) => {
      stopAndPrevent(e);
      play('click');
      navigate(`/atlas?event=song-${song.id}`);
    },
    [navigate, play, song.id],
  );

  const toggleSaved = useCallback<SongActions['toggleSaved']>(
    (e) => {
      stopAndPrevent(e);
      play('click');
      toggleSavedInStore(song.id);
    },
    [toggleSavedInStore, play, song.id],
  );

  return { openInLesson, openInStudio, openInGlobe, toggleSaved, isSaved };
}
