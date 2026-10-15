import type { CSSProperties } from 'react';
import { CHORD_INPUT_HINT } from './chordInput';

// The design tokens' custom properties (src/daw/ui/tokens.ts), named here
// rather than through dawVar so the editor's first load doesn't take the
// whole token table for three colours.
const WARNING = 'var(--daw-warning)';
const OUTLINE = 'var(--daw-outline)';
const POPOVER = 'var(--daw-popover)';

/**
 * A chord box's outline: neutral while typing, the warning colour once it
 * has refused what was typed. The Lead Sheet, the Score and the Timeline's
 * chord ruler share it, so a refused chord looks the same in each.
 */
export const chordBoxBorder = (refused: boolean): string =>
  `1px solid ${refused ? WARNING : OUTLINE}`;

/**
 * The line under a chord box that refused what was typed: "Not a chord we
 * know. Try Cmaj7, Dm7b5". Placed by the caller (`style`), absolutely.
 */
export function ChordInputHint({ style }: { style?: CSSProperties }) {
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        zIndex: 7,
        fontSize: 12,
        lineHeight: '16px',
        padding: '2px 6px',
        borderRadius: 4,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        fontFamily: "'Glacial Indifference', system-ui, sans-serif",
        color: WARNING,
        background: POPOVER,
        border: `1px solid ${WARNING}`,
        ...style,
      }}
    >
      {CHORD_INPUT_HINT}
    </div>
  );
}
