import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { initialProjectState } from './projectDefaults';

// ── A new project ──────────────────────────────────────────────────────────
//
// Where a project starts from: initialProjectState (./projectDefaults), the
// registry's resetOnNew keys at their defaults; initialTrackDefaults
// (./trackDefaults), a new track's fields; and resetProjectState, which
// empties the project in the store.
//
// This module imports the store, for resetProjectState, so nothing the store
// itself loads may import it: not a slice, nor any module a slice imports. A
// slice importing it would have the store's index run before that slice had
// finished loading, and the store would fail to build. The slices take
// initialProjectState and initialTrackDefaults from ./projectDefaults and
// ./trackDefaults, which never load the store; they are re-exported here for
// everyone else.

export { initialProjectState } from './projectDefaults';
export { initialTrackDefaults } from './trackDefaults';

/**
 * Empty the project in the store. A new session generation comes first, so
 * every cache keyed by track id (the Oracle patch cache, the track engines,
 * the synth panel) lets go of the old project before the store shows the new
 * one; then initialProjectState() goes in as one store write. `reason` names
 * the reset for the generation's listeners and logs ('new', 'template', …).
 *
 * The write goes straight to the store, never through the collab middleware,
 * so a reset is not sent to the other people in a room: leaving the room is a
 * step of its own. It leaves the undo history and the save status alone: the
 * caller resets the one and marks the other's baseline once the project is in
 * place (resetSessionToEmpty does both).
 *
 * Not for loads. A loader decodes first, bumps the generation only once the
 * load is certain, and writes what it decoded over initialProjectState() in
 * one store write (see sessionGeneration.ts). Called first, this would empty
 * the open project before a decode that can still fail.
 */
export function resetProjectState(reason: string): void {
  bumpSessionGeneration(reason);
  useStore.setState(initialProjectState());
}
