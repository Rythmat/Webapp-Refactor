/**
 * Video Preview Component
 *
 * A floating/dockable video player that syncs with the DAW timeline.
 * Supports both uploaded video files and YouTube embeds.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Maximize2, Minimize2, Video, Move, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type VideoContourAnalysis } from '@/studio-daw/audio/video-contour-analysis';
import { keyframeToDataUrl, parseYouTubeUrl, getYouTubeEmbedUrl, validateVideoFile } from '@/studio-daw/utils/video-keyframes';

interface VideoPreviewProps {
  /** For uploaded videos - blob URL */
  videoUrl?: string;
  /** Video contour for displaying thumbnails/markers */
  videoContour?: VideoContourAnalysis;

  /** For YouTube embeds */
  youtubeUrl?: string;

  /** Playback sync */
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;

  /** UI controls */
  position?: 'floating' | 'docked';
  onClose?: () => void;
  onVideoReattach?: (file: File) => void;
  initialPosition?: { x: number; y: number };
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoUrl,
  videoContour,
  youtubeUrl,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onClose,
  onVideoReattach,
  initialPosition,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [size, setSize] = useState({ width: 400, height: 250 });

  // Calculate initial position - bottom-right corner with padding
  const getDefaultPosition = () => {
    if (typeof window !== 'undefined') {
      return {
        x: window.innerWidth - size.width - 20,
        y: window.innerHeight - size.height - 80, // Account for footer
      };
    }
    return { x: 100, y: 100 };
  };

  const [position, setPosition] = useState(initialPosition || getDefaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  const youtubeVideoId = youtubeUrl ? parseYouTubeUrl(youtubeUrl) : null;
  const isYoutube = !!youtubeVideoId;

  // Set initial position after mount (ensures window is available)
  useEffect(() => {
    if (!initialPosition && typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth - size.width - 20,
        y: window.innerHeight - size.height - 80,
      });
    }
  }, []); // Only run once on mount

  // Sync video playback with DAW (for uploaded videos)
  useEffect(() => {
    if (!videoRef.current || isYoutube) return;

    const video = videoRef.current;

    // Sync time if difference is significant (>0.2s)
    if (Math.abs(video.currentTime - currentTime) > 0.2) {
      video.currentTime = currentTime;
    }

    // Sync play state
    if (isPlaying && video.paused) {
      video.play().catch(() => {});  // Ignore autoplay errors
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [currentTime, isPlaying, isYoutube]);

  // Handle video time updates
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  }, [onTimeUpdate]);

  // Dragging logic - only prevent if clicking a button
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't start drag if clicking on buttons
    if (target.closest('button') || target.tagName === 'BUTTON') return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    e.preventDefault(); // Prevent text selection while dragging
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Constrain to viewport with some padding
      const maxX = window.innerWidth - 100; // Keep at least 100px visible
      const maxY = window.innerHeight - 50;
      setPosition({
        x: Math.max(-size.width + 100, Math.min(maxX, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(maxY, e.clientY - dragOffset.y)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, size.width]);

  // Calculate thumbnail strip
  const thumbnails = videoContour?.keyframes?.slice(0, 10) || [];

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl overflow-hidden",
        "flex flex-col",
        isDragging && "cursor-grabbing"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? 200 : size.width,
        height: isMinimized ? 40 : size.height,
      }}
    >
      {/* Header - Draggable */}
      <div
        className={cn(
          "h-8 bg-[#252525] border-b border-[#333] flex items-center justify-between px-2",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          "select-none"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 text-white/60 pointer-events-none">
          <Move size={12} className="text-white/40" />
          <Video size={12} />
          <span className="text-[10px] font-medium">
            {isYoutube ? 'YouTube' : 'Video Preview'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-white/40 hover:text-white/70 hover:bg-white/10 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Video Content */}
      {!isMinimized && (
        <>
          <div className="flex-1 bg-black relative">
            {isYoutube ? (
              <iframe
                src={getYouTubeEmbedUrl(youtubeVideoId)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                controls={false}
                playsInline
                muted
              />
            ) : onVideoReattach ? (
              <div
                className="w-full h-full flex flex-col items-center justify-center text-white/30 text-sm gap-2 cursor-pointer hover:bg-white/5 transition-colors"
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && validateVideoFile(file).valid) {
                    onVideoReattach(file);
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'video/*,.mp4,.webm,.mov,.avi';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file && validateVideoFile(file).valid) {
                      onVideoReattach(file);
                    }
                  };
                  input.click();
                }}
              >
                <Upload size={24} className="text-white/20" />
                <span>Drop video to re-attach</span>
                <span className="text-[10px] text-white/20">or click to browse</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                No video loaded
              </div>
            )}

            {/* Playhead time overlay */}
            {!isYoutube && (
              <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white/80 font-mono">
                {formatTime(currentTime)}
              </div>
            )}
          </div>

          {/* Thumbnail strip (for uploaded videos with contour) */}
          {!isYoutube && thumbnails.length > 0 && (
            <div className="h-12 bg-[#1e1e1e] border-t border-[#333] flex items-center gap-0.5 p-1 overflow-hidden">
              {thumbnails.map((keyframe, i) => (
                <button
                  key={i}
                  className={cn(
                    "h-full aspect-video bg-[#333] rounded overflow-hidden flex-shrink-0",
                    "hover:ring-1 hover:ring-white/30 transition-all",
                    Math.abs(currentTime - keyframe.time) < 2 && "ring-1 ring-orange-500"
                  )}
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = keyframe.time;
                      onTimeUpdate?.(keyframe.time);
                    }
                  }}
                  title={`${keyframe.time.toFixed(1)}s`}
                >
                  <img
                    src={keyframeToDataUrl(keyframe)}
                    alt={`Frame at ${keyframe.time}s`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Resize handle */}
      {!isMinimized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = size.width;
            const startHeight = size.height;

            const handleResize = (moveEvent: MouseEvent) => {
              setSize({
                width: Math.max(300, startWidth + (moveEvent.clientX - startX)),
                height: Math.max(200, startHeight + (moveEvent.clientY - startY)),
              });
            };

            const stopResize = () => {
              window.removeEventListener('mousemove', handleResize);
              window.removeEventListener('mouseup', stopResize);
            };

            window.addEventListener('mousemove', handleResize);
            window.addEventListener('mouseup', stopResize);
          }}
        >
          <svg className="w-full h-full text-white/20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22,22H20V20H22V22M22,18H20V16H22V18M18,22H16V20H18V22M18,18H16V16H18V18M14,22H12V20H14V22M22,14H20V12H22V14Z" />
          </svg>
        </div>
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default VideoPreview;
