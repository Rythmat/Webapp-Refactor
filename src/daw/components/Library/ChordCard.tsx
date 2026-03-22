import { Link } from 'react-router-dom';
import { BookOpen, ChevronDown } from 'lucide-react';
import { LearnRoutes } from '@/constants/routes';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import {
  MODE_DISPLAY,
  MODE_TO_SLUG,
  FAMILY_MODES,
  getEnrichedDescription,
  noteNameInKey,
  type ChordInsight,
} from './insightConstants';

interface ChordCardProps {
  chord: ChordInsight;
  keyLetter: string | null;
  rootNote: number | null;
  expanded: boolean;
  onToggleExpand: () => void;
}

export function ChordCard({
  chord,
  keyLetter,
  rootNote,
  expanded,
  onToggleExpand,
}: ChordCardProps) {
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
          {chord.hybrid}
        </span>
        <span
          className="text-[10px]"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {chord.chordLabel}
        </span>
        {/* Roman numeral badge (UNISON enrichment) */}
        {chord.romanNumeral && (
          <span
            className="text-[9px] font-mono px-1 py-0.5 rounded ml-auto"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text)',
            }}
          >
            {chord.romanNumeral}
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
              ? (chord.modalInterchange.secondaryTarget ?? 'Secondary dom.')
              : chord.modalInterchange.type === 'secondary-leading-tone'
                ? (chord.modalInterchange.secondaryTarget ?? 'Secondary LT')
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

      {/* Intervals */}
      {chord.intervals && (
        <div className="flex gap-1 flex-wrap">
          {chord.intervals.split(' ').map((interval, i) => (
            <span
              key={i}
              className="text-[9px] font-mono px-1 py-0.5 rounded"
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

      {/* Note names */}
      <div className="text-[9px]" style={{ color: 'var(--color-text-dim)' }}>
        Notes: {chord.noteNames.join(' \u2013 ')}
      </div>

      {/* Theory description (enriched when UNISON data available) */}
      <div
        className="text-[9px] leading-snug"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {getEnrichedDescription(chord)}
      </div>

      {/* Mode links */}
      <div className="flex flex-wrap items-center gap-1 mt-0.5">
        <Link
          to={LearnRoutes.lesson({
            mode: MODE_TO_SLUG[chord.chordRootMode] ?? chord.chordRootMode,
            key: keyLabelToUrlParam(chord.rootLetter),
          })}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors"
          style={{
            backgroundColor: 'var(--color-surface-3)',
            color: 'var(--color-accent)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(126,207,207,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-surface-3)';
          }}
        >
          <BookOpen size={8} strokeWidth={2} />
          {chord.rootLetter}{' '}
          {MODE_DISPLAY[chord.chordRootMode] ?? chord.chordRootMode}
        </Link>
        {chord.sessionMode &&
          keyLetter &&
          !(
            chord.sessionMode === chord.chordRootMode &&
            chord.rootLetter === keyLetter
          ) && (
            <Link
              to={LearnRoutes.lesson({
                mode: MODE_TO_SLUG[chord.sessionMode] ?? chord.sessionMode,
                key: keyLabelToUrlParam(keyLetter),
              })}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-3)',
                color: 'var(--color-accent)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  'rgba(126,207,207,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  'var(--color-surface-3)';
              }}
            >
              <BookOpen size={8} strokeWidth={2} />
              {keyLetter} {MODE_DISPLAY[chord.sessionMode] ?? chord.sessionMode}
            </Link>
          )}
        {!chord.isSessionParent &&
          chord.parentKeyLetter &&
          chord.parentMode && (
            <Link
              to={LearnRoutes.lesson({
                mode: MODE_TO_SLUG[chord.parentMode] ?? chord.parentMode,
                key: keyLabelToUrlParam(chord.parentKeyLetter),
              })}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-3)',
                color: 'var(--color-accent)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  'rgba(126,207,207,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  'var(--color-surface-3)';
              }}
            >
              <BookOpen size={8} strokeWidth={2} />
              Parent: {chord.parentKeyLetter}{' '}
              {MODE_DISPLAY[chord.parentMode] ?? chord.parentMode}
            </Link>
          )}
      </div>

      {/* Alternative interpretations */}
      {chord.alternatives.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          <button
            type="button"
            onClick={onToggleExpand}
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
            Also found in {chord.alternatives.length} scale
            {chord.alternatives.length > 1 ? 's' : ''}
          </button>
          {expanded &&
            chord.alternatives.map((alt, i) => {
              const isDetectedSource =
                chord.sourceMode && alt.chordRootMode === chord.sourceMode;
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
                    {chord.rootLetter}{' '}
                    {MODE_DISPLAY[alt.chordRootMode] ?? alt.chordRootMode}
                    {' \u00B7 '}
                    {noteNameInKey(
                      (rootNote! - alt.parentOffset + 12) % 12,
                      rootNote!,
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
                    to={LearnRoutes.lesson({
                      mode:
                        MODE_TO_SLUG[alt.chordRootMode] ?? alt.chordRootMode,
                      key: keyLabelToUrlParam(chord.rootLetter),
                    })}
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium transition-colors shrink-0"
                    style={{
                      backgroundColor: 'var(--color-surface-2)',
                      color: 'var(--color-accent)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'rgba(126,207,207,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'var(--color-surface-2)';
                    }}
                  >
                    <BookOpen size={8} strokeWidth={2} />
                    Learn
                  </Link>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
