import { describe, expect, it } from 'vitest';
import { artAccent, hexArtPalette } from '../hexArtPalette';

const svg = (fills: Record<string, number>) =>
  Object.entries(fills)
    .flatMap(([fill, n]) =>
      Array.from({ length: n }, () => `<polygon fill="${fill}"></polygon>`),
    )
    .join('');

describe('hexArtPalette', () => {
  it('lists the fills most used first, in lowercase', () => {
    expect(
      hexArtPalette(svg({ '#eb3700': 3, '#FF7348': 5, '#ffc848': 1 })),
    ).toEqual(['#ff7348', '#eb3700', '#ffc848']);
  });
});

describe('artAccent', () => {
  it('passes over a dark ground for the first colour that reads', () => {
    // Electronic's tile: a navy ground, then violet, near-white, blue.
    expect(artAccent(['#2a2f4a', '#b14aff', '#e4ecff', '#4a86ff'])).toBe(
      '#b14aff',
    );
  });

  it('passes over greys and near-whites', () => {
    expect(artAccent(['#ebe5e7', '#808080', '#d08e58'])).toBe('#d08e58');
  });

  it('settles for a muted colour when nothing is vivid', () => {
    expect(artAccent(['#ffffff', '#2a2f4a'])).toBe('#2a2f4a');
  });

  it('has none for art of greys', () => {
    expect(artAccent(['#ffffff', '#101010', '#888888'])).toBeNull();
  });
});
