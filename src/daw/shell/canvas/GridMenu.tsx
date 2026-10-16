import { ChevronDown, Grid3x3 } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/components/utilities';
import {
  baseOf,
  fitsMetre,
  gridChoice,
  gridChoices,
  gridLabel,
  isTriplet,
  tripletOf,
  type GridBase,
} from '@/daw/editor/snap';
import { useStore } from '@/daw/store';
import { buttonVariants } from '@/daw/ui/Button';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { Tooltip } from '@/daw/ui/Tooltip';

// ── The Grid menu (milestone 2.7) ──────────────────────────────────────────
//
// What clips, the loop, markers and the playhead snap to: a bar, a half, a
// beat, an eighth or a sixteenth (those that fit the metre), in triplets or
// not, and Snap on or off (timeline-14). The button names the grid; a
// struck-out grid means snap is off. Turning snap on or off never moves the
// playhead (shell-18).

export const GridMenu = memo(function GridMenu() {
  const size = useStore((s) => s.timelineGridSize);
  const snap = useStore((s) => s.timelineSnapEnabled);
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const metre = { numerator, denominator };
  const base = baseOf(size) as GridBase;
  const triplets = isTriplet(size);
  const triplet = tripletOf(base);
  const label = gridLabel(size, metre);

  const set = (nextBase: GridBase, nextTriplets: boolean) => {
    const next = gridChoice(nextBase, nextTriplets);
    const s = useStore.getState();
    s.setTimelineGridSize(next.timelineGridSize);
    if (s.timelineTripletMode !== next.timelineTripletMode) {
      s.toggleTripletMode();
    }
  };

  return (
    <Menu>
      <Tooltip content="Grid and snap" side="bottom">
        <MenuTrigger
          data-testid="grid-menu"
          aria-label={`Grid: ${label}${snap ? '' : ', snap off'}`}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'gap-1 px-2',
          )}
        >
          <Grid3x3 aria-hidden />
          <span className={cn('tabular-nums', !snap && 'line-through')}>
            {label}
          </span>
          <ChevronDown aria-hidden className="!size-3" />
        </MenuTrigger>
      </Tooltip>
      <MenuContent align="start" data-ds="v2" className="w-52">
        <MenuLabel>Grid</MenuLabel>
        <MenuRadioGroup
          value={base}
          onValueChange={(value) =>
            set(value as GridBase, triplets && value !== '1/1')
          }
        >
          {gridChoices(metre, size).map((choice) => (
            <MenuRadioItem key={choice} value={choice}>
              {gridLabel(choice, metre)}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuCheckboxItem
          checked={triplets}
          disabled={!triplet || !fitsMetre(triplet, metre)}
          onCheckedChange={(on) => set(base, on)}
        >
          Triplets
        </MenuCheckboxItem>
        <MenuCheckboxItem
          data-testid="grid-snap"
          checked={snap}
          onCheckedChange={() => useStore.getState().toggleTimelineSnap()}
        >
          Snap to grid
        </MenuCheckboxItem>
      </MenuContent>
    </Menu>
  );
});
