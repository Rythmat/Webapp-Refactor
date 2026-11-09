import { Magnet, Palette } from 'lucide-react';
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
import { withTransaction } from '@/daw/store/history';
import {
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '@/daw/ui/Menu';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { chordNotationLockTitle } from '@/daw/utils/chordRegionNotation';
import { useChordNotation } from '@/lib/chordNotation';

// ── Snap to grid and timeline display, in the top bar's More menu ─────────
//
// What clips, the loop, markers and the playhead snap to: a bar, a half, a
// beat, an eighth or a sixteenth (those that fit the metre), in triplets or
// not, and Snap on or off (timeline-14). Turning snap on or off never moves
// the playhead (shell-18). They sat at the ruler's right end (2.13) until the
// owner moved them into More (2026-10-21), with the timeline's two display
// choices beside them: how the chord lane labels chords, and what colours
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
  harmonyColor: 'Tracks and clips in the key’s colour; off, their own',
} as const;

/**
 * More ▸ Snap to grid: the grid (those that fit the metre), triplets and snap
 * on or off. Its row names the grid, and says when snap is off.
 */
export const SnapToGridSub = memo(function SnapToGridSub() {
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
    <MenuSub>
      <MenuSubTrigger
        icon={<Magnet />}
        data-testid="grid-menu"
        aria-label={`Snap to grid: ${label}${snap ? '' : ', snap off'}`}
      >
        <span className="flex-1">Snap to grid</span>
        <span
          className={cn(
            TYPE_CLASS.label,
            'ml-4 text-daw-text-3',
            !snap && 'line-through',
          )}
        >
          {label}
        </span>
      </MenuSubTrigger>
      <MenuSubContent
        data-ds="v2"
        data-testid="grid-menu-content"
        className="w-80"
      >
        <MenuCheckboxItem
          data-testid="grid-snap"
          checked={snap}
          onCheckedChange={() => useStore.getState().toggleTimelineSnap()}
          description={GRID_COPY.snap}
        >
          Snap to grid
        </MenuCheckboxItem>
        <MenuSeparator />
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
      </MenuSubContent>
    </MenuSub>
  );
});

/**
 * More ▸ Timeline display: how the chord lane labels chords and what colours
 * the clips (the Grid menu's two display choices, which moved with it).
 */
export const TimelineDisplaySub = memo(function TimelineDisplaySub() {
  return (
    <MenuSub>
      <MenuSubTrigger icon={<Palette />} data-testid="timeline-display-menu">
        Timeline display
      </MenuSubTrigger>
      <MenuSubContent
        data-ds="v2"
        data-testid="timeline-display-content"
        className="w-80"
      >
        <ChordLabels />
        <MenuSeparator />
        <ClipColours />
      </MenuSubContent>
    </MenuSub>
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

/**
 * Harmony Color (owner, 2026-10-22; it was "Colour clips by: Track or
 * Harmony"): on, tracks and clips in the key centre's colour and notes in
 * their chords'; off, each track's own colour, even with a key set
 * (harmony/trackColor). One undo step.
 */
function ClipColours() {
  const on = useStore((s) => s.clipColorMode === 'prism');
  return (
    <MenuCheckboxItem
      checked={on}
      description={GRID_COPY.harmonyColor}
      data-testid="clip-colour-mode"
      onCheckedChange={(next) =>
        withTransaction('Harmony Color', () =>
          useStore.getState().setClipColorMode(next ? 'prism' : 'track'),
        )
      }
    >
      Harmony Color
    </MenuCheckboxItem>
  );
}
