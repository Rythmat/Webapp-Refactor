import type { Song } from '@/curriculum/types/songLibrary';

export const happy_xmas_war_is_over: Song = {
  id: 'happy_xmas_war_is_over',
  title: 'Happy Xmas (War Is Over)',
  artist: 'John Lennon',
  year: 1989,
  historicalDescription:
    "John Lennon and Yoko Ono's anti-war anthem 'Happy Xmas (War Is Over)' returns to the charts, its message undimmed by time. Originally recorded in 1971 as a protest against the Vietnam War, the song's choral grandeur and simple, devastating refrain — 'War is over, if you want it' — transform it into a perennial holiday standard that doubles as a political rallying cry.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 144,
  timeSignature: [6, 8],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8gWHlHWIaRQ' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/john-lennon.webp',
  popularity: 50,
};
