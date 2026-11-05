// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { parseChordList } from '@/curriculum/guitar/layout/lessonTextEditing';
import { InlineTagList } from '../Editable';

afterEach(cleanup);

let latest: string[] = [];

const Chords = ({ initial = [] as string[] }) => {
  const [values, setValues] = useState(initial);
  return (
    <InlineTagList
      values={values}
      onChange={(next) => {
        latest = next;
        setValues(next);
      }}
      ordered
      parse={parseChordList}
      addLabel="Chord"
      ariaLabel="Chord symbols"
    />
  );
};

const add = (text: string) => {
  fireEvent.click(screen.getByLabelText('Chord symbols — chord'));
  const input = screen.getByLabelText('Chord symbols — new entry');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('InlineTagList, ordered with a parser (a step’s chords)', () => {
  it('keeps a chord that comes again (owner, 4 Nov 2026: C7 F7 C7)', () => {
    latest = [];
    render(<Chords />);
    add('C7');
    add('F7');
    add('C7');
    expect(latest).toEqual(['C7', 'F7', 'C7']);
  });

  it('reads a line with bars marked as a chord a bar', () => {
    latest = [];
    render(<Chords />);
    add('C7 | F7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | C7 |');
    expect(latest).toEqual('C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 C7'.split(' '));
  });

  it('opens a chip in place: a line typed there takes its place', () => {
    latest = [];
    render(<Chords initial={['C7 | F7 | C7', 'G7']} />);
    fireEvent.click(
      screen.getByLabelText('Chord symbols — change C7 | F7 | C7'),
    );
    fireEvent.keyDown(screen.getByLabelText('Chord symbols — edit'), {
      key: 'Enter',
    });
    expect(latest).toEqual(['C7', 'F7', 'C7', 'G7']);
  });

  it('changes one bar without moving the rest', () => {
    latest = [];
    render(<Chords initial={['C7', 'F7', 'C7', 'C7']} />);
    fireEvent.click(screen.getAllByLabelText('Chord symbols — change C7')[1]);
    const input = screen.getByLabelText('Chord symbols — edit');
    fireEvent.change(input, { target: { value: 'G7' } });
    fireEvent.blur(input);
    expect(latest).toEqual(['C7', 'F7', 'G7', 'C7']);
  });

  it('holds what it can’t read open, marked, until Escape', () => {
    latest = [];
    render(<Chords initial={['C7']} />);
    add('C7 | H7');
    const input = screen.getByLabelText('Chord symbols — new entry');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(latest).toEqual([]);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByLabelText('Chord symbols — new entry')).toBeNull();
  });
});

describe('InlineTagList, unordered (tags)', () => {
  it('still keeps a tag once', () => {
    let tags: string[] = ['swing'];
    render(
      <InlineTagList
        values={tags}
        onChange={(next) => (tags = next)}
        addLabel="Tag"
        ariaLabel="Tags"
      />,
    );
    fireEvent.click(screen.getByLabelText('Tags — tag'));
    const input = screen.getByLabelText('Tags — new entry');
    fireEvent.change(input, { target: { value: 'swing' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(tags).toEqual(['swing']);
  });
});
