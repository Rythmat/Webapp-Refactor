import React, { useRef, useCallback } from 'react';
import { useAnimationFrame } from '../../hooks/useAnimationFrame';
import styles from './WaveformVisualizer.module.css';

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  height?: number;
  color?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = React.memo(
  ({ analyser, height = 60, color = '#7ecfcf' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bufferRef = useRef<Uint8Array | null>(null);
    const lastWidth = useRef(0);

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !analyser) return;

      // Sync canvas bitmap to CSS display size
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (displayWidth !== lastWidth.current || canvas.width !== displayWidth) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        lastWidth.current = displayWidth;
      }

      // Lazy-init buffer
      if (!bufferRef.current || bufferRef.current.length !== analyser.fftSize) {
        bufferRef.current = new Uint8Array(analyser.fftSize);
      }

      const buffer = bufferRef.current;
      analyser.getByteTimeDomainData(buffer as Uint8Array<ArrayBuffer>);

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
    }, [analyser, color]);

    useAnimationFrame(draw, !!analyser);

    return (
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        height={height}
        style={{ height }}
      />
    );
  }
);
