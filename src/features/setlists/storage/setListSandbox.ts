import { create } from 'zustand';
import type { SetListsBlob } from '../types';

/**
 * A practice copy of the player's set lists.
 *
 * The How to Navigate tour shows a player how to make a set list, a show and
 * a band and drag one into the next, and every one of those edits would
 * otherwise be saved to their account. While the copy is on, the set lists
 * storage (gameOptionsSetListsStore) reads and writes it instead: nothing
 * reaches the server, the cache or another tab, and when the tour moves on
 * the copy is thrown away and the player's own set lists are back as they
 * were (Peter, 2026-10-21). In memory only.
 */

interface SandboxIds {
  setLists: readonly string[];
  shows: readonly string[];
  artists: readonly string[];
}

interface SandboxState {
  active: boolean;
  /** The copy; null until a page first reads the player's set lists. */
  blob: SetListsBlob | null;
  /** What the player had when the copy was made: anything else is new. */
  base: SandboxIds | null;
  /** Readies the copy as it is made (the tour adds a lead sheet to drag). */
  prepare: ((blob: SetListsBlob) => SetListsBlob) | null;
}

export const useSetListSandbox = create<SandboxState>(() => ({
  active: false,
  blob: null,
  base: null,
  prepare: null,
}));

const idsOf = (blob: SetListsBlob): SandboxIds => ({
  setLists: Object.keys(blob.setLists),
  shows: Object.keys(blob.shows),
  artists: Object.keys(blob.artists),
});

export function startSetListSandbox(
  prepare: ((blob: SetListsBlob) => SetListsBlob) | null = null,
) {
  if (useSetListSandbox.getState().active) return;
  useSetListSandbox.setState({ active: true, blob: null, base: null, prepare });
}

export function stopSetListSandbox() {
  if (!useSetListSandbox.getState().active) return;
  useSetListSandbox.setState({
    active: false,
    blob: null,
    base: null,
    prepare: null,
  });
}

export const setListSandboxActive = () => useSetListSandbox.getState().active;

/** Makes the copy from the player's set lists, once. */
export function seedSetListSandbox(from: SetListsBlob) {
  const { active, blob, prepare } = useSetListSandbox.getState();
  if (!active || blob) return;
  const prepared = prepare ? prepare(from) : from;
  // What the copy was readied with counts as the player's, not as new.
  useSetListSandbox.setState({ base: idsOf(prepared), blob: prepared });
}

/** An edit to the copy (a page's, or the tour's own). */
export function writeSetListSandbox(next: SetListsBlob) {
  const { active, base } = useSetListSandbox.getState();
  if (!active) return;
  useSetListSandbox.setState({ blob: next, base: base ?? idsOf(next) });
}

export function updateSetListSandbox(
  edit: (blob: SetListsBlob) => SetListsBlob,
) {
  const { active, blob } = useSetListSandbox.getState();
  if (active && blob) writeSetListSandbox(edit(blob));
}

/** What was made in the copy, newest last. */
export function sandboxAdditions(
  state: Pick<SandboxState, 'blob' | 'base'> = useSetListSandbox.getState(),
): SandboxIds {
  const { blob, base } = state;
  if (!blob || !base) return { setLists: [], shows: [], artists: [] };
  const added = (all: Record<string, unknown>, had: readonly string[]) =>
    Object.keys(all).filter((id) => !had.includes(id));
  return {
    setLists: added(blob.setLists, base.setLists),
    shows: added(blob.shows, base.shows),
    artists: added(blob.artists, base.artists),
  };
}
