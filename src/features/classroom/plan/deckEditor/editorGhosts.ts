/**
 * Editor-only placeholder elements for fields the slide does not have yet.
 *
 * Elements are DERIVED from the slide's own fields, so a slide with no prompt
 * derives no subtitle element — and once the canvas renders zones rather than
 * blocks, an element that does not exist has nowhere to put its editor. The
 * teacher could then never add a prompt or a body to a slide that lacks one,
 * because the control simply was not on screen. The old block canvas did not
 * have this problem: `resolveLayout` gave every block the kind supports a rect
 * whether or not it held anything.
 *
 * These ghosts exist ONLY in the editor's element list. They are never written
 * to the slide, never published, and never rendered on a class-facing surface.
 *
 * A ghost is emitted only where it cannot disturb the real layout:
 *   - `subtitle` only when the slide's own middle band is subtitle-compatible,
 *     since `validateLayout` refuses a subtitle beside a hero, rows or a centre
 *     stack;
 *   - `body` only when the middle band is FREE, so a ghost can never land on
 *     top of a picture or push a preset's rows aside.
 * Where neither holds, the field stays unaddable from the canvas — which is the
 * honest outcome, because there is genuinely nowhere legal to put it.
 */
import {
  SLIDE_GRID,
  SUBTITLE_COMPATIBLE,
  ZONE_FAMILIES,
  hasBandContent,
  type ZoneName,
} from '../../slides/slideGrid';
import type { Slide, SlideElement } from '../../slides/types';

const familyOf = (zone: ZoneName): string | undefined => {
  for (const [family, members] of Object.entries(ZONE_FAMILIES)) {
    if ((members as ZoneName[]).includes(zone)) return family;
  }
  return undefined;
};

const ghostText = (
  slideId: string,
  key: 'prompt' | 'body',
  zone: ZoneName,
  role: 'subtitle' | 'body',
): SlideElement => ({
  // The SAME id the migration would give the real element, so
  // `blockKeyForElement` maps it back to the field the editor patches.
  id: `${slideId}:${key}`,
  zone,
  kind: 'text',
  role,
  text: { en: '' },
});

export const editorGhostElements = (
  slide: Slide,
  elements: readonly SlideElement[],
): SlideElement[] => {
  const ghosts: SlideElement[] = [];
  const has = (key: string) =>
    elements.some((e) => e.id === `${slide.id}:${key}`);

  const bandFamilies = new Set(
    elements
      .filter((e) => !e.hidden && SLIDE_GRID[e.zone]?.role === 'content')
      .map((e) => familyOf(e.zone))
      .filter((f): f is string => f !== undefined),
  );

  const subtitleLegal =
    bandFamilies.size === 0 ||
    [...bandFamilies].every((f) =>
      (SUBTITLE_COMPATIBLE as readonly string[]).includes(f),
    );

  if (!has('prompt') && subtitleLegal) {
    ghosts.push(ghostText(slide.id, 'prompt', 'subtitle', 'subtitle'));
  }
  if (!has('body') && !hasBandContent(elements)) {
    ghosts.push(ghostText(slide.id, 'body', 'body', 'body'));
  }
  return ghosts;
};
