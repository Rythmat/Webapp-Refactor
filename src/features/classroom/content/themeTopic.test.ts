import { describe, expect, it } from 'vitest';
import { topicOf, type ThemeTopic } from './themeTopic';
import { THEMES } from './themes';

describe('topicOf', () => {
  it('classifies representative seasonal / genre / location ids', () => {
    expect(topicOf('theme-january')).toBe('seasonal');
    expect(topicOf('theme-june')).toBe('seasonal');
    expect(topicOf('theme-december')).toBe('seasonal');
    expect(topicOf('theme-blues')).toBe('genre');
    expect(topicOf('theme-rnb-soul-funk')).toBe('genre');
    expect(topicOf('theme-new-orleans')).toBe('location');
    expect(topicOf('theme-kingston')).toBe('location');
  });

  it('returns null for unknown / personal / empty ids', () => {
    expect(topicOf('theme-personal-abc')).toBeNull();
    expect(topicOf(undefined)).toBeNull();
    expect(topicOf(null)).toBeNull();
    expect(topicOf('')).toBeNull();
  });

  it('classifies every canonical theme in the bank (12 seasonal / 10 genre / 4 location)', () => {
    const counts: Record<ThemeTopic, number> = {
      seasonal: 0,
      genre: 0,
      location: 0,
    };
    for (const theme of THEMES) {
      if (theme.source !== 'canonical') continue;
      const topic = topicOf(theme.id);
      expect(topic, `canonical theme ${theme.id} should classify`).not.toBeNull();
      if (topic) counts[topic] += 1;
    }
    expect(counts).toEqual({ seasonal: 12, genre: 10, location: 4 });
  });
});
