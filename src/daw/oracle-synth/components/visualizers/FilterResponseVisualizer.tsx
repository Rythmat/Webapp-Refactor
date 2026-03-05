import React, { useRef, useCallback } from 'react';
import { Filter } from '../../audio/Filter';
import { useAnimationFrame } from '../../hooks/useAnimationFrame';
import styles from './FilterResponseVisualizer.module.css';

interface FilterResponseVisualizerProps {
  liveFilter: Filter | null;
  height?: number;
  color?: string;
}

// Pre-compute log-spaced frequency array (20Hz to 20kHz)
const NUM_POINTS = 128;
const frequencies = new Float32Array(NUM_POINTS);
for (let i = 0; i < NUM_POINTS; i++) {
  frequencies[i] = 20 * Math.pow(1000, i / (NUM_POINTS - 1));
}

/**
 * Draws a live frequency response curve by polling the actual
 * BiquadFilterNode on each animation frame. This reflects LFO
 * modulation and any other real-time parameter changes.
 */
export const FilterResponseVisualizer: React.FC<FilterResponseVisualizerProps> =
  React.memo(({ liveFilter, height = 50, color = '#e8a040' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastWidth = useRef(0);

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      const drawCtx = canvas?.getContext('2d');
      if (!canvas || !drawCtx || !liveFilter) return;

      // Sync canvas bitmap to CSS display size
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (displayWidth !== lastWidth.current || canvas.width !== displayWidth) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        lastWidth.current = displayWidth;
      }

      const { magnitude } = liveFilter.getFrequencyResponse(frequencies);

      const w = canvas.width;
      const h = canvas.height;

      drawCtx.clearRect(0, 0, w, h);

      // 0dB reference line
      const zeroDbY = h * 0.5;
      drawCtx.strokeStyle = '#333';
      drawCtx.lineWidth = 1;
      drawCtx.beginPath();
      drawCtx.moveTo(0, zeroDbY);
      drawCtx.lineTo(w, zeroDbY);
      drawCtx.stroke();

      // Frequency response curve
      drawCtx.strokeStyle = color;
      drawCtx.lineWidth = 1.5;
      drawCtx.beginPath();

      const dbRange = 36; // +/- 18dB visible range

      for (let i = 0; i < NUM_POINTS; i++) {
        const x = (i / (NUM_POINTS - 1)) * w;
        const db = 20 * Math.log10(Math.max(magnitude[i], 0.0001));
        const y = zeroDbY - (db / dbRange) * h;
        const clampedY = Math.max(0, Math.min(h, y));

        if (i === 0) {
          drawCtx.moveTo(x, clampedY);
        } else {
          drawCtx.lineTo(x, clampedY);
        }
      }

      drawCtx.stroke();

      // Fill under the curve
      drawCtx.lineTo(w, h);
      drawCtx.lineTo(0, h);
      drawCtx.closePath();
      drawCtx.fillStyle = color + '15';
      drawCtx.fill();
    }, [liveFilter, color]);

    useAnimationFrame(draw, !!liveFilter);

    return (
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        height={height}
        style={{ height }}
      />
    );
  });
