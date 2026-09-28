import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChordSymbolText, splitChordSymbol } from '../ChordSymbolText';

/**
 * Splitting a chord into letter / accidental / quality / bass is what lets
 * four bars fit across a phone, so it has to hold for every shape the library
 * actually writes — and leave alone anything that is not a chord.
 */
describe('splitChordSymbol', () => {
  it('takes a plain triad as a bare letter', () => {
    expect(splitChordSymbol('C')).toEqual({
      root: 'C',
      accidental: '',
      quality: '',
      bass: '',
    });
  });

  it('lifts the accidental off the letter', () => {
    expect(splitChordSymbol('B♭')).toMatchObject({
      root: 'B',
      accidental: '♭',
      quality: '',
    });
    expect(splitChordSymbol('F♯min7')).toMatchObject({
      root: 'F',
      accidental: '♯',
      quality: 'min7',
    });
  });

  it('takes the quality off the letter whole', () => {
    expect(splitChordSymbol('Amin7')).toMatchObject({
      root: 'A',
      quality: 'min7',
    });
    expect(splitChordSymbol('B♭7sus4')).toMatchObject({
      root: 'B',
      accidental: '♭',
      quality: '7sus4',
    });
    expect(splitChordSymbol('Cmin7b5')).toMatchObject({ quality: 'min7b5' });
  });

  it('separates the bass of a slash chord', () => {
    expect(splitChordSymbol('E♭/G')).toMatchObject({
      root: 'E',
      accidental: '♭',
      quality: '',
      bass: 'G',
    });
    expect(splitChordSymbol('Amin7/C♯')).toMatchObject({
      root: 'A',
      quality: 'min7',
      bass: 'C♯',
    });
  });

  it('leaves alone anything that is not a chord letter', () => {
    // N.C. starts with no note letter; a hybrid degree starts with a number.
    expect(splitChordSymbol('N.C.')).toMatchObject({
      root: 'N.C.',
      quality: '',
    });
    expect(splitChordSymbol('♭7 maj')).toMatchObject({ root: '♭7 maj' });
    expect(splitChordSymbol('5 dom7')).toMatchObject({ root: '5 dom7' });
  });

  it('reads the ASCII spellings some charts still carry', () => {
    expect(splitChordSymbol('Bbmin7')).toMatchObject({
      root: 'B',
      accidental: 'b',
      quality: 'min7',
    });
  });
});

/**
 * How the three levels are set. A slash chord is engraved as the chord, a
 * stroke, and the bass note at the foot of it — not strung along one line,
 * where it reads as two chords side by side.
 */
describe('ChordSymbolText', () => {
  const render = (text: string) =>
    renderToStaticMarkup(<ChordSymbolText text={text} size={26} />);

  it('sets a slash chord on two levels, the bass under the chord', () => {
    const html = render('C/B♭');
    // Column-stacked, and the bass is a sibling of the chord, not inside it.
    expect(html).toContain('flex-col');
    const chordAt = html.indexOf('C');
    const slashAt = html.indexOf('/', chordAt);
    const bassAt = html.indexOf('B', slashAt);
    expect(chordAt).toBeLessThan(slashAt);
    expect(slashAt).toBeLessThan(bassAt);
  });

  it('draws the stroke well over its own line, so it reaches the bass', () => {
    // A typed slash at the bass size is a tick; this one is a stroke.
    expect(render('C/B♭')).toContain('font-size:2.6em');
  });

  it('keeps the quality above the stroke and the bass below it', () => {
    // The quality belongs beside the letter and the bass on its own level.
    // Setting the bass in the quality column is what made a slash chord read
    // as one cramped stack rather than as a chord over a note.
    const html = render('Amin7/E');
    const stroke = html.indexOf('font-size:2.6em');
    expect(stroke).toBeGreaterThan(-1);
    expect(html.indexOf('min7')).toBeLessThan(stroke);
    expect(html.indexOf('>E<', stroke)).toBeGreaterThan(stroke);
  });

  it('leaves a chord with no bass on one level', () => {
    const html = render('Amin7');
    expect(html).not.toContain('font-size:2.6em');
    expect(html).toContain('min7');
  });

  it('takes a size the browser works out, not only a number', () => {
    const html = renderToStaticMarkup(
      <ChordSymbolText text="Amin7" size="clamp(13px, 4cqw, 26px)" />,
    );
    // Everything below the letter is set in em, so one CSS length does it all.
    expect(html).toContain('font-size:clamp(13px, 4cqw, 26px)');
    expect(html).toContain('font-size:0.58em');
  });
});

/**
 * Where the quality sits. A chart writes B−7 and F♯−7 with the dash high
 * beside the letter; stacking it under the accidental dropped it below the
 * letter's middle, into the space a bass note occupies.
 */
describe('ChordSymbolText placement', () => {
  const render = (text: string) =>
    renderToStaticMarkup(<ChordSymbolText text={text} size={26} />);

  it('sets the accidental and the quality as one raised run', () => {
    // Not a column of two: they share a line, so neither is pushed down.
    expect(render('F♯−')).toContain('>♯−<');
    expect(render('B♭Δ7')).toContain('>♭Δ7<');
    expect(render('D♯°7')).toContain('>♯°7<');
  });

  it('puts a quality in the same place with or without an accidental', () => {
    // "B−7" was always right; "F♯−" was the one hanging low.
    const withAccidental = render('F♯−7');
    const without = render('B−7');
    const raised = /font-size:0\.58em"[^>]*>([^<]*)</;
    expect(raised.exec(withAccidental)?.[1]).toBe('♯−7');
    expect(raised.exec(without)?.[1]).toBe('−7');
  });

  it('sets the whole lower level in, so the stroke crosses the symbol', () => {
    // Offsetting only the bass left the stroke hanging off the left edge
    // instead of running diagonally under the chord.
    const html = render('C/B♭');
    expect(html).toMatch(/margin-top:0\.18em;margin-left:0\.6em/);
  });
});
