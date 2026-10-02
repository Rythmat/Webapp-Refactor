import type { Song } from '@/curriculum/types/songLibrary';

export const car_wash: Song = {
  id: 'car_wash',
  title: 'Car Wash',
  artist: 'Rose Royce',
  year: 1976,
  historicalDescription:
    "Rose Royce releases 'Car Wash' as the title track to the Norman Whitfield-produced soundtrack, capturing the swaggering funk energy of mid-70s soul. The song becomes a massive crossover hit, its irresistible groove and Gwen Dickey's soaring vocals turning a simple setting — a Los Angeles car wash — into a celebration of working-class joy. It defines the moment when funk and soul cinema collide.",
  key: 'D mixolydian',
  keyRoot: 62,
  mode: 'mixolydian',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    {
      name: 'Norman Whitfield',
      role: 'songwriter',
      artistGlobeId: 'norman-whitfield',
    },
  ],
  releases: [{ releaseId: 'rose-royce-car-wash', track: 1 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 2 },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=PkxaunLybuM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/rose-royce.webp',
  popularity: 50,
};
