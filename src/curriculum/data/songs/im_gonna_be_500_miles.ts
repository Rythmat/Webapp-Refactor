import type { Song } from '@/curriculum/types/songLibrary';

export const im_gonna_be_500_miles: Song = {
  id: 'im_gonna_be_500_miles',
  title: 'I’m Gonna Be (500 Miles)',
  artist: 'The Proclaimers',
  year: 1988,
  historicalDescription:
    "The Proclaimers — Scottish twins Craig and Charlie Reid — release 'I'm Gonna Be (500 Miles)', a relentlessly upbeat folk-rock anthem built on pure, unironic devotion. Its stomping rhythm and thick Edinburgh accents make it an unlikely global earworm, breaking through at a time when British pop is dominated by glossy production. Decades on, it remains one of the most instantly recognizable declarations of loyalty in popular music.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 132,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk', 'rock'],
  techniques: [],
  session: { studioId: 'chipping-norton-recording-studios' },
  credits: [
    { name: 'Dave Whetstone', role: 'performer', instrument: 'accordion' },
    { name: 'Craig Reid', role: 'vocals', artistGlobeId: 'craig-reid' },
    { name: 'Stuart Nisbet', role: 'performer' },
    { name: 'Craig Reid', role: 'songwriter', artistGlobeId: 'craig-reid' },
    { name: 'Gerry Hogan', role: 'performer', instrument: 'pedal-steel' },
    {
      name: 'Pete Wingfield',
      role: 'performer',
      artistGlobeId: 'pete-wingfield',
    },
    { name: 'Steve Shaw', role: 'performer', instrument: 'violin' },
    { name: 'Phil Cranham', role: 'performer', instrument: 'electric-bass' },
    { name: 'Charlie Reid', role: 'vocals', artistGlobeId: 'charlie-reid' },
    { name: 'Stuart Nisbet', role: 'performer', instrument: 'mandolin' },
    { name: 'Paul Robinson', role: 'performer', instrument: 'drum-kit' },
    { name: 'Jerry Donahue', role: 'performer', instrument: 'acoustic-guitar' },
    {
      name: 'Pete Wingfield',
      role: 'producer',
      artistGlobeId: 'pete-wingfield',
    },
    { name: 'Charlie Reid', role: 'songwriter', artistGlobeId: 'charlie-reid' },
    { name: 'Barry Hammond', role: 'engineer' },
    {
      name: 'Charlie Reid',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'charlie-reid',
    },
    { name: 'Jerry Donahue', role: 'performer', instrument: 'electric-guitar' },
  ],
  releases: [{ releaseId: 'the-proclaimers-sunshine-on-leith', track: 1 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        { chords: [], restBars: 8 },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [], restBars: 2 },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=tbNlMtqrYS0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-proclaimers.webp',
  popularity: 50,
};
