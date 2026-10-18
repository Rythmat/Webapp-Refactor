import { useStore } from '@/daw/store';
import { splitMidiClip } from './midiClipCuts';

/**
 * Split the MIDI clip `clipId` on `trackId` at song tick `splitTick`: the
 * scissors tool. The cut lands at the clip tick under the cursor and the
 * right half's notes move onto its own start (see midiClipCuts.ts). The left
 * half keeps the clip's id, so Score marks on its notes stay put, and the
 * chords Prism read from the clip after the cut follow the right half from
 * now on (sourceClipId). One undo step. Returns the right half's id, or null
 * when nothing was split (no such clip, the tick isn't inside it, or the
 * track is locked).
 */
export function splitMidiClipAt(
  trackId: string,
  clipId: string,
  splitTick: number,
): string | null {
  const state = useStore.getState();
  const track = state.tracks.find((t) => t.id === trackId);
  const clip = track?.midiClips.find((c) => c.id === clipId);
  if (!track || !clip) return null;

  const rightId = `clip-split-${crypto.randomUUID().slice(0, 8)}`;
  const halves = splitMidiClip(clip, splitTick, rightId);
  if (!halves) return null;

  state.updateTrack(trackId, {
    midiClips: track.midiClips.flatMap((c) => (c.id === clip.id ? halves : c)),
  });
  // A collaborator's track lock turns the write into a no-op.
  const landed = useStore
    .getState()
    .tracks.some(
      (t) => t.id === trackId && t.midiClips.some((c) => c.id === rightId),
    );
  if (!landed) return null;

  // The chords read from the clip that start in the right half go with it,
  // written through the store's action so a shared session gets it too.
  const { chordRegions, applyArrangementPatch } = useStore.getState();
  if (
    chordRegions.some(
      (r) => r.sourceClipId === clip.id && r.startTick >= splitTick,
    )
  ) {
    applyArrangementPatch({
      chordRegions: chordRegions.map((r) =>
        r.sourceClipId === clip.id && r.startTick >= splitTick
          ? { ...r, sourceClipId: rightId }
          : r,
      ),
    });
  }

  // Selected notes are indices into the clip's events, which the cut
  // renumbers: drop the selection rather than point it at other notes.
  const { selectedNotes, setSelectedNotes } = useStore.getState();
  if (selectedNotes.some((s) => s.clipId === clip.id)) {
    setSelectedNotes(selectedNotes.filter((s) => s.clipId !== clip.id));
  }
  return rightId;
}
