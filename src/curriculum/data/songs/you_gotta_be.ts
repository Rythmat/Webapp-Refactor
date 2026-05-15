import type { Song } from '@/curriculum/types/songLibrary';

export const you_gotta_be: Song = {
  id: 'you_gotta_be',
  title: 'You Gotta Be',
  artist: 'Des’ree',
  year: 1994,
  historicalDescription:
    "Des'ree releases 'You Gotta Be', a warm, self-empowering anthem that becomes one of the defining feel-good songs of the mid-1990s. The London-born singer's soulful voice and message of resilience cuts through the era's harder urban sounds, earning her international recognition and a place on playlists and film soundtracks for years to come.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['R&B'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj/5', chordName: 'C/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'C/G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj/5', chordName: 'C/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=WRUwSk9UTrA' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
