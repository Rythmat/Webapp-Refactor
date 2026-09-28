import type { CSSProperties, FC } from 'react';

/**
 * A chord symbol set the way a chart sets it: the letter big, everything else
 * tucked around it.
 *
 * This is what lets four bars fit across a phone. Written flat, "B♭maj7/D♭"
 * is nine characters at full size and needs about 110px; with the accidental
 * raised, the quality dropped and the bass set under a stroke, the same chord
 * reads at a glance in barely half that, because the eye only has to find the
 * letter.
 *
 * Three levels, then: the accidental above the letter, the quality beside it,
 * and a slash chord's bass note below on its own stroke.
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
      className="inline-flex flex-col items-start whitespace-nowrap leading-none"
      style={{ fontFamily: 'serif', fontSize: size, ...style }}
    >
      <span className="inline-flex items-start leading-none">
        <span>{root}</span>
        {/* The accidental and the quality ride together at the top of the
            letter, the way a chart writes them: B♭, B−7, F♯−7. Stacking the
            quality under the accidental pushed it below the letter's middle,
            so "F♯−" hung its dash where a bass note goes while "B−7" — which
            has no accidental to displace it — sat correctly high. */}
        {(accidental || quality) && (
          <span className="leading-none" style={{ fontSize: '0.58em' }}>
            {accidental}
            {quality}
          </span>
        )}
      </span>

      {/* A slash chord is engraved on two levels — the chord, a long stroke
          beneath it, and the bass note at the foot of the stroke. Written
          along one line it reads as two chords; stacked, the eye takes the
          top as the chord and the bottom as the note under it, which is what
          it is. It is also narrower, which a bar on a phone needs. */}
      {bass && (
        <span
          className="inline-flex items-baseline leading-none"
          style={{
            fontSize: '0.58em',
            marginTop: '0.18em',
            // The whole lower level is set in, stroke and all, so the stroke
            // starts under the middle of the chord and finishes past its
            // right — a diagonal across the symbol rather than a tail hung
            // off its left edge.
            marginLeft: '0.6em',
          }}
        >
          {/* A long stroke, not a typed slash: it has to reach from under the
              chord down to the foot of the bass note, so it is set well over
              its own line and the line box is shortened to let it.

              Every offset here is in `em`, so the whole figure holds its
              shape wherever the chart's type lands between its floor and its
              cap. */}
          <span
            style={{
              fontSize: '2.6em',
              lineHeight: 0.42,
              marginRight: '0.05em',
              opacity: 0.8,
            }}
          >
            /
          </span>
          <span>{bass}</span>
        </span>
      )}
    </span>
  );
};
