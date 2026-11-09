// ── A path stop without a lesson, done ─────────────────────────────────────
// Hear It with Your Band has no steps to pass: the stop is done once the
// student has opened the Studio from it, with a band playing their
// progression. That is kept on this device, as progress is for now; it is
// to move to the student's account with it, so Start Here shows it on any
// device (docs/music-literacy-content-kind.md, "Planned: progress saved to
// the student's account").

export const stopDoneKey = (stopId: string) =>
  `music_literacy_stop_done_${stopId}`;

/** Whether this device has the stop done. */
export function readStopDone(stopId: string): boolean {
  try {
    return localStorage.getItem(stopDoneKey(stopId)) === '1';
  } catch {
    // Private browsing: not done.
    return false;
  }
}

/** Mark the stop done on this device. */
export function markStopDone(stopId: string): void {
  try {
    localStorage.setItem(stopDoneKey(stopId), '1');
  } catch {
    // Storage full or private browsing: done for this visit only.
  }
}
