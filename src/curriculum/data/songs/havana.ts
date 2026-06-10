import type { Song } from '@/curriculum/types/songLibrary';

export const havana: Song = {
  id: 'havana',
  title: 'Havana',
  artist: 'Camila Cabello',
  year: 2017,
  historicalDescription:
    "Camila Cabello releases 'Havana' in 2017, announcing herself as a solo force after leaving Fifth Harmony. The song fuses Latin pop with trap rhythms and a nostalgic Cuban soul, becoming a global phenomenon that signals a wider mainstream embrace of Latin sounds — arriving just as the genre is poised to take over pop radio worldwide.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 106,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['latin', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 12 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [], restBars: 8 },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [], restBars: 4 },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [], restBars: 4 },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=BQ0mxQXmLsk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/camila-cabello.webp',
  popularity: 50,
};
