import type { Song } from '@/curriculum/types/songLibrary';

export const day_tripper: Song = {
  id: 'day_tripper',
  title: 'Day Tripper',
  artist: 'The Beatles',
  year: 1965,
  historicalDescription:
    "The Beatles release 'Day Tripper' as a double A-side single alongside 'We Can Work It Out' in 1965, showcasing the band's expanding creative ambitions. The song's instantly recognizable guitar riff — one of the most imitated in rock history — signals a harder, more electric edge as the group moves away from their early pop sound toward the psychedelic experimentation that will define their later work.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 138,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 2 },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        { chords: [], restBars: 2 },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=2IbPn5j2YKk' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/the-beatles.webp',
  popularity: 50,
};
