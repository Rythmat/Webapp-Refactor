import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  GenreLevelProfile,
  GenreProfile,
} from '@/curriculum/types/genreProfile';
import { LessonKeyboard } from '@/learn/components/LessonKeyboard';
import type { ActivitySectionId } from '../../types/activity';
import { AboutPanel } from './AboutPanel';
import { TechniquePanel } from './TechniquePanel';
import { TheoryPanel } from './TheoryPanel';
import {
  levelScales,
  midisToEvents,
  playScaleAscending,
  SCALE_STEP_MS,
  scaleColor,
  scaleMidis,
} from './genreOverviewShared';

// ── A genre lesson's Overview ──────────────────────────────────────────────
// As Theory's (owner, 2026-10-27): the first section of the lesson, its tabs
// About › Theory › Technique (once the course page's), the level's scale lit
// on the lesson's keyboard on the bar under every tab.

export type GenreOverviewTab = 'about' | 'theory' | 'technique';

export const GENRE_OVERVIEW_TABS: readonly {
  id: GenreOverviewTab;
  label: string;
}[] = [
  { id: 'about', label: 'About' },
  { id: 'theory', label: 'Theory' },
  { id: 'technique', label: 'Technique' },
];

export function GenreOverview({
  tab,
  profile,
  level,
  keyColor,
  onOpenSection,
}: {
  tab: GenreOverviewTab;
  profile: GenreProfile;
  level: GenreLevelProfile;
  keyColor: string;
  onOpenSection: (id: ActivitySectionId) => void;
}) {
  // The scale on the keyboard: a level that teaches more than one shows each
  // in its own colour, one at a time.
  const scales = useMemo(() => levelScales(level), [level]);
  const [scaleAt, setScaleAt] = useState(0);
  const scale = scales[scaleAt] ?? scales[0];
  const color = scaleColor(level, scale.scaleId);
  const midis = useMemo(() => scaleMidis(level, scale), [level, scale]);
  const scaleEvents = useMemo(() => midisToEvents(midis, 'scale'), [midis]);

  // Play Scale: each key lit as it sounds.
  const [sounding, setSounding] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const stopPlaying = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setSounding(null);
  }, []);
  useEffect(() => stopPlaying, [stopPlaying]);
  const playScale = useCallback(() => {
    stopPlaying();
    void playScaleAscending(midis);
    timers.current = midis.map((midi, i) =>
      window.setTimeout(() => setSounding(midi), i * SCALE_STEP_MS),
    );
    timers.current.push(
      window.setTimeout(() => setSounding(null), midis.length * SCALE_STEP_MS),
    );
  }, [midis, stopPlaying]);

  return (
    <div data-genre-overview={tab} className="flex flex-col gap-4">
      <LessonKeyboard
        activeWhiteKeyColor={color}
        activeBlackKeyColor={color}
        enableClick={false}
        targetMidis={midis}
        playingNotes={
          sounding === null
            ? scaleEvents
            : midisToEvents([sounding], 'sounding')
        }
        useContextNotes={false}
      />
      {tab === 'about' && <AboutPanel profile={profile} />}
      {tab === 'theory' && (
        <TheoryPanel
          level={level}
          scales={scales}
          scaleAt={scaleAt}
          onScaleAt={(i) => {
            stopPlaying();
            setScaleAt(i);
          }}
          onPlayScale={playScale}
          keyColor={keyColor}
          onStart={() => onOpenSection('A')}
        />
      )}
      {tab === 'technique' && (
        <TechniquePanel level={level} onOpenSection={onOpenSection} />
      )}
    </div>
  );
}
