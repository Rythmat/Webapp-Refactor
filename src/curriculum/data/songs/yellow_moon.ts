import type { Song } from '@/curriculum/types/songLibrary';

export const yellow_moon: Song = {
  id: 'yellow_moon',
  title: 'Yellow Moon',
  artist: 'the Neville Brothers',
  year: 1989,
  historicalDescription:
    "The Neville Brothers release 'Yellow Moon' in 1989, a hypnotic blend of New Orleans funk, soul, and swamp mysticism that becomes one of their most celebrated recordings. Produced by Daniel Lanois, the album marks a breakthrough moment for the family group — finally capturing their live power on record and introducing their deeply rooted sound to a wider audience.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    {
      name: 'Joel Roux Neville',
      role: 'songwriter',
      artistGlobeId: 'joel-roux-neville',
    },
    {
      name: 'Cyril Neville',
      role: 'performer',
      artistGlobeId: 'cyril-neville',
    },
    {
      name: 'Aaron Neville',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'aaron-neville',
    },
    { name: 'Aaron Neville', role: 'vocals', artistGlobeId: 'aaron-neville' },
    {
      name: 'Aaron Neville',
      role: 'performer',
      artistGlobeId: 'aaron-neville',
    },
    {
      name: 'Charles Neville',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'charles-neville',
    },
    { name: 'Tony Hall', role: 'performer', instrument: 'electric-bass' },
    { name: 'Malcolm Burn', role: 'engineer' },
    { name: 'Willie Green III', role: 'performer' },
    {
      name: 'Charles Neville',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'charles-neville',
    },
    { name: 'Brian Stoltz', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Charles Neville',
      role: 'performer',
      artistGlobeId: 'charles-neville',
    },
    {
      name: 'Aaron Neville',
      role: 'songwriter',
      artistGlobeId: 'aaron-neville',
    },
    { name: 'Brian Stoltz', role: 'performer' },
    { name: 'Tony Hall', role: 'performer', instrument: 'percussion' },
    { name: 'Tony Hall', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Cyril Neville', role: 'vocals', artistGlobeId: 'cyril-neville' },
    {
      name: 'Cyril Neville',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'cyril-neville',
    },
    { name: 'Willie Green III', role: 'performer', instrument: 'drum-kit' },
    { name: 'Daniel Lanois', role: 'engineer', artistGlobeId: 'daniel-lanois' },
    { name: 'Art Neville', role: 'performer', artistGlobeId: 'art-neville' },
    { name: 'Brian Stoltz', role: 'performer', instrument: 'percussion' },
    { name: 'Art Neville', role: 'vocals', artistGlobeId: 'art-neville' },
  ],
  releases: [{ releaseId: 'the-neville-brothers-yellow-moon', track: 2 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
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
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=lDzraECGfUY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-neville-brothers.webp',
  popularity: 50,
};
