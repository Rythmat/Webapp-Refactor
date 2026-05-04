import type { Song } from '@/curriculum/types/songLibrary';

/**
 * Don't Stop Believin' — Journey (1981)
 *
 * Full chord chart based on the original recording.
 * Key: E major | Tempo: 118 BPM | Time: 4/4
 */
export const dontStopBelievin: Song = {
  id: 'dont_stop_believin',
  title: "Don't Stop Believin'",
  artist: 'Journey',
  year: 1981,

  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 118,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock', 'pop'],
  techniques: ['eighth_note_chunking', 'basic_triads', 'chord_inversions'],

  origin: {
    region: 'San Francisco Bay Area',
    country: 'USA',
    era: 'late_1970s_arena_rock',
    scene: 'arena_rock',
    artistGlobeId: 'journey',
  },

  contentRefs: [
    {
      module: 'studio',
      studioPreset: 'dont_stop_believin_jam',
      displayLabel: 'Jam in Studio',
      refType: 'studio_jam',
    },
  ],

  sections: [
    // ── Intro (8 bars) — iconic piano riff ──
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5/7', chordName: 'B/D♯', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5/7', chordName: 'B/D♯', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
      notes: 'The signature piano riff outlines these chords with eighth notes. Focus on keeping a steady, even rhythm in the right hand while the left hand plays roots.',
    },

    // ── Verse 1 (8 bars) ──
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5/7', chordName: 'B/D♯', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5/7', chordName: 'B/D♯', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
      notes: 'Same progression as the intro. Keep dynamics softer here to allow the vocal to sit on top. The piano pattern continues underneath.',
    },

    // ── Verse 2 (8 bars) ──
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5/7', chordName: 'B/D♯', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5/7', chordName: 'B/D♯', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
      notes: 'Identical chords to Verse 1. Band intensity builds slightly with fuller guitar strums entering.',
    },

    // ── Pre-Chorus (4 bars) ──
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
      notes: 'The harmony simplifies to just the 4 and 5 chords. This builds tension before the chorus release. Try sustained whole-note voicings here.',
    },

    // ── Chorus (8 bars) ──
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 2 }, { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
      notes: 'Full band energy. Note the 5 chord replaces the 5/7 inversion here for a stronger sound. Bar 7 has a quick 6m→4 change on beat 3.',
    },

    // ── Interlude (4 bars) ──
    {
      id: 'interlude',
      label: 'Interlude',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5/7', chordName: 'B/D♯', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
      notes: 'Returns to the intro pattern. Guitar solo begins over these chords.',
    },

    // ── Verse 3 (8 bars) ──
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5/7', chordName: 'B/D♯', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5/7', chordName: 'B/D♯', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
      notes: 'Same verse progression. Full band continues from the interlude energy level.',
    },

    // ── Pre-Chorus 2 (4 bars) ──
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
      notes: 'Same 4-5 tension builder. Push the dynamics here to set up the final chorus.',
    },

    // ── Final Chorus (8 bars, repeated) ──
    {
      id: 'chorus_final',
      label: 'Final Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 2 }, { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
      repeatCount: 2,
      notes: 'Repeat the chorus twice with maximum energy. The song builds to its climax here with layered vocals.',
    },

    // ── Outro (4 bars, fade) ──
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
      repeatCount: 4,
      notes: 'Repeats and fades out. The original recording fades over approximately 4 repetitions of this progression.',
    },
  ],

  audioSources: [
    { provider: 'spotify', uri: 'spotify:track:4bHsxqR3GMrXTxEPLuK5ue' },
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1k8craCGpgs' },
  ],

  artistImageSource: 'none',
  popularity: 95,
};
