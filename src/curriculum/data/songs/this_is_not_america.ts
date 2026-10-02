import type { Song } from '@/curriculum/types/songLibrary';

export const this_is_not_america: Song = {
  id: 'this_is_not_america',
  title: 'This Is Not America',
  artist: 'David Bowie',
  year: 1985,
  historicalDescription:
    "David Bowie collaborates with jazz trumpeter Pat Metheny Group to create 'This Is Not America', the haunting theme for the Cold War spy film 'The Falcon and the Snowman'. The track blurs the line between pop and jazz, its melancholy restraint making it one of Bowie's most quietly devastating recordings — a meditation on disillusionment with the American dream.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  session: { studioId: 'mountain-studios' },
  credits: [
    { name: 'David Bowie', role: 'songwriter', artistGlobeId: 'david-bowie' },
    { name: 'Paul Wertico', role: 'performer', instrument: 'drum-kit' },
    { name: 'Lyle Mays', role: 'songwriter', artistGlobeId: 'lyle-mays' },
    { name: 'Bob Clearmountain', role: 'engineer' },
    {
      name: 'David Bowie',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'david-bowie',
      primary: true,
    },
    {
      name: 'Lyle Mays',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'lyle-mays',
    },
    {
      name: 'David Bowie',
      role: 'performer',
      primary: true,
      artistGlobeId: 'david-bowie',
    },
    { name: 'Pat Metheny', role: 'producer', artistGlobeId: 'pat-metheny' },
    {
      name: 'Pat Metheny',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'pat-metheny',
    },
    { name: 'Lyle Mays', role: 'performer', artistGlobeId: 'lyle-mays' },
    { name: 'Pat Metheny', role: 'songwriter', artistGlobeId: 'pat-metheny' },
    { name: 'Marcellus Frank', role: 'engineer' },
    { name: 'David Bowie', role: 'producer', artistGlobeId: 'david-bowie' },
    { name: 'Steve Rodby', role: 'performer', instrument: 'electric-bass' },
    { name: 'David Richards', role: 'engineer' },
    {
      name: 'Pat Metheny Group',
      role: 'performer',
      ensemble: true,
      primary: true,
      artistGlobeId: 'pat-metheny-group',
    },
    { name: 'Pat Metheny', role: 'performer', artistGlobeId: 'pat-metheny' },
    {
      name: 'Lyle Mays',
      role: 'performer',
      instrument: 'marimba',
      artistGlobeId: 'lyle-mays',
    },
  ],
  releases: [{ releaseId: 'david-bowie-tonight', track: 10 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/♭7', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/♭7', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/♭7', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/♭7', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'bridge_1',
      label: 'Bridge 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/♭7', chordName: 'Dmin7/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7/♭7', chordName: 'Dmin7/F', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
          keyChange: 'G♯ minor',
        },
        {
          chords: [
            {
              degree: '5 min7/♭7',
              chordName: 'D♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '5 min7/♭7',
              chordName: 'D♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'bridge_2',
      label: 'Bridge 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'D♯min7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'G♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '5 min7/♭7',
              chordName: 'D♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '5 min7/♭7',
              chordName: 'D♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ubc3o2KZA4w' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/david-bowie.webp',
  popularity: 50,
};
