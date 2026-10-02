import type { Song } from '@/curriculum/types/songLibrary';

export const uptown_funk: Song = {
  id: 'uptown_funk',
  title: 'Uptown Funk',
  artist: 'Bruno Mars',
  year: 2014,
  historicalDescription:
    "Bruno Mars and Mark Ronson release 'Uptown Funk', a love letter to 1980s funk and Minneapolis soul that dominates radio and streaming in a way few songs manage. Its irresistible groove draws a direct line from Prince and James Brown to a new generation of listeners, proving that classic funk still has the power to stop everything and make the world dance.",
  key: 'D minor',
  keyRoot: 62,
  mode: 'minor',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    { name: 'Jeff Bhasker', role: 'performer', artistGlobeId: 'jeff-bhasker' },
    {
      name: 'Devon Gallaspy',
      role: 'songwriter',
      artistGlobeId: 'devon-gallaspy',
    },
    { name: 'Jimmy King', role: 'performer', instrument: 'trumpet' },
    {
      name: 'Bruno Mars',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'bruno-mars',
    },
    { name: 'Mark Ronson', role: 'songwriter', artistGlobeId: 'mark-ronson' },
    { name: 'Bruno Mars', role: 'producer', artistGlobeId: 'bruno-mars' },
    { name: 'Dave Guy', role: 'performer', instrument: 'trumpet' },
    { name: 'Ken Lewis', role: 'engineer' },
    { name: 'Devin Nakao', role: 'engineer' },
    { name: 'Mark Ronson', role: 'producer', artistGlobeId: 'mark-ronson' },
    { name: 'Dwayne Dugger II', role: 'performer', instrument: 'tenor-sax' },
    {
      name: 'Carlos Alomar',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'carlos-alomar',
    },
    {
      name: 'Charlie Wilson',
      role: 'songwriter',
      artistGlobeId: 'charlie-wilson',
    },
    {
      name: 'Bruno Mars',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'bruno-mars',
    },
    {
      name: 'Lonnie Simmons',
      role: 'songwriter',
      artistGlobeId: 'lonnie-simmons',
    },
    {
      name: 'Mark Ronson',
      role: 'performer',
      artistGlobeId: 'mark-ronson',
      primary: true,
    },
    { name: 'Josh Blair', role: 'engineer' },
    {
      name: 'Mark Ronson',
      role: 'performer',
      instrument: 'drum-machine',
      artistGlobeId: 'mark-ronson',
      primary: true,
    },
    { name: 'Charles Moniz', role: 'engineer' },
    { name: 'Ray Mason', role: 'performer', instrument: 'trombone' },
    {
      name: 'Ian Hendrixson-Smith',
      role: 'performer',
      instrument: 'baritone-sax',
    },
    { name: 'Michael Leonhart', role: 'performer', instrument: 'trumpet' },
    { name: 'Jeff Bhasker', role: 'songwriter', artistGlobeId: 'jeff-bhasker' },
    { name: 'Bruno Mars', role: 'songwriter', artistGlobeId: 'bruno-mars' },
    {
      name: 'Trinidad James',
      role: 'songwriter',
      artistGlobeId: 'trinidad-james',
    },
    { name: 'Matthew Stevens', role: 'engineer' },
    {
      name: 'Ronnie Wilson',
      role: 'songwriter',
      artistGlobeId: 'ronnie-wilson',
    },
    { name: 'Mark Ronson', role: 'engineer', artistGlobeId: 'mark-ronson' },
    {
      name: 'Rudolph Taylor',
      role: 'songwriter',
      artistGlobeId: 'rudolph-taylor',
    },
    { name: 'Serban Ghenea', role: 'engineer' },
    {
      name: 'Phredley Brown',
      role: 'performer',
      artistGlobeId: 'phredley-brown',
    },
    { name: 'Riccardo Damian', role: 'engineer' },
    { name: 'Wayne Gordon', role: 'engineer' },
    { name: 'Jamareo Artis', role: 'performer', instrument: 'electric-bass' },
    {
      name: 'Philip Lawrence',
      role: 'songwriter',
      artistGlobeId: 'philip-lawrence',
    },
    { name: 'Neal Sugarman', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Boo Mitchell', role: 'engineer' },
    {
      name: 'Mark Ronson',
      role: 'performer',
      instrument: 'electric-guitar',
      primary: true,
      artistGlobeId: 'mark-ronson',
    },
    { name: 'Inaam Haq', role: 'engineer' },
    {
      name: 'Robert Wilson',
      role: 'songwriter',
      artistGlobeId: 'robert-wilson',
    },
    { name: 'Jeff Bhasker', role: 'producer', artistGlobeId: 'jeff-bhasker' },
    { name: 'Kameron Whalum', role: 'performer', instrument: 'trombone' },
  ],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [], restBars: 3 },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=OPf0YbXqDm0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bruno-mars.webp',
  popularity: 50,
};
