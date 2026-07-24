/**
 * Student-paced slide gating (Phase 4). A slide "requires completion" before a
 * student may advance when it has interaction(s) that must be answered — the
 * Kajabi lock-until-complete pattern. content/media/studio-collab have no
 * interactions (free); showcase's offer is optional (free). app-route must
 * reach a genuine completion, not just the launch marker.
 */
import { slideInteractionIds } from '../slides/deck';
import type { Slide } from '../slides/types';
import type { InteractionResponsePayload } from '../types';
import { isAtlasResultComplete } from './buildSlideProgress';

export const slideRequiresCompletion = (slide: Slide): boolean =>
  slide.kind !== 'showcase' && slideInteractionIds(slide).length > 0;

export const isSlideComplete = (
  slide: Slide,
  submissions: Record<string, InteractionResponsePayload>,
): boolean => {
  if (!slideRequiresCompletion(slide)) return true;
  return slideInteractionIds(slide).every((id) => {
    const payload = submissions[id];
    if (!payload) return false;
    if (payload.kind === 'atlas') return isAtlasResultComplete(payload.result);
    return true;
  });
};
