/**
 * Video Contour Analysis
 *
 * Generates a "video contour" from GPT-4 Vision frame analysis results.
 * This is analogous to audio contour analysis but based on visual features.
 */

import { type VideoKeyframe } from '@/studio-daw/utils/video-keyframes';

/** Raw frame analysis from GPT-4 Vision */
export interface FrameAnalysis {
  time: number;
  sceneType: 'action' | 'dialogue' | 'establishing' | 'transition' | 'static';
  motionIntensity: number;        // 0-10 scale from AI
  emotionalTone: string;          // e.g., "tense", "calm", "joyful"
  keyVisualElements: string[];    // e.g., ["sunset", "crowd", "close-up"]
  colorPalette: 'warm' | 'cool' | 'vibrant' | 'muted' | 'neutral';
  lighting: 'bright' | 'dim' | 'dramatic' | 'natural';
}

/** Normalized contour point for smooth interpolation */
export interface VideoContourPoint {
  time: number;
  motionIntensity: number;       // 0-1 scale (normalized)
  emotionalValence: number;      // -1 to 1 (negative to positive mood)
  visualComplexity: number;      // 0-1 scale
  brightness: number;            // 0-1 scale
}

/** Scene segment for LLM music generation */
export interface VideoSegment {
  startTime: number;
  endTime: number;
  duration: number;
  sceneType: 'action' | 'dialogue' | 'establishing' | 'transition' | 'static';
  dominantMood: string;
  avgMotionIntensity: number;
  colorPalette: 'warm' | 'cool' | 'vibrant' | 'muted' | 'neutral';
  intensity: 'silent' | 'low' | 'medium' | 'high';  // matches audio contour for compatibility
  description: string;           // human-readable for LLM prompt
}

/** Complete video contour analysis result */
export interface VideoContourAnalysis {
  points: VideoContourPoint[];
  segments: VideoSegment[];
  totalDuration: number;
  overallMood: string;
  paceProfile: 'slow' | 'moderate' | 'fast' | 'variable';
  suggestedTempo: number;
  keyframes: VideoKeyframe[];    // stored for thumbnail display
}

// Mood to valence mapping
const MOOD_VALENCE: Record<string, number> = {
  joyful: 0.9,
  happy: 0.8,
  excited: 0.7,
  playful: 0.6,
  hopeful: 0.5,
  calm: 0.3,
  peaceful: 0.2,
  neutral: 0,
  melancholic: -0.3,
  somber: -0.4,
  tense: -0.5,
  anxious: -0.6,
  sad: -0.7,
  dark: -0.8,
  ominous: -0.9,
};

// Lighting to brightness mapping
const LIGHTING_BRIGHTNESS: Record<string, number> = {
  bright: 0.9,
  natural: 0.6,
  dim: 0.3,
  dramatic: 0.5,
};

/**
 * Convert raw frame analyses to normalized contour points
 */
function framesToContourPoints(frames: FrameAnalysis[]): VideoContourPoint[] {
  return frames.map((frame) => ({
    time: frame.time,
    motionIntensity: Math.min(1, Math.max(0, frame.motionIntensity / 10)),
    emotionalValence: MOOD_VALENCE[frame.emotionalTone.toLowerCase()] ?? 0,
    visualComplexity: Math.min(1, frame.keyVisualElements.length / 5),
    brightness: LIGHTING_BRIGHTNESS[frame.lighting] ?? 0.5,
  }));
}

/**
 * Determine the dominant mood from frame analyses
 */
function determineDominantMood(frames: FrameAnalysis[]): string {
  const moodCounts: Record<string, number> = {};

  for (const frame of frames) {
    const mood = frame.emotionalTone.toLowerCase();
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  }

  let maxCount = 0;
  let dominantMood = 'neutral';

  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = mood;
    }
  }

  return dominantMood;
}

/**
 * Convert motion intensity (0-1) to text intensity level
 */
function motionToIntensity(motion: number): 'silent' | 'low' | 'medium' | 'high' {
  if (motion < 0.15) return 'silent';
  if (motion < 0.4) return 'low';
  if (motion < 0.7) return 'medium';
  return 'high';
}

/**
 * Segment consecutive frames with similar characteristics
 */
function segmentFrames(frames: FrameAnalysis[], totalDuration: number): VideoSegment[] {
  if (frames.length === 0) return [];

  const segments: VideoSegment[] = [];
  let segmentStart = 0;
  let currentSegmentFrames: FrameAnalysis[] = [frames[0]];

  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const curr = frames[i];

    // Check if scene type or mood changed significantly
    const sceneChanged = prev.sceneType !== curr.sceneType;
    const moodChanged = MOOD_VALENCE[prev.emotionalTone.toLowerCase()] !== undefined &&
      MOOD_VALENCE[curr.emotionalTone.toLowerCase()] !== undefined &&
      Math.abs(
        (MOOD_VALENCE[prev.emotionalTone.toLowerCase()] ?? 0) -
        (MOOD_VALENCE[curr.emotionalTone.toLowerCase()] ?? 0)
      ) > 0.4;
    const motionChanged = Math.abs(prev.motionIntensity - curr.motionIntensity) > 4;

    if (sceneChanged || moodChanged || motionChanged) {
      // Close current segment
      const segmentEnd = curr.time;
      segments.push(createSegment(currentSegmentFrames, segmentStart, segmentEnd));

      // Start new segment
      segmentStart = curr.time;
      currentSegmentFrames = [curr];
    } else {
      currentSegmentFrames.push(curr);
    }
  }

  // Close final segment
  segments.push(createSegment(currentSegmentFrames, segmentStart, totalDuration));

  // Merge very short segments (< 2s) with neighbors
  return mergeShortSegments(segments, 2);
}

/**
 * Create a segment from a group of frames
 */
function createSegment(
  frames: FrameAnalysis[],
  startTime: number,
  endTime: number
): VideoSegment {
  // Calculate averages
  const avgMotion = frames.reduce((sum, f) => sum + f.motionIntensity, 0) / frames.length / 10;

  // Determine dominant scene type and mood
  const sceneTypeCounts: Record<string, number> = {};
  const moodCounts: Record<string, number> = {};
  const paletteCounts: Record<string, number> = {};

  for (const frame of frames) {
    sceneTypeCounts[frame.sceneType] = (sceneTypeCounts[frame.sceneType] || 0) + 1;
    moodCounts[frame.emotionalTone] = (moodCounts[frame.emotionalTone] || 0) + 1;
    paletteCounts[frame.colorPalette] = (paletteCounts[frame.colorPalette] || 0) + 1;
  }

  const dominantSceneType = Object.entries(sceneTypeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as VideoSegment['sceneType'] ?? 'static';

  const dominantMood = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';

  const dominantPalette = Object.entries(paletteCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as VideoSegment['colorPalette'] ?? 'neutral';

  const intensity = motionToIntensity(avgMotion);

  // Generate human-readable description for LLM
  const description = generateSegmentDescription(
    dominantSceneType,
    dominantMood,
    avgMotion,
    dominantPalette,
    frames[0]?.keyVisualElements || []
  );

  return {
    startTime,
    endTime,
    duration: endTime - startTime,
    sceneType: dominantSceneType,
    dominantMood,
    avgMotionIntensity: avgMotion,
    colorPalette: dominantPalette,
    intensity,
    description,
  };
}

/**
 * Generate human-readable segment description for LLM prompts
 */
function generateSegmentDescription(
  sceneType: string,
  mood: string,
  motion: number,
  palette: string,
  elements: string[]
): string {
  const motionDesc = motion < 0.2 ? 'slow/static' :
    motion < 0.5 ? 'moderate movement' :
    motion < 0.8 ? 'active' : 'fast-paced action';

  const elementsDesc = elements.length > 0
    ? `featuring ${elements.slice(0, 3).join(', ')}`
    : '';

  return `${sceneType} scene, ${mood} mood, ${motionDesc}, ${palette} colors${elementsDesc ? ', ' + elementsDesc : ''}`;
}

/**
 * Merge segments shorter than minDuration with their neighbors
 */
function mergeShortSegments(segments: VideoSegment[], minDuration: number): VideoSegment[] {
  if (segments.length <= 1) return segments;

  const merged: VideoSegment[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.duration < minDuration && merged.length > 0) {
      // Merge with previous segment
      const prev = merged[merged.length - 1];
      prev.endTime = seg.endTime;
      prev.duration = prev.endTime - prev.startTime;
      // Keep the longer segment's characteristics
    } else if (seg.duration < minDuration && i < segments.length - 1) {
      // Merge with next segment (will be handled in next iteration)
      const next = segments[i + 1];
      next.startTime = seg.startTime;
      next.duration = next.endTime - next.startTime;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
}

/**
 * Determine overall pace profile from segments
 */
function determinePaceProfile(segments: VideoSegment[]): 'slow' | 'moderate' | 'fast' | 'variable' {
  if (segments.length === 0) return 'moderate';

  const avgMotion = segments.reduce((sum, s) => sum + s.avgMotionIntensity, 0) / segments.length;
  const motionVariance = segments.reduce((sum, s) =>
    sum + Math.pow(s.avgMotionIntensity - avgMotion, 2), 0) / segments.length;

  // High variance = variable pace
  if (motionVariance > 0.1) return 'variable';

  // Classify by average motion
  if (avgMotion < 0.25) return 'slow';
  if (avgMotion < 0.55) return 'moderate';
  return 'fast';
}

/**
 * Suggest tempo based on visual pace
 */
function suggestTempo(paceProfile: 'slow' | 'moderate' | 'fast' | 'variable', avgMotion: number): number {
  switch (paceProfile) {
    case 'slow': return 50 + Math.round(avgMotion * 20);
    case 'moderate': return 70 + Math.round(avgMotion * 30);
    case 'fast': return 100 + Math.round(avgMotion * 40);
    case 'variable': return 80; // Middle ground for variable content
    default: return 72;
  }
}

/**
 * Create a complete video contour analysis from frame analyses
 */
export function createVideoContour(
  frameAnalyses: FrameAnalysis[],
  totalDuration: number,
  keyframes: VideoKeyframe[]
): VideoContourAnalysis {
  // Generate contour points
  const points = framesToContourPoints(frameAnalyses);

  // Generate segments
  const segments = segmentFrames(frameAnalyses, totalDuration);

  // Determine overall characteristics
  const overallMood = determineDominantMood(frameAnalyses);
  const paceProfile = determinePaceProfile(segments);
  const avgMotion = segments.reduce((sum, s) => sum + s.avgMotionIntensity, 0) / Math.max(segments.length, 1);
  const suggestedTempo = suggestTempo(paceProfile, avgMotion);

  return {
    points,
    segments,
    totalDuration,
    overallMood,
    paceProfile,
    suggestedTempo,
    keyframes,
  };
}

/**
 * Get interpolated contour values at a specific time
 * Used for real-time volume/effect following during playback
 */
export function getVideoContourAtTime(
  analysis: VideoContourAnalysis,
  time: number
): VideoContourPoint {
  const { points } = analysis;

  if (points.length === 0) {
    return { time, motionIntensity: 0.5, emotionalValence: 0, visualComplexity: 0.5, brightness: 0.5 };
  }

  // Find surrounding points for interpolation
  let prevPoint = points[0];
  let nextPoint = points[points.length - 1];

  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].time <= time && points[i + 1].time > time) {
      prevPoint = points[i];
      nextPoint = points[i + 1];
      break;
    }
  }

  // Linear interpolation
  const t = (nextPoint.time - prevPoint.time) > 0
    ? (time - prevPoint.time) / (nextPoint.time - prevPoint.time)
    : 0;

  return {
    time,
    motionIntensity: prevPoint.motionIntensity + t * (nextPoint.motionIntensity - prevPoint.motionIntensity),
    emotionalValence: prevPoint.emotionalValence + t * (nextPoint.emotionalValence - prevPoint.emotionalValence),
    visualComplexity: prevPoint.visualComplexity + t * (nextPoint.visualComplexity - prevPoint.visualComplexity),
    brightness: prevPoint.brightness + t * (nextPoint.brightness - prevPoint.brightness),
  };
}

/**
 * Format video contour for LLM prompt (similar to audio contour)
 * Limits output to reasonable token count
 */
export function videoContourToLLMDescription(analysis: VideoContourAnalysis): string {
  const { segments, totalDuration, overallMood, paceProfile } = analysis;

  // Limit to 30 segments for token efficiency
  const limitedSegments = segments.slice(0, 30);

  const header = `VIDEO ANALYSIS SUMMARY:
Total Duration: ${totalDuration.toFixed(1)} seconds
Overall Mood: ${overallMood}
Pace: ${paceProfile}

SCENE BREAKDOWN:`;

  const segmentLines = limitedSegments.map((seg, i) =>
    `${i + 1}. [${seg.startTime.toFixed(1)}s - ${seg.endTime.toFixed(1)}s] ${seg.intensity.toUpperCase()}: ${seg.description}`
  ).join('\n');

  return `${header}\n${segmentLines}`;
}
