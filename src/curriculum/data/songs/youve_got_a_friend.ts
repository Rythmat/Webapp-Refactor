import type { Song } from '@/curriculum/types/songLibrary';

export const youve_got_a_friend: Song = {
  id: 'youve_got_a_friend',
  title: 'You’ve Got A Friend',
  artist: 'James Taylor',
  year: 1971,
  historicalDescription:
    "James Taylor releases 'You've Got A Friend', a cover of Carole King's song from her landmark Tapestry album, becoming one of his signature recordings. The gentle folk ballad captures the intimate, confessional spirit of the early 1970s singer-songwriter movement and earns Taylor a Grammy for Best Pop Vocal Performance. Its message of unconditional friendship resonates across generations, cementing both Taylor and King as defining voices of the era.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk', 'singer_songwriter'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'A', beat: 2, duration: 1 },
            { degree: '♭5 min7', chordName: 'G♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '7 7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
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
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '♭5 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '7 7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
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
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_9',
      label: 'Section I',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '♭5 min7', chordName: 'G♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_10',
      label: 'Section J',
      bars: [
        { chords: [{ degree: '7 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '7 7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_11',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_12',
      label: 'Section L',
      bars: [
        { chords: [{ degree: '7 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '7 7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '7 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_13',
      label: 'Section M',
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_14',
      label: 'Section N',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_15',
      label: 'Section O',
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_16',
      label: 'Section P',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_17',
      label: 'Section Q',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_18',
      label: 'Section R',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_19',
      label: 'Section S',
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_20',
      label: 'Section T',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_21',
      label: 'Section U',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=nKaWQxlTsRM' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
