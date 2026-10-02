import type { Song } from '@/curriculum/types/songLibrary';

export const i_hope_you_dance: Song = {
  id: 'i_hope_you_dance',
  title: 'I Hope You Dance',
  artist: 'Lee Ann Womack',
  year: 2000,

  historicalDescription:
    "Lee Ann Womack releases 'I Hope You Dance', an inspirational country ballad that becomes one of the defining songs of early 2000s country music. Its message of resilience and seizing life's opportunities resonates far beyond country radio, crossing over to mainstream audiences and earning Womack a Grammy for Best Country Song. The song becomes an anthem played at graduations, weddings, and milestone moments across America.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 76,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk'],
  techniques: [],
  session: { studioId: 'javelina-recording' },
  credits: [
    { name: 'Lisa Cochran', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Mark Wright', role: 'producer', artistGlobeId: 'mark-wright' },
    { name: 'Brent Mason', role: 'performer', instrument: 'electric-guitar' },
    {
      name: 'Nashville String Machine',
      role: 'performer',
      instrument: 'string-section',
      ensemble: true,
    },
    { name: 'David Campbell', role: 'arranger' },
    { name: 'Bergen White', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Eric Darken', role: 'performer', instrument: 'percussion' },
    { name: 'Greg Droman', role: 'engineer' },
    { name: 'Michael Omartian', role: 'performer', instrument: 'accordion' },
    { name: 'Steve Nathan', role: 'performer' },
    { name: 'Lisa Silver', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Tia Sillers', role: 'songwriter', artistGlobeId: 'tia-sillers' },
    { name: 'Paul Franklin', role: 'performer', instrument: 'pedal-steel' },
    { name: 'Jeff Balding', role: 'engineer' },
    {
      name: 'Lee Ann Womack',
      role: 'performer',
      primary: true,
      artistGlobeId: 'lee-ann-womack',
    },
    {
      name: 'Mark Casstevens',
      role: 'performer',
      instrument: 'acoustic-guitar',
    },
    {
      name: 'Sons of the Desert',
      role: 'performer',
      ensemble: true,
      primary: true,
      artistGlobeId: 'sons-of-the-desert',
    },
    { name: 'Chad Cromwell', role: 'performer', instrument: 'drum-kit' },
    { name: 'Michael Rhodes', role: 'performer', instrument: 'electric-bass' },
    { name: 'Pat Flynn', role: 'performer', instrument: 'acoustic-guitar' },
    {
      name: 'Mark D. Sanders',
      role: 'songwriter',
      artistGlobeId: 'mark-d-sanders',
    },
    { name: 'David Campbell', role: 'conductor' },
  ],
  releases: [{ releaseId: 'lee-ann-womack-i-hope-you-dance', track: 2 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'F/A', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'F/A', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'F/A', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '5 maj/7', chordName: 'F/A', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=RV-Z1YwaOiw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/lee-ann-womack.webp',
  popularity: 50,
};
