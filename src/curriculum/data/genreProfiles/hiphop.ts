import type { GenreProfile } from '../../types/genreProfile';

/**
 * Hip Hop Overview. Mirrors the authored flows (hipHop_v2.ts) and the planning
 * ledger: L1 Trap (C minor), L2 Boom Bap (A minor), L3 Conscious (E minor).
 */
export const hipHopProfile: GenreProfile = {
  id: 'hip-hop',
  displayName: 'Hip Hop',
  // The Studio's Hip Hop violet (GroovesBrowser), so the genre reads the same everywhere.
  accentColor: '#8B5CF6',
  tagline: 'The beat comes first. The loop. The low end.',

  history: `Hip hop began at Bronx parties in the 1970s, when DJs like Kool Herc looped the drum breaks of funk and soul records so dancers never had to stop. By the late 1980s producers were building tracks on samplers — the E-mu SP-1200 and Akai MPC — chopping jazz and soul records into loops over hard, swung drums. That New York sound, boom bap, ran through DJ Premier and Pete Rock, while A Tribe Called Quest, Common, Mos Def and Lauryn Hill brought jazz harmony and conscious lyrics to the same foundation, and J Dilla taught everyone to play behind the beat. In the 2000s Atlanta trap rebuilt hip hop around the Roland TR-808: sub-bass kicks, half-time snares and rolling hi-hats, a sound producers like Metro Boomin and Southside carried to the top of the charts. Kendrick Lamar’s To Pimp a Butterfly (2015) brought jazz and funk musicians back into the room. Underneath every era: a short loop, a deep bass, and drums that do the talking.`,

  primaryArtists: [
    {
      name: 'Metro Boomin',
      era: '2010s–present',
      styleRef: 'l1a',
      role: 'Producer',
      tracks: ['Mask Off (Future)', 'Bad and Boujee (Migos)'],
    },
    {
      name: 'Southside (808 Mafia)',
      era: '2010s–present',
      styleRef: 'l1a',
      role: 'Producer',
      tracks: ['Jumpman (Drake & Future, with Metro Boomin)'],
    },
    {
      name: 'Lex Luger',
      era: '2010s',
      styleRef: 'l1a',
      role: 'Producer',
      tracks: [
        'Hard in da Paint (Waka Flocka Flame)',
        'H•A•M (Jay-Z & Kanye West)',
      ],
    },
    {
      name: 'DJ Premier',
      era: '1980s–present',
      styleRef: 'l2a',
      role: 'Producer / DJ',
      tracks: ['Mass Appeal (Gang Starr)', 'N.Y. State of Mind (Nas)'],
    },
    {
      name: 'Pete Rock',
      era: '1990s–present',
      styleRef: 'l2a',
      role: 'Producer',
      tracks: ['They Reminisce Over You (T.R.O.Y.)'],
    },
    {
      name: 'Dr. Dre',
      era: '1990s–present',
      styleRef: 'l2a',
      role: 'Producer',
      tracks: ["Nuthin' but a 'G' Thang", 'Still D.R.E.'],
    },
    {
      name: 'A Tribe Called Quest',
      era: '1990s',
      styleRef: 'l3a',
      role: 'Group',
      tracks: ['Electric Relaxation', 'Can I Kick It?'],
    },
    {
      name: 'Common',
      era: '1990s–present',
      styleRef: 'l3a',
      role: 'MC',
      tracks: ['The Light', 'I Used to Love H.E.R.'],
    },
    {
      name: 'Mos Def',
      era: '1990s–present',
      styleRef: 'l3a',
      role: 'MC',
      tracks: ['Ms. Fat Booty', 'Umi Says'],
    },
    {
      name: 'Lauryn Hill',
      era: '1990s',
      styleRef: 'l3a',
      role: 'MC / Singer',
      tracks: ['Doo Wop (That Thing)', 'Everything Is Everything'],
    },
    {
      name: 'Kendrick Lamar',
      era: '2010s–present',
      styleRef: 'l3a',
      role: 'MC',
      tracks: ['Alright', 'King Kunta'],
    },
  ],

  subGenres: [
    'Boom Bap',
    'Trap',
    'Conscious Hip Hop',
    'Jazz Rap',
    'G-Funk',
    'Lo-fi Hip Hop',
    'Drill',
  ],
  crossoverGenres: ['R&B', 'Neo Soul', 'Jazz', 'Funk', 'Electronic'],

  characteristics: [
    'The beat comes first — drums and bass carry the record',
    'Short loops: one to four chords, repeated',
    'Minor keys and modal colour: Aeolian, Dorian, Phrygian',
    'Chords sit high, the bass sits low — a wide gap between them',
    'The bass locks to the kick drum',
    'Two feels: swung, behind-the-beat boom bap, and straight half-time trap with rolling hi-hats',
  ],

  levels: {
    1: {
      keyCenter: 'C minor',
      mode: 'Minor Pentatonic',
      keyMidi: 60,
      scaleIntervals: [0, 3, 5, 7, 10],
      scaleNotes: ['C', 'E♭', 'F', 'G', 'B♭'],
      tempoRange: '72–80 BPM (half-time)',
      primaryVoicings: [
        {
          label: 'Cm root position',
          symbol: 'Cm',
          midis: [36, 72, 75, 79], // C2 + C5-Eb5-G5
          description: '1 min — the triad up high, the 808 down low',
        },
        {
          label: 'Cm 1st inversion → Fm',
          symbol: 'Cm',
          midis: [75, 79, 84], // Eb5-G5-C6
          description: 'E♭–G–C to F–A♭–C: C stays on top, two fingers move',
        },
        {
          label: 'G 1st inversion',
          symbol: 'G',
          midis: [71, 74, 79], // B4-D5-G5
          description: '5 maj with B on the bottom — Cm ↔ G keeps G on top',
        },
      ],
      technique: {
        melody: {
          summary:
            'C minor pentatonic, then C Aeolian — each scale, then its phrases.',
          details: [
            'Each scale: up out of time, down out of time, up & down in time',
            'Pentatonic trap phrases over the Cm vamp, then Aeolian phrases',
            'A♭ → G (♭6 to 5): the dark trap move, in the melody and the bass',
          ],
        },
        chords: {
          summary: 'Triads only — the challenge is inversions.',
          details: [
            'Root position first: Cm, Fm, G',
            '1st inversion pairs: Cm 1st inv ↔ Fm root (C on top), Cm root ↔ G 1st inv (G on top)',
            'Two-chord jams to finish: held, then 8th-note chunking (always staccato)',
            'Trap 2-bar comping: a whole note in bar 1, syncopated stabs in bar 2',
          ],
        },
        bass: {
          summary: 'The Trap bass pattern: root on 1, the 5 on the “and” of 3.',
          details: [
            'Start with one note in the rhythm, then change the second note to the 5',
            'Expansion: the 5 becomes a dotted 8th, then a dotted 8th on ♭7 or ♭3 — in bar 1 or bar 2 of the loop, never both',
            'Aeolian version: ♭6 → 5 instead of 5 → 7',
            '808 sound: a sine with a pitch punch and slides',
          ],
        },
        performance: {
          summary: 'LH Trap foundation, RH chords — one groove, two hands.',
          details: [
            'Cm vamp with whole notes, then 8th-note chunking an octave up',
            'Inversion jams with the left hand on the roots',
          ],
        },
      },
      entryLabel: 'Start Level 1',
      locked: false,
    },

    2: {
      keyCenter: 'A minor',
      mode: 'Minor Blues / Dorian',
      keyMidi: 69,
      scaleIntervals: [0, 3, 5, 6, 7, 10],
      scaleNotes: ['A', 'C', 'D', 'E♭', 'E', 'G'],
      tempoRange: '87–90 BPM',
      primaryVoicings: [
        {
          label: 'Em → Dm, 1st inversions',
          symbol: 'Em',
          midis: [40, 79, 83, 88], // E2 + G5-B5-E6
          description:
            'G–B–E sliding to F–A–D — parallel shapes, the bass steps E → D',
        },
        {
          label: 'Am sus4 (1st inv.) → Am',
          symbol: 'Asus4',
          midis: [45, 74, 76, 81], // A2 + D5-E5-A5
          description: 'D–E–A resolving to C–E–A: the D falls to C',
        },
        {
          label: 'Am sus2 → Am',
          symbol: 'Asus2',
          midis: [45, 81, 83, 88], // A2 + A5-B5-E6
          description: 'A–B–E resolving to A–C–E: the B rises to C',
        },
      ],
      technique: {
        melody: {
          summary:
            'A minor blues, then A Dorian — each scale, then its phrases.',
          details: [
            'Blues: the ♭5 (E♭) sliding down; a two-bar call and answer',
            'Dorian: F♯, the bright 6, inside a minor key',
          ],
        },
        chords: {
          summary:
            'Triads and inversions, then sus4 and sus2 — up high, where boom bap keys live.',
          details: [
            'Early: Em 1st inv → Dm 1st inv, one bar each, staccato 8ths',
            'Dm, then Am sus4 resolving to Am',
            'sus2 groove: two chords a bar — Am sus2 Am | Dm sus2 Dm',
            'Play-along chords sit in the C6–C8 range',
          ],
        },
        bass: {
          summary: 'Locked to the kick, then root – 5 – ♭7.',
          details: [
            'One note on every kick, then roots moving by step (E → D, never up a 7th)',
            'Root (quarter), 5 (dotted 8th), ♭7 (dotted 8th)',
            'Finger electric bass; 808 under the sus2 groove',
          ],
        },
        performance: {
          summary: 'Two-hand boom bap keys over the house kit.',
          details: [
            'Parallel jam: LH roots with the kick, RH staccato 1st inversions',
            'sus2 groove: LH root – 5 – ♭7, RH two chords a bar',
          ],
        },
      },
      entryLabel: 'Start Level 2',
      locked: false,
    },

    3: {
      keyCenter: 'E minor',
      mode: 'Phrygian / Dorian / Harmonic Minor',
      keyMidi: 64,
      scaleIntervals: [0, 1, 3, 5, 7, 8, 10],
      scaleNotes: ['E', 'F', 'G', 'A', 'B', 'C', 'D'],
      tempoRange: '77–84 BPM',
      primaryVoicings: [
        {
          label: 'Em9',
          symbol: 'Em9',
          midis: [40, 79, 83, 86, 90], // E2 + G5-B5-D6-F#6
          description: 'LH E, RH G–B–D–F♯: the 3, 5, 7 and 9',
        },
        {
          label: 'A/B',
          symbol: 'A/B',
          midis: [35, 81, 85, 88], // B1 + A5-C#6-E6
          description: 'An A triad over B — the Dorian move from Em9',
        },
        {
          label: 'B7♭9',
          symbol: 'B7b9',
          midis: [47, 81, 84, 87, 90], // B2 + A5-C6-D#6-F#6
          description: 'A–C–D♯–F♯ after Am7: A and C stay, two notes move',
        },
        {
          label: 'D♯dim7 → Em add2',
          symbol: 'D#dim7',
          midis: [75, 78, 81, 84], // D#5-F#5-A5-C6
          description:
            'Harmonic minor: rising 8th-note arpeggios, the bass steps D♯ → E',
        },
      ],
      technique: {
        melody: {
          summary:
            'Three colours of E minor: Phrygian, Dorian, harmonic minor.',
          details: [
            'Phrygian: F, the ♭2, leaning on E',
            'Dorian: C♯, the 6, swung',
            'Harmonic minor: D♯ leading home to E',
          ],
        },
        chords: {
          summary: 'Chords turn jazzy.',
          details: [
            'Em → F (Phrygian triads), staccato 8ths',
            'Em9 → A/B (Dorian), held and swung',
            'D♯dim7 → Em add2, ascending arpeggios',
            'Am7 → B7♭9 → Em9, held and swung',
          ],
        },
        bass: {
          summary: 'Roots that move by step, locked to the kick.',
          details: [
            'E → F, E → B, D♯ → E (up a half step, never down a 7th), A → B → E',
            'Upright bass on the jazzy progressions, 808 on Phrygian and harmonic minor',
          ],
        },
        performance: {
          summary: 'Jazz voicings over boom bap, both hands.',
          details: [
            'Em9 → A/B and Am7 → B7♭9 → Em9 with the left hand on the roots, swung',
            'Phrygian jam: LH E / F, RH staccato 8ths on the 808 kit',
          ],
        },
      },
      entryLabel: 'Start Level 3',
      locked: false,
    },
  },
};
