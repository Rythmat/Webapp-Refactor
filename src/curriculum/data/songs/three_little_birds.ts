import type { Song } from '@/curriculum/types/songLibrary';

export const three_little_birds: Song = {
  id: 'three_little_birds',
  title: 'Three Little Birds',
  artist: 'Bob Marley',
  year: 1977,
  historicalDescription:
    "Bob Marley releases 'Three Little Birds' in 1977, a gentle reggae affirmation whose message — 'don't worry about a thing' — transcends its Jamaican roots to become one of the most universally recognized songs in the world. Simple in construction yet profound in reach, it captures Marley at his most disarming, turning everyday reassurance into something close to a hymn.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 75,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['reggae'],
  techniques: [],
  credits: [
    { name: 'Aston “Family Man” Barrett', role: 'performer' },
    { name: 'Chris Blackwell', role: 'engineer' },
    { name: 'Tyrone Downie', role: 'performer' },
    {
      name: 'Aston “Family Man” Barrett',
      role: 'performer',
      instrument: 'percussion',
    },
    {
      name: 'Carlton “Carly” Barrett',
      role: 'performer',
      instrument: 'percussion',
    },
    { name: 'Rita Marley', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Tyrone Downie', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Alvin “Seeco” Patterson',
      role: 'performer',
      instrument: 'percussion',
    },
    {
      name: 'Bob Marley',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'bob-marley',
      primary: true,
    },
    {
      name: 'Carlton “Carly” Barrett',
      role: 'performer',
      instrument: 'drum-kit',
    },
    { name: 'Junior Marvin', role: 'performer' },
    {
      name: 'Bob Marley',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'bob-marley',
      primary: true,
    },
    {
      name: 'Bob Marley & The Wailers',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'bob-marley-and-the-wailers',
    },
    { name: 'Aston “Family Man” Barrett', role: 'engineer' },
    {
      name: 'Marcia Griffiths',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Bob Marley',
      role: 'vocals',
      artistGlobeId: 'bob-marley',
      primary: true,
    },
    { name: 'Karl Pitterson', role: 'engineer' },
    { name: 'Bob Marley', role: 'songwriter', artistGlobeId: 'bob-marley' },
    { name: 'Tyrone Downie', role: 'performer', instrument: 'percussion' },
    { name: 'Judy Mowatt', role: 'performer', instrument: 'backing-vocals' },
  ],
  releases: [{ releaseId: 'bob-marley-and-the-wailers-exodus', track: 9 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=HNBCVM4KbUM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bob-marley.webp',
  popularity: 50,
};
