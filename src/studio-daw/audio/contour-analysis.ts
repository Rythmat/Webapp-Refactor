/**
 * Contour Analysis Module
 * Analyzes uploaded audio (speech/meditation) for volume and pacing contours
 * to enable AI-powered adaptive music scoring.
 */

/** A single time point in the contour (100ms resolution) */
export interface ContourPoint {
  time: number;           // seconds from start
  amplitude: number;      // 0-1 normalized RMS
  speechLikelihood: number; // 0-1 probability of speech vs silence
  energy: number;         // spectral energy in speech band (0-1)
}

/** A segment summary for LLM prompts */
export interface ContourSegment {
  startTime: number;
  endTime: number;
  duration: number;
  avgAmplitude: number;
  peakAmplitude: number;
  speechPresence: number;  // percentage of segment with detected speech
  intensity: 'silent' | 'low' | 'medium' | 'high';
  description: string;     // human-readable for LLM
}

/** Full contour analysis result */
export interface ContourAnalysis {
  points: ContourPoint[];        // Fine-grained (100ms resolution)
  segments: ContourSegment[];    // Coarse segments (2-10s)
  totalDuration: number;
  overallIntensity: number;      // 0-1 average
  dynamicRange: number;          // variance in amplitude
  speechRatio: number;           // overall speech vs silence ratio
  suggestedTempo: number;        // based on pacing
  suggestedMood: string;         // based on energy profile
}

/** Yield to the main thread to prevent UI freezes */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Compute spectral flatness for a frame using FFT.
 * Lower values indicate more tonal/harmonic content (speech-like).
 * Higher values indicate noise-like content.
 */
function computeSpectralFlatness(frame: Float32Array, sampleRate: number): number {
  const fftSize = 512; // Smaller FFT for efficiency
  const data = new Float64Array(fftSize);

  // Copy and zero-pad if needed
  const len = Math.min(frame.length, fftSize);
  for (let i = 0; i < len; i++) {
    // Apply Hann window
    const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (len - 1)));
    data[i] = frame[i] * window;
  }

  // Simple DFT for small size (faster than full FFT setup for 512)
  const magnitudes: number[] = [];
  const halfSize = fftSize >> 1;

  // Focus on speech frequency range (300Hz - 3kHz)
  const minBin = Math.floor(300 * fftSize / sampleRate);
  const maxBin = Math.min(Math.ceil(3000 * fftSize / sampleRate), halfSize);

  for (let k = minBin; k < maxBin; k++) {
    let real = 0, imag = 0;
    for (let n = 0; n < fftSize; n++) {
      const angle = -2 * Math.PI * k * n / fftSize;
      real += data[n] * Math.cos(angle);
      imag += data[n] * Math.sin(angle);
    }
    const mag = Math.sqrt(real * real + imag * imag);
    if (mag > 1e-10) magnitudes.push(mag);
  }

  if (magnitudes.length === 0) return 1.0;

  // Geometric mean / arithmetic mean ratio
  const logSum = magnitudes.reduce((sum, m) => sum + Math.log(m), 0);
  const geometricMean = Math.exp(logSum / magnitudes.length);
  const arithmeticMean = magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length;

  return arithmeticMean > 0 ? geometricMean / arithmeticMean : 1.0;
}

/**
 * Compute energy in speech frequency band (300Hz - 3kHz).
 */
function computeSpeechBandEnergy(frame: Float32Array, sampleRate: number): number {
  const fftSize = 512;
  const data = new Float64Array(fftSize);

  const len = Math.min(frame.length, fftSize);
  for (let i = 0; i < len; i++) {
    const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (len - 1)));
    data[i] = frame[i] * window;
  }

  let totalEnergy = 0;
  let speechEnergy = 0;
  const halfSize = fftSize >> 1;
  const speechMinBin = Math.floor(300 * fftSize / sampleRate);
  const speechMaxBin = Math.min(Math.ceil(3000 * fftSize / sampleRate), halfSize);

  for (let k = 1; k < halfSize; k++) {
    let real = 0, imag = 0;
    for (let n = 0; n < fftSize; n++) {
      const angle = -2 * Math.PI * k * n / fftSize;
      real += data[n] * Math.cos(angle);
      imag += data[n] * Math.sin(angle);
    }
    const energy = real * real + imag * imag;
    totalEnergy += energy;
    if (k >= speechMinBin && k < speechMaxBin) {
      speechEnergy += energy;
    }
  }

  return totalEnergy > 0 ? speechEnergy / totalEnergy : 0;
}

/**
 * Compute RMS amplitude for a frame.
 */
function computeFrameRMS(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    sum += frame[i] * frame[i];
  }
  return Math.sqrt(sum / frame.length);
}

/**
 * Classify intensity level based on amplitude.
 */
function classifyIntensity(amplitude: number): 'silent' | 'low' | 'medium' | 'high' {
  if (amplitude < 0.05) return 'silent';
  if (amplitude < 0.25) return 'low';
  if (amplitude < 0.6) return 'medium';
  return 'high';
}

/**
 * Generate human-readable description for a segment.
 */
function generateSegmentDescription(
  avgAmplitude: number,
  speechPresence: number,
  duration: number
): string {
  const intensityWords: Record<string, string> = {
    silent: 'quiet pause',
    low: 'gentle, soft speech',
    medium: 'steady, present speech',
    high: 'emphatic, powerful delivery'
  };

  const intensity = classifyIntensity(avgAmplitude);

  if (intensity === 'silent') {
    return `silence/pause (${duration.toFixed(1)}s)`;
  }

  const speechDesc = speechPresence > 0.7
    ? 'continuous'
    : speechPresence > 0.3
      ? 'intermittent'
      : 'sparse';

  return `${intensityWords[intensity]}, ${speechDesc} (${duration.toFixed(1)}s)`;
}

/**
 * Segment contour points into logical sections using change-point detection.
 */
function segmentContour(
  points: ContourPoint[],
  minDuration: number = 2.0
): ContourSegment[] {
  if (points.length === 0) return [];

  const segments: ContourSegment[] = [];
  let segmentStartIdx = 0;

  // Minimum points for a segment
  const minPoints = Math.floor(minDuration / 0.1);

  for (let i = 1; i < points.length; i++) {
    const segmentLength = i - segmentStartIdx;
    const duration = points[i].time - points[segmentStartIdx].time;

    // Check for significant change in amplitude
    const prevAvgAmp = points
      .slice(Math.max(segmentStartIdx, i - 5), i)
      .reduce((s, p) => s + p.amplitude, 0) / Math.min(5, i - segmentStartIdx);

    const currAmp = points[i].amplitude;
    const amplitudeChange = Math.abs(currAmp - prevAvgAmp);

    // Split conditions: significant amplitude change OR end of audio
    const shouldSplit = (
      (segmentLength >= minPoints && amplitudeChange > 0.15) ||
      i === points.length - 1
    );

    if (shouldSplit) {
      const segmentPoints = points.slice(segmentStartIdx, i + 1);
      const amplitudes = segmentPoints.map(p => p.amplitude);
      const avgAmp = amplitudes.reduce((s, a) => s + a, 0) / amplitudes.length;
      const peakAmp = Math.max(...amplitudes);
      const speechPresence = segmentPoints.filter(p => p.speechLikelihood > 0.5).length / segmentPoints.length;

      segments.push({
        startTime: points[segmentStartIdx].time,
        endTime: points[i].time,
        duration: points[i].time - points[segmentStartIdx].time,
        avgAmplitude: avgAmp,
        peakAmplitude: peakAmp,
        speechPresence,
        intensity: classifyIntensity(avgAmp),
        description: generateSegmentDescription(avgAmp, speechPresence, duration),
      });

      segmentStartIdx = i;
    }
  }

  // Merge very short segments with neighbors
  const mergedSegments: ContourSegment[] = [];
  for (const segment of segments) {
    if (mergedSegments.length > 0 && segment.duration < minDuration) {
      const prev = mergedSegments[mergedSegments.length - 1];
      // Merge with previous
      const totalDuration = prev.duration + segment.duration;
      const weightPrev = prev.duration / totalDuration;
      const weightCurr = segment.duration / totalDuration;

      prev.endTime = segment.endTime;
      prev.duration = totalDuration;
      prev.avgAmplitude = prev.avgAmplitude * weightPrev + segment.avgAmplitude * weightCurr;
      prev.peakAmplitude = Math.max(prev.peakAmplitude, segment.peakAmplitude);
      prev.speechPresence = prev.speechPresence * weightPrev + segment.speechPresence * weightCurr;
      prev.intensity = classifyIntensity(prev.avgAmplitude);
      prev.description = generateSegmentDescription(prev.avgAmplitude, prev.speechPresence, prev.duration);
    } else {
      mergedSegments.push({ ...segment });
    }
  }

  return mergedSegments;
}

/**
 * Estimate suggested tempo based on speech pacing.
 */
function estimateTempoFromPacing(segments: ContourSegment[]): number {
  if (segments.length === 0) return 60;

  // Count transitions and pauses
  let pauseCount = 0;
  let speechSegmentCount = 0;
  let totalSpeechDuration = 0;

  for (const seg of segments) {
    if (seg.intensity === 'silent') {
      pauseCount++;
    } else {
      speechSegmentCount++;
      totalSpeechDuration += seg.duration;
    }
  }

  // More pauses = slower, meditative tempo
  // Fewer pauses = faster, energetic tempo
  const pauseRatio = pauseCount / Math.max(1, segments.length);

  // Base tempo range: 40-100 BPM
  // High pause ratio (meditative) -> lower tempo
  // Low pause ratio (continuous speech) -> higher tempo
  const baseTempo = 70;
  const tempoAdjust = (0.5 - pauseRatio) * 40; // -20 to +20 adjustment

  return Math.round(Math.max(40, Math.min(100, baseTempo + tempoAdjust)));
}

/**
 * Infer mood based on contour characteristics.
 */
function inferMoodFromContour(overallIntensity: number, dynamicRange: number): string {
  // Low intensity + low range = meditative
  // Low intensity + high range = ethereal
  // Medium intensity + low range = warm
  // High intensity + high range = dark-ambient or nature

  if (overallIntensity < 0.3) {
    return dynamicRange > 0.15 ? 'ethereal' : 'meditative';
  } else if (overallIntensity < 0.5) {
    return dynamicRange > 0.2 ? 'nature' : 'warm';
  } else {
    return dynamicRange > 0.2 ? 'dark-ambient' : 'minimal';
  }
}

/**
 * Main analysis function - extracts contour from audio buffer.
 * @param buffer The AudioBuffer to analyze
 * @param onProgress Optional callback for progress updates (0-100)
 */
export async function analyzeContour(
  buffer: AudioBuffer,
  onProgress?: (progress: number) => void
): Promise<ContourAnalysis> {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;

  // 100ms window, no overlap for efficiency
  const windowMs = 100;
  const windowSamples = Math.floor(sampleRate * windowMs / 1000);
  const hopSamples = windowSamples;

  const totalWindows = Math.floor((channelData.length - windowSamples) / hopSamples) + 1;
  const points: ContourPoint[] = [];

  let processedWindows = 0;

  for (let i = 0; i + windowSamples <= channelData.length; i += hopSamples) {
    const frame = channelData.slice(i, i + windowSamples);

    // Compute RMS amplitude
    const rms = computeFrameRMS(frame);
    const normalizedAmplitude = Math.min(1, rms / 0.25); // Normalize assuming 0.25 is loud

    // Compute spectral features for speech detection
    const flatness = computeSpectralFlatness(frame, sampleRate);
    const speechBandEnergy = computeSpeechBandEnergy(frame, sampleRate);

    // Speech likelihood heuristic:
    // Low flatness (tonal) + high amplitude + speech band energy = speech
    const speechLikelihood = normalizedAmplitude > 0.03 && flatness < 0.6
      ? Math.min(1, speechBandEnergy * 1.5 + (1 - flatness) * 0.3)
      : 0;

    points.push({
      time: i / sampleRate,
      amplitude: normalizedAmplitude,
      speechLikelihood,
      energy: speechBandEnergy,
    });

    processedWindows++;

    // Yield periodically and report progress
    if (processedWindows % 50 === 0) {
      await yieldToMain();
      if (onProgress) {
        onProgress(Math.floor((processedWindows / totalWindows) * 80)); // 80% for point extraction
      }
    }
  }

  if (onProgress) onProgress(85);
  await yieldToMain();

  // Segment the contour
  const segments = segmentContour(points, 2.0);

  if (onProgress) onProgress(90);
  await yieldToMain();

  // Compute summary statistics
  const amplitudes = points.map(p => p.amplitude);
  const avgAmplitude = amplitudes.reduce((s, a) => s + a, 0) / amplitudes.length;
  const variance = amplitudes.reduce((s, a) => s + Math.pow(a - avgAmplitude, 2), 0) / amplitudes.length;
  const dynamicRange = Math.sqrt(variance);

  const speechRatio = points.filter(p => p.speechLikelihood > 0.5).length / points.length;

  if (onProgress) onProgress(95);

  const suggestedTempo = estimateTempoFromPacing(segments);
  const suggestedMood = inferMoodFromContour(avgAmplitude, dynamicRange);

  if (onProgress) onProgress(100);

  return {
    points,
    segments,
    totalDuration: buffer.duration,
    overallIntensity: avgAmplitude,
    dynamicRange,
    speechRatio,
    suggestedTempo,
    suggestedMood,
  };
}

/**
 * Convert contour analysis to LLM-friendly description.
 * Limits to max 30 segments for token efficiency.
 */
export function contourToLLMDescription(analysis: ContourAnalysis): string {
  const { segments, totalDuration, overallIntensity, dynamicRange, speechRatio } = analysis;

  // Limit segments for LLM context
  let summarizedSegments = segments;
  if (segments.length > 30) {
    // Merge adjacent similar segments
    summarizedSegments = [];
    let currentGroup: ContourSegment | null = null;

    for (const seg of segments) {
      if (!currentGroup) {
        currentGroup = { ...seg };
      } else if (currentGroup.intensity === seg.intensity && summarizedSegments.length < 29) {
        // Merge
        const totalDur = currentGroup.duration + seg.duration;
        const w1 = currentGroup.duration / totalDur;
        const w2 = seg.duration / totalDur;
        currentGroup.endTime = seg.endTime;
        currentGroup.duration = totalDur;
        currentGroup.avgAmplitude = currentGroup.avgAmplitude * w1 + seg.avgAmplitude * w2;
        currentGroup.peakAmplitude = Math.max(currentGroup.peakAmplitude, seg.peakAmplitude);
        currentGroup.speechPresence = currentGroup.speechPresence * w1 + seg.speechPresence * w2;
        currentGroup.description = generateSegmentDescription(
          currentGroup.avgAmplitude,
          currentGroup.speechPresence,
          currentGroup.duration
        );
      } else {
        summarizedSegments.push(currentGroup);
        currentGroup = { ...seg };
      }
    }
    if (currentGroup) summarizedSegments.push(currentGroup);
  }

  const segmentDescriptions = summarizedSegments.map((seg, i) =>
    `${i + 1}. [${seg.startTime.toFixed(1)}s - ${seg.endTime.toFixed(1)}s] ${seg.intensity.toUpperCase()}: ${seg.description}`
  ).join('\n');

  return `
AUDIO CONTOUR ANALYSIS
======================
Total Duration: ${totalDuration.toFixed(1)} seconds
Overall Intensity: ${(overallIntensity * 100).toFixed(0)}% (${classifyIntensity(overallIntensity)})
Dynamic Range: ${(dynamicRange * 100).toFixed(0)}% (${dynamicRange > 0.2 ? 'high variation' : dynamicRange > 0.1 ? 'moderate variation' : 'consistent'})
Speech Presence: ${(speechRatio * 100).toFixed(0)}% of time

SEGMENT BREAKDOWN (${summarizedSegments.length} segments):
${segmentDescriptions}

SUGGESTED PARAMETERS:
- Tempo: ${analysis.suggestedTempo} BPM
- Mood: ${analysis.suggestedMood}
`.trim();
}

/**
 * Get contour value at a specific time by interpolation.
 * Useful for real-time volume following.
 */
export function getContourAtTime(
  analysis: ContourAnalysis,
  time: number
): { amplitude: number; speechLikelihood: number } {
  const { points } = analysis;

  if (points.length === 0) {
    return { amplitude: 0.5, speechLikelihood: 0 };
  }

  // Clamp time to valid range
  const clampedTime = Math.max(0, Math.min(time, points[points.length - 1].time));

  // Find surrounding points
  const pointIndex = Math.floor(clampedTime / 0.1); // 100ms resolution
  const idx = Math.min(pointIndex, points.length - 1);

  if (idx >= points.length - 1) {
    return {
      amplitude: points[points.length - 1].amplitude,
      speechLikelihood: points[points.length - 1].speechLikelihood,
    };
  }

  // Linear interpolation between points
  const p1 = points[idx];
  const p2 = points[idx + 1];
  const t = (clampedTime - p1.time) / (p2.time - p1.time);

  return {
    amplitude: p1.amplitude + (p2.amplitude - p1.amplitude) * t,
    speechLikelihood: p1.speechLikelihood + (p2.speechLikelihood - p1.speechLikelihood) * t,
  };
}
