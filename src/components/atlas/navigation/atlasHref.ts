import { GlobeRoutes } from '@/constants/routes';
import { applyFrameToSearchParams, type AtlasFrame } from './atlasFrame';
import { applyStopToSearchParams, type AtlasStop } from './atlasStop';

/**
 * A link into the Globe page: a stop, seen through a frame. For pages outside
 * the Globe (Home, slides, search), which cannot use the page's navigate —
 * the URL is the whole of what they hand over.
 *
 *   atlasHref({ view: 'timeline' }, { kind: 'pathway', pathwayId: 'blues-to-rock' })
 *   → /globe?pathway=blues-to-rock&view=timeline
 */
export function atlasHref(
  frame: Partial<AtlasFrame> = {},
  stop: AtlasStop = { kind: 'home' },
): string {
  const params = applyFrameToSearchParams(
    applyStopToSearchParams(new URLSearchParams(), stop),
    frame,
  );
  const query = params.toString();
  return query ? `${GlobeRoutes.root()}?${query}` : GlobeRoutes.root();
}
