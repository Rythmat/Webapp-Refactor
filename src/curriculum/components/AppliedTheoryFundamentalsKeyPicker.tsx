/**
 * AppliedTheoryFundamentalsKeyPicker.tsx — key-center picker landing page.
 *
 * Modeled on ModeOverview.tsx's CHROMATIC_KEYS tile pattern
 * (src/components/learn/ModeOverview.tsx) — same 12-key list and layout
 * approach, simplified (no per-key resume state; Phase 1 has one flow,
 * not a per-key lesson history to resume).
 *
 * Shared by piano and guitar: the same twelve key centers, in the order the
 * Piano and Guitar Atlas books print them, opening that instrument's lesson.
 */

import { useNavigate } from 'react-router';
import { CurriculumRoutes } from '@/constants/routes';
import type { LearnInstrument } from '@/features/learn/useInstrumentStore';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';

type KeyTile = { label: string; semitone: number };

const CHROMATIC_KEYS: KeyTile[] = [
  { label: 'C', semitone: 0 },
  { label: 'G', semitone: 7 },
  { label: 'D', semitone: 2 },
  { label: 'A', semitone: 9 },
  { label: 'E', semitone: 4 },
  { label: 'B', semitone: 11 },
  { label: 'F♯', semitone: 6 },
  { label: 'D♭', semitone: 1 },
  { label: 'A♭', semitone: 8 },
  { label: 'E♭', semitone: 3 },
  { label: 'B♭', semitone: 10 },
  { label: 'F', semitone: 5 },
];

const COPY: Record<
  LearnInstrument,
  { title: string; blurb: string; lessonRoute: (key: string) => string }
> = {
  piano: {
    title: 'Applied Theory Fundamentals',
    blurb:
      'Pick a key center to practice scales, melodies, and chords in — you can switch keys any time.',
    lessonRoute: (key) =>
      CurriculumRoutes.appliedTheoryFundamentalsLesson({ key }),
  },
  guitar: {
    title: 'Applied Theory Fundamentals — Guitar',
    blurb:
      'Pick a key center from The Guitar Atlas to practice its scales, chord shapes, and Music Maps — you can switch keys any time.',
    lessonRoute: (key) =>
      CurriculumRoutes.guitarAppliedTheoryFundamentalsLesson({ key }),
  },
};

export function AppliedTheoryFundamentalsKeyPicker({
  instrument = 'piano',
}: {
  instrument?: LearnInstrument;
} = {}) {
  const navigate = useNavigate();
  const copy = COPY[instrument];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1
        className="text-2xl font-semibold"
        style={{ color: 'var(--color-text)' }}
      >
        {copy.title}
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-dim)' }}>
        {copy.blurb}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {CHROMATIC_KEYS.map((tile) => {
          const tileColor = colorForKeyMode(tile.label, 'ionian');
          const keyParam = keyLabelToUrlParam(tile.label);

          return (
            <button
              key={tile.label}
              type="button"
              onClick={() => navigate(copy.lessonRoute(keyParam))}
              className="rounded-lg p-4 text-left text-sm font-bold transition-colors duration-150 glass-panel-sm cursor-pointer"
              style={{
                color: tileColor,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
            >
              {tile.label} Major
            </button>
          );
        })}
      </div>
    </div>
  );
}
