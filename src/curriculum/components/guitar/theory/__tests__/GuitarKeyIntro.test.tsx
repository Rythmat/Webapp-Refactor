// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { GuitarKeyName } from '@/curriculum/data/guitar/types';
import { GuitarKeyIntro } from '../GuitarKeyIntro';

afterEach(cleanup);

function openIntro(key: GuitarKeyName) {
  render(<GuitarKeyIntro keyCenter={key} keyColor="#D2404A" />);
  const toggle = screen.getByRole('button', { name: 'About this key' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('region')).toBeNull();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  return screen.getByRole('region', { name: 'About this key' });
}

const noteIds = () =>
  [...document.querySelectorAll('[data-key-note]')].map((el) =>
    el.getAttribute('data-key-note'),
  );

describe('GuitarKeyIntro', () => {
  it('starts with C', () => {
    const region = openIntro('C');
    expect(noteIds()).toEqual(['key.first', 'key.circle', 'key.relMinor']);
    expect(region).toHaveTextContent('Start with C');
    expect(region).toHaveTextContent(
      'C major has no sharps or flats. Each key after it changes just one note.',
    );
    expect(region).toHaveTextContent('A minor uses the same notes as C major.');
    // With the chord-family preview.
    expect(
      screen.getByRole('list', { name: 'Chords in this key' }),
    ).toBeInTheDocument();
  });

  it('names the one new note in G', () => {
    const region = openIntro('G');
    expect(noteIds()).toEqual(['key.newNote', 'key.circle', 'key.relMinor']);
    expect(region).toHaveTextContent(
      'G major is C major with one note changed. F becomes F♯. Find F♯ in your scale shape.',
    );
    expect(region).toHaveTextContent('E minor uses the same notes as G major.');
  });

  it('explains the respelling at D♭', () => {
    const region = openIntro('Db');
    expect(noteIds()).toEqual([
      'key.newNoteRespelled',
      'key.flatSwitch',
      'key.circle',
      'key.relMinor',
    ]);
    expect(region).toHaveTextContent(
      'D♭ major sounds like F♯ major with one note changed. B becomes C. The other notes keep their sound but take flat names.',
    );
    expect(region).toHaveTextContent('Now with flats');
    expect(region).toHaveTextContent(
      'B♭ minor uses the same notes as D♭ major.',
    );
  });
});
