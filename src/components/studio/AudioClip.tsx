import { useEffect, useRef } from 'react';
import * as Tone from "tone";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

type AudioClipProps = {
  audioUrl: string;
  gainDb?: number;
  fadeInSec?: number;
  fadeOutSec?: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onSplitAt: () => void; // split at current playhead
  onGainChange: (gainDb: number) => void;
  onFadeChange: (fadeInSec: number, fadeOutSec: number) => void;
  onNormalize: () => void;
  isAudioReady: boolean;
  currentMeasure: number; // for info display if needed later
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const AudioClip = ({
  audioUrl,
  gainDb = 0,
  fadeInSec = 0,
  fadeOutSec = 0,
  onDelete,
  onDuplicate,
  onSplitAt,
  onGainChange,
  onFadeChange,
  onNormalize,
  isAudioReady
}: AudioClipProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audioUrl || !isAudioReady || Tone.context.state !== 'running') return;

    let waveform: Tone.Waveform | null = null;
    let player: Tone.Player | null = null;

    try {
      waveform = new Tone.Waveform();
      player = new Tone.Player({
        url: audioUrl,
        onload: () => {
          if (waveform) {
            drawWaveform(waveform.getValue());
          }
          player?.dispose();
          waveform?.dispose();
        }
      }).connect(waveform);
    } catch (error) {
      console.error("Error creating Tone.js objects in AudioClip:", error);
    }

    const drawWaveform = (values: Float32Array) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // Ensure high-DPI rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      const context = canvas.getContext('2d');
      if (!context) return;
      context.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      context.clearRect(0, 0, width, height);

      // Background
      context.fillStyle = 'rgba(255,255,255,0.06)';
      context.fillRect(0, 0, width, height);

      // Wave
      context.beginPath();
      context.moveTo(0, height / 2);
      context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      context.lineWidth = 1;

      const step = Math.max(1, Math.floor(values.length / width));
      for (let i = 0; i < values.length; i += step) {
        const x = (i / values.length) * width;
        const y = (values[i] * 0.5 + 0.5) * height;
        context.lineTo(x, y);
      }
      context.stroke();
    };

    return () => {
      player?.dispose();
      waveform?.dispose();
    };
  }, [audioUrl, isAudioReady]);

  const fadeLabel = () => {
    const fIn = fadeInSec ? `${Math.round(fadeInSec * 1000)}ms` : '';
    const fOut = fadeOutSec ? `${Math.round(fadeOutSec * 1000)}ms` : '';
    if (!fIn && !fOut) return null;
    return `fade ${fIn}${fIn && fOut ? ' / ' : ''}${fOut}`;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="relative h-full w-full bg-blue-800/80 border border-blue-900 rounded-sm overflow-hidden">
          {/* Badges */}
          {(gainDb !== 0 || fadeInSec || fadeOutSec) && (
            <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded space-x-1">
              {gainDb !== 0 && <span>{gainDb > 0 ? `+${gainDb} dB` : `${gainDb} dB`}</span>}
              {fadeLabel() && <span>{fadeLabel()}</span>}
            </div>
          )}
          {/* Fade overlays */}
          {fadeInSec ? <div className="absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" /> : null}
          {fadeOutSec ? <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-black/50 to-transparent pointer-events-none" /> : null}
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onSplitAt}>Split at Playhead</ContextMenuItem>
        <div className="px-2 py-1 text-xs text-muted-foreground">Volume</div>
        <ContextMenuItem onSelect={() => onGainChange(clamp(gainDb + 6, -24, 24))}>+6 dB</ContextMenuItem>
        <ContextMenuItem onSelect={() => onGainChange(clamp(gainDb + 12, -24, 24))}>+12 dB</ContextMenuItem>
        <ContextMenuItem onSelect={() => onGainChange(clamp(gainDb - 6, -24, 24))}>-6 dB</ContextMenuItem>
        <ContextMenuItem onSelect={() => onGainChange(clamp(gainDb - 12, -24, 24))}>-12 dB</ContextMenuItem>
        <ContextMenuItem onSelect={() => onGainChange(0)}>Reset</ContextMenuItem>

        <div className="px-2 py-1 text-xs text-muted-foreground">Fades</div>
        <ContextMenuItem onSelect={() => onFadeChange(0.01, fadeOutSec || 0)}>Fade In: Short (10ms)</ContextMenuItem>
        <ContextMenuItem onSelect={() => onFadeChange(0.05, fadeOutSec || 0)}>Fade In: Medium (50ms)</ContextMenuItem>
        <ContextMenuItem onSelect={() => onFadeChange(0.2, fadeOutSec || 0)}>Fade In: Long (200ms)</ContextMenuItem>
        <ContextMenuItem onSelect={() => onFadeChange(fadeInSec || 0, 0.01)}>Fade Out: Short (10ms)</ContextMenuItem>
        <ContextMenuItem onSelect={() => onFadeChange(fadeInSec || 0, 0.05)}>Fade Out: Medium (50ms)</ContextMenuItem>
        <ContextMenuItem onSelect={() => onFadeChange(fadeInSec || 0, 0.2)}>Fade Out: Long (200ms)</ContextMenuItem>
        <ContextMenuItem onSelect={() => onFadeChange(0, 0)}>Reset Fades</ContextMenuItem>

        <div className="px-2 py-1 text-xs text-muted-foreground">Processing</div>
        <ContextMenuItem onSelect={onNormalize}>Normalize (peak)</ContextMenuItem>

        <ContextMenuItem onSelect={onDuplicate}>Duplicate</ContextMenuItem>
        <ContextMenuItem className="text-red-500" onSelect={onDelete}>Delete Clip</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default AudioClip;