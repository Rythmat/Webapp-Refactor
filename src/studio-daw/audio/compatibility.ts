import { AudioAnalysis } from './audio-analysis';
import { circleOfFifthsDistance } from './transforms';

export interface CompatibilityIssue {
  type: 'key_clash' | 'tempo_mismatch' | 'spectral_overlap' | 'loudness_imbalance';
  severity: 'low' | 'medium' | 'high';
  affectedTrackIndices: number[];
  description: string;
}

export interface CompatibilityReport {
  overallScore: number;
  issues: CompatibilityIssue[];
}

/**
 * Assess compatibility across a set of track analyses.
 * Returns a score (0-100) and a list of issues.
 */
export function assessCompatibility(analyses: (AudioAnalysis | undefined)[]): CompatibilityReport {
  const issues: CompatibilityIssue[] = [];
  let score = 100;

  const validAnalyses = analyses.map((a, i) => a ? { analysis: a, index: i } : null).filter(Boolean) as { analysis: AudioAnalysis; index: number }[];

  if (validAnalyses.length < 2) {
    return { overallScore: score, issues };
  }

  // 1. Key compatibility: check all pairs
  const keyed = validAnalyses.filter(a => a.analysis.key !== null);
  for (let i = 0; i < keyed.length; i++) {
    for (let j = i + 1; j < keyed.length; j++) {
      const dist = circleOfFifthsDistance(keyed[i].analysis.key!, keyed[j].analysis.key!);
      if (dist > 3) {
        const severity = dist > 4 ? 'high' : 'medium';
        const penalty = dist > 4 ? 15 : 8;
        score -= penalty;
        issues.push({
          type: 'key_clash',
          severity,
          affectedTrackIndices: [keyed[i].index, keyed[j].index],
          description: `Tracks ${keyed[i].index + 1} (${keyed[i].analysis.key}) and ${keyed[j].index + 1} (${keyed[j].analysis.key}) are harmonically distant`,
        });
      }
    }
  }

  // 2. Tempo compatibility (only for tracks with detectable beats)
  const tempoTracks = validAnalyses.filter(a => a.analysis.bpm !== null && a.analysis.isPercussive);
  for (let i = 0; i < tempoTracks.length; i++) {
    for (let j = i + 1; j < tempoTracks.length; j++) {
      const bpm1 = tempoTracks[i].analysis.bpm!;
      const bpm2 = tempoTracks[j].analysis.bpm!;
      const ratio = bpm1 / bpm2;
      const isCompatible = [0.5, 1, 2, 0.75, 1.5].some(r => Math.abs(ratio - r) < 0.05);
      if (!isCompatible) {
        score -= 10;
        issues.push({
          type: 'tempo_mismatch',
          severity: 'medium',
          affectedTrackIndices: [tempoTracks[i].index, tempoTracks[j].index],
          description: `Tracks ${tempoTracks[i].index + 1} (${Math.round(bpm1)} BPM) and ${tempoTracks[j].index + 1} (${Math.round(bpm2)} BPM) have incompatible tempos`,
        });
      }
    }
  }

  // 3. Spectral diversity: check if tracks are too similar in brightness
  const centroids = validAnalyses.map(a => a.analysis.spectralCentroid);
  const centroidRange = Math.max(...centroids) - Math.min(...centroids);
  if (centroidRange < 0.15 && validAnalyses.length >= 3) {
    score -= 10;
    issues.push({
      type: 'spectral_overlap',
      severity: 'low',
      affectedTrackIndices: validAnalyses.map(a => a.index),
      description: 'Tracks have similar spectral content — the mix may sound muddy or lack definition',
    });
  }

  // 4. Loudness balance
  const rmsLevels = validAnalyses.map(a => a.analysis.rmsLevel);
  const maxRMS = Math.max(...rmsLevels);
  const minRMS = Math.min(...rmsLevels);
  if (maxRMS > 0 && minRMS / maxRMS < 0.15 && validAnalyses.length >= 3) {
    const quietest = validAnalyses.reduce((prev, curr) =>
      curr.analysis.rmsLevel < prev.analysis.rmsLevel ? curr : prev
    );
    const loudest = validAnalyses.reduce((prev, curr) =>
      curr.analysis.rmsLevel > prev.analysis.rmsLevel ? curr : prev
    );
    score -= 5;
    issues.push({
      type: 'loudness_imbalance',
      severity: 'low',
      affectedTrackIndices: [quietest.index, loudest.index],
      description: `Track ${loudest.index + 1} is much louder than track ${quietest.index + 1} — consider adjusting volumes`,
    });
  }

  return {
    overallScore: Math.max(0, score),
    issues,
  };
}
