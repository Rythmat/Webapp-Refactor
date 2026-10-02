// ── Count-off ──────────────────────────────────────────────────────────────
// On the staff there is no playhead sweeping toward the first note the way the
// piano roll has one, so a student cannot see the music coming. This counts the
// lead-in bars underneath the staff, one large number at a time, in step with
// whatever is sounding.
//
// One bar counts "1 2 3 4". Two bars count "1 2 3 4 · 2 2 3 4": each bar opens
// with its own number so the downbeat is unmistakable, and those downbeats are
// drawn brighter and larger than the beats between them.
//
// Guitar TAB asks for a quieter count, set in the empty count-in bar so it
// never covers a note: `placement="countInBar"` with that bar's box, and
// `tone="neutral"` (64px regular, beat 1 in the text colour, the others
// dimmer, a fade and no pop). Piano's staff and Studio keep the defaults.

import { FixedDigits } from '@/components/common/FixedDigits';
import './countOff.css';

export interface CountOffBeat {
  /** The number to show. */
  label: string;
  /** First beat of a bar — drawn brighter. */
  isDownbeat: boolean;
  /** 0-based bar within the count-off. */
  bar: number;
  /** 0-based beat within that bar. */
  beat: number;
}

/**
 * What a beat of the count-off shows. The first beat of each bar announces the
 * bar it opens ("1", then "2"), every other beat counts within the bar.
 */
export function countOffBeat(
  beatIndex: number,
  beatsPerBar: number,
): CountOffBeat {
  const perBar = Math.max(1, Math.floor(beatsPerBar));
  const index = Math.max(0, Math.floor(beatIndex));
  const bar = Math.floor(index / perBar);
  const beat = index % perBar;
  return {
    label: String(beat === 0 ? bar + 1 : beat + 1),
    isDownbeat: beat === 0,
    bar,
    beat,
  };
}

/**
 * Which beat of the count-off a tick-driven playhead is on, or null once the
 * music has started.
 *
 * `musicStartTick` is where the student's bar 1 sits on the playhead's own
 * scale — usually zero, but a roll that shifts its notes to make room for a
 * count-in bar puts it later, and the count then has to run up to there rather
 * than up to zero.
 */
export function countOffBeatIndex(
  playheadTick: number,
  countInTicks: number,
  beatTicks: number,
  musicStartTick = 0,
): number | null {
  if (countInTicks <= 0 || beatTicks <= 0) return null;
  if (playheadTick >= musicStartTick) return null;
  const elapsed = playheadTick - (musicStartTick - countInTicks);
  if (elapsed < 0) return 0;
  const total = Math.round(countInTicks / beatTicks);
  return Math.min(Math.floor(elapsed / beatTicks), Math.max(0, total - 1));
}

/**
 * The same, for a count-off driven by a clock rather than a playhead — the
 * Studio transport stays parked while its count-in runs.
 */
export function countOffBeatAtTime(
  elapsedSeconds: number,
  beatSeconds: number,
  totalBeats: number,
): number | null {
  if (totalBeats <= 0 || beatSeconds <= 0) return null;
  if (elapsedSeconds < 0) return 0;
  const beat = Math.floor(elapsedSeconds / beatSeconds);
  return beat >= totalBeats ? null : beat;
}

/** A box in the parent's px: where the count-in bar is drawn. */
export interface CountOffBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CountOffProps {
  /** 0-based beat of the count-off, or null when nothing is being counted. */
  beatIndex: number | null;
  beatsPerBar: number;
  /**
   * 'under' (default): along the bottom of the parent, under the staff.
   * 'countInBar': centred in `bar`, the empty count-in bar, so it never
   * covers a note; centred in the parent while there is no box.
   */
  placement?: 'under' | 'countInBar';
  /** The count-in bar's box, for `placement="countInBar"`. */
  bar?: CountOffBox | null;
  /**
   * 'accent' (default): the downbeat larger and lit, each number popping in.
   * 'neutral': every number 64px regular, beat 1 in the text colour and the
   * others dimmer, fading in only.
   */
  tone?: 'accent' | 'neutral';
}

/**
 * The number itself. Absolutely placed, so it never reflows the staff above it
 * as it appears and goes; the parent supplies the positioning context.
 */
export function CountOff({
  beatIndex,
  beatsPerBar,
  placement = 'under',
  bar,
  tone = 'accent',
}: CountOffProps) {
  if (beatIndex === null) return null;
  const { label, isDownbeat } = countOffBeat(beatIndex, beatsPerBar);
  const inBar = placement === 'countInBar';
  const neutral = tone === 'neutral';
  return (
    <div
      className={inBar ? 'notation-countoff is-in-bar' : 'notation-countoff'}
      aria-hidden
      style={
        inBar && bar
          ? {
              left: bar.x,
              top: bar.y,
              width: bar.width,
              height: bar.height,
              right: 'auto',
              bottom: 'auto',
            }
          : undefined
      }
    >
      {/* Keyed by beat so each number restarts the animation. */}
      <span
        key={beatIndex}
        className={[
          'notation-countoff-number',
          neutral && 'is-neutral',
          isDownbeat && 'is-downbeat',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Glacial's digits are proportional: a cell keeps each one centred. */}
        {neutral ? <FixedDigits text={label} /> : label}
      </span>
    </div>
  );
}
