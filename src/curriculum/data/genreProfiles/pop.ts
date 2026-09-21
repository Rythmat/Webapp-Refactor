import type { GenreProfile } from '../../types/genreProfile';

export const popProfile: GenreProfile = {
  id: 'pop',
  displayName: 'Pop',
  accentColor: '#E91E8C',
  tagline: 'The hook. The story. The soundtrack of your life.',

  history: `Pop is the music people sing back to themselves on the drive home. Born from the post-war collision of rock 'n' roll, R&B, and Tin Pan Alley songcraft, it became the genre that absorbs everything — soul, country, disco, electronic — and returns it as a melody you can't forget. The Beatles built the modern verse-chorus form. The Beach Boys layered harmony into something cinematic. ABBA proved a melody could carry across any language. Elton John, Mariah Carey, and Sara Bareilles wrote the piano ballad as a vehicle for the voice. Whitney Houston redefined what that voice could do. Michael Jackson became the King of Pop by making the world dance. Prince made it strange and Beyoncé made it monumental. Bruno Mars rebuilt funk and soul as #1 pop hits. Today, Taylor Swift writes confessional pop the way novelists write chapters; Coldplay builds stadium-sized hooks; Billie Eilish whispers her way into the vulnerable emotional territory. The era and instrumentation change. The hook stays the centerpiece.`,

  primaryArtists: [
    {
      name: 'The Beatles',
      era: '1960s',
      styleRef: 'l1a',
      role: 'Band',
      tracks: ['Let It Be', 'Hey Jude', 'Yesterday'],
    },
    {
      name: 'The Beach Boys',
      era: '1960s',
      styleRef: 'l1a',
      role: 'Band',
      tracks: ['God Only Knows', "Wouldn't It Be Nice"],
    },
    {
      name: 'ABBA',
      era: '1970s–80s',
      styleRef: 'l1a',
      role: 'Band',
      tracks: ['Dancing Queen', 'Mamma Mia', 'The Winner Takes It All'],
    },
    {
      name: 'Elton John',
      era: '1970s–present',
      styleRef: 'l2a',
      role: 'Pianist / Songwriter',
      tracks: ['Tiny Dancer', 'Your Song', 'Rocket Man'],
    },
    {
      name: 'Michael Jackson',
      era: '1980s–90s',
      styleRef: 'l2a',
      role: 'Vocalist / Songwriter',
      tracks: ['Billie Jean', 'Man in the Mirror', 'Thriller'],
    },
    {
      name: 'Whitney Houston',
      era: '1980s–2000s',
      styleRef: 'l2b',
      role: 'Vocalist',
      tracks: ['I Will Always Love You', 'How Will I Know'],
    },
    {
      name: 'Prince',
      era: '1980s–2000s',
      styleRef: 'l2b',
      role: 'Multi-instrumentalist',
      tracks: ['Purple Rain', 'When Doves Cry', 'Kiss'],
    },
    {
      name: 'Mariah Carey',
      era: '1990s–present',
      styleRef: 'l2b',
      role: 'Vocalist / Songwriter',
      tracks: ['Vision of Love', 'We Belong Together'],
    },
    {
      name: 'Beyoncé',
      era: '2000s–present',
      styleRef: 'l3a',
      role: 'Vocalist / Songwriter',
      tracks: ['Halo', 'Single Ladies', 'Love On Top'],
    },
    {
      name: 'Coldplay',
      era: '2000s–present',
      styleRef: 'l3a',
      role: 'Band',
      tracks: ['Clocks', 'Viva la Vida', 'Fix You'],
    },
    {
      name: 'Sara Bareilles',
      era: '2000s–present',
      styleRef: 'l3a',
      role: 'Pianist / Songwriter',
      tracks: ['Love Song', 'Brave', 'Gravity'],
    },
    {
      name: 'Bruno Mars',
      era: '2010s–present',
      styleRef: 'l3b',
      role: 'Vocalist / Multi-instrumentalist',
      tracks: ['Uptown Funk', 'Just the Way You Are', '24K Magic'],
    },
    {
      name: 'Taylor Swift',
      era: '2010s–present',
      styleRef: 'l3b',
      role: 'Vocalist / Songwriter',
      tracks: ['All Too Well', 'Cruel Summer', 'Anti-Hero'],
    },
    {
      name: 'Billie Eilish',
      era: '2010s–present',
      styleRef: 'l3b',
      role: 'Vocalist / Songwriter',
      tracks: ['Bad Guy', 'Happier Than Ever'],
    },
  ],

  subGenres: ['Soft Rock', 'Synthpop', 'Indie Pop', 'Dance Pop', 'Alt Pop'],
  crossoverGenres: ['R&B', 'Rock', 'Folk', 'Hip Hop', 'Electronic'],

  characteristics: [
    'The hook is everything — melody you remember after one listen',
    'Diatonic harmony built from the four pillar chords (1 maj, 4 maj, 5 maj, 6 min)',
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
          label: '1 major triad, root position',
          symbol: 'C',
          midis: [48, 60, 64, 67], // C3+C4+E4+G4
          description:
            'C–E–G — the bedrock pop chord. LH plays the bass root, RH stacks root-3rd-5th.',
        },
        {
          label: 'Power chord of 1',
          symbol: 'C5',
          midis: [48, 55, 60, 67], // C3+G3+C4+G4
          description:
            'C+G — open and key-agnostic, the gateway to moving-bass jams.',
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
            'Vocabulary: 1 maj, 4 maj, 5 maj, 6 min — the four pillars',
            'Comping: quarter-note chunking (comp_pop_quarter_chunk)',
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
            'Five L1 progressions: 1 maj - 4 maj - 1 maj - 4 maj / 1 maj - 5 maj - 4 maj - 5 maj - 1 maj / 1 maj - 6 min - 4 maj - 5 maj - 1 maj / 1 maj - 5 maj - 6 min - 4 maj / 6 min - 4 maj - 1 maj - 5 maj',
          ],
        },
      },
      entryLabel: 'Start Level 1',
      locked: false,
    },

    2: {
      keyCenter: 'G major',
      mode: 'Ionian (Major)',
      keyMidi: 67,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleNotes: ['G', 'A', 'B', 'C', 'D', 'E', 'F♯'],
      tempoRange: '75–120 BPM',
      primaryVoicings: [
        {
          label: '1 maj, close-position (1st inversion)',
          symbol: 'G',
          midis: [43, 59, 62, 67], // G2+B3+D4+G4
          description:
            'Inversions move smoothly from chord to chord — top voice barely changes.',
        },
        {
          label: 'Pedal triad (1+3+5 of 4 maj)',
          symbol: 'C',
          midis: [48, 60, 64, 67], // C3+C4+E4+G4
          description:
            'Hold the 4 maj-chord triad, let the bass paint the changes — the "How to Save a Life" sound.',
        },
        {
          label: '4 maj add 9 (open)',
          symbol: 'Cadd9',
          midis: [48, 55, 64, 74], // C3+G3+E4+D5
          description: 'Adds air and lift — the L2 ballad signature.',
        },
      ],
      technique: {
        melody: {
          summary: 'Diatonic phrases using passing tones and scale color.',
          details: [
            'Scale: G Major Ionian [G A B C D E F♯] — adds the 4th (C) and 7th (F♯) color',
            "4-bar motivic phrases with A-A' call-and-answer shape",
            'Approach tones land on chord tones at chord changes',
          ],
        },
        chords: {
          summary: 'Voice-led triads with pedal-tone textures.',
          details: [
            'Inversions chosen to minimize voice motion (close-position voice leading)',
            'Pedal-triad technique: hold a fixed triad while the bass moves',
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
      locked: false,
    },

    3: {
      keyCenter: 'B♭ major',
      mode: 'Ionian (Major)',
      keyMidi: 70,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleNotes: ['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A'],
      tempoRange: '70–130 BPM',
      primaryVoicings: [
        {
          label: '1 maj add 2 (broken chord)',
          symbol: 'B♭add2',
          midis: [58, 70, 72, 74, 77], // Bb3 + Bb4+C5+D5+F5
          description:
            'The L3 tonic. The added 2nd (C) sits between root and 3rd — thumb breaks away from the fingers for that open pop shimmer.',
        },
        {
          label: '4 maj7 in 7-3-5',
          symbol: 'E♭maj7',
          midis: [51, 62, 67, 70], // Eb2 bass + D4+G4+Bb4
          description:
            'Drop the root from the RH and stack 7-3-5. The LH bass names the chord; the RH keeps it compact and glowing.',
        },
        {
          label: '6 min7 in 7-3-5',
          symbol: 'Gm7',
          midis: [55, 65, 70, 74], // G3 bass + F4+Bb4+D5
          description:
            'Same 7-3-5 shape over the 6 min chord — the whole hand moves as one unit through the changes.',
        },
        {
          label: '1 maj over 3 (slash bass)',
          symbol: 'B♭/D',
          midis: [50, 70, 74, 77], // D3 bass + Bb4+D5+F5
          description:
            'Tonic triad over its 3rd in the bass — the bass line does the storytelling while the chord stays put.',
        },
      ],
      technique: {
        melody: {
          summary:
            'One tonic, three modal colors — then full pop melodies over the track.',
          details: [
            'Scales: B♭ Ionian [B♭ C D E♭ F G A], B♭ Dorian [B♭ C D♭ E♭ F G A♭], B♭ Aeolian [B♭ C D♭ E♭ F G♭ A♭] — same root, three moods',
            '4-, 6-, and 8-note melodies built from contour + phrase rhythm, resolved through B♭ Ionian',
            'Chromatic passing tones (♭3 leaning into the 3rd) add color without leaving the key',
          ],
        },
        chords: {
          summary:
            'Seventh-chord vocabulary in 7-3-5 voicings, plus slash bass and borrowed color.',
          details: [
            'Vocabulary: 1 maj add2 (B♭add2), 4 maj7 (E♭maj7), 6 min7 (Gm7), 3 dom7 (D7), ♯5 dim7 (F♯dim7), 6 min add2 (Gmadd2), 1 maj/3 (B♭/D), 4 min6 (E♭m6), 5 maj add4 (Fadd4)',
            '7-3-5 voicings: RH drops the root and plays 7-3-5 while the LH bass names the chord',
            'Progressions: E♭maj7 - Dm7 - D7 - E♭maj7, and B♭/D - E♭m6 - B♭ with a 3+3+2 syncopated push',
          ],
        },
        bass: {
          summary:
            'Root pulse to walking bass, with chromatic approach tones into every change.',
          details: [
            'B♭ Ionian across the bass register (B♭2 tonic), up and down, in and out of time',
            'Root pulse over B♭ - E♭ - B♭ - F — kick-locked quarter notes',
            'Walking bass over B♭ - Gm7 - Cm7 - F7: root-3rd-5th plus a chromatic approach into the next root',
          ],
        },
        performance: {
          summary:
            'Full two-hand play-along performance — the complete pop piano part.',
          details: [
            'LH bass + RH voicings over B♭ - E♭maj7 - Gm7 - F7 (l3a, pop groove)',
            'Neo-soul crossover progression B♭/D - E♭m6 - F7sus4 - B♭ (l3b)',
            'Full drum + bass backing track, then a Studio project to build your own pop arrangement',
          ],
        },
      },
      entryLabel: 'Start Level 3',
      locked: false,
    },
  },
};
