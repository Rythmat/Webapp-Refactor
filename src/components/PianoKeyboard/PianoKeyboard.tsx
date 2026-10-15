import { sortBy } from 'lodash';
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useState,
  type PointerEvent,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/components/utilities';
// import { Env } from '@/constants/env';
import { usePlayingNotes, usePlayNote } from '@/contexts/PianoContext';
import { PlaybackEvent } from '@/contexts/PlaybackContext';
import { MidiNoteEvent, useMidiInput } from '@/hooks/music/useMidiInput';
import {
  BLACK_KEY_WIDTH_SHARE,
  isBlackKey,
  whiteKeysIn,
} from '@/learn/keyboard/lessonKeyboardRange';
// import { DragableDebugMidiKeyboard } from './DragableDebugMidiKeyboard';
import {
  OCTAVE_HEIGHT,
  OCTAVE_WIDTH,
  useExpandedRange,
} from './useExpandedRange';

// const DEBUG = Env.isDevelopment();
// const testTarget = DEBUG ? new EventTarget() : undefined;

type PianoKeyboardProps = {
  endC?: number;
  startC?: number;
  className?: string;
  vertical?: boolean;
  gaming?: boolean;
  enableClick?: boolean;
  useContextNotes?: boolean;
  playingNotes?: PlaybackEvent[];
  whiteKeyClassName?: string;
  blackKeyClassName?: string;
  blackKeyContainerClassName?: string;
  showOctaveStart?: boolean;
  activeWhiteKeyColor?: string | null;
  activeBlackKeyColor?: string | null;
  /** Keys tinted with the given color (MIDI note -> color) while they aren't
   *  being played, e.g. a practice run's target notes. A played key still
   *  takes its full active color, so presses stay visible over the hint. */
  hintNotes?: ReadonlyMap<number, string>;
  onKeyClick?: (midiNumber: number) => void;
  /** A key pressed (pointer down), for keys that hold their note until let
   *  go, as the Studio's practice keyboard plays them. */
  onKeyPointerDown?: (midiNumber: number, event: PointerEvent) => void;
  onMidiInput?: (event: MidiNoteEvent) => void;
  enableMidiInterface?: boolean;
  /** Fill mode: stretch the keys to the full width of the container and show
   *  exactly `lowMidi`–`highMidi` (any key, not just whole octaves). Height
   *  follows the key width, never below `minHeight`, never above 30% of the
   *  viewport. `startC`/`endC`/`gaming`/`vertical` are ignored. */
  fill?: { lowMidi: number; highMidi: number; minHeight?: number };
};

/** White-key height ÷ width in fill mode. A real key is ~6.4; a touch
 *  squatter leaves the score/roll more room on wide screens. */
const FILL_KEY_ASPECT = 5.5;
const FILL_MAX_VIEWPORT_SHARE = 0.3;
const BLACK_KEY_HEIGHT = '62%';

export function PianoKeyboard({
  endC = 7,
  startC = 3,
  className = '',
  vertical = false,
  gaming = false,
  enableClick = true,
  useContextNotes = true,
  playingNotes,
  whiteKeyClassName = '',
  blackKeyClassName = '',
  blackKeyContainerClassName = '',
  onKeyClick,
  onKeyPointerDown,
  showOctaveStart = false,
  activeWhiteKeyColor,
  activeBlackKeyColor,
  hintNotes,
  onMidiInput,
  enableMidiInterface = false,
  fill,
}: PianoKeyboardProps) {
  const [localActiveNotes, setLocalActiveNotes] = useState<PlaybackEvent[]>([]);

  const contextPlayingNotes = usePlayingNotes();
  const playNote = usePlayNote();

  // const { setRef, expandedEndC, expandedStartC }
  const { setRef } = useExpandedRange({
    params: {
      mode: vertical ? 'vertical' : 'horizontal',
      startC,
      endC,
    },
  });

  const [fillEl, setFillEl] = useState<HTMLDivElement | null>(null);
  const fillSize = useFillSize(fill ? fillEl : null);

  const handleKeyClick = useCallback(
    (note: number) => {
      if (!enableClick) return;
      playNote(note);

      const id = uuidv4();

      const duration = 0.1;

      setLocalActiveNotes((prev) => [
        ...prev,
        {
          id,
          duration,
          midi: note,
          time: Date.now(),
          type: 'note',
          velocity: 1,
        },
      ]);

      onKeyClick?.(note);

      setTimeout(() => {
        setLocalActiveNotes((prev) => prev.filter((n) => n.id !== id));
      }, duration * 1000);
    },
    [enableClick, playNote, onKeyClick],
  );

  const handleMidiInput = useCallback(
    (event: MidiNoteEvent) => {
      const id = uuidv4();

      setLocalActiveNotes((prev) => [
        ...prev,
        {
          ...event,
          id,
          type: 'note',
          velocity: event.velocity,
          time: Date.now(),
          midi: event.number,
        },
      ]);
      onMidiInput?.(event);

      setTimeout(() => {
        setLocalActiveNotes((prev) => prev.filter((n) => n.id !== id));
      }, event.duration);
    },
    [onMidiInput],
  );

  const { isListening, startListening, stopListening } = useMidiInput(
    handleMidiInput,
    // testTarget,
  );

  const baseWhiteKeyClass = gaming
    ? vertical
      ? 'h-8 w-full !z-0 rounded-l-[2px] mb-px bg-white transition-colors cursor-pointer'
      : 'w-8 h-full !z-0 rounded-b-[2px] mr-px bg-white transition-colors cursor-pointer'
    : vertical
      ? 'h-4 w-full !z-0 rounded-l-[2px] mb-px bg-white transition-colors cursor-pointer'
      : 'w-4 h-full !z-0 rounded-b-[2px] mr-px bg-white transition-colors cursor-pointer';

  const octaveLabelClass = 'text-[8px] text-black';

  const whiteKeyClass = cn(
    baseWhiteKeyClass,
    {
      'flex flex-col items-center justify-end': showOctaveStart,
    },
    whiteKeyClassName,
  );

  const baseBlackKeyContainerClass = gaming
    ? vertical
      ? 'relative h-0 !z-10 overflow-visible -top-5'
      : 'relative w-0 !z-10 overflow-visible -left-3'
    : vertical
      ? 'relative h-0 !z-10 overflow-visible -top-2.5'
      : 'relative w-0 !z-10 overflow-visible -left-1.5';

  const blackKeyContainerClass = cn(
    baseBlackKeyContainerClass,
    blackKeyContainerClassName,
  );

  const baseBlackKeyClass = gaming
    ? vertical
      ? 'ml-auto w-3/5 h-6 !z-10 rounded-l-[3px] border-l-[3px] border-l-zinc-600 bg-zinc-900 shadow-md transition-colors right-0 cursor-pointer'
      : 'mt-auto h-3/5 w-6 !z-10 rounded-b-[3px] border-b-[3px] border-b-zinc-600 bg-zinc-900 shadow-md transition-colors bottom-0 cursor-pointer'
    : vertical
      ? 'ml-auto w-3/5 h-3 !z-10 rounded-l-[3px] border-l-[3px] border-l-zinc-600 bg-zinc-900 shadow-md transition-colors right-0 cursor-pointer'
      : 'mt-auto h-3/5 w-3 !z-10 rounded-b-[3px] border-b-[3px] border-b-zinc-600 bg-zinc-900 shadow-md transition-colors bottom-0 cursor-pointer';

  const blackKeyClass = cn(baseBlackKeyClass, blackKeyClassName);

  const getActiveNote = (note: number) => {
    const activeNotes = sortBy(
      [
        ...(playingNotes || []),
        ...(useContextNotes ? contextPlayingNotes : []),
        ...localActiveNotes,
      ],
      'time',
      'desc',
    );

    return activeNotes.find((n) => {
      if (typeof n === 'number') {
        return n === note;
      }

      return n.midi === note;
    });
  };

  const whiteKeyStyle = (
    activeNote: PlaybackEvent | undefined,
    hintColor: string | undefined,
  ): CSSProperties => ({
    backgroundColor: activeNote
      ? activeNote?.color || activeWhiteKeyColor || undefined
      : hintColor
        ? `color-mix(in srgb, ${hintColor} 60%, white)`
        : undefined,
  });

  const blackKeyStyle = (
    activeNote: PlaybackEvent | undefined,
    hintColor: string | undefined,
  ): CSSProperties => ({
    backgroundColor: activeNote
      ? activeNote?.color || activeBlackKeyColor || undefined
      : hintColor
        ? `color-mix(in srgb, ${hintColor} 60%, #18181b)`
        : undefined,
    borderColor: activeNote
      ? activeNote?.color || activeWhiteKeyColor || undefined
      : undefined,
    filter:
      activeNote?.color || activeBlackKeyColor
        ? 'brightness(0.7) contrast(1.2)'
        : undefined,
  });

  const renderWhiteKey = (note: number) => {
    const activeNote = getActiveNote(note);
    const hintColor = hintNotes?.get(note);
    const isLastWhiteInOctave = note % 12 === 11;

    return (
      <div
        key={activeNote?.id}
        className={cn(
          whiteKeyClass,
          {
            'bg-zinc-300 animate-piano-key-press': !!activeNote,
          },
          gaming && !vertical && isLastWhiteInOctave && 'mr-0',
          gaming && vertical && isLastWhiteInOctave && 'mb-0',
        )}
        style={whiteKeyStyle(activeNote, hintColor)}
        onClick={() => handleKeyClick(note)}
        onPointerDown={
          onKeyPointerDown ? (e) => onKeyPointerDown(note, e) : undefined
        }
      >
        {showOctaveStart && !gaming && note % 12 === 0 && (
          <div className={octaveLabelClass}>C{Math.floor(note / 12) - 1}</div>
        )}
      </div>
    );
  };

  const renderBlackKey = (note: number) => {
    const activeNote = getActiveNote(note);
    const hintColor = hintNotes?.get(note);

    return (
      <div
        className={blackKeyContainerClass}
        onClick={() => handleKeyClick(note)}
        onPointerDown={
          onKeyPointerDown ? (e) => onKeyPointerDown(note, e) : undefined
        }
      >
        <div
          key={activeNote?.id}
          className={cn(blackKeyClass, {
            'bg-orange-700 animate-piano-key-press': !!activeNote,
            'border-orange-900': !!activeNote,
          })}
          style={blackKeyStyle(activeNote, hintColor)}
        />
      </div>
    );
  };

  const renderOctave = (octave: number) => {
    const baseNote = octave * 12; // This makes octave 4 start at MIDI note 60 (middle C)

    return (
      <div
        className={cn(vertical ? 'flex flex-col' : 'flex h-full')}
        style={{
          width: vertical || gaming ? undefined : `${OCTAVE_WIDTH}px`,
          height: vertical && !gaming ? `${OCTAVE_HEIGHT}px` : undefined,
        }}
      >
        {renderWhiteKey(baseNote)} {/* C */}
        {renderBlackKey(baseNote + 1)} {/* C# */}
        {renderWhiteKey(baseNote + 2)} {/* D */}
        {renderBlackKey(baseNote + 3)} {/* D# */}
        {renderWhiteKey(baseNote + 4)} {/* E */}
        {renderWhiteKey(baseNote + 5)} {/* F */}
        {renderBlackKey(baseNote + 6)} {/* F# */}
        {renderWhiteKey(baseNote + 7)} {/* G */}
        {renderBlackKey(baseNote + 8)} {/* G# */}
        {renderWhiteKey(baseNote + 9)} {/* A */}
        {renderBlackKey(baseNote + 10)} {/* A# */}
        {renderWhiteKey(baseNote + 11)} {/* B */}
      </div>
    );
  };

  const midiToggle = enableMidiInterface && (
    <button onClick={() => (isListening ? stopListening() : startListening())}>
      MIDI {isListening ? 'On' : 'Off'}
    </button>
  );

  if (fill) {
    const range = { low: fill.lowMidi, high: fill.highMidi };
    const whites = whiteKeysIn(range);
    const columns = Math.max(1, whites.length);
    const minHeight = fill.minHeight ?? OCTAVE_HEIGHT;
    const whiteWidth = fillSize.width / columns;
    const height = fillSize.width
      ? Math.max(
          minHeight,
          Math.min(
            whiteWidth * FILL_KEY_ASPECT,
            fillSize.viewportHeight * FILL_MAX_VIEWPORT_SHARE,
          ),
        )
      : minHeight;
    const labelSize = Math.max(8, Math.min(12, whiteWidth * 0.4));
    const blacks: number[] = [];
    for (let m = range.low; m <= range.high; m++) {
      if (isBlackKey(m)) blacks.push(m);
    }
    const blackWidthPct = (BLACK_KEY_WIDTH_SHARE / columns) * 100;

    return (
      <div ref={setFillEl} className={cn('w-full', className)}>
        <div
          className="relative flex w-full bg-black p-px"
          style={{ height }}
          data-testid="piano-keyboard-fill"
        >
          {whites.map((note, i) => {
            const activeNote = getActiveNote(note);
            return (
              <div
                key={`${note}-${activeNote?.id ?? ''}`}
                className={cn(
                  'flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-end rounded-b-[3px] bg-white transition-colors',
                  i < whites.length - 1 && 'mr-px',
                  !!activeNote && 'animate-piano-key-press bg-zinc-300',
                  whiteKeyClassName,
                )}
                style={whiteKeyStyle(activeNote, hintNotes?.get(note))}
                onClick={() => handleKeyClick(note)}
              >
                {showOctaveStart && note % 12 === 0 && (
                  <div
                    className="pb-1 leading-none text-black"
                    style={{ fontSize: labelSize }}
                  >
                    C{Math.floor(note / 12) - 1}
                  </div>
                )}
              </div>
            );
          })}
          {blacks.map((note) => {
            const activeNote = getActiveNote(note);
            const column = whites.indexOf(note - 1) + 1;
            return (
              <div
                key={note}
                className="absolute top-px z-10 cursor-pointer"
                style={{
                  left: `calc(${(column / columns) * 100}% - ${blackWidthPct / 2}%)`,
                  width: `${blackWidthPct}%`,
                  height: BLACK_KEY_HEIGHT,
                }}
                onClick={() => handleKeyClick(note)}
              >
                <div
                  key={activeNote?.id}
                  className={cn(
                    'size-full rounded-b-[3px] border-b-[3px] border-b-zinc-600 bg-zinc-900 shadow-md transition-colors',
                    !!activeNote &&
                      'animate-piano-key-press border-orange-900 bg-orange-700',
                    blackKeyClassName,
                  )}
                  style={blackKeyStyle(activeNote, hintNotes?.get(note))}
                />
              </div>
            );
          })}
          <div className="inset-shadow pointer-events-none absolute inset-0" />
        </div>
        {midiToggle}
      </div>
    );
  }

  const octaveCount = Math.max(1, endC - startC + 1);
  const limitedOctaveCount = octaveCount;
  const octaveStart = startC;
  const octaves = Array.from(
    { length: limitedOctaveCount },
    (_, i) => octaveStart + i,
  );

  return (
    <div ref={setRef}>
      <div
        className={cn(
          'relative p-px mx-auto bg-black',
          className,
          vertical ? 'flex flex-col' : 'flex min-h-20 justify-center max-w-fit',
          !vertical && gaming ? 'gap-0' : '',
        )}
        style={{
          minWidth: vertical
            ? undefined
            : `${
                (gaming ? OCTAVE_WIDTH * 2 : OCTAVE_WIDTH) *
                (gaming ? limitedOctaveCount : endC - startC + 1)
              }px`,
          minHeight: vertical
            ? `${
                (gaming ? OCTAVE_HEIGHT * 2 : OCTAVE_HEIGHT) *
                (gaming ? limitedOctaveCount : endC - startC + 1)
              }px`
            : `${gaming ? OCTAVE_HEIGHT * 2 : OCTAVE_HEIGHT}px`,
        }}
      >
        {octaves.map((octave, index) => (
          <div
            key={octave}
            className={cn(
              gaming && index < octaves.length - 1
                ? vertical
                  ? 'mb-px'
                  : 'mr-px'
                : '',
            )}
          >
            {renderOctave(octave)}
          </div>
        ))}
        <div className="inset-shadow pointer-events-none absolute inset-0" />
      </div>

      {midiToggle}

      {/* {DEBUG && testTarget && (
        <DragableDebugMidiKeyboard eventTarget={testTarget} />
      )} */}
    </div>
  );
}

/** Live width of `el` plus the viewport height, for fill mode. */
function useFillSize(el: HTMLDivElement | null) {
  const [size, setSize] = useState({
    width: 0,
    viewportHeight: typeof window === 'undefined' ? 800 : window.innerHeight,
  });

  useEffect(() => {
    if (!el) return;
    const measure = () =>
      setSize({ width: el.clientWidth, viewportHeight: window.innerHeight });
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

  return size;
}
