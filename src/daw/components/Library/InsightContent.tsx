/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
import { useEffect, useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/daw/store';
import { NOTES, KEY_COLORS, ionianToModeLabel } from '@prism/engine';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { useChordNotation } from '@/lib/chordNotation';
import { keyContext, liveChordLabels } from './insightNotation';
import { ROOT_TO_KEY_INDEX } from './insightConstants';
import {
  buildChordInsights,
  buildLiveChord,
  unisonChordLookup,
} from './buildChordInsights';
import {
  ChordAlternatives,
  ChordCard,
  ChordLessonLinks,
  ChordTones,
} from './ChordCard';
import { KeySection } from './KeySection';
import { ChordSymbolsSection } from './ChordSymbolsSection';
import { SelectionAnalysis } from './SelectionAnalysis';
import { UnisonSections } from './UnisonSections';

// ── Component ────────────────────────────────────────────────────────────

export function InsightContent() {
  const stringSeq = useStore((s) => s.stringSeq);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const notation = useChordNotation();
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);
  const audioActiveNotes = useStore((s) => s.audioActiveNotes);

  // Use audio-detected notes when available, else MIDI hardware notes
  const activeNotes = useMemo(() => {
    if (audioActiveNotes.length > 0) return new Set(audioActiveNotes);
    return hwActiveNotes;
  }, [audioActiveNotes, hwActiveNotes]);

  const keyLetter =
    rootNote !== null ? displayAccidentals(NOTES[rootNote]) : null;

  // UNISON analysis state
  const unisonDoc = useStore((s) => s.unisonDoc);
  const unisonError = useStore((s) => s.unisonError);
  const chordRegions = useStore((s) => s.chordRegions);
  // The harmony's fingerprint: the note lists of the MIDI clips. A fader,
  // a mute or a rename keeps them, so it neither re-renders the panel nor
  // re-runs the analysis (insight-09).
  const midiNotes = useStore(
    useShallow((s) =>
      s.tracks.flatMap((t) =>
        t.type === 'midi' ? t.midiClips.map((c) => c.events) : [],
      ),
    ),
  );
  const analyzeSession = useStore((s) => s.analyzeSession);

  // Auto-analyze when inputs change (debounced 500ms)
  useEffect(() => {
    const hasMidi = midiNotes.some((events) => events.length > 0);
    if (!hasMidi && chordRegions.length === 0) return;

    const timer = setTimeout(() => {
      analyzeSession();
    }, 500);

    return () => clearTimeout(timer);
  }, [chordRegions, rootNote, mode, midiNotes, analyzeSession]);

  const [showLiveAlts, setShowLiveAlts] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // ── UNISON chord lookup map ──

  const unisonChordMap = useMemo(
    () => unisonChordLookup(unisonDoc),
    [unisonDoc],
  );

  // ── Live chord detection (audio or MIDI) ──
  // Built by the same code as the chord cards below, so a chord gets the same
  // colour, lesson links and alternatives whether it's played or written.

  const liveChord = useMemo(
    () => buildLiveChord(activeNotes, rootNote, mode),
    [activeNotes, rootNote, mode],
  );

  // The live chord's label in the chosen notation (hybrid: as above).
  const liveLabels =
    liveChord &&
    liveChordLabels(liveChord, notation, keyContext(rootNote, mode));

  // ── Progression insights (with UNISON enrichment) ──

  const insights = useMemo(() => {
    if (rootNote === null) return [];

    // Prefer stringSeq (manual chord builder), fall back to chordRegions
    // (recording). stringSeq counts from the parent major; the cards count
    // from the key's tonic, like chord regions.
    const source: string[] =
      stringSeq.length > 0
        ? stringSeq.map((key) => ionianToModeLabel(key, mode))
        : chordRegions
            .map((r) => r.degreeKey)
            .filter((k): k is string => k != null);

    if (source.length === 0) return [];

    return buildChordInsights(source, rootNote, mode, unisonChordMap);
  }, [stringSeq, chordRegions, rootNote, mode, unisonChordMap]);

  const hasProgression =
    (stringSeq.length > 0 || chordRegions.length > 0) && rootNote !== null;
  const keyIdx = hasProgression ? ROOT_TO_KEY_INDEX[rootNote] : 0;
  const keyColor: [number, number, number] = hasProgression
    ? KEY_COLORS[keyIdx]
    : [255, 255, 255];

  return (
    <div className="flex flex-col gap-0.5">
      {/* Now Playing — always visible */}
      <div
        className="flex flex-col gap-1.5 px-3 py-2.5 border-b"
        style={{ borderColor: 'var(--daw-hairline)', minHeight: 120 }}
      >
        <div className="flex items-center gap-1.5">
          {liveChord?.color && (
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: liveChord.color }}
            />
          )}
          <span
            className="text-[10px] uppercase tracking-wider font-medium"
            style={{ color: 'var(--daw-accent)' }}
          >
            Now Playing
          </span>
        </div>
        {liveChord ? (
          <>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-semibold"
                style={{ color: 'var(--daw-text)' }}
              >
                {liveLabels?.title}
              </span>
              {liveLabels?.detail && (
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--daw-text-3)' }}
                >
                  {liveLabels.detail}
                </span>
              )}
            </div>
            <ChordTones
              intervals={liveChord.intervals}
              noteNames={liveChord.noteNames}
            />
            {liveChord.chordRootMode && (
              <ChordLessonLinks
                chord={{ ...liveChord, chordRootMode: liveChord.chordRootMode }}
                chordName={liveLabels?.title ?? liveChord.chordLabel}
                keyLetter={keyLetter}
                mode={mode}
              />
            )}
            <ChordAlternatives
              rootLetter={liveChord.rootLetter}
              alternatives={liveChord.alternatives}
              chordName={liveLabels?.title ?? liveChord.chordLabel}
              rootNote={rootNote}
              mode={mode}
              expanded={showLiveAlts}
              onToggleExpand={() => setShowLiveAlts((v) => !v)}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <span
              className="text-[10px]"
              style={{ color: 'var(--daw-text-3)' }}
            >
              Play a chord to see analysis
            </span>
          </div>
        )}
      </div>

      {/* The project's chord symbols: analyze, re-analyze, use */}
      <ChordSymbolsSection />

      {/* Chords selected in the timeline's chord lane */}
      <SelectionAnalysis />

      {/* Unified Key Section + Analyze Button */}
      {hasProgression ? (
        <>
          <KeySection
            keyLetter={keyLetter}
            keyColor={keyColor}
            rootNote={rootNote}
            mode={mode}
            unisonDoc={unisonDoc}
          />

          {/* Chord cards */}
          {insights.map((chord) => (
            <ChordCard
              key={chord.degreeName}
              chord={chord}
              keyLetter={keyLetter}
              rootNote={rootNote}
              mode={mode}
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
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
          <Lightbulb
            size={20}
            strokeWidth={1.5}
            style={{ color: 'var(--daw-text-3)' }}
          />
          <span
            className="text-[10px] leading-relaxed"
            style={{ color: 'var(--daw-text-3)' }}
          >
            Build a chord progression with Prism to see insights here
          </span>
        </div>
      )}

      {/* UNISON Analysis Sections */}
      {unisonError && (
        <div
          className="mx-3 my-2 rounded px-2 py-1.5 text-[9px]"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
          }}
        >
          {unisonError}
        </div>
      )}

      {unisonDoc && <UnisonSections unisonDoc={unisonDoc} />}
    </div>
  );
}
