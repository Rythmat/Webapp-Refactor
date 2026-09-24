import type { Song } from '@/curriculum/types/songLibrary';

export const luck_be_a_lady: Song = {
  id: 'luck_be_a_lady',
  title: 'Luck Be A Lady',
  artist: 'Frank Sinatra',
  year: 1970,
  historicalDescription:
    "Frank Sinatra performs 'Luck Be A Lady', the showstopping number from Frank Loesser's Broadway musical Guys and Dolls. Originally written for the 1950 stage production, the song becomes indelibly associated with Sinatra — a swaggering, big-band declaration that captures his persona as the ultimate ring-a-ding Chairman of the Board at his most theatrically commanding.",
  key: 'D♭ mixolydian',
  keyRoot: 61,
  mode: 'mixolydian',
  tempo: 155,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['jazz'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '♯4 dim7', chordName: 'Gdim7', beat: 2, duration: 1 },
            { degree: '1 maj/5', chordName: 'D♭/A♭', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'G♭', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '♯4 dim7', chordName: 'Gdim7', beat: 2, duration: 1 },
            { degree: '1 maj/5', chordName: 'D♭/A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '7 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      repeatCount: 4,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯5 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 4,
      bars: [
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 7', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 7', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 7', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 7', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 7', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 7', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      repeatCount: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 7', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 7', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 7', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 7', chordName: 'E♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 7', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 7', chordName: 'B♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      repeatCount: 4,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        {
          chords: [
            { degree: '♯2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯5 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=X69P_Vce9vw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/frank-sinatra.webp',
  popularity: 50,
};
