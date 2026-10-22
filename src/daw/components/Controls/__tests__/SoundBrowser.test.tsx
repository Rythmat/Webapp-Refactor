// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoundBrowser, type SoundCategory } from '../SoundBrowser';
import { MY_PATCHES, synthPatchCategories } from '../synthPatchCategories';

// ── The dock's sound column (2026-10-21) ───────────────────────────────────
// Every MIDI instrument's sounds in two columns: the main categories, then
// the picked category's sounds, opening on the playing sound's category.
// The playing sound is marked in the list; no name row sits above it.

afterEach(cleanup);

const CATEGORIES: SoundCategory[] = [
  {
    id: 'bass',
    label: 'Bass',
    sounds: [
      { id: 'BASS', label: 'BASS' },
      { id: 'WOBBLE', label: 'WOBBLE' },
    ],
  },
  { id: 'pad', label: 'Pad', sounds: [{ id: 'PAD', label: 'PAD' }] },
];

const listed = () =>
  [...document.querySelectorAll<HTMLElement>('[data-sound]')].map(
    (b) => b.dataset.sound,
  );

describe('SoundBrowser', () => {
  it('opens on the playing sound’s category, marks it, and names it', () => {
    render(
      <SoundBrowser
        label="Synth patches"
        categories={CATEGORIES}
        selectedId="PAD"
        onPick={() => {}}
      />,
    );
    expect(listed()).toEqual(['PAD']);
    expect(screen.getByRole('button', { name: 'PAD' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    // No name row above the lists: the marked row says what plays.
    expect(screen.queryByTestId('sound-browser-current')).toBeNull();
    expect(screen.getByRole('list', { name: 'Synth patches' })).toBeTruthy();
  });

  it('plays a sound picked from the list', () => {
    const onPick = vi.fn();
    render(
      <SoundBrowser
        label="Synth patches"
        categories={CATEGORIES}
        selectedId="BASS"
        onPick={onPick}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'WOBBLE' }));
    expect(onPick).toHaveBeenCalledWith('WOBBLE');
  });

  it('follows the playing sound to its category when it changes elsewhere', () => {
    const { rerender } = render(
      <SoundBrowser
        label="Synth patches"
        categories={CATEGORIES}
        selectedId="BASS"
        onPick={() => {}}
      />,
    );
    expect(listed()).toEqual(['BASS', 'WOBBLE']);
    rerender(
      <SoundBrowser
        label="Synth patches"
        categories={CATEGORIES}
        selectedId="PAD"
        onPick={() => {}}
      />,
    );
    expect(listed()).toEqual(['PAD']);
  });

  it('lists the categories in its first column, and a click shows their sounds', () => {
    render(
      <SoundBrowser
        label="Synth patches"
        categories={CATEGORIES}
        selectedId="BASS"
        onPick={() => {}}
      />,
    );
    const categories = screen.getByRole('list', {
      name: 'Synth patches: categories',
    });
    expect(
      [...categories.querySelectorAll<HTMLElement>('[data-category]')].map(
        (b) => b.textContent,
      ),
    ).toEqual(['Bass', 'Pad']);
    expect(screen.getByRole('button', { name: 'Bass' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pad' }));
    expect(listed()).toEqual(['PAD']);
    // The playing sound's category stays marked: only the list changed.
    expect(
      categories
        .querySelector('[data-category="bass"]')
        ?.querySelector('span[aria-hidden]'),
    ).toBeTruthy();
  });

  it('keeps the lesson anchor on the sounds, and shows a sound loading', () => {
    render(
      <SoundBrowser
        label="Drum kits"
        categories={[
          {
            id: 'kits',
            label: 'Kits',
            sounds: [
              { id: 'natural', label: 'Natural' },
              { id: '808', label: '808' },
            ],
          },
        ]}
        selectedId="natural"
        loadingId="808"
        anchor="drum-kit-selector"
        onPick={() => {}}
      />,
    );
    expect(
      document.querySelector('[data-tutorial-id="drum-kit-selector"]'),
    ).toBe(screen.getByRole('list', { name: 'Drum kits' }));
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });
});

describe('synthPatchCategories', () => {
  it('sorts the factory patches by what they are, Init first', () => {
    const cats = synthPatchCategories(
      [
        'INITIALIZE',
        'PAD',
        'BASS',
        'LEAD',
        'PLUCK',
        'WOBBLE',
        'DRIFT',
        'TRANCE',
        'SEQUENCE',
        'CHORDS',
        'STAB',
      ],
      [],
      [],
    );
    expect(cats.map((c) => [c.label, c.sounds.map((s) => s.id)])).toEqual([
      ['Init', ['INITIALIZE']],
      ['Bass', ['BASS', 'WOBBLE']],
      ['Lead', ['LEAD', 'TRANCE']],
      ['Pad', ['PAD', 'DRIFT']],
      ['Pluck', ['PLUCK', 'SEQUENCE']],
      ['Chords', ['CHORDS', 'STAB']],
    ]);
  });

  it('puts packs in their own category, joining one of the same name, and the student’s last', () => {
    const cats = synthPatchCategories(
      ['BASS', 'NEW ONE'],
      [
        { name: 'SUB', category: 'bass' },
        { name: 'SWEEP', category: 'FX' },
      ],
      ['MY BASS'],
    );
    expect(cats.map((c) => [c.label, c.sounds.map((s) => s.id)])).toEqual([
      ['Bass', ['BASS', 'SUB']],
      ['Other', ['NEW ONE']],
      ['FX', ['SWEEP']],
      [MY_PATCHES, ['MY BASS']],
    ]);
  });
});
