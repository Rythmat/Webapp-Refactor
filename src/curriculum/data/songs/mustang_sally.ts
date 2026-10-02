import type { Song } from '@/curriculum/types/songLibrary';

export const mustang_sally: Song = {
  id: 'mustang_sally',
  title: 'Mustang Sally',
  artist: 'Wilson Pickett',
  year: 1966,
  historicalDescription:
    "Wilson Pickett records 'Mustang Sally' in 1966, transforming a minor Mack Rice original into a defining moment of Southern soul. Pickett's raw, commanding vocal performance turns the song into an anthem of R&B swagger, cementing his reputation as 'The Wicked Pickett.' The track becomes so ubiquitous it outlives its era, a staple of every bar band and wedding reception for decades to come.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  session: { studioId: 'fame-studios' },
  credits: [
    { name: 'Spooner Oldham', role: 'performer' },
    { name: 'Tom Dowd', role: 'engineer', artistGlobeId: 'tom-dowd' },
    {
      name: 'Sir Mack Rice',
      role: 'songwriter',
      artistGlobeId: 'sir-mack-rice',
    },
    { name: 'Roger Hawkins', role: 'performer', instrument: 'drum-kit' },
    { name: 'Gene “Bowlegs” Miller', role: 'performer', instrument: 'trumpet' },
    { name: 'Chips Moman', role: 'performer' },
    { name: 'Tommy Cogbill', role: 'performer', instrument: 'electric-bass' },
    { name: 'Jerry Wexler', role: 'producer', artistGlobeId: 'jerry-wexler' },
    { name: 'Eddie Logan', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Charles Chalmers', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Jimmy Johnson', role: 'performer' },
    { name: 'Rick Hall', role: 'producer', artistGlobeId: 'rick-hall' },
    { name: 'Gilbert Caples', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Rick Hall', role: 'engineer', artistGlobeId: 'rick-hall' },
    {
      name: 'Wilson Pickett',
      role: 'vocals',
      artistGlobeId: 'wilson-pickett',
      primary: true,
    },
  ],
  releases: [{ releaseId: 'wilson-pickett-the-wicked-pickett' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=16u6w0cjjrU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/wilson-pickett.webp',
  popularity: 50,
};
