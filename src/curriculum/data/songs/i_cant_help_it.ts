import type { Song } from '@/curriculum/types/songLibrary';

export const i_cant_help_it: Song = {
  id: 'i_cant_help_it',
  title: 'I Can’t Help It',
  artist: 'Michael Jackson',
  year: 1979,
  historicalDescription:
    "Originally recorded for Michael Jackson's 1979 landmark album 'Off the Wall', 'I Can't Help It' is a silky, Stevie Wonder-penned ballad that showcases Jackson's extraordinary vocal tenderness. The 2018 release surfaces the track for a new generation, a reminder that beneath the spectacle of Jackson's later career lay an artist of rare emotional intimacy — one shaped as much by soul and wonder as by pop ambition.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'D♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7alt', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯5 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'A♭min7', beat: 3, duration: 1 },
            { degree: '♯1 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'D♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7alt', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7alt', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'D♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7alt', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7alt', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Fmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'D♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7alt', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'A7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=re3MOe1SBOs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/michael-jackson.webp',
  popularity: 50,
};
