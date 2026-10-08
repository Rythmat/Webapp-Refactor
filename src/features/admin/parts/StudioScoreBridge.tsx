import { useEffect, useLayoutEffect, useRef, useState, type FC } from 'react';
import {
  fromMidiEvents,
  toMidiEvents,
} from '@/curriculum/engine/parts/convert';
import {
  partTicks,
  type InstrumentPart,
  type PartNote,
} from '@/curriculum/engine/parts/part';
import { ScoreView } from '@/daw/components/Score/ScoreView';
import { useStore } from '@/daw/store';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import { parseSound } from './sounds';

const CLIP_ID = 'parts-library-clip';

/** Same notes in the same places — what a round trip through the store keeps. */
const sameNotes = (
  a: readonly {
    tick: number;
    midi: number;
    duration: number;
    velocity: number;
  }[],
  b: readonly {
    tick: number;
    midi: number;
    duration: number;
    velocity: number;
  }[],
) =>
  a.length === b.length &&
  a.every(
    (n, i) =>
      n.tick === b[i].tick &&
      n.midi === b[i].midi &&
      n.duration === b[i].duration &&
      n.velocity === b[i].velocity,
  );

/**
 * The Studio's own Score editor, on the part.
 *
 * The Score editor is built on the Studio store (a module singleton, ~40
 * selectors), so rather than fork it this borrows the store while the Staff
 * view is open: snapshot it, load the part as the only track, and put the
 * snapshot back on the way out. Safe because the Studio's autosave and
 * collaboration only subscribe while the Studio itself is mounted, and the
 * console is a different route; the Studio's undo history is cleared both
 * ways so neither sees the other's edits.
 */
export const StudioScoreBridge: FC<{
  part: InstrumentPart;
  onNotes: (notes: PartNote[]) => void;
}> = ({ part, onNotes }) => {
  const [trackId, setTrackId] = useState<string | null>(null);
  const partRef = useRef(part);
  partRef.current = part;
  const onNotesRef = useRef(onNotes);
  onNotesRef.current = onNotes;

  // Borrow the store: one track, one clip, the part's key and meter.
  useLayoutEffect(() => {
    const snapshot = useStore.getState();
    const p = partRef.current;
    resetUndoHistory();
    useStore.setState({
      tracks: [],
      chordRegions: [],
      rootNote: p.key.tonic,
      mode: p.key.mode,
      projectName: p.name,
      composerName: 'Music Atlas Parts Library',
      leadSheetSections: [],
      leadSheetRepeats: [],
      scoreChordTracks: [],
      scoreChordHidden: [],
      scoreArticulations: [],
      scoreSlurs: [],
      scoreSpellings: [],
      scoreSystemBreaks: [],
      scorePageBreaks: [],
      scoreSystemRuns: [],
      scoreTextMarks: [],
      scoreSlashNotes: [],
      measureRowSizes: null,
      measureFermatas: null,
      selectedClipId: null,
    });
    const s = useStore.getState();
    s.setTimeSignature(p.timeSignature[0], p.timeSignature[1]);
    s.setBpm(p.tempo);
    const { type } = parseSound(p.sound);
    const id = s.addTrack('midi', type, p.name);
    s.addMidiClip(id, {
      id: CLIP_ID,
      name: p.name,
      startTick: 0,
      durationTicks: partTicks(p),
      events: toMidiEvents(p.notes),
    });
    setTrackId(id);

    // Score edits → the part.
    const unsub = useStore.subscribe(
      (st) => st.tracks,
      (tracks) => {
        const clip = tracks
          .find((t) => t.id === id)
          ?.midiClips.find((c) => c.id === CLIP_ID);
        if (!clip) return;
        const notes = fromMidiEvents(clip.events, partRef.current.notes);
        if (!sameNotes(notes, partRef.current.notes)) onNotesRef.current(notes);
      },
    );

    return () => {
      unsub();
      useStore.setState(snapshot, true);
      resetUndoHistory();
    };
  }, []);

  // The part → the score (undo, transpose, the roll in another tab…).
  useEffect(() => {
    if (!trackId) return;
    const s = useStore.getState();
    const clip = s.tracks
      .find((t) => t.id === trackId)
      ?.midiClips.find((c) => c.id === CLIP_ID);
    const current = clip ? fromMidiEvents(clip.events, part.notes) : [];
    if (!sameNotes(current, part.notes)) {
      s.updateMidiClipEvents(trackId, CLIP_ID, toMidiEvents(part.notes));
    }
    if (s.rootNote !== part.key.tonic || s.mode !== part.key.mode) {
      useStore.setState({ rootNote: part.key.tonic, mode: part.key.mode });
    }
  }, [trackId, part.notes, part.key]);

  return trackId ? <ScoreView /> : null;
};
