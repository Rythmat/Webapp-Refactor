/**
 * useDemoPlayback.ts — Sequential note demo with keyboard highlighting.
 * User presses Demo button → notes play one at a time → keyboard lights up.
 * Uses the Salamander Grand Piano sampler for authentic sound, unless the
 * lesson brings its own voice (guitar).
 */

import { useCallback, useRef, useState } from 'react';
import { startTone } from '@/audio/core/toneBridge';
import {
  triggerPianoAttackRelease,
  startPianoSampler,
} from '@/audio/pianoSampler';
import {
  midiToPitchName,
  type GenreNoteEvent,
} from '../engine/genreGeneration/resolveStepContent';

/**
 * A lesson instrument other than the piano. The demo plays through it instead
 * of the piano sampler; without one, the piano plays as it always has.
 */
export interface LessonVoice {
  /** Ready the sound; awaited on the Demo gesture before the first note. */
  load(): Promise<void>;
  /** Sound a note now, or a chord (an array) the way the instrument plays one. */
  attackRelease(
    midis: number | readonly number[],
    durationSeconds: number,
    velocity: number,
    /** Tone.js time; omit to play now. */
    time?: number,
  ): void;
  /** Silence everything the voice is playing or has scheduled. */
  stop(): void;
}

export function useDemoPlayback(
  keyRoot: number,
  tempo: number,
  voice?: LessonVoice,
) {
  const [demoHighlightMidis, setDemoHighlightMidis] = useState<Set<number>>(
    new Set(),
  );
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopDemo = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    voice?.stop();
    setDemoHighlightMidis(new Set());
    setIsPlayingDemo(false);
  }, [voice]);

  const playDemo = useCallback(
    async (targetNotes: GenreNoteEvent[]) => {
      // Stop any current demo
      stopDemo();

      // Unlock Web Audio + load the sound on user gesture
      await startTone();
      if (voice) await voice.load();
      else await startPianoSampler();

      setIsPlayingDemo(true);

      // Group notes by onset (chords play simultaneously)
      const onsetGroups = new Map<number, GenreNoteEvent[]>();
      const sorted = [...targetNotes].sort((a, b) => a.onset - b.onset);
      sorted.forEach((note) => {
        const group = onsetGroups.get(note.onset) ?? [];
        group.push(note);
        onsetGroups.set(note.onset, group);
      });

      const groups = [...onsetGroups.values()];

      // Demo plays at a comfortable speed — not too fast
      const demoMsPerBeat = Math.max(600, 60000 / Math.min(tempo, 80));
      const demoTickMs = demoMsPerBeat / 480;

      groups.forEach((group, groupIdx) => {
        const onset = group[0].onset;
        const delay = onset * demoTickMs;
        const groupDuration = Math.max(...group.map((n) => n.duration));
        const holdMs = groupDuration * demoTickMs;

        // Light up at note onset
        const onT = setTimeout(() => {
          const midis = new Set(group.map((n) => n.midi));
          setDemoHighlightMidis(midis);

          if (voice) {
            // A chord goes to the voice whole, so a guitar can strum it
            voice.attackRelease(
              group.length >= 2 ? group.map((n) => n.midi) : group[0].midi,
              Math.max(0.3, holdMs / 1000),
              80,
            );
            return;
          }

          // Play through Salamander piano sampler
          group.forEach((note) => {
            const noteName = midiToPitchName(note.midi, keyRoot);
            const durationSec = Math.max(
              0.3,
              (note.duration * demoTickMs) / 1000,
            );
            void triggerPianoAttackRelease(noteName, durationSec, 80);
          });
        }, delay);
        timeoutsRef.current.push(onT);

        // Clear ONLY if this is the last group, or if the next group starts
        // AFTER this note ends (gap between notes)
        const nextGroup = groups[groupIdx + 1];
        if (nextGroup) {
          const nextOnset = nextGroup[0].onset;
          const gapMs = (nextOnset - onset) * demoTickMs;
          // If gap is longer than this note's duration, clear before next note
          if (gapMs > holdMs) {
            const clearT = setTimeout(() => {
              setDemoHighlightMidis(new Set());
            }, delay + holdMs);
            timeoutsRef.current.push(clearT);
          }
          // Otherwise, the next group's setDemoHighlightMidis will replace this one
        }
      });

      // Clear after last note and mark demo finished
      const lastOnset = groups[groups.length - 1]?.[0].onset ?? 0;
      const lastDuration = Math.max(
        ...(groups[groups.length - 1]?.map((n) => n.duration) ?? [480]),
      );
      const totalMs = (lastOnset + lastDuration) * demoTickMs + 200;

      // Clear highlights after last note's duration
      const clearLastT = setTimeout(
        () => {
          setDemoHighlightMidis(new Set());
        },
        lastOnset * demoTickMs + lastDuration * demoTickMs,
      );
      timeoutsRef.current.push(clearLastT);

      const doneT = setTimeout(() => {
        setIsPlayingDemo(false);
      }, totalMs);
      timeoutsRef.current.push(doneT);
    },
    [stopDemo, tempo, keyRoot, voice],
  );

  return { playDemo, stopDemo, demoHighlightMidis, isPlayingDemo };
}
