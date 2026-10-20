import { Keyboard } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/components/utilities';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import {
  chordPads,
  melodyPads,
  type EchoLevelNumber,
} from '@/curriculum/engine/echo';
import {
  degreeLabel,
  degreeOfMidi,
  SCALE_SEMITONES,
} from '@/curriculum/engine/musicLiteracy/pitch';
import { literacyKeyRange } from '@/curriculum/musicLiteracy/literacyKeyRange';
import {
  typingOctaveLabel,
  typingOctavesFor,
} from '@/curriculum/musicLiteracy/typingKeys';
import { LessonKeyboard } from '@/learn/components/LessonKeyboard';
import type { EchoKeyChoice } from '../echoProgress';
import type { EchoInputMode } from '../echoSettings';
import { EchoChordPads } from './EchoChordPads';
import { EchoMelodyPads } from './EchoMelodyPads';
import {
  useEchoInput,
  type EchoNoteOff,
  type EchoNoteOn,
} from './useEchoInput';

// ── What the student plays on ──────────────────────────────────────────────
// Echo's input, whole: the melody pads, the chord pads or the piano, by the
// game's input setting, with every way to play them heard as one note
// stream (useEchoInput.ts). The play screens put it under the call; Make
// Your Song puts it under a take (its `renderInput`).
//
//   Pads      melody: the level's scale degrees as a staircase of pads;
//             chords: the key's six chords. The home row presses them.
//   Keyboard  the on-screen piano at real proportions, two octaves round
//             the notes asked for (literacyKeyRange.ts), the scale's keys
//             named by degree; the letter keys play it (A = C, Z and X move
//             the octave) and so does a MIDI keyboard.
//
// Notes sound on the lesson piano as they're played (`sound`). Atlas's
// notes light the pads and keys through `lit`.

export interface EchoInputSurfaceProps {
  /** Pads or Keyboard (Game Settings). */
  input: EchoInputMode;
  /** Melody pads or chord pads; with Keyboard, what the keys are labeled for. */
  kind: 'melody' | 'chords';
  level: EchoLevelNumber;
  keyChoice: EchoKeyChoice;
  onNoteOn: (note: EchoNoteOn) => void;
  onNoteOff: (note: EchoNoteOff) => void;
  /** Notes sounding that the student didn't play: Atlas's call. */
  lit?: readonly number[];
  /**
   * Keyboard: the notes asked for now (a call's), which the keys show and
   * the letter keys start nearest. Left out, the pads' notes.
   */
  targets?: readonly number[];
  /** Keyboard: whether a held key is right (its color) or not (gray). */
  isRight?: (midi: number) => boolean;
  /** Keyboard: the keys are at most this tall (px). */
  keyboardMaxHeight?: number;
  /** Off: dimmed, and nothing is heard (default on). */
  enabled?: boolean;
  /** Sound each note on the lesson piano (default on). */
  sound?: boolean;
  className?: string;
}

/** White-key length ÷ width, as Music Literacy's keys. */
const KEY_ASPECT = 6;

/** The house gray for a key held that isn't asked for. */
const WRONG_KEY = '#e8e8f0';

export function EchoInputSurface({
  input,
  kind,
  level,
  keyChoice,
  onNoteOn,
  onNoteOff,
  lit = [],
  targets,
  isRight,
  keyboardMaxHeight = 150,
  enabled = true,
  sound = true,
  className,
}: EchoInputSurfaceProps) {
  const melody = useMemo(
    () => melodyPads(level, keyChoice),
    [level, keyChoice],
  );
  const chords = useMemo(() => chordPads(keyChoice), [keyChoice]);
  const usePads = input === 'pads';
  const padNotes = useMemo(
    () =>
      !usePads
        ? []
        : kind === 'melody'
          ? melody.pads.map((pad) => [pad.midi])
          : chords.map((pad) => pad.chord.midis),
    [usePads, kind, melody, chords],
  );

  // The keyboard's two octaves, round the notes asked for.
  const asked = useMemo(
    () =>
      targets && targets.length
        ? [...targets]
        : kind === 'melody'
          ? melody.pads.map((pad) => pad.midi)
          : chords.flatMap((pad) => [...pad.chord.midis]),
    [targets, kind, melody, chords],
  );
  const range = useMemo(() => literacyKeyRange(asked), [asked]);
  const octaves = useMemo(() => typingOctavesFor(range, asked), [range, asked]);

  const input$ = useEchoInput({
    mode: input,
    pads: padNotes,
    onNoteOn,
    onNoteOff,
    octaves,
    sound,
    tonic: melody.tonic,
    enabled,
  });

  // A pad lights with its notes: Atlas's, or the student's from MIDI.
  const sounding = useMemo(
    () => new Set([...lit, ...input$.held]),
    [lit, input$.held],
  );
  const litPads = useMemo(() => {
    const on = new Set<number>();
    if (kind === 'melody') {
      melody.pads.forEach((pad, i) => {
        if (sounding.has(pad.midi)) on.add(i);
      });
    } else {
      const classes = new Set([...sounding].map((m) => ((m % 12) + 12) % 12));
      chords.forEach((pad, i) => {
        if (pad.chord.pitchClasses.every((pc) => classes.has(pc))) on.add(i);
      });
    }
    return on;
  }, [kind, melody, chords, sounding]);

  if (usePads) {
    return (
      <div
        data-echo-input="pads"
        className={cn('flex min-h-0 w-full flex-1 flex-col', className)}
      >
        {kind === 'melody' ? (
          <EchoMelodyPads
            pads={melody.pads}
            lit={litPads}
            held={input$.heldPads}
            onPadPointerDown={input$.onPadPointerDown}
            disabled={!enabled}
          />
        ) : (
          <EchoChordPads
            pads={chords}
            lit={litPads}
            held={input$.heldPads}
            onPadPointerDown={input$.onPadPointerDown}
            disabled={!enabled}
          />
        )}
      </div>
    );
  }

  return (
    <EchoKeys
      className={className}
      range={range}
      keyColor={melody.keyColor}
      tonic={melody.tonic}
      mode={keyChoice.mode}
      asked={asked}
      lit={lit}
      held={input$.held}
      isRight={isRight}
      maxHeight={keyboardMaxHeight}
      typingOctave={input$.typingOctave}
      onKeyPointerDown={input$.onKeyPointerDown}
      enabled={enabled}
    />
  );
}

/** The piano: the keys, and how to play them from the computer. */
function EchoKeys({
  className,
  range,
  keyColor,
  tonic,
  mode,
  asked,
  lit,
  held,
  isRight,
  maxHeight,
  typingOctave,
  onKeyPointerDown,
  enabled,
}: {
  className?: string;
  range: { low: number; high: number };
  keyColor: string;
  tonic: number;
  mode: EchoKeyChoice['mode'];
  asked: readonly number[];
  lit: readonly number[];
  held: ReadonlySet<number>;
  isRight?: (midi: number) => boolean;
  maxHeight: number;
  typingOctave: number;
  onKeyPointerDown: ReturnType<typeof useEchoInput>['onKeyPointerDown'];
  enabled: boolean;
}) {
  // The scale's keys named by degree, the ones asked for first among them.
  const keyLabels = useMemo(() => {
    const scale = new Set(SCALE_SEMITONES[mode]);
    const labels = new Map<number, string>();
    for (let midi = range.low; midi <= range.high; midi++) {
      const above = (((midi - tonic) % 12) + 12) % 12;
      if (scale.has(above) || asked.includes(midi)) {
        labels.set(midi, degreeLabel(degreeOfMidi(midi, tonic).degree));
      }
    }
    return labels;
  }, [range, tonic, mode, asked]);
  const playingNotes = useMemo<PlaybackEvent[]>(
    () =>
      lit.map((midi) => ({
        id: `lit-${midi}`,
        type: 'note',
        midi,
        time: 0,
        duration: 1,
        velocity: 80,
      })),
    [lit],
  );
  const played = useMemo(
    () =>
      new Map(
        [...held].map(
          (midi) =>
            [midi, !isRight || isRight(midi) ? keyColor : WRONG_KEY] as const,
        ),
      ),
    [held, isRight, keyColor],
  );
  const key = (text: string) => (
    <kbd className="rounded border border-white/15 bg-white/[0.06] px-1 font-sans text-[11px] leading-4 text-[#e8e8f0]">
      {text}
    </kbd>
  );
  return (
    <div
      data-echo-input="keyboard"
      data-typing-octave={typingOctave}
      className={cn(
        'flex w-full min-w-0 flex-col items-center',
        !enabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <LessonKeyboard
        range={range}
        natural={{ aspect: KEY_ASPECT, maxHeight }}
        activeWhiteKeyColor={keyColor}
        activeBlackKeyColor={keyColor}
        keyLabels={keyLabels}
        playingNotes={playingNotes}
        playedKeys={played}
        enableClick={false}
        useContextNotes={false}
        onKeyPointerDown={onKeyPointerDown}
      />
      <p
        data-echo-typing-hint
        className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/45"
      >
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Keyboard aria-hidden className="mr-0.5 size-3.5" />
          Letter keys: {key('A')}–{key('K')} white, {key('W')}
          {key('E')}
          {key('T')}
          {key('Y')}
          {key('U')} black
        </span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          {key('Z')}
          {key('X')} octave · {typingOctaveLabel(typingOctave)}
        </span>
      </p>
    </div>
  );
}
