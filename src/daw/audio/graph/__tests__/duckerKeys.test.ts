import { describe, expect, it } from 'vitest';
import { DEFAULT_EFFECTS } from '../../EffectChain';
import { duckerKeyLoops } from '../duckerKeys';

const t = (id: string, key: string | null = null, enabled = true) => ({
  id,
  effects: { ducker: { ...DEFAULT_EFFECTS.ducker, enabled, keyTrackId: key } },
});

describe('duckerKeyLoops', () => {
  it('refuses the track itself and any loop back to it', () => {
    const tracks = [t('a', 'b'), t('b', 'c'), t('c', 'a'), t('d')];
    expect(duckerKeyLoops(tracks, 'a', 'a')).toBe(true);
    expect(duckerKeyLoops(tracks, 'a', 'b')).toBe(true);
    expect(duckerKeyLoops(tracks, 'd', 'a')).toBe(false);
    expect(duckerKeyLoops(tracks, 'a', 'missing')).toBe(false);
  });

  it('a switched-off ducker on the way breaks the loop', () => {
    const tracks = [t('a', 'b'), t('b', 'a', false)];
    expect(duckerKeyLoops(tracks, 'a', 'b')).toBe(false);
  });
});
