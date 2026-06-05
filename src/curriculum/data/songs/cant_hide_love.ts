import type { Song } from '@/curriculum/types/songLibrary';

export const cant_hide_love: Song = {
  id: 'cant_hide_love',
  title: 'Can’t Hide Love',
  artist: 'Earth, Wind & Fire',
  year: undefined,

  historicalDescription:
    "Earth, Wind & Fire release 'Can't Hide Love', a buoyant funk and soul anthem that showcases the band's signature blend of tight rhythmic grooves, lush horn arrangements, and soaring harmonies. The track captures the group at the peak of their creative powers in the mid-1970s, when they were redefining what Black pop music could be — euphoric, spiritual, and irresistibly danceable.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 78,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [] },
        { chords: [] },
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      repeatCount: 3,
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'F7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'D♭7sus', beat: 1, duration: 4 },
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
            { degree: '♭5 7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 7', chordName: 'B7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1TxgfbPl9Qg' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/earth-wind-and-fire.webp',
  popularity: 50,
};
