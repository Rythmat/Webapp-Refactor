import { Lock } from 'lucide-react';
import { memo, useState } from 'react';
import { cn } from '@/components/utilities';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import { Popover, PopoverContent, PopoverTrigger } from '@/daw/ui/Popover';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';
import { keyText, useKeyPopover } from '../song/keyPopover';
import { KeyCircle, MetreChoices, TempoField } from '../song/SongParts';

// ── The song, in the top bar's right-hand pill (B4a; S0) ────────────────────
//
// Key, Tempo and Metre as three controls, as Soundtrap lays them out (owner,
// 2026-10-16); they replaced the top bar's Song chip. Key and Metre open
// popovers; the tempo is a field. With no key set the Key button has a
// neutral dashed outline; the key colour's dot is meaning, so it stays in
// colour.

const RAIL_BUTTON = cn(
  'inline-flex h-8 items-center gap-1.5 rounded-[var(--daw-radius-md)] px-2.5 text-daw-pill-text hover:bg-daw-chip hover:text-daw-text [&_svg]:size-3.5',
  TYPE_CLASS.body,
  TRANSITION,
  FOCUS_RING,
);

export const SongControls = memo(function SongControls({
  short = false,
}: {
  /** A narrow window's short key ('C', not 'C major'). */
  short?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <KeyButton short={short} />
      <TempoField />
      <MetreButton />
    </div>
  );
});

function KeyButton({ short }: { short: boolean }) {
  const full = useStore((s) => keyText(s));
  const brief = useStore((s) => keyText(s, true));
  const keyColour = useStore((s) =>
    s.rootNote !== null ? s.rootTrackColor : null,
  );
  const hasKey = useStore((s) => s.rootNote !== null);
  const locked = useStore((s) => s.rootLocked && s.rootNote !== null);
  const [open, onOpenChange] = useKeyPopover();
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip content="Key" side="bottom">
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="key-button"
            aria-label={`Key: ${full}${locked ? ', locked' : ''}`}
            data-hint={hintText(
              `Key: ${full}`,
              'Choose the scale the song is in',
            )}
            className={cn(
              RAIL_BUTTON,
              'border',
              hasKey
                ? 'border-transparent'
                : 'border-dashed border-daw-outline',
            )}
          >
            {keyColour ? (
              <span
                aria-hidden
                data-meaning="key-colour"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: keyColour }}
              />
            ) : null}
            {short ? brief : full}
            {locked ? <Lock aria-hidden className="text-daw-text-3" /> : null}
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        data-testid="key-popover"
        data-ds="v2"
        className="w-[260px]"
      >
        <KeyCircle onDone={() => onOpenChange(false)} />
      </PopoverContent>
    </Popover>
  );
}

function MetreButton() {
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content="Time signature" side="bottom">
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="metre-button"
            aria-label={`Time signature: ${numerator}/${denominator}`}
            data-hint={hintText(
              `Time signature: ${numerator}/${denominator}`,
              'Choose how many beats make a bar',
            )}
            className={RAIL_BUTTON}
          >
            {numerator}/{denominator}
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        data-testid="metre-popover"
        data-ds="v2"
        className="w-[184px] p-0"
      >
        <MetreChoices onPicked={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
