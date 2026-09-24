import type { Song } from '@/curriculum/types/songLibrary';

export const pretty_woman: Song = {
  id: 'pretty_woman',
  title: 'Pretty Woman',
  artist: 'Roy Orbison',
  year: 1964,
  historicalDescription:
    "Roy Orbison releases 'Oh, Pretty Woman' in 1964, and its instantly recognizable guitar riff becomes one of the most iconic openings in pop music history. Orbison's operatic vocal range and dramatic delivery set him apart from his contemporaries, bridging the gap between the pre-Beatles era and the British Invasion. The song becomes a massive hit on both sides of the Atlantic, cementing his status as a singular voice in American rock and roll.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 130,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
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
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭7 dom7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 9',
      bars: [
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_10',
      label: 'Verse 10',
      bars: [
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_11',
      label: 'Verse 11',
      bars: [
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=D3a8Seh3Cp4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/roy-orbison.webp',
  popularity: 50,
};
