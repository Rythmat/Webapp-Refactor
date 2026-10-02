import type { Song } from '@/curriculum/types/songLibrary';

export const another_day_lidell: Song = {
  id: 'another_day_lidell',
  title: 'Another Day',
  artist: 'Paul McCartney',
  year: 1971,
  historicalDescription:
    "Paul McCartney releases 'Another Day' in 1971, his first solo single following the Beatles' bitter dissolution. A deceptively breezy portrait of a lonely woman's daily routine, the song signals McCartney's instinct for melodic storytelling outside the band — and proves he doesn't need Lennon, Harrison, or Starr to craft a hook that lodges itself permanently in the public consciousness.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 136,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    { name: 'Denny Seiwell', role: 'performer', instrument: 'percussion' },
    {
      name: 'Linda McCartney',
      role: 'songwriter',
      artistGlobeId: 'linda-mccartney',
    },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'paul-mccartney',
      primary: true,
    },
    {
      name: 'Paul McCartney',
      role: 'vocals',
      artistGlobeId: 'paul-mccartney',
      primary: true,
    },
    { name: 'Tim Geelan', role: 'engineer' },
    { name: 'Denny Seiwell', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'David Spinozza',
      role: 'performer',
      instrument: 'electric-guitar',
    },
    {
      name: 'David Spinozza',
      role: 'performer',
      instrument: 'acoustic-guitar',
    },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'tambourine',
      artistGlobeId: 'paul-mccartney',
      primary: true,
    },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'paul-mccartney',
      primary: true,
    },
    { name: 'Dixon Van Winkle', role: 'engineer' },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'paul-mccartney',
      primary: true,
    },
    {
      name: 'Paul McCartney',
      role: 'producer',
      artistGlobeId: 'paul-mccartney',
    },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'paul-mccartney',
      primary: true,
    },
    {
      name: 'Linda McCartney',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'linda-mccartney',
    },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'paul-mccartney',
      primary: true,
    },
    {
      name: 'Paul McCartney',
      role: 'songwriter',
      artistGlobeId: 'paul-mccartney',
    },
  ],
  releases: [{ releaseId: 'paul-mccartney-ram', track: 1 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=hhoiwDLVTnE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/paul-mccartney.webp',
  popularity: 50,
};
