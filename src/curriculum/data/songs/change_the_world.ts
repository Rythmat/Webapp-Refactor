import type { Song } from '@/curriculum/types/songLibrary';

export const change_the_world: Song = {
  id: 'change_the_world',
  title: 'Change The World',
  artist: 'Eric Clapton',
  year: 1996,
  historicalDescription:
    "Eric Clapton releases 'Change The World' in 1996, a warm, understated blues-pop ballad that reaches audiences far beyond his rock and blues roots. Originally recorded for the Phenomenon soundtrack, the song wins three Grammy Awards including Record of the Year — a late-career triumph that introduces Clapton's soulful restraint to a new generation of listeners.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7/4', chordName: 'Bmin7/A', beat: 1, duration: 2 },
            { degree: '♭6 maj/4', chordName: 'C/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/4', chordName: 'C/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/4', chordName: 'Bmin7/A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '3 dom7', chordName: 'G♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'D♯min7b5', beat: 1, duration: 2 },
            { degree: '3 dom7', chordName: 'G♯7', beat: 3, duration: 1 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 4, duration: 1 },
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
            { degree: '7 min7', chordName: 'D♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '♭6 min7', chordName: 'Cmin7', beat: 3, duration: 1 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'Gdim7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'Gdim7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '3 dom7', chordName: 'G♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'D♯min7b5', beat: 1, duration: 2 },
            { degree: '3 dom7', chordName: 'G♯7', beat: 3, duration: 1 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '7 min7', chordName: 'D♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '♭6 min7', chordName: 'Cmin7', beat: 3, duration: 1 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'Gdim7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'Gdim7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'Gdim7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=kntzQiaFzOQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/eric-clapton.webp',
  popularity: 50,
};
