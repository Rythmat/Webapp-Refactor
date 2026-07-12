import type { GenreProfile } from '../../types/genreProfile';

export const popProfile: GenreProfile = {
  id: 'pop',
  displayName: 'Pop',
  accentColor: '#E91E8C',
  tagline: 'The hook. The chorus. The four chords everyone knows.',

  history: `Pop piano traces back to the Brill Building songwriters of the 1960s, who built entire careers on the verse-chorus song and the diatonic triad — Carole King and her peers proved that a great hook needed nothing more than I, IV, V, and vi. The Beatles took that same simple harmonic vocabulary worldwide, and piano-vocalists like Elton John and Billy Joel turned it into a solo instrument tradition of its own. Where jazz and funk chase extended harmony and rhythmic complexity, pop keeps the chords close to home — the craft is in the melody, the hook, and the feel.

By the 2010s, artists like Adele and Bruno Mars had distilled pop piano to its most iconic form: the vi–IV–I–V loop, played in close, singable voicings, built to support a vocal rather than compete with it. That's the tradition this course teaches — root-position and closest-position triads, steady quarter-note "chunking," and the handful of chord progressions that power most of the songs on the radio.`,

  primaryArtists: [
    {
      name: 'The Beatles',
      era: '1960s',
      styleRef: 'l1a',
      role: 'Songwriting Duo (Lennon–McCartney)',
      tracks: ['Let It Be', 'Hey Jude'],
    },
    {
      name: 'Carole King',
      era: '1960s–70s',
      styleRef: 'l1a',
      role: 'Singer-Songwriter',
      tracks: ["You've Got a Friend", "It's Too Late"],
    },
    {
      name: 'Elton John',
      era: '1970s',
      styleRef: 'l2a',
      role: 'Piano Vocalist',
      tracks: ['Your Song', 'Rocket Man'],
    },
    {
      name: 'Billy Joel',
      era: '1970s–80s',
      styleRef: 'l2b',
      role: 'Piano Vocalist',
      tracks: ['Piano Man', 'Just the Way You Are'],
    },
    {
      name: 'Adele',
      era: '2010s',
      styleRef: 'l3a',
      role: 'Vocalist',
      tracks: ['Someone Like You', 'Rolling in the Deep'],
    },
    {
      name: 'Bruno Mars',
      era: '2010s–present',
      styleRef: 'l3b',
      role: 'Vocalist / Multi-instrumentalist',
      tracks: ['When I Was Your Man', 'Marry You'],
    },
  ],

  subGenres: [
    'Singer-Songwriter Pop',
    'Piano Pop',
    'Synth Pop',
    'Pop Rock',
    'Contemporary Pop Ballad',
  ],
  crossoverGenres: ['Rock', 'R&B', 'Folk', 'Soul', 'Electronic'],

  characteristics: [
    'The hook — a short, singable melodic idea repeated and remembered',
    'Verse-chorus song form built on diatonic triads, not extended jazz harmony',
    'The "four-chord" progression (I–V–vi–IV or vi–IV–I–V) is pop’s most common harmonic engine',
    'Straight, steady quarter-note comping — "chunking" the chord in the pocket, not syncopated stabs',
    'Stepwise or small-interval voice leading between chords keeps inversions smooth and singable',
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
          label: 'C major, root position',
          symbol: 'C',
          midis: [48, 60, 64, 67], // C3+C4+E4+G4
          description:
            'Root position triad — LH plays the bass root, RH stacks root-3rd-5th. The default pop chord shape.',
        },
        {
          label: 'G major, root position',
          symbol: 'G',
          midis: [55, 67, 71, 74], // G3+G4+B4+D5
          description:
            'Root position again on the V chord — same hand shape, just moved. Pop rarely strays from root-position triads at Level 1.',
        },
      ],
      technique: {
        melody: {
          summary:
            'C major pentatonic phrases built around short, repeatable hooks.',
          details: [
            'Scale: C major pentatonic [C D E G A] — no half-steps, nothing to resolve, everything sounds "right"',
            '1–2 bar motifs repeated and slightly varied — the hook, not the epic solo',
            'Phrases land on chord tones (root, 3rd, 5th) on strong beats',
          ],
        },
        chords: {
          summary: 'Root position triads, quarter-note chunking.',
          details: [
            'Voicing: root-3rd-5th, LH doubles the root an octave below',
            'comp_pop_01 — even quarter-note chunks, the defining pop comping feel (no syncopation, no funk stabs)',
            'Progressions stay diatonic: I–V–vi–IV, I–vi–IV–V, I–IV–V–I — the "four chord song" family',
          ],
        },
        bass: {
          summary: 'Root-focused bass, then root-5th for movement.',
          details: [
            'Notes: chord roots only at first, then root+5th',
            'Rhythm: whole notes → beats 1 & 3 → dotted-quarter/eighth push',
            'Locked to the downbeat — pop bass supports the chord, it doesn’t improvise around it',
          ],
        },
        performance: {
          summary:
            'Two-hand coordination: LH root-position chords, RH simple melody.',
          details: [
            'LH: root position triad, held or chunked in quarter notes',
            'RH: major pentatonic melody phrases',
            'Everything reinforces the I–V–vi–IV backbone',
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
      tempoRange: '80–130 BPM',
      primaryVoicings: [
        {
          label: 'G major, 1st inversion shape',
          symbol: 'G',
          midis: [43, 59, 62, 67], // G2+B3+D4+G4
          description:
            'LH plays the plain root, RH voices 3rd-5th-root+octave — the "1st inversion" shape used throughout Level 2 comping.',
        },
        {
          label: 'A minor, 1st inversion shape',
          symbol: 'Am',
          midis: [45, 60, 64, 69], // A2+C4+E4+A4
          description:
            'A step above G — moving a 1st-inversion shape by a 2nd keeps the voicing close and smooth (I–ii).',
        },
        {
          label: 'E minor, root position',
          symbol: 'Em',
          midis: [52, 64, 67, 71], // E3+E4+G4+B4
          description:
            'Root position, not inverted — chosen so it shares two common tones (E, G) with the C 1st-inversion voicing that follows, for the smoothest possible voice leading.',
        },
        {
          label: 'C major, 1st inversion shape',
          symbol: 'C',
          midis: [48, 64, 67, 72], // C3+E4+G4+C5
          description:
            'E-G-C — shares E and G with the Em root position above. Only the top voice (B→C) moves.',
        },
      ],
      technique: {
        melody: {
          summary:
            'G major (Ionian) melodies with wider range and inversion-aware phrasing.',
          details: [
            'Scale: G major [G A B C D E F♯] — full diatonic scale, not just pentatonic',
            'Melodies move by step or small leap to match the close-position chord voicings underneath',
            'vi–IV–I–V (Em–C–G–D) is pop’s most iconic 4-chord loop — nearly every hook in this level sits on it',
          ],
        },
        chords: {
          summary: '1st-inversion voicings with closest-position voice leading.',
          details: [
            'LH always plays the plain root in the bass; RH voices the "1st inversion" shape (3rd-5th-root+octave)',
            'Chords move by step or small interval (2nd, maybe a 3rd/4th) to keep voice leading smooth — never leap a 1st-inversion shape in parallel by a 4th or 5th',
            'Where a leap is unavoidable (e.g. Em→C, a 3rd apart), drop one chord to root position so common tones can hold',
          ],
        },
        bass: {
          summary: 'Root-5th patterns and syncopated pushes.',
          details: [
            'Root + 5th per bar, beats 1 & 3',
            'Dotted-quarter/eighth "push" rhythm — the forward lean of contemporary pop bass',
            'Still locked to the kick/downbeat, never wandering far from the root',
          ],
        },
        performance: {
          summary: 'LH chords, RH melody — full two-hand independence.',
          details: [
            'LH: 1st-inversion (or closest-position) comping',
            'RH: diatonic melody over the vi–IV–I–V / I–ii–ii–I families',
            'Play-along adds drums + bass so the student focuses purely on the two-hand piano part',
          ],
        },
      },
      entryLabel: 'Start Level 2',
      locked: false,
    },

    3: {
      keyCenter: 'C major',
      mode: 'Ionian (Major)',
      keyMidi: 60,
      scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
      scaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      tempoRange: '90–130 BPM',
      primaryVoicings: [
        {
          label: 'C major, root position',
          symbol: 'C',
          midis: [48, 60, 64, 67], // C3+C4+E4+G4
          description:
            'The tonic — same shape as Level 1, now the anchor for longer 8-bar phrases.',
        },
        {
          label: 'E major, root position (secondary dominant, V/vi)',
          symbol: 'E',
          midis: [52, 64, 68, 71], // E3+E4+G#4+B4
          description:
            'Borrowed from A minor’s dominant — the G♮→G♯ color note pulls strongly back to Am, a classic pop "surprise chord."',
        },
      ],
      technique: {
        melody: {
          summary:
            '8-bar phrases across the full diatonic scale, with room for a secondary-dominant color tone.',
          details: [
            'Builds directly on the I–V–vi–IV / vi–IV–I–V vocabulary from Level 2, extended across full 8-bar verse/chorus shapes',
            'Introduces the raised 7th of vi (G♯ over Am, via E major) as a passing color tone — a taste of pop’s "surprise chord" without leaving the major-key sound',
            'Melodic phrasing mirrors real verse → pre-chorus → chorus shape, not just a repeated riff',
          ],
        },
        chords: {
          summary:
            'Root-position and 1st-inversion voicings mixed for the smoothest possible voice leading across longer progressions.',
          details: [
            'Extends Level 2’s closest-position rule across 8-bar loops, choosing root position vs. 1st inversion chord-by-chord based on which keeps the voicing closest to the one before it',
            'Introduces a borrowed secondary dominant (E major → Am) — pop stays triadic even here; the color comes from the borrowed chord, not from jazz extensions',
            'Full comping pattern (quarter-note chunks, dotted-quarter pushes) mixed within a single performance',
          ],
        },
        bass: {
          summary:
            'Full pop bass vocabulary in one performance — roots, 5ths, and rhythmic pushes.',
          details: [
            'Combines root, root-5th, and dotted-quarter/eighth push patterns from Levels 1–2 within the same 8-bar performance',
            'Locks to the kick on the downbeat through every chord change, including the secondary dominant',
            'Sets up the tonic’s return the same way a real pop rhythm section would',
          ],
        },
        performance: {
          summary: 'Full two-hand play-along performance — the complete pop piano part.',
          details: [
            'LH: closest-position chord comping across the full progression',
            'RH: 8-bar melody with verse/chorus shape',
            'Student plays along with a full drum + bass backing track — the complete pop rhythm section',
          ],
        },
      },
      entryLabel: 'Start Level 3',
      locked: false,
    },
  },
};
