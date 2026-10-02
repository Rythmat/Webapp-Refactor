import type { Song } from '@/curriculum/types/songLibrary';

export const im_the_only_one: Song = {
  id: 'im_the_only_one',
  title: 'I’m The Only One',
  artist: 'Melissa Etheridge',
  year: 1993,
  historicalDescription:
    "Melissa Etheridge releases 'I'm The Only One', a raw, guitar-driven blues-rock anthem that becomes one of her signature songs. Its unguarded emotional intensity and Etheridge's powerful vocal delivery bring her to mainstream stardom, cementing her place as one of rock's most compelling voices of the 1990s.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 84,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'a-m-studios' },
  credits: [
    {
      name: 'Melissa Etheridge',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'melissa-etheridge',
      primary: true,
    },
    {
      name: 'Melissa Etheridge',
      role: 'vocals',
      artistGlobeId: 'melissa-etheridge',
      primary: true,
    },
    { name: 'Pino Palladino', role: 'performer' },
    {
      name: 'Melissa Etheridge',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'melissa-etheridge',
      primary: true,
    },
    { name: 'Mauricio Lewak', role: 'performer', instrument: 'percussion' },
    { name: 'Hugh Padgham', role: 'engineer' },
    {
      name: 'Melissa Etheridge',
      role: 'songwriter',
      artistGlobeId: 'melissa-etheridge',
    },
    { name: 'Scott Thurston', role: 'performer' },
    { name: 'Mauricio Lewak', role: 'performer', instrument: 'drum-kit' },
    { name: 'Waddy Wachtel', role: 'performer', instrument: 'electric-guitar' },
  ],
  releases: [{ releaseId: 'melissa-etheridge-yes-i-am', track: 1 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [], restBars: 4 },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=xB-QQAM1GDM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/melissa-etheridge.webp',
  popularity: 50,
};
