import { describe, expect, it } from 'vitest';
import {
  clock,
  dayLabel,
  extensionOf,
  groupByDay,
  timeAgo,
} from '../libraryHelpers';

const NOW = new Date(2026, 9, 23, 15, 0).getTime();
const HOUR = 60 * 60 * 1000;

describe('the Library panel helpers', () => {
  it('names days as Suno groups them', () => {
    expect(dayLabel(NOW - HOUR, NOW)).toBe('Today');
    expect(dayLabel(NOW - 24 * HOUR, NOW)).toBe('Yesterday');
    expect(dayLabel(new Date(2026, 9, 21).getTime(), NOW)).toMatch(/2026/);
  });

  it('groups a newest-first list by day, keeping its order', () => {
    const times = [NOW, NOW - HOUR, NOW - 25 * HOUR];
    expect(groupByDay(times, (t) => t, NOW)).toEqual([
      { label: 'Today', items: [NOW, NOW - HOUR] },
      { label: 'Yesterday', items: [NOW - 25 * HOUR] },
    ]);
  });

  it('says how long ago, and how long it plays', () => {
    expect(timeAgo(NOW - 3 * 60_000, NOW)).toBe('3m ago');
    expect(timeAgo(NOW - 27 * HOUR, NOW)).toBe('1d, 3h ago');
    expect(clock(185)).toBe('3:05');
    expect(clock(null)).toBe('');
  });

  it('names a download after its type', () => {
    expect(extensionOf('audio/wav')).toBe('wav');
    expect(extensionOf('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionOf('audio/mpeg')).toBe('mp3');
  });
});
