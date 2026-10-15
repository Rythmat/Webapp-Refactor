import { AtlasRoutes } from '@/constants/routes';
import { applyFrameToSearchParams, type AtlasFrame } from './atlasFrame';
import { applyStopToSearchParams, type AtlasStop } from './atlasStop';

/**
 * A link into the Globe page: a stop, seen through a frame. For pages outside
 * the Globe (the /atlas dashboard, slides, search), which cannot use the
 * page's navigate — the URL is the whole of what they hand over.
 *
 *   atlasHref({ view: 'timeline', lens: 'pathways' }, { kind: 'pathway', pathwayId: 'blues-to-rock' })
 *   → /atlas/globe?view=timeline&lens=pathways&pathway=blues-to-rock
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
  return query ? `${AtlasRoutes.globe()}?${query}` : AtlasRoutes.globe();
}
