import type { Song } from '@/curriculum/types/songLibrary';

export const cant_help_falling_in_love: Song = {
  id: 'cant_help_falling_in_love',
  title: 'Can’t Help Falling In Love',
  artist: 'Elvis Presley',
  year: 1961,
  historicalDescription:
    "Elvis Presley releases 'Can't Help Falling In Love' in 1961, a tender ballad built on the melody of the 18th-century French song 'Plaisir d'amour.' Far from the hip-shaking rebel of his early Sun Records days, Elvis reveals a softer, more romantic side — and the song becomes one of the most enduring love songs in popular music history.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 68,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'The Surfers', role: 'vocals', ensemble: true },
    { name: 'George Fields', role: 'performer', instrument: 'harmonica' },
    { name: 'Hugo Peretti', role: 'songwriter', artistGlobeId: 'hugo-peretti' },
    { name: 'Scotty Moore', role: 'performer' },
    { name: 'Dudley Brooks', role: 'performer', instrument: 'piano' },
    { name: 'Floyd Cramer', role: 'performer', instrument: 'piano' },
    {
      name: 'Elvis Presley',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'elvis-presley',
    },
    {
      name: 'Luigi Creatore',
      role: 'songwriter',
      artistGlobeId: 'luigi-creatore',
    },
    { name: 'Tiny Timbrell', role: 'performer' },
    { name: 'Bernie Mattinson', role: 'performer', instrument: 'drum-kit' },
    { name: 'Freddie Tavares', role: 'performer', instrument: 'ukulele' },
    {
      name: 'The Jordanaires',
      role: 'performer',
      ensemble: true,
      artistGlobeId: 'the-jordanaires',
    },
    { name: 'D.J. Fontana', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'The Jordanaires',
      role: 'vocals',
      ensemble: true,
      primary: true,
      artistGlobeId: 'the-jordanaires',
    },
    { name: 'Bernie Kaai', role: 'performer', instrument: 'ukulele' },
    { name: 'Alvino Rey', role: 'performer', instrument: 'pedal-steel' },
    { name: 'Bob Moore', role: 'performer' },
    { name: 'Hank Garland', role: 'performer' },
    { name: 'Hal Blaine', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'George David Weiss',
      role: 'songwriter',
      artistGlobeId: 'george-david-weiss',
    },
    { name: 'Dudley Brooks', role: 'performer', instrument: 'celesta' },
    { name: 'Boots Randolph', role: 'performer' },
  ],
  releases: [{ releaseId: 'elvis-presley-blue-hawaii', track: 5 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=vGJTaP6anOU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/elvis-presley.webp',
  popularity: 50,
};
