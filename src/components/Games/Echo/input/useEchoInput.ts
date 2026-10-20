import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { triggerPianoAttack, triggerPianoRelease } from '@/audio/pianoSampler';
import { midiToPitchName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import {
  START_TYPING_OCTAVE,
  isPlayableKeyEvent,
  literacyTypingNote,
  shiftedTypingOctave,
  type TypingOctaves,
} from '@/curriculum/musicLiteracy/typingKeys';
import { DEFAULT_TYPING_VELOCITY } from '@/daw/commands/musicalTypingMap';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { useLearnInputStable } from '@/learn/context/LearnInputContext';
import type { EchoInputMode } from '../echoSettings';
import { padOfKey } from './padKeys';

// ── One note stream from every way to play ─────────────────────────────────
// Echo is played on pads or on a piano, by touch, mouse, computer keys or a
// MIDI keyboard. This hook turns them all into one note-on and note-off, as
// Music Literacy's useLiteracyInput does for its piano, with the pads added:
//
//   pads     a pointer down on a pad (touch first: each finger its own), or
//            its home-row key with Pads (padKeys.ts). A melody pad plays its
//            note, a chord pad its whole chord, struck together
//   keys     a pointer down on the on-screen piano (LessonKeyboard)
//   typing   with Keyboard, the Studio's musical typing (typingKeys.ts,
//            A = C, Z and X move the octave)
//   midi     a MIDI keyboard, through the LearnInputProvider above
//
// Each note-on comes with its event's timeStamp (`perfMs`), so a game can
// place it where it was played (literacyClock.soundingTicks). Notes are
// counted: two chord pads sharing a note sound it twice, but its note-off
// comes once both are let go. Each note sounds on the lesson piano unless
// `sound` is off. Needs a LearnInputProvider above it (the Echo page has
// one).

export type EchoInputSource = 'pads' | 'keys' | 'typing' | 'midi';

export interface EchoNoteOn {
  midi: number;
  /** 1–127. */
  velocity: number;
  /** The event's timeStamp (performance.now() ms), when it has one. */
  perfMs?: number;
  source: EchoInputSource;
}

export interface EchoNoteOff {
  midi: number;
  perfMs?: number;
  source: EchoInputSource;
}

export interface EchoInputOptions {
  /** Pads: the home row presses the pads. Keyboard: it plays the piano. */
  mode: EchoInputMode;
  /**
   * Each pad's notes, left to right: a melody pad's one, a chord pad's
   * chord. Empty with Keyboard.
   */
  pads: readonly (readonly number[])[];
  onNoteOn: (note: EchoNoteOn) => void;
  onNoteOff: (note: EchoNoteOff) => void;
  /** Keyboard: the octaves the letter keys move between, and the start. */
  octaves?: TypingOctaves;
  /** Sound each note on the lesson piano (default on). */
  sound?: boolean;
  /** The key's 1 (MIDI), to spell the notes the piano is asked for. */
  tonic?: number;
  /** Off, nothing is heard: no keys, no pads, no MIDI (default on). */
  enabled?: boolean;
}

export interface EchoInput {
  /** A pointer down on pad `index`: its notes sound until it lets go. */
  onPadPointerDown: (index: number, event: PointerEvent) => void;
  /** The pads held now, by a pointer or a key. */
  heldPads: ReadonlySet<number>;
  /** The notes sounding from this input now, from any source. */
  held: ReadonlySet<number>;
  /** For LessonKeyboard's onKeyPointerDown: a piano key pressed. */
  onKeyPointerDown: (midi: number, event: PointerEvent) => void;
  /** The octave the A key plays (Keyboard). */
  typingOctave: number;
}

/** A firm press, as the Studio's on-screen keys play. */
const POINTER_VELOCITY = 100;

const DEFAULT_OCTAVES: TypingOctaves = {
  low: START_TYPING_OCTAVE - 1,
  high: START_TYPING_OCTAVE,
  start: START_TYPING_OCTAVE,
};

/** What a pointer or a key is holding down. */
type Press = { pad: number; midis: readonly number[] } | { midis: [number] };

export function useEchoInput(options: EchoInputOptions): EchoInput {
  const latest = useRef(options);
  latest.current = options;
  const octaves = options.octaves ?? DEFAULT_OCTAVES;
  const boundsRef = useRef(octaves);
  boundsRef.current = octaves;

  const [heldPads, setHeldPads] = useState<ReadonlySet<number>>(new Set());
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  /** How many presses hold each note. */
  const counts = useRef(new Map<number, number>());

  const noteOn = useCallback(
    (
      midi: number,
      velocity: number,
      source: EchoInputSource,
      perfMs?: number,
    ) => {
      const { sound = true, tonic, onNoteOn } = latest.current;
      counts.current.set(midi, (counts.current.get(midi) ?? 0) + 1);
      setHeld((prev) => new Set(prev).add(midi));
      if (sound)
        void triggerPianoAttack(midiToPitchName(midi, tonic), velocity);
      onNoteOn({ midi, velocity, perfMs, source });
    },
    [],
  );

  const noteOff = useCallback(
    (midi: number, source: EchoInputSource, perfMs?: number) => {
      const count = counts.current.get(midi) ?? 0;
      if (count === 0) return;
      if (count > 1) {
        counts.current.set(midi, count - 1);
        return;
      }
      counts.current.delete(midi);
      setHeld((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
      const { sound = true, tonic, onNoteOff } = latest.current;
      if (sound) void triggerPianoRelease(midiToPitchName(midi, tonic));
      onNoteOff({ midi, perfMs, source });
    },
    [],
  );

  const press = useCallback(
    (
      what: Press,
      velocity: number,
      source: EchoInputSource,
      perfMs?: number,
    ) => {
      if ('pad' in what) setHeldPads((prev) => new Set(prev).add(what.pad));
      what.midis.forEach((midi) => noteOn(midi, velocity, source, perfMs));
    },
    [noteOn],
  );

  const release = useCallback(
    (what: Press, source: EchoInputSource, perfMs?: number) => {
      if ('pad' in what) {
        setHeldPads((prev) => {
          const next = new Set(prev);
          next.delete(what.pad);
          return next;
        });
      }
      what.midis.forEach((midi) => noteOff(midi, source, perfMs));
    },
    [noteOff],
  );

  /** The pad `index` as a press, or null if there's no such pad. */
  const padPress = (index: number): Press | null => {
    const midis = latest.current.pads[index];
    return midis && midis.length ? { pad: index, midis } : null;
  };

  const enabled = options.enabled ?? true;

  // ── MIDI ──
  const { subscribeNoteOn, subscribeNoteOff, start, stop } =
    useLearnInputStable();
  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);
  useEffect(() => {
    if (!enabled) return;
    const offOn = subscribeNoteOn((event: MidiNoteEvent) => {
      if (event.velocity === 0) return;
      noteOn(event.number, event.velocity, 'midi');
    });
    const offOff = subscribeNoteOff((event: MidiNoteEvent) =>
      noteOff(event.number, 'midi'),
    );
    return () => {
      offOn();
      offOff();
    };
  }, [enabled, subscribeNoteOn, subscribeNoteOff, noteOn, noteOff]);

  // ── The computer keyboard ──
  const [typingOctave, setTypingOctave] = useState(octaves.start);
  const octaveRef = useRef(typingOctave);
  // A call that starts elsewhere moves the A key to it.
  const [startedOn, setStartedOn] = useState(octaves.start);
  if (startedOn !== octaves.start) {
    setStartedOn(octaves.start);
    setTypingOctave(octaves.start);
    octaveRef.current = octaves.start;
  }
  const mode = options.mode;
  useEffect(() => {
    if (!enabled) return;
    /** What each key down is holding. */
    const keys = new Map<string, Press>();
    const releaseAll = () => {
      for (const [code, what] of keys) {
        keys.delete(code);
        release(what, mode === 'pads' ? 'pads' : 'typing');
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPlayableKeyEvent(event)) return;
      let what: Press | null = null;
      if (mode === 'pads') {
        const pad = padOfKey(event.code, latest.current.pads.length);
        what = pad === null ? null : padPress(pad);
      } else {
        const octave = shiftedTypingOctave(
          event.code,
          octaveRef.current,
          boundsRef.current,
        );
        if (octave !== null) {
          event.preventDefault();
          octaveRef.current = octave;
          setTypingOctave(octave);
          return;
        }
        const midi = literacyTypingNote(event.code, octaveRef.current);
        what = midi === null ? null : { midis: [midi] };
      }
      if (!what) return;
      event.preventDefault();
      if (event.repeat || keys.has(event.code)) return;
      keys.set(event.code, what);
      press(
        what,
        DEFAULT_TYPING_VELOCITY,
        mode === 'pads' ? 'pads' : 'typing',
        event.timeStamp,
      );
    };
    // A key let go anywhere ends what it started, even after focus moved.
    const onKeyUp = (event: KeyboardEvent) => {
      const what = keys.get(event.code);
      if (!what) return;
      keys.delete(event.code);
      event.preventDefault();
      release(what, mode === 'pads' ? 'pads' : 'typing', event.timeStamp);
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
    // padPress reads the latest pads itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mode, press, release]);

  // ── Pointers: the pads and the on-screen keys ──
  /** What each pointer down is holding. */
  const pointers = useRef(
    new Map<number, { what: Press; source: EchoInputSource }>(),
  );
  const releasePointer = useCallback(
    (pointerId: number, perfMs?: number) => {
      const held = pointers.current.get(pointerId);
      if (!held) return;
      pointers.current.delete(pointerId);
      release(held.what, held.source, perfMs);
    },
    [release],
  );
  useEffect(() => {
    const map = pointers.current;
    const onUp = (event: globalThis.PointerEvent) =>
      releasePointer(event.pointerId, event.timeStamp);
    const releaseAll = () => {
      for (const id of [...map.keys()]) releasePointer(id);
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

  const pointerDown = useCallback(
    (what: Press | null, source: EchoInputSource, event: PointerEvent) => {
      if (latest.current.enabled === false || !what) return;
      if (event.button !== 0) return;
      // No text selection, scroll or focus move from pressing a pad or key.
      event.preventDefault();
      releasePointer(event.pointerId, event.timeStamp);
      pointers.current.set(event.pointerId, { what, source });
      press(what, POINTER_VELOCITY, source, event.timeStamp);
    },
    [press, releasePointer],
  );

  const onPadPointerDown = useCallback(
    (index: number, event: PointerEvent) =>
      pointerDown(padPress(index), 'pads', event),
    // padPress reads the latest pads itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pointerDown],
  );

  const onKeyPointerDown = useCallback(
    (midi: number, event: PointerEvent) =>
      pointerDown({ midis: [midi] }, 'keys', event),
    [pointerDown],
  );

  return { onPadPointerDown, heldPads, held, onKeyPointerDown, typingOctave };
}
