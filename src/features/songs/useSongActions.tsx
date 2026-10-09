import { useCallback, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtlasRoutes } from '@/constants/routes';
import type { Song } from '@/curriculum/types/songLibrary';
import { useLearnInstrument } from '@/features/learn/useInstrumentStore';
import { useUISound } from '@/hooks/useUISound';
import { songGuitarLessonRoute, songLessonRoute } from './songLessonRoute';
import { studioSongUrl } from './studioSongUrl';
import { useSavedSongsStore } from './useSavedSongsStore';

type IconClickEvent = MouseEvent<HTMLElement> | undefined;

function stopAndPrevent(e: IconClickEvent) {
  e?.preventDefault();
  e?.stopPropagation();
}

export interface SongActions {
  openInLesson: (e?: MouseEvent<HTMLElement>) => void;
  openInStudio: (e?: MouseEvent<HTMLElement>) => void;
  openInGlobe: (e?: MouseEvent<HTMLElement>) => void;
  toggleSaved: (e?: MouseEvent<HTMLElement>) => void;
  isSaved: boolean;
}

export interface SongActionsOptions {
  /**
   * The Song page's transposition in semitones (−11..11), carried into the
   * Studio link so the editor opens the key on the screen. Song cards and
   * rows show the song as written and pass nothing.
   */
  transpose?: number;
}

export function useSongActions(
  song: Song,
  opts: SongActionsOptions = {},
): SongActions {
  const navigate = useNavigate();
  const { play } = useUISound();
  const isSaved = useSavedSongsStore((s) => Boolean(s.savedIds[song.id]));
  const toggleSavedInStore = useSavedSongsStore((s) => s.toggleSaved);
  const onGuitar = useLearnInstrument() === 'guitar';

  const openInLesson = useCallback<SongActions['openInLesson']>(
    (e) => {
      stopAndPrevent(e);
      play('click');
      // The lesson on the student's instrument, in the song's key.
      navigate(onGuitar ? songGuitarLessonRoute(song) : songLessonRoute(song));
    },
    [navigate, play, onGuitar, song],
  );

  // The editor opens the song itself (openSession's 'song' intent): it keeps
  // the work it replaces, with a Restore, and seeds the chart in a new
  // project. The Song page's transposition rides along as `transpose`, which
  // the editor rebuilds exactly (transposeSong is deterministic by song and
  // offset), so the Studio opens the key on the screen.
  const transpose = opts.transpose ?? 0;
  const openInStudio = useCallback<SongActions['openInStudio']>(
    (e) => {
      stopAndPrevent(e);
      play('select');
      navigate(studioSongUrl(song.id, transpose));
    },
    [navigate, play, song.id, transpose],
  );

  const openInGlobe = useCallback<SongActions['openInGlobe']>(
    (e) => {
      stopAndPrevent(e);
      play('click');
      // `/atlas` is the Globe Dashboard and ignores `?event=`; the full globe
      // lives at `/atlas/globe` and is what consumes the param and flies to
      // the pin. Hardcoding `/atlas` here is what made this open the
      // dashboard instead of the song — see songDeepLinks.songGlobeRoute,
      // which was extracted from this function and got it right.
      navigate(`${AtlasRoutes.globe()}?event=song-${song.id}`);
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

  return {
    openInLesson,
    openInStudio,
    openInGlobe,
    toggleSaved,
    isSaved,
  };
}
