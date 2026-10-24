/**
 * The Studio prompt box's style tag (owner, 2026-10-23): each style reads
 * back as itself through the prompt reader, and a session's prompt or a
 * project's name finds its style.
 */
import { describe, expect, it } from 'vitest';
import { parseMusicPrompt } from '../parseMusicPrompt';
import { STYLE_OPTIONS, styleOptionOf } from '../styleOptions';

describe('the style options', () => {
  it.each(STYLE_OPTIONS.map((s) => [s.label, s] as const))(
    '%s reads back as itself',
    (_label, option) => {
      const read = parseMusicPrompt(option.text);
      expect(read.genre).toBe(option.genre);
      expect(read.flavor).toBe(option.flavor);
      expect(styleOptionOf(option.text)?.id).toBe(option.id);
    },
  );

  it('finds the style a session’s prompt or a project’s name names', () => {
    expect(styleOptionOf('Make a soulful R&B ballad')?.label).toBe(
      'R&B Ballad',
    );
    expect(styleOptionOf('Melancholic Lo-fi in D Dorian')?.label).toBe('Lo-fi');
    expect(styleOptionOf('a funk groove at 100 BPM')?.label).toBe('Funk');
    expect(styleOptionOf('Untitled Project')).toBeNull();
  });
});
