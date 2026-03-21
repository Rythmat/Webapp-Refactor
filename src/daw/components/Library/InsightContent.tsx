/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable sonarjs/no-duplicated-branches */
/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronDown, Lightbulb } from 'lucide-react';
import { useStore } from '@/daw/store';
import {
  NOTES,
  CHORDS,
  MODES,
  unstepChord,
  degreeMidi,
  generateChord,
  noteNameLetter,
  noteNameInKey,
  detectChordWithInversion,
  KEY_COLORS,
  CHORD_COLORS,
  getChordColor,
  getModeOffset,
  ionianToModeLabel,
} from '@prism/engine';
import { LearnRoutes } from '@/constants/routes';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import { getChordTheory } from './chordTheoryMap';
import type { UnisonChordRegion } from '@/unison/types/schema';
import {
  PARENT_SCALE_INFO,
  FAMILY_INTERVALS,
  FAMILY_MODES,
  MODE_DISPLAY,
  MODE_TO_SLUG,
  ROOT_TO_KEY_INDEX,
  formatQuality,
  degreeToHybrid,
  intervalsToString,
  rgbString,
  findAllInterpretations,
  type ChordInsight,
  type ChordInterpretation,
} from './insightConstants';
import { ChordCard } from './ChordCard';
import { KeySection } from './KeySection';
import { UnisonSections } from './UnisonSections';

// ── Component ────────────────────────────────────────────────────────────

export function InsightContent() {
  const stringSeq = useStore((s) => s.stringSeq);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);
  const audioActiveNotes = useStore((s) => s.audioActiveNotes);

  // Use audio-detected notes when available, else MIDI hardware notes
  const activeNotes = useMemo(() => {
    if (audioActiveNotes.length > 0) return new Set(audioActiveNotes);
    return hwActiveNotes;
  }, [audioActiveNotes, hwActiveNotes]);

  const keyLetter = rootNote !== null ? NOTES[rootNote] : null;

  // UNISON analysis state
  const unisonDoc = useStore((s) => s.unisonDoc);
  const unisonError = useStore((s) => s.unisonError);
  const chordRegions = useStore((s) => s.chordRegions);
  const tracks = useStore((s) => s.tracks);
  const analyzeSession = useStore((s) => s.analyzeSession);

  // Auto-analyze when inputs change (debounced 500ms)
  useEffect(() => {
    const hasMidi = tracks.some(
      (t) => t.type === 'midi' && t.midiClips.some((c) => c.events.length > 0),
    );
    if (!hasMidi && chordRegions.length === 0) return;

    const timer = setTimeout(() => {
      analyzeSession();
    }, 500);

    return () => clearTimeout(timer);
  }, [chordRegions, rootNote, mode, tracks, analyzeSession]);

  const [showLiveAlts, setShowLiveAlts] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // ── UNISON chord lookup map ──

  const unisonChordMap = useMemo(() => {
    if (!unisonDoc) return new Map<string, UnisonChordRegion>();
    const map = new Map<string, UnisonChordRegion>();
    for (const region of unisonDoc.analysis.chordTimeline) {
      if (!map.has(region.hybridName)) {
        map.set(region.hybridName, region);
      }
    }
    return map;
  }, [unisonDoc]);

  // ── Live chord detection (audio or MIDI) ──

  const liveChord = useMemo(() => {
    if (activeNotes.size < 2) return null;

    const sorted = [...activeNotes].sort((a, b) => a - b);
    const match = detectChordWithInversion(sorted);
    if (!match) return null;

    const { quality, rootPc, inversion } = match;
    const rootLetter =
      rootNote !== null
        ? noteNameInKey(rootPc, rootNote)
        : noteNameLetter(rootPc + 48);
    const intervals = CHORDS[quality];

    const INVERSION_LABELS = [
      '',
      '1st Inversion',
      '2nd Inversion',
      '3rd Inversion',
    ];
    const chordLabel =
      inversion > 0
        ? `${rootLetter} ${formatQuality(quality)} (${INVERSION_LABELS[inversion]})`
        : `${rootLetter} ${formatQuality(quality)}`;

    let hybrid: string | null = null;
    let color: string | null = null;
    let sessionMode: string | null = null;
    let chordRootMode: string | null = null;
    let parentKeyLetter: string | null = null;
    let parentMode: string | null = null;
    let isSessionParent = true;
    let alternatives: ChordInterpretation[] = [];

    if (rootNote !== null) {
      const diff = (rootPc - rootNote + 12) % 12;
      const ionian = MODES.ionian;
      let degree = -1;
      let modifier = 0;

      for (let i = 0; i < ionian.length; i++) {
        if (ionian[i] === diff) {
          degree = i + 1;
          break;
        }
      }
      if (degree < 0) {
        let flatDeg = -1,
          sharpDeg = -1;
        for (let i = 0; i < ionian.length; i++) {
          if (ionian[i] === diff + 1 && flatDeg < 0) flatDeg = i + 1;
          if (ionian[i] === diff - 1 && sharpDeg < 0) sharpDeg = i + 1;
        }
        const flatKey = flatDeg > 0 ? `b${flatDeg} ${quality}` : '';
        const sharpKey = sharpDeg > 0 ? `#${sharpDeg} ${quality}` : '';
        if (flatKey && CHORD_COLORS[flatKey] !== undefined) {
          degree = flatDeg;
          modifier = -1;
        } else if (sharpKey && CHORD_COLORS[sharpKey] !== undefined) {
          degree = sharpDeg;
          modifier = 1;
        } else if (flatDeg > 0) {
          degree = flatDeg;
          modifier = -1;
        } else if (sharpDeg > 0) {
          degree = sharpDeg;
          modifier = 1;
        }
      }

      if (degree > 0) {
        const prefix = modifier === -1 ? '\u266D' : modifier === 1 ? '#' : '';
        hybrid = `${prefix}${degree} ${formatQuality(quality)}`;

        const degPrefix = modifier === -1 ? 'b' : modifier === 1 ? '#' : '';
        const degreeName = `${degPrefix}${degree} ${quality}`;
        const rootMidi = rootNote + 48;
        const [r, g, b] = getChordColor(degreeName, rootMidi, mode);
        color = rgbString(r, g, b);

        chordRootMode = getChordTheory(quality).mode;

        const chordModeInfo = PARENT_SCALE_INFO[chordRootMode];
        const chordParentFamily = chordModeInfo?.family ?? 'Ionian';
        const chordParentRootPc = chordModeInfo
          ? (rootPc + chordModeInfo.offset) % 12
          : rootPc;

        const sessionInterval = (rootNote - chordParentRootPc + 12) % 12;
        const chordFamilyIntervals = FAMILY_INTERVALS[chordParentFamily];
        const sessionDegIdx =
          chordFamilyIntervals?.indexOf(sessionInterval) ?? -1;
        sessionMode =
          sessionDegIdx >= 0
            ? (FAMILY_MODES[chordParentFamily]?.[sessionDegIdx] ?? null)
            : null;

        const isChordParent = !chordModeInfo || chordModeInfo.offset === 0;
        isSessionParent = isChordParent || chordParentRootPc === rootNote;
        parentKeyLetter = noteNameInKey(chordParentRootPc, rootNote);
        parentMode = FAMILY_MODES[chordParentFamily]?.[0] ?? chordRootMode;

        const allInterps = findAllInterpretations(degreeName);
        alternatives = allInterps.filter(
          (i) => i.chordRootMode !== chordRootMode,
        );
      }
    }

    return {
      chordLabel,
      hybrid,
      rootLetter,
      noteNames: sorted.map((n) => noteNameInKey(n % 12, rootNote ?? 0)),
      intervals: intervals ? intervalsToString(intervals) : '',
      color,
      sessionMode,
      chordRootMode,
      parentKeyLetter,
      parentMode,
      isSessionParent,
      alternatives,
    };
  }, [activeNotes, rootNote, mode]);

  // ── Progression insights (with UNISON enrichment) ──

  const insights = useMemo(() => {
    if (rootNote === null) return [];

    // Prefer stringSeq (manual chord builder), fall back to chordRegions (recording)
    const source: string[] =
      stringSeq.length > 0
        ? stringSeq
        : chordRegions
            .map((r) => r.degreeKey)
            .filter((k): k is string => k != null);

    if (source.length === 0) return [];

    const rootMidi = rootNote + 48;
    const seen = new Set<string>();
    const results: ChordInsight[] = [];

    for (const degreeName of source) {
      if (seen.has(degreeName)) continue;
      seen.add(degreeName);

      const quality = unstepChord(degreeName);
      const parentRoot = rootMidi - getModeOffset(mode);
      const bassMidi = degreeMidi(parentRoot, degreeName);
      const pitchedNotes = generateChord(bassMidi, quality);
      const noteNames = pitchedNotes.map((n) =>
        noteNameInKey(n % 12, rootNote),
      );
      const rootLetter = noteNameInKey(bassMidi % 12, rootNote);
      const intervals = CHORDS[quality];

      const [r, g, b] = getChordColor(degreeName, parentRoot);

      const chordRootPc = bassMidi % 12;
      const chordRootMode = getChordTheory(quality).mode;

      const chordModeInfo = PARENT_SCALE_INFO[chordRootMode];
      const chordParentFamily = chordModeInfo?.family ?? 'Ionian';
      const chordParentRootPc = chordModeInfo
        ? (chordRootPc + chordModeInfo.offset) % 12
        : chordRootPc;

      const sessionInterval = (rootNote - chordParentRootPc + 12) % 12;
      const chordFamilyIntervals = FAMILY_INTERVALS[chordParentFamily];
      const sessionDegIdx =
        chordFamilyIntervals?.indexOf(sessionInterval) ?? -1;
      const sessionMode =
        sessionDegIdx >= 0
          ? (FAMILY_MODES[chordParentFamily]?.[sessionDegIdx] ?? null)
          : null;

      const isChordParent = !chordModeInfo || chordModeInfo.offset === 0;
      const isSessionParent = isChordParent || chordParentRootPc === rootNote;
      const parentKeyLetter = noteNameInKey(chordParentRootPc, rootNote);
      const parentMode = FAMILY_MODES[chordParentFamily]?.[0] ?? chordRootMode;

      const allInterps = findAllInterpretations(degreeName);
      const alternatives = allInterps.filter(
        (i) => i.chordRootMode !== chordRootMode,
      );

      // UNISON enrichment lookup
      const unisonRegion = unisonChordMap.get(degreeName);

      results.push({
        degreeName: ionianToModeLabel(degreeName, mode),
        hybrid: degreeToHybrid(ionianToModeLabel(degreeName, mode)),
        quality,
        chordLabel: `${rootLetter} ${formatQuality(quality)}`,
        rootLetter,
        noteNames,
        intervals: intervals ? intervalsToString(intervals) : '',
        color: rgbString(r, g, b),
        sessionMode,
        chordRootMode,
        parentKeyLetter,
        parentMode,
        isSessionParent,
        description: getChordTheory(quality).description,
        alternatives,
        // UNISON fields
        romanNumeral: unisonRegion?.romanNumeral,
        isDiatonic: unisonRegion?.isDiatonic,
        modalInterchange: unisonRegion?.modalInterchange,
        sourceMode: unisonRegion?.sourceMode,
      });
    }

    return results;
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
        style={{ borderColor: 'var(--color-border)', minHeight: 120 }}
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
            style={{ color: 'var(--color-accent)' }}
          >
            Now Playing
          </span>
        </div>
        {liveChord ? (
          <>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {liveChord.chordLabel}
              </span>
              {liveChord.hybrid && (
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {liveChord.hybrid}
                </span>
              )}
            </div>
            {liveChord.intervals && (
              <div className="flex gap-1 flex-wrap">
                {liveChord.intervals.split(' ').map((interval, i) => (
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
            <div
              className="text-[9px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Notes: {liveChord.noteNames.join(' \u2013 ')}
            </div>
            {liveChord.chordRootMode && (
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                <Link
                  to={LearnRoutes.lesson({
                    mode:
                      MODE_TO_SLUG[liveChord.chordRootMode] ??
                      liveChord.chordRootMode,
                    key: keyLabelToUrlParam(liveChord.rootLetter),
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
                  {liveChord.rootLetter}{' '}
                  {MODE_DISPLAY[liveChord.chordRootMode] ??
                    liveChord.chordRootMode}
                </Link>
                {liveChord.sessionMode &&
                  keyLetter &&
                  !(
                    liveChord.sessionMode === liveChord.chordRootMode &&
                    liveChord.rootLetter === keyLetter
                  ) && (
                    <Link
                      to={LearnRoutes.lesson({
                        mode:
                          MODE_TO_SLUG[liveChord.sessionMode] ??
                          liveChord.sessionMode,
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
                      {keyLetter}{' '}
                      {MODE_DISPLAY[liveChord.sessionMode] ??
                        liveChord.sessionMode}
                    </Link>
                  )}
                {!liveChord.isSessionParent &&
                  liveChord.parentKeyLetter &&
                  liveChord.parentMode && (
                    <Link
                      to={LearnRoutes.lesson({
                        mode:
                          MODE_TO_SLUG[liveChord.parentMode] ??
                          liveChord.parentMode,
                        key: keyLabelToUrlParam(liveChord.parentKeyLetter),
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
                      Parent: {liveChord.parentKeyLetter}{' '}
                      {MODE_DISPLAY[liveChord.parentMode] ??
                        liveChord.parentMode}
                    </Link>
                  )}
              </div>
            )}
            {liveChord.alternatives.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                <button
                  type="button"
                  onClick={() => setShowLiveAlts((v) => !v)}
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
                      transform: showLiveAlts
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
                    }}
                  />
                  Also found in {liveChord.alternatives.length} scale
                  {liveChord.alternatives.length > 1 ? 's' : ''}
                </button>
                {showLiveAlts &&
                  liveChord.alternatives.map((alt, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 pl-3 text-[9px] leading-snug"
                      style={{ color: 'var(--color-text-dim)', opacity: 0.7 }}
                    >
                      <span>
                        {liveChord.rootLetter}{' '}
                        {MODE_DISPLAY[alt.chordRootMode] ?? alt.chordRootMode}
                        {' \u00B7 '}
                        {noteNameInKey(
                          (rootNote! - alt.parentOffset + 12) % 12,
                          rootNote!,
                        )}{' '}
                        {MODE_DISPLAY[FAMILY_MODES[alt.family]?.[0]] ??
                          alt.family}
                      </span>
                      <Link
                        to={LearnRoutes.lesson({
                          mode:
                            MODE_TO_SLUG[alt.chordRootMode] ??
                            alt.chordRootMode,
                          key: keyLabelToUrlParam(liveChord.rootLetter),
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
                  ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Play a chord to see analysis
            </span>
          </div>
        )}
      </div>

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
            style={{ color: 'var(--color-text-dim)' }}
          />
          <span
            className="text-[10px] leading-relaxed"
            style={{ color: 'var(--color-text-dim)' }}
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
