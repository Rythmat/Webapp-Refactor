import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useAnimationFrame, useOnScreen } from '../../hooks/useAnimationFrame';
import styles from './WaveformVisualizer.module.css';
import { COLOR } from '@/daw/ui/tokens';

/** Silence this long stops the drawing (the flat line stays drawn). */
export const WAVEFORM_SILENCE_STOP_MS = 1000;
/** While stopped, the analyser is checked this often for sound (no frames). */
export const WAVEFORM_PROBE_MS = 250;

/** Whether a byte time-domain reading is silence (within a step of 128). */
function isSilent(buffer: Uint8Array): boolean {
  for (let i = 0; i < buffer.length; i++) {
    if (Math.abs(buffer[i] - 128) > 1) return false;
  }
  return true;
}

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  height?: number;
  color?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = React.memo(
  ({ analyser, height = 60, color = COLOR.accent.value }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bufferRef = useRef<Uint8Array | null>(null);
    const lastWidth = useRef(0);
    const onScreen = useOnScreen(canvasRef);
    // Drawing runs while sound flows; after a second of silence a slow
    // probe takes over and restarts it when sound comes back.
    const [flowing, setFlowing] = useState(true);
    const silentSince = useRef<number | null>(null);

    /** Reads the analyser into the shared buffer. */
    const read = useCallback((node: AnalyserNode): Uint8Array => {
      // Lazy-init buffer
      if (!bufferRef.current || bufferRef.current.length !== node.fftSize) {
        bufferRef.current = new Uint8Array(node.fftSize);
      }
      node.getByteTimeDomainData(bufferRef.current as Uint8Array<ArrayBuffer>);
      return bufferRef.current;
    }, []);

    const draw = useCallback(
      (now: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !analyser) return;

        // Sync canvas bitmap to CSS display size
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        if (
          displayWidth !== lastWidth.current ||
          canvas.width !== displayWidth
        ) {
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          lastWidth.current = displayWidth;
        }

        const buffer = read(analyser);
        if (!isSilent(buffer)) {
          silentSince.current = null;
        } else if (silentSince.current === null) {
          silentSince.current = now;
        } else if (now - silentSince.current >= WAVEFORM_SILENCE_STOP_MS) {
          silentSince.current = null;
          setFlowing(false);
        }

        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Grid line at center
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        // Waveform
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const sliceWidth = w / buffer.length;
        let x = 0;

        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128.0; // 0..2, center at 1
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
      },
      [analyser, color, read],
    );

    useAnimationFrame(
      draw,
      !!analyser && onScreen && flowing,
      30,
      'oracle-waveform',
    );

    // Stopped for silence: look for sound on a slow timer, not every frame.
    useEffect(() => {
      if (!analyser || !onScreen || flowing) return;
      const probe = window.setInterval(() => {
        if (!isSilent(read(analyser))) setFlowing(true);
      }, WAVEFORM_PROBE_MS);
      return () => window.clearInterval(probe);
    }, [analyser, onScreen, flowing, read]);

    return (
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        height={height}
        style={{ height }}
      />
    );
  },
);
