/**
 * Video Analysis Service
 *
 * Frontend service for video frame analysis and contour generation.
 * Calls Supabase edge functions for GPT-4 Vision analysis.
 */

import { supabase } from '@/studio-daw/integrations/supabase/client';
import { type VideoKeyframe, extractKeyframes, type KeyframeExtractionOptions, type VideoMetadata } from '@/studio-daw/utils/video-keyframes';
import { type FrameAnalysis, type VideoContourAnalysis, createVideoContour } from '@/studio-daw/audio/video-contour-analysis';

export { type FrameAnalysis } from '@/studio-daw/audio/video-contour-analysis';
export { type VideoKeyframe, type VideoMetadata } from '@/studio-daw/utils/video-keyframes';

export interface VideoAnalysisOptions {
  /** Keyframe extraction options */
  keyframeInterval?: number;
  maxKeyframes?: number;
  keyframeWidth?: number;
  keyframeHeight?: number;
}

export interface VideoAnalysisProgress {
  stage: 'loading' | 'extracting' | 'analyzing' | 'processing' | 'complete';
  progress: number;  // 0-1
  message: string;
}

/**
 * Analyze a video file and generate a video contour for music scoring.
 *
 * Process:
 * 1. Extract keyframes from video
 * 2. Send to GPT-4 Vision for scene/mood analysis
 * 3. Generate video contour from analysis results
 */
export async function analyzeVideo(
  videoFile: File,
  options: VideoAnalysisOptions = {},
  onProgress?: (progress: VideoAnalysisProgress) => void
): Promise<VideoContourAnalysis> {
  const {
    keyframeInterval = 2,
    maxKeyframes = 30,
    keyframeWidth = 512,
    keyframeHeight = 288,
  } = options;

  // Stage 1: Extract keyframes
  onProgress?.({
    stage: 'extracting',
    progress: 0,
    message: 'Extracting video frames...',
  });

  const { keyframes, metadata } = await extractKeyframes(
    videoFile,
    {
      interval: keyframeInterval,
      maxFrames: maxKeyframes,
      width: keyframeWidth,
      height: keyframeHeight,
    },
    (extractProgress) => {
      onProgress?.({
        stage: 'extracting',
        progress: extractProgress * 0.3,  // 0-30%
        message: `Extracting frames... ${Math.round(extractProgress * 100)}%`,
      });
    }
  );

  if (keyframes.length === 0) {
    throw new Error('Failed to extract any keyframes from video');
  }

  // Stage 2: Analyze with GPT-4 Vision
  onProgress?.({
    stage: 'analyzing',
    progress: 0.3,
    message: `Analyzing ${keyframes.length} frames with AI...`,
  });

  const frameAnalyses = await analyzeVideoFrames(keyframes, (analyzeProgress) => {
    onProgress?.({
      stage: 'analyzing',
      progress: 0.3 + analyzeProgress * 0.5,  // 30-80%
      message: `AI analysis... ${Math.round(analyzeProgress * 100)}%`,
    });
  });

  // Stage 3: Generate video contour
  onProgress?.({
    stage: 'processing',
    progress: 0.8,
    message: 'Generating video contour...',
  });

  const videoContour = createVideoContour(frameAnalyses, metadata.duration, keyframes);

  onProgress?.({
    stage: 'complete',
    progress: 1,
    message: 'Analysis complete!',
  });

  return videoContour;
}

/**
 * Send keyframes to GPT-4 Vision API for analysis via Supabase edge function.
 */
export async function analyzeVideoFrames(
  keyframes: VideoKeyframe[],
  onProgress?: (progress: number) => void
): Promise<FrameAnalysis[]> {
  // Invoke the analyze-video edge function
  const { data, error } = await supabase.functions.invoke('analyze-video', {
    body: { keyframes },
  });

  if (error) {
    throw new Error(`Video analysis failed: ${error.message}`);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  if (!data.analyses || !Array.isArray(data.analyses)) {
    throw new Error('Invalid response from video analysis service');
  }

  onProgress?.(1);

  return data.analyses as FrameAnalysis[];
}

/**
 * Generate score from video contour via edge function.
 * Similar to generateScoreFromContour but for video input.
 */
export async function generateScoreFromVideo(
  videoContour: VideoContourAnalysis,
  params: {
    mood: string;
    tempo: number;
    trackSource: 'samples' | 'midi' | 'hybrid';
  }
): Promise<{
  tracks: Array<{
    type: 'midi' | 'audio';
    name: string;
    role?: string;
    program?: number;
    notes?: any[];
    totalDuration?: number;
    url?: string;
    suggestedVolume?: number;
  }>;
}> {
  // For now, we'll use the existing generate-score function
  // with video contour converted to audio-like segments
  const { data, error } = await supabase.functions.invoke('generate-score', {
    body: {
      contourSegments: videoContour.segments.map(seg => ({
        startTime: seg.startTime,
        endTime: seg.endTime,
        duration: seg.duration,
        avgAmplitude: seg.avgMotionIntensity,  // Map motion to amplitude
        peakAmplitude: seg.avgMotionIntensity,
        speechPresence: seg.sceneType === 'dialogue' ? 0.8 : 0.2,
        intensity: seg.intensity,
        description: seg.description,
      })),
      totalDuration: videoContour.totalDuration,
      overallIntensity: videoContour.segments.reduce((sum, s) => sum + s.avgMotionIntensity, 0) / Math.max(videoContour.segments.length, 1),
      speechRatio: videoContour.segments.filter(s => s.sceneType === 'dialogue').length / Math.max(videoContour.segments.length, 1),
      mood: params.mood,
      tempo: params.tempo,
      trackSource: params.trackSource,
    },
  });

  if (error) {
    throw new Error(`Score generation failed: ${error.message}`);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}
