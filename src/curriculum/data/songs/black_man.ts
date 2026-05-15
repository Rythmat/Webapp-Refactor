import type { Song } from '@/curriculum/types/songLibrary';

export const black_man: Song = {
  id: 'black_man',
  title: 'Black Man',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Black Man' as part of his landmark double album 'Songs in the Key of Life' in 1976 — a sprawling, ambitious celebration of Black contributions to American history. The song calls out overlooked heroes by name, weaving funk grooves with a civics lesson, insisting that the American story belongs to everyone who built it. It stands as one of Wonder's most overtly political statements.",
  key: 'F♯ major',
  keyRoot: 66,
  mode: 'major',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 2,
      bars: [{ chords: [], restBars: 3 }, { chords: [] }],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      repeatCount: 6,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      repeatCount: 7,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
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
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      repeatCount: 9,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
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
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 2, duration: 1 },
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 3, duration: 1 },
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 2, duration: 1 },
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 3, duration: 1 },
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 2, duration: 1 },
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 3, duration: 1 },
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 2, duration: 1 },
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 3, duration: 1 },
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      repeatCount: 7,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_r',
      label: 'Section R',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
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
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_t',
      label: 'Section T',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'E/G♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=pEoE2UQXduA' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
