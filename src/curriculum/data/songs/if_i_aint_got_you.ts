import type { Song } from '@/curriculum/types/songLibrary';

export const if_i_aint_got_you: Song = {
  id: 'if_i_aint_got_you',
  title: 'If I Ain’t Got You',
  artist: 'Alicia Keys',
  year: 2004,
  historicalDescription:
    "Alicia Keys releases 'If I Ain't Got You', a piano-driven soul ballad that becomes one of the defining love songs of the 2000s. Anchored by her commanding voice and sparse arrangement, the song strips back the era's polished pop production to something raw and timeless — a bold statement that real love matters more than fame or fortune.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 116,
  timeSignature: [6, 8],

  difficulty: 3,
  genreTags: ['pop_ballad'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '♭2 dim7', chordName: 'G♯dim7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 2, duration: 5 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'G/B', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'G/B', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 3, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 2, duration: 5 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'G/B', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '1 maj/3', chordName: 'G/B', beat: 3, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Ju8Hr50Ckwk' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
