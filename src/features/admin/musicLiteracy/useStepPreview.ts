/**
 * The Music Literacy editor's ▶ Play step: the count-in, the words and the
 * call, once, at the step's tempo on the Studio's piano sampler (the Parts
 * editor's player, usePartPlayer), with a click on every beat. While it
 * plays it says which syllable or note is sounding, as heard, so the editor
 * can light its chip.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import {
  secondsPerTick,
  stepNotes,
  type TimedNote,
} from '@/curriculum/engine/musicLiteracy/literacy';
import type { InstrumentPart } from '@/curriculum/engine/parts/part';
import { usePartPlayer } from '../parts/usePartPlayer';

export interface LitNote {
  step: number;
  segment: 'words' | 'call';
  /** The note's index within its segment. */
  index: number;
}

interface Playing {
  step: number;
  end: number;
  words: TimedNote[];
  call: TimedNote[];
}

/** The note sounding at `tick`; null in a rest. */
function sounding(notes: readonly TimedNote[], tick: number): number | null {
  let found: number | null = null;
  notes.forEach((note, i) => {
    if (note.onset <= tick && tick < note.onset + note.duration) found = i;
  });
  return found;
}

export function useStepPreview() {
  const player = usePartPlayer();
  const [playing, setPlaying] = useState<Playing | null>(null);
  const timer = useRef<number>();

  const stop = useCallback(() => {
    window.clearTimeout(timer.current);
    player.stop();
    setPlaying(null);
  }, [player]);

  const play = useCallback(
    async (lesson: MusicLiteracyLesson, index: number) => {
      const step = lesson.steps[index];
      if (!step) return;
      window.clearTimeout(timer.current);
      // From the top every time, not from wherever a last play left off.
      player.stop();
      const { timeline, words, call } = stepNotes(lesson, step);
      const end = timeline.call.start + timeline.call.length;
      const part: InstrumentPart = {
        id: `preview-${lesson.id}`,
        name: step.title,
        instrument: 'piano',
        role: 'melody',
        level: 1,
        tags: [],
        status: 'draft',
        key: { tonic: 0, mode: 'ionian' },
        timeSignature: [lesson.timeSignature[0], lesson.timeSignature[1]],
        bars: end / timeline.barTicks,
        tempo: timeline.tempo,
        swing: 50,
        sound: 'piano-sampler',
        notes: [...words, ...call].map((note) => ({
          tick: note.onset,
          duration: note.duration,
          midi: note.midi,
          velocity: 96,
        })),
        source: { kind: 'scratch' },
      };
      setPlaying({ step: index, end, words, call });
      try {
        await player.play(part, undefined, { click: true });
      } catch (error) {
        setPlaying(null);
        throw error;
      }
      // Once through: the player loops, so stop it at the call's last bar
      // line (the count-in is silent, should the loop come round first).
      timer.current = window.setTimeout(
        stop,
        (end * secondsPerTick(timeline.tempo) + 0.25) * 1000,
      );
    },
    [player, stop],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Re-read on every frame the player draws (its playhead), as heard.
  let lit: LitNote | null = null;
  if (playing && player.playing) {
    const tick = player.currentTick();
    const words = sounding(playing.words, tick);
    const call = sounding(playing.call, tick);
    if (words !== null)
      lit = { step: playing.step, segment: 'words', index: words };
    else if (call !== null)
      lit = { step: playing.step, segment: 'call', index: call };
  }

  return {
    play,
    stop,
    /** The step playing, or null. */
    playingStep: playing && player.playing ? playing.step : null,
    loading: player.loading,
    lit,
  };
}
