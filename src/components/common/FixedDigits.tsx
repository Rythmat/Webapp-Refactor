import { type MotionValue, useMotionValueEvent } from 'framer-motion';
import { type ComponentPropsWithoutRef, type FC, useState } from 'react';

/**
 * Text whose digits hold still while it changes.
 *
 * The app's typeface, Glacial Indifference, has proportional digits and no
 * tabular-figures feature, so `tabular-nums` does nothing: a meter reading
 * '-12.3' and then '-11.8' shifts sideways on every update. Here each digit
 * sits in a cell as wide as Glacial's widest ('2' at 0.615em regular, '0' at
 * 0.616em bold) and each separator in a narrower cell of its own, so a
 * readout only changes width when its number of characters does. Any other
 * character (a unit, '%', '∞') renders at its natural width.
 */

/** Cell widths in em, measured from the shipped Glacial Regular and Bold. */
const CELL_EM: Record<string, number> = {
  '.': 0.32,
  ':': 0.32,
  ',': 0.32,
  '-': 0.42,
  '−': 0.42,
  '+': 0.46,
};
const DIGIT_EM = 0.62;

const cellWidth = (ch: string): number | undefined =>
  ch >= '0' && ch <= '9' ? DIGIT_EM : CELL_EM[ch];

type FixedDigitsProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  text: string;
};

export const FixedDigits: FC<FixedDigitsProps> = ({ text, ...span }) => (
  <span {...span}>
    {Array.from(text, (ch, i) => {
      const width = cellWidth(ch);
      return width ? (
        <span
          key={i}
          // Tracking would add space after the glyph inside a fixed cell and
          // push it off centre, so cells ignore any inherited letter-spacing.
          style={{
            display: 'inline-block',
            width: `${width}em`,
            textAlign: 'center',
            letterSpacing: 0,
          }}
        >
          {ch}
        </span>
      ) : (
        <span key={i}>{ch}</span>
      );
    })}
  </span>
);

/**
 * `FixedDigits` for a framer-motion value that updates every frame. Motion
 * writes a MotionValue straight into a text node, which leaves no characters
 * to put in cells, so this re-renders from the value instead.
 */
export const MotionFixedDigits: FC<
  Omit<FixedDigitsProps, 'text'> & { value: MotionValue<string> }
> = ({ value, ...rest }) => {
  const [text, setText] = useState(() => value.get());
  useMotionValueEvent(value, 'change', setText);
  return <FixedDigits text={text} {...rest} />;
};
