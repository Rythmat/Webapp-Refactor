/**
 * The canvas must let a teacher ADD a field the slide has not got yet.
 *
 * Elements are derived, so an empty field derives no element — and an element
 * that does not exist has nowhere to put its editor. Ghosts restore what the
 * block canvas gave for free, without ever reaching the slide or a snapshot.
 */
import { describe, expect, it } from 'vitest';
import { resolveElements } from '../../slides/migrateDeckV1';
import { hasBandContent, validateLayout } from '../../slides/slideGrid';
import type { Slide } from '../../slides/types';
import { editorGhostElements } from './editorGhosts';

const lt = (en: string) => ({ en });

const slideOf = (over: Partial<Slide> = {}): Slide =>
  ({
    id: 's1',
    kind: 'content',
    phase: 'connectRegulate',
    title: lt('Title'),
    ...over,
  }) as Slide;

const ghostsFor = (slide: Slide) =>
  editorGhostElements(slide, resolveElements(slide));

describe('editorGhostElements', () => {
  it('offers a prompt and a body on a bare slide', () => {
    const ids = ghostsFor(slideOf()).map((g) => g.id);
    expect(ids).toEqual(['s1:prompt', 's1:body']);
  });

  it('offers nothing for a field the slide already has', () => {
    const ids = ghostsFor(
      slideOf({ prompt: lt('P'), body: lt('B') } as Partial<Slide>),
    ).map((g) => g.id);
    expect(ids).toEqual([]);
  });

  it('does not offer a body where the band is occupied', () => {
    // A ghost body would land on top of the picture.
    const withMedia = slideOf({
      media: { type: 'youtube', videoId: 'a' },
    } as Partial<Slide>);
    expect(hasBandContent(resolveElements(withMedia))).toBe(true);
    expect(ghostsFor(withMedia).map((g) => g.id)).not.toContain('s1:body');
  });

  it('does not offer a subtitle where the family forbids one', () => {
    // `rows` replaces the subtitle band; validateLayout refuses it.
    const rows = slideOf({
      presetId: 'objectives',
      body: lt('B'),
    } as Partial<Slide>);
    expect(ghostsFor(rows).map((g) => g.id)).not.toContain('s1:prompt');
  });

  it('keeps the layout legal with its ghosts applied', () => {
    for (const slide of [
      slideOf(),
      slideOf({ body: lt('B') } as Partial<Slide>),
      slideOf({ media: { type: 'youtube', videoId: 'a' } } as Partial<Slide>),
      slideOf({ presetId: 'last-5' } as Partial<Slide>),
      slideOf({ presetId: 'objectives' } as Partial<Slide>),
      slideOf({
        kind: 'interaction',
        interactionIds: ['i1'],
      } as Partial<Slide>),
    ]) {
      const real = resolveElements(slide);
      const withGhosts = [...real, ...editorGhostElements(slide, real)];
      expect(
        validateLayout(withGhosts),
        `${slide.presetId ?? slide.kind}`,
      ).toEqual([]);
    }
  });

  it('never mutates the slide or the real element list', () => {
    const slide = slideOf();
    const real = resolveElements(slide);
    const before = JSON.stringify({ slide, real });
    editorGhostElements(slide, real);
    expect(JSON.stringify({ slide, real })).toBe(before);
  });
});
