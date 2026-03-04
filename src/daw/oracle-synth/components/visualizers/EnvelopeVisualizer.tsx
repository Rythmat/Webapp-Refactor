import React, { useRef, useEffect } from 'react';
import styles from './EnvelopeVisualizer.module.css';

interface EnvelopeVisualizerProps {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  width?: number;
  height?: number;
  color?: string;
}

/**
 * Draws an ADSR envelope shape.
 * Redraws only when envelope params change.
 */
export const EnvelopeVisualizer: React.FC<EnvelopeVisualizerProps> = React.memo(
  ({
    attack,
    decay,
    sustain,
    release,
    width = 140,
    height = 50,
    color = '#e8c840',
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const pad = 2;
      const drawW = w - pad * 2;
      const drawH = h - pad * 2;

      ctx.clearRect(0, 0, w, h);

      // Normalize time segments
      const holdTime = 0.3; // fixed visual hold time
      const totalTime = attack + decay + holdTime + release;
      const scale = drawW / totalTime;

      // Compute key points
      const x0 = pad;
      const xAttack = pad + attack * scale;
      const xDecay = xAttack + decay * scale;
      const xHold = xDecay + holdTime * scale;
      const xRelease = xHold + release * scale;

      const yTop = pad;
      const yBottom = pad + drawH;
      const ySustain = yTop + drawH * (1 - sustain);

      // Draw curve
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      // Start
      ctx.moveTo(x0, yBottom);

      // Attack (slight curve)
      ctx.quadraticCurveTo(
        x0 + (xAttack - x0) * 0.4,
        yTop + drawH * 0.1,
        xAttack,
        yTop
      );

      // Decay (exponential-ish curve to sustain level)
      ctx.quadraticCurveTo(
        xAttack + (xDecay - xAttack) * 0.3,
        yTop + (ySustain - yTop) * 0.2,
        xDecay,
        ySustain
      );

      // Hold (flat at sustain)
      ctx.lineTo(xHold, ySustain);

      // Release (exponential curve to zero)
      ctx.quadraticCurveTo(
        xHold + (xRelease - xHold) * 0.3,
        ySustain + (yBottom - ySustain) * 0.2,
        xRelease,
        yBottom
      );

      ctx.stroke();

      // Fill under the curve
      ctx.lineTo(xRelease, yBottom);
      ctx.lineTo(x0, yBottom);
      ctx.closePath();
      ctx.fillStyle = color + '15';
      ctx.fill();

      // Phase labels
      ctx.fillStyle = '#555';
      ctx.font = '8px Inter, sans-serif';
      ctx.textAlign = 'center';

      // Dot markers at key points
      ctx.fillStyle = color;
      const dotR = 2;
      for (const [px, py] of [
        [xAttack, yTop],
        [xDecay, ySustain],
        [xHold, ySustain],
      ] as const) {
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }, [attack, decay, sustain, release, width, height, color]);

    return (
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={width}
        height={height}
        style={{ height }}
      />
    );
  }
);
