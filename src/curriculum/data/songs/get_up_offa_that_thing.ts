import type { Song } from '@/curriculum/types/songLibrary';

export const get_up_offa_that_thing: Song = {
  id: 'get_up_offa_that_thing',
  title: 'Get Up Offa That Thing',
  artist: 'James Brown',
  year: 1976,
  historicalDescription:
    "James Brown releases 'Get Up Offa That Thing' in 1976, a relentless funk command that doubles as a declaration of resilience — Brown responding to critics who had written him off as disco swallowed the charts. The track distills his signature groove to its barest essentials: a driving rhythm, a call-and-response vocal, and a demand that the body move. It proves the Godfather of Soul still owns the dancefloor.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 117,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  session: { studioId: 'criteria-studios' },
  credits: [
    { name: 'Yamma Brown', role: 'songwriter', artistGlobeId: 'yamma-brown' },
    { name: 'Deanna Brown', role: 'songwriter', artistGlobeId: 'deanna-brown' },
    { name: 'Russell Crimes', role: 'performer', instrument: 'trumpet' },
    { name: 'Robert Coleman', role: 'performer' },
    {
      name: '“Sweet” Charles Sherrell',
      role: 'performer',
      instrument: 'clavinet',
    },
    { name: 'St. Clair Pinckney', role: 'performer', instrument: 'tenor-sax' },
    {
      name: 'James Brown',
      role: 'vocals',
      artistGlobeId: 'james-brown',
      primary: true,
    },
    { name: 'Deidre Brown', role: 'songwriter', artistGlobeId: 'deidre-brown' },
    { name: 'Melvin Parker', role: 'performer', instrument: 'drum-kit' },
    { name: 'Hollie Ferris', role: 'performer', instrument: 'trombone' },
    { name: 'James Brown', role: 'arranger', artistGlobeId: 'james-brown' },
    { name: 'James Brown', role: 'producer', artistGlobeId: 'james-brown' },
    { name: 'Jimmy Nolen', role: 'performer' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ZEh9QAmy3lg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/james-brown.webp',
  popularity: 50,
};
