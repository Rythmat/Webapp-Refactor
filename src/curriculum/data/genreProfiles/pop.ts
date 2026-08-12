import type { GenreProfile } from '../../types/genreProfile';

export const popProfile: GenreProfile = {
  id: 'pop',
  displayName: 'Pop',
  accentColor: '#E91E8C',
  tagline: 'The hook. The story. The soundtrack of your life.',

  history: `Pop is the music people sing back to themselves on the drive home. Born from the post-war collision of rock 'n' roll, R&B, and Tin Pan Alley songcraft, it became the genre that absorbs everything — soul, country, disco, electronic — and returns it as a melody you can't forget. Bands like the Beatles built the modern verse-chorus form, and the Beach Boys layered harmony into something cinematic. ABBA proved a melody could carry across any language, paving the way for international multi-language stars from Andrea Bocelli to BTS. Singer-songwriters from Elton John to John Legend, Tori Amos to Sara Bareilles used the piano as a vehicle for the voice, bridging rock, R&B, and jazz. Whitney Houston and Mariah Carey redefined what that voice could do. Michael Jackson became the King of Pop by making the world dance. Prince made it wild and Beyoncé made it monumental. Bruno Mars rebuilt funk and soul as #1 pop hits. Today, mega-artists like Taylor Swift and Olivia Rodrigo write confessional pop the way novelists write chapters; Coldplay builds stadium-sized hooks on the shoulders of bands like U2; powerhouse singers like Rihanna and Adele blow us away, while Billie Eilish whispers her way into the deep emotional territory. The era and instrumentation change. But a great hook never dies.`,

  primaryArtists: [
    {
      name: 'The Beatles',
      era: '1960s',
      styleRef: 'l1a',
      role: 'Band',
      tracks: [],
    },
    {
      name: 'The Beach Boys',
      era: '1960s',
      styleRef: 'l1a',
      role: 'Band',
      tracks: [],
    },
    {
      name: 'ABBA',
      era: '1970s–80s',
      styleRef: 'l1a',
      role: 'Band',
      tracks: [],
    },
    {
      name: 'Elton John',
      era: '1970s–present',
      styleRef: 'l1a',
      role: 'Pianist / Songwriter',
      tracks: [],
    },
    {
      name: 'Michael Jackson',
      era: '1980s–90s',
      styleRef: 'l1b',
      role: 'Vocalist / Songwriter',
      tracks: [],
    },
    {
      name: 'Whitney Houston',
      era: '1980s–2000s',
      styleRef: 'l1b',
      role: 'Vocalist',
      tracks: [],
    },
    {
      name: 'Prince',
      era: '1980s–2000s',
      styleRef: 'l2a',
      role: 'Multi-instrumentalist',
      tracks: [],
    },
    {
      name: 'Mariah Carey',
      era: '1990s–present',
      styleRef: 'l1b',
      role: 'Vocalist / Songwriter',
      tracks: [],
    },
    {
      name: 'Beyoncé',
      era: '2000s–present',
      styleRef: 'l2a',
      role: 'Vocalist / Songwriter',
      tracks: [],
    },
    {
      name: 'Coldplay',
      era: '2000s–present',
      styleRef: 'l1a',
      role: 'Band',
      tracks: [],
    },
    {
      name: 'Sara Bareilles',
      era: '2000s–present',
      styleRef: 'l1a',
      role: 'Pianist / Songwriter',
      tracks: [],
    },
    {
      name: 'Bruno Mars',
      era: '2010s–present',
      styleRef: 'l2a',
      role: 'Vocalist / Multi-instrumentalist',
      tracks: [],
    },
    {
      name: 'Taylor Swift',
      era: '2010s–present',
      styleRef: 'l1b',
      role: 'Vocalist / Songwriter',
      tracks: [],
    },
    {
      name: 'Billie Eilish',
      era: '2010s–present',
      styleRef: 'l1b',
      role: 'Vocalist / Songwriter',
      tracks: [],
    },
  ],

  subGenres: ['Soft Rock', 'Synthpop', 'Indie Pop', 'Dance Pop', 'Alt Pop'],
  crossoverGenres: ['R&B', 'Rock', 'Folk', 'Hip Hop', 'Electronic'],

  characteristics: [
    'The hook is everything — melody you remember after one listen',
    'Diatonic harmony built from the four pillar chords (1, 4, 5, 6m)',
    'Verse-chorus song form with a clear emotional arc',
    'Vocal-forward mix; instruments support the singer',
    'Four-on-the-floor or backbeat drum feel — the body knows where beat 1 is',
    'Production polish: every element has its place in the frequency spectrum',
  ],

  levels: {
    1: {
      keyCenter: 'C major',
      mode: 'Major Pentatonic',
      keyMidi: 60,
      scaleIntervals: [0, 2, 4, 7, 9],
      scaleNotes: ['C', 'D', 'E', 'G', 'A'],
      tempoRange: '70–110 BPM',
      primaryVoicings: [
        {
          label: '1 Major triad (root pos)',
          symbol: 'C',
          midis: [60, 64, 67],
          description: 'C–E–G — the bedrock pop chord',
        },
        {
          label: 'Power chord of 1',
          symbol: 'C5',
          midis: [60, 67],
          description:
            'C+G — open and key-agnostic, the gateway to moving-bass jams',
        },
      ],
      technique: {
        melody: {
          summary: 'Major pentatonic phrases that sing the chord changes.',
          details: [
            'Scale: C Major Pentatonic [C D E G A] — primary',
            '3-note and 6-note phrases on a 4-bar grid',
            'Anchor on chord tones (1, 3, 5) on strong beats',
          ],
        },
        chords: {
          summary: 'Root-position triads with quarter-note chunking.',
          details: [
            'Vocabulary: 1 maj, 4 maj, 5 maj, 6m — the four pillars',
            'Comping: quarter-note chunking (comp_pop_01)',
            'LH plays root, RH plays the triad — clean separation',
          ],
        },
        bass: {
          summary: 'Root pulse — kick-locked, one note per chord.',
          details: [
            'Notes: chord roots only (Tier 1)',
            'Rhythm: quarter-note pulse, locked to kick',
            'Same-octave landing on beat 1 of every bar',
          ],
        },
        performance: {
          summary: 'Two-hand coordination — LH bass, RH chord.',
          details: [
            'LH: chord root on beats 1+3',
            'RH: triad chunked in quarter notes',
            'Five L1 progressions: 1-4-1-4 / 1-5-4-5-1 / 1-6m-4-5-1 / 1-5-6m-4 / 6m-4-1-5',
          ],
        },
      },
      entryLabel: 'Start Level 1',
      locked: false,
    },
    2: {
      keyCenter: 'C major',
      mode: 'Major Scale (Ionian)',
      keyMidi: 60,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      tempoRange: '75–120 BPM',
      primaryVoicings: [
        {
          label: '1 maj close-position with inversions',
          symbol: 'C',
          midis: [60, 64, 67],
          description:
            'Inversions move smoothly from chord to chord — top voice barely changes',
        },
        {
          label: 'Pedal triad (1+3+5 of IV)',
          symbol: 'F/C',
          midis: [65, 69, 72],
          description:
            'Hold the IV-chord triad, let the bass paint the changes',
        },
        {
          label: '4 maj add 9 (open)',
          symbol: 'Fadd9',
          midis: [65, 69, 72, 74],
          description: 'Adds air and lift — the L2 ballad signature',
        },
      ],
      technique: {
        melody: {
          summary: 'Diatonic phrases using passing tones and scale color.',
          details: [
            'Scale: C Major Ionian [C D E F G A B] — adds 4th and 7th color',
            "4-bar motivic phrases with A-A' call-and-answer shape",
            'Approach tones land on chord tones at chord changes',
          ],
        },
        chords: {
          summary: 'Voice-led triads with pedal-tone textures.',
          details: [
            'Inversions chosen to minimize voice motion (close-position voice leading)',
            'Pedal-triad technique: hold a fixed triad while bass moves',
            'Comping rhythms expand: eighth-chunk, broken-chord, Alberti',
          ],
        },
        bass: {
          summary: 'Slash-bass and chord-arpeggio motion.',
          details: [
            'Bass moves independently from chord roots (slash-bass technique)',
            "Chord-arpeggio bass — the bass line outlines each chord's notes",
            'Eighth-note pulse with passing tones between chord changes',
          ],
        },
        performance: {
          summary: 'LH sustained voicing, RH melodic or arpeggiated.',
          details: [
            'LH holds full triad or pedal-triad voicing for the bar',
            'RH plays melody or Alberti pattern over the held LH chord',
            'Two L2 sub-styles: ballad-Alberti (l2a) and neo-soul-arpeggio (l2b)',
          ],
        },
      },
      entryLabel: 'Start Level 2',
      locked: true,
    },
    3: {
      keyCenter: 'C major',
      mode: 'Coming Soon',
      keyMidi: 60,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleNotes: [],
      tempoRange: 'TBD',
      primaryVoicings: [],
      technique: {
        melody: { summary: 'Coming soon.', details: [] },
        chords: { summary: 'Coming soon.', details: [] },
        bass: { summary: 'Coming soon.', details: [] },
        performance: { summary: 'Coming soon.', details: [] },
      },
      entryLabel: 'Start Level 3',
      locked: true,
    },
  },
};
