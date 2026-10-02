import { describe, expect, it } from 'vitest';
import type { GraphNode } from '@/content/graph/types';
import { rankNodes } from '../../EntitySearch';
import { normalizeText, textKey } from '../model/text';

describe('normalizeText', () => {
  it('drops accents, lowers case and trims', () => {
    expect(normalizeText('  Beyoncé ')).toBe('beyonce');
    expect(normalizeText('Motörhead')).toBe('motorhead');
    expect(normalizeText('Sigur Rós')).toBe('sigur ros');
  });

  it('keeps inner spaces and punctuation', () => {
    expect(normalizeText('The Rolling Stones')).toBe('the rolling stones');
    expect(normalizeText('AC/DC')).toBe('ac/dc');
  });
});

describe('textKey', () => {
  it('gives a slug and its display name the same key', () => {
    expect(textKey('Hip Hop')).toBe('hiphop');
    expect(textKey('hip-hop')).toBe('hiphop');
    expect(textKey('art-rock')).toBe(textKey('Art Rock'));
    expect(textKey('region-north-america')).toBe('regionnorthamerica');
  });

  it('reads "&" as "and"', () => {
    expect(textKey('R&B')).toBe('randb');
    expect(textKey('Postwar & Revolution')).toBe('postwarandrevolution');
  });

  it('is blank for text with no letters or digits', () => {
    expect(textKey(' -- ')).toBe('');
  });
});

describe('Find uses the shared normaliser', () => {
  const node = (id: string, label: string) =>
    ({
      id,
      kind: id.split(':')[0],
      label,
      status: 'code',
      origin: 'code',
    }) as GraphNode;
  const entries = [
    node('artist:beyonce', 'Beyoncé'),
    node('artist:bey', 'Bey'),
  ].map((n) => ({ node: n, name: normalizeText(n.label) }));

  it('matches whatever accents and case are typed', () => {
    expect(rankNodes(entries, 'BEYONCÉ ').map((n) => n.id)).toEqual([
      'artist:beyonce',
    ]);
    expect(rankNodes(entries, 'beyonce').map((n) => n.id)).toEqual([
      'artist:beyonce',
    ]);
  });
});
