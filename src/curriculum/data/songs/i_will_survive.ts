import type { Song } from '@/curriculum/types/songLibrary';

export const i_will_survive: Song = {
  id: 'i_will_survive',
  title: 'I Will Survive',
  artist: 'Gloria Gaynor',
  year: 1978,
  historicalDescription:
    "Gloria Gaynor releases 'I Will Survive', a disco anthem that transforms personal heartbreak into a universal declaration of resilience. Originally released as a B-side, the song is flipped by popular demand and becomes one of the defining records of the disco era — and far beyond it. Its message of empowerment resonates across generations, making it a staple at everything from dancefloors to protest marches.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7♭5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'E7sus', beat: 1, duration: 4 }],
        },
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
            { degree: '♭7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7♭5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'E7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7♭5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'E7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6dYWe1c3OyU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/gloria-gaynor.webp',
  popularity: 50,
};
