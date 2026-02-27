import React, { useRef, useEffect } from 'react';
import { ContourAnalysis, ContourSegment } from '@/studio-daw/audio/contour-analysis';

interface ContourVisualizationProps {
  buffer?: AudioBuffer;
  contour: ContourAnalysis;
  width: number;
  height: number;
  currentTime?: number;
  showSegments?: boolean;
  showWaveform?: boolean;
  compact?: boolean;
}

/** Color mapping for intensity levels */
const INTENSITY_COLORS = {
  silent: '#6B7280',  // gray
  low: '#3B82F6',     // blue
  medium: '#22C55E',  // green
  high: '#F97316',    // orange
};

/** Get color with opacity */
function getIntensityColor(intensity: ContourSegment['intensity'], opacity: number = 1): string {
  const hex = INTENSITY_COLORS[intensity];
  if (opacity === 1) return hex;
  // Convert hex to rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * ContourVisualization renders a waveform with amplitude contour overlay.
 * Used for previewing reference audio in the AI Scoring workflow.
 */
const ContourVisualization: React.FC<ContourVisualizationProps> = ({
  buffer,
  contour,
  width,
  height,
  currentTime = 0,
  showSegments = true,
  showWaveform = true,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const { points, segments, totalDuration } = contour;
    const pixelsPerSecond = width / totalDuration;
    const midY = height / 2;

    // Draw segment backgrounds
    if (showSegments && !compact) {
      for (const segment of segments) {
        const x = segment.startTime * pixelsPerSecond;
        const segWidth = segment.duration * pixelsPerSecond;
        ctx.fillStyle = getIntensityColor(segment.intensity, 0.15);
        ctx.fillRect(x, 0, segWidth, height);

        // Draw segment border
        ctx.strokeStyle = getIntensityColor(segment.intensity, 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Draw waveform if buffer provided
    if (showWaveform && buffer) {
      const channelData = buffer.getChannelData(0);
      const sampleRate = buffer.sampleRate;
      const samplesPerPixel = Math.max(1, Math.floor(channelData.length / width));
      const amplitude = height * 0.35;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';

      for (let x = 0; x < width; x++) {
        const start = x * samplesPerPixel;
        const end = Math.min(start + samplesPerPixel, channelData.length);

        let min = 0;
        let max = 0;
        for (let i = start; i < end && i < channelData.length; i++) {
          if (channelData[i] < min) min = channelData[i];
          if (channelData[i] > max) max = channelData[i];
        }

        const barTop = midY - max * amplitude;
        const barBottom = midY - min * amplitude;
        const barHeight = Math.max(1, barBottom - barTop);
        ctx.fillRect(x, barTop, 1, barHeight);
      }
    }

    // Draw amplitude contour envelope
    if (points.length > 0) {
      const envelopeHeight = compact ? height * 0.8 : height * 0.4;
      const envelopeOffset = compact ? height * 0.1 : height * 0.1;

      // Draw filled envelope area
      ctx.beginPath();
      ctx.moveTo(0, height - envelopeOffset);

      for (let i = 0; i < points.length; i++) {
        const x = points[i].time * pixelsPerSecond;
        const y = height - envelopeOffset - points[i].amplitude * envelopeHeight;
        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Close the path
      const lastX = points[points.length - 1].time * pixelsPerSecond;
      ctx.lineTo(lastX, height - envelopeOffset);
      ctx.lineTo(0, height - envelopeOffset);
      ctx.closePath();

      // Create gradient fill based on amplitude
      const gradient = ctx.createLinearGradient(0, height - envelopeOffset - envelopeHeight, 0, height - envelopeOffset);
      gradient.addColorStop(0, 'rgba(249, 115, 22, 0.4)');  // orange at top (high)
      gradient.addColorStop(0.4, 'rgba(34, 197, 94, 0.3)'); // green (medium)
      gradient.addColorStop(0.7, 'rgba(59, 130, 246, 0.2)'); // blue (low)
      gradient.addColorStop(1, 'rgba(107, 114, 128, 0.1)');  // gray at bottom (silent)
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw envelope line
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = points[i].time * pixelsPerSecond;
        const y = height - envelopeOffset - points[i].amplitude * envelopeHeight;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw playhead if playing
    if (currentTime > 0 && currentTime < totalDuration) {
      const playheadX = currentTime * pixelsPerSecond;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }

  }, [buffer, contour, width, height, currentTime, showSegments, showWaveform, compact]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  );
};

/**
 * ContourSegmentList renders a list of detected segments with their properties.
 * Useful for showing segment breakdown in the UI.
 */
export const ContourSegmentList: React.FC<{
  segments: ContourSegment[];
  compact?: boolean;
}> = ({ segments, compact = false }) => {
  if (compact) {
    return (
      <div className="flex gap-1 flex-wrap">
        {segments.map((seg, i) => (
          <span
            key={i}
            className="px-1.5 py-0.5 rounded text-[9px] font-medium"
            style={{
              backgroundColor: getIntensityColor(seg.intensity, 0.2),
              color: getIntensityColor(seg.intensity, 1),
            }}
          >
            {seg.intensity}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {segments.map((seg, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-2 py-1 rounded text-[10px]"
          style={{ backgroundColor: getIntensityColor(seg.intensity, 0.1) }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: getIntensityColor(seg.intensity, 1) }}
          />
          <span className="text-white/60 font-mono w-16 flex-shrink-0">
            {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
          </span>
          <span className="text-white/80 truncate flex-1">
            {seg.description}
          </span>
        </div>
      ))}
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * ContourStats displays summary statistics for the contour analysis.
 */
export const ContourStats: React.FC<{
  contour: ContourAnalysis;
}> = ({ contour }) => {
  return (
    <div className="grid grid-cols-2 gap-2 text-[10px]">
      <div className="bg-white/5 rounded px-2 py-1">
        <span className="text-white/40">Duration</span>
        <span className="float-right text-white/70 font-mono">
          {formatTime(contour.totalDuration)}
        </span>
      </div>
      <div className="bg-white/5 rounded px-2 py-1">
        <span className="text-white/40">Segments</span>
        <span className="float-right text-white/70 font-mono">
          {contour.segments.length}
        </span>
      </div>
      <div className="bg-white/5 rounded px-2 py-1">
        <span className="text-white/40">Speech</span>
        <span className="float-right text-white/70 font-mono">
          {Math.round(contour.speechRatio * 100)}%
        </span>
      </div>
      <div className="bg-white/5 rounded px-2 py-1">
        <span className="text-white/40">Dynamics</span>
        <span className="float-right text-white/70 font-mono">
          {contour.dynamicRange > 0.2 ? 'High' : contour.dynamicRange > 0.1 ? 'Med' : 'Low'}
        </span>
      </div>
      <div className="bg-white/5 rounded px-2 py-1">
        <span className="text-white/40">Suggested Tempo</span>
        <span className="float-right text-white/70 font-mono">
          {contour.suggestedTempo} BPM
        </span>
      </div>
      <div className="bg-white/5 rounded px-2 py-1">
        <span className="text-white/40">Suggested Mood</span>
        <span className="float-right text-white/70 font-mono capitalize">
          {contour.suggestedMood}
        </span>
      </div>
    </div>
  );
};

export default ContourVisualization;
