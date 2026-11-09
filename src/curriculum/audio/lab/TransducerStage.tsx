import { useEffect, useRef } from 'react';
import { LabStage } from './LabControls';
import { canvasFont, drawTag } from './drawWave';
import { useLabCanvas } from './useLabCanvas';

export type TransducerKind = 'mic' | 'pickup' | 'speaker';

const LABELS: Record<TransducerKind, { from: string; to: string }> = {
  mic: { from: 'Sound in the air', to: 'Voltage' },
  pickup: { from: 'A moving steel string', to: 'Voltage' },
  speaker: { from: 'Voltage', to: 'Sound in the air' },
};

const CYCLES = 3;
const SWINGS = 0.6;

/**
 * One energy going in, the part that changes it, and another coming out. The
 * magnet and coil are the same in all three: only which way the energy goes, and
 * what's fixed to the coil, differs. A schematic, not the part's real shape.
 */
export function TransducerStage({
  kind,
  accent,
  caption,
}: {
  kind: TransducerKind;
  accent: string;
  caption: string;
}) {
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const { canvasRef, redraw, reduced } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const now = kindRef.current;
      const canvas = canvasRef.current;
      const font = canvas ? canvasFont(canvas, 0.75) : '12px sans-serif';
      const mid = height / 2 + 8;
      const device = Math.min(width * 0.34, 210);
      const side = (width - device) / 2;
      const swing = Math.sin(2 * Math.PI * time * SWINGS);

      const wave = (from: number, to: number, color: string) => {
        ctx.beginPath();
        for (let x = from; x <= to; x += 1) {
          const y =
            mid -
            Math.sin(
              2 *
                Math.PI *
                (((x - from) / (to - from)) * CYCLES - time * SWINGS),
            ) *
              height *
              0.2;
          if (x === from) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();
      };
      wave(10, side - 8, 'rgb(232 232 240 / 0.8)');
      wave(width - side + 8, width - 10, accent);

      // Magnet and coil, in the middle, in all three.
      const cx = width / 2;
      const moved = swing * 7;
      const magnetW = device * 0.3;
      ctx.fillStyle = 'rgb(255 255 255 / 0.2)';
      ctx.fillRect(cx - magnetW / 2 + 12, mid - 16, magnetW, 32);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const y = mid - 18 + i * 9;
        ctx.beginPath();
        ctx.ellipse(
          cx - magnetW / 4 + (now === 'pickup' ? 12 : moved),
          y,
          magnetW / 3,
          3,
          0,
          0,
          2 * Math.PI,
        );
        ctx.stroke();
      }
      ctx.strokeStyle = '#e8e8f0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (now === 'mic') {
        // The diaphragm, fixed to the coil.
        const x = cx - device * 0.3 + moved;
        ctx.moveTo(x, mid - height * 0.26);
        ctx.quadraticCurveTo(x + 8, mid, x, mid + height * 0.26);
        ctx.moveTo(x, mid);
        ctx.lineTo(cx - magnetW / 2 + moved, mid);
      } else if (now === 'speaker') {
        // The cone, fixed to the coil.
        const x = cx + magnetW / 4 + moved;
        ctx.moveTo(x - 20, mid - 12);
        ctx.lineTo(x + device * 0.26, mid - height * 0.3);
        ctx.moveTo(x - 20, mid + 12);
        ctx.lineTo(x + device * 0.26, mid + height * 0.3);
      } else {
        // The steel string, above the magnet and coil.
        ctx.moveTo(cx - device * 0.5, mid - height * 0.3);
        ctx.quadraticCurveTo(
          cx,
          mid - height * 0.3 + swing * 12,
          cx + device * 0.5,
          mid - height * 0.3,
        );
      }
      ctx.stroke();

      const labels = LABELS[now];
      if (side > 90) {
        drawTag(ctx, labels.from, side / 2, 16, font, width);
        drawTag(ctx, labels.to, width - side / 2, 16, font, width);
      }
    },
  );
  useEffect(() => {
    if (reduced) redraw();
  }, [kind, reduced, redraw]);
  return (
    <LabStage className="h-[clamp(9rem,26vh,14rem)]" caption={caption}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        aria-hidden
      />
    </LabStage>
  );
}
