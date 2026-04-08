/**
 * useDemoPlayback.ts — Sequential note demo with keyboard highlighting.
 * User presses Demo button → notes play one at a time → keyboard lights up.
 * Uses the Salamander Grand Piano sampler for authentic sound.
 */

import { useCallback, useRef, useState } from 'react';
import * as Tone from 'tone';
import {
  triggerPianoAttackRelease,
  startPianoSampler,
} from '@/audio/pianoSampler';
import { midiToPitchName, type GenreNoteEvent } from '../engine/genreGeneration/resolveStepContent';

export function useDemoPlayback(keyRoot: number, tempo: number) {
  const [demoHighlightMidis, setDemoHighlightMidis] = useState<Set<number>>(
    new Set(),
  );
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopDemo = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setDemoHighlightMidis(new Set());
    setIsPlayingDemo(false);
  }, []);

  const playDemo = useCallback(
    async (targetNotes: GenreNoteEvent[]) => {
      // Stop any current demo
      stopDemo();

      // Unlock Web Audio + load sampler on user gesture
      await Tone.start();
      await startPianoSampler();

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

          // Play through Salamander piano sampler
          group.forEach((note) => {
            const noteName = midiToPitchName(note.midi, keyRoot);
            const durationSec = Math.max(0.3, (note.duration * demoTickMs) / 1000);
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
      const clearLastT = setTimeout(() => {
        setDemoHighlightMidis(new Set());
      }, (lastOnset * demoTickMs) + (lastDuration * demoTickMs));
      timeoutsRef.current.push(clearLastT);

      const doneT = setTimeout(() => {
        setIsPlayingDemo(false);
      }, totalMs);
      timeoutsRef.current.push(doneT);
    },
    [stopDemo, tempo, keyRoot],
  );

  return { playDemo, stopDemo, demoHighlightMidis, isPlayingDemo };
}
