import type { Song } from '@/curriculum/types/songLibrary';

export const the_joker: Song = {
  id: 'the_joker',
  title: 'The Joker',
  artist: 'Steve Miller Band',
  year: 1973,
  historicalDescription:
    "The Steve Miller Band releases 'The Joker,' a laid-back, swaggering anthem that becomes one of the defining rock tracks of 1973. Miller weaves together his own self-referential nicknames — the joker, the smoker, the midnight toker — into a chorus so effortlessly catchy it transcends the decade. The song cements Miller's reputation as a craftsman of accessible, groove-driven rock and earns him his first number one hit.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 82,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'John King',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'john-king',
    },
    {
      name: 'Steve Miller',
      role: 'performer',
      instrument: 'slide-guitar',
      artistGlobeId: 'steve-miller',
    },
    { name: 'Steve Miller', role: 'producer', artistGlobeId: 'steve-miller' },
    {
      name: 'Ahmet Ertegun',
      role: 'songwriter',
      artistGlobeId: 'ahmet-ertegun',
    },
    { name: 'Steve Miller', role: 'vocals', artistGlobeId: 'steve-miller' },
    {
      name: 'Steve Miller',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'steve-miller',
    },
    { name: 'Eddie Curtis', role: 'songwriter', artistGlobeId: 'eddie-curtis' },
    {
      name: 'Gerald Johnson',
      role: 'performer',
      artistGlobeId: 'gerald-johnson',
    },
    { name: 'Steve Miller', role: 'songwriter', artistGlobeId: 'steve-miller' },
  ],
  releases: [{ releaseId: 'steve-miller-band-the-joker' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=dV3AziKTBUo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/steve-miller-band.webp',
  popularity: 50,
};
