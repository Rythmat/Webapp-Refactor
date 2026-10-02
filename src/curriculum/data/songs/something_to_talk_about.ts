import type { Song } from '@/curriculum/types/songLibrary';

export const something_to_talk_about: Song = {
  id: 'something_to_talk_about',
  title: 'Something To Talk About',
  artist: 'Bonnie Raitt',
  year: 1991,
  historicalDescription:
    "Bonnie Raitt releases 'Something To Talk About' in 1991, riding the momentum of her commercial renaissance after winning four Grammy Awards for 'Nick of Time'. The country-pop groove becomes one of her signature songs, cementing her status as a mainstream force after decades on the margins of the industry — proof that great artistry eventually finds its audience.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 103,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk', 'pop'],
  techniques: [],
  credits: [
    { name: 'Bonnie Raitt', role: 'producer', artistGlobeId: 'bonnie-raitt' },
    {
      name: 'Bonnie Raitt',
      role: 'performer',
      instrument: 'slide-guitar',
      artistGlobeId: 'bonnie-raitt',
      primary: true,
    },
    { name: 'Ed Cherney', role: 'engineer' },
    {
      name: 'Bonnie Raitt',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'bonnie-raitt',
      primary: true,
    },
    { name: 'Debra Dobkin', role: 'performer', instrument: 'percussion' },
    {
      name: 'Bonnie Raitt',
      role: 'vocals',
      artistGlobeId: 'bonnie-raitt',
      primary: true,
    },
    { name: 'Don Was', role: 'producer', artistGlobeId: 'don-was' },
    { name: 'Curt Bisquera', role: 'performer', instrument: 'drum-kit' },
    { name: 'Harry Bowens', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Sweet Pea Atkinson',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Stephen Bruton',
      role: 'performer',
      instrument: 'acoustic-guitar',
    },
    { name: 'Scott Thurston', role: 'performer' },
    { name: 'David Lasley', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'James Hutchinson',
      role: 'performer',
      instrument: 'electric-bass',
    },
    {
      name: 'Bonnie Raitt',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'bonnie-raitt',
      primary: true,
    },
    {
      name: 'Bonnie Raitt',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'bonnie-raitt',
      primary: true,
    },
    {
      name: 'Shirley Eikhard',
      role: 'songwriter',
      artistGlobeId: 'shirley-eikhard',
    },
    { name: 'Ricky Fataar', role: 'performer', instrument: 'drum-kit' },
  ],
  releases: [{ releaseId: 'bonnie-raitt-luck-of-the-draw', track: 1 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '♯6 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯1 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯6 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯6 maj', chordName: 'F♯', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯6 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯1 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=mJ58TVYNFro' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bonnie-raitt.webp',
  popularity: 50,
};
