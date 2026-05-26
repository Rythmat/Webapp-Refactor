import type { Song } from '@/curriculum/types/songLibrary';

export const with_a_little_help_from_my_friends: Song = {
  id: 'with_a_little_help_from_my_friends',
  title: 'With A Little Help From My Friends',
  artist: 'Joe Cocker',
  year: 1968,
  historicalDescription:
    "Joe Cocker releases his debut single, a soulful reimagining of the Beatles' 'With A Little Help From My Friends.' Where the original is breezy and playful, Cocker's raw, gospel-drenched delivery transforms it into something visceral and urgent — announcing a voice that sounds like it carries the weight of the world. His performance at Woodstock the following year cements the song as one of rock's defining moments.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 146,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj/6', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'D/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'D/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=eXV4WyQMHFM' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/joe-cocker.webp',
  popularity: 50,
};
