import type { Song } from '@/curriculum/types/songLibrary';

export const is_this_love: Song = {
  id: 'is_this_love',
  title: 'Is This Love',
  artist: 'Bob Marley',
  year: 1978,
  historicalDescription:
    "Bob Marley releases 'Is This Love', a tender reggae love song that reveals a softer side of the artist better known for protest anthems. Recorded during the Kaya sessions, the track's warm, unhurried groove becomes one of his most universally beloved songs — proof that reggae's gentle pulse can carry pure joy just as powerfully as revolution.",
  key: 'F♯ minor',
  keyRoot: 66,
  mode: 'minor',
  tempo: 124,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['reggae'],
  techniques: [],
  session: { studioId: 'island-studios' },
  credits: [
    { name: 'Karl Pitterson', role: 'engineer' },
    { name: 'Tyrone Downie', role: 'performer' },
    { name: 'Robert Ash', role: 'engineer' },
    { name: 'Rita Marley', role: 'performer', instrument: 'backing-vocals' },
    { name: 'David Madden', role: 'performer', instrument: 'trumpet' },
    { name: 'Vin Gordon', role: 'performer', instrument: 'trombone' },
    {
      name: 'Bob Marley & The Wailers',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'bob-marley-and-the-wailers',
    },
    {
      name: 'Carlton “Carly” Barrett',
      role: 'performer',
      instrument: 'drum-kit',
    },
    {
      name: 'Bob Marley',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'bob-marley',
      primary: true,
    },
    { name: 'Judy Mowatt', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Tyrone Downie', role: 'performer', instrument: 'piano' },
    {
      name: 'Marcia Griffiths',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Aston “Family Man” Barrett',
      role: 'performer',
      instrument: 'electric-bass',
    },
    {
      name: 'Alvin “Seeco” Patterson',
      role: 'performer',
      instrument: 'percussion',
    },
    {
      name: 'Bob Marley',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'bob-marley',
      primary: true,
    },
    { name: 'Tyrone Downie', role: 'performer', instrument: 'hammond-organ' },
    {
      name: 'Bob Marley',
      role: 'vocals',
      artistGlobeId: 'bob-marley',
      primary: true,
    },
    { name: 'Chris Blackwell', role: 'engineer' },
    { name: 'Alex Sadkin', role: 'engineer' },
    { name: 'Glen da Costa', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Junior Marvin', role: 'performer', instrument: 'electric-guitar' },
    { name: 'Bob Marley', role: 'songwriter', artistGlobeId: 'bob-marley' },
  ],
  releases: [{ releaseId: 'bob-marley-and-the-wailers-kaya' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
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
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'D', beat: 3, duration: 1 },
            { degree: '♭7 maj', chordName: 'E', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'D', beat: 3, duration: 1 },
            { degree: '♭7 maj', chordName: 'E', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭3 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '♭7 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=69RdQFDuYPI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bob-marley.webp',
  popularity: 50,
};
