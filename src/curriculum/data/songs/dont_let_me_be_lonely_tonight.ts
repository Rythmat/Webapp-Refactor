import type { Song } from '@/curriculum/types/songLibrary';

export const dont_let_me_be_lonely_tonight: Song = {
  id: 'dont_let_me_be_lonely_tonight',
  title: 'Don’t Let Me Be Lonely Tonight',
  artist: 'James Taylor',
  year: 1972,
  historicalDescription:
    "James Taylor releases 'Don't Let Me Be Lonely Tonight' in 1972, a quietly devastating ballad that captures the tender vulnerability at the heart of the singer-songwriter movement. Where his earlier hit 'Fire and Rain' announced a confessional new voice, this song deepens that intimacy — spare, searching, and achingly honest. It cements Taylor as one of the defining artists of the early 1970s soft-rock moment.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 75,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
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
        {
          chords: [
            { degree: '6 min/♯5', chordName: 'Bmin/A♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7/5', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min/♯5', chordName: 'Bmin/A♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7/5', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [], restBars: 1 },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=y8cPCYZz6uE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/james-taylor.webp',
  popularity: 50,
};
