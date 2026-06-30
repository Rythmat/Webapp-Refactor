import { useCallback, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LearnRoutes, StudioRoutes } from '@/constants/routes';
import {
  chordRegionsToMidiClip,
  exportSongToChordRegions,
} from '@/curriculum/songLibrary/exportToStudio';
import type { Song, SongMode } from '@/curriculum/types/songLibrary';
import { useStore } from '@/daw/store';
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
      const { regions, restMap, fermatas, rowSizes } = exportSongToChordRegions(
        song,
        { voicingMode: 'auto', bassLine: false },
      );
      const store = useStore.getState();
      store.setProjectName(song.title);
      store.setComposerName(song.artist);
      store.setRootNote(song.keyRoot % 12);
      store.setMode(song.mode === 'major' ? 'ionian' : song.mode);
      store.setBpm(song.tempo);
      store.setChordRegions(regions);
      if (rowSizes) store.setMeasureRowSizes(rowSizes);
      if (restMap && Object.keys(restMap).length > 0)
        store.setMeasureRestMap(restMap);
      if (fermatas && fermatas.length > 0) store.setMeasureFermatas(fermatas);
      const clip = chordRegionsToMidiClip(regions);
      if (clip) {
        const trackId = store.addTrack(
          'midi',
          'piano-sampler',
          `${song.title} — Chords`,
        );
        store.addMidiClip(trackId, clip);
        store.setLoopRange(0, clip.durationTicks ?? 7680);
      }
      store.setCurrentView('arrange');
      navigate(StudioRoutes.root.definition);
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
