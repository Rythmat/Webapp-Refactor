// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { GUITAR_ATLAS_BOOK_ONE } from '@/curriculum/data/guitar/bookOne';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import type { GuitarSubsectionPrefix } from '@/lib/guitar/theory';
import { GuitarChordStrip } from '../GuitarChordStrip';
import { guitarVisualModel } from '../guitarVisualModel';

const RED = '#D2404A';

function chordsOf(key: GuitarKeyName, id: string) {
  const step = buildGuitarAppliedTheoryFundamentalsFlow(key)
    .sections.flatMap((s) => s.steps)
    .find((s) => s.activity.startsWith(`${id}:`));
  if (!step) throw new Error(`no step ${id}`);
  return guitarVisualModel(step, key).chords;
}

function renderStrip(
  key: GuitarKeyName,
  id: string,
  over: Partial<ComponentProps<typeof GuitarChordStrip>> = {},
) {
  return render(
    <GuitarChordStrip
      chords={chordsOf(key, id)}
      currentIndex={0}
      keyColor={RED}
      heard={false}
      mirrored={false}
      keyCenter={key}
      stepPrefix={id.split('.')[0] as GuitarSubsectionPrefix}
      {...over}
    />,
  );
}

const items = () =>
  within(screen.getByRole('list', { name: 'Chords' })).getAllByRole('listitem');
/** The shared-note badge after each box ('' where there is none). */
const sharedBadges = () =>
  items().map(
    (li) => li.querySelector('[data-shared-badge]')?.textContent ?? '',
  );
const subtitles = () =>
  items().map(
    (li) => li.querySelector('[data-title]')?.nextElementSibling?.textContent,
  );

beforeEach(() => {
  localStorage.clear();
  useGuitarDisplaySettings.setState({
    showSharedNotes: true,
    showRomanNumerals: false,
  });
});
afterEach(cleanup);

describe('GuitarChordStrip: theory layer', () => {
  it('is unchanged without a key', () => {
    renderStrip('C', 'D3.2', { keyCenter: undefined, stepPrefix: undefined });
    expect(items()).toHaveLength(2);
    expect(document.querySelector('[data-strip-cues]')).toBeNull();
    expect(subtitles()).toEqual(['1 maj', '4 maj']);
  });

  it('badges each change with its shared notes and a finger that can stay', () => {
    const map = GUITAR_ATLAS_BOOK_ONE.C.musicMaps[1]; // C ↔ F
    renderStrip('C', 'D3.2', { map });
    // One item per bar still: the cues ride inside the items.
    expect(items()).toHaveLength(2);
    // C → F, and F back to C across the repeat.
    expect(sharedBadges()).toEqual(['1 shared note', '1 shared note']);
    // The wrap badge says where it goes, not only with its repeat icon.
    expect(items()[1].querySelector('[data-strip-cues]')?.textContent).toMatch(
      /^Back to bar 1: 1 shared note/,
    );
    expect(items()[0].querySelector('[data-strip-cues]')?.textContent).toMatch(
      /^1 shared note/,
    );

    const anchors = screen.getAllByRole('button', {
      name: 'Keep a finger down: string 2, fret 1',
    });
    expect(anchors).toHaveLength(2);
    fireEvent.click(anchors[0]);
    expect(
      screen.getByText(
        'Both chords use this note. Leave that finger pressed and move the others.',
      ),
    ).toBeInTheDocument();
  });

  it('flags a change with no shared notes as tricky', () => {
    renderStrip('C', 'B2.1'); // C Dm Em F
    expect(sharedBadges()).toEqual([
      'No shared notes',
      'No shared notes',
      'No shared notes',
      '',
    ]);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'No shared notes' })[0],
    );
    expect(
      screen.getByText(/These chords share no notes, so every finger moves\./),
    ).toBeInTheDocument();
  });

  it('counts shared notes between neighbouring 7th chords', () => {
    renderStrip('C', 'B8.1');
    const badges = sharedBadges();
    expect(badges).toHaveLength(8);
    expect(badges.slice(0, 7).every((b) => /shared note/.test(b))).toBe(true);
    // The page ends on chord 1: no change after it.
    expect(badges[7]).toBe('');
  });

  it('hides shared-note badges with the setting off', () => {
    useGuitarDisplaySettings.setState({ showSharedNotes: false });
    renderStrip('C', 'D3.2', { map: GUITAR_ATLAS_BOOK_ONE.C.musicMaps[1] });
    expect(sharedBadges()).toEqual(['', '']);
    expect(
      screen.queryByRole('button', { name: /^Keep a finger down/ }),
    ).toBeNull();
    // A prop overrides the device setting.
    cleanup();
    renderStrip('C', 'D3.2', {
      map: GUITAR_ATLAS_BOOK_ONE.C.musicMaps[1],
      showSharedNotes: true,
    });
    expect(sharedBadges()).toEqual(['1 shared note', '1 shared note']);
  });

  it('leaves single-chord and arpeggio steps without change badges', () => {
    renderStrip('C', 'B3.1'); // articulations: no change notes in B3
    expect(sharedBadges().every((b) => b === '')).toBe(true);
  });

  it('adds Roman numerals beside the Hybrid labels with the setting', () => {
    useGuitarDisplaySettings.setState({ showRomanNumerals: true });
    renderStrip('C', 'B8.1');
    expect(subtitles()).toEqual([
      '1 maj7 · Imaj7',
      '2 min7 · ii7',
      '3 min7 · iii7',
      '4 maj7 · IVmaj7',
      '5 dom7 · V7',
      '6 min7 · vi7',
      '7 min7(♭5) · viiø7',
      '1 maj7 · Imaj7',
    ]);
  });

  it('cues the climbing top line and the octave return on the 7th-chord page', () => {
    renderStrip('C', 'B8.1'); // one run, boxes 1-8; chord 1 returns +12
    const cue = screen.getByRole('button', { name: 'Listen to the top' });
    expect(document.querySelectorAll('[data-top-line]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-top-line-continue]')).toHaveLength(
      6,
    );
    fireEvent.click(cue);
    expect(
      screen.getByText(
        /While the shape stays the same, it climbs one scale step/,
      ),
    ).toBeInTheDocument();

    const back = items()[7].querySelector('[data-octave-return]');
    expect(back?.getAttribute('data-octave-return')).toBe('b8.octaveSame');
    fireEvent.click(screen.getByRole('button', { name: 'Back to 1' }));
    expect(
      screen.getByText(
        'Chord 1 returns 12 frets higher. Same shape, one octave up.',
      ),
    ).toBeInTheDocument();
  });

  it('splits the top line into its runs (G: 1-5 and 6-8)', () => {
    renderStrip('G', 'B8.1');
    expect(document.querySelectorAll('[data-top-line]')).toHaveLength(2);
    const starts = items().map((li) => !!li.querySelector('[data-top-line]'));
    expect(starts).toEqual([
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(
      items()[7]
        .querySelector('[data-octave-return]')
        ?.getAttribute('data-octave-return'),
    ).toBe('b8.octaveNew');
  });
});
