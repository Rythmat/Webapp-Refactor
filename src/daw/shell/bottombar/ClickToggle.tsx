import { ChevronDown } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { addFrameTask } from '@/daw/engine/engineClock';
import { getPlayheadTick, subscribePlayhead } from '@/daw/engine/playheadClock';
import { useStore } from '@/daw/store';
import { ticksPerBeat } from '@/daw/time/timeModel';
import { IconButton } from '@/daw/ui/IconButton';
import {
  Menu,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { Toggle } from '@/daw/ui/Toggle';

// ── Click and count-in (milestone 2.5) ─────────────────────────────────────
//
// The metronome as a toggle, with a caret for the count-in (off, one bar,
// two). When the top bar folds, the caret's choices move into its '⋯' menu
// (CountInItems). The icon's two dots take turns on each beat while a click
// is sounding; the playhead clock moves them by writing the dots' opacity,
// so a beat re-renders nothing.

const METRONOME_KEYS = shortcutKeys('transport.metronome');

export const COUNT_IN_CHOICES = [
  { value: '0', label: 'No count-in' },
  { value: '1', label: 'Count in 1 bar' },
  { value: '2', label: 'Count in 2 bars' },
] as const;

/** The count-in's radio items, for the caret's menu or the '⋯' menu. */
export function CountInItems() {
  const countInBars = useStore((s) => s.countInBars);
  const setCountInBars = useStore((s) => s.setCountInBars);
  return (
    <>
      <MenuLabel>Count-in</MenuLabel>
      <MenuRadioGroup
        value={String(countInBars)}
        onValueChange={(value) => setCountInBars(Number(value))}
      >
        {COUNT_IN_CHOICES.map((choice) => (
          <MenuRadioItem key={choice.value} value={choice.value}>
            {choice.label}
          </MenuRadioItem>
        ))}
      </MenuRadioGroup>
    </>
  );
}

const beatTicksFor = (den: number) =>
  // Beat length matches the metronome/count-in scheduling: the note value
  // the denominator names, a sixteenth in x/16 too.
  ticksPerBeat({ numerator: 1, denominator: den });

/**
 * The metronome's two dots. Sounding (playing with the click on, or a
 * count-in): one filled at a time, left first, swapping each beat. Idle and
 * on: both filled. Off: both outlined.
 */
function MetronomeIcon({ on }: { on: boolean }) {
  const left = useRef<SVGCircleElement>(null);
  const right = useRef<SVGCircleElement>(null);
  const isPlaying = useStore((s) => s.isPlaying);
  const countingIn = useStore((s) => s.isCountingIn);
  const sounding = countingIn || (isPlaying && on);

  useEffect(() => {
    const fill = (beat: number | null) => {
      const l = beat === null ? on : beat % 2 === 0;
      const r = beat === null ? on : beat % 2 !== 0;
      left.current?.setAttribute('fill-opacity', l ? '1' : '0');
      right.current?.setAttribute('fill-opacity', r ? '1' : '0');
    };
    if (!sounding) {
      fill(null);
      return;
    }
    if (countingIn) {
      // The transport waits during a count-in: count from the time.
      const started = performance.now();
      let last = -1;
      return addFrameTask(
        () => {
          const s = useStore.getState();
          const beatMs = (60 / s.bpm) * (4 / s.timeSignatureDenominator) * 1000;
          const beat = Math.floor((performance.now() - started) / beatMs);
          if (beat !== last) fill((last = beat));
        },
        { name: 'metronome-count-in' },
      );
    }
    // Playing: from the heard playhead, so the first beat after the start
    // fills the left dot.
    const beatOf = (tick: number) =>
      Math.floor(
        tick / beatTicksFor(useStore.getState().timeSignatureDenominator),
      );
    const start = beatOf(getPlayheadTick());
    let last = -1;
    fill(0);
    return subscribePlayhead((tick) => {
      const beat = beatOf(tick) - start;
      if (beat !== last) fill((last = beat));
    });
  }, [sounding, countingIn, on]);

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      {[4, 10].map((cx, i) => (
        <circle
          key={cx}
          ref={i === 0 ? left : right}
          cx={cx}
          cy="7"
          r="2.5"
          fill="currentColor"
          fillOpacity={on ? 1 : 0}
          stroke="currentColor"
          strokeWidth="1.5"
          className="transition-[fill-opacity] duration-daw-fast"
        />
      ))}
    </svg>
  );
}

export const ClickToggle = memo(function ClickToggle({
  countInFolded,
}: {
  /** The caret's choices are in the top bar's '⋯' menu instead. */
  countInFolded: boolean;
}) {
  const on = useStore((s) => s.metronomeEnabled);
  const toggle = useStore((s) => s.toggleMetronome);
  const countInBars = useStore((s) => s.countInBars);
  const countInLabel =
    countInBars === 0
      ? 'Count-in: off'
      : `Count-in: ${countInBars} bar${countInBars > 1 ? 's' : ''}`;
  return (
    <div className="flex shrink-0 items-center">
      <Toggle
        label="Click"
        icon={<MetronomeIcon on={on} />}
        pressed={on}
        onPressedChange={() => toggle()}
        shortcut={METRONOME_KEYS.label}
        aria-keyshortcuts={METRONOME_KEYS.aria}
        data-testid="click-toggle"
        className={countInFolded ? undefined : 'rounded-r-none'}
      />
      {countInFolded ? null : (
        <Menu>
          <MenuTrigger asChild>
            <IconButton
              label={countInLabel}
              icon={<ChevronDown />}
              size="md"
              tooltipSide="top"
              data-testid="count-in-menu"
              data-count-in={countInBars}
              className="w-6 rounded-l-none [&_svg]:size-3.5"
            />
          </MenuTrigger>
          <MenuContent align="start" sideOffset={6}>
            <CountInItems />
          </MenuContent>
        </Menu>
      )}
    </div>
  );
});
