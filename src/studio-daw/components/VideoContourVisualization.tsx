/**
 * Video Contour Visualization
 *
 * Displays the motion intensity and scene markers from video analysis.
 * Similar to ContourVisualization but for video data.
 */

import React, { useRef, useEffect } from 'react';
import { type VideoContourAnalysis, type VideoSegment } from '@/studio-daw/audio/video-contour-analysis';
import { keyframeToDataUrl } from '@/studio-daw/utils/video-keyframes';

interface VideoContourVisualizationProps {
  contour: VideoContourAnalysis;
  width?: number;
  height?: number;
  showKeyframes?: boolean;
  showSegments?: boolean;
  currentTime?: number;
}

// Intensity to color mapping (matches audio contour)
const INTENSITY_COLORS: Record<string, string> = {
  silent: 'rgba(100, 100, 100, 0.3)',
  low: 'rgba(59, 130, 246, 0.3)',     // blue
  medium: 'rgba(34, 197, 94, 0.3)',   // green
  high: 'rgba(249, 115, 22, 0.3)',    // orange
};

// Scene type to icon/indicator
const SCENE_ICONS: Record<string, string> = {
  action: '⚡',
  dialogue: '💬',
  establishing: '🏔️',
  transition: '🔄',
  static: '⏸️',
};

const VideoContourVisualization: React.FC<VideoContourVisualizationProps> = ({
  contour,
  width = 640,
  height = 120,
  showKeyframes = true,
  showSegments = true,
  currentTime,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with DPR
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    const { points, segments, totalDuration } = contour;
    if (totalDuration === 0) return;

    const pixelsPerSecond = width / totalDuration;

    // 1. Draw segment backgrounds
    if (showSegments) {
      for (const seg of segments) {
        const x = seg.startTime * pixelsPerSecond;
        const w = (seg.endTime - seg.startTime) * pixelsPerSecond;
        ctx.fillStyle = INTENSITY_COLORS[seg.intensity] || INTENSITY_COLORS.low;
        ctx.fillRect(x, 0, w, height);
      }
    }

    // 2. Draw motion intensity curve
    if (points.length > 1) {
      // Fill under curve
      ctx.beginPath();
      ctx.moveTo(0, height);

      for (const point of points) {
        const x = point.time * pixelsPerSecond;
        const y = height - (point.motionIntensity * (height - 20));
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();

      // Gradient fill
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(249, 115, 22, 0.6)');  // orange at top
      gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.4)');  // green middle
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');   // blue at bottom
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke line
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const x = point.time * pixelsPerSecond;
        const y = height - (point.motionIntensity * (height - 20));

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 3. Draw segment boundaries
    if (showSegments) {
      for (const seg of segments) {
        const x = seg.startTime * pixelsPerSecond;

        // Vertical line at segment start
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 4. Draw playhead
    if (currentTime !== undefined && currentTime >= 0 && currentTime <= totalDuration) {
      const playheadX = currentTime * pixelsPerSecond;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead triangle
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [contour, width, height, showKeyframes, showSegments, currentTime]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="rounded"
        style={{ width, height }}
      />

      {/* Keyframe thumbnails below */}
      {showKeyframes && contour.keyframes.length > 0 && (
        <div className="flex mt-2 gap-1 overflow-x-auto py-1">
          {contour.keyframes.slice(0, 15).map((keyframe, i) => (
            <div
              key={i}
              className="relative flex-shrink-0 w-12 h-8 rounded overflow-hidden bg-[#333]"
              title={`${keyframe.time.toFixed(1)}s`}
            >
              <img
                src={keyframeToDataUrl(keyframe)}
                alt={`Frame at ${keyframe.time}s`}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[7px] text-white/70 text-center">
                {keyframe.time.toFixed(0)}s
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Stats display for video contour (like ContourStats for audio)
 */
export const VideoContourStats: React.FC<{ contour: VideoContourAnalysis }> = ({ contour }) => {
  const avgMotion = contour.segments.reduce((sum, s) => sum + s.avgMotionIntensity, 0) /
    Math.max(contour.segments.length, 1);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
      <StatBox
        label="Duration"
        value={`${Math.floor(contour.totalDuration / 60)}:${Math.floor(contour.totalDuration % 60).toString().padStart(2, '0')}`}
      />
      <StatBox
        label="Scenes"
        value={contour.segments.length.toString()}
      />
      <StatBox
        label="Motion"
        value={`${Math.round(avgMotion * 100)}%`}
      />
      <StatBox
        label="Pace"
        value={contour.paceProfile}
      />
      <StatBox
        label="Mood"
        value={contour.overallMood}
      />
      <StatBox
        label="BPM"
        value={contour.suggestedTempo.toString()}
      />
      <StatBox
        label="Frames"
        value={contour.keyframes.length.toString()}
      />
      <StatBox
        label="Avg Scene"
        value={`${(contour.totalDuration / Math.max(contour.segments.length, 1)).toFixed(1)}s`}
      />
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/5 border border-white/10 rounded-lg p-2">
    <div className="text-[10px] text-white/40 uppercase tracking-wider">{label}</div>
    <div className="text-sm text-white/80 font-medium truncate">{value}</div>
  </div>
);

/**
 * Segment list display (like ContourSegmentList for audio)
 */
export const VideoSegmentList: React.FC<{
  segments: VideoSegment[];
  compact?: boolean;
}> = ({ segments, compact = false }) => {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {segments.slice(0, 20).map((seg, i) => (
          <span
            key={i}
            className={`
              px-1.5 py-0.5 rounded text-[9px] font-medium
              ${seg.intensity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                seg.intensity === 'medium' ? 'bg-green-500/20 text-green-400' :
                seg.intensity === 'low' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'}
            `}
            title={seg.description}
          >
            {SCENE_ICONS[seg.sceneType] || '•'} {seg.startTime.toFixed(0)}s
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
          className="flex items-center gap-2 text-[10px] text-white/60"
        >
          <span className="text-white/30 w-8">{seg.startTime.toFixed(1)}s</span>
          <span className="w-4">{SCENE_ICONS[seg.sceneType]}</span>
          <span
            className={`
              px-1 rounded text-[8px] font-bold uppercase
              ${seg.intensity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                seg.intensity === 'medium' ? 'bg-green-500/20 text-green-400' :
                seg.intensity === 'low' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'}
            `}
          >
            {seg.intensity}
          </span>
          <span className="flex-1 truncate">{seg.dominantMood}</span>
        </div>
      ))}
    </div>
  );
};

export default VideoContourVisualization;
