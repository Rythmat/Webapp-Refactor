import type { CSSProperties, FC } from 'react';

/**
 * A chord symbol set the way a chart sets it: the letter big, everything else
 * tucked around it.
 *
 * This is what lets four bars fit across a phone. Written flat, "B♭maj7/D♭"
 * is nine characters at full size and needs about 110px; with the accidental
 * raised, the quality dropped and the bass small, the same chord reads at a
 * glance in barely half that, because the eye only has to find the letter.
 */

export interface ChordParts {
  /** The letter — A to G, or the whole text when it is not a chord. */
  root: string;
  /** ♯ or ♭ on the root, set high. */
  accidental: string;
  /** min7, 7sus4, Δ7 — set low. */
  quality: string;
  /** The bass of a slash chord, set low after the slash. */
  bass: string;
}

/**
 * Split a written chord into the parts that get set at different sizes.
 * Anything that does not start with a note letter (N.C., a rehearsal word,
 * a hybrid number like "♭7 maj") is left whole as the root.
 */
export function splitChordSymbol(text: string): ChordParts {
  const blank: ChordParts = {
    root: text,
    accidental: '',
    quality: '',
    bass: '',
  };
  const match = /^([A-G])([♯♭#b]?)(.*)$/.exec(text.trim());
  if (!match) return blank;
  const [, root, accidental, rest] = match;
  const slash = rest.indexOf('/');
  return {
    root,
    accidental,
    quality: slash < 0 ? rest : rest.slice(0, slash),
    bass: slash < 0 ? '' : rest.slice(slash + 1),
  };
}

export const ChordSymbolText: FC<{
  text: string;
  /** Size of the letter; everything else is set from it in `em`, so a CSS
   *  length that the browser works out for itself — a `clamp()` over the
   *  chart's width — sets the whole symbol just as a number does. */
  size: number | string;
  style?: CSSProperties;
}> = ({ text, size, style }) => {
  const { root, accidental, quality, bass } = splitChordSymbol(text);

  return (
    <span
      className="inline-flex items-start whitespace-nowrap leading-none"
      style={{ fontFamily: 'serif', fontSize: size, ...style }}
    >
      <span>{root}</span>
      {(accidental || quality || bass) && (
        <span
          className="inline-flex flex-col leading-none"
          style={{ fontSize: '0.58em' }}
        >
          {/* The accidental rides above the letter, the quality sits under
              it — so a chord takes one column of width, not a line of text. */}
          <span style={{ height: accidental ? undefined : 0 }}>
            {accidental}
          </span>
          <span>{quality}</span>
          {bass && (
            <span style={{ fontSize: '0.92em' }}>
              <span style={{ opacity: 0.7 }}>/</span>
              {bass}
            </span>
          )}
        </span>
      )}
    </span>
  );
};
