import type { AudioAnalysis } from './audio-analysis'
import { GENRE_OPTIONS, type GenreOption } from '@/studio-daw/components/AIPromptPanel'

export interface GenreSuggestion {
  genre: GenreOption
  confidence: number
}

/**
 * Suggest genres based on audio analysis features.
 * Uses BPM fit, spectral centroid, percussiveness, and RMS energy.
 * Returns top suggestions sorted by confidence (0-1).
 */
export function suggestGenres(analysis: AudioAnalysis, count = 5): GenreSuggestion[] {
  const scores: GenreSuggestion[] = []

  for (const genre of GENRE_OPTIONS) {
    let score = 0

    // BPM fit (weight 0.4) — how well the detected BPM fits the genre's range
    if (analysis.bpm != null) {
      const [lo, hi] = genre.bpmRange
      const mid = (lo + hi) / 2
      const range = (hi - lo) / 2
      if (analysis.bpm >= lo && analysis.bpm <= hi) {
        // Within range — score based on proximity to midpoint
        const dist = Math.abs(analysis.bpm - mid) / range
        score += 0.4 * (1 - dist * 0.5)
      } else {
        // Outside range — penalty based on distance
        const dist = analysis.bpm < lo ? lo - analysis.bpm : analysis.bpm - hi
        score += 0.4 * Math.max(0, 1 - dist / 40)
      }
    } else {
      // No BPM detected — give neutral score
      score += 0.2
    }

    // Spectral centroid (weight 0.25) — brightness mapping
    const centroid = analysis.spectralCentroid
    const isElectronic = ['ambient-electronic', 'house', 'techno', 'drum-and-bass', 'lo-fi'].includes(genre.id)
    const isAcoustic = ['folk', 'country', 'classical', 'blues', 'jazz'].includes(genre.id)
    const isAmbient = ['ambient-electronic'].includes(genre.id)

    if (isAmbient && centroid < 0.4) {
      score += 0.25 * (1 - centroid)  // Dark = ambient
    } else if (isElectronic && centroid > 0.4) {
      score += 0.25 * centroid  // Bright = electronic
    } else if (isAcoustic && centroid >= 0.25 && centroid <= 0.6) {
      score += 0.25 * (1 - Math.abs(centroid - 0.4) * 2)  // Mid-range = acoustic
    } else {
      score += 0.125  // Neutral
    }

    // Percussive flag (weight 0.2)
    const percussiveGenres = ['hip-hop', 'house', 'techno', 'drum-and-bass', 'rock', 'heavy-metal', 'funk', 'afrobeat']
    if (analysis.isPercussive && percussiveGenres.includes(genre.id)) {
      score += 0.2
    } else if (!analysis.isPercussive && !percussiveGenres.includes(genre.id)) {
      score += 0.15
    } else {
      score += 0.05
    }

    // RMS energy (weight 0.15)
    const rms = analysis.rmsLevel
    const highEnergyGenres = ['rock', 'heavy-metal', 'techno', 'drum-and-bass', 'house']
    const lowEnergyGenres = ['ambient-electronic', 'classical', 'lo-fi', 'folk']

    if (rms > 0.6 && highEnergyGenres.includes(genre.id)) {
      score += 0.15
    } else if (rms < 0.3 && lowEnergyGenres.includes(genre.id)) {
      score += 0.15
    } else {
      score += 0.075
    }

    scores.push({ genre, confidence: Math.min(1, score) })
  }

  return scores
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, count)
}
