import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, ChevronDown } from 'lucide-react';
import { LearnRoutes } from '@/constants/routes';
import { withStudioOrigin } from '@/lib/learn/lessonOrigin';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import {
  MODE_DISPLAY,
  MODE_TO_SLUG,
  FAMILY_MODES,
  getEnrichedDescription,
  noteNameInKey,
  type ChordInsight,
} from './insightConstants';
import { useStore } from '@/daw/store';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { formatSecondaryLabel, useChordNotation } from '@/lib/chordNotation';
import { cn } from '@/components/utilities';
import {
  Dot,
  INK,
  INK_DIM,
  INSIGHT_DIM,
  INSIGHT_GHOST,
  INSIGHT_PILL_LINK,
  INSIGHT_TEXT,
  InsightBadge,
  InsightCard,
} from './InsightCard';
import { chordCardLabels, keyContext } from './insightNotation';

interface ChordCardProps {
  chord: ChordInsight;
  rootNote: number | null;
  /** Session mode (ALL_MODES key), for spelling note names. */
  mode?: string;
  expanded: boolean;
  onToggleExpand: () => void;
  /** The notes picked make this chord: the card lights and comes into view. */
  highlighted?: boolean;
}

export function ChordCard({
  chord,
  rootNote,
  mode,
  expanded,
  onToggleExpand,
  highlighted = false,
}: ChordCardProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = !!useReducedMotion();
  useEffect(() => {
    if (!highlighted) return;
    ref.current?.scrollIntoView?.({
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    });
  }, [highlighted, reduce]);
  const notation = useChordNotation();
  const context = keyContext(rootNote, mode);
  // Hybrid: the hybrid number plus the letter name; jazz / Roman: one symbol.
  const labels = chordCardLabels(chord, notation, context);
  const formatTarget = (target: string) =>
    formatSecondaryLabel(target, notation, context);
  const secondaryTarget = chord.modalInterchange?.secondaryTarget;
  const shownTarget =
    secondaryTarget === undefined ? undefined : formatTarget(secondaryTarget);

  const description = getEnrichedDescription(chord, formatTarget);
  const borrowed =
    chord.modalInterchange?.type === 'borrowed' ||
    chord.modalInterchange?.type === 'mode-mixture';
  // The scale it's borrowed from, on the song's tonic: "C Aeolian", whose
  // lesson the pill opens.
  const sourceMode = chord.modalInterchange?.sourceMode ?? chord.sourceMode;
  const fromSong = useFromSong(labels.title);
  const borrowedFrom =
    chord.modalInterchange?.type === 'borrowed' &&
    sourceMode &&
    rootNote !== null
      ? (() => {
          const tonic = displayAccidentals(
            noteNameInKey(rootNote, rootNote, mode),
          );
          return {
            scale: `${tonic} ${MODE_DISPLAY[sourceMode] ?? chord.modalInterchange?.sourceModeDisplay ?? sourceMode}`,
            to: fromSong(
              LearnRoutes.lesson({
                mode: MODE_TO_SLUG[sourceMode] ?? sourceMode,
                key: keyLabelToUrlParam(tonic),
              }),
            ),
          };
        })()
      : null;

  return (
    <InsightCard
      ref={ref}
      active={highlighted}
      data-highlighted={highlighted || undefined}
      className={cn(
        'transition-[border-color,box-shadow] duration-300',
        highlighted && 'ring-1 ring-white/25',
      )}
    >
      {/* Title row */}
      <div className="flex items-center gap-2.5">
        <Dot color={chord.color} />
        <span className={cn(INSIGHT_TEXT, 'font-medium')}>{labels.title}</span>
        {labels.detail !== null && (
          <span className={INSIGHT_DIM}>{labels.detail}</span>
        )}
      </div>

      {/* Diatonic / Borrowed indicator (UNISON enrichment) */}
      {chord.isDiatonic === false && chord.modalInterchange && (
        <InsightBadge
          tone={borrowed ? 'amber' : 'purple'}
          to={borrowedFrom?.to}
          title={
            borrowedFrom
              ? `Open the ${borrowedFrom.scale} lesson: the scale this chord is borrowed from`
              : undefined
          }
        >
          {chord.modalInterchange.type === 'borrowed'
            ? `Borrowed from ${borrowedFrom?.scale ?? chord.modalInterchange.sourceModeDisplay ?? chord.sourceMode ?? ''}`
            : chord.modalInterchange.type === 'secondary-dominant'
              ? (shownTarget ?? 'Secondary dom.')
              : chord.modalInterchange.type === 'secondary-leading-tone'
                ? (shownTarget ?? 'Secondary LT')
                : 'Mode mixture'}
        </InsightBadge>
      )}
      {chord.isDiatonic === false &&
        !chord.modalInterchange &&
        chord.isDiatonic !== undefined && (
          <InsightBadge>Chromatic</InsightBadge>
        )}

      <ChordTones intervals={chord.intervals} noteNames={chord.noteNames} />

      {/* Theory description (enriched when UNISON data available) */}
      {description ? <p className={INSIGHT_DIM}>{description}</p> : null}

      <ChordLessonLinks chord={chord} chordName={labels.title} />

      <ChordAlternatives
        rootLetter={chord.rootLetter}
        alternatives={chord.alternatives}
        sourceMode={chord.sourceMode}
        chordName={labels.title}
        rootNote={rootNote}
        mode={mode}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
      />
    </InsightCard>
  );
}

// ── Parts shared with Insight's "Now Playing" ──────────────────────────────
// A chord gets the same tones, lesson links and alternatives whether it's
// played or written (insight-21); Now Playing used to draw its own copies,
// with 8 px icons and links that had no way back to the song.

/** Lesson links carry the song and chord, so the lesson can say where this
 * sound lives and offer a way back. */
function useFromSong(chordName: string) {
  const projectName = useStore((s) => s.projectName);
  return (path: string) =>
    withStudioOrigin(path, { song: projectName, chord: chordName });
}

/** The chord's intervals from its root, then its notes, as two plain lines
 * ("Intervals: 1, b3, 5" over "Notes: G, Bb, D"; owner, 2026-10-24). */
export function ChordTones({
  intervals,
  noteNames,
}: {
  intervals: string;
  noteNames: string[];
}) {
  // The root reads as 1, as the other degrees do.
  const steps = intervals
    .split(' ')
    .filter(Boolean)
    .map((step) => (step === 'R' ? '1' : step));
  return (
    <div className="flex flex-col">
      {steps.length > 0 && (
        <div className={INSIGHT_DIM}>Intervals: {steps.join(', ')}</div>
      )}
      <div className={INSIGHT_DIM}>Notes: {noteNames.join(', ')}</div>
    </div>
  );
}

/** Where a chord sits in the key, as its lesson links need it. */
export interface ChordLessonFacts {
  rootLetter: string;
  chordRootMode: string;
  sessionMode: string | null;
  parentKeyLetter: string | null;
  parentMode: string | null;
  isSessionParent: boolean;
}

/**
 * The chord's lessons in two columns (owner, 2026-10-24): the mode the
 * chord's root sounds — what "Learn this sound" used to open — and the
 * parent scale it's drawn from, their names on top and the lessons under
 * them ("Eb Lydian", "Bb Ionian"), laid out as the landing's bento row
 * without its boxes. The parent box shows even when it's the song's
 * own parent scale: it's where the mode comes from.
 */
export function ChordLessonLinks({
  chord,
  chordName,
}: {
  chord: ChordLessonFacts;
  /** The chord as the card titles it, for the lesson's way back. */
  chordName: string;
}) {
  const fromSong = useFromSong(chordName);
  const lesson = (mode: string, key: string) =>
    fromSong(
      LearnRoutes.lesson({
        mode: MODE_TO_SLUG[mode] ?? mode,
        key: keyLabelToUrlParam(key),
      }),
    );
  const boxes = [
    {
      label: 'Mode',
      scale: `${chord.rootLetter} ${MODE_DISPLAY[chord.chordRootMode] ?? chord.chordRootMode}`,
      to: lesson(chord.chordRootMode, chord.rootLetter),
    },
    ...(chord.parentKeyLetter && chord.parentMode
      ? [
          {
            label: 'Parent scale',
            scale: `${chord.parentKeyLetter} ${MODE_DISPLAY[chord.parentMode] ?? chord.parentMode}`,
            to: lesson(chord.parentMode, chord.parentKeyLetter),
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="Lessons for this chord"
      className={cn(
        'grid grid-flow-col grid-rows-[auto_auto] gap-x-4',
        boxes.length === 2 ? 'grid-cols-2' : 'grid-cols-1',
      )}
    >
      {boxes.map((box) => [
        <span
          key={`${box.label}-label`}
          className={cn(INK_DIM, 'text-[12px] font-medium text-white/55')}
        >
          {box.label}
        </span>,
        <Link
          key={`${box.label}-lesson`}
          to={box.to}
          title={`Open the ${box.scale} lesson`}
          aria-label={`${box.label}: ${box.scale}. Open the lesson`}
          className="group -mx-1 flex h-8 min-w-0 items-center gap-1 rounded-md px-1 text-[15px] font-medium text-white outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span className={cn(INK, 'min-w-0 truncate')}>{box.scale}</span>
          <ArrowUpRight
            aria-hidden
            className="insight-mark size-4 shrink-0 text-white/40 transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/80"
          />
        </Link>,
      ])}
    </nav>
  );
}

/** "Also found in N scales": the other scales the chord belongs to. */
export function ChordAlternatives({
  rootLetter,
  alternatives,
  sourceMode,
  chordName,
  rootNote,
  mode,
  expanded,
  onToggleExpand,
}: {
  rootLetter: string;
  alternatives: ChordInsight['alternatives'];
  /** The scale an analysis found the chord borrowed from, marked "detected". */
  sourceMode?: string;
  chordName: string;
  rootNote: number | null;
  mode?: string;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const fromSong = useFromSong(chordName);
  if (alternatives.length === 0 || rootNote === null) return null;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className={cn(INSIGHT_GHOST, '-ml-1.5 self-start')}
      >
        <ChevronDown
          aria-hidden
          className={cn(
            'insight-mark size-3.5 transition-transform duration-150',
            expanded && 'rotate-180',
          )}
        />
        <span className={INK_DIM}>
          Also found in {alternatives.length} scale
          {alternatives.length > 1 ? 's' : ''}
        </span>
      </button>
      {expanded &&
        alternatives.map((alt, i) => {
          const isDetectedSource =
            sourceMode && alt.chordRootMode === sourceMode;
          return (
            <div
              key={i}
              className={cn(
                'flex items-center justify-between gap-2 text-[13px] leading-5',
                isDetectedSource ? 'text-white/85' : 'text-white/55',
              )}
            >
              <span className="min-w-0">
                {rootLetter}{' '}
                {MODE_DISPLAY[alt.chordRootMode] ?? alt.chordRootMode}
                {' \u00B7 '}
                {displayAccidentals(
                  noteNameInKey(
                    (rootNote - alt.parentOffset + 12) % 12,
                    rootNote,
                    mode,
                  ),
                )}{' '}
                {MODE_DISPLAY[FAMILY_MODES[alt.family]?.[0]] ?? alt.family}
                {isDetectedSource && (
                  <span className="ml-1.5 text-[12px] font-medium text-white">
                    detected
                  </span>
                )}
              </span>
              <Link
                to={fromSong(
                  LearnRoutes.lesson({
                    mode: MODE_TO_SLUG[alt.chordRootMode] ?? alt.chordRootMode,
                    key: keyLabelToUrlParam(rootLetter),
                  }),
                )}
                title={`Learn ${rootLetter} ${MODE_DISPLAY[alt.chordRootMode] ?? alt.chordRootMode}`}
                className={cn(INSIGHT_PILL_LINK, 'h-7 px-2.5')}
              >
                <BookOpen aria-hidden className="size-3.5" />
                Learn
              </Link>
            </div>
          );
        })}
    </div>
  );
}
