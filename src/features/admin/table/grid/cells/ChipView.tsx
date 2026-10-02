import { Sparkles } from 'lucide-react';
import { cn } from '@/components/utilities';
import type { Chip, ChipStyle, GhostChip } from '../../model/types';
import { CHIP_MAX_WIDTH } from '../fitChips';

/**
 * One connection as a chip, drawn the way the mind map draws its edge:
 * solid when linked, dashed and muted italic when unconfirmed, dotted when
 * guessed from text, hollow when the node is found nowhere, and a faint
 * dashed ghost for a suggestion not yet accepted. A hint's chip (what a
 * picker would offer, not a value of the row) is dimmed whatever its style.
 *
 * Plain text, not a link: a grid of a thousand rows must not be a thousand
 * tab stops. The row opens in the panel, which lists every connection with
 * its links.
 */

const CHIP_CLASS: Record<ChipStyle, string> = {
  solid: 'border-solid border-white/20 bg-white/[0.07] text-white/85',
  dashed: 'border-dashed border-white/30 italic text-white/55',
  dotted: 'border-dotted border-white/35 text-white/70',
  hollow: 'border-solid border-white/25 bg-transparent text-white/45',
  // Faint, and still readable at 11 px (white/55 on the panel is 5.8:1).
  ghost: 'border-dashed border-white/25 bg-transparent text-white/55',
};

/** How a style reads aloud and in the tooltip. */
export const STYLE_WORD: Record<ChipStyle, string> = {
  solid: 'linked',
  dashed: 'unconfirmed',
  dotted: 'guessed',
  hollow: 'missing',
  ghost: 'suggestion',
};

/** "Washington · song pins — guessed · city". */
export function chipTitle(chip: Chip): string {
  const name = chip.tag ? `${chip.label} · ${chip.tag}` : chip.label;
  const how = [
    STYLE_WORD[chip.style],
    chip.muted && 'a hint, not a value',
    chip.title,
  ]
    .filter(Boolean)
    .join(' · ');
  return `${name} — ${how}`;
}

export const ChipView = ({
  chip,
  count,
  suggested,
}: {
  chip: Chip;
  /** A rollup's weight — how many songs it came through — shown after the name. */
  count?: number;
  /**
   * A suggestion would store it (a guess the owner can accept): marked with
   * the suggestions' sparkle, and said so in the tooltip.
   */
  suggested?: GhostChip;
}) => (
  <span
    data-style={chip.style}
    data-suggested={suggested ? true : undefined}
    title={
      suggested
        ? `${chipTitle(chip)}\nSuggested to store: ${suggested.title}`
        : chipTitle(chip)
    }
    style={{ maxWidth: CHIP_MAX_WIDTH }}
    className={cn(
      'inline-flex min-w-0 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[11px] leading-[18px]',
      CHIP_CLASS[chip.style],
      chip.muted && 'opacity-60',
    )}
  >
    <span className="truncate">{chip.label}</span>
    {chip.tag && (
      <span className="shrink-0 text-[10px] not-italic text-white/55">
        {chip.tag}
      </span>
    )}
    {count !== undefined && (
      <span className="shrink-0 text-[10px] tabular-nums text-white/55">
        {count}
      </span>
    )}
    {suggested && (
      <Sparkles aria-hidden className="size-2.5 shrink-0 text-sky-300" />
    )}
    {chip.style !== 'solid' && (
      <span className="sr-only">, {STYLE_WORD[chip.style]}</span>
    )}
    {suggested && <span className="sr-only">, suggested</span>}
  </span>
);

/**
 * A suggested value no one has accepted yet: the faint dashed ghost, named
 * as the suggestion names it, with who suggests it and how sure in the
 * tooltip. Not a value of the row, so the coverage never counts it.
 */
export const GhostChipView = ({ ghost }: { ghost: GhostChip }) => (
  <span
    data-style="ghost"
    title={ghost.title}
    style={{ maxWidth: CHIP_MAX_WIDTH }}
    className={cn(
      'inline-flex min-w-0 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[11px] leading-[18px]',
      CHIP_CLASS.ghost,
    )}
  >
    <Sparkles aria-hidden className="size-2.5 shrink-0 text-sky-300/70" />
    <span className="truncate">{ghost.label}</span>
    <span className="sr-only">, {STYLE_WORD.ghost}</span>
  </span>
);
