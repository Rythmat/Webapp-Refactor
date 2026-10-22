import { typedChord } from '@/daw/harmony/chordInput';
import { keyFrameOf } from '@/daw/harmony/keyFrame';
import { noteNameInKey } from '@/daw/prism-engine/data/notes';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { snapTicks, timelineSnapGrid } from '@/daw/time/timeModel';

// ── Editing the chord ruler (owner, 2026-10-21) ────────────────────────────
//
// The chord ruler (the chord lane over the tracks) is the song's chords, and
// the Score reads it: what is edited here shows there. On the ruler a
// student can
// - type a chord over one (double-click, or its menu's Edit chord…), in the
//   Timeline's chord box;
// - put a chord in (Insert chord here: inside a chord it splits it, in a
//   gap it runs to the next chord or the bar's end) and type it;
// - delete the selected chords (Delete or Backspace, or the menu);
// - drag a chord along, or its end to resize it (Timeline).
// Each is one undo step.

/** Opens the Timeline's chord box on a chord; set while it is mounted. */
let chordEditor: ((chordId: string) => void) | null = null;

/** The Timeline hands over how it opens its chord box (null on unmount). */
export function setChordEditor(open: ((chordId: string) => void) | null) {
  chordEditor = open;
}

/**
 * Opens the chord box on `chordId`, to type another chord over it: a moment
 * later, so a menu it was picked from has closed and let go of the focus
 * (the box would lose it to the closing menu, and close).
 */
export function editChord(chordId: string): void {
  setTimeout(() => chordEditor?.(chordId), 0);
}

/** Minor-third modes: their home chord is minor. */
const MINOR_MODES = new Set([
  'aeolian',
  'dorian',
  'phrygian',
  'harmonicMinor',
  'melodicMinor',
]);

/** The key's home chord as text the chord box reads ('A−' reads 'Am'). */
function homeChordText(rootNote: number, mode: string): string {
  const root = noteNameInKey(rootNote, rootNote, mode);
  if (mode === 'locrian') return `${root}dim`;
  return MINOR_MODES.has(mode) ? `${root}m` : root;
}

/**
 * Puts a chord on the ruler at `tick` (on the grid) and opens the box to
 * type it: the chord sounding there (inside one, splitting it), else the
 * key's home chord. Returns the new chord's id, or null.
 */
export function insertChordAt(tick: number): string | null {
  const state = useStore.getState();
  const at = Math.max(0, snapTicks(tick, timelineSnapGrid(state)));
  const frame = keyFrameOf(state.rootNote, state.mode);
  const sounding = state.chordRegions.find(
    (r) => r.startTick <= at && r.endTick > at,
  );
  if (sounding?.startTick === at) {
    editChord(sounding.id);
    return sounding.id;
  }
  const chord = sounding
    ? {
        name: sounding.name,
        noteName: sounding.noteName,
        color: sounding.color,
        degreeKey: sounding.degreeKey,
        identity: sounding.identity,
      }
    : typedChord(homeChordText(state.rootNote ?? 0, state.mode), frame);
  if (!chord) return null;
  withTransaction('Insert chord', () =>
    useStore
      .getState()
      .insertChordRegion(at, chord.name, chord.noteName, chord.color, {
        degreeKey: chord.degreeKey,
        identity: chord.identity,
      }),
  );
  const added = useStore
    .getState()
    .chordRegions.find((r) => r.startTick === at);
  if (!added) return null;
  useStore.getState().setSelectedChordIds([added.id]);
  editChord(added.id);
  return added.id;
}

/** Deletes chords from the ruler (the one before each takes its time). */
export function deleteChords(ids: readonly string[]): boolean {
  const present = ids.filter((id) =>
    useStore.getState().chordRegions.some((r) => r.id === id),
  );
  if (present.length === 0) return false;
  withTransaction(present.length > 1 ? 'Delete chords' : 'Delete chord', () => {
    for (const id of present) useStore.getState().deleteChordRegion(id);
  });
  useStore.getState().setSelectedChordIds([]);
  return true;
}

/** Deletes the selected chords; false when none is selected. */
export function deleteSelectedChords(): boolean {
  return deleteChords(useStore.getState().selectedChordIds);
}
