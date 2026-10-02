import type { Song } from '@/curriculum/types/songLibrary';

export const if_i_aint_got_you: Song = {
  id: 'if_i_aint_got_you',
  title: 'If I Ain’t Got You',
  artist: 'Alicia Keys',
  year: 2004,
  historicalDescription:
    "Alicia Keys releases 'If I Ain't Got You', a piano-driven soul ballad that becomes one of the defining love songs of the 2000s. Anchored by her commanding voice and sparse arrangement, the song strips back the era's polished pop production to something raw and timeless — a bold statement that real love matters more than fame or fortune.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 116,
  timeSignature: [6, 8],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  session: { studioId: 'kampo-studios' },
  credits: [
    { name: 'Manny Marroquin', role: 'engineer' },
    { name: 'Alicia Keys', role: 'producer', artistGlobeId: 'alicia-keys' },
    {
      name: 'Katreese Barnes',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Hugh McCracken', role: 'performer' },
    { name: 'Darryl Dixon', role: 'performer', instrument: 'french-horn' },
    {
      name: 'Chops Horns',
      role: 'performer',
      instrument: 'french-horn',
      ensemble: true,
    },
    { name: 'Joe Romano', role: 'performer', instrument: 'french-horn' },
    { name: 'Tony Black', role: 'engineer' },
    { name: 'Alicia Keys', role: 'songwriter', artistGlobeId: 'alicia-keys' },
    {
      name: 'Alicia Keys',
      role: 'vocals',
      artistGlobeId: 'alicia-keys',
      primary: true,
    },
    { name: 'Fred Cash', role: 'performer', instrument: 'electric-bass' },
    {
      name: 'Alicia Keys',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'alicia-keys',
      primary: true,
    },
    { name: 'Cindy Mizelle', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Dave Watson', role: 'performer', instrument: 'french-horn' },
    { name: 'Steve Jordan', role: 'performer', instrument: 'drum-kit' },
    { name: 'Paul L. Green', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Arcell Vickers', role: 'performer', instrument: 'organ' },
    {
      name: 'Alicia Keys',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'alicia-keys',
      primary: true,
    },
  ],
  releases: [{ releaseId: 'alicia-keys-the-diary-of-alicia-keys', track: 6 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '♯1 dim7', chordName: 'G♯dim7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'D7', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 2, duration: 5 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'G/B', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'G/B', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 3, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 2, duration: 5 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '1 maj/3', chordName: 'G/B', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '1 maj/3', chordName: 'G/B', beat: 3, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Ju8Hr50Ckwk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/alicia-keys.webp',
  popularity: 50,
};
