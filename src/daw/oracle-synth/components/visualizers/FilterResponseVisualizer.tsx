import React, { useRef, useCallback, useEffect } from 'react';
import { Filter } from '../../audio/Filter';
import { useOnScreen } from '../../hooks/useAnimationFrame';
import { useSynthStore } from '../../store';
import { addFrameTask } from '@/daw/engine/engineClock';
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
 * Frames drawn after a filter change (~330 ms at 30 fps): the engine applies
 * a change a render later and glides to it over a few ms (smoothParam), and
 * the curve follows the glide.
 */
export const FILTER_SETTLE_FRAMES = 10;

/**
 * Draws the filter's frequency response from the engine's visualization
 * filter. That filter carries the knob values only (per-voice modulation
 * is not reflected, see SynthEngine.getFilter), so the curve changes only
 * when the filter params do: it is redrawn for a few frames after each
 * change, on resize and when it comes on screen, and not otherwise.
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

    const onScreen = useOnScreen(canvasRef);
    const drawRef = useRef(draw);
    drawRef.current = draw;

    useEffect(() => {
      if (!liveFilter || !onScreen) return;
      let stopTask: (() => void) | null = null;
      let framesLeft = 0;
      const kick = () => {
        framesLeft = FILTER_SETTLE_FRAMES;
        if (stopTask) return;
        stopTask = addFrameTask(
          () => {
            drawRef.current();
            if (--framesLeft <= 0) {
              stopTask?.();
              stopTask = null;
            }
          },
          { fps: 30, name: 'oracle-filter-response' },
        );
      };
      kick();
      const unsubscribe = useSynthStore.subscribe((s) => s.filters, kick);
      const canvas = canvasRef.current;
      const resize =
        canvas && typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(kick)
          : null;
      if (canvas) resize?.observe(canvas);
      return () => {
        unsubscribe();
        resize?.disconnect();
        stopTask?.();
      };
    }, [liveFilter, onScreen]);

    // A new colour is a redraw, not a change of filter.
    useEffect(() => {
      if (onScreen) draw();
    }, [draw, onScreen]);

    return (
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        height={height}
        style={{ height }}
      />
    );
  });
