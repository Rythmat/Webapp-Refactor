import type { Song } from '@/curriculum/types/songLibrary';

export const respect: Song = {
  id: 'respect',
  title: 'Respect',
  artist: 'Aretha Franklin',
  year: 1967,
  historicalDescription:
    "Aretha Franklin transforms Otis Redding's 1965 plea into a towering demand, spelling out R-E-S-P-E-C-T and claiming it as an anthem for Black women and the civil rights movement alike. Recorded in New York, the track crowns Franklin 'Lady Soul' and becomes one of the defining songs of 1967 — a year already crackling with social upheaval. Few cover versions have so completely eclipsed the original.",
  key: 'C mixolydian',
  keyRoot: 60,
  mode: 'mixolydian',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  session: { studioId: 'atlantic-studios' },
  credits: [
    { name: 'Otis Redding', role: 'songwriter', artistGlobeId: 'otis-redding' },
    { name: 'Tommy Cogbill', role: 'performer', instrument: 'electric-bass' },
    { name: 'Tom Dowd', role: 'arranger', artistGlobeId: 'tom-dowd' },
    { name: 'Melvin Lastie', role: 'performer' },
    {
      name: 'Carolyn Franklin',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Aretha Franklin',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'aretha-franklin',
      primary: true,
    },
    { name: 'Charles Chalmers', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Jimmy Johnson', role: 'performer' },
    { name: 'Roger Hawkins', role: 'performer', instrument: 'drum-kit' },
    { name: 'Spooner Oldham', role: 'performer', instrument: 'organ' },
    { name: 'Tom Dowd', role: 'conductor', artistGlobeId: 'tom-dowd' },
    { name: 'Tom Dowd', role: 'engineer', artistGlobeId: 'tom-dowd' },
    { name: 'Willie Bridges', role: 'performer', instrument: 'baritone-sax' },
    { name: 'Erma Franklin', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Aretha Franklin',
      role: 'vocals',
      artistGlobeId: 'aretha-franklin',
      primary: true,
    },
    { name: 'King Curtis', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Arif Mardin', role: 'arranger', artistGlobeId: 'arif-mardin' },
    { name: 'Jerry Wexler', role: 'producer', artistGlobeId: 'jerry-wexler' },
  ],
  releases: [
    { releaseId: 'aretha-franklin-i-never-loved-a-man-the-way-i-love-you' },
  ],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [
            { degree: '♯4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=A134hShx_gw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/aretha-franklin.webp',
  popularity: 50,
};
