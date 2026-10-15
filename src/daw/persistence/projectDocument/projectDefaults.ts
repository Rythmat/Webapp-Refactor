import type { AllSlices } from '@/daw/store';
import { RESET_ON_NEW_KEYS, fieldDefault } from './fields';

// ── A new project's starting state ─────────────────────────────────────────
//
// What every project starts from, taken from the registry (fields.ts) rather
// than from lists kept by hand. Before this, the reset and each loader named
// the keys they cleared, and every key they missed carried over from the
// project before: a key lock that silently blocked the next song's key, a
// detected key that auto-tune and the chord detector preferred over the
// project's own, the last project's markers, metre, mastering and Score
// marks, its selected track, zoom and editing tool. Now every key the
// registry marks resetOnNew starts over with each new project and each load,
// and so does any key added to the store, once it is classified.
//
// What carries on is what the registry says belongs to the student, the
// computer or the page rather than to a project: prefs (metronome, snap),
// the collaboration room, the connected devices, the clipboard and panel
// layout.
//
// Like ./trackDefaults, this module never loads the store, so the store's
// own slices can start a project from it (a template opened in place of the
// project). resetProjectState, which writes the store, is in ./initialState.

/**
 * Every key a new project starts over with (RESET_ON_NEW_KEYS), at its
 * registry default: the project's own fields, how it was last seen (view
 * state), and the session state that belongs to the open project
 * (selections, analyses, the lesson running, a take being recorded). Never a
 * pref, the collaboration room, a device list or the clipboard. A fresh
 * object with fresh arrays and objects on every call, so no two projects
 * share one.
 *
 * A loader spreads it under what it decoded, so whatever the save doesn't
 * carry starts fresh rather than carrying over from the session it replaces:
 * `setState({ ...initialProjectState(), ...decoded })`. The keys derived
 * from the project (the next track colour, the key colour, the Prism
 * builder's next chords, where Stop returns to) come back at their defaults,
 * so the loader derives them from what it decoded.
 */
export function initialProjectState(): Partial<AllSlices> {
  return Object.fromEntries(
    RESET_ON_NEW_KEYS.map((key) => [key, fieldDefault(key)]),
  ) as Partial<AllSlices>;
}
