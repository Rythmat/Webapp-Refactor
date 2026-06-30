import type { Song } from '@/curriculum/types/songLibrary';

export const solsbury_hill: Song = {
  id: 'solsbury_hill',
  title: 'Solsbury Hill',
  artist: 'Peter Gabriel',
  year: 1977,
  historicalDescription:
    "Peter Gabriel releases 'Solsbury Hill' as his debut solo single after departing Genesis, the progressive rock band he co-founded and fronted for a decade. The song — built on an unusual 7/4 time signature — becomes an open letter about his decision to leave, capturing a moment of personal liberation on a Somerset hilltop. It announces Gabriel as a singular voice outside the group, launching one of rock's most adventurous solo careers.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 102,
  timeSignature: [7, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 7 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 7 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 7 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 7 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 7 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'F♯', beat: 3, duration: 5 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'F♯7', beat: 3, duration: 5 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 7 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 7 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 7 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 7 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 7 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'F♯', beat: 3, duration: 5 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'F♯7', beat: 3, duration: 5 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 7 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 7 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 7 }] },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 7 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 7 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'F♯', beat: 3, duration: 5 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'F♯7', beat: 3, duration: 5 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 7 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=_OO2PuGz-H8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/peter-gabriel.webp',
  popularity: 50,
};
