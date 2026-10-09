import { describe, expect, it } from 'vitest';
import { isApplePlatform, modShortcut } from '../platformKeys';

describe('platformKeys', () => {
  it('tells a Mac from a Chromebook or a Windows laptop', () => {
    expect(isApplePlatform({ platform: 'MacIntel' })).toBe(true);
    expect(isApplePlatform({ userAgentData: { platform: 'macOS' } })).toBe(
      true,
    );
    expect(isApplePlatform({ platform: 'iPad' })).toBe(true);
    expect(isApplePlatform({ userAgentData: { platform: 'Chrome OS' } })).toBe(
      false,
    );
    expect(isApplePlatform({ platform: 'Linux x86_64' })).toBe(false);
    expect(isApplePlatform({ platform: 'Win32' })).toBe(false);
    expect(
      isApplePlatform({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      }),
    ).toBe(true);
    expect(
      isApplePlatform({ userAgent: 'Mozilla/5.0 (X11; CrOS x86_64)' }),
    ).toBe(false);
    expect(isApplePlatform({})).toBe(false);
  });

  it('labels mod shortcuts per platform', () => {
    expect(modShortcut('z', { apple: true })).toEqual({
      label: '⌘Z',
      aria: 'Meta+Z',
    });
    expect(modShortcut('z', { apple: true, shift: true })).toEqual({
      label: '⇧⌘Z',
      aria: 'Meta+Shift+Z',
    });
    expect(modShortcut('s', { apple: false })).toEqual({
      label: 'Ctrl+S',
      aria: 'Control+S',
    });
    expect(modShortcut('z', { apple: false, shift: true })).toEqual({
      label: 'Ctrl+Shift+Z',
      aria: 'Control+Shift+Z',
    });
  });
});
