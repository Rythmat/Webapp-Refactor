import type { ChannelStripTabId } from '@/daw/store/uiSlice';

// ── The dock's tabs ────────────────────────────────────────────────────────
//
// Which dock tab is open (channelStripTab) is view state the draft keeps, so
// a restored value has to be checked against the real tabs: a hand-edited
// draft, or one a later build wrote, could hold anything. The strip and the
// codec both check here. There is no React in this module, so the codec can
// import it, and a tab added to the strip is known to both.

/** One entry per tab: a tab missing here, or one too many, fails to compile. */
const TABS: Record<ChannelStripTabId, true> = {
  controls: true,
  fx: true,
  grooves: true,
  prism: true,
  'piano-roll': true,
};

/** Every dock tab id. */
export const CHANNEL_STRIP_TAB_IDS = Object.freeze(
  Object.keys(TABS),
) as readonly ChannelStripTabId[];

/** Whether `value` is one of the dock's tabs. */
export function isChannelStripTabId(
  value: unknown,
): value is ChannelStripTabId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(TABS, value)
  );
}
