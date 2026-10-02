import type { Song } from '@/curriculum/types/songLibrary';

export const chains: Song = {
  id: 'chains',
  title: 'Chains',
  artist: 'The Beatles',
  year: 1963,
  historicalDescription:
    "The Beatles record 'Chains', a Gerry Goffin and Carole King composition, for their debut album 'Please Please Me'. One of the few tracks on the album sung by George Harrison, it captures the Fab Four in their earliest phase — hungry, tight, and still channeling the American girl-group sound they grew up idolizing. The cover choice reveals just how deeply Brill Building pop shaped the Beatles before they began writing the world's soundtrack themselves.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 124,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'abbey-road-studios' },
  credits: [
    { name: 'John Lennon', role: 'vocals', artistGlobeId: 'john-lennon' },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'john-lennon',
    },
    { name: 'Carole King', role: 'songwriter', artistGlobeId: 'carole-king' },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'paul-mccartney',
    },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'john-lennon',
    },
    {
      name: 'George Harrison',
      role: 'performer',
      instrument: 'electric-guitar',
    },
    { name: 'George Harrison', role: 'vocals' },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'harmonica',
      artistGlobeId: 'john-lennon',
    },
    { name: 'Gerry Goffin', role: 'songwriter', artistGlobeId: 'gerry-goffin' },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'paul-mccartney',
    },
    { name: 'Paul McCartney', role: 'vocals', artistGlobeId: 'paul-mccartney' },
    { name: 'George Martin', role: 'producer' },
    { name: 'Ringo Starr', role: 'performer', instrument: 'drum-kit' },
    { name: 'Norman Smith', role: 'engineer' },
  ],
  releases: [{ releaseId: 'the-beatles-please-please-me' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
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
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
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
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
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
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
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
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=rJOhavaeJYk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beatles.webp',
  popularity: 50,
};
