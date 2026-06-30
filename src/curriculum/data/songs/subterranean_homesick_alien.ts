import type { Song } from '@/curriculum/types/songLibrary';

export const subterranean_homesick_alien: Song = {
  id: 'subterranean_homesick_alien',
  title: 'Subterranean Homesick Alien',
  artist: 'Radiohead',
  year: 1995,
  historicalDescription:
    "Radiohead record 'Subterranean Homesick Alien' during the sessions that will become OK Computer, a landmark album that redefines British rock for the late 1990s. The song captures a suburban alienation — the feeling of watching ordinary life from a distance, as if through extraterrestrial eyes. It signals Radiohead's sharp turn away from guitar rock toward something stranger and more expansive.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 180,
  timeSignature: [6, 8],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'D/A', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '♭5 maj/♭2', chordName: 'D♭/A♭', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      repeatCount: 3,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 6', chordName: 'G6', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '4 min7/1', chordName: 'Cmin7/G', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 maj/2', chordName: 'D/A', beat: 1, duration: 6 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=_fTWmUlTEqE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/radiohead.webp',
  popularity: 50,
};
