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
import { MicroLabel } from '@/components/kit';
import { Button } from '@/daw/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/daw/ui/Popover';
import { Segmented } from '@/daw/ui/Segmented';
import { Toggle } from '@/daw/ui/Toggle';
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
        <Button variant="pill" size="pill" aria-label="Text format">
          <ALargeSmall aria-hidden />
          Text
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        {blockKey === null ? (
          <p className="text-[0.8125rem] text-daw-text-3">
            Select a text block on the slide to format it.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <MicroLabel>Font size</MicroLabel>
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  aria-label="Decrease font size"
                  onClick={() => setScale(scale - FONT_SCALE_STEP)}
                  disabled={scale <= FONT_SCALE_MIN}
                >
                  A−
                </Button>
                <span className="min-w-[3.5ch] text-center text-[0.8125rem] tabular-nums text-daw-text-2">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="secondary"
                  aria-label="Increase font size"
                  onClick={() => setScale(scale + FONT_SCALE_STEP)}
                  disabled={scale >= FONT_SCALE_MAX}
                >
                  A+
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-daw-edge pt-3">
              <Toggle
                label="Bold"
                icon={<Bold aria-hidden />}
                pressed={Boolean(style?.bold)}
                onPressedChange={(bold) => onChange({ ...style, bold })}
              />
              <Segmented
                label="Paragraph alignment"
                iconOnly
                value={align}
                onValueChange={(value) => onChange({ ...style, align: value })}
                options={ALIGN_OPTIONS.map(({ value, label, Icon }) => ({
                  value,
                  label,
                  icon: <Icon aria-hidden />,
                }))}
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
