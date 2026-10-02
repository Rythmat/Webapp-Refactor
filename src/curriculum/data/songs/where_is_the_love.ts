import type { Song } from '@/curriculum/types/songLibrary';

export const where_is_the_love: Song = {
  id: 'where_is_the_love',
  title: 'Where Is The Love?',
  artist: 'Black Eyed Peas',
  year: 2003,
  historicalDescription:
    "The Black Eyed Peas release 'Where Is The Love?', a rare moment of political introspection in mainstream pop. Addressing terrorism, racism, and gang violence in the wake of 9/11, the song becomes a global anthem of conscience — proving that radio-friendly pop can carry genuine moral weight. It marks a commercial breakthrough for the group and signals their evolution into one of the biggest acts of the 2000s.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    {
      name: 'George Pajon, Jr.',
      role: 'songwriter',
      artistGlobeId: 'george-pajon-jr',
    },
    { name: 'Fergie', role: 'vocals', artistGlobeId: 'fergie' },
    {
      name: 'Black Eyed Peas',
      role: 'performer',
      ensemble: true,
      primary: true,
      artistGlobeId: 'black-eyed-peas',
    },
    { name: 'will.i.am', role: 'songwriter', artistGlobeId: 'will-i-am' },
    {
      name: 'Mike Fratantuno',
      role: 'songwriter',
      artistGlobeId: 'mike-fratantuno',
    },
    { name: 'Ron Fair', role: 'arranger', artistGlobeId: 'ron-fair' },
    { name: 'Ron Fair', role: 'producer', artistGlobeId: 'ron-fair' },
    { name: 'Tony Maserati', role: 'engineer' },
    {
      name: 'Justin Timberlake',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'justin-timberlake',
    },
    { name: 'apl.de.ap', role: 'songwriter', artistGlobeId: 'apl-de-ap' },
    { name: 'will.i.am', role: 'vocals', artistGlobeId: 'will-i-am' },
    { name: 'J. Curtis', role: 'songwriter', artistGlobeId: 'j-curtis' },
    {
      name: 'Justin Timberlake',
      role: 'songwriter',
      artistGlobeId: 'justin-timberlake',
    },
    { name: 'apl.de.ap', role: 'vocals', artistGlobeId: 'apl-de-ap' },
    { name: 'Dylan Dresdow', role: 'engineer' },
    { name: 'Printz Board', role: 'songwriter', artistGlobeId: 'printz-board' },
    { name: 'Taboo', role: 'songwriter', artistGlobeId: 'taboo' },
    { name: 'will.i.am', role: 'producer', artistGlobeId: 'will-i-am' },
    { name: 'Ron Fair', role: 'conductor', artistGlobeId: 'ron-fair' },
    { name: 'Tal Herzberg', role: 'engineer' },
    { name: 'Taboo', role: 'vocals', artistGlobeId: 'taboo' },
  ],
  releases: [{ releaseId: 'black-eyed-peas-elephunk', track: 13 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
          restBars: 7,
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=WpYeekQkAdc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/black-eyed-peas.webp',
  popularity: 50,
};
