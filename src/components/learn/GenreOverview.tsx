/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { CurriculumRoutes } from '@/constants/routes';
import {
  SLUG_TO_CURRICULUM_GENRE,
  CURRICULUM_TO_ENGINE_GENRE,
  type CurriculumGenreId,
} from '@/curriculum/bridge/genreIdMap';
import { getGCMEntry } from '@/curriculum/data/gcmHelpers';
import { getActivityFlow } from '@/curriculum/data/activityFlows';
import type { CurriculumLevelId } from '@/curriculum/types/curriculum';
import { HeaderBar } from '@/components/ClassroomLayout/HeaderBar';
import { formatScaleDegrees } from '@/components/learn/modeHelpers';
import { colorForKeyMode } from '@/lib/modeColorShift';
import './learn.css';

const SCALE_TO_MODE: Record<string, string> = {
  ionian: 'ionian',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  aeolian: 'aeolian',
  locrian: 'locrian',
  major_pentatonic: 'ionian',
  minor_pentatonic: 'dorian',
  blues: 'dorian',
  minor_blues: 'dorian',
  major_blues: 'ionian',
  harmonic_minor: 'aeolian',
  melodic_minor: 'aeolian',
};

type GenreOverviewProps = {
  genreSlug: string;
};

const BASE_C4 = 60;
const KEY_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

const LEVELS: { id: CurriculumLevelId; num: number }[] = [
  { id: 'L1', num: 1 },
  { id: 'L2', num: 2 },
  { id: 'L3', num: 3 },
];

function parseKeyRoot(defaultKey: string): { label: string; midi: number } {
  const parts = defaultKey.split(' ');
  const label = parts[0] ?? 'C';
  const semitone = KEY_SEMITONES[label] ?? 0;
  return { label, midi: BASE_C4 + semitone };
}

function buildScaleMidis(rootMidi: number, intervals: number[]): number[] {
  const midis = intervals.map((i) => rootMidi + i);
  // Ensure octave is included
  const octave = rootMidi + 12;
  if (!midis.includes(octave)) midis.push(octave);
  return midis.sort((a, b) => a - b);
}

function formatScaleName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function GenreOverview({ genreSlug }: GenreOverviewProps) {
  const navigate = useNavigate();
  const [noteIndex, setNoteIndex] = useState(0);
  const [chordsOpen, setChordsOpen] = useState(false);
  const [flowTitles, setFlowTitles] = useState<Record<string, string>>({});

  // Resolve genre slug → curriculum genre ID
  const genreId = SLUG_TO_CURRICULUM_GENRE[genreSlug] as
    | CurriculumGenreId
    | undefined;
  const displayName = genreId ? CURRICULUM_TO_ENGINE_GENRE[genreId] : genreSlug;

  // Get GCM data for L1 (primary display)
  const gcmL1 = useMemo(() => {
    if (!genreId) return null;
    try {
      return getGCMEntry(genreId, 'L1');
    } catch {
      return null;
    }
  }, [genreId]);

  const keyRoot = useMemo(
    () => parseKeyRoot(gcmL1?.global.defaultKey ?? 'C major'),
    [gcmL1],
  );

  const scaleIntervals = gcmL1?.melody.scale.intervals ?? [
    0, 2, 4, 5, 7, 9, 11,
  ];
  const scaleMidis = useMemo(
    () => buildScaleMidis(keyRoot.midi, scaleIntervals),
    [keyRoot.midi, scaleIntervals],
  );

  // Auto-playing piano animation (same 600ms as ModeOverview)
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNoteIndex((prev) => {
        const next = prev + 1;
        if (next >= scaleMidis.length) return 0;
        return next;
      });
    }, 600);
    return () => window.clearInterval(intervalId);
  }, [scaleMidis.length]);

  const activeNotes = useMemo(() => {
    const now = Date.now();
    const cappedIndex = Math.min(noteIndex, scaleMidis.length - 1);
    return scaleMidis
      .slice(0, cappedIndex + 1)
      .map<PlaybackEvent>((midi, index) => ({
        id: `${genreSlug}-${midi}-${index}`,
        type: 'note',
        midi,
        time: now,
        duration: 0.6,
        velocity: 1,
      }));
  }, [genreSlug, noteIndex, scaleMidis]);

  // Load activity flow titles for each level
  useEffect(() => {
    if (!genreId) return;
    let cancelled = false;
    const loadTitles = async () => {
      const titles: Record<string, string> = {};
      for (const lvl of LEVELS) {
        const flow = await getActivityFlow(genreId, lvl.num);
        if (flow && !cancelled) {
          titles[lvl.id] = flow.title;
        }
      }
      if (!cancelled) setFlowTitles(titles);
    };
    loadTitles();
    return () => {
      cancelled = true;
    };
  }, [genreId]);

  if (!genreId || !gcmL1) {
    return (
      <div
        className="learn-root p-8"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Genre not found: {genreSlug}
      </div>
    );
  }

  const tempoRange = gcmL1.global.tempoRange;
  const keyColor = colorForKeyMode(
    keyRoot.label,
    (SCALE_TO_MODE[gcmL1.melody.scale.name] ?? 'dorian') as Parameters<
      typeof colorForKeyMode
    >[1],
  );

  return (
    <div
      className="learn-root flex flex-col gap-6"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <HeaderBar
        title={displayName}
        onBack={() => navigate(-1)}
        showProfile={false}
      />

      {/* Auto-playing piano */}
      <PianoKeyboard
        endC={6}
        startC={4}
        playingNotes={activeNotes}
        activeWhiteKeyColor={keyColor}
        activeBlackKeyColor={keyColor}
      />

      <section className="mb-6 flex flex-col items-center">
        {/* Scale info */}
        <p
          className="text-base md:text-lg font-semibold mb-3 text-left self-start ml-[10%]"
          style={{ color: 'var(--color-text)' }}
        >
          Scale: {formatScaleName(gcmL1.melody.scale.name)} (
          {formatScaleDegrees(scaleIntervals).join(', ')})
        </p>

        {/* Tempo range */}
        <p
          className="text-sm mb-4 text-left self-start ml-[10%]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Tempo: {tempoRange[0]}–{tempoRange[1]} BPM
          {(Array.isArray(gcmL1.global.swing)
            ? gcmL1.global.swing[0]
            : gcmL1.global.swing) > 0 && ` · Swing: ${gcmL1.global.swing}`}
        </p>

        {/* Chord types (collapsible, like Chord Scales in ModeOverview) */}
        <div className="w-full max-w-3xl mb-4">
          <button
            type="button"
            onClick={() => setChordsOpen((o) => !o)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide cursor-pointer mb-2"
            style={{ color: 'var(--color-text-dim)' }}
          >
            <span
              style={{
                display: 'inline-block',
                transform: chordsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms',
              }}
            >
              &#9654;
            </span>
            Chord Types &amp; Progressions
          </button>
          {chordsOpen && (
            <div
              className="p-4 rounded-lg glass-panel-sm"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--color-border)',
              }}
            >
              {/* Chord types */}
              <div className="mb-3">
                <div
                  className="text-[10px] uppercase tracking-widest mb-1 opacity-50"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  Chord Types
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {gcmL1.chords.chordTypes.split(',').map((ct, i) => (
                    <span
                      key={i}
                      className="inline-block px-2 py-0.5 rounded text-xs"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--color-border)',
                        color: keyColor,
                      }}
                    >
                      {ct.trim().split('[')[0].trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progressions */}
              {gcmL1.chords.progressions.length > 0 && (
                <div className="mb-3">
                  <div
                    className="text-[10px] uppercase tracking-widest mb-1 opacity-50"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    Progressions
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {gcmL1.chords.progressions.slice(0, 6).map((p, i) => (
                      <span
                        key={i}
                        className="inline-block px-2 py-0.5 rounded text-xs"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--color-border)',
                          color: keyColor,
                        }}
                      >
                        {p.split('|')[0].trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Level tiles (like 12 key tiles in ModeOverview) */}
        <div className="grid grid-cols-1 gap-3 w-full max-w-3xl">
          {LEVELS.map((lvl) => {
            const title = flowTitles[lvl.id]
              ? `Level ${lvl.num} — ${flowTitles[lvl.id]}`
              : `Level ${lvl.num}`;

            return (
              <button
                key={lvl.id}
                onClick={() =>
                  navigate(
                    CurriculumRoutes.genreLevel({
                      genre: genreSlug,
                      level: String(lvl.num),
                    }),
                  )
                }
                className="p-3 rounded-lg text-sm font-bold text-left transition-colors duration-150 glass-panel-sm cursor-pointer"
                style={{
                  color: keyColor,
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
                {title}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
