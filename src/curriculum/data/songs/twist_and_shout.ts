import type { Song } from '@/curriculum/types/songLibrary';

export const twist_and_shout: Song = {
  id: 'twist_and_shout',
  title: 'Twist And Shout',
  artist: 'The Beatles/Isley Brothers',
  year: 1963,

  historicalDescription:
    "The Isley Brothers record 'Twist and Shout' in 1962, igniting a raw, call-and-response frenzy that captures the explosive energy of early rock and roll. The Beatles then cover it on their debut album 'Please Please Me', with John Lennon delivering a throat-shredding vocal recorded in a single take at the end of a marathon session. The cover introduces the song to a global audience and becomes one of the most iconic moments in Beatles history.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 126,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'abbey-road-studios' },
  credits: [
    {
      name: 'George Harrison',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'paul-mccartney',
    },
    { name: 'Phil Medley', role: 'songwriter', artistGlobeId: 'phil-medley' },
    { name: 'Ringo Starr', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'paul-mccartney',
    },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'john-lennon',
    },
    { name: 'John Lennon', role: 'vocals', artistGlobeId: 'john-lennon' },
    { name: 'Norman Smith', role: 'engineer' },
    {
      name: 'Bert Russell Berns',
      role: 'songwriter',
      artistGlobeId: 'bert-russell-berns',
    },
    {
      name: 'George Harrison',
      role: 'performer',
      instrument: 'electric-guitar',
    },
    { name: 'George Martin', role: 'producer' },
  ],
  releases: [{ releaseId: 'the-beatles-please-please-me' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=cTaqn8_gMR0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beatles.webp',
  popularity: 50,
};
