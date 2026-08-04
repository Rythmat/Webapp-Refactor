/**
 * TextFormatMenu — the slide editor's "Text" toolbar pill. It formats the
 * currently selected text block (title / prompt / body): font size via an
 * A− / A+ scale stepper, bold, and paragraph alignment (left / center / right).
 * Each change writes a per-block `SlideBlockStyle` up through the deck autosave
 * (the parent merges it into `slide.textStyle`). With no text block selected the
 * popover shows a hint instead of the controls.
 */
import {
  ALargeSmall,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  type LucideIcon,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/components/utilities';
import type { SlideBlockKey, SlideBlockStyle } from '../../slides/types';

const FONT_SCALE_MIN = 0.5;
const FONT_SCALE_MAX = 2;
const FONT_SCALE_STEP = 0.1;

/** Clamp + round to one decimal so repeated ±0.1 steps stay clean. */
const clampScale = (n: number): number =>
  Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(n * 10) / 10));

const ALIGN_OPTIONS: {
  value: NonNullable<SlideBlockStyle['align']>;
  label: string;
  Icon: LucideIcon;
}[] = [
  { value: 'left', label: 'Align left', Icon: AlignLeft },
  { value: 'center', label: 'Align center', Icon: AlignCenter },
  { value: 'right', label: 'Align right', Icon: AlignRight },
];

interface TextFormatMenuProps {
  /** The selected text block, or null when no text block is selected. */
  blockKey: SlideBlockKey | null;
  style?: SlideBlockStyle;
  onChange: (next: SlideBlockStyle) => void;
}

export const TextFormatMenu = ({
  blockKey,
  style,
  onChange,
}: TextFormatMenuProps) => {
  const scale = style?.fontScale ?? 1;
  const align = style?.align ?? 'left';

  const setScale = (next: number) =>
    onChange({ ...style, fontScale: clampScale(next) });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Text format"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          <ALargeSmall className="h-4 w-4" />
          Text
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 rounded-2xl border-white/10 bg-neutral-950 p-4 text-white shadow-2xl"
      >
        {blockKey === null ? (
          <p className="text-sm text-white/50">
            Select a text block on the slide to format it.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-white/40">
                Font size
              </p>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Decrease font size"
                  onClick={() => setScale(scale - FONT_SCALE_STEP)}
                  disabled={scale <= FONT_SCALE_MIN}
                  className="grid h-8 w-9 place-items-center rounded-lg border border-white/10 text-sm text-white/80 hover:border-white/25 hover:text-white disabled:opacity-30"
                >
                  A−
                </button>
                <span className="min-w-[3.5ch] text-center text-sm tabular-nums text-white/70">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  aria-label="Increase font size"
                  onClick={() => setScale(scale + FONT_SCALE_STEP)}
                  disabled={scale >= FONT_SCALE_MAX}
                  className="grid h-8 w-9 place-items-center rounded-lg border border-white/10 text-base text-white/80 hover:border-white/25 hover:text-white disabled:opacity-30"
                >
                  A+
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                aria-label="Bold"
                aria-pressed={Boolean(style?.bold)}
                onClick={() => onChange({ ...style, bold: !style?.bold })}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-lg border transition-colors',
                  style?.bold
                    ? 'border-white bg-white text-black'
                    : 'border-white/10 text-white/80 hover:border-white/25 hover:text-white',
                )}
              >
                <Bold className="h-4 w-4" />
              </button>

              <div
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-0.5"
                role="group"
                aria-label="Paragraph alignment"
              >
                {ALIGN_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={label}
                    aria-pressed={align === value}
                    onClick={() => onChange({ ...style, align: value })}
                    className={cn(
                      'grid h-7 w-7 place-items-center rounded-full transition-colors',
                      align === value
                        ? 'bg-white text-black'
                        : 'text-white/60 hover:text-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
