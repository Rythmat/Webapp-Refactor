import type { DoneMoment } from '@/daw/store/doneMomentsSlice';
import type { StepCheck } from '../tutorials';

// ── Done moments (Studio Basics 6, 7 and 9) ────────────────────────────────
// A save, an export or a print leaves nothing in the song to check, so the
// store counts each as it really happens (doneMomentsSlice.ts): a save the
// cloud accepted, a file handed to the browser, the print dialog opened. A
// step passes when its count went up since it armed.

/** `moment` has happened since the step armed. */
export const doneMomentMoved =
  (moment: DoneMoment): StepCheck =>
  (s, armed) =>
    s.doneMoments[moment] > armed.doneMoments[moment];
