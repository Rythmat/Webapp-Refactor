import { ChevronDown, Grid3x3 } from 'lucide-react';
import { memo, useState, type SyntheticEvent } from 'react';
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
import { withTransaction } from '@/daw/store/history';
import { buttonVariants } from '@/daw/ui/Button';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { TIP_GAP_PX, Tooltip } from '@/daw/ui/Tooltip';
import { chordNotationLockTitle } from '@/daw/utils/chordRegionNotation';
import { useChordNotation } from '@/lib/chordNotation';

// ── The Grid menu (milestones 2.7 and 2.13) ────────────────────────────────
//
// What clips, the loop, markers and the playhead snap to: a bar, a half, a
// beat, an eighth or a sixteenth (those that fit the metre), in triplets or
// not, and Snap on or off (timeline-14). The button names the grid; a
// struck-out grid means snap is off. Turning snap on or off never moves the
// playhead (shell-18). Since Create's toolbar folded away (2.13, decision
// 16) it sits at the ruler's right end, and it also holds the timeline's
// two display choices: how the chord lane labels chords, and what colours
// the clips. Every setting carries a one-line explanation (2.11).

/**
 * Each setting's one line, for students (2.11): what it does, in plain
 * words. Exported for the settings guard test.
 */
export const GRID_COPY = {
  grid: 'Where clips and notes land when you move them',
  triplets: 'Fit three notes where two would usually go',
  snap: 'Clips, notes and the loop jump to grid lines',
  chordLabels: 'How the chord lane names each chord',
  clipColours: 'Track colors, or colors that follow the chords',
} as const;

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
  // The tip opens to the left past Snap, over the ruler: the trigger's
  // distance from the ruler end's start, measured as the pointer or the
  // focus comes in, before the tip opens.
  const [tipOffset, setTipOffset] = useState(TIP_GAP_PX);
  const measureTip = (e: SyntheticEvent<HTMLElement>) => {
    const group = e.currentTarget.closest('[data-testid="ruler-end"]');
    if (!group) return;
    const past =
      e.currentTarget.getBoundingClientRect().left -
      group.getBoundingClientRect().left;
    setTipOffset(TIP_GAP_PX + Math.max(0, past));
  };

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
      <Tooltip
        content="Grid, snap and display"
        side="left"
        sideOffset={tipOffset}
      >
        <MenuTrigger
          data-testid="grid-menu"
          onPointerEnter={measureTip}
          onFocus={measureTip}
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
      <MenuContent
        align="end"
        data-ds="v2"
        data-testid="grid-menu-content"
        className="w-80"
      >
        <MenuRadioGroup
          label="Grid"
          description={GRID_COPY.grid}
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
          description={GRID_COPY.triplets}
        >
          Triplets
        </MenuCheckboxItem>
        <MenuCheckboxItem
          data-testid="grid-snap"
          checked={snap}
          onCheckedChange={() => useStore.getState().toggleTimelineSnap()}
          description={GRID_COPY.snap}
        >
          Snap to grid
        </MenuCheckboxItem>
        <MenuSeparator />
        <ChordLabels />
        <MenuSeparator />
        <ClipColours />
      </MenuContent>
    </Menu>
  );
});

/**
 * How the chord lane labels chords: degree numbers or note names. Jazz and
 * Roman notation decide it themselves; the choice applies to hybrid only, so
 * under them neither is checked (the lane draws neither the way the hybrid
 * choice would).
 */
function ChordLabels() {
  const showNotes = useStore((s) => s.chordRulerShowNotes);
  const notation = useChordNotation();
  const locked = notation !== 'hybrid';
  return (
    <MenuRadioGroup
      label="Chord lane"
      description={
        locked ? chordNotationLockTitle(notation) : GRID_COPY.chordLabels
      }
      data-testid="chord-ruler-labels"
      aria-label="Chord lane labels"
      value={locked ? '' : showNotes ? 'notes' : 'numbers'}
      onValueChange={(value) => {
        if ((value === 'notes') !== useStore.getState().chordRulerShowNotes) {
          useStore.getState().toggleChordRulerLabels();
        }
      }}
    >
      <MenuRadioItem value="numbers" disabled={locked}>
        Degree numbers
      </MenuRadioItem>
      <MenuRadioItem value="notes" disabled={locked}>
        Note names
      </MenuRadioItem>
    </MenuRadioGroup>
  );
}

/** What colours the clips: their track's colour, or the chords' (one undo step). */
function ClipColours() {
  const mode = useStore((s) => s.clipColorMode);
  return (
    <MenuRadioGroup
      label="Color clips by"
      description={GRID_COPY.clipColours}
      data-testid="clip-colour-mode"
      value={mode}
      onValueChange={(value) =>
        withTransaction('Color clips', () =>
          useStore.getState().setClipColorMode(value as 'track' | 'prism'),
        )
      }
    >
      <MenuRadioItem value="track">Track</MenuRadioItem>
      <MenuRadioItem value="prism">Harmony</MenuRadioItem>
    </MenuRadioGroup>
  );
}
