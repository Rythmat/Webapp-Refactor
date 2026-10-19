import { describe, expect, it } from 'vitest';
import { fileSlug, songSlug } from '../exportFiles';

// ── Exported files' names (milestone 2.15) ─────────────────────────────────
// A name in any script keeps its letters; an ASCII name slugs exactly as it
// did before, so the golden exports keep their file names.

describe('fileSlug', () => {
  it('slugs an ASCII name as before', () => {
    expect(fileSlug('My Song', 'x')).toBe('my-song');
    expect(fileSlug('  Rock & Roll!  ', 'x')).toBe('rock-roll');
    expect(fileSlug("Don't Stop (Live) v2", 'x')).toBe('don-t-stop-live-v2');
    expect(fileSlug('Bass_DI--take 3', 'x')).toBe('bass-di-take-3');
  });

  it('keeps letters and digits of any script', () => {
    expect(fileSlug('キーボード', 'x')).toBe('キーボード');
    expect(fileSlug('Café', 'x')).toBe('café');
    // The same name typed with a combining accent.
    expect(fileSlug('Café', 'x')).toBe('café');
    expect(fileSlug('Ελληνικά Τραγούδι', 'x')).toBe('ελληνικά-τραγούδι');
    expect(fileSlug('Песня №1', 'x')).toBe('песня-no1');
    expect(fileSlug('ギター 2', 'x')).toBe('ギター-2');
  });

  it('turns what file systems reject into dashes', () => {
    expect(fileSlug('a/b\\c:d*e?f"g<h>i|j', 'x')).toBe('a-b-c-d-e-f-g-h-i-j');
    expect(fileSlug('tab\tand\nnewline', 'x')).toBe('tab-and-newline');
  });

  it('folds full-width forms', () => {
    expect(fileSlug('ＡＢＣ　１２３', 'x')).toBe('abc-123');
  });

  it('falls back when nothing is left', () => {
    expect(fileSlug('  ', 'track')).toBe('track');
    expect(fileSlug('!?', 'track')).toBe('track');
    expect(fileSlug('🎸', 'track')).toBe('track');
  });
});

describe('songSlug', () => {
  it("names a song with no name 'mixdown'", () => {
    expect(songSlug(null)).toBe('mixdown');
    expect(songSlug(undefined)).toBe('mixdown');
    expect(songSlug('')).toBe('mixdown');
    expect(songSlug('Late Night Song')).toBe('late-night-song');
  });
});
