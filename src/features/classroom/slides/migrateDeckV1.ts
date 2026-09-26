/**
 * v1 → v2 slide layout: freeform rects become zone-assigned elements.
 *
 * SHAPE: this is a LAZY PROJECTION, not an eager step-chain.
 *
 * That distinction matters and is not cosmetic. `lib/local-store/migrations.ts`
 * migrates a STORE at read time — it owns the blob and can write the result
 * back. A slide layout cannot use that shape, because the thing most in need of
 * migrating is an already-PUBLISHED snapshot: immutable by contract, and read
 * by students who have no source Day to re-project from. So `resolveElements`
 * derives elements on the way to the renderer, every time, and the editor
 * writes the derived result back on the next save. Same shape as
 * `publish/migrateSnapshot.ts`, for the same reason.
 *
 * DETERMINISTIC AND IDEMPOTENT:
 *   - element ids are derived from `${slide.id}:${blockKey}`, never random, so
 *     two runs produce byte-identical output and React keys stay stable;
 *   - a slide that already has `elements` is returned untouched;
 *   - the stored rect is used ONLY to pick a zone, then discarded.
 *
 * FAMILY VALIDITY: the middle band's families are mutually exclusive, so this
 * cannot map each block independently. A body that lands beside a left-hand
 * media must go to `right` (split), and launch tiles can only use `tileRow`
 * when the band is `body`/`bodyShort`. Those couplings are encoded below.
 */
import type { LaunchTile } from '../types';
import { hrefForEmbed } from './contentElement';
import { SLIDE_GRID, nearestZone, type ZoneName } from './slideGrid';
import { presetFor } from './templates/presets';
import {
  SLIDE_BLOCK_KEYS,
  type Slide,
  type SlideBlockKey,
  type SlideBlockRect,
  type SlideElement,
  type SlideElementStyle,
  type SlideMedia,
} from './types';

/** Stable, deterministic element id. */
const eid = (slideId: string, key: string, i?: number): string =>
  i === undefined ? `${slideId}:${key}` : `${slideId}:${key}:${i}`;

const rectOf = (slide: Slide, key: string): SlideBlockRect | undefined =>
  (slide.layout as Record<string, SlideBlockRect> | undefined)?.[key];

const hiddenOf = (slide: Slide, key: string): boolean =>
  rectOf(slide, key)?.hidden === true;

/**
 * Carry the teacher's text formatting across the migration.
 *
 * `SlideBlockStyle` and `SlideElementStyle` are the same three fields
 * (fontScale / bold / align) and `SlideElementView` already forwards
 * `element.style` — but nothing copied `slide.textStyle[key]` into it. Since
 * every live surface now renders from elements, a teacher who centred and
 * bolded a title saw it applied on the editor canvas (still block mode) and
 * the projector show the default. Dropping formatting silently is worse than
 * not offering it.
 */
const styleOf = (
  slide: Slide,
  key: SlideBlockKey,
): SlideElementStyle | undefined => {
  const style = slide.textStyle?.[key];
  if (!style) return undefined;
  const { fontScale, bold, align } = style;
  if (fontScale === undefined && bold === undefined && align === undefined) {
    return undefined;
  }
  return {
    ...(fontScale !== undefined ? { fontScale } : {}),
    ...(bold !== undefined ? { bold } : {}),
    ...(align !== undefined ? { align } : {}),
  };
};

/** `{ style }` when the block carries one, nothing when it does not. */
const styleProp = (slide: Slide, key: SlideBlockKey) => {
  const style = styleOf(slide, key);
  return style ? { style } : {};
};

const mediaElement = (
  id: string,
  zone: ZoneName,
  media: SlideMedia,
  label: { en: string; es?: string },
): SlideElement => ({
  id,
  zone,
  kind: 'content',
  embed: media,
  // REQUIRED by the contract, and derivable: `hrefForEmbed` is total.
  href: hrefForEmbed(media),
  label,
});

const tileElement = (
  id: string,
  zone: ZoneName,
  tile: LaunchTile,
  order: number,
): SlideElement => ({
  id,
  zone,
  order,
  kind: 'content',
  embed: { type: 'atlasCard', ref: tile.activityRef },
  href: { kind: 'atlas', ref: tile.activityRef },
  label: tile.label ?? { en: '' },
});

/** Every interaction id this slide references, in render order. */
const interactionIdsOf = (slide: Slide): string[] => {
  switch (slide.kind) {
    case 'interaction':
      return slide.interactionIds;
    case 'app-route':
    case 'showcase':
      return [slide.interactionId];
    case 'content':
    case 'media':
    case 'studio-collab':
      return [];
  }
};

/** Build the v2 element list for a slide that has none. */
export const migrateSlideV1 = (slide: Slide): SlideElement[] => {
  const out: SlideElement[] = [];

  const media =
    'media' in slide ? (slide.media as SlideMedia | undefined) : undefined;
  const sideMedia =
    'sideMedia' in slide
      ? (slide.sideMedia as SlideMedia | undefined)
      : undefined;
  const body = 'body' in slide ? slide.body : undefined;
  const launchTiles =
    'launchTiles' in slide
      ? (slide.launchTiles as LaunchTile[] | undefined)
      : undefined;
  const resetChecklist =
    'resetChecklist' in slide ? slide.resetChecklist : undefined;

  /**
   * Does anything need to share the middle band with the media?
   *
   * `prompt` and `launchTiles` COUNT. The hero band "replaces subtitle + body"
   * (grid spec, heroMedia row), so a hero slide has nowhere legal to put a
   * prompt — `title` is single-flow, `subtitle` is incompatible with hero — and
   * `tileRow` belongs to the bodyShort family, which cannot mix with hero.
   * Omitting either produced a slide that failed `validateLayout`: a
   * `zone-overfull` on title, and a `mixed-families` on hero+tileRow.
   */
  /**
   * The slide's VISUALS, in order. `sideMedia` without `media` is a real shape
   * (a content slide carrying only an artist image), and treating it as a
   * dependent of `media` put it in a split zone while the band stayed `body` —
   * a mixed-families layout. There is no "primary" and "secondary" here, only
   * one or two visuals to place.
   */
  const visuals: SlideMedia[] = [media, sideMedia].filter(
    (m): m is SlideMedia => !!m,
  );

  /**
   * Does anything need to share the middle band with a visual?
   *
   * `prompt` and `launchTiles` COUNT. The hero band "replaces subtitle + body"
   * (grid spec, heroMedia row), so a hero slide has nowhere legal to put a
   * prompt — `title` is single-flow and `subtitle` is hero-incompatible — and
   * `tileRow` belongs to the bodyShort family, which cannot mix with hero.
   */
  const hasCompanion = Boolean(
    body || slide.prompt || launchTiles?.length || resetChecklist?.length,
  );

  /**
   * One visual and nothing beside it ⇒ hero. Otherwise the band is `split`:
   * two visuals take both columns, one takes the column its stored rect
   * suggests (default left — Artist Spotlight is the dominant real pattern).
   */
  const storedVisualRect = rectOf(slide, 'media') ?? rectOf(slide, 'sideMedia');
  // A stored rect always wins: if the teacher put the media in the right
  // column, honour that rather than re-centring it into the hero band.
  const loneZone: ZoneName = storedVisualRect
    ? nearestZone(storedVisualRect, ['heroMedia', 'mediaLeft', 'mediaRight'])
    : hasCompanion
      ? 'mediaLeft'
      : 'heroMedia';

  const heroOnly = visuals.length === 1 && loneZone === 'heroMedia';
  const visualZones: ZoneName[] =
    visuals.length === 2 ? ['mediaLeft', 'mediaRight'] : [loneZone];

  // A hero band replaces subtitle + body, so it can never carry a companion.
  // If both are present the stored rect loses to legality.
  const useHero = heroOnly && !hasCompanion;
  const resolvedVisualZones: ZoneName[] = useHero
    ? ['heroMedia']
    : visualZones.map((z) => (z === 'heroMedia' ? 'mediaLeft' : z));

  const isSplit = !useHero && visuals.length > 0;

  // Body shares the middle band with the visuals, so its zone is a consequence
  // of theirs, never an independent choice.
  const bodyZone: ZoneName = isSplit
    ? resolvedVisualZones.includes('mediaLeft')
      ? 'right'
      : 'left'
    : launchTiles?.length
      ? 'bodyShort'
      : 'body';

  // `tileRow` belongs to the bodyShort family, so it is legal only when the
  // middle band IS body/bodyShort. Beside a media column tiles stack in the
  // text column instead.
  const derivedTileZone: ZoneName = isSplit ? bodyZone : 'tileRow';

  /**
   * A preset overrides WHERE things go; it never changes WHAT they are.
   *
   * Unknown ids fall through to the derived layout rather than blanking the
   * slide — a snapshot published last term may name a preset this build has
   * since renamed.
   */
  const declared = presetFor(slide.presetId);
  /**
   * A preset applies only to the kinds it claims.
   *
   * `preset.kinds` is the rule that keeps a band-filling preset off an
   * interaction or showcase slide, where the band belongs to the surface. It
   * was enforced in the editor's dropdown but NOT here, so a preset set any
   * other way — a template seed, a kind change, a restored backup — applied
   * regardless. The shipped default deck hit exactly that: its "Turn & Talk"
   * seed named an interaction-only preset on a `content` slide, and the
   * preset's `body: 'off'` hid the activity's own copy.
   */
  const preset =
    declared && declared.kinds.includes(slide.kind) ? declared : undefined;

  // `'off'` HIDES rather than drops. A preset must account for every field the
  // slide carries: an unplaced one falls through to its derived zone and
  // produces a mixed-families layout the validator refuses — a hero image
  // beside a body column, say. Hiding keeps the copy for the day the teacher
  // switches preset back.
  const visualsOff = preset?.zones.visuals === 'off';
  const bodyOff = preset?.zones.body === 'off';
  const tilesOff = preset?.zones.tiles === 'off';
  const subtitleOff = preset?.zones.subtitle === 'off';

  const presetVisuals =
    preset?.zones.visuals && preset.zones.visuals !== 'off'
      ? preset.zones.visuals
      : undefined;
  const finalVisualZones: ZoneName[] = presetVisuals
    ? visuals.map((_, i) => presetVisuals[i] ?? presetVisuals[0])
    : resolvedVisualZones;

  const finalBodyZone: ZoneName =
    preset?.zones.body && preset.zones.body !== 'off'
      ? preset.zones.body
      : bodyZone;
  const tileZone: ZoneName =
    preset?.zones.tiles && preset.zones.tiles !== 'off'
      ? preset.zones.tiles
      : derivedTileZone;
  const titleHidden =
    hiddenOf(slide, 'title') || preset?.zones.hideTitle === true;

  // ── title ───────────────────────────────────────────────────────────────
  out.push({
    id: eid(slide.id, 'title'),
    zone: 'title',
    kind: 'text',
    role: 'title',
    text: slide.title,
    ...styleProp(slide, 'title'),
    ...(titleHidden ? { hidden: true } : {}),
  });

  // ── prompt → subtitle ───────────────────────────────────────────────────
  // Always legal: a prompt forces `hasCompanion`, so the band is never hero,
  // and `subtitle` is compatible with body / bodyShort / split.
  if (slide.prompt) {
    out.push({
      id: eid(slide.id, 'prompt'),
      zone: 'subtitle',
      kind: 'text',
      role: 'subtitle',
      text: slide.prompt,
      ...styleProp(slide, 'prompt'),
      ...(hiddenOf(slide, 'prompt') || subtitleOff ? { hidden: true } : {}),
    });
  }

  // ── visuals ─────────────────────────────────────────────────────────────
  visuals.forEach((m, i) => {
    const key = m === media ? 'media' : 'sideMedia';
    out.push({
      ...mediaElement(
        eid(slide.id, key),
        finalVisualZones[i] ?? finalVisualZones[0],
        m,
        slide.title,
      ),
      // `hiddenOf` used to cover only the text blocks, so a teacher who removed
      // a YouTube embed on the canvas still had it projected to the class: the
      // removal reached the one surface they were looking at and no other.
      ...(hiddenOf(slide, key) || visualsOff ? { hidden: true } : {}),
    });
  });

  // ── body ────────────────────────────────────────────────────────────────
  if (body) {
    out.push({
      id: eid(slide.id, 'body'),
      zone: finalBodyZone,
      kind: 'text',
      role: 'body',
      text: body,
      order: 0,
      ...styleProp(slide, 'body'),
      ...(hiddenOf(slide, 'body') || bodyOff ? { hidden: true } : {}),
    });
  }

  // ── reset checklist, under the body ─────────────────────────────────────
  if (resetChecklist?.length) {
    out.push({
      id: eid(slide.id, 'resetChecklist'),
      zone: finalBodyZone,
      order: 1,
      kind: 'checklist',
      items: resetChecklist,
      ...(hiddenOf(slide, 'resetChecklist') || bodyOff ? { hidden: true } : {}),
    });
  }

  // ── launch tiles ────────────────────────────────────────────────────────
  for (const [i, tile] of (launchTiles ?? []).entries()) {
    out.push({
      ...tileElement(eid(slide.id, 'launchTiles', i), tileZone, tile, i),
      // Same gap as the visuals: hiding the tile row was editor-only.
      ...(hiddenOf(slide, 'launchTiles') || tilesOff ? { hidden: true } : {}),
    });
  }

  // ── interactions live ONLY in the footer band ───────────────────────────
  for (const [i, interactionId] of interactionIdsOf(slide).entries()) {
    out.push({
      id: eid(slide.id, 'interaction', i),
      zone: 'footer',
      order: i,
      kind: 'interaction',
      interactionId,
      ...(slide.kind === 'interaction' && slide.reveal
        ? { reveal: slide.reveal }
        : {}),
      ...(hiddenOf(slide, 'interaction') ? { hidden: true } : {}),
    });
  }

  return hideOverCapacity(out);
};

/**
 * Hide anything that would render where it cannot be seen.
 *
 * `resolveElementRects` gives every element in a `single`-flow zone the SAME
 * rect and splits a `row` zone evenly, so an over-capacity zone does not
 * overflow visibly — it STACKS. The elements underneath are simply gone, with
 * no badge and no error, because `validateLayout` is not run at render.
 *
 * This happens whenever a preset maps more content into a zone than the zone
 * holds: one click of "Choose content → Songs" adds a video AND an artist
 * image, and a preset naming one visual zone put both in it. A fifth launch
 * tile does the same to `tileRow` (max 4).
 *
 * Hiding rather than dropping keeps the data — switching to a roomier preset
 * brings it straight back — and it is what `hidden` already means everywhere
 * else in this file.
 */
const hideOverCapacity = (elements: SlideElement[]): SlideElement[] => {
  const used = new Map<ZoneName, number>();
  return elements.map((element) => {
    if (element.hidden) return element;
    const spec: { flow: string; max?: number } = SLIDE_GRID[element.zone];
    const capacity = spec.flow === 'single' ? 1 : (spec.max ?? Infinity);
    const n = used.get(element.zone) ?? 0;
    used.set(element.zone, n + 1);
    return n >= capacity ? { ...element, hidden: true } : element;
  });
};

/**
 * The block key a DERIVED element came from — the inverse of `eid`.
 *
 * Element ids are `${slideId}:${blockKey}` or `${slideId}:${blockKey}:${i}`,
 * so a derived element can always be traced back to the slide field it was
 * built from. The editor needs that mapping: it edits slide-level fields
 * (`title`, `prompt`, `media`, …) and has to know which zone box to put each
 * editable control in now that the canvas renders zones rather than blocks.
 *
 * Returns undefined for an AUTHORED element, which has no source block. The
 * editor then shows it read-only rather than guessing — honest, and the case
 * does not arise while elements stay derived.
 */
export const blockKeyForElement = (
  element: Pick<SlideElement, 'id'>,
  slideId: string,
): SlideBlockKey | undefined => {
  const prefix = `${slideId}:`;
  if (!element.id.startsWith(prefix)) return undefined;
  const rest = element.id.slice(prefix.length);
  const key = rest.includes(':') ? rest.slice(0, rest.indexOf(':')) : rest;
  return (SLIDE_BLOCK_KEYS as readonly string[]).includes(key)
    ? (key as SlideBlockKey)
    : undefined;
};

/**
 * The ONE entry point every surface uses to get a slide's elements.
 *
 * Returns authored elements untouched; derives them for a legacy slide. Call it
 * at the render boundary, not per element, so one slide migrates once per
 * render rather than once per block.
 */
export const resolveElements = (slide: Slide): SlideElement[] =>
  slide.elements?.length ? slide.elements : migrateSlideV1(slide);

/** True when this slide still needs migrating (drives write-back on save). */
export const needsElementMigration = (slide: Slide): boolean =>
  !slide.elements?.length;

/** Migrate a whole deck eagerly — used by the editor's write-back on save. */
export const migrateDeckV1 = <T extends { slides: Slide[] }>(deck: T): T => ({
  ...deck,
  slides: deck.slides.map((s) =>
    needsElementMigration(s) ? { ...s, elements: migrateSlideV1(s) } : s,
  ),
});
