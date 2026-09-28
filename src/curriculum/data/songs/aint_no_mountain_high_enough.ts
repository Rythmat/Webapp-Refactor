import type { Song } from '@/curriculum/types/songLibrary';

export const aint_no_mountain_high_enough: Song = {
  id: 'aint_no_mountain_high_enough',
  title: 'Ain’t No Mountain High Enough',
  artist: 'Marvin Gaye',
  composer: 'Nickolas Ashford and Valerie Simpson',
  year: 1967,
  historicalDescription:
    "Marvin Gaye and Tammi Terrell release 'Ain't No Mountain High Enough' on Motown, a soaring declaration of devotion written by Nickolas Ashford and Valerie Simpson. Their electric vocal chemistry captures the joy and ambition of soul music at its peak, and the song becomes one of the defining duets of the 1960s — later reimagined as a #1 hit by Diana Ross in 1970.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  session: {
    studio: 'Hitsville U.S.A.',
    city: 'Detroit',
    country: 'USA',
    label: 'Tamla',
    recordedYear: 1966,
  },
  credits: [
    { name: 'Marvin Gaye', role: 'vocals', primary: true },
    { name: 'Tammi Terrell', role: 'vocals', primary: true },
    { name: 'Nickolas Ashford', role: 'songwriter' },
    { name: 'Valerie Simpson', role: 'songwriter' },
    { name: 'Harvey Fuqua', role: 'producer' },
    { name: 'Johnny Bristol', role: 'producer' },
    { name: 'The Funk Brothers', role: 'performer', ensemble: true },
    {
      name: 'Detroit Symphony Orchestra',
      role: 'performer',
      instrument: 'string-section',
      ensemble: true,
    },
  ],
  relatedRecordings: [
    { artist: 'Diana Ross', year: 1970, relation: 'cover' },
    { artist: 'Inner Life', year: 1981, relation: 'cover' },
    { artist: 'Boys Town Gang', year: 1981, relation: 'cover' },
    { artist: 'Jimmy Barnes', year: 1992, relation: 'cover' },
    { artist: 'Michael McDonald', year: 2003, relation: 'cover' },
    { artist: 'Jimmy Somerville', year: 2004, relation: 'cover' },
    { artist: 'Jennifer Hudson', year: 2021, relation: 'cover' },
    { artist: 'Cascada', year: 2024, relation: 'cover' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '6 min7/5', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7/5', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'A♭min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'A♭min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '2 maj/♯4', chordName: 'E/G♯', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
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
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
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
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
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
        {
          chords: [
            { degree: '2 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '6 min7/5', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7/5', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'A♭min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'A♭min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '2 maj/♯4', chordName: 'E/G♯', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
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
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
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
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
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
        {
          chords: [
            { degree: '2 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '5 dom7', chordName: 'A7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'A7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'A/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'A/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      bars: [
        {
          chords: [
            { degree: '6 min7/5', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7/5', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♭7 min7/♭6',
              chordName: 'Cmin7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♭7 min7/♭6',
              chordName: 'Cmin7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♭7 min7/♭6',
              chordName: 'Cmin7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♭7 min7/♭6',
              chordName: 'Cmin7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♭7 min7/♭6',
              chordName: 'Cmin7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            {
              degree: '♭7 min7/♭6',
              chordName: 'Cmin7/B♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Fmin7', beat: 1, duration: 1 },
            { degree: '♭2 maj/4', chordName: 'E♭/G', beat: 2, duration: 1 },
            { degree: '♭5 maj', chordName: 'A♭', beat: 3, duration: 1 },
            { degree: '♭3 dom7/5', chordName: 'F7/A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/4', chordName: 'E♭/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=IC5PL0XImjw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/marvin-gaye.webp',
  popularity: 50,
};
