import { describe, expect, it } from 'vitest';
import type { CustomDrumKitFile } from '@/daw/instruments/drumKits';
import { kitCopyName } from '../kitCopy';

/**
 * Save as new kit: the second version of a kit gets a name and id of its own,
 * and never the id of the kit it came from.
 */

const kit = (id: string, label: string): CustomDrumKitFile => ({
  id,
  label,
  base: 'natural',
  samples: { 36: '/daw-assets/samples/drums/uploads/abc-kick.wav' },
});

const latin = kit('latin_percussion_kit', 'Latin Percussion Kit');
const stock = ['natural', '808', 'house'];

describe('a kit saved as a new kit', () => {
  it('takes the name typed for it', () => {
    expect(
      kitCopyName({ ...latin, label: 'Latin Percussion B' }, [latin], stock),
    ).toEqual({ id: 'latin_percussion_b', label: 'Latin Percussion B' });
  });

  it('is "copy" when the name was left as it was', () => {
    expect(kitCopyName(latin, [latin], stock)).toEqual({
      id: 'latin_percussion_kit_copy',
      label: 'Latin Percussion Kit copy',
    });
  });

  it('counts on past a name already taken', () => {
    const copy = kit('latin_percussion_kit_copy', 'Latin Percussion Kit copy');
    expect(kitCopyName(latin, [latin, copy], stock)).toEqual({
      id: 'latin_percussion_kit_copy_2',
      label: 'Latin Percussion Kit copy 2',
    });
  });

  it('never takes a stock kit’s id', () => {
    expect(kitCopyName({ ...latin, label: '808' }, [latin], stock).id).not.toBe(
      '808',
    );
  });
});
