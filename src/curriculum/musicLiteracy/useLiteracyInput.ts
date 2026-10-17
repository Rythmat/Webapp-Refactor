import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { DEFAULT_TYPING_VELOCITY } from '@/daw/commands/musicalTypingMap';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { useLearnInputStable } from '@/learn/context/LearnInputContext';
import {
  START_TYPING_OCTAVE,
  isPlayableKeyEvent,
  literacyTypingNote,
  shiftedTypingOctave,
} from './typingKeys';

// ── Every way to play ──────────────────────────────────────────────────────
// Learn's other screens hear a MIDI keyboard only, which leaves a school
// Chromebook out. Music Literacy is for beginners and classrooms, so three
// sources feed the one note-on and note-off the player stamps on the
// transport clock:
//
//   MIDI       LearnInputProvider, as every Learn screen
//   the keys   a press on the on-screen keyboard sounds until let go
//   letters    the Studio's musical typing (typingKeys.ts), A = C
//
// A key or pointer event brings its own timestamp, so the note is placed
// where it was played, not where the handler ran.

export type LiteracyInputSource = 'midi' | 'keys' | 'typing';

export interface LiteracyNoteOn {
  midi: number;
  /** 1–127. */
  velocity: number;
  /** The event's timeStamp (performance.now() ms), when it has one. */
  perfMs?: number;
  source: LiteracyInputSource;
}

export interface LiteracyNoteOff {
  midi: number;
  perfMs?: number;
  source: LiteracyInputSource;
}

/** How hard a press on the screen plays: a firm one, as the Studio's. */
const POINTER_VELOCITY = 100;

export function useLiteracyInput(handlers: {
  onNoteOn: (note: LiteracyNoteOn) => void;
  onNoteOff: (note: LiteracyNoteOff) => void;
}) {
  const latest = useRef(handlers);
  latest.current = handlers;

  // ── MIDI ──
  const { subscribeNoteOn, subscribeNoteOff, start, stop } =
    useLearnInputStable();
  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);
  useEffect(() => {
    const offOn = subscribeNoteOn((event: MidiNoteEvent) => {
      if (event.velocity === 0) return;
      latest.current.onNoteOn({
        midi: event.number,
        velocity: event.velocity,
        source: 'midi',
      });
    });
    const offOff = subscribeNoteOff((event: MidiNoteEvent) =>
      latest.current.onNoteOff({ midi: event.number, source: 'midi' }),
    );
    return () => {
      offOn();
      offOff();
    };
  }, [subscribeNoteOn, subscribeNoteOff]);

  // ── The computer keyboard ──
  const [typingOctave, setTypingOctave] = useState(START_TYPING_OCTAVE);
  const octaveRef = useRef(typingOctave);
  useEffect(() => {
    /** Notes sounding, by the key that started them. */
    const held = new Map<string, number>();
    const release = (code: string, perfMs?: number) => {
      const midi = held.get(code);
      if (midi === undefined) return false;
      held.delete(code);
      latest.current.onNoteOff({ midi, perfMs, source: 'typing' });
      return true;
    };
    const releaseAll = () => {
      for (const code of [...held.keys()]) release(code);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPlayableKeyEvent(event)) return;
      const octave = shiftedTypingOctave(event.code, octaveRef.current);
      if (octave !== null) {
        event.preventDefault();
        octaveRef.current = octave;
        setTypingOctave(octave);
        return;
      }
      const midi = literacyTypingNote(event.code, octaveRef.current);
      if (midi === null) return;
      event.preventDefault();
      if (event.repeat || held.has(event.code)) return;
      held.set(event.code, midi);
      latest.current.onNoteOn({
        midi,
        velocity: DEFAULT_TYPING_VELOCITY,
        perfMs: event.timeStamp,
        source: 'typing',
      });
    };
    // A key let go anywhere ends the note it started, even after focus moved.
    const onKeyUp = (event: KeyboardEvent) => {
      if (release(event.code, event.timeStamp)) event.preventDefault();
    };
    const onHidden = () => {
      if (document.visibilityState === 'hidden') releaseAll();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp, { capture: true });
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp, { capture: true });
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onHidden);
      releaseAll();
    };
  }, []);

  // ── The on-screen keys ──
  /** Notes sounding, by the pointer that started them. */
  const pointers = useRef(new Map<number, number>());
  const releasePointer = useCallback((pointerId: number, perfMs?: number) => {
    const midi = pointers.current.get(pointerId);
    if (midi === undefined) return;
    pointers.current.delete(pointerId);
    latest.current.onNoteOff({ midi, perfMs, source: 'keys' });
  }, []);
  useEffect(() => {
    const held = pointers.current;
    const onUp = (event: globalThis.PointerEvent) =>
      releasePointer(event.pointerId, event.timeStamp);
    const releaseAll = () => {
      for (const id of [...held.keys()]) releasePointer(id);
    };
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('pointerup', onUp, { capture: true });
      window.removeEventListener('pointercancel', onUp, { capture: true });
      window.removeEventListener('blur', releaseAll);
      releaseAll();
    };
  }, [releasePointer]);

  const onKeyPointerDown = useCallback(
    (midi: number, event: PointerEvent) => {
      if (event.button !== 0) return;
      // No text selection or focus move from pressing a key.
      event.preventDefault();
      releasePointer(event.pointerId, event.timeStamp);
      pointers.current.set(event.pointerId, midi);
      latest.current.onNoteOn({
        midi,
        velocity: POINTER_VELOCITY,
        perfMs: event.timeStamp,
        source: 'keys',
      });
    },
    [releasePointer],
  );

  return { onKeyPointerDown, typingOctave };
}
