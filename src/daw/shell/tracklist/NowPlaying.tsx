import { memo, useMemo } from 'react';
import { cn } from '@/components/utilities';
import { buildLiveChord } from '@/daw/components/Library/buildChordInsights';
import {
  keyContext,
  liveChordLabels,
} from '@/daw/components/Library/insightNotation';
import { useStore } from '@/daw/store';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useChordNotation } from '@/lib/chordNotation';
import { RULER_PX, SECTIONS_LANE_PX } from './rowLayout';

// ── Now Playing, over the track list (owner, 2026-10-21) ───────────────────
//
// The chord the student is holding, live, in the track column's corner,
// level with the sections row and the ruler (it moved here from Insight;
// the chord ruler's settings sit under it, level with the chord lane,
// ChordRulerSettings): the chord in
// its colour and the chosen chord notation, then its notes and its place in
// the song's key ('2 min7'). Notes from audio (a guitar or a voice) win over
// MIDI's while there are any, as Insight read them. Nothing shows until two
// or more held notes make a chord. Its height is the sections row's and
// the ruler's together, so everything under it stays level with its lane.

/** Its height: the sections row and the ruler beside it. */
export const NOW_PLAYING_PX = SECTIONS_LANE_PX + RULER_PX;

export const NowPlaying = memo(function NowPlaying() {
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);
  const audioActiveNotes = useStore((s) => s.audioActiveNotes);
  const rootNote = useStore((s) => s.rootNote);
  const mode = useStore((s) => s.mode);
  const notation = useChordNotation();

  const chord = useMemo(() => {
    const notes =
      audioActiveNotes.length > 0 ? audioActiveNotes : hwActiveNotes;
    return buildLiveChord(notes, rootNote, mode);
  }, [audioActiveNotes, hwActiveNotes, rootNote, mode]);
  const labels =
    chord && liveChordLabels(chord, notation, keyContext(rootNote, mode));
  // Its place in the key: the notation's own, else the hybrid number.
  const degree = labels ? (labels.detail ?? chord?.hybrid ?? null) : null;

  return (
    <div
      data-testid="now-playing"
      aria-live="polite"
      aria-label="Now playing"
      className="flex flex-col justify-center gap-0.5 border-b border-daw-hairline bg-daw-surface-1 px-4"
      style={{ height: NOW_PLAYING_PX }}
    >
      <span className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>
        Now playing
      </span>
      {chord && labels ? (
        <>
          <div className="flex min-w-0 items-center gap-1.5">
            {chord.color ? (
              <span
                aria-hidden
                data-meaning="chord-colour"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: chord.color }}
              />
            ) : null}
            <span
              data-testid="now-playing-chord"
              className={cn(
                TYPE_CLASS.label,
                'min-w-0 truncate font-bold text-daw-text',
              )}
            >
              {labels.title}
            </span>
            <span
              data-testid="now-playing-notes"
              className={cn(
                TYPE_CLASS.label,
                'ml-auto shrink-0 tabular-nums text-daw-text-3',
              )}
            >
              {chord.noteNames.join(' ')}
              {degree ? ` · ${degree}` : ''}
            </span>
          </div>
        </>
      ) : (
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
          Play a chord to see it here
        </span>
      )}
    </div>
  );
});
