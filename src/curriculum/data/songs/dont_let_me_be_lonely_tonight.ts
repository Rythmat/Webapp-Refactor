import type { Song } from '@/curriculum/types/songLibrary';

export const dont_let_me_be_lonely_tonight: Song = {
  id: 'dont_let_me_be_lonely_tonight',
  title: 'Don’t Let Me Be Lonely Tonight',
  artist: 'James Taylor',
  year: 1972,
  historicalDescription:
    "James Taylor releases 'Don't Let Me Be Lonely Tonight' in 1972, a quietly devastating ballad that captures the tender vulnerability at the heart of the singer-songwriter movement. Where his earlier hit 'Fire and Rain' announced a confessional new voice, this song deepens that intimacy — spare, searching, and achingly honest. It cements Taylor as one of the defining artists of the early 1970s soft-rock moment.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 75,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk_rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min/♭5', chordName: 'Bmin/A♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/4', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min/♭5', chordName: 'Bmin/A♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/4', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [], restBars: 1 },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=y8cPCYZz6uE' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
