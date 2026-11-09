import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import { canvasFont, drawTag } from './drawWave';
import type { DriverId } from './physics/signal';
import { useLabCanvas } from './useLabCanvas';

/**
 * A two-way speaker from the front, its drivers pushing while they play, slowly
 * enough to see: a woofer's big slow travel, a tweeter's small fast one.
 */
export function SpeakerStage({
  driver,
  sounding,
  accent,
  caption,
}: {
  driver: DriverId;
  sounding: boolean;
  accent: string;
  caption: string;
}) {
  const now = useRef({ driver, sounding });
  now.current = { driver, sounding };
  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const { driver: d, sounding: on } = now.current;
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.75) : '12px sans-serif';
      const cabH = height - 24;
      const cabW = Math.min(cabH * 0.62, width * 0.4);
      const cabX = (width - cabW) / 2;
      ctx.strokeStyle = 'rgb(255 255 255 / 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cabX, 12, cabW, cabH);

      const driverAt = (
        y: number,
        radius: number,
        active: boolean,
        travel: number,
      ) => {
        const r = radius + (active && on ? travel : 0);
        ctx.beginPath();
        ctx.arc(width / 2, y, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgb(255 255 255 / 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(width / 2, y, r, 0, 2 * Math.PI);
        ctx.strokeStyle = active ? accent : 'rgb(255 255 255 / 0.25)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(width / 2, y, radius * 0.25, 0, 2 * Math.PI);
        ctx.fillStyle = active ? accent : 'rgb(255 255 255 / 0.25)';
        ctx.fill();
      };
      const tweeterY = 12 + cabH * 0.2;
      const wooferY = 12 + cabH * 0.64;
      driverAt(tweeterY, cabW * 0.1, d !== 'woofer', Math.sin(time * 26) * 1.5);
      driverAt(wooferY, cabW * 0.33, d !== 'tweeter', Math.sin(time * 5) * 5);
      if (width > 380) {
        drawTag(ctx, 'Tweeter: the highs', cabX - 70, tweeterY, font, width);
        drawTag(ctx, 'Woofer: the lows', cabX - 66, wooferY, font, width);
      }
    },
  );
  useEffect(() => {
    if (reduced) redraw();
  }, [driver, sounding, reduced, redraw]);
  return (
    <LabStage className="h-[clamp(11rem,30vh,17rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
