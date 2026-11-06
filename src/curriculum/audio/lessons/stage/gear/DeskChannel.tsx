import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import type { MeterPoint } from '../../../mix/mixEngine';
import type { Mix } from '../../../mix/useMixEngine';
import { ChannelStrip } from '../ChannelStrip';
import { Knob } from './Knob';
import { LedLadder, type LedStep } from './LedLadder';

// ── One channel of a mixing desk ───────────────────────────────────────────
// Drawn the way a real one reads, top to bottom: phantom power and pad, the
// gain knob with its meter, EQ, pan, mute, and the fader at the bottom. Only the
// gain and the fader are live; the rest are there to be recognised. On a screen
// that asks which part is which, every part becomes a button.

export type DeskPart = 'gain' | 'meter' | 'eq' | 'pan' | 'mute' | 'fader';

const PART_NAMES: Readonly<Record<DeskPart, string>> = {
  gain: 'Gain knob',
  meter: 'Channel meter',
  eq: 'EQ',
  pan: 'Pan',
  mute: 'Mute',
  fader: 'Fader',
};

const INPUT_STEPS: readonly LedStep[] = [
  { db: -36, text: '−36' },
  { db: -24, text: '−24' },
  { db: -18, text: '−18' },
  { db: -12, text: '−12' },
  { db: -6, text: '−6' },
  { db: -3, text: '−3' },
];

function Part({
  part,
  identify,
  onPress,
  className,
  children,
}: {
  part: DeskPart;
  identify: boolean;
  onPress?: (term: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative" data-desk-part={part}>
      <div className={cn(className, identify && 'pointer-events-none')}>
        {children}
      </div>
      {identify && (
        <button
          type="button"
          aria-label={PART_NAMES[part]}
          onClick={() => onPress?.(part)}
          className="absolute -inset-1 rounded-xl border border-transparent outline-none transition-colors hover:border-white/30 hover:bg-white/[0.04] focus-visible:border-white/80"
        />
      )}
    </div>
  );
}

/** A switch drawn for recognising, not for pressing. */
function Legend({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-white/20 px-1.5 py-0.5 text-[0.6875rem] font-bold leading-none text-white/55">
      {children}
    </span>
  );
}

export function DeskChannel({
  source,
  gain,
  gainMax,
  fader,
  inputPoint,
  outputPoint,
  gainTrackDb,
  target,
  mix,
  accent,
  live,
  identify,
  onPress,
  onGain,
  onFader,
}: {
  /** What's plugged in, as the desk's scribble strip would say. */
  source: string;
  gain: number;
  gainMax: number;
  fader: number;
  inputPoint: MeterPoint;
  outputPoint: MeterPoint;
  /** What's moving the channel meter's signal, so it settles on a change. */
  gainTrackDb: number;
  target?: readonly [number, number];
  mix: Mix;
  accent: string;
  /** Which controls can be moved on this screen. */
  live: readonly ('gain' | 'fader')[];
  /** Every part is a button, for a screen that asks which is which. */
  identify?: boolean;
  onPress?: (term: string) => void;
  onGain: (db: number) => void;
  onFader: (db: number) => void;
}) {
  const finding = !!identify;
  const gainLive = !finding && live.includes('gain');
  const faderLive = !finding && live.includes('fader');
  return (
    <div
      className="flex w-[13.5rem] shrink-0 flex-col items-stretch gap-3 rounded-[1.25rem] border border-white/15 bg-[#17171b] px-3 pb-3 pt-2.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
      data-desk-channel
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.75rem] font-bold text-white/55">CH 1</span>
        <span className="truncate rounded-md bg-white/[0.08] px-2 py-0.5 text-[0.8125rem] font-bold text-white">
          {source}
        </span>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        <Legend>48V</Legend>
        <Legend>PAD</Legend>
        <Legend>Ø</Legend>
      </div>

      <div className="flex items-stretch justify-between gap-1">
        <Part
          part="gain"
          identify={finding}
          onPress={onPress}
          className="flex flex-col items-center"
        >
          <span
            className="text-[0.75rem] font-bold tracking-wide"
            style={{ color: gainLive ? accent : 'rgb(255 255 255 / 0.7)' }}
          >
            GAIN
          </span>
          <div className="px-3 pt-2.5">
            <Knob
              label="Gain"
              size="md"
              value={gain}
              min={0}
              max={gainMax}
              step={1}
              valueText={`${gain} decibels of gain`}
              marks={[
                { value: 0, text: '0' },
                { value: gainMax / 2, text: String(Math.round(gainMax / 2)) },
                { value: gainMax, text: String(gainMax) },
              ]}
              accent={accent}
              disabled={!gainLive}
              onChange={onGain}
            />
          </div>
          <span className="pt-1 text-[0.875rem] font-bold tabular-nums text-white">
            +{gain}
            <span className="ml-0.5 text-[0.6875rem] font-normal text-white/55">
              dB
            </span>
          </span>
        </Part>
        <Part part="meter" identify={finding} onPress={onPress}>
          <div className="flex h-[8.5rem]">
            <LedLadder
              mix={mix}
              point={inputPoint}
              trackDb={gainTrackDb}
              steps={INPUT_STEPS}
              target={target}
              accent={accent}
              label="Channel meter, after the gain"
            />
          </div>
        </Part>
      </div>

      <div className="flex items-end justify-between gap-1 border-t border-white/10 pt-2.5">
        <Part
          part="eq"
          identify={finding}
          onPress={onPress}
          className="flex gap-1"
        >
          {['HI', 'MID', 'LO'].map((band) => (
            <div key={band} className="flex flex-col items-center gap-0.5">
              <Knob
                label={`EQ ${band}`}
                size="sm"
                value={0}
                min={-15}
                max={15}
                valueText="Flat"
                accent={accent}
                disabled
              />
              <span className="text-[0.6875rem] text-white/45">{band}</span>
            </div>
          ))}
        </Part>
        <Part
          part="pan"
          identify={finding}
          onPress={onPress}
          className="flex flex-col items-center gap-0.5"
        >
          <Knob
            label="Pan"
            size="sm"
            value={0}
            min={-1}
            max={1}
            valueText="Centre"
            accent={accent}
            disabled
          />
          <span className="text-[0.6875rem] text-white/45">PAN</span>
        </Part>
      </div>

      <Part
        part="mute"
        identify={finding}
        onPress={onPress}
        className="flex justify-center"
      >
        <span
          aria-hidden
          className="block rounded-md border border-white/25 px-4 py-1 text-[0.75rem] font-bold text-white/55"
        >
          MUTE
        </span>
      </Part>

      <Part
        part="fader"
        identify={finding}
        onPress={onPress}
        className="flex justify-center border-t border-white/10 pt-1"
      >
        <ChannelStrip
          label={source}
          db={fader}
          disabled={!faderLive}
          point={outputPoint}
          resetKey={String(gainTrackDb)}
          mix={mix}
          accent={accent}
          onChange={onFader}
        />
      </Part>
    </div>
  );
}
