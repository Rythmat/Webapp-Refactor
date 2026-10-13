import { useCallback } from 'react';
import type { MidiNoteEvent } from '@prism/engine';
import { noteEditorOriginTick } from '@/daw/audio/noteEditorOrigin';
import { useStore } from '@/daw/store';
import { ticksPerBar, timeSignatureOf } from '@/daw/time/timeModel';
import { PianoRoll, type PianoRollProps } from './PianoRoll';

// ── The piano roll on a clip of the project ────────────────────────────────
// A roll in the editor names its clip, { trackId, clipId }, and this works
// out the rest the same way everywhere: the roll starts at the clip's own
// tick 0 (its notes are clip time; noteEditorOrigin.ts) and sits in the song
// at clip.startTick, which places the playhead, the loop, the song's bar
// lines and the chord colours. The dock and the keyboard view used to pass
// the clip's song position as the roll's origin too, so a clip after bar 1
// looked empty and took new notes bars late (pianoroll-01, -02).
//
// With no clip (a track without any), the roll is blank and starts at
// `blankStartTick`; its first note makes a clip there.

export interface ClipPianoRollProps
  extends Omit<
    PianoRollProps,
    | 'events'
    | 'clipStartTick'
    | 'timelineStartTick'
    | 'onChange'
    | 'clipId'
    | 'clipColor'
  > {
  trackId: string;
  /** The clip to edit; null for a blank roll on a track without clips. */
  clipId: string | null;
  /** Where a blank roll starts, and its first note's clip with it. */
  blankStartTick?: number;
  /** The notes' colour; the track's by default. */
  clipColor?: string;
}

const NO_EVENTS: MidiNoteEvent[] = [];

export function ClipPianoRoll({
  trackId,
  clipId,
  blankStartTick = 0,
  clipColor,
  ...rest
}: ClipPianoRollProps) {
  const clip = useStore((s) =>
    clipId
      ? s.tracks
          .find((t) => t.id === trackId)
          ?.midiClips.find((c) => c.id === clipId)
      : undefined,
  );
  const trackColor = useStore(
    (s) => s.tracks.find((t) => t.id === trackId)?.color,
  );
  const barTicks = useStore((s) => ticksPerBar(timeSignatureOf(s)));

  const handleChange = useCallback(
    (events: MidiNoteEvent[]) => {
      const state = useStore.getState();
      if (clip) {
        state.updateMidiClipEvents(trackId, clip.id, events);
        return;
      }
      if (events.length === 0) return;
      // A blank roll's first note makes its clip, which the roll then edits.
      const id = `clip-${crypto.randomUUID().slice(0, 8)}`;
      state.addMidiClip(trackId, {
        id,
        name: 'Untitled',
        startTick: blankStartTick,
        events,
      });
      state.setSelectedClip(id, trackId);
    },
    [clip, trackId, blankStartTick],
  );

  const events = clip?.events ?? NO_EVENTS;
  return (
    <PianoRoll
      {...rest}
      events={events}
      clipId={clip?.id ?? null}
      clipStartTick={clip ? noteEditorOriginTick(events, barTicks) : 0}
      timelineStartTick={clip?.startTick ?? blankStartTick}
      clipColor={clipColor ?? trackColor ?? '#888'}
      onChange={handleChange}
    />
  );
}
