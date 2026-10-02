import type { Song } from '@/curriculum/types/songLibrary';

export const the_book_i_read: Song = {
  id: 'the_book_i_read',
  title: 'The Book I Read',
  artist: 'Talking Heads',
  year: 1977,
  historicalDescription:
    "Talking Heads release 'The Book I Read' on their debut album, emerging from the fertile art-punk scene of CBGB in New York City. David Byrne's anxious, nervy delivery and the band's jittery rhythms announce a new kind of rock — cerebral, twitchy, and utterly unlike anything coming out of mainstream America in 1977.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 124,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'sundragon-studios' },
  credits: [
    { name: 'Ed Stasium', role: 'engineer' },
    {
      name: 'Talking Heads',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'talking-heads',
    },
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    { name: 'Lance Quinn', role: 'producer', artistGlobeId: 'lance-quinn' },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    { name: 'Tony Bongiovi', role: 'producer', artistGlobeId: 'tony-bongiovi' },
  ],
  releases: [{ releaseId: 'talking-heads-talking-heads-77' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/♭3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/♭3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/♭3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭3', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/♭3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/♭3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 7',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7/♭3', chordName: 'Dmin7/C', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_10',
      label: 'Verse 8',
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_11',
      label: 'Verse 9',
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♭7 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Amin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ZLkmYOGZHzE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
