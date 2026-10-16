import { Link } from 'react-router-dom';
import { BookOpen, ChevronDown } from 'lucide-react';
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
import { chordCardLabels, keyContext } from './insightNotation';

interface ChordCardProps {
  chord: ChordInsight;
  keyLetter: string | null;
  rootNote: number | null;
  /** Session mode (ALL_MODES key), for spelling note names. */
  mode?: string;
  expanded: boolean;
  onToggleExpand: () => void;
}

export function ChordCard({
  chord,
  keyLetter,
  rootNote,
  mode,
  expanded,
  onToggleExpand,
}: ChordCardProps) {
  const notation = useChordNotation();
  const context = keyContext(rootNote, mode);
  // Hybrid: the hybrid number plus the letter name; jazz / Roman: one symbol.
  const labels = chordCardLabels(chord, notation, context);
  const formatTarget = (target: string) =>
    formatSecondaryLabel(target, notation, context);
  const secondaryTarget = chord.modalInterchange?.secondaryTarget;
  const shownTarget =
    secondaryTarget === undefined ? undefined : formatTarget(secondaryTarget);

  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-2.5 border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Title row */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: chord.color }}
        />
        <span
          className="text-[11px] font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {labels.title}
        </span>
        {labels.detail !== null && (
          <span
            className="text-[10px]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {labels.detail}
          </span>
        )}
      </div>

      {/* Diatonic / Borrowed indicator (UNISON enrichment) */}
      {chord.isDiatonic === false && chord.modalInterchange && (
        <span
          className="self-start text-[9px] font-medium px-1.5 py-0.5 rounded-full"
          style={
            chord.modalInterchange.type === 'borrowed' ||
            chord.modalInterchange.type === 'mode-mixture'
              ? {
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                }
              : {
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                  color: '#c084fc',
                }
          }
        >
          {chord.modalInterchange.type === 'borrowed'
            ? `Borrowed from ${chord.modalInterchange.sourceModeDisplay ?? chord.sourceMode ?? ''}`
            : chord.modalInterchange.type === 'secondary-dominant'
              ? (shownTarget ?? 'Secondary dom.')
              : chord.modalInterchange.type === 'secondary-leading-tone'
                ? (shownTarget ?? 'Secondary LT')
                : 'Mode mixture'}
        </span>
      )}
      {chord.isDiatonic === false &&
        !chord.modalInterchange &&
        chord.isDiatonic !== undefined && (
          <span
            className="self-start text-[9px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text-dim)',
            }}
          >
            Chromatic
          </span>
        )}

      <ChordTones intervals={chord.intervals} noteNames={chord.noteNames} />

      {/* Theory description (enriched when UNISON data available) */}
      <div
        className="text-[9px] leading-snug"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {getEnrichedDescription(chord, formatTarget)}
      </div>

      <ChordLessonLinks
        chord={chord}
        chordName={labels.title}
        keyLetter={keyLetter}
        mode={mode}
      />

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
    </div>
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

/** The chord's intervals from its root, then its notes. */
export function ChordTones({
  intervals,
  noteNames,
}: {
  intervals: string;
  noteNames: string[];
}) {
  return (
    <>
      {intervals && (
        <div className="flex gap-1 flex-wrap">
          {intervals.split(' ').map((interval, i) => (
            <span
              key={i}
              className="text-[9px] px-1 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                color:
                  interval === 'R'
                    ? 'var(--color-accent)'
                    : 'var(--color-text-dim)',
              }}
            >
              {interval}
            </span>
          ))}
        </div>
      )}
      <div className="text-[9px]" style={{ color: 'var(--color-text-dim)' }}>
        Notes: {noteNames.join(' \u2013 ')}
      </div>
    </>
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

/** The chord's own sound first, as the one clear next step, then the song's
 * key and the parent scale as plain labels. */
export function ChordLessonLinks({
  chord,
  chordName,
  keyLetter,
  mode,
}: {
  chord: ChordLessonFacts;
  /** The chord as the card titles it, for the lesson's way back. */
  chordName: string;
  keyLetter: string | null;
  mode?: string;
}) {
  const fromSong = useFromSong(chordName);
  const showKey =
    chord.sessionMode &&
    keyLetter &&
    !(
      chord.sessionMode === chord.chordRootMode &&
      chord.rootLetter === keyLetter
    );
  const showParent =
    !chord.isSessionParent && chord.parentKeyLetter && chord.parentMode;

  return (
    <>
      <LessonLink
        primary
        to={fromSong(
          LearnRoutes.lesson({
            mode: MODE_TO_SLUG[chord.chordRootMode] ?? chord.chordRootMode,
            key: keyLabelToUrlParam(chord.rootLetter),
          }),
        )}
        scale={`${chord.rootLetter} ${MODE_DISPLAY[chord.chordRootMode] ?? chord.chordRootMode}`}
      />
      {(showKey || showParent) && (
        <div className="flex flex-wrap items-center gap-1">
          {showKey && chord.sessionMode && keyLetter && (
            <LessonLink
              to={fromSong(
                LearnRoutes.lesson({
                  mode: MODE_TO_SLUG[chord.sessionMode] ?? chord.sessionMode,
                  key: keyLabelToUrlParam(keyLetter),
                }),
              )}
              // Only the song's key when it really is the detected key; the
              // card's session mode is read from the chord's own family.
              label={
                mode &&
                (MODE_TO_SLUG[chord.sessionMode] ?? chord.sessionMode) ===
                  (MODE_TO_SLUG[mode] ?? mode)
                  ? 'Song’s key'
                  : 'Also'
              }
              scale={`${keyLetter} ${MODE_DISPLAY[chord.sessionMode] ?? chord.sessionMode}`}
            />
          )}
          {showParent && chord.parentKeyLetter && chord.parentMode && (
            <LessonLink
              to={fromSong(
                LearnRoutes.lesson({
                  mode: MODE_TO_SLUG[chord.parentMode] ?? chord.parentMode,
                  key: keyLabelToUrlParam(chord.parentKeyLetter),
                }),
              )}
              label="Parent scale"
              scale={`${chord.parentKeyLetter} ${MODE_DISPLAY[chord.parentMode] ?? chord.parentMode}`}
            />
          )}
        </div>
      )}
    </>
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
    <div className="flex flex-col gap-0.5 mt-0.5">
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className="flex items-center gap-1 text-[9px] font-medium"
        style={{
          color: 'var(--color-text-dim)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <ChevronDown
          size={10}
          strokeWidth={2}
          style={{
            transition: 'transform 150ms',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
        Also found in {alternatives.length} scale
        {alternatives.length > 1 ? 's' : ''}
      </button>
      {expanded &&
        alternatives.map((alt, i) => {
          const isDetectedSource =
            sourceMode && alt.chordRootMode === sourceMode;
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 pl-3 text-[9px] leading-snug"
              style={{
                color: 'var(--color-text-dim)',
                opacity: isDetectedSource ? 1 : 0.7,
              }}
            >
              <span>
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
                  <span
                    className="ml-1 text-[8px] font-medium"
                    style={{ color: 'var(--color-accent)' }}
                  >
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
                className="flex shrink-0 items-center gap-1 rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)] transition-colors hover:bg-[rgba(126,207,207,0.15)]"
              >
                <BookOpen size={10} strokeWidth={2} />
                Learn
              </Link>
            </div>
          );
        })}
    </div>
  );
}

interface LessonLinkProps {
  to: string;
  /** "D Dorian" */
  scale: string;
  /** What this scale is to the chord, e.g. "Song's key". */
  label?: string;
  /** The chord's own sound: a full-width button that says what it does. */
  primary?: boolean;
}

function LessonLink({ to, scale, label, primary = false }: LessonLinkProps) {
  if (primary) {
    return (
      <Link
        to={to}
        title={`Open the ${scale} lesson: the scale behind this chord`}
        className="mt-1 flex w-full items-center gap-2 rounded-md border border-[rgba(126,207,207,0.35)] bg-[rgba(126,207,207,0.08)] px-2 py-1.5 text-[var(--color-accent)] transition-colors hover:bg-[rgba(126,207,207,0.18)]"
      >
        <BookOpen size={14} strokeWidth={2} className="shrink-0" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-xs font-semibold">Learn this sound</span>
          <span className="text-[11px]" style={{ color: 'var(--color-text)' }}>
            {scale} &rarr;
          </span>
        </span>
      </Link>
    );
  }
  return (
    <Link
      to={to}
      title={`Open the ${scale} lesson`}
      className="flex items-center gap-1 rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-accent)] transition-colors hover:bg-[rgba(126,207,207,0.15)]"
    >
      <BookOpen size={11} strokeWidth={2} />
      {label && (
        <span style={{ color: 'var(--color-text-dim)' }}>{label}:</span>
      )}
      {scale}
    </Link>
  );
}
