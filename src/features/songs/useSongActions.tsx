import { useCallback, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { showError } from '@/components/utils/toast';
import { AtlasRoutes, LearnRoutes, StudioRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import type { Song, SongMode } from '@/curriculum/types/songLibrary';
import { useUISound } from '@/hooks/useUISound';
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
  /**
   * Render this alongside the buttons. Always null now: opening a song keeps
   * the session it replaces instead of asking first (owner decision 6). Goes
   * with its callers when milestone 1.4's openSession takes over this flow.
   */
  studioPrompt: ReactNode;
}

export function useSongActions(song: Song): SongActions {
  const navigate = useNavigate();
  const { play } = useUISound();
  const isSaved = useSavedSongsStore((s) => Boolean(s.savedIds[song.id]));
  const toggleSavedInStore = useSavedSongsStore((s) => s.toggleSaved);
  const { userId } = useAuthContext();

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

  // A song opens in a fresh session, exactly as the `?song=` boot param does in
  // DawApp. Seeding on top of whatever was last open stacked this song's chords
  // track on the previous one and left its rests and row breaks over this chart.
  // The session it replaces is kept first, with a Restore, instead of asking
  // (owner decision 6).
  //
  // The Studio's session and persistence code loads on this click, not with
  // the Song pages: a static import put it on every route's start-up graph.
  const goToStudio = useCallback(async () => {
    let studio: [
      typeof import('@/lib/studio-projects/localSession'),
      typeof import('./seedStudioFromSong'),
    ];
    try {
      studio = await Promise.all([
        import('@/lib/studio-projects/localSession'),
        import('./seedStudioFromSong'),
      ]);
    } catch {
      showError('That song could not be opened in the Studio.');
      return;
    }
    const [{ announceKeptWork, replaceSession }, { seedStudioFromSong }] =
      studio;
    const result = await replaceSession(
      userId,
      () => seedStudioFromSong(song),
      {
        reopenable: true,
      },
    );
    if (result.status === 'refused') {
      showError(
        "Your current work couldn't be set aside on this device, so it's still open. Save it, then try again.",
      );
      return;
    }
    if (result.status === 'failed') {
      showError('That song could not be opened in the Studio.');
      return;
    }
    // `/studio` is now the Studio Dashboard; the DAW editor lives at
    // `/studio/editor`. `seeded=1` tells its boot the store is already loaded:
    // without it the boot falls through to crash-recovery restore and puts the
    // last autosaved session over the song we just seeded.
    //
    // The song is not handed over as `?song=<id>` — `song` here may carry the
    // reader's transposition, and re-seeding from the id would open the
    // original key instead of the one on the screen.
    navigate(`${StudioRoutes.editor.definition}?seeded=1`);
    if (result.kept) announceKeptWork(result.kept, userId);
    if (result.also) announceKeptWork(result.also, userId);
  }, [navigate, song, userId]);

  const openInStudio = useCallback<SongActions['openInStudio']>(
    (e) => {
      stopAndPrevent(e);
      play('select');
      void goToStudio();
    },
    [goToStudio, play],
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
    studioPrompt: null,
  };
}
