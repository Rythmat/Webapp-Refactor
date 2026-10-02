import type { Song } from '@/curriculum/types/songLibrary';

export const lets_go_crazy: Song = {
  id: 'lets_go_crazy',
  title: 'Let’s Go Crazy',
  artist: 'Prince',
  year: 1984,

  historicalDescription:
    "Prince opens the 'Purple Rain' album and film with 'Let's Go Crazy', a sermon-turned-explosion that fuses funk, rock, and gospel into something entirely his own. The track announces Prince's commercial and artistic peak — a Minneapolis one-man revolution that rewires pop music's relationship with race, genre, and electric guitar heroics.",
  key: 'F♯ major',
  keyRoot: 66,
  mode: 'major',
  tempo: 196,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop'],
  techniques: [],
  credits: [
    { name: 'Brownmark', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Bobby Z.', role: 'performer', instrument: 'drum-machine' },
    {
      name: 'Prince',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'prince',
    },
    { name: 'Lisa Coleman', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Wendy Melvoin', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Wendy Melvoin', role: 'performer', instrument: 'electric-guitar' },
    { name: 'Bobby Z.', role: 'performer' },
    {
      name: 'Prince',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'prince',
    },
    {
      name: 'Prince',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'prince',
    },
    { name: 'Dr. Fink', role: 'performer', instrument: 'synthesizer' },
    { name: 'Dr. Fink', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Prince', role: 'arranger', artistGlobeId: 'prince' },
    { name: 'Prince', role: 'producer', artistGlobeId: 'prince' },
    { name: 'Prince', role: 'songwriter', artistGlobeId: 'prince' },
    { name: 'Lisa Coleman', role: 'performer', instrument: 'synthesizer' },
    { name: 'Bobby Z.', role: 'performer', instrument: 'percussion' },
    {
      name: 'The Revolution',
      role: 'performer',
      ensemble: true,
      primary: true,
      artistGlobeId: 'the-revolution',
    },
    { name: 'Susan Rogers', role: 'engineer' },
    { name: 'Brownmark', role: 'performer', instrument: 'electric-bass' },
    { name: 'David Leonard', role: 'engineer' },
  ],
  releases: [{ releaseId: 'prince-purple-rain', track: 1 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F♯', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'D♯min7', beat: 2, duration: 1 },
            {
              degree: '3 min7/♭5',
              chordName: 'A♯min7/C',
              beat: 3,
              duration: 2,
            },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'C♯7', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus_3',
      label: 'Pre-Chorus 3',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=aXJhDltzYVQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/prince.webp',
  popularity: 50,
};
