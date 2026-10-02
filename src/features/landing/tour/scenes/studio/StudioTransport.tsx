import { useTransform, type MotionValue } from 'framer-motion';
import {
  Circle,
  Lock,
  Metronome,
  Pause,
  Play,
  Repeat,
  Square,
} from 'lucide-react';
import { MotionFixedDigits } from '@/components/common/FixedDigits';
import { RainbowBorderButton } from '@/components/ui/rainbow-borders-button';
import { cn } from '@/components/utilities';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { KEY_CENTERS } from '../../../music';
import { BPM, formatPosition } from './studioSong';
import {
  ON_TEXT,
  PLAYING_BG,
  PRESS,
  STUDIO,
  type StudioLayout,
} from './studioTokens';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80';
const VIEWS = ['Create', 'Master', 'Score', 'Lead sheet'];

const keyName = (pc: number) =>
  displayAccidentals(KEY_CENTERS.find((k) => k.pitchClass === pc)?.name ?? '');

/**
 * The Studio's transport bar (`TransportBar.tsx`), trimmed for the demo: the
 * KEY pill (rainbow-bordered until a key is set, then filled "KEY: C"), the
 * tempo cluster, ■ ▶ ● and the bar:beat:sixteenth counter in the true center,
 * then the view switcher. Only KEY, Stop and Play are real controls. Compact
 * keeps KEY, Stop, Play, the counter and the tempo, larger.
 */
export const StudioTransport = ({
  layout,
  compact,
  keyPc,
  keyColor,
  playing,
  pressPlay,
  position,
  onKey,
  onPlay,
  onStop,
  playTarget,
  keyLabel,
}: {
  layout: StudioLayout;
  compact: boolean;
  keyPc: number | null;
  keyColor: string | null;
  playing: boolean;
  /** The auto cursor's press on Play. */
  pressPlay: boolean;
  position: MotionValue<number>;
  onKey: () => void;
  onPlay: () => void;
  onStop: () => void;
  /** A tour's `data-tour-target` on Play (the demo that clicks it). */
  playTarget?: string;
  /** What the keyed KEY pill does, for screen readers (default: Prism). */
  keyLabel?: string;
}) => {
  const counter = useTransform(position, formatPosition);
  const keyed = keyPc !== null && keyColor !== null;

  const keyPill = (
    <RainbowBorderButton
      type="button"
      active={!keyed}
      onClick={onKey}
      aria-label={
        keyed
          ? `Key: ${keyName(keyPc)} major. ${keyLabel ?? 'Open Prism'}`
          : 'Pick a key'
      }
      wrapperClassName="inline-flex shrink-0 rounded-[8px] p-[2px]"
      className={cn(
        'gap-1 whitespace-nowrap uppercase tracking-wider',
        compact
          ? 'h-7 min-w-[84px] px-2.5 text-[14px]'
          : 'h-[22px] min-w-[64px] px-2 text-[11px]',
        FOCUS,
      )}
      style={{
        background: keyed ? keyColor : STUDIO.surface2,
        color: keyed ? ON_TEXT : '#ffffff',
      }}
    >
      {keyed ? `Key: ${keyName(keyPc)}` : 'Key'}
      {keyed && (
        <Lock aria-hidden className={compact ? 'size-3' : 'size-2.5'} />
      )}
    </RainbowBorderButton>
  );

  const controls = (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label="Stop"
        onClick={onStop}
        className={cn(
          'grid place-items-center rounded-md hover:bg-white/[0.06]',
          compact ? 'size-9' : 'size-6',
          FOCUS,
        )}
        style={{ color: STUDIO.text }}
      >
        <Square
          aria-hidden
          className={cn('fill-current', compact ? 'size-3.5' : 'size-2.5')}
        />
      </button>
      <button
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        aria-pressed={playing}
        data-tour-target={playTarget}
        onClick={onPlay}
        className={cn(
          'grid place-items-center rounded-full transition-[transform,background-color] duration-150',
          compact ? 'size-10' : 'size-7',
          !playing && 'hover:bg-white/[0.1]',
          FOCUS,
        )}
        style={{
          // A bare triangle at rest, as in the Studio.
          background: pressPlay
            ? PRESS.overlay
            : playing
              ? PLAYING_BG
              : 'transparent',
          boxShadow: pressPlay ? PRESS.ring : undefined,
          transform: pressPlay ? `scale(${PRESS.scale})` : undefined,
          color: '#ffffff',
        }}
      >
        {playing ? (
          <Pause
            aria-hidden
            className={cn('fill-current', compact ? 'size-4' : 'size-3.5')}
          />
        ) : (
          <Play
            aria-hidden
            className={cn('fill-current', compact ? 'size-5' : 'size-4')}
          />
        )}
      </button>
      {!compact && (
        <span aria-hidden className="grid size-6 place-items-center">
          <Circle
            className="size-2.5 fill-current"
            style={{ color: STUDIO.textDim }}
          />
        </span>
      )}
      <span
        aria-hidden
        className="mx-1 h-4 w-px"
        style={{ background: STUDIO.border }}
      />
      <MotionFixedDigits
        value={counter}
        role="timer"
        aria-label="Position"
        className={cn(
          'tracking-wider',
          compact ? 'min-w-[64px] text-[15px]' : 'min-w-[52px] text-[12px]',
        )}
        style={{ color: STUDIO.text }}
      />
    </div>
  );

  if (compact) {
    return (
      <div
        className="absolute inset-x-0 top-0 grid grid-cols-[1fr_auto_1fr] items-center border-b px-3"
        style={{ height: layout.transportH, borderColor: STUDIO.border }}
      >
        <div className="flex">{keyPill}</div>
        {controls}
        <span
          className="justify-self-end text-[13px]"
          style={{ color: STUDIO.textDim }}
        >
          {BPM} BPM
        </span>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-x-0 top-0 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-3"
      style={{
        height: layout.transportH,
        background: STUDIO.bg,
        borderColor: STUDIO.border,
      }}
    >
      <div className="flex min-w-0 items-center gap-2 text-[11px]">
        {keyPill}
        <span
          aria-hidden
          className="ml-auto flex items-center gap-1.5 text-[10px]"
          style={{ color: STUDIO.textDim }}
        >
          <span
            className="rounded px-1.5 py-0.5 tabular-nums"
            style={{ background: STUDIO.surface2 }}
          >
            4/4
          </span>
          <span className="uppercase">Bpm</span>
          <span
            className="rounded border px-1.5 py-0.5 text-[11px] tabular-nums"
            style={{ borderColor: STUDIO.border, color: STUDIO.text }}
          >
            {BPM}
          </span>
          <span className="h-4 w-px" style={{ background: STUDIO.border }} />
          <Metronome className="size-3.5" />
          <Repeat className="size-3.5" />
        </span>
      </div>
      {controls}
      <div aria-hidden className="flex items-center justify-end">
        <span
          className="flex rounded-md p-0.5"
          style={{ background: STUDIO.surface2 }}
        >
          {VIEWS.map((v, i) => (
            <span
              key={v}
              className="flex h-5 items-center rounded px-2.5 text-[10px] uppercase tracking-wide"
              style={
                i === 0
                  ? { background: STUDIO.surface3, color: STUDIO.text }
                  : { color: STUDIO.textDim }
              }
            >
              {v}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
};
