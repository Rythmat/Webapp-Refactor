import { describe, it, expect } from 'vitest';
import { parseStyle } from '../engine/styleParser';

describe('parseStyle — basic genre + level recognition', () => {
  it('returns null for empty input', () => {
    expect(parseStyle('')).toBeNull();
  });

  it('returns null when no genre word is recognized', () => {
    expect(parseStyle('klingon opera')).toBeNull();
  });

  it('parses a bare genre and defaults level to L2', () => {
    const r = parseStyle('jazz');
    expect(r).toEqual({
      primaryGenre: 'JAZZ',
      level: 'L2',
      vibes: [],
    });
  });

  it('parses a level keyword + genre', () => {
    const r = parseStyle('advanced funk');
    expect(r?.primaryGenre).toBe('FUNK');
    expect(r?.level).toBe('L3');
    expect(r?.modifierGenre).toBeUndefined();
  });

  it('ignores filler words in a full sentence', () => {
    const r = parseStyle('I want this song arranged in advanced funk style');
    expect(r?.primaryGenre).toBe('FUNK');
    expect(r?.level).toBe('L3');
  });

  it('maps beginner / easy / intro to L1', () => {
    expect(parseStyle('beginner pop')?.level).toBe('L1');
    expect(parseStyle('easy rock')?.level).toBe('L1');
    expect(parseStyle('intro jazz')?.level).toBe('L1');
  });

  it('maps intermediate / mid / l2 to L2', () => {
    expect(parseStyle('intermediate jazz')?.level).toBe('L2');
    expect(parseStyle('mid pop')?.level).toBe('L2');
    expect(parseStyle('l2 funk')?.level).toBe('L2');
  });

  it('maps advanced / hard / expert / pro to L3', () => {
    expect(parseStyle('advanced jazz')?.level).toBe('L3');
    expect(parseStyle('hard rock')?.level).toBe('L3');
    expect(parseStyle('expert pop')?.level).toBe('L3');
    expect(parseStyle('pro blues')?.level).toBe('L3');
  });
});

describe('parseStyle — genre synonyms and multi-word genres', () => {
  it('handles hip hop in all the formatting variants', () => {
    expect(parseStyle('hip hop')?.primaryGenre).toBe('HIP HOP');
    expect(parseStyle('hip-hop')?.primaryGenre).toBe('HIP HOP');
    expect(parseStyle('hiphop')?.primaryGenre).toBe('HIP HOP');
  });

  it('handles R&B / rnb / rhythm and blues', () => {
    expect(parseStyle('r&b')?.primaryGenre).toBe('R&B');
    expect(parseStyle('rnb')?.primaryGenre).toBe('R&B');
    expect(parseStyle('rhythm and blues')?.primaryGenre).toBe('R&B');
    expect(parseStyle('r and b')?.primaryGenre).toBe('R&B');
  });

  it('handles neo soul / neo-soul / neosoul', () => {
    expect(parseStyle('neo soul')?.primaryGenre).toBe('NEO SOUL');
    expect(parseStyle('neo-soul')?.primaryGenre).toBe('NEO SOUL');
    expect(parseStyle('neosoul')?.primaryGenre).toBe('NEO SOUL');
  });

  it('handles jam band variants', () => {
    expect(parseStyle('jam band')?.primaryGenre).toBe('JAM BAND');
    expect(parseStyle('jam-band')?.primaryGenre).toBe('JAM BAND');
    expect(parseStyle('jamband')?.primaryGenre).toBe('JAM BAND');
  });

  it('routes Latin sub-genres to LATIN', () => {
    expect(parseStyle('salsa')?.primaryGenre).toBe('LATIN');
    expect(parseStyle('bossa nova')?.primaryGenre).toBe('LATIN');
    expect(parseStyle('samba')?.primaryGenre).toBe('LATIN');
    expect(parseStyle('merengue')?.primaryGenre).toBe('LATIN');
  });

  it('routes Ballad to POP', () => {
    expect(parseStyle('ballad')?.primaryGenre).toBe('POP');
  });
});

describe('parseStyle — compound genres (blend mode)', () => {
  it('parses "pop jazz" with JAZZ primary and POP modifier', () => {
    const r = parseStyle('pop jazz');
    expect(r?.primaryGenre).toBe('JAZZ');
    expect(r?.modifierGenre).toBe('POP');
  });

  it('parses "funk rock" with ROCK primary and FUNK modifier', () => {
    const r = parseStyle('funk rock');
    expect(r?.primaryGenre).toBe('ROCK');
    expect(r?.modifierGenre).toBe('FUNK');
  });

  it('does not set modifier when both tokens map to the same genre', () => {
    const r = parseStyle('salsa latin');
    expect(r?.primaryGenre).toBe('LATIN');
    expect(r?.modifierGenre).toBeUndefined();
  });

  it('uses the second-to-last genre as modifier when three are present', () => {
    const r = parseStyle('pop funk jazz');
    expect(r?.primaryGenre).toBe('JAZZ');
    expect(r?.modifierGenre).toBe('FUNK');
  });

  it('combines compound + level keyword', () => {
    const r = parseStyle('advanced pop jazz');
    expect(r?.primaryGenre).toBe('JAZZ');
    expect(r?.modifierGenre).toBe('POP');
    expect(r?.level).toBe('L3');
  });
});

describe('parseStyle — vibes', () => {
  it('parses a single vibe synonym', () => {
    const r = parseStyle('smooth jazz');
    expect(r?.primaryGenre).toBe('JAZZ');
    expect(r?.vibes).toContain('cool');
  });

  it('parses a direct vibe tag', () => {
    const r = parseStyle('dark funk');
    expect(r?.vibes).toContain('dark');
  });

  it('collects multiple unique vibes in input order', () => {
    const r = parseStyle('dark aggressive funk');
    expect(r?.vibes).toEqual(['dark', 'aggressive']);
  });

  it('dedupes vibes when synonyms repeat the same tag', () => {
    // "smooth" and "chill" are both synonyms for the 'cool' vibe.
    const r = parseStyle('smooth chill jazz');
    expect(r?.vibes).toEqual(['cool']);
  });

  it('combines vibe + compound + level (full sentence)', () => {
    const r = parseStyle('dark advanced pop jazz');
    expect(r).toEqual({
      primaryGenre: 'JAZZ',
      modifierGenre: 'POP',
      level: 'L3',
      vibes: ['dark'],
    });
  });
});

describe('parseStyle — robustness', () => {
  it('is case-insensitive', () => {
    expect(parseStyle('JAZZ')?.primaryGenre).toBe('JAZZ');
    expect(parseStyle('Advanced FUNK')?.level).toBe('L3');
  });

  it('handles trailing / leading punctuation', () => {
    expect(parseStyle(' jazz! ')?.primaryGenre).toBe('JAZZ');
    expect(parseStyle('rock, please')?.primaryGenre).toBe('ROCK');
  });

  it('returns the last level when multiple are present', () => {
    expect(parseStyle('easy advanced jazz')?.level).toBe('L3');
  });
});
