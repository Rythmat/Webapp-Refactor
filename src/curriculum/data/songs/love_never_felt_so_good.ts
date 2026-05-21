import type { Song } from '@/curriculum/types/songLibrary';

export const love_never_felt_so_good: Song = {
  id: 'love_never_felt_so_good',
  title: 'Love Never Felt So Good',
  artist: 'Michael Jackson and Justin Timberlake',
  year: undefined,

  historicalDescription:
    "A posthumous Michael Jackson recording featuring Justin Timberlake, 'Love Never Felt So Good' surfaces decades after its original demo was laid down, reminding the world of Jackson's effortless pop instinct. The collaboration bridges generations, pairing Jackson's timeless groove with Timberlake's modern vocal presence — a bittersweet reminder of what the King of Pop left behind.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 117,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop_rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 3,
      bars: [
        { chords: [], restBars: 7 },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '6 maj/7', chordName: 'E♭/F', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '5 7', chordName: 'D7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '5 7', chordName: 'D7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 1, duration: 4 },
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
            { degree: '2 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'D7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '7 maj/2', chordName: 'F/A', beat: 2, duration: 1 },
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '6 maj', chordName: 'E♭', beat: 3, duration: 1 },
            { degree: '6 maj/7', chordName: 'E♭/F', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '5 7', chordName: 'D7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '5 7', chordName: 'D7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 1, duration: 4 },
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
            { degree: '2 min7', chordName: 'Amin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'D7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '1 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'Fmin7', beat: 2, duration: 1 },
            { degree: '♯7 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯7 maj/♭2', chordName: 'G♭/A♭', beat: 1, duration: 1 },
            { degree: '1 min7', chordName: 'Gmin7', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '6 maj', chordName: 'E♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 maj/7', chordName: 'E♭/F', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i_2',
      label: 'Section I',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '7 maj/2', chordName: 'F/A', beat: 2, duration: 1 },
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj/4', chordName: 'B♭/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=oG08ukJPtR8' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
