/**
 * Video Keyframe Extraction Utility
 *
 * Extracts frames from uploaded video files at regular intervals
 * for AI vision analysis and thumbnail display.
 */

export interface VideoKeyframe {
  time: number;           // timestamp in seconds
  imageData: string;      // base64 encoded JPEG (without data:image prefix)
  width: number;
  height: number;
}

export interface KeyframeExtractionOptions {
  interval?: number;      // seconds between frames (default: 2)
  maxFrames?: number;     // limit total frames (default: 30)
  width?: number;         // resize width (default: 512)
  height?: number;        // resize height (default: 288)
  quality?: number;       // JPEG quality 0-1 (default: 0.7)
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Get video metadata without extracting frames
 */
export async function getVideoMetadata(videoFile: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: video.videoWidth / video.videoHeight,
      });
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Extract keyframes from a video file at regular intervals
 */
export async function extractKeyframes(
  videoFile: File,
  options: KeyframeExtractionOptions = {},
  onProgress?: (progress: number) => void
): Promise<{ keyframes: VideoKeyframe[]; metadata: VideoMetadata }> {
  const {
    interval = 2,
    maxFrames = 30,
    width = 512,
    height = 288,
    quality = 0.7,
  } = options;

  // Create video element
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;

  // Create canvas for frame capture
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Load video
  const videoUrl = URL.createObjectURL(videoFile);

  try {
    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = videoUrl;
    });

    const metadata: VideoMetadata = {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      aspectRatio: video.videoWidth / video.videoHeight,
    };

    // Calculate frame times
    const duration = video.duration;
    const numFrames = Math.min(maxFrames, Math.ceil(duration / interval));
    const frameTimes: number[] = [];

    for (let i = 0; i < numFrames; i++) {
      const time = Math.min(i * interval, duration - 0.1);
      frameTimes.push(time);
    }

    const keyframes: VideoKeyframe[] = [];

    // Extract each frame
    for (let i = 0; i < frameTimes.length; i++) {
      const time = frameTimes[i];

      // Seek to time
      video.currentTime = time;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      // Calculate dimensions to maintain aspect ratio
      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      const videoAspect = video.videoWidth / video.videoHeight;
      const canvasAspect = width / height;

      if (videoAspect > canvasAspect) {
        // Video is wider - fit to width
        drawHeight = width / videoAspect;
        offsetY = (height - drawHeight) / 2;
      } else {
        // Video is taller - fit to height
        drawWidth = height * videoAspect;
        offsetX = (width - drawWidth) / 2;
      }

      // Draw frame to canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

      // Convert to base64
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];

      keyframes.push({
        time,
        imageData: base64,
        width,
        height,
      });

      // Report progress
      if (onProgress) {
        onProgress((i + 1) / frameTimes.length);
      }
    }

    return { keyframes, metadata };
  } finally {
    URL.revokeObjectURL(videoUrl);
  }
}

/**
 * Create a thumbnail image URL from a keyframe
 */
export function keyframeToDataUrl(keyframe: VideoKeyframe): string {
  return `data:image/jpeg;base64,${keyframe.imageData}`;
}

/**
 * Estimate API cost for analyzing keyframes with GPT-4 Vision
 * Uses "low" detail mode pricing: ~$0.005 per image
 */
export function estimateAnalysisCost(keyframeCount: number): number {
  const costPerFrame = 0.005; // USD for GPT-4o low detail
  return keyframeCount * costPerFrame;
}

/**
 * Validate video file before processing
 */
export function validateVideoFile(
  file: File,
  options: { maxSizeMB?: number; maxDurationSec?: number } = {}
): { valid: boolean; error?: string } {
  const { maxSizeMB = 100, maxDurationSec = 300 } = options;

  // Check file type
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
    return { valid: false, error: 'Unsupported video format. Use MP4, WebM, MOV, or AVI.' };
  }

  // Check file size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return { valid: false, error: `Video too large. Maximum size is ${maxSizeMB}MB.` };
  }

  return { valid: true };
}

/**
 * Parse YouTube URL to extract video ID
 */
export function parseYouTubeUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Generate YouTube embed URL from video ID
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
}

/**
 * Extract audio from a video file as an AudioBuffer
 * Uses the Web Audio API to decode the video's audio track
 */
export async function extractAudioFromVideo(
  videoFile: File,
  audioContext?: AudioContext
): Promise<AudioBuffer> {
  // Create or use provided AudioContext
  const ctx = audioContext || new AudioContext();

  // Read the video file as an ArrayBuffer
  const arrayBuffer = await videoFile.arrayBuffer();

  // Decode the audio from the video file
  // The Web Audio API can decode audio from video containers (MP4, WebM, etc.)
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (error) {
    throw new Error('Failed to extract audio from video. The video may not contain an audio track.');
  }
}
