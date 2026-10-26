import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { usePlayingNotes, usePlayNote } from '@/contexts/PianoContext';
import type { PlaybackEvent } from '@/contexts/PlaybackContext';
import { PianoKeyboard } from '@/daw/oracle-synth/components/keyboard/PianoKeyboard';
import { useMidiNoteListener } from '@/hooks/music/useMidiNoteListener';
import { FingeringHands } from '@/learn/components/fingering/FingeringHands';
import type { FingeringCursor } from '@/learn/fingering/handFrames';
import {
  followPlayedNote,
  LESSON_KEY_RANGE,
  LESSON_KEYBOARD_HEIGHT,
  shiftKeyRange,
  slideToTargets,
} from '@/learn/keyboard/lessonKeyboardRange';
import { useLessonKeyboardSlot } from '@/learn/keyboard/lessonKeyboardSlot';
import { useLessonKeyboardStage } from '@/learn/keyboard/lessonKeyboardStage';
import { type PlayedKeys, toPlayedNotes } from '@/learn/keyboard/playedKeys';
import type { FingeringTimeline } from '@/lib/learn/pianoFingering';

// The on-screen keyboard every Learn surface shows (owner, 2026-10-26): the
// Studio dock's keys (DockKeyboard's PianoKeyboard), 49 of them, C3–C7, at
// one height, docked on the lesson's bar (lessonKeyboardSlot) in every
// lesson. It never grows: it slides by whole octaves to reach the
// activity's notes or a note the player plays (lessonKeyboardRange.ts).

/**
 * How far the keys are slid, in semitones, following the player's hands; in
 * memory only, shared across activities, so a lesson's next step opens where
 * they were playing. (No notice of notes past their keyboard's reach: owner,
 * 2026-10-26.)
 */
const useKeyboardView = create<{ offset: number }>(() => ({ offset: 0 }));

type LessonKeyboardProps = {
  playingNotes?: PlaybackEvent[];
  activeWhiteKeyColor?: string | null;
  activeBlackKeyColor?: string | null;
  hintNotes?: ReadonlyMap<number, string>;
  /** Keys the player is holding, right (their target colour) or wrong
   *  (null), drawn on top of the rest: see playedKeys.ts. */
  playedKeys?: PlayedKeys;
  /** Every note the activity asks for: the keys slide to show them all; on
   *  a mapped keyboard, ones out of its reach bring up the octave notice. */
  targetMidis?: Iterable<number>;
  /** Name every C (C3, C4…). */
  showOctaveStart?: boolean;
  enableClick?: boolean;
  /** Also light what the app's piano is sounding (PianoContext). */
  useContextNotes?: boolean;
  onKeyClick?: (midi: number) => void;
  /** A key pressed (pointer down), for keys that sound until let go. */
  onKeyPointerDown?: (midi: number, event: PointerEvent) => void;
  /** A word on a key (MIDI -> text): a scale degree. */
  keyLabels?: ReadonlyMap<number, string>;
  /** The book's hands and finger numbers over the keys (FingeringHands).
   *  Without it, or with both off, the keyboard is drawn as ever. */
  fingering?: {
    timeline: FingeringTimeline;
    cursor: FingeringCursor;
    hands: boolean;
    numbers: boolean;
    keyColor: string;
  };
};

export function LessonKeyboard({
  playingNotes,
  activeWhiteKeyColor,
  activeBlackKeyColor,
  hintNotes,
  playedKeys,
  targetMidis,
  showOctaveStart = true,
  enableClick = true,
  useContextNotes = true,
  onKeyClick,
  onKeyPointerDown,
  keyLabels,
  fingering,
}: LessonKeyboardProps) {
  const slot = useLessonKeyboardSlot();
  const { offset } = useKeyboardView();

  // The keys shown: the 49, where the player's hands have taken them, slid
  // to show every target note.
  const view = useMemo(() => shiftKeyRange(LESSON_KEY_RANGE, offset), [offset]);
  const shown = useMemo(
    () => (targetMidis ? slideToTargets(view, targetMidis) : view),
    [view, targetMidis],
  );

  const handleNote = useCallback(
    (midi: number) => {
      const slide = followPlayedNote(shown, midi, true);
      if (slide && 'shift' in slide) {
        useKeyboardView.setState((s) => ({ offset: s.offset + slide.shift }));
      }
    },
    [shown],
  );
  useMidiNoteListener(true, handleNote);

  // Lit keys: what's sounding (the activity's, the app piano's, a click),
  // the latest note's colour on top.
  const contextNotes = usePlayingNotes();
  const playNote = usePlayNote();
  const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set());
  const { litNotes, activeNotes } = useMemo(() => {
    const events = [
      ...(playingNotes ?? []),
      ...(useContextNotes ? contextNotes : []),
    ].sort((a, b) => a.time - b.time);
    const lit = new Map<number, string>();
    const active = new Set<number>(pressed);
    for (const event of events) {
      if (event.type !== 'note') continue;
      active.add(event.midi);
      const color =
        event.color ||
        ([1, 3, 6, 8, 10].includes(event.midi % 12)
          ? activeBlackKeyColor
          : activeWhiteKeyColor);
      if (color) lit.set(event.midi, color);
    }
    return { litNotes: lit, activeNotes: active };
  }, [
    playingNotes,
    contextNotes,
    useContextNotes,
    pressed,
    activeWhiteKeyColor,
    activeBlackKeyColor,
  ]);

  const playedNotes = useMemo(
    () => (playedKeys ? toPlayedNotes(playedKeys) : undefined),
    [playedKeys],
  );

  const interactive = enableClick || !!onKeyPointerDown;
  const noteOn = useCallback(
    (note: number) => {
      setPressed((prev) => new Set(prev).add(note));
      if (!enableClick) return;
      playNote(note);
      onKeyClick?.(note);
    },
    [enableClick, playNote, onKeyClick],
  );
  const noteOff = useCallback((note: number) => {
    setPressed((prev) => {
      if (!prev.has(note)) return prev;
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  }, []);

  // Tell the cascade view where the keys are.
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!stageEl) return;
    useLessonKeyboardStage.setState({ el: stageEl, range: shown });
    return () => {
      if (useLessonKeyboardStage.getState().el === stageEl) {
        useLessonKeyboardStage.setState({ el: null, range: null });
      }
    };
  }, [stageEl, shown]);

  const showFingering = !!fingering && (fingering.hands || fingering.numbers);

  const keyboard = (
    <div data-lesson-keyboard className="relative w-full">
      <div
        ref={setStageEl}
        className={`relative w-full ${LESSON_KEYBOARD_HEIGHT}`}
      >
        <PianoKeyboard
          startNote={shown.low}
          endNote={shown.high}
          activeNotes={activeNotes}
          litNotes={litNotes}
          hintNotes={hintNotes}
          playedNotes={playedNotes}
          keyLabel={
            keyLabels ? (note) => keyLabels.get(note) ?? null : undefined
          }
          octaveLabels={showOctaveStart}
          interactive={interactive}
          onNoteOn={noteOn}
          onNoteOff={noteOff}
          onKeyPointerDown={onKeyPointerDown}
        />
        {showFingering && (
          <FingeringHands
            timeline={fingering.timeline}
            cursor={fingering.cursor}
            hands={fingering.hands}
            numbers={fingering.numbers}
            keyColor={fingering.keyColor}
            range={shown}
            stageEl={stageEl}
          />
        )}
      </div>
    </div>
  );

  // In a lesson: docked on its bar, the same place in every lesson.
  if (slot) return slot.el ? createPortal(keyboard, slot.el) : null;
  return keyboard;
}
