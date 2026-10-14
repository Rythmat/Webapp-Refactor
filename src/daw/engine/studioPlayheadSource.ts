import type { PlayheadSubscription } from '@/components/notation/StaffView';
import { getPlayheadTick, subscribePlayhead } from './playheadClock';

/**
 * The Studio's playhead as a staff reads it: the notation views hand this to
 * StaffView, which paints its cursor from it through a ref, so neither they
 * nor the staff re-render as the playhead moves (milestone 1.7).
 */
export const studioPlayheadSource: PlayheadSubscription = {
  get: getPlayheadTick,
  subscribe: subscribePlayhead,
};
