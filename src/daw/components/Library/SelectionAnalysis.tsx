import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ionianToModeLabel } from '@prism/engine';
import { useStore } from '@/daw/store';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import {
  chordSelectionKey,
  noteSelectionKey,
  resolveNoteSelection,
} from '@/daw/utils/insightSelection';
import type { UnisonDocument } from '@/unison/types/schema';
import { buildChordInsights, unisonChordLookup } from './buildChordInsights';
import { ChordCard } from './ChordCard';
import { degreeToHybrid } from './insightConstants';
import { UnisonSections } from './UnisonSections';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const sectionStyle = { borderColor: 'var(--color-border)' };
const labelStyle = { color: 'var(--color-text-dim)' };

/**
 * Insight for a selection — chords picked in the timeline's chord lane, or
 * notes picked inside clips (⌘-drag in the timeline, or the piano roll): what's
 * selected, an Analyze button, and — once analyzed with the internal theory
 * engine — its harmonic function, voice leading, chord cards and progression
 * matches. Results show while the analyzed selection (and its notes) stay
 * unchanged; anything else asks to analyze again.
 */
export function SelectionAnalysis() {
  const selectedChordIds = useStore((s) => s.selectedChordIds);
  const setSelectedChordIds = useStore((s) => s.setSelectedChordIds);
  const selectedNotes = useStore((s) => s.selectedNotes);
  const setSelectedNotes = useStore((s) => s.setSelectedNotes);
  const chordRegions = useStore((s) => s.chordRegions);
  const tracks = useStore((s) => s.tracks);
  const selectionAnalysis = useStore((s) => s.selectionAnalysis);
  const analyzeChordSelection = useStore((s) => s.analyzeChordSelection);
  const analyzeNoteSelection = useStore((s) => s.analyzeNoteSelection);
  const clearSelectionAnalysis = useStore((s) => s.clearSelectionAnalysis);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Selected chords that still exist (re-deriving chords gives them new ids),
  // in timeline order.
  const selectedChords = useMemo(() => {
    const ids = new Set(selectedChordIds);
    return chordRegions
      .filter((r) => ids.has(r.id))
      .sort((a, b) => a.startTick - b.startTick);
  }, [chordRegions, selectedChordIds]);
  const pickedNotes = useMemo(
    () => resolveNoteSelection(tracks, selectedNotes),
    [tracks, selectedNotes],
  );
  const noteCount = pickedNotes.reduce((n, p) => n + p.events.length, 0);

  const kind =
    noteCount > 0 ? 'notes' : selectedChords.length > 0 ? 'chords' : null;
  const selectionKey = useMemo(() => {
    if (kind === 'notes') return noteSelectionKey(tracks, selectedNotes);
    if (kind === 'chords')
      return chordSelectionKey(selectedChords.map((r) => r.id));
    return null;
  }, [kind, tracks, selectedNotes, selectedChords]);
  const doc =
    selectionAnalysis && selectionAnalysis.key === selectionKey
      ? selectionAnalysis.doc
      : null;

  // Drop the analysis once nothing is selected.
  useEffect(() => {
    if (!kind && selectionAnalysis) clearSelectionAnalysis();
  }, [kind, selectionAnalysis, clearSelectionAnalysis]);

  // Cards read in the analysis's key: the session key, or — for notes in a
  // session with none set — the key the notes suggest.
  const cards = useMemo(() => {
    if (!doc) return [];
    const { rootPc, mode } = doc.analysis.key;
    return buildChordInsights(
      doc.analysis.chordTimeline.map((c) => c.hybridName),
      rootPc,
      mode,
      unisonChordLookup(doc),
    );
  }, [doc]);

  if (!kind) {
    const hasNotes = tracks.some((t) =>
      t.midiClips.some((c) => c.events.length > 0),
    );
    if (!hasNotes) return null;
    return (
      <div
        className="border-b px-3 py-2 text-[9px] leading-relaxed"
        style={{ ...sectionStyle, ...labelStyle }}
      >
        To analyze part of the song, click chords in the chord lane (Shift-click
        a run, ⌘-click to add one), or ⌘-drag across clips to select notes.
      </div>
    );
  }

  const count = kind === 'notes' ? noteCount : selectedChords.length;
  const unit = kind === 'notes' ? 'note' : 'chord';

  return (
    <div
      data-testid="insight-selection"
      className="flex flex-col"
      style={{ boxShadow: 'inset 2px 0 0 var(--color-accent)' }}
    >
      <div
        className="flex flex-col gap-1.5 border-b px-3 py-2.5"
        style={sectionStyle}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--color-accent)' }}
          >
            Selection
          </span>
          <span className="text-[9px]" style={labelStyle}>
            {plural(count, unit)}
          </span>
          <button
            type="button"
            onClick={() =>
              kind === 'notes' ? setSelectedNotes([]) : setSelectedChordIds([])
            }
            className="ml-auto flex items-center gap-0.5 text-[9px] font-medium"
            style={{
              ...labelStyle,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <X size={10} strokeWidth={2} />
            Clear
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {kind === 'chords'
            ? selectedChords.map((r) => (
                <Chip key={r.id} rgb={r.color}>
                  {displayAccidentals(r.noteName)}
                </Chip>
              ))
            : pickedNotes.map(({ track, events }) => (
                <Chip key={track.id} css={track.color}>
                  {`${track.name} · ${plural(events.length, 'note')}`}
                </Chip>
              ))}
        </div>
        {!doc && (
          <button
            type="button"
            onClick={() =>
              kind === 'notes'
                ? analyzeNoteSelection(selectedNotes)
                : analyzeChordSelection(selectedChords.map((r) => r.id))
            }
            className="flex items-center justify-center gap-1 rounded py-1 text-[10px] font-semibold"
            style={{
              backgroundColor: 'rgba(126, 207, 207, 0.15)',
              border: '1px solid rgba(126, 207, 207, 0.4)',
              color: 'var(--color-accent)',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={10} strokeWidth={2} />
            Analyze {plural(count, unit)}
          </button>
        )}
      </div>

      {doc && (
        <>
          <HarmonySummary doc={doc} />
          <VoiceLeading doc={doc} />
          {cards.map((chord) => (
            <ChordCard
              key={chord.degreeName}
              chord={chord}
              keyLetter={displayAccidentals(doc.analysis.key.rootName)}
              rootNote={doc.analysis.key.rootPc}
              mode={doc.analysis.key.mode}
              expanded={expandedCards.has(chord.degreeName)}
              onToggleExpand={() =>
                setExpandedCards((prev) => {
                  const next = new Set(prev);
                  if (next.has(chord.degreeName)) next.delete(chord.degreeName);
                  else next.add(chord.degreeName);
                  return next;
                })
              }
            />
          ))}
          <UnisonSections unisonDoc={doc} harmonyOnly />
        </>
      )}
    </div>
  );
}

/** A selection chip tinted by a chord's RGB colour or a track's CSS colour. */
function Chip({
  children,
  rgb,
  css,
}: {
  children: string;
  rgb?: [number, number, number];
  css?: string;
}) {
  const color = rgb ? `rgb(${rgb.join(', ')})` : (css ?? 'var(--color-text)');
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        color,
      }}
    >
      {children}
    </span>
  );
}

function Badge({
  children,
  tone,
}: {
  children: string;
  tone: 'dim' | 'amber' | 'purple';
}) {
  const style =
    tone === 'amber'
      ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }
      : tone === 'purple'
        ? { backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }
        : {
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-dim)',
          };
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
      style={style}
    >
      {children}
    </span>
  );
}

/** The selection's chords as roman numerals in the key, and how far they
 *  stray from it. */
function HarmonySummary({ doc }: { doc: UnisonDocument }) {
  const { key, chordTimeline, modalInterchangeSummary, tonalRegions } =
    doc.analysis;
  const diatonic = chordTimeline.filter((c) => c.isDiatonic !== false).length;
  const tonicizations = (tonalRegions ?? [])
    .filter((t) => t.type === 'tonicization')
    .map((t) => `${displayAccidentals(t.key.rootName)} ${t.key.modeDisplay}`);

  return (
    <div
      className="flex flex-col gap-1.5 border-b px-3 py-2.5"
      style={sectionStyle}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={labelStyle}
      >
        Harmony
      </span>
      {chordTimeline.length === 0 ? (
        <span className="text-[9px]" style={labelStyle}>
          No chords found in the selection.
        </span>
      ) : (
        <>
          <span
            className="text-[11px] font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {chordTimeline
              .map((c) =>
                degreeToHybrid(ionianToModeLabel(c.hybridName, key.mode)),
              )
              .join(' → ')}
          </span>
          <span className="text-[9px]" style={labelStyle}>
            {chordTimeline
              .map((c) => displayAccidentals(c.noteName))
              .join(' – ')}{' '}
            · in {displayAccidentals(key.rootName)} {key.modeDisplay}
          </span>
          <div className="flex flex-wrap gap-1">
            <Badge tone="dim">
              {`${diatonic} of ${chordTimeline.length} diatonic`}
            </Badge>
            {modalInterchangeSummary &&
              modalInterchangeSummary.borrowedChordCount > 0 && (
                <Badge tone="amber">
                  {`${plural(modalInterchangeSummary.borrowedChordCount, 'borrowed chord')}${
                    modalInterchangeSummary.sourceModes.length > 0
                      ? ` · ${modalInterchangeSummary.sourceModes.join(', ')}`
                      : ''
                  }`}
                </Badge>
              )}
            {modalInterchangeSummary &&
              modalInterchangeSummary.secondaryDominantCount > 0 && (
                <Badge tone="purple">
                  {plural(
                    modalInterchangeSummary.secondaryDominantCount,
                    'secondary dominant',
                  )}
                </Badge>
              )}
            {tonicizations.map((t) => (
              <Badge key={t} tone="purple">{`Tonicizes ${t}`}</Badge>
            ))}
            {modalInterchangeSummary?.modulatesTo.map((m) => (
              <Badge key={m} tone="purple">{`Modulates to ${m}`}</Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** How the voices move from each chord in the selection to the next. */
function VoiceLeading({ doc }: { doc: UnisonDocument }) {
  const summary = doc.analysis.voiceLeading;
  if (!summary) return null;
  const names = new Map(
    doc.analysis.chordTimeline.map((c) => [
      c.id,
      displayAccidentals(c.noteName),
    ]),
  );

  return (
    <div
      className="flex flex-col gap-1.5 border-b px-3 py-2.5"
      style={sectionStyle}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={labelStyle}
      >
        Voice Leading
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-[8px]" style={labelStyle}>
          Smoothness
        </span>
        <div
          className="h-1 flex-1 overflow-hidden rounded-full"
          style={{ backgroundColor: 'var(--color-surface-2)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${summary.avgSmoothness * 100}%`,
              backgroundColor: 'var(--color-accent)',
            }}
          />
        </div>
        <span className="font-mono text-[8px]" style={labelStyle}>
          {Math.round(summary.avgSmoothness * 100)}%
        </span>
      </div>
      <span className="text-[9px]" style={labelStyle}>
        Common tones in {Math.round(summary.commonTonePercentage * 100)}% of
        moves
        {summary.parallelFifthCount > 0 &&
          ` · ${plural(summary.parallelFifthCount, 'parallel fifth')}`}
      </span>
      {summary.transitions.map((t) => (
        <div
          key={`${t.fromChordId}-${t.toChordId}`}
          className="flex items-center justify-between rounded px-2 py-1"
          style={{ backgroundColor: 'var(--color-surface-2)' }}
        >
          <span
            className="text-[10px] font-medium"
            style={{ color: 'var(--color-text)' }}
          >
            {names.get(t.fromChordId)} → {names.get(t.toChordId)}
          </span>
          <span className="text-[9px]" style={labelStyle}>
            {plural(t.commonTones, 'common tone')} · max {t.maxVoiceMovement} st
          </span>
        </div>
      ))}
    </div>
  );
}
