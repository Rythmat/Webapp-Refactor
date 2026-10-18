import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent,
} from 'react';
import { create } from 'zustand';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import type { PlaybackEvent } from '@/contexts/PlaybackContext';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useMidiNoteListener } from '@/hooks/music/useMidiNoteListener';
import {
  DEFAULT_LESSON_KEY_RANGE,
  followPlayedNote,
  type KeyRange,
  includeTargets,
  normalizeKeyRange,
  outOfRangeDirection,
  shiftKeyRange,
  whiteKeysIn,
} from '@/learn/keyboard/lessonKeyboardRange';
import { useLessonKeyboardStage } from '@/learn/keyboard/lessonKeyboardStage';
import { type PlayedKeys, toPlayedNotes } from '@/learn/keyboard/playedKeys';

// The on-screen keyboard every Learn surface shows under the activity. It
// fills the width and mirrors the player's keyboard (see
// lessonKeyboardRange.ts for the rules). A surface can instead ask for a
// fixed set of keys at real proportions (`range` and `natural`: Music
// Literacy's 25 keys, C4–C6 for most steps).

/**
 * Where the player's hardware is sitting right now. In memory only, shared
 * across activities: an octave button stays pressed when the lesson
 * changes, but a reload may follow a power cycle, and the first note played
 * puts the window right again anyway.
 */
const useKeyboardView = create<{
  /** Semitones the mapped range is shifted by (octave buttons). */
  offset: number;
  /** Unmapped only: the 73-key default widened to what they've played. */
  grown: KeyRange | null;
  /** The mapping the above belongs to; a new mapping starts over. */
  mappingKey: string;
}>(() => ({ offset: 0, grown: null, mappingKey: '' }));

type LessonKeyboardProps = {
  playingNotes?: PlaybackEvent[];
  activeWhiteKeyColor?: string | null;
  activeBlackKeyColor?: string | null;
  hintNotes?: ReadonlyMap<number, string>;
  /** Keys the player is holding, right (their target colour) or wrong
   *  (null), drawn on top of the rest: see playedKeys.ts. */
  playedKeys?: PlayedKeys;
  /** Every note the activity asks for. The keyboard always widens to show
   *  them all; on a mapped keyboard, ones outside it bring up the
   *  octave-button notice. */
  targetMidis?: Iterable<number>;
  /** The keyboard never gets shorter than this (px). */
  minHeight?: number;
  showOctaveStart?: boolean;
  enableClick?: boolean;
  useContextNotes?: boolean;
  enableMidiInterface?: boolean;
  onKeyClick?: (midi: number) => void;
  /** A key pressed (pointer down), for keys that sound until let go. */
  onKeyPointerDown?: (midi: number, event: PointerEvent) => void;
  /** Exactly these keys, whatever the player's keyboard: no following
   *  their octave buttons, no widening, no out-of-range notice. */
  range?: KeyRange;
  /** Real key proportions: each white key `aspect` times as tall as it is
   *  wide, never stretched to the width. The keys are as wide as fits under
   *  `maxHeight` (px), centred. */
  natural?: { aspect: number; maxHeight: number };
  /** A word at the foot of a key (MIDI -> text): a scale degree. */
  keyLabels?: ReadonlyMap<number, string>;
};

export function LessonKeyboard({
  targetMidis,
  minHeight = 120,
  showOctaveStart = true,
  playedKeys,
  range,
  natural,
  ...keyboardProps
}: LessonKeyboardProps) {
  const playedNotes = useMemo(
    () => (playedKeys ? toPlayedNotes(playedKeys) : undefined),
    [playedKeys],
  );
  const mapping = useSettingsStore((s) => s.midiMapping);
  const mapped = !!mapping;
  const mappingKey = mapping ? `${mapping.firstNote}-${mapping.lastNote}` : '';
  const { offset, grown, mappingKey: viewKey } = useKeyboardView();

  useEffect(() => {
    if (viewKey !== mappingKey) {
      useKeyboardView.setState({ offset: 0, grown: null, mappingKey });
    }
  }, [viewKey, mappingKey]);

  const fixed = useMemo(
    () => (range ? normalizeKeyRange(range) : null),
    [range?.low, range?.high],
  );
  const view = useMemo<KeyRange>(() => {
    if (fixed) return fixed;
    if (viewKey !== mappingKey) {
      return mapping
        ? normalizeKeyRange({ low: mapping.firstNote, high: mapping.lastNote })
        : DEFAULT_LESSON_KEY_RANGE;
    }
    if (mapping) {
      return shiftKeyRange(
        normalizeKeyRange({ low: mapping.firstNote, high: mapping.lastNote }),
        offset,
      );
    }
    return grown ?? DEFAULT_LESSON_KEY_RANGE;
  }, [fixed, mapping, mappingKey, viewKey, offset, grown]);

  const handleNote = useCallback(
    (midi: number) => {
      const next = followPlayedNote(view, midi, mapped);
      if (!next) return;
      if ('shift' in next) {
        useKeyboardView.setState((s) => ({ offset: s.offset + next.shift }));
      } else {
        useKeyboardView.setState({ grown: next.grow });
      }
    },
    [view, mapped],
  );
  // A fixed range stays put, and leaves the shared window alone.
  useMidiNoteListener(!fixed, handleNote);

  // What's drawn: the player's keys, widened to every target note.
  const shown = useMemo(
    () => (targetMidis && !fixed ? includeTargets(view, targetMidis) : view),
    [view, targetMidis, fixed],
  );

  // Real proportions: as wide as the box, or as the height cap allows.
  const [boxEl, setBoxEl] = useState<HTMLDivElement | null>(null);
  const boxWidth = useBoxWidth(natural ? boxEl : null);
  const naturalSize = useMemo(() => {
    if (!natural || boxWidth <= 0) return null;
    const whites = Math.max(1, whiteKeysIn(shown).length);
    const keyWidth = Math.min(
      boxWidth / whites,
      natural.maxHeight / natural.aspect,
    );
    return {
      width: Math.floor(keyWidth * whites),
      height: Math.round(keyWidth * natural.aspect),
    };
  }, [natural?.aspect, natural?.maxHeight, boxWidth, shown]);

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

  // Only a mapped keyboard is known to be short of the notes; then the
  // player needs their octave buttons to play what's on screen.
  const outOfRange = useMemo(
    () =>
      mapped && targetMidis && !fixed
        ? outOfRangeDirection(view, targetMidis)
        : null,
    [mapped, view, targetMidis, fixed],
  );

  return (
    <div ref={setBoxEl} className="relative w-full">
      <div
        ref={setStageEl}
        className={natural ? 'mx-auto' : undefined}
        style={
          natural
            ? { width: naturalSize?.width ?? '100%', maxWidth: '100%' }
            : undefined
        }
      >
        <PianoKeyboard
          {...keyboardProps}
          playedNotes={playedNotes}
          showOctaveStart={showOctaveStart}
          fill={{
            lowMidi: shown.low,
            highMidi: shown.high,
            minHeight,
            ...(naturalSize ? { height: naturalSize.height } : {}),
          }}
        />
      </div>
      {/* Under the keys, never over the music above them. */}
      {outOfRange && <OctaveNotice direction={outOfRange} />}
    </div>
  );
}

/** Live width of `el` (0 until measured). */
function useBoxWidth(el: HTMLElement | null): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [el]);
  return width;
}

const NOTICE_TEXT = {
  above:
    'Some notes are above your keyboard. Press your keyboard’s Octave Up button to reach them.',
  below:
    'Some notes are below your keyboard. Press your keyboard’s Octave Down button to reach them.',
  both: 'This activity spans more keys than your keyboard. Use your Octave Up and Down buttons to reach every note.',
} as const;

function OctaveNotice({ direction }: { direction: keyof typeof NOTICE_TEXT }) {
  return (
    <div
      role="status"
      data-octave-notice={direction}
      className="pointer-events-none mt-2 flex justify-center"
    >
      <div
        className="rounded-full px-3 py-1 text-xs font-medium"
        style={{
          background: 'rgba(25,25,25,0.92)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
      >
        {direction === 'above' ? '↑ ' : direction === 'below' ? '↓ ' : '↕ '}
        {NOTICE_TEXT[direction]}
      </div>
    </div>
  );
}
