import type { Song } from '@/curriculum/types/songLibrary';

export const crazy_in_love: Song = {
  id: 'crazy_in_love',
  title: 'Crazy In Love',
  artist: 'Beyonce',
  year: 2003,
  historicalDescription:
    "Beyoncé launches her solo career with 'Crazy In Love', an explosive debut single that announces her arrival as a force entirely her own. Built around a brassy, irresistible horn loop and featuring Jay-Z, the song dominates the summer of 2003 and redefines what a pop and R&B crossover can sound like. It becomes one of the defining anthems of the decade.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip-hop'],
  techniques: [],
  credits: [
    {
      name: 'Rich Harrison',
      role: 'performer',
      artistGlobeId: 'rich-harrison',
    },
    { name: 'Beyoncé', role: 'producer', artistGlobeId: 'beyonce' },
    { name: 'Jay-Z', role: 'performer', artistGlobeId: 'jay-z' },
    { name: 'Jay-Z', role: 'songwriter', artistGlobeId: 'jay-z' },
    { name: 'Pat Thrall', role: 'engineer' },
    {
      name: 'Rich Harrison',
      role: 'songwriter',
      artistGlobeId: 'rich-harrison',
    },
    { name: 'Beyoncé', role: 'songwriter', artistGlobeId: 'beyonce' },
    {
      name: 'Eugene Record',
      role: 'songwriter',
      artistGlobeId: 'eugene-record',
    },
    {
      name: 'Beyoncé',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'beyonce',
    },
    { name: 'Rich Harrison', role: 'producer', artistGlobeId: 'rich-harrison' },
    { name: 'Tony Maserati', role: 'engineer' },
    { name: 'Jim Caruana', role: 'engineer' },
    {
      name: 'Jay-Z',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'jay-z',
    },
  ],
  releases: [{ releaseId: 'beyonce-dangerously-in-love' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ViwtNLUqkMY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/beyonce.webp',
  popularity: 50,
};
