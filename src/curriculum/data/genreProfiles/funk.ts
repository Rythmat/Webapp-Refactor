import type { GenreProfile } from '../../types/genreProfile';

export const funkProfile: GenreProfile = {
  id: 'funk',
  displayName: 'Funk',
  accentColor: '#FEA92A',
  tagline: 'The pocket. The one. The groove.',

  history: `Funk emerged in the mid-1960s from the collision of soul, R&B, and jazz. James Brown stripped rhythm down to its essence \u2014 the downbeat, the groove, the \u201Cone\u201D \u2014 and built everything else around it. By the 1970s, Parliament-Funkadelic expanded that foundation into something cosmic, while Tower of Power and the Headhunters pushed it toward jazz complexity. Funk\u2019s DNA runs through every modern genre that grooves.`,

  primaryArtists: [
    {
      name: 'James Brown',
      era: '1960s\u201370s',
      styleRef: 'l1a',
      role: 'Bandleader',
      tracks: ['Cold Sweat', 'Sex Machine', 'Superbad'],
    },
    {
      name: 'Parliament-Funkadelic',
      era: '1970s',
      styleRef: 'l1a',
      role: 'Collective',
      tracks: ['Flashlight', 'Give Up the Funk'],
    },
    {
      name: 'Tower of Power',
      era: '1970s\u2013present',
      styleRef: 'l2b',
      role: 'Ensemble',
      tracks: ['What Is Hip', 'Soul Vaccination'],
    },
    {
      name: 'Stevie Wonder',
      era: '1970s',
      styleRef: 'l2a',
      role: 'Multi-instrumentalist',
      tracks: ['Superstition', 'Higher Ground'],
    },
    {
      name: 'Herbie Hancock / Headhunters',
      era: '1970s',
      styleRef: 'l3a',
      role: 'Bandleader',
      tracks: ['Chameleon', 'Watermelon Man'],
    },
    {
      name: 'Prince',
      era: '1980s\u20132000s',
      styleRef: 'l3b',
      role: 'Multi-instrumentalist',
      tracks: ['Kiss', 'Sign O the Times'],
    },
  ],

  subGenres: ['P-Funk', 'Jazz-Funk', 'Go-Go', 'Funk Rock', 'Minneapolis Sound'],
  crossoverGenres: ['Jazz', 'R&B', 'Hip Hop', 'Neo Soul', 'Afrobeat'],

  characteristics: [
    'The \u201Cone\u201D \u2014 downbeat emphasis is everything',
    'Sixteenth-note feel with straight (not swung) grid',
    '\u201CTight\u201D funk grooves come from interplay between kick and snare drum, bass line, guitar and keyboard comping rhythms, and synth or horn stabs',
    'Call-and-response between instruments and sections',
    'Space and silence are as important as the notes',
  ],

  levels: {
    1: {
      keyCenter: 'D minor',
      mode: 'Minor Pentatonic',
      keyMidi: 62,
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleNotes: ['D', 'F', 'G', 'A', 'C'],
      tempoRange: '88\u2013108 BPM',
      primaryVoicings: [
        {
          label: 'Dm7 rootless',
          symbol: 'Dm7',
          midis: [38, 60, 65, 69], // D2+C4+F4+A4
          description:
            'D2 root + b7-b3-5 \u2014 the home base of funk keyboard',
        },
        {
          label: 'G7 (Drop the Sizzle)',
          symbol: 'G7',
          midis: [43, 59, 65, 69], // G2+B3+F4+A4
          description:
            'G2 root + 3-b7-9 \u2014 C4\u2192B3 is the only voice that moves',
        },
      ],
      technique: {
        melody: {
          summary: 'D minor pentatonic phrases with strong downbeat anchoring.',
          details: [
            'Scale: D minor pentatonic [D F G A C] \u2014 primary. D minor blues [D F G Ab A C] \u2014 adds the b5 color note.',
            '1-bar phrases \u2014 anchor note on beat 1, short fills between',
            'Call-and-answer shape: cluster \u2192 long held note',
          ],
        },
        chords: {
          summary: 'Dm7 rootless voicing with Funk Stab 1 rhythm.',
          details: [
            'Voicing: C4+F4+A4 (b7+b3+5) \u2014 root is owned by the bass',
            'Stab pattern: beat1, a-of-1, beat3, and-of-3 (120t staccato)',
            'Introduce G7 via Drop the Sizzle: C4\u2192B3',
          ],
        },
        bass: {
          summary: 'Root outline pattern \u2014 kick-locked, D2 throughout.',
          details: [
            'Notes: D2 only (root focus, Tier 1)',
            'Rhythm: beat1 + a-of-1 + beat3 + a-of-3',
            'Locked to kick drum on beats 1 and 3',
          ],
        },
        performance: {
          summary: 'Two-hand coordination: LH roots, RH stabs.',
          details: [
            'LH: D2 root on beats 1+3 (kick-locked)',
            'RH: Dm7 voicing on Funk Stab 1 pattern',
            'One hand sustains while the other plays rhythm',
          ],
        },
      },
      entryLabel: 'Start Level 1',
      locked: false,
    },

    2: {
      keyCenter: 'A minor',
      mode: 'Dorian',
      keyMidi: 69,
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleNotes: ['A', 'B', 'C', 'D', 'E', 'F#', 'G'],
      tempoRange: '85\u2013130 BPM',
      primaryVoicings: [
        {
          label: 'Amin9 rootless',
          symbol: 'Amin9',
          midis: [45, 60, 67, 71], // A2+C4+G4+B4
          description: 'A2 root + b3-b7-9 \u2014 open Headhunters sound',
        },
        {
          label: 'D dom13',
          symbol: 'D13',
          midis: [38, 60, 66, 71], // D2+C4+F#4+B4
          description:
            'D2 root + b7-9-3-13 \u2014 G4\u2192F#4 is the Drop the Sizzle',
        },
        {
          label: 'E dom7#5',
          symbol: 'E7#5',
          midis: [40, 62, 68, 72], // E2+D4+G#4+C5
          description:
            'E2 root + b7-3-#5 \u2014 3-voice altered dominant, resolves to Amin9',
        },
      ],
      technique: {
        melody: {
          summary:
            'A Dorian phrases using the natural 6th (F#) as the signature color note.',
          details: [
            'Scale: A Dorian [A B C D E F# G] \u2014 F# natural is the Dorian fingerprint',
            "2-bar motivic phrases with A-A' call-and-answer shape",
            'Descending G\u2013F#\u2013E ornamental phrase \u2014 the Dorian signature lick',
          ],
        },
        chords: {
          summary:
            'Open 3-voice rootless voicings with Drop the Sizzle voice leading.',
          details: [
            'Am9\u2192D13: G4\u2192F#4 (\u22121 semitone) \u2014 C4 and B4 are common tones',
            'E dom7#5 as the V chord: D4\u2192C4, G#4\u2192G4, C5\u2192B4 \u2014 all voices resolve by step',
            'Stab pattern introduces more syncopation than L1 \u2014 busier comping grid',
          ],
        },
        bass: {
          summary:
            'Octave pop and chromatic approach entering on chord changes.',
          details: [
            'Root on beat 1, octave pop on and-of-1 (A2\u2192A3)',
            'Chromatic approach note before chord changes (Tier 2\u20133)',
            'Ghost notes begin appearing between strong beats',
          ],
        },
        performance: {
          summary: 'LH sustained open voicing, RH independent melody or stabs.',
          details: [
            'LH: hold Am9 or D13 rootless voicing for full bar',
            'RH: play A Dorian melody phrases from the melody section',
            'Climax: both hands lock into unison rhythm for 2-bar peak phrase',
          ],
        },
      },
      entryLabel: 'Start Level 2',
      locked: false,
    },

    3: {
      keyCenter: 'C minor',
      mode: 'Dorian',
      keyMidi: 60,
      scaleIntervals: [0, 2, 3, 5, 7, 9, 10],
      scaleNotes: ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'],
      tempoRange: '90\u2013120 BPM',
      primaryVoicings: [
        {
          label: 'Cm9 rootless',
          symbol: 'Cm9',
          midis: [36, 51, 55, 58, 62], // C2+Eb3+G3+Bb3+D4
          description: 'C2 root + b3-5-b7-9 \u2014 the i chord',
        },
        {
          label: 'F13 rootless',
          symbol: 'F13',
          midis: [41, 51, 55, 57, 62], // F2+Eb3+G3+A3+D4
          description:
            'F2 root + b7-9-3-13 \u2014 Bb3\u2192A3 is the Drop the Sizzle',
        },
        {
          label: 'Ab dom13',
          symbol: 'Ab13',
          midis: [44, 54, 58, 60, 65], // Ab2+Gb3+Bb3+C4+F4
          description: 'Ab2 root + b7-9-3-13 \u2014 the bVI chord',
        },
        {
          label: 'G7alt',
          symbol: 'G7alt',
          midis: [43, 53, 56, 59, 63], // G2+F3+Ab3+B3+Eb4
          description:
            'G2 root + b7-b9-3-#5 \u2014 true altered dominant, resolves to Cm',
        },
      ],
      technique: {
        melody: {
          summary:
            '8-bar motivic architecture with dual functionality over Cm9 and F13.',
          details: [
            "A-B-A-B' structure across 8 bars \u2014 one idea, developed across repeats",
            'Dual functionality: same phrase works over Cm9 AND F13 (Dorian ambiguity)',
            'Final phrase: dense 16th-note run \u2192 long held note (density arc)',
          ],
        },
        chords: {
          summary:
            'Dense 4\u20135 voice extended voicings with chromatic planing and full progression.',
          details: [
            'Cm9\u2192F13 via Drop the Sizzle (Bb3\u2192A3, 1 voice moves, 3 common tones)',
            'Ab13 as the bVI chord \u2014 adds color before G7alt resolution',
            'G7alt (b9+#5) is a true altered dominant \u2014 always resolves to Cm9',
          ],
        },
        bass: {
          summary:
            'Melodic independence \u2014 bass floats against kick with ghost note density.',
          details: [
            'Melodic fills between chord changes, not just root patterns',
            'Ghost-to-strong onset ratio 1.5:1\u20132:1 (Tier 4\u20135)',
            'Rhythmic independence from kick on at least 2 bars per 4-bar loop',
          ],
        },
        performance: {
          summary: 'Full two-hand independence across dense extended voicings.',
          details: [
            'LH: Cm9 / F13 / Ab13 / G7alt full voicing sequence',
            'RH: 8-bar motivic melody with true rhythmic independence from LH',
            'Student chooses role in play-along: melody, chords, or bass',
          ],
        },
      },
      entryLabel: 'Start Level 3',
      locked: false,
    },
  },
};
