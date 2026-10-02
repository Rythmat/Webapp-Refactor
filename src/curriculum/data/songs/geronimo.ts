import type { Song } from '@/curriculum/types/songLibrary';

export const geronimo: Song = {
  id: 'geronimo',
  title: 'Geronimo',
  artist: 'Sheppard',
  year: 2014,
  historicalDescription:
    "Brisbane siblings George and Amy Sheppard release 'Geronimo', a euphoric indie-pop anthem built on soaring harmonies and an irresistible sing-along chorus. The song becomes a breakthrough moment for Australian indie music, climbing charts across Europe, North America, and Australia and introducing the world to a band with an instinct for melody that transcends borders.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 144,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'analog-heart-studios' },
  credits: [
    {
      name: 'George Sheppard',
      role: 'performer',
      artistGlobeId: 'george-sheppard',
    },
    { name: 'Amy Sheppard', role: 'songwriter', artistGlobeId: 'amy-sheppard' },
    { name: 'Stuart Stuart', role: 'producer', artistGlobeId: 'stuart-stuart' },
    {
      name: 'Emma Sheppard',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'emma-sheppard',
    },
    {
      name: 'George Sheppard',
      role: 'vocals',
      artistGlobeId: 'george-sheppard',
    },
    {
      name: 'George Sheppard',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'george-sheppard',
    },
    {
      name: 'George Sheppard',
      role: 'songwriter',
      artistGlobeId: 'george-sheppard',
    },
    {
      name: 'Dean Gordon',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'dean-gordon',
    },
    { name: 'Jason Bovino', role: 'songwriter', artistGlobeId: 'jason-bovino' },
    { name: 'Jason Bovino', role: 'performer', artistGlobeId: 'jason-bovino' },
    { name: 'Amy Sheppard', role: 'vocals', artistGlobeId: 'amy-sheppard' },
    { name: 'Stuart Stuart', role: 'engineer', artistGlobeId: 'stuart-stuart' },
    {
      name: 'George Sheppard',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'george-sheppard',
    },
    {
      name: 'Jason Bovino',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jason-bovino',
    },
    {
      name: 'Jason Bovino',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'jason-bovino',
    },
  ],
  releases: [{ releaseId: 'sheppard-bombs-away', track: 1 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          restBars: 4,
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }],
          restBars: 2,
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=UL_EXAyGCkw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/sheppard.webp',
  popularity: 50,
};
