import type { Song } from '@/curriculum/types/songLibrary';

export const life_is_a_highway: Song = {
  id: 'life_is_a_highway',
  title: 'Life Is A Highway',
  artist: 'Rascal Flatts',
  year: 2006,
  historicalDescription:
    "Rascal Flatts releases their country-pop cover of Tom Cochrane's 1991 rock anthem 'Life Is A Highway' for the Pixar film 'Cars'. The recording introduces the song to a new generation, becoming one of the most recognizable tracks in the film's soundtrack and cementing Rascal Flatts' crossover appeal between country and mainstream pop audiences.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Dann Huff', role: 'producer', artistGlobeId: 'dann-huff' },
    { name: 'Justin Niebank', role: 'engineer' },
    { name: 'Tom Cochrane', role: 'songwriter', artistGlobeId: 'tom-cochrane' },
    {
      name: 'Rascal Flatts',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'rascal-flatts',
    },
  ],
  releases: [{ releaseId: 'rascal-flatts-still-feels-good', track: 4 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '♭5 maj', chordName: 'C♭', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '♭5 maj', chordName: 'C♭', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=5tXh_MfrMe0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/rascal-flatts.webp',
  popularity: 50,
};
