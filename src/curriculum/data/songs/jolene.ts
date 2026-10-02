import type { Song } from '@/curriculum/types/songLibrary';

export const jolene: Song = {
  id: 'jolene',
  title: 'Jolene',
  artist: 'Dolly Parton',
  year: 1973,
  historicalDescription:
    "Dolly Parton releases 'Jolene', a pleading country ballad built around one of the most memorable opening riffs in the genre's history. The song — in which Parton begs a flame-haired beauty not to steal her man — becomes a crossover phenomenon, transcending country audiences and entering the broader pop consciousness. Decades later, it remains one of the most covered songs ever written.",
  key: 'C♯ minor',
  keyRoot: 61,
  mode: 'minor',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk'],
  techniques: [],
  session: { studioId: 'rca-studio-b' },
  credits: [
    { name: 'Dolores Edgin', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Dolly Parton',
      role: 'vocals',
      artistGlobeId: 'dolly-parton',
      primary: true,
    },
    { name: 'Tom Pick', role: 'engineer' },
    { name: 'Joe Babcock', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Dolly Parton', role: 'songwriter', artistGlobeId: 'dolly-parton' },
    { name: 'Mack Magaha', role: 'performer', instrument: 'violin' },
    { name: 'Jimmy Colvard', role: 'performer', instrument: 'electric-guitar' },
    {
      name: 'Dolly Parton',
      role: 'performer',
      artistGlobeId: 'dolly-parton',
      primary: true,
    },
    { name: 'Bob Ferguson', role: 'producer', artistGlobeId: 'bob-ferguson' },
    { name: 'Bobby Dyson', role: 'performer' },
    { name: 'Johnny Gimble', role: 'performer', instrument: 'violin' },
    {
      name: 'Hurshel Wiginton',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Bobby Thompson', role: 'performer', instrument: 'banjo' },
    { name: 'June Page', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Buck Trent', role: 'performer', instrument: 'banjo' },
    { name: 'Dave Kirby', role: 'performer' },
    { name: 'Stu Basore', role: 'performer', instrument: 'pedal-steel' },
    { name: 'Hargus “Pig” Robbins', role: 'performer', instrument: 'piano' },
    { name: 'Kenny Malone', role: 'performer', instrument: 'drum-kit' },
  ],
  releases: [{ releaseId: 'dolly-parton-jolene' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
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
            { degree: '♭3 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '♭3 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Ixrje2rXLMA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/dolly-parton.webp',
  popularity: 50,
};
