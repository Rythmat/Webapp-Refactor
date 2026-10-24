import { useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import {
  PromptPillButton,
  RAINBOW_STOPS,
} from '@/components/promptBox/PromptBoxParts';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/components/utilities';
import { chordLabels } from '@/daw/harmony/chordLabels';
import { useEffectiveKey } from '@/daw/harmony/effectiveKey';
import { keyFrame } from '@/daw/harmony/keyFrame';
import { useStore, type AllSlices } from '@/daw/store';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import { ionianToModeLabel } from '@prism/engine';
import { useChordNotation } from '@/lib/chordNotation';
import { keyContext, liveChordLabels } from './insightNotation';
import {
  buildChordInsights,
  buildLiveChord,
  chordMatchKey,
  selectionChordInsights,
  unisonChordLookup,
} from './buildChordInsights';
import {
  ChordAlternatives,
  ChordCard,
  ChordLessonLinks,
  ChordTones,
} from './ChordCard';
import { INSIGHT_DIM, INSIGHT_TEXT, InsightCard } from './InsightCard';
import { SelectionAnalysis } from './SelectionAnalysis';
import { UnisonSections } from './UnisonSections';
import './insight.css';

// ── The rainbow sweep (insight.css) ───────────────────────────────────────
// The prompt box's rainbow writes Insight's text in each time the panel opens
// and on each Re-analyze, as it reads the song again (owner, 2026-10-24).

/** What the sweep runs through: text, colour dots, arrows, pills. */
const SWEPT = '.insight-ink, .insight-mark, .insight-dot, .insight-pill';
/** The panel's rainbow: the stops for the text, a colour each for marks. */
const RAINBOW_VARS = {
  '--insight-rainbow': RAINBOW_STOPS,
  ...Object.fromEntries(KEY_RAINBOW_COLORS.map((c, i) => [`--rb-${i}`, c])),
} as CSSProperties;

/** How long one line takes to write in (insight.css). */
const LINE_MS = 1100;
/** The wait between one line and the next as the rainbow runs down. */
const STEP_MS = 55;
/** The lines out of view below wait no longer than this. */
const MAX_DELAY_MS = 2400;
const sweepListeners = new Set<() => void>();

/** Run the sweep over the open Insight panel. */
function sweepInsight() {
  sweepListeners.forEach((run) => run());
}

/**
 * Each line's turn, top to bottom and left to right on a row: a card's
 * name and its chord, then Intervals, Notes, the Mode and Parent scale
 * labels, their lessons, "Also found in", then the next card.
 */
function stagger(el: HTMLElement): number {
  const lines = [...el.querySelectorAll<HTMLElement>(SWEPT)]
    .map((line) => {
      const box = line.getBoundingClientRect();
      // Rows by their middles, so a dot or an arrow shares its text's row.
      return {
        line,
        row: Math.round((box.top + box.bottom) / 2 / 8),
        x: box.left,
      };
    })
    .sort((a, b) => a.row - b.row || a.x - b.x);
  let last = 0;
  lines.forEach(({ line }, i) => {
    last = Math.min(i * STEP_MS, MAX_DELAY_MS);
    line.style.animationDelay = `${last}ms`;
  });
  return last;
}

/** Whether the song has anything to read: notes, or chords in the lane. */
function hasMusic(s: AllSlices): boolean {
  return (
    s.chordRegions.length > 0 ||
    s.tracks.some(
      (t) => t.type === 'midi' && t.midiClips.some((c) => c.events.length > 0),
    )
  );
}

/**
 * Read the song again — on each open of Insight and on Re-analyze — and the
 * chords picked (a selection whose analysis is cleared is read again), then
 * sweep the rainbow over what it found, once React has drawn it.
 */
function reanalyzeInsight() {
  const s = useStore.getState();
  if (hasMusic(s)) s.analyzeSession();
  s.clearSelectionAnalysis();
  requestAnimationFrame(() => requestAnimationFrame(sweepInsight));
}

/** The sweep on the element `ref` holds, when sweepInsight asks. */
function useInsightSweep(ref: RefObject<HTMLElement>) {
  const reduce = !!useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    let timer = 0;
    const settle = () => {
      el.classList.remove('insight-sweep');
      el.querySelectorAll<HTMLElement>(SWEPT).forEach((line) => {
        line.style.animationDelay = '';
      });
    };
    const run = () => {
      // Off, a reflow, on: the animation starts over each time.
      settle();
      const last = stagger(el);
      void el.offsetWidth;
      el.classList.add('insight-sweep');
      window.clearTimeout(timer);
      // Then the text goes back to its own colours.
      timer = window.setTimeout(settle, last + LINE_MS + 200);
    };
    sweepListeners.add(run);
    return () => {
      sweepListeners.delete(run);
      window.clearTimeout(timer);
      settle();
    };
  }, [ref, reduce]);
}

// ── Component ────────────────────────────────────────────────────────────

/**
 * Re-analyze, in the Inspector's header beside Insight's name and its close
 * (owner, 2026-10-24): Insight reads on its own, so this only asks again —
 * the song now, and the chords picked (a selection whose analysis is
 * cleared is read again).
 */
export function InsightReanalyzeButton() {
  const canAnalyze = useStore(hasMusic);
  if (!canAnalyze) return null;
  return (
    <PromptPillButton
      variant="ghost"
      data-testid="insight-reanalyze"
      className="gap-1.5 px-2.5"
      onClick={reanalyzeInsight}
    >
      <RefreshCw aria-hidden className="size-3.5" />
      Re-analyze
    </PromptPillButton>
  );
}

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

  const sweepRef = useRef<HTMLDivElement>(null);
  useInsightSweep(sweepRef);

  // Each time Insight opens it reads the song afresh (owner, 2026-10-24),
  // so it never shows an analysis older than the chord lane and the Score.
  useEffect(() => {
    reanalyzeInsight();
  }, []);

  // While it's open, changes are read with no click (debounced 500ms):
  // chords generated, recorded or edited. The open's own read stands for
  // the first round.
  const canAnalyze =
    midiNotes.some((events) => events.length > 0) || chordRegions.length > 0;
  const opened = useRef(true);
  useEffect(() => {
    if (opened.current) {
      opened.current = false;
      return;
    }
    if (!canAnalyze) return;
    const timer = setTimeout(() => {
      analyzeSession();
    }, 500);

    return () => clearTimeout(timer);
  }, [canAnalyze, chordRegions, rootNote, mode, midiNotes, analyzeSession]);

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

  // The cards read the chord lane — the chords the Score and the lead sheet
  // write too — so the three always show the same chords (owner,
  // 2026-10-24). Prism's old chord builder sequence (stringSeq) stands in
  // only while the lane is empty. They're read in the song's key, or, with
  // none set, the key the notes suggest, as the rest of the Studio does
  // (effectiveKey); the lane names chords by letter until then.
  const effectiveKey = useEffectiveKey();
  const unisonKey = unisonDoc?.analysis.key;
  const cardKey =
    effectiveKey ??
    (unisonKey ? { rootPc: unisonKey.rootPc, mode: unisonKey.mode } : null);
  const cardRoot = cardKey?.rootPc ?? null;
  const cardMode = cardKey?.mode ?? mode;
  const lanesKey = rootNote !== null;

  const insights = useMemo(() => {
    if (cardRoot === null) return [];

    // A region keeps its degree in the song's key. One that came without one
    // (the prompt box's chords, written before the song had a key), or a
    // song with no key of its own, is placed in the key from its identity,
    // so every chord in the lane gets its card.
    const frame = keyFrame(cardRoot, cardMode);
    const fromLane = chordRegions
      .map(
        (r) =>
          (lanesKey ? r.degreeKey : undefined) ??
          (r.identity ? chordLabels(r.identity, frame).degreeKey : undefined),
      )
      .filter((k): k is string => k != null);
    // stringSeq counts from the parent major; the cards count from the
    // key's tonic, like chord regions.
    const source =
      chordRegions.length > 0
        ? fromLane
        : stringSeq.map((key) => ionianToModeLabel(key, cardMode));

    if (source.length === 0) return [];

    return buildChordInsights(source, cardRoot, cardMode, unisonChordMap);
  }, [stringSeq, chordRegions, cardRoot, cardMode, lanesKey, unisonChordMap]);

  // Notes picked (the dock's Analyze, a ⌘-drag) that make a chord the
  // song's cards already show light that card, rather than drawing it again
  // under the selection (owner, 2026-10-24).
  const selectionDoc = useStore((s) => s.selectionAnalysis?.doc ?? null);
  const songChords = useMemo(
    () => new Set(insights.map(chordMatchKey)),
    [insights],
  );
  const picked = useMemo(
    () =>
      new Set(
        selectionDoc
          ? selectionChordInsights(selectionDoc).map(chordMatchKey)
          : [],
      ),
    [selectionDoc],
  );

  const hasProgression = insights.length > 0;

  return (
    <div
      ref={sweepRef}
      className="flex flex-col gap-2 p-2"
      style={RAINBOW_VARS}
    >
      {/* The held chord's details (tones, lessons, alternatives) while one
          is held: Now Playing itself lives over the track list, in the
          track column's corner (NowPlaying, 2026-10-21). */}
      {liveChord ? (
        <InsightCard
          active
          title="Now playing"
          dot={liveChord.color ?? undefined}
        >
          <div className="flex items-baseline gap-2">
            <span className={cn(INSIGHT_TEXT, 'font-medium')}>
              {liveLabels?.title}
            </span>
            {liveLabels?.detail && (
              <span className={INSIGHT_DIM}>{liveLabels.detail}</span>
            )}
          </div>
          <ChordTones
            intervals={liveChord.intervals}
            noteNames={liveChord.noteNames}
          />
          {liveChord.chordRootMode && (
            <ChordLessonLinks
              chord={{
                ...liveChord,
                chordRootMode: liveChord.chordRootMode,
              }}
              chordName={liveLabels?.title ?? liveChord.chordLabel}
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
        </InsightCard>
      ) : null}

      {/* Chords selected in the timeline's chord lane */}
      <SelectionAnalysis shownElsewhere={songChords} />

      {/* The song's chords, one card each (the key card went, owner
          2026-10-24: the song's key is in the bottom bar's song controls) */}
      {hasProgression ? (
        <>
          {/* Chord cards */}
          {insights.map((chord) => (
            <ChordCard
              key={chord.degreeName}
              chord={chord}
              highlighted={picked.has(chordMatchKey(chord))}
              rootNote={cardRoot}
              mode={cardMode}
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
        <InsightCard className="items-center px-6 py-8 text-center">
          <Lightbulb
            aria-hidden
            className="insight-mark size-5 text-white/40"
          />
          <p className={INSIGHT_DIM}>
            Play, record or create chords and Insight reads them here.
          </p>
        </InsightCard>
      )}

      {/* UNISON Analysis Sections */}
      {unisonError && (
        <div
          role="alert"
          className="rounded-[14px] bg-red-500/10 px-3 py-2 text-[13px] leading-5 text-red-300"
        >
          {unisonError}
        </div>
      )}

      {unisonDoc && <UnisonSections unisonDoc={unisonDoc} />}
    </div>
  );
}
