import type { GenreProfile } from '../../types/genreProfile';

export const bluesProfile: GenreProfile = {
  id: 'blues',
  displayName: 'Blues',
  accentColor: '#1565C0', // NOTE
  tagline: '[NOTE]',
  history: '[NOTE: editorial — 2–3 paragraphs]',
  primaryArtists: [],
  subGenres: [],
  crossoverGenres: [],
  characteristics: [],
  levels: {
    1: {
      keyCenter: '[NOTE]',
      mode: '[NOTE]',
      keyMidi: 60, // NOTE
      scaleIntervals: [0, 2, 3, 5, 7, 10], // NOTE — blues scale
      scaleNotes: [],
      tempoRange: '70–110 BPM', // NOTE
      primaryVoicings: [],
      technique: {
        melody: { summary: '[NOTE]', details: [] },
        chords: { summary: '[NOTE]', details: [] },
        bass: { summary: '[NOTE]', details: [] },
        performance: { summary: '[NOTE]', details: [] },
      },
      entryLabel: 'Start Level 1',
      locked: false,
    },
    2: {
      keyCenter: '[NOTE]',
      mode: '[NOTE]',
      keyMidi: 60, // NOTE
      scaleIntervals: [0, 2, 3, 5, 7, 10], // NOTE
      scaleNotes: [],
      tempoRange: '70–110 BPM', // NOTE
      primaryVoicings: [],
      technique: {
        melody: { summary: '[NOTE]', details: [] },
        chords: { summary: '[NOTE]', details: [] },
        bass: { summary: '[NOTE]', details: [] },
        performance: { summary: '[NOTE]', details: [] },
      },
      entryLabel: 'Start Level 2',
      locked: false,
    },
    3: {
      keyCenter: '[NOTE]',
      mode: '[NOTE]',
      keyMidi: 60, // NOTE
      scaleIntervals: [0, 2, 3, 5, 7, 10], // NOTE
      scaleNotes: [],
      tempoRange: '70–110 BPM', // NOTE
      primaryVoicings: [],
      technique: {
        melody: { summary: '[NOTE]', details: [] },
        chords: { summary: '[NOTE]', details: [] },
        bass: { summary: '[NOTE]', details: [] },
        performance: { summary: '[NOTE]', details: [] },
      },
      entryLabel: 'Start Level 3',
      locked: false,
    },
  },
};
