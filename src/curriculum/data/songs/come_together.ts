import type { Song } from '@/curriculum/types/songLibrary';

export const come_together: Song = {
  id: 'come_together',
  title: 'Come Together',
  artist: 'The Beatles',
  year: 1969,
  historicalDescription:
    "The Beatles record 'Come Together' in 1969, with John Lennon's swampy, hypnotic groove anchoring one of the band's final creative statements. Originally written as a campaign song for Timothy Leary, it becomes something stranger and more enduring — a portrait of fractured unity from a band on the verge of collapse. It opens Abbey Road and closes an era.",
  key: 'D minor',
  keyRoot: 62,
  mode: 'minor',
  tempo: 82,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'abbey-road-studios' },
  credits: [
    {
      name: 'George Harrison',
      role: 'performer',
      instrument: 'electric-guitar',
    },
    { name: 'George Martin', role: 'producer' },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'paul-mccartney',
    },
    { name: 'Ringo Starr', role: 'performer' },
    { name: 'Phil McDonald', role: 'engineer' },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'john-lennon',
    },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'john-lennon',
    },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'electric-piano',
      artistGlobeId: 'john-lennon',
    },
    { name: 'Ringo Starr', role: 'performer', instrument: 'drum-kit' },
    { name: 'John Lennon', role: 'songwriter', artistGlobeId: 'john-lennon' },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'tambourine',
      artistGlobeId: 'john-lennon',
    },
    {
      name: 'Paul McCartney',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'paul-mccartney',
    },
    {
      name: 'John Lennon',
      role: 'performer',
      instrument: 'handclaps',
      artistGlobeId: 'john-lennon',
    },
    {
      name: 'Paul McCartney',
      role: 'songwriter',
      artistGlobeId: 'paul-mccartney',
    },
    { name: 'Geoff Emerick', role: 'engineer' },
    { name: 'John Lennon', role: 'vocals', artistGlobeId: 'john-lennon' },
  ],
  releases: [{ releaseId: 'the-beatles-abbey-road' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
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
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }],
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
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 3',
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
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 5',
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
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 6',
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
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=45cYwDMibGo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beatles.webp',
  popularity: 50,
};
