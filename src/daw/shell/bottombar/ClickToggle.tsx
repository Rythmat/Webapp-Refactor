import { memo, useEffect, useRef } from 'react';
import { create } from 'zustand';
import {
  CLICK_SOUNDS,
  DEFAULT_CLICK_DB,
  MAX_CLICK_DB,
  MIN_CLICK_DB,
  type ClickSound,
} from '@/daw/audio/clickSounds';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { addFrameTask } from '@/daw/engine/engineClock';
import { getPlayheadTick, subscribePlayhead } from '@/daw/engine/playheadClock';
import { useStore } from '@/daw/store';
import { ticksPerBeat } from '@/daw/time/timeModel';
import { Fader } from '@/daw/ui/Fader';
import { formatDb } from '@/daw/ui/format';
import { Popover, PopoverAnchor, PopoverContent } from '@/daw/ui/Popover';
import { Segmented } from '@/daw/ui/Segmented';
import { SettingRow } from '@/daw/ui/SettingRow';
import { Toggle } from '@/daw/ui/Toggle';

// ── Click and its menu (milestones 2.5, 2.8, 2.11) ──────────────────────────
//
// The metronome as one toggle (the floating frame's transport, 2026-10-21);
// its settings open on a right-click or from '⋯': the click's sound, its
// volume and the count-in (off, one bar, two). The
// sound and the volume are the student's (per-user prefs); a new choice
// plays one click. The icon's two dots take turns on each beat while a
// click is sounding; the playhead clock moves them by writing the dots'
// opacity, so a beat re-renders nothing. Each setting says what it does in
// a line under its name (2.11).

const METRONOME_KEYS = shortcutKeys('transport.metronome');

export const COUNT_IN_CHOICES = [
  { value: '0', label: 'Off' },
  { value: '1', label: '1 bar' },
  { value: '2', label: '2 bars' },
] as const;

/** One click in `sound`, to hear the choice (loaded on demand). */
function hear(sound: ClickSound, db: number) {
  void import('@/daw/audio/clickPreview').then((m) =>
    m.previewClick(sound, db),
  );
}

/** Each setting's one line, for students (2.11). */
export const CLICK_COPY = {
  sound: 'What the click sounds like',
  volume: 'How loud the click is next to your music',
  countIn: 'Bars of clicks before playing or recording starts',
} as const;

/** The menu's three settings, each with its line (SettingRow). */
function ClickSettings() {
  const sound = useStore((s) => s.metronomeSound);
  const volume = useStore((s) => s.metronomeVolume);
  const countInBars = useStore((s) => s.countInBars);
  const setSound = useStore((s) => s.setMetronomeSound);
  const setVolume = useStore((s) => s.setMetronomeVolume);
  const setCountInBars = useStore((s) => s.setCountInBars);
  return (
    <div className="flex w-64 flex-col gap-3" data-testid="click-menu">
      <SettingRow layout="stacked" label="Sound" description={CLICK_COPY.sound}>
        <Segmented
          label="Click sound"
          options={CLICK_SOUNDS.map((c) => ({ value: c.id, label: c.label }))}
          value={sound}
          onValueChange={(next) => {
            setSound(next);
            hear(next, volume);
          }}
        />
      </SettingRow>
      <SettingRow
        layout="stacked"
        label="Volume"
        description={CLICK_COPY.volume}
      >
        <Fader
          label="Click volume"
          orientation="horizontal"
          length={160}
          min={MIN_CLICK_DB}
          max={MAX_CLICK_DB}
          step={0.5}
          resetValue={DEFAULT_CLICK_DB}
          value={volume}
          format={(db) => formatDb(db)}
          onChange={setVolume}
          onCommit={(db) => hear(sound, db)}
          hideLabel
        />
      </SettingRow>
      <SettingRow
        layout="stacked"
        label="Count-in"
        description={CLICK_COPY.countIn}
      >
        <Segmented
          label="Count-in"
          options={COUNT_IN_CHOICES}
          value={
            String(countInBars) as (typeof COUNT_IN_CHOICES)[number]['value']
          }
          onValueChange={(next) => setCountInBars(Number(next))}
        />
      </SettingRow>
    </div>
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
/** Where the four beat bars sit, after the metronome's tall bar. */
const BEAT_BARS = [4.5, 7.5, 10.5, 13.5];

function MetronomeIcon({ on }: { on: boolean }) {
  const bars = useRef<Array<SVGRectElement | null>>([]);
  const isPlaying = useStore((s) => s.isPlaying);
  const countingIn = useStore((s) => s.isCountingIn);
  const sounding = countingIn || (isPlaying && on);

  useEffect(() => {
    // At rest every bar is lit; while a click sounds, the beat's bar is.
    const fill = (beat: number | null) => {
      bars.current.forEach((bar, i) => {
        const lit = beat === null || beat % BEAT_BARS.length === i;
        bar?.setAttribute('fill-opacity', lit ? '1' : '0.35');
      });
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
    // lights the first beat bar.
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

  // The floating frame's metronome (2026-10-21): a tall bar, then a bar
  // per beat, as solid glyphs; the beat's bar lights as the click sounds.
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <rect x="1.25" y="2" width="1.75" height="12" rx="0.875" />
      {BEAT_BARS.map((x, i) => (
        <rect
          key={x}
          ref={(el) => {
            bars.current[i] = el;
          }}
          x={x}
          y="4"
          width="1.75"
          height="8"
          rx="0.875"
          className="transition-[fill-opacity] duration-daw-fast"
        />
      ))}
    </svg>
  );
}

/**
 * Whether the metronome's settings are open. A store, so the top bar's '⋯'
 * menu can open them too (the metronome itself is one button now).
 */
export const useClickSettings = create<{
  open: boolean;
  setOpen(open: boolean): void;
}>((set) => ({ open: false, setOpen: (open) => set({ open }) }));

/**
 * The metronome, as the floating frame's transport has it (owner,
 * 2026-10-21): one button. Its settings (sound, volume, count-in) open on a
 * right-click or from the '⋯' menu, anchored under it.
 */
export const ClickToggle = memo(function ClickToggle() {
  const on = useStore((s) => s.metronomeEnabled);
  const toggle = useStore((s) => s.toggleMetronome);
  const countInBars = useStore((s) => s.countInBars);
  const open = useClickSettings((s) => s.open);
  const setOpen = useClickSettings((s) => s.setOpen);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span
          className="inline-flex shrink-0"
          data-testid="count-in-menu"
          data-count-in={countInBars}
          onContextMenu={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          <Toggle
            label="Metronome"
            tooltipSide="bottom"
            icon={<MetronomeIcon on={on} />}
            pressed={on}
            onPressedChange={() => toggle()}
            shortcut={METRONOME_KEYS.label}
            aria-keyshortcuts={METRONOME_KEYS.aria}
            data-testid="click-toggle"
            className="h-8 rounded-[var(--daw-radius-md)]"
          />
        </span>
      </PopoverAnchor>
      <PopoverContent side="bottom" align="start" sideOffset={8}>
        <ClickSettings />
      </PopoverContent>
    </Popover>
  );
});
