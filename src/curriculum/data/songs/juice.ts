import type { Song } from '@/curriculum/types/songLibrary';

export const juice: Song = {
  id: 'juice',
  title: 'Juice',
  artist: 'Lizzo',
  year: 2019,
  historicalDescription:
    "Lizzo releases 'Juice', a strutting, self-love anthem that channels the spirit of 1970s funk and 1980s pop into something boldly modern. The Minneapolis-raised artist's unapologetic confidence and genre-blending charisma announce her as a singular voice — one that will soon carry her to mainstream stardom and ignite a cultural conversation around body positivity and self-worth.",
  key: 'D minor',
  keyRoot: 62,
  mode: 'minor',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 8 },
        { chords: [], restBars: 8 },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=XaCrQL_8eMY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/lizzo.webp',
  popularity: 50,
};
