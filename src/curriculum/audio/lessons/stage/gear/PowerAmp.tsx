import { useRef } from 'react';
import { useLabCanvas } from '../../../lab/useLabCanvas';
import { nextMeter } from '../../../mix/mixMath';
import type { Mix } from '../../../mix/useMixEngine';
import { Knob } from './Knob';
import { LedLadder, type LedStep } from './LedLadder';

// ── A power amp and the speaker it drives ──────────────────────────────────
// A rack amp's front panel as one really reads: a level knob for each side, a
// column of lights, the power switch. Beside it a PA speaker, its cone pushed by
// what's really coming out, so that turning the amp up is something to see.

const AMP_STEPS: readonly LedStep[] = [
  { db: -30, text: '−30' },
  { db: -20, text: '−20' },
  { db: -10, text: '−10' },
  { db: -6, text: '−6' },
  { db: -3, text: '−3' },
  { db: -1, text: '−1' },
];

/** A cone as it moves: a ring pushed out and back, with the air in front. */
export function PaSpeaker({ mix, accent }: { mix: Mix; accent: string }) {
  const level = useRef(0);
  const last = useRef(0);
  const tint = useRef(accent);
  tint.current = accent;

  const { canvasRef } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const seconds = Math.max(0, time - last.current);
      last.current = time;
      const peak = mix.playing ? mix.peak({ bus: 'session' }) : 0;
      level.current = nextMeter(level.current, Math.min(1, peak), seconds * 2);
      const push = level.current;

      const cabinetW = Math.min(width * 0.62, height * 0.5);
      const cabinetH = cabinetW * 1.75;
      const left = width * 0.08;
      const top = (height - cabinetH) / 2;
      const cx = left + cabinetW / 2;

      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(255 255 255 / 0.78)';
      ctx.fillStyle = '#17171b';
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left + cabinetW, top);
      ctx.lineTo(left + cabinetW * 0.94, top + cabinetH);
      ctx.lineTo(left + cabinetW * 0.06, top + cabinetH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // The horn, for the highs.
      const hornY = top + cabinetH * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx - cabinetW * 0.3, hornY);
      ctx.lineTo(cx + cabinetW * 0.3, hornY);
      ctx.lineTo(cx + cabinetW * 0.1, hornY + cabinetH * 0.14);
      ctx.lineTo(cx - cabinetW * 0.1, hornY + cabinetH * 0.14);
      ctx.closePath();
      ctx.stroke();

      // The woofer: its cone grows towards the room as it's pushed.
      const wy = top + cabinetH * 0.64;
      const r = cabinetW * 0.36;
      ctx.beginPath();
      ctx.arc(cx, wy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = push > 0.02 ? tint.current : 'rgb(255 255 255 / 0.4)';
      ctx.lineWidth = 2 + push * 3;
      ctx.beginPath();
      ctx.arc(cx, wy, r * (0.66 + push * 0.18), 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(255 255 255 / 0.78)';
      ctx.beginPath();
      ctx.arc(cx, wy, r * (0.24 + push * 0.08), 0, Math.PI * 2);
      ctx.stroke();

      // The air it pushes, out into the room.
      const right = left + cabinetW;
      for (let i = 0; i < 3; i++) {
        const spread = (i + 1) * cabinetW * 0.22;
        ctx.strokeStyle = `rgb(255 255 255 / ${(push * (0.75 - i * 0.2)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(right - cabinetW * 0.1, wy, spread + r * 0.6, -0.5, 0.5);
        ctx.stroke();
      }

      const canvas = canvasRef.current;
      if (canvas) canvas.dataset.push = push.toFixed(2);
    },
    { live: true },
  );

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="The PA speaker, its cone moving with the sound"
      className="h-52 w-full max-w-48"
      data-pa-speaker
    />
  );
}

export function PowerAmp({
  amp,
  ampMin,
  masterDb,
  target,
  mix,
  accent,
  live,
  onAmp,
}: {
  /** The level knob, in decibels: 0 is all the way up. */
  amp: number;
  /** Where the knob is off. */
  ampMin: number;
  /** What the amp is really doing to the signal, for its lights to settle. */
  masterDb: number;
  target?: readonly [number, number];
  mix: Mix;
  accent: string;
  live: boolean;
  onAmp: (db: number) => void;
}) {
  const off = amp <= ampMin;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <div
        className="flex items-stretch rounded-xl border border-white/15 bg-[#17171b] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
        data-power-amp
      >
        <span
          aria-hidden
          className="w-3 rounded-l-xl border-r border-white/10 bg-white/[0.05]"
        />
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="flex flex-col items-center gap-1">
            <span
              className="text-[0.75rem] font-bold tracking-wide"
              style={{ color: live ? accent : 'rgb(255 255 255 / 0.7)' }}
            >
              LEVEL A
            </span>
            <div className="px-3 pt-2.5">
              <Knob
                label="Amp level"
                size="lg"
                value={amp}
                min={ampMin}
                max={0}
                step={0.5}
                valueText={off ? 'Off' : `${amp} decibels`}
                marks={[
                  { value: ampMin, text: '−∞' },
                  { value: -20, text: '−20' },
                  { value: -10, text: '−10' },
                  { value: 0, text: '0' },
                ]}
                accent={accent}
                disabled={!live}
                onChange={onAmp}
              />
            </div>
            <span className="pt-1 text-[0.875rem] font-bold tabular-nums text-white">
              {off ? '−∞' : amp === 0 ? '0' : `−${Math.abs(amp)}`}
              <span className="ml-0.5 text-[0.6875rem] font-normal text-white/55">
                dB
              </span>
            </span>
          </div>
          <div className="flex h-36">
            <LedLadder
              mix={mix}
              point={{ bus: 'pre' }}
              trackDb={masterDb}
              steps={AMP_STEPS}
              target={target}
              accent={accent}
              label="The amp’s lights"
            />
          </div>
          <div
            aria-hidden
            className="flex flex-col items-center gap-1 opacity-40 max-sm:hidden"
          >
            <span className="text-[0.75rem] font-bold tracking-wide text-white/70">
              LEVEL B
            </span>
            <div className="px-2 pt-2">
              <Knob
                label="Amp level, side B"
                size="md"
                value={ampMin}
                min={ampMin}
                max={0}
                valueText="Off"
                accent={accent}
                disabled
              />
            </div>
          </div>
          <div
            aria-hidden
            className="flex flex-col items-center gap-1.5 border-l border-white/10 pl-4"
          >
            <span className="h-7 w-4 rounded-sm border border-white/40 bg-white/[0.08]">
              <span className="mx-auto mt-0.5 block h-3 w-2.5 rounded-[2px] bg-white/70" />
            </span>
            <span className="text-[0.6875rem] font-bold text-white/55">
              POWER
            </span>
          </div>
        </div>
        <span
          aria-hidden
          className="w-3 rounded-r-xl border-l border-white/10 bg-white/[0.05]"
        />
      </div>
      <PaSpeaker mix={mix} accent={accent} />
    </div>
  );
}
