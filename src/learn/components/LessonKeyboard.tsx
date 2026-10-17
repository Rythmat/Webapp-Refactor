import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@/learn/keyboard/lessonKeyboardRange';
import { useLessonKeyboardStage } from '@/learn/keyboard/lessonKeyboardStage';
import { type PlayedKeys, toPlayedNotes } from '@/learn/keyboard/playedKeys';

// The on-screen keyboard every Learn surface shows under the activity. It
// fills the width and mirrors the player's keyboard (see
// lessonKeyboardRange.ts for the rules).

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
};

export function LessonKeyboard({
  targetMidis,
  minHeight = 120,
  showOctaveStart = true,
  playedKeys,
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

  const view = useMemo<KeyRange>(() => {
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
  }, [mapping, mappingKey, viewKey, offset, grown]);

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
  useMidiNoteListener(true, handleNote);

  // What's drawn: the player's keys, widened to every target note.
  const shown = useMemo(
    () => (targetMidis ? includeTargets(view, targetMidis) : view),
    [view, targetMidis],
  );

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
      mapped && targetMidis ? outOfRangeDirection(view, targetMidis) : null,
    [mapped, view, targetMidis],
  );

  return (
    <div className="relative w-full">
      <div ref={setStageEl}>
        <PianoKeyboard
          {...keyboardProps}
          playedNotes={playedNotes}
          showOctaveStart={showOctaveStart}
          fill={{ lowMidi: shown.low, highMidi: shown.high, minHeight }}
        />
      </div>
      {/* Under the keys, never over the music above them. */}
      {outOfRange && <OctaveNotice direction={outOfRange} />}
    </div>
  );
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
