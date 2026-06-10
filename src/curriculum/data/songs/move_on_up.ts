import type { Song } from '@/curriculum/types/songLibrary';

export const move_on_up: Song = {
  id: 'move_on_up',
  title: 'Move On Up',
  artist: 'Curtis Mayfield',
  year: 1971,
  historicalDescription:
    "Curtis Mayfield releases 'Move On Up' as a rallying cry for Black America, blending funk grooves, Latin percussion, and his signature falsetto into something urgent and euphoric. The extended track becomes an anthem of the civil rights era's optimistic afterglow, its irresistible momentum inspiring generations of artists from disco producers to hip hop beatmakers who sample it endlessly.",
  key: 'F♯ minor',
  keyRoot: 66,
  mode: 'minor',
  tempo: 144,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '6 maj', chordName: 'D', beat: 1, duration: 4 }],
          fermata: true,
        },
        { chords: [] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '6 maj', chordName: 'D', beat: 1, duration: 4 }],
          fermata: true,
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 1,
      bars: [{ chords: [] }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=A9RMr9KuVZo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/curtis-mayfield.webp',
  popularity: 50,
};
