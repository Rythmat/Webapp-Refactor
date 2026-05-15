import type { Song } from '@/curriculum/types/songLibrary';

export const look_what_i_found: Song = {
  id: 'look_what_i_found',
  title: 'Look What I Found',
  artist: 'Lady Gaga',
  year: 2019,
  historicalDescription:
    "Lady Gaga contributes 'Look What I Found' to the soundtrack of 'A Star Is Born', the 2018 film in which she also stars alongside Bradley Cooper. The pop-rock track showcases Gaga's range beyond her electronic dance roots, reinforcing the film's narrative of an artist discovering her voice. The soundtrack becomes one of the most celebrated musical achievements of her career.",
  key: 'D♭ minor',
  keyRoot: 61,
  mode: 'minor',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 c♯min7', chordName: 'F♯C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 c♯min7', chordName: 'F♯C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 c♯min7', chordName: 'F♯C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'C7(♯5)', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7/7', chordName: 'E7/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj/5', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 c♯min7', chordName: 'F♯C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'C7(♯5)', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '♯7 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '2 maj/♯6', chordName: 'D♯/A♯', beat: 2, duration: 1 },
            { degree: '6 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 c♯min7', chordName: 'F♯C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'C7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7/7', chordName: 'E7/B', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj/5', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/3', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'C7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '♯7 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '2 maj/♯6', chordName: 'D♯/A♯', beat: 2, duration: 1 },
            { degree: '6 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'C7(♯5)', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '♯7 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '2 maj/♯6', chordName: 'D♯/A♯', beat: 2, duration: 1 },
            { degree: '6 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'B/D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/3', chordName: 'A/E', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'C7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '♯7 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '2 maj/♯6', chordName: 'D♯/A♯', beat: 2, duration: 1 },
            { degree: '6 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8uGVZoqJjn4' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
