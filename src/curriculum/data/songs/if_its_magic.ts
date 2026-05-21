import type { Song } from '@/curriculum/types/songLibrary';

export const if_its_magic: Song = {
  id: 'if_its_magic',
  title: 'If It’s Magic',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'If It's Magic' on Songs in the Key of Life, a rare moment of stillness in an album overflowing with ambition. Built around Minnie Riperton's guest harp, the song strips back Wonder's vast sonic palette to something fragile and intimate — a quiet meditation on love's mystery. It stands as one of the most tender pieces in his catalog.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop_ballad_slow_rubato'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 5,
      bars: [
        { chords: [] },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '7 7', chordName: 'D♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 2 },
            { degree: '2 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '5 7', chordName: 'B7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 7', chordName: 'F♯7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '2 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 2 },
            { degree: '2 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [
            { degree: '2 7', chordName: 'F♯7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '2 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '5 6', chordName: 'B6', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'E/B', beat: 1, duration: 2 },
            { degree: '2 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '2 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'B7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '1 maj/5', chordName: 'E/B', beat: 3, duration: 1 },
            { degree: '1 maj/♭5', chordName: 'E/B♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj/3', chordName: 'B/G♯', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'E', beat: 4, duration: 1 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=fX36mGEqfw4' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
