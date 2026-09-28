// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { GUITAR_KEY_ORDER } from '@/curriculum/data/guitar/bookOne';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import { useGuitarDisplaySettings } from '@/features/learn/useGuitarDisplaySettings';
import { GuitarSectionBCard } from '../GuitarSectionBCard';
import {
  familyChips,
  isSectionBCardDue,
  sectionBCardBarreCare,
  sectionBCardSeenId,
} from '../theoryUi';

const RED = '#D2404A';

function renderCard(key: GuitarKeyName, onClose = vi.fn()) {
  const view = render(
    <GuitarSectionBCard
      flow={buildGuitarAppliedTheoryFundamentalsFlow(key)}
      keyCenter={key}
      keyColor={RED}
      onClose={onClose}
    />,
  );
  return { ...view, onClose };
}

const chipItems = () =>
  within(screen.getByRole('list', { name: 'Chords in this key' })).getAllByRole(
    'listitem',
  );

beforeEach(() => {
  localStorage.clear();
  useGuitarDisplaySettings.setState({
    dismissedNotes: [],
    showRomanNumerals: false,
  });
});
afterEach(cleanup);

describe('GuitarSectionBCard', () => {
  it('explains where chords come from, with a skip-one-take-one row', () => {
    renderCard('C');
    expect(
      screen.getByRole('region', { name: 'Chords come from the scale' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Pick a scale note\. Skip the next note/),
    ).toBeInTheDocument();

    const cells = within(
      screen.getByRole('list', { name: 'Scale notes' }),
    ).getAllByRole('listitem');
    const roles = () => cells.map((c) => c.getAttribute('data-role'));
    expect(roles().slice(0, 6)).toEqual([
      'take',
      'skip',
      'take',
      'skip',
      'take',
      'none',
    ]);
    // Taken and skipped cells say so in words, not only by colour.
    expect(cells[0]).toHaveTextContent('C1take');
    expect(cells[1]).toHaveTextContent('D2skip');
    const result = () =>
      document.querySelector('[data-skip-take-result]')?.textContent;
    expect(result()).toBe('Chord 1: C E G = C (1 maj)');

    const previous = screen.getByRole('button', { name: 'Previous chord' });
    expect(previous).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next chord' }));
    expect(result()).toBe('Chord 2: D F A = Dm (2 min)');
    expect(roles().slice(0, 6)).toEqual([
      'none',
      'take',
      'skip',
      'take',
      'skip',
      'take',
    ]);
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next chord' }));
    }
    expect(result()).toBe('Chord 7: B D F = B° (later as 7 min7(♭5))');
    expect(screen.getByRole('button', { name: 'Next chord' })).toBeDisabled();
  });

  it('shows the key chord family 1-7 with chord 7 greyed for later', () => {
    renderCard('C');
    const chips = chipItems();
    expect(
      chips.map((li) => li.querySelector('[aria-hidden]')?.textContent),
    ).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
    expect(chips[1]).toHaveTextContent('Chord 2: D minor');
    expect(chips[1]).toHaveTextContent('2 min');
    expect(chips.map((li) => li.hasAttribute('data-later'))).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(chips[6]).toHaveTextContent('later as 7 min7(♭5)');
    // Roman numerals only with the setting.
    expect(document.querySelector('[data-roman]')).toBeNull();
  });

  it('spells the family in the key and adds Roman numerals with the setting', () => {
    useGuitarDisplaySettings.setState({ showRomanNumerals: true });
    renderCard('Db');
    expect(
      chipItems().map((li) => li.querySelector('[aria-hidden]')?.textContent),
    ).toEqual(['D♭', 'E♭m', 'Fm', 'G♭', 'A♭', 'B♭m', 'C°']);
    expect(
      [...document.querySelectorAll('[data-roman]')].map(
        (el) => el.textContent,
      ),
    ).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    // Read as well as seen.
    expect(chipItems()[1].querySelector('.sr-only')).toHaveTextContent(
      'Chord 2: E♭ minor, ii',
    );
  });

  it('gives the shared pattern and where chord 7 went', () => {
    renderCard('C');
    expect(
      screen.getByText(
        'In every major key the chords follow one pattern. 1 major, 2 minor, 3 minor, 4 major, 5 major, 6 minor, 7 diminished.',
      ),
    ).toBeInTheDocument();

    const later = screen.getByRole('button', { name: 'Where is chord 7?' });
    expect(later).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/You will play it later/)).toBeNull();
    fireEvent.click(later);
    expect(screen.getByText(/You will play it later/)).toBeInTheDocument();

    // C's barres start at B1.7 (F): the step panel gives hand care there,
    // not the card at B1.1.
    expect(screen.queryByText('Look after your hand')).toBeNull();
  });

  it('carries hand care only where barres start on its own step', () => {
    // B, D♭, E♭, B♭ and F open Section B with barre triads.
    const withCare = GUITAR_KEY_ORDER.filter(
      (key) =>
        sectionBCardBarreCare(
          buildGuitarAppliedTheoryFundamentalsFlow(key),
          key,
        ) !== null,
    );
    expect(withCare).toEqual(['B', 'Db', 'Eb', 'Bb', 'F']);

    renderCard('Db');
    expect(screen.getByText('Look after your hand')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    // Read on the card: the step panel will not open it again in D♭.
    expect(useGuitarDisplaySettings.getState().dismissedNotes).toEqual([
      sectionBCardSeenId('Db'),
      'b.barreCare@Db',
    ]);
  });

  it('closes once per key', () => {
    const { onClose } = renderCard('C');
    expect(isSectionBCardDue('C', [])).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    const { dismissedNotes } = useGuitarDisplaySettings.getState();
    // C's card has no hand care, so only the card itself is marked seen.
    expect(dismissedNotes).toEqual([sectionBCardSeenId('C')]);
    expect(isSectionBCardDue('C', dismissedNotes)).toBe(false);
    expect(isSectionBCardDue('G', dismissedNotes)).toBe(true);
  });

  it('builds a family for every key', () => {
    for (const key of GUITAR_KEY_ORDER) {
      const chips = familyChips(key);
      expect(chips.map((c) => c.hybrid.split(' ')[0])).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        'later',
      ]);
      expect(chips.every((c) => !/[#b]/.test(c.symbol.slice(1)))).toBe(true);
    }
  });
});
