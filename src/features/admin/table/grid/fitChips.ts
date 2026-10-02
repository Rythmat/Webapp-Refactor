/**
 * How many of a cell's chips fit on its one line, leaving room for "+N".
 *
 * Measuring text in a virtual list would cost a layout per chip per scroll,
 * so the widths are estimated from the character count at the chip's type
 * size (11 px Glacial runs about 6 px a character). An estimate that runs
 * over is clipped by the cell, one that runs under leaves a little air;
 * either way a chip is never cut mid-list without its "+N".
 */

/** Average advance of one character of chip text, in px. */
export const CHAR_WIDTH = 6;
/** A chip's horizontal padding and border. */
export const CHIP_CHROME = 14;
/** Space between chips. */
export const CHIP_GAP = 4;
/** Room for "+N" after the last chip shown. */
export const MORE_WIDTH = 28;
/** A chip never grows past this; a longer name truncates inside it. */
export const CHIP_MAX_WIDTH = 176;

export interface ChipText {
  label: string;
  /** Its word ('song pins', 'wrote'), in smaller type after the label. */
  tag?: string;
  /** A count shown after the label (a rollup's weight), or none. */
  count?: number;
}

/** The estimated width of one chip. */
export function chipWidth({ label, tag, count }: ChipText): number {
  let chars = label.length;
  // The tag and count sit in 10 px type, a gap away.
  if (tag) chars += 1 + tag.length * 0.85;
  if (count !== undefined) chars += 1 + String(count).length * 0.85;
  return Math.min(CHIP_MAX_WIDTH, Math.ceil(chars * CHAR_WIDTH) + CHIP_CHROME);
}

/**
 * How many chips, from the first, to show in `width` px when the cell has
 * `total` neighbours in all (more than the chips it carries, past the
 * cell's chip limit). At least one when there is any: a lone long name
 * truncates rather than leaving the cell showing only "+N".
 */
export function fitChips(
  chips: readonly ChipText[],
  width: number,
  total: number = chips.length,
): number {
  let used = 0;
  let shown = 0;
  for (const chip of chips) {
    const next = used + (shown ? CHIP_GAP : 0) + chipWidth(chip);
    const hiddenAfter = total - (shown + 1);
    const more = hiddenAfter > 0 ? CHIP_GAP + MORE_WIDTH : 0;
    if (next + more > width) break;
    used = next;
    shown += 1;
  }
  return chips.length ? Math.max(1, shown) : 0;
}
