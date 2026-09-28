import { useCallback, useState, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtlasRoutes, LearnRoutes, StudioRoutes } from '@/constants/routes';
import type { Song, SongMode } from '@/curriculum/types/songLibrary';
import { ConfirmModal } from '@/daw/components/common/ConfirmModal';
import { resetSessionToEmpty } from '@/daw/persistence/SessionSerializer';
import { useUISound } from '@/hooks/useUISound';
import {
  clearLocalSession,
  unsavedStudioSession,
} from '@/lib/studio-projects/localSession';
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
  /**
   * Render this alongside the buttons. It is the prompt `openInStudio` raises
   * when there is an unsaved Studio session to lose, and nothing at all the
   * rest of the time.
   */
  studioPrompt: ReactNode;
}

export function useSongActions(song: Song): SongActions {
  const navigate = useNavigate();
  const { play } = useUISound();
  const isSaved = useSavedSongsStore((s) => Boolean(s.savedIds[song.id]));
  const toggleSavedInStore = useSavedSongsStore((s) => s.toggleSaved);
  // The session the prompt is about, held while the prompt is up.
  const [sessionAtRisk, setSessionAtRisk] = useState<string | null>(null);

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
  const goToStudio = useCallback(() => {
    clearLocalSession();
    resetSessionToEmpty();
    seedStudioFromSong(song);
    // `/studio` is now the Studio Dashboard; the DAW editor lives at
    // `/studio/editor`. `seeded=1` tells its boot the store is already loaded:
    // without it the boot falls through to crash-recovery restore and puts the
    // last autosaved session over the song we just seeded.
    //
    // The song is not handed over as `?song=<id>` — `song` here may carry the
    // reader's transposition, and re-seeding from the id would open the
    // original key instead of the one on the screen.
    navigate(`${StudioRoutes.editor.definition}?seeded=1`);
  }, [navigate, song]);

  const openInStudio = useCallback<SongActions['openInStudio']>(
    (e) => {
      stopAndPrevent(e);
      play('select');
      // Starting fresh is what discards the session in progress, so ask first
      // and leave the player where they are if they would rather go and save
      // it. Only ever asked when they have work in there: an empty Studio, or
      // one holding nothing but a song they opened and didn't touch, goes
      // straight through.
      const atRisk = unsavedStudioSession();
      if (atRisk) setSessionAtRisk(atRisk);
      else goToStudio();
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

  const studioPrompt = (
    <ConfirmModal
      open={sessionAtRisk !== null}
      onOpenChange={(open) => {
        if (!open) setSessionAtRisk(null);
      }}
      title={`Open ${song.title} in the Studio?`}
      description={`Your Studio session “${sessionAtRisk ?? ''}” closes when a song opens, and anything you haven't saved in it will be lost. Cancel if you'd like to go back and save it first.`}
      confirmLabel="Open song"
      cancelLabel="Cancel"
      destructive
      onConfirm={goToStudio}
    />
  );

  return {
    openInLesson,
    openInStudio,
    openInGlobe,
    toggleSaved,
    isSaved,
    studioPrompt,
  };
}
