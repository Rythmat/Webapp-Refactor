import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { displayChordLabel } from '@/daw/utils/displayChordLabel';
import {
  chordSelectionKey,
  noteSelectionKey,
  resolveNoteSelection,
} from '@/daw/utils/insightSelection';
import {
  formatChord,
  useChordNotation,
  type ChordNotation,
} from '@/lib/chordNotation';
import type { UnisonDocument } from '@/unison/types/schema';
import { chordMatchKey, selectionChordInsights } from './buildChordInsights';
import { ChordCard } from './ChordCard';
import { INSIGHT_DIM, INSIGHT_ROW, InsightCard } from './InsightCard';
import { analyzedChordSpec, keyContext, plural } from './insightNotation';

/**
 * Insight for a selection — chords picked in the timeline's chord lane, or
 * notes picked inside clips (⌘-drag in the timeline, or the piano roll),
 * read with the internal theory engine as soon as it's picked — its voice
 * leading, chord cards and progression matches (the Harmony card went,
 * owner 2026-10-24).
 * Results show while the analyzed selection (and its notes) stay unchanged;
 * a change is read again on its own.
 */
export function SelectionAnalysis({
  shownElsewhere,
}: {
  /** Chords (chordMatchKey) the song's own cards show. */
  shownElsewhere?: ReadonlySet<string>;
}) {
  const selectedChordIds = useStore((s) => s.selectedChordIds);
  const selectedNotes = useStore((s) => s.selectedNotes);
  const chordRegions = useStore((s) => s.chordRegions);
  const tracks = useStore((s) => s.tracks);
  const selectionAnalysis = useStore((s) => s.selectionAnalysis);
  const analyzeChordSelection = useStore((s) => s.analyzeChordSelection);
  const analyzeNoteSelection = useStore((s) => s.analyzeNoteSelection);
  const clearSelectionAnalysis = useStore((s) => s.clearSelectionAnalysis);
  const notation = useChordNotation();
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

  // A chord the song's cards already show isn't drawn again: Insight
  // highlights the song's card instead (InsightContent).
  const cards = useMemo(
    () =>
      doc
        ? selectionChordInsights(doc).filter(
            (c) => !shownElsewhere?.has(chordMatchKey(c)),
          )
        : [],
    [doc, shownElsewhere],
  );

  // Analyze what's picked as it's picked (owner, 2026-10-24): a moment
  // after the selection settles, so a Shift-click run or a ⌘-drag reads once.
  const stale = kind !== null && !doc;
  useEffect(() => {
    if (!stale) return;
    const id = window.setTimeout(() => {
      if (kind === 'notes') analyzeNoteSelection(selectedNotes);
      else analyzeChordSelection(selectedChords.map((r) => r.id));
    }, 250);
    return () => window.clearTimeout(id);
  }, [
    stale,
    kind,
    selectionKey,
    selectedNotes,
    selectedChords,
    analyzeNoteSelection,
    analyzeChordSelection,
  ]);

  // No card of its own (owner, 2026-10-24): what's picked shows only as
  // what Insight reads from it.
  if (!kind || !doc) return null;

  return (
    <div data-testid="insight-selection" className="flex flex-col gap-2">
      <VoiceLeading doc={doc} notation={notation} />
      {cards.map((chord) => (
        <ChordCard
          key={chord.degreeName}
          chord={chord}
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
    </div>
  );
}

/** How the voices move from each chord in the selection to the next. */
function VoiceLeading({
  doc,
  notation,
}: {
  doc: UnisonDocument;
  notation: ChordNotation;
}) {
  const summary = doc.analysis.voiceLeading;
  if (!summary) return null;
  const context = keyContext(doc.analysis.key.rootPc, doc.analysis.key.mode);
  const names = new Map(
    doc.analysis.chordTimeline.map((c) => [
      c.id,
      notation === 'hybrid'
        ? displayChordLabel(c.noteName)
        : formatChord(analyzedChordSpec(c), notation, context),
    ]),
  );
  const smooth = Math.round(summary.avgSmoothness * 100);

  return (
    <InsightCard title="Voice leading">
      <div className="flex items-center gap-2.5">
        <span className={INSIGHT_DIM}>Smoothness</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${smooth}%` }}
          />
        </div>
        <span className="insight-ink text-[13px] tabular-nums text-white/85 [--sweep-to:color-mix(in_srgb,white_85%,transparent)]">
          {smooth}%
        </span>
      </div>
      <span className={INSIGHT_DIM}>
        Common tones in {Math.round(summary.commonTonePercentage * 100)}% of
        moves
        {summary.parallelFifthCount > 0 &&
          ` · ${plural(summary.parallelFifthCount, 'parallel fifth')}`}
      </span>
      {summary.transitions.map((t) => (
        <div
          key={`${t.fromChordId}-${t.toChordId}`}
          className={cn(INSIGHT_ROW, 'flex items-center justify-between gap-2')}
        >
          <span className="insight-ink text-[13px] font-medium text-white [--sweep-to:white]">
            {names.get(t.fromChordId)} → {names.get(t.toChordId)}
          </span>
          <span className="insight-ink shrink-0 text-[12px] text-white/55 [--sweep-to:color-mix(in_srgb,white_55%,transparent)]">
            {plural(t.commonTones, 'common tone')} · max {t.maxVoiceMovement} st
          </span>
        </div>
      ))}
    </InsightCard>
  );
}
