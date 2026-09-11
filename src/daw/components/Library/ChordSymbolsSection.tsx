import { useMemo, type ReactNode } from 'react';
import { Check, RefreshCw, Sparkles } from 'lucide-react';
import { NOTES } from '@prism/engine';
import { useStore } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  harmonyNotesKey,
  hasHarmonyNotes,
  sameChordSymbols,
} from '@/daw/utils/chordAnalysis';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { useChordNotation } from '@/lib/chordNotation';
import { MODE_DISPLAY } from './insightConstants';
import { chordLabelSymbol, keyContext } from './insightNotation';

const MAX_CHIPS = 16;
const dim = { color: 'var(--color-text-dim)' };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** A key as "D Dorian". */
export function KeyLabel({
  rootNote,
  mode,
}: {
  rootNote: number;
  mode: string;
}) {
  return (
    <>
      {displayAccidentals(NOTES[rootNote])} {MODE_DISPLAY[mode] ?? mode}
    </>
  );
}

/** Chord symbols as chips in their chord colours, in the chosen notation. */
export function ChordSymbolChips({
  regions,
  rootNote,
  mode,
}: {
  regions: readonly ChordRegion[];
  /** The key the chords were read in (Roman numerals need it). */
  rootNote: number | null;
  mode: string;
}) {
  const notation = useChordNotation();
  const context = keyContext(rootNote, mode);
  return (
    <div className="flex flex-wrap gap-1">
      {regions.slice(0, MAX_CHIPS).map((r) => {
        const [cr, cg, cb] = r.color;
        return (
          <span
            key={`${r.id}-${r.startTick}`}
            className="rounded px-1.5 py-0.5 text-[9px] font-medium"
            style={{
              backgroundColor: `rgba(${cr}, ${cg}, ${cb}, 0.15)`,
              border: `1px solid rgba(${cr}, ${cg}, ${cb}, 0.4)`,
              color: `rgb(${cr}, ${cg}, ${cb})`,
            }}
          >
            {chordLabelSymbol(r.noteName, notation, context)}
          </span>
        );
      })}
      {regions.length > MAX_CHIPS && (
        <span className="text-[9px]" style={dim}>
          +{regions.length - MAX_CHIPS} more
        </span>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  prominent,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  prominent: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-1 items-center justify-center gap-1 rounded py-1 text-[10px] font-semibold disabled:opacity-40"
      style={{
        cursor: disabled ? 'default' : 'pointer',
        ...(prominent
          ? {
              backgroundColor: 'rgba(126, 207, 207, 0.15)',
              border: '1px solid rgba(126, 207, 207, 0.4)',
              color: 'var(--color-accent)',
            }
          : {
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }),
      }}
    >
      {children}
    </button>
  );
}

/**
 * Insight's home for the project's chord symbols: analyze the music, see the
 * chords it suggests, use them in the chord lane, and re-analyze — flagged
 * when the notes have changed since (a new bass note, say). The chord lane
 * only changes when the user chooses "Use Chord Symbols".
 */
export function ChordSymbolsSection() {
  const tracks = useStore((s) => s.tracks);
  const chordRegions = useStore((s) => s.chordRegions);
  const chordAnalysis = useStore((s) => s.chordAnalysis);
  const analyzeChords = useStore((s) => s.analyzeChords);
  const applyChordSymbols = useStore((s) => s.applyChordSymbols);

  const hasNotes = useMemo(() => hasHarmonyNotes(tracks), [tracks]);
  const notesChanged = useMemo(
    () =>
      chordAnalysis?.notesKey != null &&
      chordAnalysis.notesKey !==
        harmonyNotesKey(tracks, chordAnalysis.trackIds),
    [chordAnalysis, tracks],
  );

  if (!hasNotes && !chordAnalysis) return null;

  const found = chordAnalysis?.regions.length ?? 0;
  const inLane =
    chordAnalysis !== null &&
    found > 0 &&
    sameChordSymbols(chordAnalysis.regions, chordRegions);

  return (
    <div
      data-testid="insight-chord-symbols"
      className="flex flex-col gap-1.5 border-b px-3 py-2.5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--color-accent)' }}
        >
          Chord Symbols
        </span>
        <span className="ml-auto text-[9px]" style={dim}>
          {chordRegions.length > 0
            ? `${chordRegions.length} in chord lane`
            : 'None in chord lane'}
        </span>
      </div>

      {!chordAnalysis ? (
        <>
          <span className="text-[9px] leading-relaxed" style={dim}>
            Analyze the music to suggest chord symbols. Nothing is added to the
            chord lane until you choose to use them.
          </span>
          <ActionButton prominent onClick={() => analyzeChords(null)}>
            <Sparkles size={10} strokeWidth={2} />
            Analyze Chords
          </ActionButton>
        </>
      ) : (
        <>
          <span className="text-[9px] leading-relaxed" style={dim}>
            {found === 0 ? (
              'The analysis found no chords.'
            ) : (
              <>
                Analysis: {plural(found, 'chord')} in{' '}
                <KeyLabel
                  rootNote={chordAnalysis.rootNote}
                  mode={chordAnalysis.mode}
                />
                {chordAnalysis.keyDetected && ' (detected)'}
              </>
            )}
          </span>
          {found > 0 && (
            <ChordSymbolChips
              regions={chordAnalysis.regions}
              rootNote={chordAnalysis.rootNote}
              mode={chordAnalysis.mode}
            />
          )}
          {notesChanged && (
            <span
              className="rounded px-1.5 py-1 text-[9px] leading-relaxed"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: '#f59e0b',
              }}
            >
              The notes have changed since this analysis. Re-analyze to update
              it.
            </span>
          )}
          {inLane ? (
            <span className="flex items-center gap-1 text-[9px]" style={dim}>
              <Check size={10} strokeWidth={2} />
              These are the chord symbols in the chord lane.
            </span>
          ) : (
            found > 0 &&
            chordRegions.length > 0 && (
              <span className="text-[9px] leading-relaxed" style={dim}>
                Using them replaces the{' '}
                {plural(chordRegions.length, 'chord symbol')} in the lane (⌘Z
                undoes it).
              </span>
            )
          )}
          <div className="flex gap-1.5">
            <ActionButton
              prominent={!notesChanged}
              disabled={found === 0 || inLane}
              onClick={applyChordSymbols}
            >
              <Check size={10} strokeWidth={2} />
              Use Chord Symbols
            </ActionButton>
            {hasNotes && (
              <ActionButton
                prominent={notesChanged}
                onClick={() => analyzeChords(chordAnalysis.trackIds)}
              >
                <RefreshCw size={10} strokeWidth={2} />
                Re-analyze
              </ActionButton>
            )}
          </div>
        </>
      )}
    </div>
  );
}
