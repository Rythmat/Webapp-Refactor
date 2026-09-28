// ── useGuitarLessonEvaluation ──────────────────────────────────────────────
// How a guitar lesson hears the student. The container runs the same step
// state machine for piano and guitar; for guitar this hook replaces its three
// piano input effects (MIDI note capture, out-of-time holds, in-time note
// blocks) and hands back the same kind of state — noteHoldMeta,
// performanceMeta, the notes/chords played — plus the scoring policy for
// assess().
//
// Two kinds of step:
//  - notes (scales, melodies, arpeggios): single notes, matched by pitch —
//    exactly from a MIDI guitar, octave-tolerant from a microphone;
//  - chords (every strummed step): judged by chord IDENTITY — the pitch
//    classes heard — through the Studio chord detector for audio or the held
//    notes of a MIDI guitar, so any voicing of the right chord counts and a
//    detector naming a correct Cmaj7 "C" (or Am7 "C6") is not a miss.
//
// Out of time a guitar can't signal "release" the way a key does (strings
// ring and fade), so a target completes once it has been heard long enough
// (plan D7), not on release; the next chord needs a fresh strum.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type { NoteHoldMeta } from '@/curriculum/components/GenrePianoRoll';
import {
  chordRootName,
  getGuitarShape,
  isGuitarKeyName,
} from '@/curriculum/data/guitar/bookOne';
import { theoryString } from '@/curriculum/data/guitar/theoryNotes';
import type {
  GenreNoteEvent,
  LessonNoteEvent,
} from '@/curriculum/engine/genreGeneration/resolveStepContent';
import type {
  AssessmentPolicy,
  UserChordEvent,
} from '@/curriculum/hooks/useGenreAssessment';
import type {
  ActivityStepV2,
  ChordTarget,
} from '@/curriculum/types/activity.v2';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import {
  IDENTITY_MATCH,
  IDENTITY_PASS,
  chordIdentityScore,
  chordToneDiagnostics,
  pitchClassName,
} from '@/learn/audio/guitar/chordIdentity';
import { guitarNoteOff, guitarNoteOn } from '@/learn/audio/guitar/guitarVoice';
import type {
  GuitarChordEvent,
  GuitarInputSource,
} from '@/learn/audio/guitar/types';
import { diagnoseChord } from '@/lib/guitar/theory/diagnostics';
import type { GuitarStringNumber } from '@/lib/guitar/types';

type ActivityState = 'preview' | 'practice' | 'performance' | 'complete';

/** In time, a strum/note this close before a target's onset still counts. */
const EARLY_WINDOW_TICKS = 240;
/** Out of time, how long a match must sound before it completes (D7). */
const CHORD_HOLD_CAP_MS = 1000;
const NOTE_HOLD_CAP_MS = 300;
/** Out-of-time holds are judged at the same 100 BPM the piano path uses. */
const MS_PER_TICK_AT_100 = (60 / 100 / 480) * 1000;

export type GuitarStepKind = 'notes' | 'chords';

export interface HeardChord {
  label: string;
  confidence: number;
  matchesCurrent: boolean;
}

export interface GuitarLessonDiagnostics {
  missingPcs: number[];
  extraPcs: number[];
  /**
   * One thing to try, from the chord-tone rules (lib/guitar/theory
   * diagnostics): display only, it never changes the score.
   */
  hint?: string;
  /** The ChordBox dots (or X markers) the hint points at. */
  ringStrings?: GuitarStringNumber[];
}

/** Sharps and flats in a note name as they print (Bb → B♭). */
const printNote = (value: string | number) =>
  typeof value === 'string' && /^[A-G][#b]*$/.test(value)
    ? value.replace(/#/g, '♯').replace(/b/g, '♭')
    : value;

/**
 * The chord-tone rules' hint for a strum of `target` that wasn't it, from
 * the book shape the step asks for. Null when the shape isn't in the book
 * data or no rule has anything to say.
 */
export function chordHint(
  target: ChordTarget,
  heard: Pick<GuitarChordEvent, 'rootPc' | 'quality' | 'chroma' | 'midis'>,
): Pick<GuitarLessonDiagnostics, 'hint' | 'ringStrings'> | null {
  const shape = getGuitarShape(target.shapeId);
  const key = target.shapeId.split('/')[0];
  if (!shape || !isGuitarKeyName(key)) return null;
  const diagnosis = diagnoseChord({
    target: {
      rootName: chordRootName(key, shape.degree),
      quality: shape.quality,
      frets: shape.frets,
    },
    label: heard.quality
      ? { rootPc: heard.rootPc, quality: heard.quality }
      : null,
    chroma: heard.chroma ?? null,
    bassMidi: heard.midis?.[0] ?? null,
  });
  if (!diagnosis.hintId) return null;
  const tokens = Object.fromEntries(
    Object.entries(diagnosis.tokens).map(([k, v]) => [k, printNote(v)]),
  );
  return {
    hint: theoryString(diagnosis.hintId, tokens),
    ringStrings: diagnosis.ringStrings,
  };
}

export interface GuitarLessonEvaluationInput {
  enabled: boolean;
  /** The resolved step (targetNotes, chordTargets). */
  step: ActivityStepV2;
  /** Roll events (in time shifted by countInOffset). */
  events: LessonNoteEvent[];
  isIT: boolean;
  activityState: ActivityState;
  activityStateRef: MutableRefObject<ActivityState>;
  /** Changes whenever a run, step or section starts over. */
  resetKey: string;
  /** Roll ticks = target ticks + this (in time). */
  countInOffset: number;
  currentTickRef: MutableRefObject<number>;
  /** Roll tick of "now" as the student hears it (MIDI echo path). */
  soundingTicks: () => number | null;
  /** Roll tick of a past moment (audio events carry their attack time). */
  heardTicksAt?: (perfMs: number) => number | null;
  /** The container's completion set; its auto-complete effect reads it. */
  completedEventIdsRef: MutableRefObject<Set<string>>;
  /** Ask the container to re-check completion / re-render hold meta. */
  onProgress: () => void;
  subscribeNoteOn: (cb: (event: MidiNoteEvent) => void) => () => void;
  subscribeNoteOff: (cb: (event: MidiNoteEvent) => void) => () => void;
  subscribeChord?: (cb: (event: GuitarChordEvent) => void) => () => void;
  /** Lesson key root (MIDI or pitch class), for spelling. */
  keyRoot: number;
  /** The app is sounding its own guitar; ignore input meanwhile. */
  suppressInput: boolean;
}

export interface GuitarLessonEvaluation {
  stepKind: GuitarStepKind;
  /** Notes sounding from the student (for the visuals). Empty for audio chords. */
  activeMidis: number[];
  /** Notes played this run, roll ticks (for the roll/TAB colouring). */
  userNotes: GenreNoteEvent[];
  noteHoldMeta: Record<string, NoteHoldMeta>;
  performanceMeta: Record<string, { startTick: number; endTick?: number }>;
  heardChord: HeardChord | null;
  /** For the current chord, after a strum that wasn't it. */
  diagnostics: GuitarLessonDiagnostics | null;
  /** Strums/notes heard this run that couldn't be judged. */
  unclearCount: number;
  /** Where the input came from last (drives exact vs tolerant matching). */
  lastSource: GuitarInputSource | null;
  /** The assess() policy for the run just finished. */
  buildPolicy: () => AssessmentPolicy;
}

interface ChordGroup {
  /** Index into step.chordTargets. */
  targetIndex: number;
  target: ChordTarget;
  /** Roll tick of the strum. */
  rollTick: number;
  eventIds: string[];
}

interface NoteGroup {
  rollTick: number;
  /** Indexes into step.targetNotes, same order as events. */
  targetIndexes: number[];
  eventIds: string[];
  midis: number[];
}

const QUALITY_SHORT: Record<string, string> = {
  major: '',
  minor: 'm',
  major7: 'maj7',
  minor7: 'm7',
  dominant7: '7',
  minor7b5: 'm7♭5',
  diminished: '°',
  '5': '5',
  sus2: 'sus2',
  sus4: 'sus4',
};

function chordLabel(rootPc: number, quality: string, keyRoot: number): string {
  return `${pitchClassName(rootPc, keyRoot)}${QUALITY_SHORT[quality] ?? quality}`;
}

/** Same pitch, or (audio) the same note an octave either way. */
function pitchMatches(
  played: number,
  target: number,
  source: GuitarInputSource,
): boolean {
  if (played === target) return true;
  return source === 'audio' && Math.abs(played - target) === 12;
}

/** A tone counts as sounding at this share of the other chord tones' median. */
const CHROMA_TONE_RATIO = 0.35;

/**
 * The pitch classes a strum really sounded. The Studio detector prefers the
 * simpler chord on a root, so a correct Cmaj7 can arrive named "C" (spec D2);
 * a target tone missing from the name still counts when the chroma shows it
 * about as loud as the chord's other tones.
 */
export function heardPitchClasses(
  event: Pick<GuitarChordEvent, 'pcs' | 'chroma'>,
  targetPcs: readonly number[],
): number[] {
  const { pcs, chroma } = event;
  if (!chroma) return pcs;
  const named = new Set(pcs);
  const missing = targetPcs.filter((pc) => !named.has(pc));
  if (missing.length === 0 || missing.length === targetPcs.length) return pcs;
  const others = targetPcs
    .filter((pc) => named.has(pc))
    .map((pc) => chroma[pc])
    .sort((a, b) => a - b);
  const median = others[Math.floor(others.length / 2)] ?? 0;
  if (median <= 0) return pcs;
  const heard = missing.filter(
    (pc) => chroma[pc] >= CHROMA_TONE_RATIO * median,
  );
  return heard.length ? [...pcs, ...heard].sort((a, b) => a - b) : pcs;
}

export function classifyGuitarStep(step: ActivityStepV2): GuitarStepKind {
  const targets = step.chordTargets ?? [];
  return targets.length > 0 && targets.every((t) => t.attack === 'strum')
    ? 'chords'
    : 'notes';
}

export function useGuitarLessonEvaluation(
  input: GuitarLessonEvaluationInput,
): GuitarLessonEvaluation {
  const {
    enabled,
    step,
    events,
    isIT,
    activityState,
    activityStateRef,
    resetKey,
    countInOffset,
    currentTickRef,
    soundingTicks,
    heardTicksAt,
    completedEventIdsRef,
    onProgress,
    subscribeNoteOn,
    subscribeNoteOff,
    subscribeChord,
    keyRoot,
    suppressInput,
  } = input;

  const stepKind = classifyGuitarStep(step);
  const chordTargets = useMemo(() => step.chordTargets ?? [], [step]);

  // Onset groups on the roll timeline: the chord (or note) to play at each
  // moment, with the roll events it covers.
  const chordGroups = useMemo<ChordGroup[]>(() => {
    if (stepKind !== 'chords') return [];
    return chordTargets.map((target, targetIndex) => {
      const rollTick = target.onsetTick + (isIT ? countInOffset : 0);
      return {
        targetIndex,
        target,
        rollTick,
        eventIds: events
          .filter((e) => e.startTicks === rollTick)
          .map((e) => e.id),
      };
    });
  }, [stepKind, chordTargets, events, isIT, countInOffset]);

  const noteGroups = useMemo<NoteGroup[]>(() => {
    if (stepKind !== 'notes') return [];
    const byTick = new Map<number, NoteGroup>();
    events.forEach((e, i) => {
      const group = byTick.get(e.startTicks) ?? {
        rollTick: e.startTicks,
        targetIndexes: [],
        eventIds: [],
        midis: [],
      };
      group.targetIndexes.push(i);
      group.eventIds.push(e.id);
      group.midis.push(e.midi ?? 0);
      byTick.set(e.startTicks, group);
    });
    return [...byTick.values()].sort((a, b) => a.rollTick - b.rollTick);
  }, [stepKind, events]);

  // ── Run state (refs: written from input callbacks) ─────────────────────
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const [userNotes, setUserNotes] = useState<GenreNoteEvent[]>([]);
  const [heardChord, setHeardChord] = useState<HeardChord | null>(null);
  const [diagnostics, setDiagnostics] =
    useState<GuitarLessonDiagnostics | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => {
    setVersion((v) => v + 1);
    onProgress();
  }, [onProgress]);

  // Strums by source and id: MIDI and the microphone each count from 1.
  const userChordsRef = useRef<(UserChordEvent & { strumId: string })[]>([]);
  const performanceRef = useRef<
    Record<string, { startTick: number; endTick?: number }>
  >({});
  const unclearTargetsRef = useRef<Set<number>>(new Set());
  const unclearCountRef = useRef(0);
  const lastSourceRef = useRef<GuitarInputSource | null>(null);
  // Out of time: the match being held, and the strum that last completed.
  const holdRef = useRef<{
    key: string;
    startMs: number;
    strumId: string | null;
  } | null>(null);
  const lastCompletedStrumRef = useRef<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteStartsRef = useRef<Map<number, number>>(new Map());

  const clearHoldTimer = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  // Everything starts over with each run, step or section.
  useEffect(() => {
    if (!enabled) return;
    userChordsRef.current = [];
    performanceRef.current = {};
    unclearTargetsRef.current = new Set();
    unclearCountRef.current = 0;
    holdRef.current = null;
    lastCompletedStrumRef.current = null;
    noteStartsRef.current.clear();
    clearHoldTimer();
    setActiveMidis([]);
    setUserNotes([]);
    setHeardChord(null);
    setDiagnostics(null);
    setVersion((v) => v + 1);
  }, [resetKey, enabled]);

  useEffect(() => clearHoldTimer, []);

  const isLive = () => {
    const state = activityStateRef.current;
    return state === 'practice' || state === 'performance';
  };

  /** The first chord / note group not yet completed (out of time). */
  const currentChordGroup = useCallback(
    () =>
      chordGroups.find(
        (g) =>
          g.eventIds.length > 0 &&
          !g.eventIds.every((id) => completedEventIdsRef.current.has(id)),
      ) ?? null,
    [chordGroups, completedEventIdsRef],
  );
  const currentNoteGroup = useCallback(
    () =>
      noteGroups.find(
        (g) => !g.eventIds.every((id) => completedEventIdsRef.current.has(id)),
      ) ?? null,
    [noteGroups, completedEventIdsRef],
  );

  /** The chord group due at a roll tick (in time). */
  const chordGroupAt = useCallback(
    (tick: number) => {
      let due: ChordGroup | null = null;
      for (const g of chordGroups) {
        if (g.rollTick - EARLY_WINDOW_TICKS <= tick) due = g;
      }
      return due;
    },
    [chordGroups],
  );

  const completeGroup = useCallback(
    (eventIds: string[]) => {
      for (const id of eventIds) completedEventIdsRef.current.add(id);
      bump();
    },
    [completedEventIdsRef, bump],
  );

  /** Out of time: complete `eventIds` once the match has lasted `holdMs`. */
  const startHold = useCallback(
    (key: string, strumId: string | null, holdMs: number, ids: string[]) => {
      if (holdRef.current?.key === key) return;
      holdRef.current = { key, startMs: performance.now(), strumId };
      clearHoldTimer();
      holdTimerRef.current = setTimeout(() => {
        if (holdRef.current?.key !== key || !isLive()) return;
        holdRef.current = null;
        lastCompletedStrumRef.current = strumId;
        completeGroup(ids);
      }, holdMs);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isLive reads a ref
    [completeGroup],
  );

  const cancelHold = () => {
    holdRef.current = null;
    clearHoldTimer();
  };

  const rollTickFor = useCallback(
    (source: GuitarInputSource, onsetPerfMs?: number) => {
      const tick =
        source === 'audio' && onsetPerfMs !== undefined && heardTicksAt
          ? heardTicksAt(onsetPerfMs)
          : soundingTicks();
      return tick ?? currentTickRef.current;
    },
    [heardTicksAt, soundingTicks, currentTickRef],
  );

  // ── Notes ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const unsubOn = subscribeNoteOn((event) => {
      if (!isLive() || event.velocity === 0) return;
      const source: GuitarInputSource = event.source ?? 'midi';
      if (source === 'midi') guitarNoteOn(event.number, event.velocity);
      if (suppressInput && source === 'audio') return;
      lastSourceRef.current = source;
      const midi = event.number;
      setActiveMidis((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
      if (stepKind !== 'notes') return;

      const tick = rollTickFor(
        source,
        (event as MidiNoteEvent & { onsetPerfMs?: number }).onsetPerfMs,
      );
      noteStartsRef.current.set(midi, tick);
      setUserNotes((prev) => [
        ...prev,
        {
          midi,
          onset: Math.max(0, tick),
          duration: 0,
          velocity: event.velocity,
        },
      ]);

      if (isIT) {
        const hit = events.find(
          (e) =>
            pitchMatches(midi, e.midi ?? 0, source) &&
            e.startTicks - EARLY_WINDOW_TICKS <= tick &&
            tick < e.startTicks + e.durationTicks &&
            !performanceRef.current[e.id],
        );
        if (hit) {
          performanceRef.current[hit.id] = { startTick: tick };
          bump();
        }
        return;
      }

      // Out of time: the note must be in the current group; it completes
      // once it has sounded long enough.
      const group = currentNoteGroup();
      if (!group) return;
      const matchIdx = group.midis.findIndex((m) =>
        pitchMatches(midi, m, source),
      );
      if (matchIdx < 0) return;
      const eventId = group.eventIds[matchIdx];
      const event0 = events.find((e) => e.id === eventId);
      const holdMs = Math.min(
        0.8 * (event0?.durationTicks ?? 480) * MS_PER_TICK_AT_100,
        NOTE_HOLD_CAP_MS,
      );
      startHold(`note:${eventId}`, null, holdMs, [eventId]);
    });

    const unsubOff = subscribeNoteOff((event) => {
      const source: GuitarInputSource = event.source ?? 'midi';
      if (source === 'midi') guitarNoteOff(event.number);
      if (!isLive()) return;
      const midi = event.number;
      setActiveMidis((prev) => prev.filter((m) => m !== midi));
      if (stepKind !== 'notes') return;
      const tick = rollTickFor(source);
      setUserNotes((prev) =>
        prev.map((n) =>
          n.midi === midi && n.duration === 0
            ? { ...n, duration: Math.max(1, tick - n.onset) }
            : n,
        ),
      );
      if (isIT) {
        for (const [id, meta] of Object.entries(performanceRef.current)) {
          const e = events.find((ev) => ev.id === id);
          if (
            meta.endTick === undefined &&
            e &&
            pitchMatches(midi, e.midi ?? 0, source)
          ) {
            performanceRef.current[id] = { ...meta, endTick: tick };
          }
        }
        bump();
      } else if (holdRef.current?.key.startsWith('note:')) {
        // Released before it counted: start that note over.
        const heldId = holdRef.current.key.slice('note:'.length);
        const held = events.find((e) => e.id === heldId);
        if (held && pitchMatches(midi, held.midi ?? 0, source)) cancelHold();
      }
    });

    return () => {
      unsubOn();
      unsubOff();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isLive/cancelHold read refs
  }, [
    enabled,
    subscribeNoteOn,
    subscribeNoteOff,
    stepKind,
    isIT,
    events,
    rollTickFor,
    currentNoteGroup,
    startHold,
    bump,
    suppressInput,
  ]);

  // ── Chords ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !subscribeChord) return;
    return subscribeChord((event) => {
      if (!isLive() || stepKind !== 'chords') return;
      if (suppressInput && event.source === 'audio') return;
      lastSourceRef.current = event.source;
      const tick = rollTickFor(event.source, event.onsetPerfMs);
      const strumId = `${event.source}:${event.strumId}`;

      if (event.phase === 'off') {
        const last = [...userChordsRef.current]
          .reverse()
          .find((c) => c.strumId === strumId);
        if (last && last.duration === 0) {
          const off =
            event.offsetPerfMs !== undefined
              ? rollTickFor(event.source, event.offsetPerfMs)
              : tick;
          last.duration = Math.max(1, off - last.onset);
        }
        for (const [id, meta] of Object.entries(performanceRef.current)) {
          if (meta.endTick === undefined) {
            performanceRef.current[id] = { ...meta, endTick: tick };
          }
        }
        if (holdRef.current?.strumId === strumId) cancelHold();
        bump();
        return;
      }

      // Which chord this strum is meant to be.
      const group = isIT ? chordGroupAt(tick) : currentChordGroup();

      if (event.unclear) {
        unclearCountRef.current += 1;
        if (group) unclearTargetsRef.current.add(group.targetIndex);
        setHeardChord(null);
        bump();
        return;
      }

      const played = {
        pcs: group
          ? heardPitchClasses(event, group.target.pitchClasses)
          : event.pcs,
        rootPc: event.rootPc,
      };
      const score = group
        ? chordIdentityScore(
            { pcs: group.target.pitchClasses, rootPc: group.target.rootPc },
            played,
          )
        : 0;
      if (group && score >= IDENTITY_MATCH) {
        unclearTargetsRef.current.delete(group.targetIndex);
      }

      setHeardChord({
        label: chordLabel(event.rootPc, event.quality, keyRoot),
        confidence: event.confidence,
        matchesCurrent: score >= IDENTITY_PASS,
      });
      setDiagnostics(
        group && score < IDENTITY_PASS
          ? {
              ...chordToneDiagnostics(
                group.target.pitchClasses,
                group.target.rootPc,
                event.chroma ?? event.pcs,
              ),
              ...chordHint(group.target, event),
            }
          : null,
      );

      // Record the strum (a 'change' revises the same strum).
      const existing = userChordsRef.current.find((c) => c.strumId === strumId);
      if (existing && event.phase === 'change') {
        existing.rootPc = event.rootPc;
        existing.quality = event.quality;
        existing.pcs = played.pcs;
        existing.confidence = event.confidence;
      } else if (!existing) {
        // A new strum ends the one before it.
        const previous =
          userChordsRef.current[userChordsRef.current.length - 1];
        if (previous && previous.duration === 0) {
          previous.duration = Math.max(1, tick - previous.onset);
        }
        userChordsRef.current.push({
          rootPc: event.rootPc,
          quality: event.quality,
          pcs: played.pcs,
          onset: Math.max(0, tick),
          duration: 0,
          confidence: event.confidence,
          source: event.source,
          strumId,
        });
      }

      if (!group) {
        bump();
        return;
      }

      if (isIT) {
        if (score >= IDENTITY_MATCH) {
          for (const id of group.eventIds) {
            if (!performanceRef.current[id]) {
              performanceRef.current[id] = { startTick: tick };
            }
          }
        }
        bump();
        return;
      }

      // Out of time: a fresh strum of the right chord, sounding long enough.
      if (score >= IDENTITY_PASS && strumId !== lastCompletedStrumRef.current) {
        const holdMs = Math.min(
          0.8 * group.target.durationTicks * MS_PER_TICK_AT_100,
          CHORD_HOLD_CAP_MS,
        );
        startHold(
          `chord:${group.targetIndex}:${strumId}`,
          strumId,
          holdMs,
          group.eventIds,
        );
      } else if (holdRef.current?.strumId === strumId) {
        cancelHold();
      }
      bump();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isLive/cancelHold read refs
  }, [
    enabled,
    subscribeChord,
    stepKind,
    isIT,
    rollTickFor,
    chordGroupAt,
    currentChordGroup,
    startHold,
    bump,
    keyRoot,
    suppressInput,
  ]);

  // ── Derived meta ───────────────────────────────────────────────────────
  const noteHoldMeta = useMemo(() => {
    void version;
    const meta: Record<string, NoteHoldMeta> = {};
    const currentIds = new Set(
      stepKind === 'chords'
        ? (currentChordGroup()?.eventIds ?? [])
        : (currentNoteGroup()?.eventIds ?? []),
    );
    const held = holdRef.current;
    const heldIds = new Set<string>();
    if (held?.key.startsWith('note:')) heldIds.add(held.key.slice(5));
    if (held?.key.startsWith('chord:')) {
      const index = Number(held.key.split(':')[1]);
      chordGroups[index]?.eventIds.forEach((id) => heldIds.add(id));
    }
    for (const e of events) {
      const isCompleted = completedEventIdsRef.current.has(e.id);
      const isHeld = heldIds.has(e.id);
      meta[e.id] = {
        isCompleted,
        isCurrentChord: isCompleted || currentIds.has(e.id),
        holdProgress: isCompleted ? 1 : isHeld ? 0.5 : 0,
        isHeld,
      };
    }
    return meta;
  }, [
    version,
    events,
    stepKind,
    chordGroups,
    currentChordGroup,
    currentNoteGroup,
    completedEventIdsRef,
  ]);

  const performanceMeta = useMemo(() => {
    void version;
    return { ...performanceRef.current };
  }, [version]);

  const buildPolicy = useCallback((): AssessmentPolicy => {
    const shift = isIT ? countInOffset : 0;
    const unclearTargetIndexes = [...unclearTargetsRef.current];
    if (stepKind === 'chords') {
      return {
        kind: 'chords',
        chordTargets,
        userChords: userChordsRef.current.map(
          ({ strumId: _strumId, ...chord }) => ({
            ...chord,
            onset: chord.onset - shift,
          }),
        ),
        unclearTargetIndexes,
      };
    }
    return {
      kind: 'notes',
      match: lastSourceRef.current === 'audio' ? 'octave_tolerant' : 'exact',
      unclearTargetIndexes,
    };
  }, [isIT, countInOffset, stepKind, chordTargets]);

  // Nothing to hear outside a run.
  useEffect(() => {
    if (!enabled) return;
    if (activityState === 'practice' || activityState === 'performance') {
      return;
    }
    cancelHold();
    setActiveMidis([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cancelHold reads refs
  }, [activityState, enabled]);

  return {
    stepKind,
    activeMidis,
    userNotes,
    noteHoldMeta,
    performanceMeta,
    heardChord,
    diagnostics,
    unclearCount: unclearCountRef.current,
    lastSource: lastSourceRef.current,
    buildPolicy,
  };
}
