import type { Song } from '@/curriculum/types/songLibrary';

export const im_into_something_good: Song = {
  id: 'im_into_something_good',
  title: 'I’m Into Something Good',
  artist: 'Herman’s Hermits',
  year: 1964,
  historicalDescription:
    "Herman's Hermits release 'I'm Into Something Good' in 1964, riding the crest of the British Invasion that The Beatles had kicked open just months earlier. The bright, breezy pop track becomes a transatlantic hit, cementing the Manchester group as one of the era's most commercially potent exports and proving that Beatlemania has opened American ears to an entire generation of British acts.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 144,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['classic_rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 7', chordName: 'D7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 7', chordName: 'G7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '2 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=n0J6q42zLH0' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
